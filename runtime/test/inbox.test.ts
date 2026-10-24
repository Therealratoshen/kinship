/**
 * The organiser's inbox (`src/inbox.ts`) — the second read over the same log, and the one that answers
 * a different question than `health()` does.
 *
 * `health()` answers *"what is the condition of this?"* in counts, for forwarding. This answers
 * *"what is waiting on me, right now, in the order it has been waiting?"* — the list a volunteer opens
 * on a Tuesday morning. The donor control plane's worklist is an *agent's* assignment queue, gated by
 * exclusive checkout (`research/PAPERCLIP-OSS-STUDY-2026-10-17.md` §3); this is the same shape pointed
 * at a human, because in Kinship the queue is a person's attention, not an agent's throughput. So it
 * carries four kinds of wait and refuses to rank them.
 *
 * The four rules these tests hold shut:
 *
 *  1. **A read, not an event source.** It appends nothing, it is a pure function of the log, and
 *     `Fleet.replay` reproduces it exactly (§1.2). A queue that mutated state would be a fifth
 *     governing actor with no grant and no approval.
 *  2. **Everything a human owes is a row, and every row a human owes is listed.** The failure this
 *     exists to kill is the community one: a reminder that was *approved* but never actually sent,
 *     because in shadow mode the sending is the organiser's own hand (D21). That is the `handoff`
 *     kind, and it is invisible in every artefact this repo had before today.
 *  3. **A member identifier does not ride along** — same rule, same function as `health()`
 *     (`withholdMemberIdentifiers`), because this list gets pasted into a group chat with
 *     co-organisers. Importing the mechanism rather than re-implementing it is the point.
 *  4. **It lists, it does not rank.** A `verdict` item does not know whether the venue card or the
 *     sponsor card matters more, and pretending otherwise would be the sentiment judgement PRD §5
 *     keeps out of v0. So the ordering is age — a fact the log carries — and `limits` says what the
 *     order does not mean.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import { HEALTH_WITHHELD_MEMBER_REF } from '../src/health.ts';
import { INBOX_PREVIEW_MAX } from '../src/inbox.ts';
import { disclosureLineId, disclosureLineEn } from '../src/disclosure.ts';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ANSWERS = {
  community_name: 'AI Builders ID',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser, bukan manusia',
  schedule: 'weekly',
  venue_source: 'manual',
  sponsor_list: 'none',
  rsvp_source_of_truth: 'gform',
};

/** 07:00 UTC = 14:00 WIB — inside the member's allowed send hours. */
const DAY = 25_200_000;

const pack = (classes: Record<string, Record<string, string>>) => makePack(classes);

const TWO_AGENTS = {
  'event-ops': { 'draft.reminder': 'draft' },
  moderator: { 'moderate.flag': 'draft' },
};

const bundle = (textEn = `Weekly practice is still on.\n\n${disclosureLineEn(ANSWERS.community_name)}`) => ({
  textId: `Latihan mingguan tetap jalan ya.\n\n${disclosureLineId(ANSWERS.community_name)}`,
  textEn,
});

const tryCard = (f: Fleet, id = 'kopdar-1') =>
  f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id }, ...bundle() }).card!;

test('an inbox is a read: it appends nothing, twice gives the same answer, and replay reproduces it (§1.2)', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.beginEvent('kopdar-1');
  tryCard(f);
  const before = { events: f.events.length, seq: f.state.seq };
  assert.deepEqual(f.inbox(), f.inbox(), 'a queue with side effects is an actor, and this actor has no grant and no approval');
  assert.equal(f.events.length, before.events);
  assert.equal(f.state.seq, before.seq);

  const p = pack(TWO_AGENTS);
  assert.deepEqual(Fleet.replay(f.events, ANSWERS, p).inbox(), f.inbox(), 'the inbox is a property of the log, not of the process');
});

test('an empty inbox is an empty list, not a null — "nothing waits" must be reportable without invention', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.beginEvent('kopdar-1');
  const r = f.inbox();
  assert.deepEqual(r.items, []);
  assert.deepEqual(r.counts, { verdict: 0, handoff: 0, release: 0, overdue: 0, thread: 0 });
  assert.equal(r.derivedFromSeq, f.state.seq, 'and it still dates and positions itself, because an undated all-clear is a claim');
});

