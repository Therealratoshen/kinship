/**
 * The fleet-condition snapshot (`src/health.ts`) — the thing this repo did NOT have before
 * 2026-10-18: a read of the fleet's own state that is more than a per-action refusal.
 *
 * Three rules these tests hold shut, in order of how much they cost to get wrong:
 *
 *  1. **Derived, never asserted.** Every number comes from a row the fleet already logged, so the
 *     report is replayable and cannot invent a condition. A read that mutates the log would
 *     corrupt §1.2's replay property, so that is tested too.
 *  2. **It counts the fleet, not the people.** `PRD §5` puts member-intelligence / churn scoring
 *     out of scope, so there is no per-member row and no rate here — and the report says out loud
 *     what it cannot see. A health read that quietly becomes a sentiment metric is the failure
 *     mode this file exists to make impossible.
 *  3. **A member identifier does not ride along.** The report is the artefact an organiser
 *     forwards — to a co-organiser, a sponsor, a hub — so a free-text field naming a member is
 *     substituted on the way out, the same containment move §1.7 makes for drafting context.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import { HEALTH_WITHHELD_MEMBER_REF } from '../src/health.ts';
import {disclosureLine} from '../src/disclosure.ts';

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

const bundle = () => ({
  text: { id: `Latihan mingguan tetap jalan ya.\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `Weekly practice is still on.\n\n${disclosureLine('en', ANSWERS.community_name)}` },
});

const TWO_AGENTS = {
  'event-ops': { 'draft.reminder': 'draft' },
  moderator: { 'moderate.flag': 'draft' },
};

test('a health snapshot is a read: it changes nothing, and taking it twice gives the same answer', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.beginEvent('kopdar-1');
  const before = { events: f.events.length, seq: f.state.seq };
  const first = f.health();
  const second = f.health();
  assert.deepEqual(second, first, 'the read must be a pure function of the log — a health check with side effects is an event source of its own');
  assert.equal(f.events.length, before.events, 'a snapshot appends nothing to the audit log');
  assert.equal(f.state.seq, before.seq);
});

test('the snapshot is dated and positioned — an undated health read is a claim, not a measurement', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.beginEvent('kopdar-1');
  f.advance(60_000);
  const r = f.health();
  assert.equal(r.derivedAt, f.now(), 'the clock it is true at, so a stale read reads as stale');
  assert.equal(r.derivedFromSeq, f.state.seq, 'and the log position it was derived from');
});

test('a live shatter freeze shows with its age; a released one does not — and the complaint reference never shows', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.tripShatter('telegram', 'wa:62811');           // the ref is a member identifier
  f.advance(3_600_000);                              // one hour of a lane sitting frozen
  const r = f.health();
  assert.equal(r.freezes.length, 1);
  assert.equal(r.freezes[0]!.channel, 'telegram');
  assert.equal(r.freezes[0]!.ageMs, 3_600_000, 'how long a lane has been down is the health fact; who complained is not');
  assert.ok(!JSON.stringify(r).includes('wa:62811'), 'the freeze names the lane, never the person behind the complaint');

  f.releaseShatter('telegram', 'organiser');
  assert.deepEqual(f.health().freezes, [], 'a released freeze is history, not current condition');
});

test('queue depth and the age of the oldest pending card are read off the cards that exist', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  const one = f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' }, ...bundle() });
  assert.ok(one.card);
  f.advance(7_200_000);                              // two hours, nobody has decided
  const r = f.health();
  assert.equal(r.queue.pending, 1);
  assert.equal(r.queue.cap, 20, 'the cap is the pack\'s, and the report prints it so a reader can see how close this is to full');
  assert.equal(r.queue.oldestPendingAgeMs, 7_200_000, 'depth alone hides the real failure: one card nobody has touched in two hours');

  f.decideCard(one.card!.id, { verdict: 'approve', by: 'organiser', why: 'ok' });
  assert.deepEqual(f.health().queue, { pending: 0, cap: 20, oldestPendingAgeMs: null, escalationPending: 0, oldestEscalationAgeMs: null },
    'a decided card leaves the queue, and an empty queue reports null age rather than zero — zero would claim a card aged nothing');
});

test('an escalation the organiser has not answered ages on its own, because a stuck human is the outage', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.raiseEscalation('the venue cancelled', 'organiser');
  f.advance(5_400_000);
  const r = f.health();
  assert.equal(r.queue.escalationPending, 1);
  assert.equal(r.queue.oldestEscalationAgeMs, 5_400_000);
});

test('an unset ceiling reports as unset, never as zero spend against nothing', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.setBudget('kopdar-1', null);                     // PRD §12-Q9: the honest boot state
  const r = f.health();
  const b = r.budgets.find((x) => x.eventId === 'kopdar-1');
  assert.ok(b);
  assert.equal(b!.ceilingIdr, null);
  assert.equal(b!.ratio, null, 'a ratio against an unset ceiling would be an invented number (invariant #3)');
  assert.equal(b!.warned, false);
  assert.equal(b!.stopped, false);
});

test('a warned and a hard-stopped budget carry their ratio, because the stop is a condition to see', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.setBudget('kopdar-1', 100_000);
  f.recordSpend('kopdar-1', 85_000, 'recap drafting');   // crosses 0.8 → warned; under the ceiling
  let r = f.health();
  let b = r.budgets.find((x) => x.eventId === 'kopdar-1')!;
  assert.equal(b.warned, true);
  assert.equal(b.stopped, false);
  assert.equal(b.ratio, 0.85);

  assert.throws(() => f.recordSpend('kopdar-1', 20_000, 'more'), /budget_hard_stop/);
  r = f.health();
  b = r.budgets.find((x) => x.eventId === 'kopdar-1')!;
  assert.equal(b.stopped, true, 'and the stopped event is the one whose lanes will silently do nothing');
});

test('a wake whose time has passed and never fired is overdue — liveness without a scheduler', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.scheduleWake({ purpose: 't-minus-1 reminder check', nextCheckAt: DAY + 600_000, eventId: 'kopdar-1' });
  f.advance(1_200_000);                              // past due, nobody woke it
  const r = f.health();
  assert.equal(r.wakes.scheduled, 1);
  assert.equal(r.wakes.overdue.length, 1);
  assert.equal(r.wakes.overdue[0]!.dueAgeMs, 600_000);
  assert.equal(r.wakes.overdue[0]!.purpose, 't-minus-1 reminder check');

  f.fireWake(r.wakes.overdue[0]!.id);
  assert.deepEqual(f.health().wakes.overdue, [], 'a fired wake is not overdue — attempts is the proof it ran');
});

test('refusals are counted by code, and no_transport is the number of sends a human did by hand', () => {
  const f = Fleet.boot(pack({ 'event-ops': { 'draft.reminder': 'draft' } }), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  const card = f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' }, ...bundle() }).card!;
  f.decideCard(card.id, { verdict: 'approve', by: 'organiser', why: 'ok' });
  assert.throws(() => f.commit({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' },
    recipients: ['wa:62811'], onBehalfOf: 'organiser', authorizationToken: `auth-${card.id}`, ...bundle(),
  }), /no_transport/);
  const r = f.health();
  const noTransport = r.refusals.find((x) => x.code === 'no_transport');
  assert.ok(noTransport, 'phase 1\'s whole promise shows up as a count: this many deliveries were the organiser\'s hand');
  assert.equal(noTransport!.count, 1);
});

test('FR-1.11: an agent with no recorded action across three event cycles is surfaced for retirement, not left running', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  for (const id of ['kopdar-1', 'kopdar-2', 'kopdar-3']) {
    f.beginEvent(id);
    f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id }, ...bundle() });
  }
  const r = f.health();
  const mod = r.idleAgents.find((a) => a.agent === 'moderator')!;
  assert.deepEqual({ ...mod }, { agent: 'moderator', actions: 0, cycles: 3, recommendation: 'retire' },
    'the PRD\'s own acceptance shape: {agent, actions:0, cycles:3, recommendation:"retire"}');
  assert.equal(r.idleAgents.find((a) => a.agent === 'event-ops')!.recommendation, 'active', 'and the one that works is not flagged');
});

test('FR-1.11 below the threshold says watch, not retire — three cycles is the PRD\'s number, not ours to shrink', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.beginEvent('kopdar-1');
  f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' }, ...bundle() });
  const mod = f.health().idleAgents.find((a) => a.agent === 'moderator')!;
  assert.equal(mod.cycles, 1);
  assert.equal(mod.recommendation, 'watch', 'retiring a moderator after one event would be a recommendation the evidence does not support');
});

test('a member identifier in a free-text field is withheld from the report, not forwarded', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.scheduleWake({ purpose: 'nudge wa:62811 about the venue change', nextCheckAt: DAY + 600_000 });
  f.advance(1_200_000);
  const raw = JSON.stringify(f.health());
  assert.ok(raw.includes(HEALTH_WITHHELD_MEMBER_REF), 'a fixed sentence, not a masked preview (§1.7\'s precedent)');
  assert.ok(!raw.includes('wa:62811'), 'the report is the artefact an organiser forwards — a person does not travel in it');
  assert.ok(raw.includes('about the venue change'), 'and it substitutes the identifier, not the whole field: the organiser still sees which promise is overdue');
});

test('a member identifier written bare is withheld too, and a field naming no one passes through untouched', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  // The bare form is the same person (`partner.ts`: registry, not regex), so it goes too.
  f.scheduleWake({ purpose: 'nudge 62811 about the venue', nextCheckAt: DAY + 600_000 });
  // Both spellings of one member in one field: longest-first substitution, so no orphaned `wa:` is left.
  f.scheduleWake({ purpose: 'both wa:62811 and 62811 named here', nextCheckAt: DAY + 600_000 });
  f.scheduleWake({ purpose: 't-minus-1 venue check', nextCheckAt: DAY + 600_000 });
  f.advance(1_200_000);
  const purposes = f.health().wakes.overdue.map((w) => w.purpose);
  assert.ok(purposes.includes(`nudge ${HEALTH_WITHHELD_MEMBER_REF} about the venue`),
    `bare form not withheld: ${JSON.stringify(purposes)}`);
  assert.equal(purposes.find((p) => p.startsWith('both')),
    `both ${HEALTH_WITHHELD_MEMBER_REF} and ${HEALTH_WITHHELD_MEMBER_REF} named here`,
    'both spellings of one member go, and the prefixed form must not leave an orphaned `wa:` behind');
  assert.ok(purposes.includes('t-minus-1 venue check'), 'a field that names no member is forwarded exactly as written; this is containment, not scrubbing');
});

test('the snapshot counts the fleet and refuses to judge the people: no per-member row, no rate, and it says what it cannot see', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.registerMember('wa:62899', 'Asia/Jakarta');
  f.suppressMember('wa:62899', 'member');
  const r = f.health();
  assert.deepEqual(Object.keys(r.members).sort(), ['registered', 'suppressed'],
    'two counts, because PRD §5 puts member-intelligence / churn scoring out of scope — no per-member entry and no rate');
  assert.equal(r.members.registered, 2);
  assert.equal(r.members.suppressed, 1);

  const text = r.unmeasured.join(' ').toLowerCase();
  assert.ok(text.includes('sentiment') && text.includes('churn'), 'it names the thing it will not measure');
  assert.ok(text.includes('nothing has sent'), 'and why it cannot: phase 1 ships no transport (D21/D9), so there is no member traffic to read');
});

test('replay reproduces the snapshot exactly — the health read is a property of the log, not of the process (§1.2)', () => {
  const f = Fleet.boot(pack(TWO_AGENTS), ANSWERS, DAY);
  f.beginEvent('kopdar-1');
  f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' }, ...bundle() });
  f.advance(600_000);
  f.scheduleWake({ purpose: 't-minus-1 check', nextCheckAt: DAY, eventId: 'kopdar-1' });
  f.tripShatter('telegram', 'a complaint the organiser filed');   // last event, so the replayed clock matches
  const p = pack(TWO_AGENTS);
  const replayed = Fleet.replay(f.events, ANSWERS, p);
  assert.deepEqual(replayed.health(), f.health());
});
