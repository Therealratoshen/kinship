/**
 * section 2.9 the member as a subject. Everything in this file exists because the alternative is
 * unfalsifiable until it has already cost the community: a member who discovers they were
 * contacted past their stop, or named in a sponsor report, does not file a complaint — they
 * leave, and the dashboard reads that as normal churn.
 *
 * The rules, each testable:
 * - absent suppression row = unknown = fail closed (member.suppression-check is unbypassable);
 * - a stop is one row, cross-lane, outside the escalation path — there is no API that clears it;
 * - the per-24h cap counts the member, not the lane;
 * - quiet hours are the member's local time;
 * - nothing leaves the community under the aggregation floor — refuse, never truncate.
 */
import { refuse } from './errors.ts';
import { effectiveGuardrails } from './settings.ts';
import type { Ctx, FleetEvent, FleetState, SuppressionRow } from './types.ts';

export function registerMember(ctx: Ctx, ref: string, tz: string): void {
  if (ctx.state.members.has(ref)) return; // idempotent
  ctx.commit({ type: 'MemberRegistered', member: { ref, tz, registeredAt: ctx.now() }, at: ctx.now() });
}

export function suppressMember(
  ctx: Ctx,
  memberRef: string,
  opts: { source: SuppressionRow['source']; viaClass?: string },
): void {
  if (ctx.state.suppressions.has(memberRef)) return; // one stop, one row — never a toggle
  ctx.commit({
    type: 'SuppressionRecorded',
    row: { memberRef, suppressedSince: ctx.now(), source: opts.source, ...(opts.viaClass !== undefined ? { viaClass: opts.viaClass } : {}) },
    at: ctx.now(),
  });
}

/** The mandatory pre-commit check. Unknown ≠ clear: fail closed is the whole point (section 2.9). */
export function assertContactable(state: FleetState, memberRef: string): void {
  if (!state.members.has(memberRef)) {
    refuse('suppression_unknown', 'spec section 2.9 / FR-5.2',
      `member \`${memberRef}\` has no row — absent suppression is unknown, and unknown is held`);
  }
  if (state.suppressions.has(memberRef)) {
    refuse('member_suppressed', 'spec section 2.9 / FR-5.2',
      `member \`${memberRef}\` said stop — it beats any grant, any lane, any autonomy level`);
  }
}

export function listSuppressions(state: FleetState, memberRef: string): SuppressionRow[] {
  const row = state.suppressions.get(memberRef);
  return row ? [row] : [];
}

const DAY_MS = 24 * 3600_000;

/** FR-5.5 — the cap counts commits *to the member* in a rolling 24h, across every lane. */
export function assertWithinCap(ctx: Ctx, _memberRef: string, at: number, recentCommitTimes: number[]): void {
  const cap = effectiveGuardrails(ctx).memberMessageCapPer24h;
  const inWindow = recentCommitTimes.filter((t) => at - t < DAY_MS).length;
  if (inWindow >= cap) {
    refuse('member_cap_exceeded', 'spec section 2.9 / FR-5.5',
      `${inWindow} member-facing commits in the last 24h; the cap (${cap}) is the member's, not the lane's`);
  }
}

/** FR-5.5 — quiet hours in the member's timezone. 21:00–07:59 local is quiet. */
export function assertSendHour(memberTz: string, at: number): void {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: memberTz, hour: 'numeric', hour12: false,
  }).format(new Date(at)));
  if (hour >= 21 || hour < 8) {
    refuse('quiet_hours', 'spec section 2.9 / FR-5.5',
      `${String(hour).padStart(2, '0')}:00 in ${memberTz} — cadence and hours belong to the recipient`);
  }
}

/**
 * FR-5.3 — an external artefact naming anyone below the floor is refused at assembly. The only
 * acceptable failure mode is refusing to assemble; redaction after assembly is too late.
 */
export function assertAggregateOnly(ctx: Ctx, cohortSize: number, namedRefs: string[]): void {
  const floor = effectiveGuardrails(ctx).reportAggregationFloor;
  if (cohortSize < floor && namedRefs.length > 0) {
    refuse('report_below_floor', 'spec section 2.9 / FR-5.3',
      `cohort of ${cohortSize} is under the floor (${floor}) and ${namedRefs.length} member(s) are named — refuse to assemble`);
  }
}

/** Below the floor, a count renders as a bracket, not a number. */
export function renderBracket(ctx: Ctx, cohortSize: number): string {
  const floor = effectiveGuardrails(ctx).reportAggregationFloor;
  return cohortSize < floor ? `[fewer than ${floor} attendees]` : String(cohortSize);
}

// --- the applier ---------------------------------------------------------------------------------

export function applyMembers(state: FleetState, event: Extract<FleetEvent, { type: 'MemberRegistered' | 'SuppressionRecorded' }>): void {
  if (event.type === 'MemberRegistered') {
    state.members.set(event.member.ref, { ...event.member });
    return;
  }
  state.suppressions.set(event.row.memberRef, { ...event.row });
}
