import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/store.ts';
import { resolveAutonomy, narrowest } from '../src/ladder.ts';
import { tripShatter, releaseShatter } from '../src/shatter.ts';
import { makeCtx, makePack } from './helpers.ts';
import { resolveSettings } from '../src/settings.ts';
import type { Ctx } from '../src/types.ts';

const ANSWERS = {
  community_name: 'AI Builders ID',
  schedule: 'every other Saturday',
  venue_source: 'manual',
  sponsor_list: 'none yet',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser',
  rsvp_source_of_truth: 'google form',
  partner_policy: 'Kopdar Sebelah saja',
};

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

test('narrowest() is the section 1.7 intersection: never > draft > opt-in-auto', () => {
  assert.equal(narrowest('opt-in-auto', 'draft'), 'draft');
  assert.equal(narrowest('draft', 'opt-in-auto'), 'draft');
  assert.equal(narrowest('never', 'draft'), 'never');
  assert.equal(narrowest('opt-in-auto', 'never'), 'never');
});

test('a shatter complaint freezes the channel level-1 lane back to draft, automatically (section 2.6)', () => {
  const ctx = makeCtx(pack());
  tripShatter(ctx, 'telegram', 'complaint-1');
  assert.equal(resolve(ctx, 'answer.question', 'engagement', 'telegram'), 'draft',
    'the freeze is automatic, not a request');
  assert.equal(resolve(ctx, 'answer.question', 'engagement', 'discord'), 'opt-in-auto',
    'the freeze is per channel, not fleet-wide');
});

test('only the organiser releases a shatter freeze, and the release is an event (section 2.6)', () => {
  const ctx = makeCtx(pack());
  tripShatter(ctx, 'telegram', 'complaint-1');
  assert.throws(() => releaseShatter(ctx, 'telegram', 'agent:engagement'), /not_the_human/);
  releaseShatter(ctx, 'telegram', 'organiser');
  assert.equal(resolve(ctx, 'answer.question', 'engagement', 'telegram'), 'opt-in-auto',
    'reversible, by a person, with a record');
});

test('promote.cross-community is unreachable until needs.partner_policy is answered (section 2.11)', () => {
  const crossPack = () => makePack({ engagement: { 'promote.cross-community': 'draft' } });
  const noAnswer = makeCtx(crossPack());
  assert.equal(resolve(noAnswer, 'promote.cross-community'), 'never', 'fail closed, like every other gate');
  const answered = makeCtx(crossPack(), { partner_policy: 'AIClub.id — line: "in partnership with AIClub.id"' });
  assert.equal(resolve(answered, 'promote.cross-community'), 'draft');
});

test('a class the pack sets to never is a floor: a grant in the store does not widen it (section 1.1)', () => {
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

// --- the ladder COMPOSED (D76) -----------------------------------------------------------------------

test('all four narrowing sources bearing on ONE class compose to the narrowest — and never wider', () => {
  // Section 1.7 says *narrowing always wins*, and that is a claim about COMPOSITION: the pack's
  // declaration, the org's autonomy ceiling, the partner gate, and the shatter-guard. Each was
  // exercised on its own path; **nothing composed all four on the same action class**, so the claim
  // was untested. A claim about composition can only be failed by a test that composes.
  const pack = makePack({ engagement: { 'promote.cross-community': 'opt-in-auto' } });
  const withPartner = { ...ANSWERS, partner_policy: 'Kopdar Sebelah' };
  const ctx = makeCtx(pack, withPartner);
  const base = resolveSettings({ pack });

  // 1. The pack alone says opt-in-auto — nothing else is bearing on it yet.
  assert.equal(resolveAutonomy({ ...ctx, role: 'engagement', actionClass: 'promote.cross-community', settings: base }), 'opt-in-auto',
    "with nothing narrowing it, the pack's own declaration stands");

  // 2. The org's ceiling narrows it to draft, and it wins over the pack.
  const ceiling = { ...base, autonomyCeiling: { 'promote.cross-community': 'draft' } } as typeof base;
  assert.equal(resolveAutonomy({ ...ctx, role: 'engagement', actionClass: 'promote.cross-community', settings: ceiling }), 'draft',
    'the org ceiling narrows the class, and it wins over the pack');

  // 3. The shatter-guard narrows a lane to draft — it can never make one WIDER, and it never
  //    resurrects a class something else has already taken to never.
  tripShatter(ctx, 'telegram', 'complaint-1');
  assert.equal(resolveAutonomy({ ...ctx, role: 'engagement', actionClass: 'promote.cross-community', channel: 'telegram', settings: ceiling }), 'draft',
    'a shatter complaint narrows a lane to draft, and draft is where the ceiling already had it');

  // 4. The partner gate is NARROWER STILL, and it is the one that decides: with no partner named,
  //    a cross-promotion class does not exist at all — whatever the pack, the ceiling and the
  //    shatter-guard had to say about it.
  const noPartner = makeCtx(pack, { ...withPartner, partner_policy: '' });
  assert.equal(resolveAutonomy({ ...noPartner, role: 'engagement', actionClass: 'promote.cross-community', channel: 'telegram', settings: ceiling }), 'never',
    'with no named partner the class does not exist — and that beats every other source');

  // The composition is the NARROWEST of the four, never the widest, and never the pack's own
  // declaration when something else has an opinion.
  const composed = resolveAutonomy({ ...noPartner, role: 'engagement', actionClass: 'promote.cross-community', channel: 'telegram', settings: ceiling });
  assert.equal(composed, 'never');
  assert.notEqual(composed, 'opt-in-auto', "the pack's own declaration does not survive a composition that narrows it");
});

test('a composed narrowing fails closed: nothing may make a class WIDER than the pack says', () => {
  // The other direction of the composition: a class at `never` is a floor. No ceiling, no partner
  // and no shatter-guard may turn it into a lane.
  const pack = makePack({ engagement: { 'commit.individual-message': 'never' } });
  const ctx = makeCtx(pack, { ...ANSWERS, partner_policy: 'Kopdar Sebelah' });
  const settings = resolveSettings({ pack });
  assert.equal(resolveAutonomy({ ...ctx, role: 'engagement', actionClass: 'commit.individual-message', settings }), 'never');
  assert.equal(resolveAutonomy({ ...ctx, role: 'engagement', actionClass: 'commit.individual-message', channel: 'telegram', settings }), 'never',
    'and naming a channel does not resurrect it');
});
