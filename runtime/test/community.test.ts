/**
 * The community's coverage window — the hours a human is actually on duty to answer for this
 * community — and the one thing it decides: whether a pending obligation missed a staffed shift.
 *
 * Why this is not the member's quiet hours. FR-5.5 puts quiet hours in the *member's* local time
 * (`members.ts` refuses a send outside 21:00–07:59 in the member's own zone). That clock answers
 * "may I contact this person". The clock in this file answers a different question: "was anyone
 * watching when this community was left waiting". They are the two gaps the SLA literature keeps
 * separate, and keeping them separate here is the point — one is a member's protection, the other is
 * a community's own staffing promise.
 *
 * Three rules, each with a test that can fail:
 *
 *  1. **Wall clock, never an offset.** A coverage window is a statement about the *community's*
 *     local calendar ("09:00 in Jakarta"), so it is evaluated in the community's timezone, not by
 *     subtracting a UTC offset from a stored instant. A window that spans a DST transition therefore
 *     keeps its local meaning — 09:00 is 09:00 on both sides of the change. This is also why the
 *     arithmetic below never converts an instant to UTC: doing so is exactly how a "09:00–18:00
 *     staffed window" silently becomes "10:00–19:00" twice a year.
 *  2. **A shift that has not ended yet has not been missed.** An obligation raised at 10:00 and
 *     still open at 12:00 has not missed the shift that ends at 18:00 — it is inside it. Only a
 *     shift whose end has passed counts, which is the SLA rule ("requests submitted outside
 *     coverage hours have their response-time clock start at the beginning of the next coverage
 *     window" — ArcadeDB's SLA, read 2026-10-22).
 *  3. **A gap over a weekend is not a missed shift.** Created Friday 20:00, still open Monday
 *     10:00, staffed days Monday–Friday: Friday's shift ended *before* the obligation existed and
 *     Monday's has not ended yet, so nothing was missed. This is the "Friday 5:30pm → clock starts
 *     Monday 9am" case, and it is the single rule that separates a staffing promise from a blame
 *     metric.
 *
 * And the honest nulls: a pack that declares no coverage window has an *unknown* duty state, not an
 * always-on one, and `null` is what this file reports for "we cannot tell". Zero is a claim that
 * nothing was missed; `null` is the absence of the claim (§2.9's discipline, applied to staffing).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import { isOnDuty, shiftCompletedBetween, deriveCoverageVerdict } from '../src/community.ts';
import type { CommunityCoverage } from '../src/types.ts';

const DAY = 86_400_000;

/** Staffed Monday–Friday, 09:00–18:00, in the community's own timezone. */
const JAKARTA = (over: Partial<Extract<CommunityCoverage, { mode: 'staffed' }>> = {}): CommunityCoverage => ({
  mode: 'staffed',
  timezone: 'Asia/Jakarta',
  days: [1, 2, 3, 4, 5], // 0 = Sunday
  opens: 9 * 60,
  closes: 18 * 60,
  ...over,
});

/** 2026-07-20 is a Monday. These are local wall-clock times in `tz`. */
const local = (tz: string, y: number, mo: number, d: number, h: number, mi: number): number => {
  // Build the instant by asking the zone what its wall clock reads, then walking back — the
  // standard two-step, and the one place a UTC offset IS correct (an instant, not a window).
  const probe = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(probe)).map((p) => [p.type, p.value]));
  const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return probe - (shown - probe);
};

test('a community is on duty inside its own staffed window, in its own timezone', () => {
  const cov = JAKARTA();
  assert.equal(isOnDuty(cov, local('Asia/Jakarta', 2026, 7, 20, 10, 0)), true, 'Monday 10:00 in Jakarta is inside 09:00–18:00');
  assert.equal(isOnDuty(cov, local('Asia/Jakarta', 2026, 7, 20, 8, 59)), false, 'a minute before the window opens, nobody is on duty');
  assert.equal(isOnDuty(cov, local('Asia/Jakarta', 2026, 7, 20, 18, 0)), false, 'the window closes at 18:00 — the end is not inside');
  assert.equal(isOnDuty(cov, local('Asia/Jakarta', 2026, 7, 20, 17, 59)), true);
});

test('the same instant is on duty in one community and not in another — the window is the community\'s clock, not UTC', () => {
  const instant = local('Asia/Jakarta', 2026, 7, 20, 10, 0); // 03:00 UTC
  assert.equal(isOnDuty(JAKARTA(), instant), true, '10:00 in Jakarta is staffed');
  assert.equal(
    isOnDuty(JAKARTA({ timezone: 'America/New_York' }), instant),
    false,
    'the same instant is 03:00 in New York — a window is a local-wall-clock statement',
  );
});

