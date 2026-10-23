/**
 * The community's operating posture — **how this community is run, declared by the community.**
 *
 * **What this is, and the one thing it deliberately is not.**
 *
 * It is not a country table. The runtime does **not** know that one country tolerates more nudging
 * than another, and this increment does not teach it: a `country → posture` lookup would be a
 * stereotype baked into code, and worse, it would be a rule **nobody in that community chose**. The
 * only authority on a community's manners is the community. So the *community declares* its posture
 * and the runtime *holds the fleet to it*. A pack in Jakarta and a pack in Berlin can declare
 * different postures, and neither is the runtime's business — but both are binding, and both are
 * checkable.
 *
 * **Why it belongs in the runtime at all.** Every rule in the repo so far is about what the fleet may
 * do *to a member* (suppression, quiet hours, the per-24h cap) or what the *organiser* may do (the
 * autonomy ladder). None of them is about the community as a *body* — how it conducts itself, how
 * discoverable it is, whether it tolerates being approached. Those are real differences between
 * communities, and a fleet that cannot be told about them will do the same thing in every one of them.
 *
 * **Two axes, two gates, no new state.** The posture is deliberately small, because every axis has to
 * gate something concrete or it is a decoration:
 *
 *  1. **`contact`** — may the fleet approach a member who did not ask? `closed` (never 1:1 to someone
 *     with no open question), `asked_only` (1:1 only to a member with an open thread — they asked, we
 *     answer), `open` (anyone, still subject to the existing cap, quiet hours and suppression). This
 *     is the "people here tolerate being nudged" / "people here do not" axis, and it is about PEOPLE,
 *     not about channels.
 *  2. **`openness`** — is the community discoverable and may the fleet post publicly? `closed` refuses
 *     `commit.channel-post` outright; `open` allows it (still at the class's own autonomy level, and
 *     still `allow once only` in v0). This is the "some accounts should be private" axis.
 *
 * **The direction of resolution is the same as everywhere else in this repo: the pack may only be
 * STRICTER than the org.** An org may say "communities under me may be open or closed"; a pack may
 * not choose *more* open than the org allows. And a pack that tries is **refused, not clamped** —
 * a value silently rounded toward the org is a file that lies about the system it configures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import { disclosureLineId, disclosureLineEn } from '../src/disclosure.ts';
import type { CommunityPosture, PackedOrg } from '../src/types.ts';

// 14:00 in Jakarta — deliberately OUTSIDE the member's quiet hours (21:00–07:59 local, FR-5.5),
// because a test that stopped at `quiet_hours` would prove nothing about the posture. The
// member's own protections come first, and the posture can only ever be an ADDITIONAL limit.
const DAY = 25_200_000;
const ANSWERS = { community_name: 'AI Builders ID' };

/** A community that tolerates being approached, and is discoverable. */
const OPEN: CommunityPosture = { contact: 'open', openness: 'open' };
/** A community that does not tolerate being approached at all, and is not discoverable. */
const CLOSED: CommunityPosture = { contact: 'never', openness: 'closed' };

// The canonical disclosure line rides in the copy — it is part of the content, not a setting
// (§2.8) — so a member-facing commit without it is refused before the posture is even consulted.
/** A complete org manifest — the floor tests need a real one, not a stub with one field. */
const ORG = (posture?: CommunityPosture): PackedOrg => ({
  schema: 'kinship-org/v1',
  key: 'kinshipai',
  humanSeats: ['organiser'],
  agentRoles: ['event-ops'],
  floors: {},
  autonomyCeiling: {},
  ...(posture !== undefined ? { posture } : {}),
});

const BUNDLE = {
  id: 'card-1',
  textId: `Halo! Kopdar #7 Sabtu, 19:00 WIB, Ruang A.\n\n${disclosureLineId('AI Builders ID')}`,
  textEn: `Hello! Kopdar #7 on Saturday, 19:00 WIB, Hall A.\n\n${disclosureLineEn('AI Builders ID')}`,
};

