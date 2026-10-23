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
  windows: [{ days: [1, 2, 3, 4, 5], opens: 9 * 60, closes: 18 * 60 }], // 0 = Sunday
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
  const verdict = deriveCoverageVerdict(always, [{ dueAt: raised }], local('Asia/Jakarta', 2026, 7, 21, 10, 0));
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
  const cov: CommunityCoverage = { mode: 'staffed', timezone: 'Europe/London', windows: [{ days: [0, 1, 2, 3, 4, 5, 6], opens: 9 * 60, closes: 18 * 60 }] };
  assert.equal(isOnDuty(cov, local('Europe/London', 2026, 3, 28, 9, 0)), true, 'the Saturday before the change');
  assert.equal(isOnDuty(cov, local('Europe/London', 2026, 3, 30, 9, 0)), true, 'the Monday after the change — still 09:00 local');
});

test('a shift that ended exactly when the obligation was raised is not a miss — the interval is (from, to]', () => {
  // The `from` end of the interval is exclusive, and the `to` end is inclusive. The `to` end was
  // pinned by the boundary test above; this pins the other one. A shift that ended at the very instant
  // the obligation was raised did not leave it waiting — the obligation arrived as the shift closed, so
  // the next shift is the one that owes it an answer. An inclusive-from reading would count the
  // closing shift as missed, and would blame a community for a shift that ended before its obligation
  // existed.
  const cov = JAKARTA();
  const shiftEnd = local('Asia/Jakarta', 2026, 7, 20, 18, 0); // Monday 18:00 — the shift's end
  const later = local('Asia/Jakarta', 2026, 7, 21, 10, 0);     // Tuesday 10:00
  assert.equal(
    shiftCompletedBetween(cov, shiftEnd, later),
    false,
    'the shift ended at the instant the obligation was raised — it did not leave the obligation waiting',
  );
  // One minute earlier and the shift DID leave it waiting.
  assert.equal(
    shiftCompletedBetween(cov, shiftEnd - 60_000, later),
    true,
    'raised a minute before the shift ended, the obligation outlived that shift',
  );
  // And raised after the shift ended, the same answer: no shift ended after it.
  assert.equal(
    shiftCompletedBetween(cov, shiftEnd + 60_000, later),
    false,
    'raised after the shift ended, no shift ended after the obligation existed',
  );
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

  // The name of this test promises a replay, so the test does one: `Fleet.replay` rebuilds the fleet
  // from the log alone, and the coverage section must come back identical. A read that depends on
  // anything the log does not carry would differ here — which is the whole claim of §1.2.
  const answers = { community_name: 'AI Builders ID' };
  const replayed = Fleet.replay(f.events, answers, pack);
  assert.deepEqual(
    replayed.health().community,
    first,
    'the coverage section is a property of the log, not of the process that read it',
  );
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

test('the zone formatters are reused, not rebuilt — the arithmetic is a read, not a formatter factory', () => {
  // `Intl.DateTimeFormat` costs about 0.1 ms to construct, and the arithmetic asks for the local
  // calendar of the same zone once per obligation and once per candidate day. Without a cache, a
  // health read over a queue of any size spends its whole time building formatters. The cache is a
  // performance property, so it is worth a test: the same answer must come back every time, which
  // is what a stale or shared formatter would break.
  const cov = JAKARTA();
  const at = local('Asia/Jakarta', 2026, 7, 20, 10, 0);
  const first = isOnDuty(cov, at);
  const second = isOnDuty(cov, at);
  assert.equal(second, first, 'the same instant must read the same way twice');
  // A second zone must not contaminate the first one's reading — the cache is keyed by the zone.
  assert.equal(isOnDuty(JAKARTA({ timezone: 'Europe/London' }), at), false, 'a different zone reads its own calendar');
  assert.equal(isOnDuty(cov, at), first, 'and the first zone still reads the same afterwards');
});

test('the window keeps its local DAY, not just its local clock — the date is part of the rule', () => {
  // The minute-of-day half of "local wall clock" is easy to pin: 10:00 in Jakarta is 03:00 UTC, so
  // evaluating the window in UTC fails loudly. The **day** half is the quiet one: 10:00 and 20:00 in
  // Jakarta are 03:00 and 13:00 UTC on the *same* calendar date, so a reader that swapped the local
  // date for the UTC date would pass every test in the file and silently drop a missed shift.
  //
  // So this test uses instants whose UTC date and local date DIFFER: 02:00 in Jakarta is 19:00 UTC on
  // the *previous* day, and 21:00 in New York is 01:00 UTC on the *next* day. Both directions, because
  // a day-index bug is not one-directional.
  const cov = JAKARTA();

  // 02:00 on Monday 20 July in Jakarta = 19:00 on Sunday 19 July UTC. The local date is Monday, so
  // the community IS on duty (if the window were open at 02:00 — it is not, so this is off duty by
  // the hour rule) — but the WEEKDAY is what the shift list reads, and Monday is a staffed day.
  const jakarta2am = local('Asia/Jakarta', 2026, 7, 20, 2, 0);
  assert.equal(new Date(jakarta2am).getUTCDate(), 19, 'the UTC date is the previous day — the local date is what counts');
  assert.equal(isOnDuty(cov, jakarta2am), false, '02:00 is outside 09:00–18:00 regardless of the date');

  // The same instant read as its UTC date would fall on Sunday 19 July; as its local date it falls on
  // Monday 20 July. A shift that ends on the local Monday is what the rule counts.
  const raised = local('Asia/Jakarta', 2026, 7, 19, 23, 0); // Sunday 23:00 local — after Sunday's (unstaffed) day
  const read = local('Asia/Jakarta', 2026, 7, 21, 10, 0);   // Tuesday 10:00 local
  assert.equal(new Date(raised).getUTCDate(), 19, 'raised on Sunday local, which is Sunday UTC too');
  assert.equal(new Date(read).getUTCDate(), 21, 'read on Tuesday local');
  assert.equal(
    shiftCompletedBetween(cov, raised, read),
    true,
    'Monday 20 July is a staffed day, and its shift ended at 18:00 local with the obligation still open — the local DATE is what makes that a miss',
  );

  // And the other direction: 21:00 in New York is 01:00 UTC on the NEXT day, so the local date is the
  // earlier one. A window of 09:00–18:00 in New York is on duty at 21:00? No — but the DATE is what
  // decides the weekday, and here the local date is a Tuesday while the UTC date is a Wednesday.
  const ny = JAKARTA({ timezone: 'America/New_York' });
  const nyEvening = local('America/New_York', 2026, 7, 21, 21, 0); // Tuesday 21:00 local
  assert.equal(new Date(nyEvening).getUTCDate(), 22, 'the UTC date is the next day — the local date is what counts');
  assert.equal(isOnDuty(ny, nyEvening), false, '21:00 in New York is outside 09:00–18:00');
  // The shift on the local Tuesday ended at 18:00 local = 22:00 UTC, which is still the local Tuesday.
  assert.equal(
    shiftCompletedBetween(ny, local('America/New_York', 2026, 7, 21, 9, 0), local('America/New_York', 2026, 7, 21, 19, 0)),
    true,
    'the local Tuesday is a staffed day, and its shift ended at 18:00 local',
  );
});

test('the shift list is read against the LOCAL weekday — a UTC date would put the community on the wrong day', () => {
  // The sharpest form of the same property, and the one that actually decides a duty state: WHICH day
  // a window falls on. A window staffed only on SUNDAY, read at 02:00 on Monday in Jakarta (which is
  // 19:00 on Sunday in UTC), is off duty — the local date is Monday. Read against the UTC date it would
  // be Sunday, and the community would be "on duty" on a day it never staffed. The other direction
  // too: 00:30 on Tuesday in Jakarta is 17:30 on Monday in UTC.
  const sundayOnly = JAKARTA({ windows: [{ days: [0], opens: 0, closes: 24 * 60 - 1 }] });
  const jakartaMonday2am = local('Asia/Jakarta', 2026, 7, 20, 2, 0); // local Monday 02:00
  assert.equal(new Date(jakartaMonday2am).getUTCDay(), 0, 'the UTC day is Sunday');
  assert.equal(isOnDuty(sundayOnly, jakartaMonday2am), false,
    'the local day is Monday, and Monday is not a staffed day — a UTC date would read Sunday and say "on duty"');

  const mondayOnly = JAKARTA({ windows: [{ days: [1], opens: 0, closes: 24 * 60 - 1 }] });
  const jakartaTuesday0030 = local('Asia/Jakarta', 2026, 7, 21, 0, 30); // local Tuesday 00:30
  assert.equal(new Date(jakartaTuesday0030).getUTCDay(), 1, 'the UTC day is Monday');
  assert.equal(isOnDuty(mondayOnly, jakartaTuesday0030), false,
    'the local day is Tuesday, and Tuesday is not a staffed day — a UTC date would read Monday and say "on duty"');

  // And across TWO zones, because the day formatter is CACHED per zone — so a cache that leaked
  // between zones would hand the second community the first community's calendar. New York on the
  // local Tuesday is already the Wednesday in Jakarta, so a leaked formatter reads the wrong weekday.
  const nyTuesdayOnly = JAKARTA({ timezone: 'America/New_York', windows: [{ days: [2], opens: 0, closes: 24 * 60 - 1 }] });
  const nyTuesday2100 = local('America/New_York', 2026, 7, 21, 21, 0); // local Tuesday 21:00
  assert.equal(new Date(nyTuesday2100).getUTCDay(), 3, 'the UTC day is Wednesday, and in Jakarta it is already the Wednesday');
  assert.equal(isOnDuty(nyTuesdayOnly, nyTuesday2100), true,
    'the local day in NEW YORK is Tuesday, and Tuesday is the staffed day — a formatter leaked from another zone would read Wednesday and say "off duty"');
});