test('weekends are off duty, and "always" is on duty at every hour of every day', () => {
  assert.equal(isOnDuty(JAKARTA(), local('Asia/Jakarta', 2026, 7, 25, 10, 0)), false, 'Saturday is not a staffed day');
  assert.equal(isOnDuty(JAKARTA(), local('Asia/Jakarta', 2026, 7, 26, 10, 0)), false, 'Sunday is not a staffed day');
  const always: CommunityCoverage = { mode: 'always', timezone: 'Asia/Jakarta' };
  assert.equal(isOnDuty(always, local('Asia/Jakarta', 2026, 7, 26, 3, 0)), true);
});

test('a 24/7 community never misses a shift — there is no shift to end', () => {
  // "Always" is a real mode, not an edge case, and it makes exactly one claim: the community is
  // staffed around the clock. That has a consequence the staffed mode does not — there is no shift
  // end, so the clock never pauses and no obligation can have outlived one. Reading it the other
  // way (a 24/7 community whose members wait for a shift that will never end) would be a rule
  // nobody asked for, and it would be the kind of bug that only shows up on a community that
  // genuinely never sleeps.
  const always: CommunityCoverage = { mode: 'always', timezone: 'Asia/Jakarta' };
  const raised = local('Asia/Jakarta', 2026, 7, 20, 10, 0);
  assert.equal(shiftCompletedBetween(always, raised, local('Asia/Jakarta', 2026, 7, 21, 10, 0)), false,
    'no shift ends, so nothing can have outlived a shift');
  const verdict = deriveCoverageVerdict(always, [{ kind: 'card', ref: 'c1', dueAt: raised }], local('Asia/Jakarta', 2026, 7, 21, 10, 0));
  assert.equal(verdict.onDutyNow, true, 'a 24/7 community is on duty at the moment of the read');
  assert.equal(verdict.missedShift?.count, 0, 'and the missed count is zero — a measurement, not an absence');
});

test('a shift that has not ended yet has not been missed', () => {
  const cov = JAKARTA();
  const raised = local('Asia/Jakarta', 2026, 7, 20, 10, 0);
  assert.equal(shiftCompletedBetween(cov, raised, local('Asia/Jakarta', 2026, 7, 20, 12, 0)), false,
    'the shift ends at 18:00; at 12:00 the obligation is inside it, not past it');
  assert.equal(shiftCompletedBetween(cov, raised, local('Asia/Jakarta', 2026, 7, 20, 18, 0)), true,
    'at 18:00 the shift has ended');
});

test('a shift on a later day that ends exactly at the read counts as missed — the boundary is inclusive', () => {
  // The same rule, one path over: the shift that ended is on a LATER date than the obligation, and
  // its end lands exactly on the instant of the read. At that instant the shift is over and the
  // obligation is still open, so the shift was missed. A boundary that counted the other way would
  // make the answer depend on which day the obligation was raised — and a rule that depends on the
  // day is a rule nobody can hold in their head.
  const cov = JAKARTA();
  const raised = local('Asia/Jakarta', 2026, 7, 24, 20, 0); // Friday 20:00 — after Friday's shift
  assert.equal(
    shiftCompletedBetween(cov, raised, local('Asia/Jakarta', 2026, 7, 27, 18, 0)),
    true,
    'Monday\'s shift ends at exactly 18:00 on the day of the read, with the obligation still open',
  );
  assert.equal(
    shiftCompletedBetween(cov, raised, local('Asia/Jakarta', 2026, 7, 27, 17, 59)),
    false,
    'a minute before that end, the shift is still running',
  );
});

test('a gap over a weekend is not a missed shift — Friday 20:00 to Monday 10:00', () => {
  const cov = JAKARTA();
  const raised = local('Asia/Jakarta', 2026, 7, 24, 20, 0); // Friday 20:00
  assert.equal(
    shiftCompletedBetween(cov, raised, local('Asia/Jakarta', 2026, 7, 27, 10, 0)),
    false,
    'Friday\'s shift ended before the obligation existed; Monday\'s has not ended yet — nothing was missed',
  );
  assert.equal(
    shiftCompletedBetween(cov, raised, local('Asia/Jakarta', 2026, 7, 28, 9, 30)),
    true,
    'by Tuesday morning Monday\'s shift has ended — now it was missed',
  );
});

test('the window keeps its local meaning across a DST transition — no offset is stored', () => {
  // Europe/London moves to BST on 2026-03-29. A staffed 09:00–18:00 window must still open at
  // 09:00 local on both sides of the change; a stored UTC offset would open it at 08:00 local
  // after the switch.
  const cov: CommunityCoverage = { mode: 'staffed', timezone: 'Europe/London', days: [0, 1, 2, 3, 4, 5, 6], opens: 9 * 60, closes: 18 * 60 };
  assert.equal(isOnDuty(cov, local('Europe/London', 2026, 3, 28, 9, 0)), true, 'the Saturday before the change');
  assert.equal(isOnDuty(cov, local('Europe/London', 2026, 3, 30, 9, 0)), true, 'the Monday after the change — still 09:00 local');
});

