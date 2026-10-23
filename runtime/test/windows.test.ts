/**
 * Split working weeks — a community that is staffed different hours on different days.
 *
 * **The gap this closes, and why Dubai is the proof rather than the excuse.**
 *
 * A coverage window names "the days, and the hours". One window can only say "these days, these hours".
 * A community whose week is **split** cannot be expressed in it — and a split week is not exotic:
 *
 *  - The **UAE** federal government works Monday–Thursday 07:30–15:30 and **Friday 07:30–12:00 — a half
 *    day** — with **Saturday and Sunday** as the weekend (u.ae, the official UAE government platform, and
 *    the DGHR "New Weekly Work System" FAQ, read 2026-10-23; effective 1 January 2022). Dubai and most
 *    emirates follow the federal pattern; Sharjah's weekend is Friday–Sunday, so even *within* one
 *    country the weekends differ.
 *  - A church, a school, a makerspace with a Saturday session, a community with a members-only evening
 *    — all the same shape.
 *
 * So this is a **general** capability with a **primary-sourced** example, not a country table. The
 * runtime still does not know what Dubai is: the community declares its own windows, and the runtime
 * reads them. A pack in Sharjah would declare Saturday–Monday instead, and nothing in the code would
 * have to change — which is exactly the point of declaring rather than looking up.
 *
 * **And the thing that would go wrong without this.** A community whose weekend is Saturday–Sunday, read
 * by a runtime that assumed the Western week, would be told it is **on duty on Friday evening** and
 * **off duty on Saturday morning** — both exactly backwards. A staffing promise measured against the
 * wrong calendar is worse than no promise, because it produces a confident number.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOnDuty, shiftCompletedBetween } from '../src/community.ts';
import type { CommunityCoverage } from '../src/types.ts';

const DAY = 86_400_000;

/** 2026-07-20 is a Monday. These are local wall-clock times in `tz`. */
const local = (tz: string, y: number, mo: number, d: number, h: number, mi: number): number => {
  const probe = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(probe)).map((p) => [p.type, p.value]));
  const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return probe - (shown - probe);
};

/**
 * The UAE pattern, read from u.ae and the DGHR FAQ on 2026-10-23: Monday–Thursday a full day,
 * **Friday a half day**, Saturday and Sunday the weekend. This is a community that chooses to live
 * inside the working week it is in — and the shape the runtime has to be able to say.
 */
const DUBAI: CommunityCoverage = {
  mode: 'staffed',
  timezone: 'Asia/Dubai',
  windows: [
    { days: [1, 2, 3, 4], opens: 9 * 60, closes: 18 * 60 },   // Mon–Thu
    { days: [5], opens: 9 * 60, closes: 13 * 60 },              // Fri — a half day
  ],
};

test('a split week is read as two windows: Friday closes at noon, not at six', () => {
  assert.equal(isOnDuty(DUBAI, local('Asia/Dubai', 2026, 7, 20, 10, 0)), true, 'Monday 10:00 — a full day');
  assert.equal(isOnDuty(DUBAI, local('Asia/Dubai', 2026, 7, 24, 10, 0)), true, 'Friday 10:00 — inside the half day');
  assert.equal(isOnDuty(DUBAI, local('Asia/Dubai', 2026, 7, 24, 12, 59)), true, 'Friday 12:59 — the last minute of the half day');
  assert.equal(isOnDuty(DUBAI, local('Asia/Dubai', 2026, 7, 24, 13, 0)), false, 'Friday 13:00 — the half day is over');
  assert.equal(isOnDuty(DUBAI, local('Asia/Dubai', 2026, 7, 25, 10, 0)), false, 'Saturday — the weekend here is Saturday AND Sunday');
  assert.equal(isOnDuty(DUBAI, local('Asia/Dubai', 2026, 7, 26, 10, 0)), false, 'Sunday — the weekend');
});