/** A fleet with one member, a posture, and the grants a 1:1 / public commit needs. */
function withPosture(posture?: CommunityPosture, org?: CommunityPosture) {
  const pack = makePack({
    'event-ops': { 'commit.individual-message': 'draft', 'commit.channel-post': 'draft', 'draft.promote': 'draft' },
  });
  if (posture !== undefined) (pack as { posture?: CommunityPosture }).posture = posture;
  if (org !== undefined) (pack as { org?: { posture?: CommunityPosture } }).org = { posture: org };
  const f = Fleet.boot(pack, ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  // The grants, so the commit gets past the AUTHORISATION gate and the POSTURE gate is what
  // refuses. A test that stopped at `grant_not_found` would prove nothing about the posture.
  f.issueGrant({ actionClass: 'commit.individual-message', kind: 'allow_always', scope: 'kopdar-1', by: 'organiser' });
  f.issueGrant({ actionClass: 'commit.channel-post', kind: 'allow_always', scope: 'kopdar-1', by: 'organiser' });
  return { f, pack };
}

test('a community that does not tolerate being approached refuses a 1:1 message to someone who did not ask', () => {
  const { f } = withPosture(CLOSED);
  assert.throws(
    () => f.commit({
      actionClass: 'commit.individual-message', agent: 'event-ops',
      origin: { kind: 'event', id: 'kopdar-1' }, recipients: ['wa:62811'],
      onBehalfOf: 'organiser', ...BUNDLE,
    }),
    (e: { code?: string; message?: string }) => {
      assert.equal(e.code, 'posture_refused');
      assert.match(String(e.message), /contact|closed/i, 'the refusal names the posture that refused it');
      return true;
    },
  );
});

test('the same message is allowed where the community says it is', () => {
  const { f } = withPosture(OPEN);
  // It still refuses at the transport gate — that is phase 1 (D21) and is not what this test is about.
  assert.throws(
    () => f.commit({
      actionClass: 'commit.individual-message', agent: 'event-ops',
      origin: { kind: 'event', id: 'kopdar-1' }, recipients: ['wa:62811'],
      onBehalfOf: 'organiser', ...BUNDLE,
    }),
    (e: { code?: string }) => {
      assert.equal(e.code, 'no_transport', 'it got past the posture gate and stopped at the transport gate');
      return true;
    },
  );
});

test('a member WITH an open question may be answered, even where the community is closed to approaches', () => {
  // `asked_only` is the middle: a community that will not be approached, but will answer what it is
  // asked. The open thread is the proof the member asked.
  const { f } = withPosture({ contact: 'asked_only', openness: 'closed' });
  f.registerInput('wa:62811', 'Kapan jadwalnya?');
  f.openThread({ memberRef: 'wa:62811', pointer: 'telegram#1' });
  assert.throws(
    () => f.commit({
      actionClass: 'commit.individual-message', agent: 'event-ops',
      origin: { kind: 'event', id: 'kopdar-1' }, recipients: ['wa:62811'],
      onBehalfOf: 'organiser', ...BUNDLE,
    }),
    (e: { code?: string }) => {
      assert.equal(e.code, 'no_transport', 'the answer to a question someone asked is allowed through the posture gate');
      return true;
    },
  );
});

test('a closed community refuses a public post', () => {
  const { f } = withPosture(CLOSED);
  assert.throws(
    () => f.commit({
      actionClass: 'commit.channel-post', agent: 'event-ops',
      origin: { kind: 'event', id: 'kopdar-1' }, recipients: [],
      onBehalfOf: 'organiser', ...BUNDLE,
    }),
    (e: { code?: string; message?: string }) => {
      assert.equal(e.code, 'posture_refused');
      assert.match(String(e.message), /openness|closed|public/i);
      return true;
    },
  );
});

test('an open community is not refused a public post by the posture — the gate is what is under test', () => {
  const { f } = withPosture(OPEN);
  // The contrast with the closed case above is the whole point: the posture gate is what refuses a
  // closed community, and it must NOT be what refuses an open one. (Whether the commit then stops
  // at the transport gate is a separate question this test does not answer — a recipient-less
  // commit is an internal commit in phase 1, which is pre-existing behaviour, not this axis.)
  let refused: { code?: string } | null = null;
  try {
    f.commit({
      actionClass: 'commit.channel-post', agent: 'event-ops',
      origin: { kind: 'event', id: 'kopdar-1' }, recipients: [],
      onBehalfOf: 'organiser', ...BUNDLE,
    });
  } catch (e) { refused = e as { code?: string }; }
  assert.notEqual(refused?.code, 'posture_refused', 'an open community is not refused by its own posture');
});

test('no posture declared is the conservative one — a fleet does not get to approach people by default', () => {
  const { f } = withPosture(undefined);
  assert.throws(
    () => f.commit({
      actionClass: 'commit.individual-message', agent: 'event-ops',
      origin: { kind: 'event', id: 'kopdar-1' }, recipients: ['wa:62811'],
      onBehalfOf: 'organiser', ...BUNDLE,
    }),
    (e: { code?: string }) => {
      assert.equal(e.code, 'posture_refused', 'absence is not permission');
      return true;
    },
  );
});

test('the pack may only be STRICTER than the org — a looser pack is refused, not clamped', () => {
  // The org says every community under it is closed to approaches. A pack that says `open` is
  // refused, because a value silently rounded toward the org is a file that lies about the system it
  // configures — the same rule the guardrails follow (spec §1.10, "refuse, never clamp").
  const pack = makePack({ 'event-ops': { 'commit.individual-message': 'draft' } });
  let refused: unknown = null;
  try {
    Fleet.boot({ ...pack, posture: OPEN, org: ORG(CLOSED) } as never, ANSWERS, DAY);
  } catch (e) { refused = e; }
  assert.ok(refused !== null, 'a pack looser than its org is refused');
  assert.match(String((refused as Error).message), /posture|org/i);
});

test('a pack stricter than its org is fine — the org is a floor, not a remote control', () => {
  const pack = makePack({ 'event-ops': { 'commit.individual-message': 'draft' } });
  const f = Fleet.boot({ ...pack, posture: CLOSED, org: ORG(OPEN) } as never, ANSWERS, DAY);
  assert.doesNotThrow(() => f.health(), 'and the stricter posture is in force');
  assert.equal(f.settings().posture.contact, 'never', 'the pack\'s stricter value is what the fleet obeys');
});

test('the effective posture is reported, with its provenance — a claim with no source is not checkable', () => {
  const { f } = withPosture(CLOSED);
  const settings = f.settings();
  assert.equal(settings.posture.contact, 'never');
  assert.equal(settings.posture.openness, 'closed');
  assert.ok(
    settings.provenance.some((p) => p.key === 'posture:contact' || p.key === 'posture:openness'),
    'and the provenance says which file put it there',
  );
});
