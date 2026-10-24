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
 * The formatters, cached per zone.
 *
 * `Intl.DateTimeFormat` is expensive to construct — roughly 0.1 ms each on this runtime — and the
 * arithmetic below asks for the local calendar of the same zone over and over: once per obligation
 * when the health read counts missed shifts, and once per candidate day inside one comparison. A
 * health read over a queue of any size would spend its whole time building formatters.
 *
 * The cache is keyed by the zone string, so a pack can only ever hold as many entries as it has
 * zones, and a `DateTimeFormat` is immutable once built — reusing one is not a shared-state hazard.
 */
const dayFormatters = new Map<string, Intl.DateTimeFormat>();
const minuteFormatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = dayFormatters.get(timezone);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayFormatters.set(timezone, fmt);
  }
  return fmt;
}

function minuteFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = minuteFormatters.get(timezone);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    minuteFormatters.set(timezone, fmt);
  }
  return fmt;
}

/**
 * The epoch-day of the *local* calendar date an instant falls on.
 *
 * Computed by asking the zone what date it reads, then measuring that date against the UTC epoch.
 * A local date is a calendar fact, so it is compared as one: `dayIndex` counts days in the zone's
 * calendar, which is what "on Monday" means to the community.
 */
function localDayIndex(timezone: string, at: number): number {
  const parts = Object.fromEntries(dayFormatter(timezone).formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  return Math.floor(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000);
}

/** The weekday (0 = Sunday) of a local calendar date. */
function weekdayOf(dayIndex: number): number {
  return new Date(dayIndex * 86_400_000).getUTCDay();
}

/** Minutes from local midnight, in the zone. */
function localMinuteOfDay(timezone: string, at: number): number {
  const parts = Object.fromEntries(minuteFormatter(timezone).formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function localFields(timezone: string, at: number): LocalFields {
  // An unknown zone has no calendar, so there is no day and no minute to read. The caller treats the
  // result as "not on duty"; this function reports it rather than throwing, because a read path that
  // throws is a read path that can take a fleet down. The parser refuses an unreadable zone, so a
  // pack file cannot get here; a host building a `Packed` in memory can.
  try {
    const dayIndex = localDayIndex(timezone, at);
    return { dayIndex, weekday: weekdayOf(dayIndex), minuteOfDay: localMinuteOfDay(timezone, at) };
  } catch {
    return { dayIndex: Number.NaN, weekday: -1, minuteOfDay: -1 };
  }
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
  // `localFields` reads the zone through `Intl`, which throws a `RangeError` for a zone it does not
  // know. A file cannot reach this — the parser refuses an unreadable zone — but a host that builds a
  // `Packed` in memory can, and a READ that throws is a read that takes a fleet down. An unknown zone
  // reads as "not on duty", which is the honest answer: nobody is on duty in a calendar that does
  // not exist.
  // A SPLIT week: the community is on duty in ANY of its windows. (A one-window week is just the list
  // of one, and reads exactly as it always did.)
  return coverage.windows.some((w) =>
    w.days.includes(f.weekday) && f.minuteOfDay >= w.opens && f.minuteOfDay < w.closes);
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
  const fromMinute = localMinuteOfDay(coverage.timezone, from);

  // The loop walks the calendar days between `from` and `to`, so a host whose clock jumps by years
  // would make a health read iterate thousands of days. It is bounded here, and the bound is stated
  // rather than silent: past this many days the answer is the same as it would be for the closest
  // staffed shift inside the window, because a window that long contains at least one shift either
  // way, and the first staffed day after `from` is the only one whose END can fall inside the range.
  const MAX_DAYS = 3660; // ten years
  const firstDay = endDay - startDay > MAX_DAYS ? endDay - MAX_DAYS : startDay;

  for (let d = firstDay; d <= endDay; d++) {
    const weekday = weekdayOf(d);
    // A SPLIT week: a day may carry more than one window, and each window's END is a shift end. For a
    // one-window week this is the same single check it always was.
    for (const w of coverage.windows) {
      if (!w.days.includes(weekday)) continue;
      const shiftEndMinute = w.closes;
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
      if (shiftEndMinute <= fromMinute) continue;
      if (d < endDay) return true;
      if (shiftEndMinute <= endMinute) return true;
    }
  }
  return false;
}

/**
 * An obligation a human currently owes, with the instant it came due.
 *
 * Deliberately only a due instant. The coverage verdict is a **count**, so a reference (a card id, a
 * lane name, a wake id) would be carried through a path with no identifier sweep — and "which
 * obligation is this?" is what `inbox()` answers, with the sweep. Two artefacts, two jobs.
 */
export interface DueObligation {
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