test('the health read carries the coverage window, the duty state, and what it cannot say', () => {
  const pack = makePack({ 'community-lead': { 'observe.read': 'opt-in-auto', 'report.assemble': 'draft' } }, JAKARTA());
  const f = Fleet.boot(pack, { community_name: 'AI Builders ID' }, local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  f.beginEvent('kopdar-1');
  f.attempt({
    actionClass: 'report.assemble', agent: 'community-lead', origin: { kind: 'event', id: 'kopdar-1' },
    textId: 'Rekap mingguan: 19 orang hadir.\n\nbot ini asisten organiser, bukan manusia',
    textEn: 'Weekly recap: 19 people attended.\n\nI am the organiser\'s assistant, not a human',
  });
  const h = f.health();
  assert.equal(h.community.coverage?.mode, 'staffed');
  assert.equal(h.community.coverage?.timezone, 'Asia/Jakarta');
  assert.equal(h.community.onDutyNow, true);
  assert.equal(h.community.missedShift?.count, 0, 'the card was raised 10:00 and the shift ends at 18:00 — nothing missed yet');
});

test('an obligation that outlives its staffed shift is counted, and a pack with no window reports nulls — not zeroes', () => {
  const pack = makePack({ 'community-lead': { 'observe.read': 'opt-in-auto', 'report.assemble': 'draft' } }, JAKARTA());
  const f = Fleet.boot(pack, { community_name: 'AI Builders ID' }, local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  f.beginEvent('kopdar-1');
  f.attempt({
    actionClass: 'report.assemble', agent: 'community-lead', origin: { kind: 'event', id: 'kopdar-1' },
    textId: 'Rekap mingguan: 19 orang hadir.\n\nbot ini asisten organiser, bukan manusia',
    textEn: 'Weekly recap: 19 people attended.\n\nI am the organiser\'s assistant, not a human',
  });
  f.advance(local('Asia/Jakarta', 2026, 7, 21, 9, 0) - local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  const h = f.health();
  assert.equal(h.community.missedShift?.count, 1, 'Tuesday 09:00 — Monday\'s shift ended with the card still open');
  assert.equal(h.community.onDutyNow, true);

  const noWindow = Fleet.boot(makePack({ 'community-lead': { 'observe.read': 'opt-in-auto' } }), { community_name: 'AI Builders ID' }, local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  const h2 = noWindow.health();
  assert.equal(h2.community.coverage, null, 'no window declared is a fact about the pack');
  assert.equal(h2.community.onDutyNow, null, 'unknown duty state is null — zero would claim the community was never on duty');
  assert.equal(h2.community.missedShift, null, 'with no window there is no shift to have missed');
});

test('the coverage read is a read: it appends nothing, and replay reproduces it exactly (§1.2)', () => {
  const pack = makePack({ 'community-lead': { 'observe.read': 'opt-in-auto' } }, JAKARTA());
  const f = Fleet.boot(pack, { community_name: 'AI Builders ID' }, local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  f.beginEvent('kopdar-1');
  const before = { events: f.events.length, seq: f.state.seq };
  const first = f.health().community;
  const second = f.health().community;
  assert.deepEqual(second, first, 'two reads of the same state give the same answer');
  assert.equal(f.events.length, before.events, 'the read appends nothing to the audit log');
  assert.equal(f.state.seq, before.seq);
});

test('the coverage section carries no member identifier — the count is a count, and the note is a fixed sentence', () => {
  // The privacy sweep in `health.ts` substitutes member references in the *text* fields it prints. The
  // coverage section prints none — it carries a count and a fixed note — so a member identifier
  // cannot reach it even by accident. That is worth pinning: a future change that adds a "which
  // obligation" list to this section would have to add the sweep with it, and this test is what
  // would say so.
  const pack = makePack({ 'community-lead': { 'observe.read': 'opt-in-auto' } }, JAKARTA());
  const f = Fleet.boot(pack, { community_name: 'AI Builders ID' }, local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.beginEvent('kopdar-1');
  f.tripShatter('telegram', 'wa:62811');
  f.scheduleWake({ purpose: 'nudge wa:62811 about the venue change', nextCheckAt: local('Asia/Jakarta', 2026, 7, 21, 10, 0), eventId: 'kopdar-1' });
  f.advance(local('Asia/Jakarta', 2026, 7, 21, 10, 0) - local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  const community = f.health().community;
  assert.ok(!JSON.stringify(community).includes('wa:62811'), 'no member reference reaches the coverage section');
  assert.equal(community.missedShift?.count, 1, 'the missed shift is still counted — the count is about the shift, not the person');
});
