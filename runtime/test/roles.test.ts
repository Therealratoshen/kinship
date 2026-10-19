/**
 * The human seat — one closed set, four gates, and the two things that are NOT seats.
 *
 * Until the org tier, "only the organiser may do this" was four separate string comparisons
 * (`cards.ts`, `grants.ts` twice, `shatter.ts`). Four literals is four chances to get it wrong: the
 * fifth act that needs a human gets a fifth literal, one of them gets refactored into a variable,
 * and the invariant becomes a habit. This file turns them into one set the org declares and the
 * runtime consults — which is also the honest shape of the answer to "how many roles do we need":
 * **the shape is a set; the size is the owner's ruling**, and PRD §12-Q12 is still unanswered, so a
 * manifest with more than one seat is refused at parse time rather than half-supported here.
 *
 * Two exclusions, each with a test, because both would be severe bugs if the seat rule reached them:
 *
 *  - **A complainant is not an actor.** `tripShatter(channel, ref)` names who was annoyed, and that
 *    is a member. Seat-checking it would mean a member's complaint is refused because they are not
 *    the organiser — the exact way a governance system turns into a silencer (§2.6 vs §2.7).
 *  - **Answerability is not authority.** `on_behalf_of` may be `'unattributable'` (FR-5.1, D29): an
 *    unnamed human is recorded as unattributable, never as the organiser. If that field had to be a
 *    seat, the cheap fix for "who sent this?" would become "say the organiser said it".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Fleet } from '../src/engine.ts';
import { makeCtx, makePack } from './helpers.ts';
import { parseOrg } from '../src/org.ts';
import { DEFAULT_HUMAN_SEATS, assertSeat } from '../src/roles.ts';
import { disclosureLineEn, disclosureLineId } from '../src/disclosure.ts';

const DAY = 25_200_000; // 07:00 UTC = 14:00 WIB
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const ORG = parseOrg(`schema: kinship-org/v1
key: kinshipai
name: Kinship
human_seats:
  - organiser
agent_roles:
  - event-ops
  - engagement
  - moderator
`);

const fleet = () => new Fleet({ ...makePack({ engagement: { 'draft.promote': 'draft', 'commit.channel-post': 'opt-in-auto' } }), org: ORG }, {}, DAY);

const ANSWERS = { community_name: 'AI Builders ID' };

test('the default seat set is exactly the one seat the runtime has always gated on', () => {
  assert.deepEqual(DEFAULT_HUMAN_SEATS, ['organiser']);
  const ctx = makeCtx(makePack({ engagement: { 'draft.promote': 'draft' } }));
  assert.deepEqual(ctx.settings.humanSeats, ['organiser'], 'no org tier -> the same behaviour, so the pre-existing tests still describe the runtime');
});

test('the four human-only acts accept the seat and refuse a near-miss name', () => {
  for (const impostor of ['co-organiser', 'Organiser', 'organiser ', 'delegate', 'event-ops', 'member']) {
    const f = fleet();
    const card = f.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'e1' }, textId: 'a', textEn: 'b' }).card!;
    assert.throws(() => f.decideCard(card.id, { verdict: 'approve', by: impostor, why: 'x' }), /not_the_human/, `${impostor} is not a seat`);
    assert.throws(() => f.issueGrant({ actionClass: 'draft.promote', kind: 'allow_once', by: impostor }), /not_the_human/);
    assert.throws(() => f.releaseShatter('wa:group-1', impostor), /not_the_human/);
    f.issueGrant({ actionClass: 'draft.promote', kind: 'allow_once', by: 'organiser' });
    assert.throws(() => f.revokeGrant('grant-1', impostor), /not_the_human/, 'D29: revoke is a seat act too');
  }
});

test('a seat refusal names the closed set and points at §12-Q12 — the reader is the owner', () => {
  const f = fleet();
  const card = f.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'e1' }, textId: 'a', textEn: 'b' }).card!;
  try {
    f.decideCard(card.id, { verdict: 'approve', by: 'delegate', why: 'the organiser asked me to' });
    assert.fail('a delegate is not a seat while §12-Q12 is unanswered');
  } catch (e) {
    const msg = String(e);
    assert.match(msg, /not_the_human/);
    assert.match(msg, /organiser/, 'it says what the seats are');
    assert.match(msg, /12-Q12/, 'and why there is only one — this is the setting he has not ruled on');
    assert.match(msg, /delegate/, 'and who was refused');
  }
});

test('the seat check is one helper, reached from all four gates — no fifth literal', () => {
  // The structural half: the literals are gone, and the call is shared. A reviewer who wants to add
  // a human-only act now calls assertSeat; a reviewer who re-inlines `!== 'organiser'` fails here.
  const files = readdirSync(SRC).filter((f) => f.endsWith('.ts') && f !== 'roles.ts');
  const strays = files.filter((f) => /(!==|!=|===)\s*'organiser'/.test(readFileSync(join(SRC, f), 'utf8')));
  assert.deepEqual(strays, [], `${strays.join(', ')} compares the seat literal instead of consulting the resolved seat set`);
  for (const f of ['cards.ts', 'grants.ts', 'shatter.ts']) {
    assert.match(readFileSync(join(SRC, f), 'utf8'), /assertSeat\(/, `${f} must gate through the set`);
  }
});

test('assertSeat is the single rule: it takes the ctx, so it can see the org tier', () => {
  const ctx = makeCtx(makePack({ engagement: {} }), ANSWERS);
  assert.doesNotThrow(() => assertSeat(ctx, 'organiser', 'spec §1.5'));
  assert.throws(() => assertSeat(ctx, 'moderator', 'spec §1.5'), /not_the_human/);
  assert.throws(() => assertSeat(ctx, '', 'spec §1.5'), /not_the_human/, 'an empty actor is not a seat either');
});

test('A COMPLAINANT IS NOT AN ACTOR: tripShatter takes a member and does not seat-check it (§2.6)', () => {
  const f = fleet();
  assert.doesNotThrow(() => f.tripShatter('wa:group-1', 'wa:62812 — bu-dewi'));
  const frozen = f.attempt({ actionClass: 'commit.channel-post', agent: 'engagement', origin: { kind: 'event', id: 'e1' }, channel: 'wa:group-1', textId: 'a', textEn: 'b' });
  assert.equal(frozen.disposition, 'card', 'and the freeze worked: the opt-in-auto lane is draft now (§1.7 narrowing)');
  try { f.releaseShatter('wa:group-1', 'wa:62812 — bu-dewi'); assert.fail('the complainant still cannot release their own freeze'); }
  catch (e) { assert.match(String(e), /not_the_human/); }
  f.releaseShatter('wa:group-1', 'organiser');
  const thawed = f.attempt({ actionClass: 'commit.channel-post', agent: 'engagement', origin: { kind: 'event', id: 'e2' }, channel: 'wa:group-1', textId: 'a', textEn: 'b' });
  assert.equal(thawed.disposition, 'auto', 'released by the seat, and only then does the lane go back');
});

test('ANSWERABILITY IS NOT AUTHORITY: on_behalf_of may be unattributable and is not seat-checked (FR-5.1)', () => {
  const f = new Fleet({ ...makePack({ engagement: { 'commit.channel-post': 'opt-in-auto' } }), org: ORG }, ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  // The grant names its lane, the way every lane-bound grant in this suite does — a grant with no
  // channel cannot authorise a send to a channel (§1.8: an always-grant binds its lane). Without it
  // this test would fail on `grant_not_found` and never reach the gate it is about.
  f.issueGrant({ actionClass: 'commit.channel-post', kind: 'allow_once', channel: 'wa:group-1', by: 'organiser' });
  assert.throws(() => f.commit({
    actionClass: 'commit.channel-post', agent: 'engagement', origin: { kind: 'event', id: 'e1' },
    recipients: ['wa:62811'], onBehalfOf: 'unattributable', channel: 'wa:group-1',
    textId: `x\n\n${disclosureLineId(ANSWERS.community_name)}`, textEn: `y\n\n${disclosureLineEn(ANSWERS.community_name)}`,
  }), /no_transport/, 'it reaches the transport gate, which is the most an unnamed human is allowed to get — not_the_human would mean the fleet invented an organiser');
});

test('an org that declares a different single seat name is honoured, so the seat is a role and not a password', () => {
  const renamed = parseOrg(`schema: kinship-org/v1
key: renamed
name: Renamed
human_seats:
  - ketua
agent_roles: []
`);
  const f = new Fleet({ ...makePack({ engagement: { 'draft.promote': 'draft' } }), org: renamed }, {}, DAY);
  const card = f.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'e1' }, textId: 'a', textEn: 'b' }).card!;
  assert.doesNotThrow(() => f.decideCard(card.id, { verdict: 'approve', by: 'ketua', why: 'waktu dan tempat benar' }));
  const other = fleet();
  const card2 = other.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'e1' }, textId: 'a', textEn: 'b' }).card!;
  assert.throws(() => other.decideCard(card2.id, { verdict: 'approve', by: 'ketua', why: 'x' }), /not_the_human/, 'and it is per-org: ketua is not a seat in the other one');
});