test('a pending card is a verdict item with its age and a preview of the words a human must read', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  const card = tryCard(f);
  f.advance(7_200_000);
  const r = f.inbox();
  const item = r.items.find((i) => i.kind === 'verdict');
  assert.ok(item);
  assert.equal(item!.ref, card.id);
  assert.equal(item!.ageMs, 7_200_000, 'how long a person has waited is the fact; depth alone hides the one nobody touched');
  assert.equal(item!.action, 'approve, edit, or reject — with a why (§1.5)');
  assert.match(item!.detail, /draft\.reminder/, 'the class tells the organiser what kind of promise this is');
  assert.match(item!.detail, /event:kopdar-1/);
  assert.match(item!.detail, /Latihan mingguan tetap jalan/, 'and the draft in its primary language (pack locale [id, en]): a verdict on unread copy is not a verdict');
});

test('an approved card nobody has actually sent is a handoff item — shadow mode\'s hidden queue (D21)', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  const card = tryCard(f);
  f.advance(3_600_000);
  f.decideCard(card.id, { verdict: 'approve', by: 'organiser', why: 'waktu dan tempat sudah benar' });
  f.advance(86_400_000); // a day later: approved, authorised, and still not sent by anyone

  const r = f.inbox();
  assert.deepEqual(r.counts, { verdict: 0, handoff: 1, release: 0, overdue: 0, thread: 0 },
    'the card left the verdict queue the moment it was approved, so a queue that only lists pending cards reports an all-clear while a reminder sits unsent');
  const handoff = r.items.find((i) => i.kind === 'handoff')!;
  assert.equal(handoff.ref, card.id);
  assert.equal(handoff.ageMs, 86_400_000, 'aged from the approval, because that is when the debt to the member started');
  assert.match(handoff.action, /by hand/, 'the action names the only way it clears in phase 1: the organiser sends it themselves');

  // The internal, recipient-less commit consumes the authorization — which is the send happening.
  f.commit({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' }, recipients: [], onBehalfOf: 'organiser', authorizationToken: `auth-${card.id}`, ...bundle() });
  assert.deepEqual(f.inbox().counts.handoff, 0, 'a consumed authorization is delivered work, not outstanding work');
});

test('a frozen lane is a release item naming the lane, never the member who complained (§2.6)', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.tripShatter('telegram', 'wa:62811');
  f.advance(3_600_000);
  const item = f.inbox().items.find((i) => i.kind === 'release')!;
  assert.equal(item.ref, 'telegram');
  assert.equal(item.ageMs, 3_600_000);
  assert.match(item.action, /release/);
  assert.ok(!JSON.stringify(f.inbox()).includes('wa:62811'), 'the lane is down; who said so is not this list\'s business (§2.3)');

  f.releaseShatter('telegram', 'organiser');
  assert.deepEqual(f.inbox().counts.release, 0, 'a released lane is history, not outstanding work');
});

test('a wake whose time has passed is an overdue item, and its purpose is withheld before it is shown (§1.3)', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.scheduleWake({ purpose: 'nudge wa:62811 about the venue change', nextCheckAt: DAY + 600_000, eventId: 'kopdar-1' });
  f.advance(1_200_000);
  const item = f.inbox().items.find((i) => i.kind === 'overdue')!;
  assert.equal(item.ref, 'wake-1');
  assert.equal(item.ageMs, 600_000, 'past due by ten minutes, measured from the due time, not from when it was scheduled');
  assert.match(item.detail, /about the venue change/, 'the promise is still identifiable — containment substitutes the identifier, not the sentence');
  assert.ok(!JSON.stringify(f.inbox()).includes('wa:62811'));
  assert.ok(JSON.stringify(f.inbox()).includes(HEALTH_WITHHELD_MEMBER_REF));

  f.fireWake('wake-1');
  assert.deepEqual(f.inbox().counts.overdue, 0, 'a fired wake is not outstanding work — attempts is the proof it ran');
});

test('items are ordered by how long a human has owed them, oldest first, across kinds', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.tripShatter('telegram', 'a complaint the organiser filed');   // oldest wait
  f.advance(1_000);
  tryCard(f);                                                      // then a card
  f.advance(1_000);
  f.scheduleWake({ purpose: 't-minus-1 venue check', nextCheckAt: f.now() }); // then a wake, due now
  const ages = f.inbox().items.map((i) => i.ageMs);
  assert.deepEqual(ages, [...ages].sort((a, b) => b - a), 'the list reads as a queue, not as a grouped-by-kind report');
  assert.deepEqual(f.inbox().items.map((i) => i.kind), ['release', 'verdict', 'overdue']);
});

