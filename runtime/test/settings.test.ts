/**
 * Settings resolution across tiers — the rule that decides what an organisation is *for*.
 *
 * The naive version of this function picks the strictest value and moves on. That would be a
 * silent clamp, and a silent clamp is the worst thing a central tier can do to a community: the
 * organiser edits `member_message_cap_per_24h` to 20, the system sends 4, and nothing says so —
 * the number in the file and the number in the world disagree, which is the failure mode this repo
 * already refuses in three other places (D15 fork packs, D28 single-sourced gates, D29 the
 * comment-that-was-not-a-gate).
 *
 * So the rule is **refuse, never clamp**, and it splits the org tier's powers in two:
 *
 *   - a value the pack **declared** may only ever be equal or stricter. Weaker → `pack_invalid`.
 *   - a value the pack **omitted** inherits the org's floor, and provenance says `org`.
 *   - an autonomy ceiling genuinely narrows, because narrowing is what §1.7 already does — and it
 *     may not widen, and may not say `never` (that is the pack's to declare: invariant #1).
 *
 * The consequence worth naming out loud, because it is the whole design: **an org can never change
 * a community's number. It can only refuse the community, or fill a blank it was offered.** That is
 * what keeps a self-hosted, forkable thing from becoming a hosted one with extra steps.
 *
 * Direction is per key and is not uniform, which is why this file tests both:
 * a *lower* cap is stricter for the member; a *higher* aggregation floor is stricter.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSettings, effectiveGuardrails, type ResolveSettingsArgs } from '../src/settings.ts';
import { assertAggregateOnly } from '../src/members.ts';
import { parseOrg } from '../src/org.ts';
import { resolveAutonomy } from '../src/ladder.ts';
import { Fleet } from '../src/engine.ts';
import { makeCtx, makePack } from './helpers.ts';
import { freshState } from '../src/store.ts';
import type { Packed, PackedGuardrails } from '../src/types.ts';

const DAY = 25_200_000; // 07:00 UTC = 14:00 WIB

const ORG = parseOrg(`schema: kinship-org/v1
key: kinshipai
name: Kinship
human_seats:
  - organiser
agent_roles:
  - event-ops
  - engagement
  - moderator
floors:
  member_message_cap_per_24h: 4
  report_aggregation_floor: 5
  identity_disclosure: required
  defaults: deny
autonomy_ceiling:
  commit.channel-post: draft
`);

const packWith = (over: Partial<PackedGuardrails>, declared: string[] = [
  'report_aggregation_floor', 'member_message_cap_per_24h', 'identity_disclosure', 'defaults',
]): Packed => {
  const pack = makePack({ engagement: { 'commit.channel-post': 'opt-in-auto', 'draft.promote': 'draft' } });
  return { ...pack, guardrails: { ...pack.guardrails, ...over }, declared };
};

const resolve = (args: Partial<ResolveSettingsArgs> & { pack: Packed }) => resolveSettings(args);

test('with no org tier, resolution is the identity: the pack keeps every number it wrote', () => {
  const pack = packWith({});
  const r = resolve({ pack });
  assert.deepEqual(r.guardrails, pack.guardrails, 'an absent org changes nothing — the 182 tests before this one still describe the runtime');
  assert.deepEqual(r.humanSeats, ['organiser'], 'the seat set defaults to the one seat the runtime has always gated on');
  assert.deepEqual(r.autonomyCeiling, {});
  assert.equal(r.orgKey, null);
});

test('every effective guardrail gets exactly one provenance row — who set this is answerable (§1.2)', () => {
  const rows = resolve({ pack: packWith({}) }).provenance.filter((p) => p.tier === 'guardrail');
  assert.deepEqual(rows.map((r) => r.key).sort(), [
    'defaults_deny', 'identity_disclosure', 'member_message_cap_per_24h', 'report_aggregation_floor',
  ].sort());
  for (const row of rows) assert.equal(row.source, 'pack', 'all four were declared by the pack');
});

test('an undeclared guardrail is provenance `default`, not `pack` — a silent default is named as one', () => {
  const r = resolve({ pack: packWith({}, ['member_message_cap_per_24h']) });
  const floor = r.provenance.find((p) => p.key === 'report_aggregation_floor');
  assert.equal(floor?.source, 'default');
  assert.equal(r.guardrails.reportAggregationFloor, 10, 'the parser default still applies');
});

test('the cap: a pack stricter than the org floor keeps its own number, and says so', () => {
  const r = resolve({ pack: packWith({ memberMessageCapPer24h: 2 }), org: ORG });
  assert.equal(r.guardrails.memberMessageCapPer24h, 2, 'the member gets 2/day — strictest wins, and strictest is the pack here');
  const row = r.provenance.find((p) => p.key === 'member_message_cap_per_24h');
  assert.equal(row?.source, 'pack');
  assert.match(row?.note ?? '', /4/, 'the note carries the org floor it beat, so the organiser sees both numbers');
});

test('REFUSE, NOT CLAMP: a pack that declares a weaker cap fails the boot rather than being rounded down', () => {
  assert.throws(() => resolve({ pack: packWith({ memberMessageCapPer24h: 5 }), org: ORG }), (e: unknown) => {
    const msg = String(e);
    assert.match(msg, /pack_invalid/);
    assert.match(msg, /member_message_cap_per_24h/, 'names the key');
    assert.match(msg, /\b5\b/);
    assert.match(msg, /\b4\b/, 'names both numbers — a refusal that hides the floor is a puzzle, not an audit');
    assert.match(msg, /clamp|not clamped/i, 'and says plainly that it will not silently fix the pack');
    return true;
  });
});

test('the aggregation floor works the other way: HIGHER is stricter, and the org is the floor', () => {
  // The direction test. A single min/max rule for both keys would let a fork drop the floor to 1
  // ("fewer named members is stricter, obviously") and send a sponsor report naming two people.
  const stricter = resolve({ pack: packWith({ reportAggregationFloor: 10 }), org: ORG });
  assert.equal(stricter.guardrails.reportAggregationFloor, 10);
  assert.throws(() => resolve({ pack: packWith({ reportAggregationFloor: 3 }), org: ORG }), /report_aggregation_floor/);
});

test('disclosure is a boolean with a direction too: a pack cannot turn off what the org requires', () => {
  assert.throws(() => resolve({ pack: packWith({ identityDisclosure: false }), org: ORG }), /identity_disclosure/);
  const lenientOrg = parseOrg('schema: kinship-org/v1\nkey: loose\nname: Loose\nhuman_seats:\n  - organiser\nagent_roles: []\nfloors:\n  identity_disclosure: not_required\n');
  const r = resolve({ pack: packWith({ identityDisclosure: true }), org: lenientOrg });
  assert.equal(r.guardrails.identityDisclosure, true, 'a stricter pack under a looser org is fine — the org floors, it does not cap upward');
});

test('defaults: deny is the stricter side, and an org that says deny cannot host an allow pack', () => {
  assert.throws(() => resolve({ pack: packWith({ defaultsDeny: false }), org: ORG }), /defaults/);
});

test('AN OMITTED VALUE INHERITS THE ORG — the only way the org tier ever supplies a number', () => {
  // The distinction that makes refuse-not-clamp survivable: a fork that *writes* a weak value is
  // refused; a pack that never wrote the key is not pretending to have chosen it, so the org fills it.
  const pack = packWith({ identityDisclosure: false }, ['member_message_cap_per_24h', 'report_aggregation_floor', 'defaults']);
  const r = resolve({ pack, org: ORG });
  assert.equal(r.guardrails.identityDisclosure, true, 'the org required disclosure and the pack never claimed to have decided it');
  const row = r.provenance.find((p) => p.key === 'identity_disclosure');
  assert.equal(row?.source, 'org');
});

test('THE PROPERTY: a declared pack value is never replaced by the org — it survives or the boot fails', () => {
  const cases: Array<Partial<PackedGuardrails>> = [
    { memberMessageCapPer24h: 2 }, { memberMessageCapPer24h: 4 },
    { reportAggregationFloor: 5 }, { reportAggregationFloor: 50 },
    { identityDisclosure: true }, { defaultsDeny: true },
  ];
  for (const over of cases) {
    const pack = packWith(over);
    const r = resolve({ pack, org: ORG });
    for (const [k, v] of Object.entries(over)) {
      assert.equal((r.guardrails as unknown as Record<string, unknown>)[k], v, `${k}=${String(v)} was declared, so ${k} must not become something else`);
    }
  }
});

test('an org autonomy ceiling narrows a pack class, and cannot widen one', () => {
  const pack = packWith({});
  const r = resolve({ pack, org: ORG });
  assert.equal(resolveAutonomy({ pack, role: 'engagement', actionClass: 'commit.channel-post', state: freshState(), answers: {}, settings: r }), 'draft',
    'the pack says opt-in-auto; the org holds it at draft — §1.7 narrowing, not a new mechanism');
  const widened = resolve({ pack, org: parseOrg('schema: kinship-org/v1\nkey: wide\nname: Wide\nhuman_seats:\n  - organiser\nagent_roles: []\nautonomy_ceiling:\n  draft.promote: opt-in-auto\n') });
  assert.equal(resolveAutonomy({ pack, role: 'engagement', actionClass: 'draft.promote', state: freshState(), answers: {}, settings: widened }), 'draft',
    'draft stays draft: a ceiling is a ceiling, never a floor');
});

test('a ceiling cannot resurrect a class the pack made `never`, and cannot reach an undeclared class', () => {
  const pack = { ...packWith({}), agents: { engagement: { role: 'engagement', tools: [], autonomyByClass: { 'commit.channel-post': 'never' as const } } } };
  const r = resolve({ pack, org: ORG });
  assert.equal(resolveAutonomy({ pack, role: 'engagement', actionClass: 'commit.channel-post', state: freshState(), answers: {}, settings: r }), 'never');
  assert.equal(resolveAutonomy({ pack, role: 'engagement', actionClass: 'observe.read', state: freshState(), answers: {}, settings: r }), 'never', 'default deny is not a hole the org can fall into either');
});

test('a ceiling names exact class keys — there is no wildcard, because a wildcard would widen silently', () => {
  const star = parseOrg('schema: kinship-org/v1\nkey: star\nname: Star\nhuman_seats:\n  - organiser\nagent_roles: []\nautonomy_ceiling:\n  "promote.*": draft\n');
  const pack = packWith({});
  const r = resolve({ pack, org: star });
  assert.equal(resolveAutonomy({ pack, role: 'engagement', actionClass: 'commit.channel-post', state: freshState(), answers: {}, settings: r }), 'opt-in-auto',
    'a key that does not name the class applies to it not at all — the ladder has no glob, so the ceiling has none');
});

test('a pack agent may not be named something the org holds as a human seat', () => {
  const pack = { ...packWith({}), agents: { organiser: { role: 'organiser', tools: [], autonomyByClass: { 'commit.channel-post': 'opt-in-auto' as const } } } };
  assert.throws(() => resolve({ pack, org: ORG }), (e: unknown) => {
    const msg = String(e);
    assert.match(msg, /pack_invalid/);
    assert.match(msg, /organiser/, 'names the colliding role');
    assert.match(msg, /seat/);
    return true;
  }, 'otherwise the four seat-gated acts would accept an agent as the human (§2.7)');
});

test('a shatter freeze still beats an org ceiling that would allow auto — narrowing composes, never races', () => {
  const pack = packWith({});
  const ctx = makeCtx(pack, {}, DAY);
  ctx.state.shatter.set('wa:group-1', { channel: 'wa:group-1', trippedAt: 1, ref: 'a-member' });
  const r = resolve({ pack, org: ORG });
  assert.equal(resolveAutonomy({ pack, role: 'engagement', actionClass: 'commit.channel-post', state: ctx.state, answers: {}, channel: 'wa:group-1', settings: { ...r, autonomyCeiling: { 'commit.channel-post': 'opt-in-auto' } } }), 'draft',
    'a permissive ceiling + a live complaint = draft, because both narrowings are intersections (§1.7)');
});

test('the engine sees the org tier: an attempt the pack would auto-run becomes a card', () => {
  const pack = { ...packWith({}), org: ORG };
  const fleet = new Fleet(pack, {}, DAY);
  const r = fleet.attempt({
    actionClass: 'commit.channel-post', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' },
    text: { id: 'halo', en: 'hello' },
  });
  assert.equal(r.disposition, 'card', 'org ceiling draft over pack opt-in-auto — the card is the visible proof the ceiling is enforced, not just reported');
});

test('enforcement reads the RESOLVED value, not the raw pack: an org floor the pack never wrote binds commits', () => {
  // The read-path proof. The pack does not declare an aggregation floor, so its parsed value is the
  // parser default (10); the org's floor is 20, which is stricter, so 20 is the number in force. If
  // any enforcement site still read `ctx.pack.guardrails` directly, a cohort of 15 named members
  // would assemble here and the tier would be a report, not a rule.
  const strictOrg = parseOrg(`schema: kinship-org/v1
key: strict
name: Strict
human_seats:
  - organiser
agent_roles: []
floors:
  report_aggregation_floor: 20
`);
  const pack = packWith({}, ['member_message_cap_per_24h', 'identity_disclosure', 'defaults']);
  const ctx = makeCtx({ ...pack, org: strictOrg }, {}, DAY);
  assert.equal(ctx.pack.guardrails.reportAggregationFloor, 10, 'what the pack file says');
  assert.equal(effectiveGuardrails(ctx).reportAggregationFloor, 20, 'what is in force');
  assert.equal(ctx.settings.provenance.find((p) => p.key === 'report_aggregation_floor')?.source, 'org');
  assert.throws(() => assertAggregateOnly(ctx, 15, ['bu-dewi']), /report_below_floor/,
    'the cohort is under the org floor even though it clears the pack default — the org tier is enforced');
});

test('Fleet.settings() is a read: it appends nothing, dates itself, and names its tiers', () => {
  const fleet = new Fleet({ ...packWith({}), org: ORG }, {}, DAY);
  const before = fleet.state.events.length;
  const s = fleet.settings();
  assert.equal(fleet.state.events.length, before, 'a settings artefact that wrote to the log would be a fifth governing actor');
  assert.equal(s.derivedFromSeq, fleet.state.seq);
  assert.equal(s.at, DAY);
  assert.equal(s.orgKey, 'kinshipai');
  assert.equal(s.packKey, 'kinshipai/bundled/event-ops/test');
  assert.deepEqual(s.tiers, ['org', 'pack'], 'the resolution order, in the order it was applied');
  assert.deepEqual(s.humanSeats, ['organiser']);
  assert.equal(s.guardrails.memberMessageCapPer24h, 2);
});

test('the settings report names the third tier as unbuilt instead of pretending to have resolved it', () => {
  const s = new Fleet({ ...packWith({}), org: ORG }, {}, DAY).settings();
  assert.ok(s.limits.some((l) => /event/i.test(l)), 'org -> pack -> event is the spec order; the event tier has no shape, no caller, and no spec rule yet');
  assert.ok(s.limits.some((l) => /clamp|never change|cannot change/i.test(l)), 'and the report says plainly what the org tier cannot do');
});

test('settings replay identically — the artefact is a fold of the log plus the pack, nothing else (§1.2)', () => {
  const fleet = new Fleet({ ...packWith({}), org: ORG }, {}, DAY);
  fleet.attempt({ actionClass: 'commit.channel-post', agent: 'engagement', origin: { kind: 'event', id: 'e1' }, text: { id: 'a', en: 'b' } });
  fleet.decideCard('card-1', { verdict: 'reject', by: 'organiser', why: 'too early' });
  const replayed = Fleet.replay(fleet.events, {}, fleet.pack);
  assert.deepEqual(replayed.settings(), fleet.settings());
});

// --- the sanction ladder (DECISIONS.md D37) ---------------------------------------------------
// A pack may write down the rungs its community climbs before a member is gone. The runtime reads
// that list once, at resolution, for two properties: a rung is an act a **human seat** performs, and no
// rung may name a tool the fleet holds. Both are refusals rather than warnings because the alternative
// is the same in each direction — a fleet that sanctions, or a norms document that lies about who does.

const RUNG_NUDGE = { rung: 'nudge', by: 'organiser', memberTold: 'a reminder of the rule in the thread', via: 'organiser-in-channel' };
const RUNG_REMOVAL = { rung: 'removal', by: 'organiser', memberTold: 'that you were removed, and how to appeal', via: 'host-ui', appeal: 'the flag re-enters the organiser queue' };
const LADDER = [RUNG_NUDGE, RUNG_REMOVAL];

test('a ladder rung whose `by` is an agent role refuses to resolve — the fleet may not sanction (D37)', () => {
  const pack = { ...packWith({}), sanctionLadder: [RUNG_NUDGE, { ...RUNG_REMOVAL, by: 'moderator' }] };
  assert.throws(() => resolve({ pack }), (e: unknown) => {
    const msg = String(e);
    assert.match(msg, /pack_invalid/);
    assert.match(msg, /removal/, 'names the rung, so the fix is not a hunt through the file');
    assert.match(msg, /moderator/, 'names the actor it rejected');
    assert.match(msg, /organiser/, 'names the seat that is allowed');
    assert.match(msg, /seat/, 'and the rule it broke (§2.7)');
    return true;
  });
});

test('a ladder that clears the seat rule resolves untouched — the gate is a gate, not a preference', () => {
  const pack = { ...packWith({}), sanctionLadder: LADDER };
  const r = resolve({ pack });
  assert.equal(r.orgKey, null, 'a well-formed ladder changes nothing about the rest of resolution');
});

test('the last rung of a ladder names the way back in, or the ladder refuses to resolve (D37)', () => {
  const pack = { ...packWith({}), sanctionLadder: [RUNG_NUDGE, { ...RUNG_REMOVAL, appeal: '' }] };
  assert.throws(() => resolve({ pack }), (e: unknown) => {
    const msg = String(e);
    assert.match(msg, /pack_invalid/);
    assert.match(msg, /removal/, 'names the rung at the end of the ladder');
    assert.match(msg, /appeal/, 'and the thing it is missing');
    return true;
  }, 'a sanction with no stated way back is the failure mode every dying community forum has, and this pack exists to not be that');
});

test('a rung whose `via` is a tool the fleet declares refuses to resolve — the ladder is not a lane (D37)', () => {
  // The reachability half, and the one a reader of a YAML file cannot see: `via: telegram | send` looks
  // like prose in a block nobody executes, and it is the same string the engagement agent holds as a
  // write path. Two doors check it because the failure is invisible in the file itself.
  const pack = {
    ...packWith({}),
    agents: { engagement: { role: 'engagement', tools: ['telegram | send'], autonomyByClass: { 'commit.channel-post': 'draft' as const } } },
    sanctionLadder: [RUNG_NUDGE, { ...RUNG_REMOVAL, via: 'telegram | send' }],
  };
  assert.throws(() => resolve({ pack }), (e: unknown) => {
    const msg = String(e);
    assert.match(msg, /pack_invalid/);
    assert.match(msg, /removal/, 'names the rung');
    assert.match(msg, /engagement/, 'names the agent that holds the tool');
    assert.match(msg, /telegram\s*\|\s*send/, 'and the tool, so the fix is obvious from the message alone');
    return true;
  });
});

test('a ladder with one rung refuses to resolve — one step is a binary, not a graduated response (D37)', () => {
  // Ostrom's fourth design principle for long-surviving commons is a *graduated* response, and the
  // research file that led here (§2 of COMMUNITY-GOVERNANCE-PATTERNS) found this pack deliberately
  // had none. A one-rung ladder is that gap with a block around it, so the shape check counts.
  const pack = { ...packWith({}), sanctionLadder: [{ ...RUNG_REMOVAL }] };
  assert.throws(() => resolve({ pack }), (e: unknown) => {
    const msg = String(e);
    assert.match(msg, /pack_invalid/);
    assert.match(msg, /rung/, 'it says what is short');
    return true;
  });
});

test('a rung that does not say what the member is told refuses to resolve (D37)', () => {
  const pack = { ...packWith({}), sanctionLadder: [{ ...RUNG_NUDGE, memberTold: '' }, RUNG_REMOVAL] };
  assert.throws(() => resolve({ pack }), (e: unknown) => {
    const msg = String(e);
    assert.match(msg, /pack_invalid/);
    assert.match(msg, /nudge/);
    assert.match(msg, /told|member_told/, 'and names the missing field, because "the member is told" is the difference between a sanction and a disappearance');
    return true;
  });
});

test('POSITIVE CONTROL: a rung naming a capability the fleet does not declare is legal — the gate is reachability, not vocabulary (D37)', () => {
  const pack = {
    ...packWith({}),
    sanctionLadder: [RUNG_NUDGE, { ...RUNG_REMOVAL, via: 'discord | ban' }],
  };
  assert.doesNotThrow(() => resolve({ pack }),
    '`ban` is a word the ladder is allowed to contain — no agent holds it, so the rung describes a human act in the platform\'s own UI, and forbidding the word would forbid a community from writing down what its organiser actually does');
});
