/**
 * The community's coverage window — the hours a human is on duty for this community — and the one
 * thing it decides: whether a pending obligation missed a staffed shift.
 *
 * **Two clocks, and this is not the member's.** FR-5.5 puts quiet hours in the *member's* local time
 * (`members.ts` refuses a send outside 21:00–07:59 in the member's own zone). That clock answers
 * "may I contact this person" and is a member protection. This clock answers a different question —
 * "was anyone watching when this community was left waiting" — and it is the community's own
 * staffing promise, which only the community can state. The SLA literature keeps the two apart for
 * the same reason: coverage hours say when the response clock runs, and member preferences say when
 * to stop bothering someone.
 *
 * **Wall clock, never a stored offset.** A coverage window is a statement about the community's local
 * calendar ("09:00 in Jakarta"), so it is evaluated in the community's timezone rather than by
 * subtracting a UTC offset from a stored instant. That is what keeps "09:00" meaning 09:00 on both
 * sides of a DST transition; an offset-based implementation silently shifts the window by an hour
 * twice a year. The arithmetic below therefore never converts an instant to UTC — it reads the local
 * calendar fields of each instant and compares them as calendar fields.
 *
 * **A shift that has not ended has not been missed.** Only a shift whose end has passed counts. That
 * is the SLA rule (ArcadeDB's SLA: "requests submitted outside coverage hours will have their
 * response-time clock start at the beginning of the next coverage window"), and it is what makes this
 * a staffing fact rather than a blame metric. A Friday-20:00 obligation still open on Monday-10:00,
 * staffed Monday–Friday, has missed nothing: Friday's shift ended before it existed and Monday's has
 * not ended yet.
 */
import type { CommunityCoverage } from './types.ts';

/** Calendar fields of an instant, read in a named timezone. */
interface LocalFields {
  /** Days since the epoch, in the zone's own calendar — the unit a window is stated in. */
  dayIndex: number;
  /** 0 = Sunday. */
  weekday: number;
  /** Minutes from local midnight. */
  minuteOfDay: number;
}

/**
 * The epoch-day of the *local* calendar date an instant falls on.
 *
 * Computed by asking the zone what date it reads, then measuring that date against the UTC epoch.
 * A local date is a calendar fact, so it is compared as one: `dayIndex` counts days in the zone's
 * calendar, which is what "on Monday" means to the community.
 */
function localDayIndex(timezone: string, at: number): number {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  return Math.floor(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000);
}

/** The weekday (0 = Sunday) of a local calendar date. */
function weekdayOf(dayIndex: number): number {
  return new Date(dayIndex * 86_400_000).getUTCDay();
}

/** Minutes from local midnight, in the zone. */
function localMinuteOfDay(timezone: string, at: number): number {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function localFields(timezone: string, at: number): LocalFields {
  const dayIndex = localDayIndex(timezone, at);
  return { dayIndex, weekday: weekdayOf(dayIndex), minuteOfDay: localMinuteOfDay(timezone, at) };
}

/**
 * Is the community on duty at this instant?
 *
 * `always` means the community is staffed around the clock — a 24/7 community, and a real one. The
 * window is then not a question, and there is no local calendar to read.
 */
export function isOnDuty(coverage: CommunityCoverage, at: number): boolean {
  if (coverage.mode === 'always') return true;
  const f = localFields(coverage.timezone, at);
  if (!coverage.days.includes(f.weekday)) return false;
  return f.minuteOfDay >= coverage.opens && f.minuteOfDay < coverage.closes;
}

/**
 * Did a staffed shift END between `from` (exclusive) and `to` (inclusive)?
 *
 * The answer is "is there a local date D such that D is a staffed day, D's shift ends after `from`,
 * and D's shift ends at or before `to`". A shift on date D ends at local minute `closes` on D, so the
 * comparison is between local calendar facts and never touches UTC.
 *
 * Only the dates in range can matter, and there are at most a couple of weeks of them in any honest
 * use — a shift that ended three months ago still ended before `to`, so the range is bounded by
 * `from` and `to` rather than by a fixed window.
 */
export function shiftCompletedBetween(coverage: CommunityCoverage, from: number, to: number): boolean {
  if (coverage.mode === 'always') return false; // there is no shift to end — the clock never pauses
  if (to <= from) return false;
  const startDay = localDayIndex(coverage.timezone, from);
  const endDay = localDayIndex(coverage.timezone, to);
  const endMinute = localMinuteOfDay(coverage.timezone, to);

  for (let d = startDay; d <= endDay; d++) {
    if (!coverage.days.includes(weekdayOf(d))) continue;
    const shiftEndMinute = coverage.closes;
    // The shift on date `d` ends at local `closes` on `d`. It ends after `from` when `d` is later
    // than `from`'s date, or on the same date but later in the day than `from` was.
    if (d > startDay) {
      // A later date always ends after `from`; it ends at or before `to` when it is earlier than
      // `to`'s date, or on `to`'s date at a minute not after `to`'s minute.
      if (d < endDay) return true;
      if (shiftEndMinute <= endMinute) return true;
      continue;
    }
    // Same date as `from`: the shift ends after `from` only if it closes later in the day.
    if (shiftEndMinute <= localMinuteOfDay(coverage.timezone, from)) continue;
    if (d < endDay) return true;
    if (shiftEndMinute <= endMinute) return true;
  }
  return false;
}

/** The obligations a human currently owes, with the instant each came due. */
export interface DueObligation {
  kind: 'card' | 'handoff' | 'freeze' | 'wake';
  ref: string;
  dueAt: number;
}

/**
 * The coverage verdict for a set of obligations: how many missed a staffed shift, and the duty state
 * right now.
 *
 * `missedShift` is `null` when there is no window to miss — an unknown duty state is not a count of
 * zero, and the pack that declares no window has not promised anyone anything.
 */
export interface CoverageVerdict {
  coverage: CommunityCoverage | null;
  onDutyNow: boolean | null;
  missedShift: { count: number; note: string } | null;
}

/**
 * The verdict for a set of obligations against a coverage window.
 *
 * `now` is the instant the read is taken at; `coverage` is `null` when the pack declares no window.
 */
export function deriveCoverageVerdict(
  coverage: CommunityCoverage | null,
  obligations: readonly DueObligation[],
  now: number,
): CoverageVerdict {
  if (coverage === null) {
    return {
      coverage: null,
      onDutyNow: null,
      missedShift: null,
    };
  }
  const missed = obligations.filter((o) => shiftCompletedBetween(coverage, o.dueAt, now));
  return {
    coverage,
    onDutyNow: isOnDuty(coverage, now),
    missedShift: {
      count: missed.length,
      note: missed.length === 0
        ? 'no obligation has outlived a staffed shift'
        : `${missed.length} obligation(s) were still open when a staffed shift ended`,
    },
  };
}