test('the weekend is what the COMMUNITY declares, not what the runtime assumes', () => {
  // Sharjah's weekend is Friday–Saturday (u.ae, read 2026-10-23), so even inside one country the
  // days differ. The runtime must not have an opinion: a pack that declares Friday–Saturday off gets
  // Friday–Saturday off, and the code does not change.
  // Sharjah works Monday–Thursday only — a four-day week — with Friday, Saturday AND Sunday as the
  // weekend (u.ae, read 2026-10-23). So Friday, which is a HALF day in Dubai, is a full day OFF in
  // Sharjah. One country, two calendars, and the runtime has no opinion about either.
  const sharjah: CommunityCoverage = {
    mode: 'staffed',
    timezone: 'Asia/Dubai',
    windows: [{ days: [1, 2, 3, 4], opens: 9 * 60, closes: 18 * 60 }],
  };
  assert.equal(isOnDuty(sharjah, local('Asia/Dubai', 2026, 7, 24, 10, 0)), false, 'Friday is off here — the weekend runs Friday to Sunday');
  assert.equal(isOnDuty(sharjah, local('Asia/Dubai', 2026, 7, 25, 10, 0)), false, 'Saturday is the weekend here');
  assert.equal(isOnDuty(sharjah, local('Asia/Dubai', 2026, 7, 26, 10, 0)), false, 'and so is Sunday');
  assert.equal(isOnDuty(sharjah, local('Asia/Dubai', 2026, 7, 20, 10, 0)), true, 'but Monday is a working day');
});

test('a shift that ends at noon on Friday is a shift that ended — even though the day still has hours', () => {
  // The half day's shift ends at 13:00. A question asked at 13:30 has outlived it, and the coverage
  // window has to say so — otherwise a community with a split week would never see a missed shift on
  // its short days.
  const raised = local('Asia/Dubai', 2026, 7, 24, 12, 30);
  assert.equal(
    shiftCompletedBetween(DUBAI, raised, local('Asia/Dubai', 2026, 7, 24, 13, 30)),
    true,
    'the Friday half-day shift ended at 13:00 with the question still open',
  );
  assert.equal(
    shiftCompletedBetween(DUBAI, raised, local('Asia/Dubai', 2026, 7, 24, 12, 45)),
    false,
    'at 12:45 the half-day shift has not ended yet',
  );
});

test('a question asked in the long part of the day is still inside the shift', () => {
  const raised = local('Asia/Dubai', 2026, 7, 20, 17, 30);
  assert.equal(shiftCompletedBetween(DUBAI, raised, local('Asia/Dubai', 2026, 7, 20, 17, 45)), false, '17:45 is inside Monday');
  assert.equal(shiftCompletedBetween(DUBAI, raised, local('Asia/Dubai', 2026, 7, 21, 9, 30)), true, 'and by Tuesday it is not');
});

test('the weekend between the half day and the next full day is not a missed shift', () => {
  // Friday 13:00 (the half day ends) → Sunday 10:00. Saturday and Sunday are the weekend, and
  // Monday's shift has not ended. Nothing was missed — this is the weekend-gap rule applied to a
  // split week, and it is exactly the case a single-window window would have got wrong.
  const raised = local('Asia/Dubai', 2026, 7, 24, 13, 30);
  assert.equal(shiftCompletedBetween(DUBAI, raised, local('Asia/Dubai', 2026, 7, 26, 10, 0)), false,
    'the weekend is not a broken promise');
});

test('a single-window community still reads exactly as it did', () => {
  // The shipped pack declares one window. Nothing about a one-window community may change.
  const one: CommunityCoverage = {
    mode: 'staffed',
    timezone: 'Asia/Jakarta',
    windows: [{ days: [1, 2, 3, 4, 5], opens: 9 * 60, closes: 18 * 60 }],
  };
  assert.equal(isOnDuty(one, local('Asia/Jakarta', 2026, 7, 20, 10, 0)), true);
  assert.equal(isOnDuty(one, local('Asia/Jakarta', 2026, 7, 24, 18, 0)), false, 'Friday 18:00 is the end of the shift');
  assert.equal(isOnDuty(one, local('Asia/Jakarta', 2026, 7, 25, 10, 0)), false, 'Saturday is off');
  const raised = local('Asia/Jakarta', 2026, 7, 20, 10, 0);
  assert.equal(shiftCompletedBetween(one, raised, local('Asia/Jakarta', 2026, 7, 20, 12, 0)), false);
  assert.equal(shiftCompletedBetween(one, raised, local('Asia/Jakarta', 2026, 7, 20, 18, 0)), true);
});
