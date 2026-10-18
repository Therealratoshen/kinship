import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tripShatter, releaseShatter, isShattered, applyShatter } from '../src/shatter.ts';
import { resolveAutonomy } from '../src/ladder.ts';
import { makeCtx, makePack } from './helpers.ts';
import { freshState, append } from '../src/store.ts';
import type { FleetEvent, LoggedEvent } from '../src/types.ts';

/**
 * §2.6 shatter-guard, module-level. The behaviour that matters is that the freeze is
 * automatic, reversible, and *organiser-reversible only* — and that release touches the lane,
 * never the disclosure.
 */

const ctx = () => makeCtx(makePack({ engagement: { 'remind.member': 'opt-in-auto', 'draft.promote': 'draft' } }));

const ladderArgs = (c: ReturnType<typeof ctx>) => ({
  pack: c.pack, role: 'engagement', actionClass: 'remind.member', state: c.state, answers: c.answers, channel: 'telegram',
});

test('a complaint freezes the named channel and the ladder demotes that lane to draft (§2.6)', () => {
  const c = ctx();
  assert.equal(resolveAutonomy(ladderArgs(c)), 'opt-in-auto', 'the lane starts auto-eligible');
  tripShatter(c, 'telegram', 'wa:62899');
  assert.equal(isShattered(c.state, 'telegram'), true);
  assert.equal(resolveAutonomy(ladderArgs(c)), 'draft', 'one complaint, and the lane is draft again — automatically');
  assert.equal(c.state.shatter.get('telegram')?.ref, 'wa:62899', 'the record names what triggered it');
});

test('the freeze is scoped: another channel and a never-draft class are untouched', () => {
  const c = ctx();
  tripShatter(c, 'telegram', 'wa:62899');
  assert.equal(isShattered(c.state, 'whatsapp'), false, 'the freeze demotes a lane, not the agent');
  assert.equal(resolveAutonomy({ ...ladderArgs(c), channel: 'whatsapp' }), 'opt-in-auto');
  const promote = resolveAutonomy({ ...ladderArgs(c), actionClass: 'draft.promote' });
  assert.equal(promote, 'draft', 'a class already at draft has nothing to demote — and no way to go below it');
});

test('tripping twice while frozen is one event, one record, one trippedAt (idempotent)', () => {
  const c = ctx();
  tripShatter(c, 'telegram', 'wa:62899');
  const first = c.state.shatter.get('telegram')!;
  c.advance(500);
  tripShatter(c, 'telegram', 'wa:62900'); // a second complaint during the freeze
  assert.equal(c.state.events.filter((e) => e.type === 'ShatterTripped').length, 1,
    'the log says the guard tripped once — a second row would read as a second incident');
  assert.equal(c.state.shatter.get('telegram')?.trippedAt, first.trippedAt, 'the freeze does not silently extend');
  assert.equal(c.state.shatter.get('telegram')?.ref, 'wa:62899', 'and the original cause stays the recorded cause');
});

test('release is an organiser act: an agent release refuses, and the freeze stays live (§2.6)', () => {
  const c = ctx();
  tripShatter(c, 'telegram', 'wa:62899');
  assert.throws(() => releaseShatter(c, 'telegram', 'engagement'), /not_the_human/,
    'the agent whose lane is frozen cannot unfreeze itself');
  assert.equal(isShattered(c.state, 'telegram'), true, 'the refusal is not a release');
  assert.equal(c.state.events.filter((e) => e.type === 'ShatterReleased').length, 0);
  assert.equal(resolveAutonomy(ladderArgs(c)), 'draft', 'and the lane is still demoted after the attempted release');
});

test('the organiser releases with an event; the freeze is reversible, not a dismissal', () => {
  const c = ctx();
  tripShatter(c, 'telegram', 'wa:62899');
  c.advance(1000);
  releaseShatter(c, 'telegram', 'organiser');
  assert.equal(isShattered(c.state, 'telegram'), false);
  assert.equal(resolveAutonomy(ladderArgs(c)), 'opt-in-auto', 'the lane comes back to exactly what it was granted');
  assert.ok(c.state.shatter.get('telegram')?.releasedAt !== undefined, 'the row keeps both ends of the freeze');
  assert.equal(c.state.events.filter((e) => e.type === 'ShatterTripped').length, 1, 'history is not rewritten on release');
});

test('releasing an unfrozen channel is a no-op, and a released channel can freeze again', () => {
  const c = ctx();
  assert.doesNotThrow(() => releaseShatter(c, 'telegram', 'organiser'), 'nothing frozen — nothing to release, no error');
  assert.equal(c.state.events.length, 0, 'and no phantom event is logged');
  tripShatter(c, 'telegram', 'wa:62899');
  releaseShatter(c, 'telegram', 'organiser');
  c.advance(1000);
  tripShatter(c, 'telegram', 'wa:62901');
  assert.equal(isShattered(c.state, 'telegram'), true, 'a released guard is still armed — it does not burn out');
  assert.equal(c.state.events.filter((e) => e.type === 'ShatterTripped').length, 2);
  assert.equal(c.state.shatter.get('telegram')?.ref, 'wa:62901', 'the live row names the live cause');
});

test('an unlaned action is never shattered: isShattered(state, undefined) is false', () => {
  const c = ctx();
  tripShatter(c, 'telegram', 'wa:62899');
  assert.equal(isShattered(c.state, undefined), false,
    'no channel means no lane to freeze — a channel-less internal action keeps its grant');
});

test('applyShatter is the only writer, and the fold reproduces both trip and release', () => {
  const s = freshState();
  const events: LoggedEvent[] = [];
  const emit = (e: FleetEvent) => events.push(append(s, e));
  emit({ type: 'ShatterTripped', channel: 'telegram', ref: 'wa:62899', at: 10 });
  emit({ type: 'ShatterReleased', channel: 'telegram', by: 'organiser', at: 20 });
  emit({ type: 'ShatterReleased', channel: 'whatsapp', by: 'organiser', at: 30 }); // release with no trip
  for (const e of events) applyShatter(s, e as Extract<FleetEvent, { type: 'ShatterTripped' | 'ShatterReleased' }>);
  assert.deepEqual([...s.shatter.keys()], ['telegram'], 'a release for a channel that never tripped creates no row');
  assert.equal(s.shatter.get('telegram')?.releasedAt, 20, 'and it does not move the released row it has nothing to do with');
});
