import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/store.ts';
import { resolveAutonomy, narrowest } from '../src/ladder.ts';
import { tripShatter, releaseShatter } from '../src/shatter.ts';
import { makeCtx, makePack } from './helpers.ts';
import type { Ctx } from '../src/types.ts';

const pack = () => makePack({ engagement: { 'draft.promote': 'draft', 'answer.question': 'opt-in-auto' } });

const resolve = (ctx: Ctx, actionClass: string, role = 'engagement', channel?: string) =>
  resolveAutonomy({ ...ctx, role, actionClass, channel });

test('an action class absent from the map behaves as never — default deny, unset is not a loophole', () => {
  const ctx = makeCtx(pack());
  assert.equal(resolve(ctx, 'commit.individual-message'), 'never');
});

test('a class at draft resolves draft, and opt-in-auto resolves itself', () => {
  const ctx = makeCtx(pack());
  assert.equal(resolve(ctx, 'draft.promote'), 'draft');
  assert.equal(resolve(ctx, 'answer.question'), 'opt-in-auto');
});

test('narrowest() is the §1.7 intersection: never > draft > opt-in-auto', () => {
  assert.equal(narrowest('opt-in-auto', 'draft'), 'draft');
  assert.equal(narrowest('draft', 'opt-in-auto'), 'draft');
  assert.equal(narrowest('never', 'draft'), 'never');
  assert.equal(narrowest('opt-in-auto', 'never'), 'never');
});

test('a shatter complaint freezes the channel level-1 lane back to draft, automatically (§2.6)', () => {
  const ctx = makeCtx(pack());
  tripShatter(ctx, 'telegram', 'complaint-1');
  assert.equal(resolve(ctx, 'answer.question', 'engagement', 'telegram'), 'draft',
    'the freeze is automatic, not a request');
  assert.equal(resolve(ctx, 'answer.question', 'engagement', 'discord'), 'opt-in-auto',
    'the freeze is per channel, not fleet-wide');
});

test('only the organiser releases a shatter freeze, and the release is an event (§2.6)', () => {
  const ctx = makeCtx(pack());
  tripShatter(ctx, 'telegram', 'complaint-1');
  assert.throws(() => releaseShatter(ctx, 'telegram', 'agent:engagement'), /not_the_human/);
  releaseShatter(ctx, 'telegram', 'organiser');
  assert.equal(resolve(ctx, 'answer.question', 'engagement', 'telegram'), 'opt-in-auto',
    'reversible, by a person, with a record');
});

test('promote.cross-community is unreachable until needs.partner_policy is answered (§2.11)', () => {
  const crossPack = () => makePack({ engagement: { 'promote.cross-community': 'draft' } });
  const noAnswer = makeCtx(crossPack());
  assert.equal(resolve(noAnswer, 'promote.cross-community'), 'never', 'fail closed, like every other gate');
  const answered = makeCtx(crossPack(), { partner_policy: 'AIClub.id — line: "in partnership with AIClub.id"' });
  assert.equal(resolve(answered, 'promote.cross-community'), 'draft');
});

test('a class the pack sets to never is a floor: a grant in the store does not widen it (§1.1)', () => {
  const ctx = makeCtx(makePack({ engagement: { 'whatsapp.group-send': 'never' } }));
  assert.equal(resolve(ctx, 'whatsapp.group-send'), 'never');
});

test('an unknown role has every class as never — a role that is not in the pack does not exist', () => {
  const ctx = makeCtx(pack());
  assert.equal(resolve(ctx, 'draft.promote', 'ghost'), 'never');
});

test('the state is only mutated through commit — resolve reads and never writes (ladder purity)', () => {
  const ctx = makeCtx(pack());
  const before = JSON.stringify(freshStateShape(ctx));
  resolve(ctx, 'answer.question');
  assert.equal(JSON.stringify(freshStateShape(ctx)), before);
});

function freshStateShape(ctx: Ctx): unknown {
  return { seq: ctx.state.seq, cards: ctx.state.cards.size, grants: ctx.state.grants.size };
}