test('member inputs are counted and explicitly not turned into a per-person to-do list (§2.3, PRD §5)', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.registerInput('wa:62811', 'halo, bisa batal tidak besok?');
  f.attempt({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' },
    triggerInput: f.registerInput('wa:62811', 'saya tidak mau dapat pesan lagi'), ...bundle(),
  });
  const r = f.inbox();
  assert.equal(r.memberInputs.received, 2, 'two messages arrived');
  assert.equal(r.memberInputs.awaitingVerdict, 1, 'one of them produced a card nobody has decided');
  assert.equal(r.memberInputs.linkable, false, 'and the log carries no input→card link, so the list says so instead of implying one (§1.2)');
  assert.match(r.memberInputs.note, /cannot be joined/, `the note names the defect rather than hiding it: ${r.memberInputs.note}`);
  assert.ok(!JSON.stringify(r).includes('62811'), 'no member identifier in the count either');
});

test('an escalation card reads as a verdict item with its own marker, because a stuck human is the outage', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');       // registry, not regex: a known member is protected
  f.raiseEscalation('wa:62811 asked for a refund of the ticket', 'organiser');
  f.advance(5_400_000);
  const item = f.inbox().items.find((i) => i.kind === 'verdict')!;
  assert.equal(item.ageMs, 5_400_000);
  assert.match(item.detail, /engine\.escalation/);
  assert.match(item.detail, /member identifier withheld/, 'the origin id is the escalation purpose — free text about a person, so it is swept on the way out');
  assert.ok(!JSON.stringify(f.inbox()).includes('wa:62811'), 'an escalation purpose is free text written by a human about a person — withheld like every other free text here');
});

test('a long draft is previewed, not dumped: withholding happens before the cut, so a clipped token cannot leak', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  // The identifier sits past the cut line — the shape that makes truncate-then-withhold a leak.
  const long = `${'y'.repeat(400)} wa:62811 please call the venue`;
  f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' }, textId: long, textEn: 'a long draft' });
  const item = f.inbox().items.find((i) => i.kind === 'verdict')!;
  assert.ok(item.detail.length < INBOX_PREVIEW_MAX + 120, `bounded preview, not the whole 400-char draft (${item.detail.length})`);
  assert.ok(!JSON.stringify(f.inbox()).includes('wa:62811'), 'a person does not travel in a list that got cut mid-sentence');
});

test('the inbox says what the ordering does not mean, and never claims to know whose turn it is', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  tryCard(f);
  const r = f.inbox();
  const text = r.limits.join(' ').toLowerCase();
  assert.match(text, /rank/, 'it states that age is not importance (PRD §5 keeps judgement out)');
  assert.match(text, /who|hand/, 'and that it cannot see whether the organiser actually sent the handoff by hand — no transport, no receipt (D21)');
  assert.deepEqual(Object.keys(r.counts).sort(), ['handoff', 'overdue', 'release', 'thread', 'verdict'],
    'five kinds, closed — the fifth is a thread (spec §2.14 / FR-5.13), and a sixth would need a spec rule first');
});

test('the fifth kind has the spec rule it was required to have — and the rule is where the doc says it is', () => {
  // This test used to say "a fifth would need a spec rule first", and it was right: the fifth kind
  // (a `thread` — a question the community owes an answer to) arrived in D55, and the rule it needed is
  // spec §2.14. The check that the rule EXISTS is the point: without it, the kinds could grow with
  // nothing written down, and "the kinds are closed" would be a claim about a number rather than
  // about a document.
  const spec = readFileSync(join(ROOT, 'spec', 'GOVERNANCE-SPEC-OUTLINE.md'), 'utf8');
  assert.match(spec, /### 2\.14 /, 'spec §2.14 — the community\'s open threads — is where the rule lives');
  assert.match(spec, /FR-5\.13/, 'and it names the requirement it implements');
  assert.match(spec, /thread/, 'and it is about threads, not about something else that happens to be numbered 2.14');
});
