/**
 * The fleet-condition snapshot — a *read* of what the fleet's own rows say about right now.
 *
 * Why this file exists at all: until 2026-10-18 the only thing in the repo named a health signal
 * was `packs/kopdar-ops/skills/fleet-health/SKILL.md`, which is prose about an agent being allowed
 * to complain, with no action class and no code; every runtime mechanism was a *per-action refusal*
 * (`suppression beats a grant`, `queue is full`, `budget stopped`). Those are correct and they are
 * not a health check: an organiser who asks "what is the condition of this, right now?" had to read
 * the audit log by hand. This is that read, and it is deliberately the boring kind — a pure function
 * over `FleetState`.
 *
 * Three rules, each with a test that can fail:
 *
 *  1. **Derived, never asserted (invariant #3).** Every figure comes from a row the fleet already
 *     committed, so the snapshot is replayable and cannot invent a condition. A ratio against an
 *     unset ceiling is `null`, not zero; an empty queue's age is `null`, not 0ms — 0 would claim a
 *     card that aged nothing. Because it is a read, it must not append to the log: `Fleet.replay`
 *     still reproduces state exactly (§1.2), and so does the snapshot taken from it.
 *  2. **It counts the fleet, not the people.** `PRD §5` puts member-intelligence / churn scoring out
 *     of scope for v0 ("the feature most likely to make a volunteer organiser feel surveilled"), so
 *     there is no per-member row and no rate here — only counts of things that were recorded, and an
 *     explicit `unmeasured` list naming what this report will not say. The honest half of the
 *     "condition of the community" question is that most of it is not measurable yet: phase 1 ships
 *     no transport (D21) and no event (D9), so there is no member traffic to read.
 *  3. **A member identifier does not ride along.** This is the artefact an organiser *forwards* — to a
 *     co-organiser, a sponsor, a hub — so free-text fields are swept against the member registry and
 *     an identifier is replaced by a fixed sentence. That is the containment move `containment.ts`
 *     makes for drafting context, not the refusal `partner.ts` makes for partner copy: partner copy is
 *     content the organiser wrote and can fix and re-approve, while a wake's purpose is already in the
 *     log and the diagnostic still has to be deliverable. Substituting the identifier rather than the
 *     whole field keeps the sentence readable — the organiser still sees *which* promise is overdue.
 *
 * What this is NOT: a liveness probe or a scheduler. The engine is not a scheduler (D10 — phase 1
 * schedules inside the organiser's own Paperclip instance), so an overdue wake here is a statement
 * about a row whose time has passed, computed on demand, not a heartbeat anyone ran.
 */
import { memberIdentifierTokens } from './partner.ts';
import type { FleetState, Packed } from './types.ts';

/**
 * FR-1.11's own number, from its acceptance criterion ("simulate 3 cycles with `moderator` idle →
 * recommendation: retire"). It belongs to the PRD, not to this file: shrinking it here would make
 * the runtime quieter about idle agents than the requirement is.
 */
export const IDLE_RETIREMENT_CYCLES = 3;

/** A fixed sentence, not a masked preview (§1.9.3) — a preview value is never a value. */
export const HEALTH_WITHHELD_MEMBER_REF = '[member identifier withheld from this report — see the audit log]';

export interface FreezeRow {
  /** The lane, because a lane is what is down. The complaint's `ref` is a person and never appears. */
  channel: string;
  trippedAt: number;
  ageMs: number;
}

export interface QueueRow {
  pending: number;
  cap: number;
  /** `null` when the queue is empty — an empty queue has no oldest card, and 0 would be a claim. */
  oldestPendingAgeMs: number | null;
  escalationPending: number;
  oldestEscalationAgeMs: number | null;
}

export interface BudgetRow {
  eventId: string;
  ceilingIdr: number | null;
  spentIdr: number;
  /** `null` when no ceiling is set (PRD §12-Q9) — never a division by nothing. */
  ratio: number | null;
  warned: boolean;
  stopped: boolean;
}

export interface OverdueWakeRow {
  id: string;
  purpose: string;
  dueAgeMs: number;
}

export interface RefusalRow {
  code: string;
  count: number;
}

export interface IdleAgentRow {
  agent: string;
  actions: number;
  cycles: number;
  recommendation: 'active' | 'watch' | 'retire';
}

export interface HealthReport {
  derivedAt: number;
  derivedFromSeq: number;
  freezes: FreezeRow[];
  queue: QueueRow;
  budgets: BudgetRow[];
  wakes: { scheduled: number; overdue: OverdueWakeRow[] };
  /** Refusals the fleet logged, by code. `no_transport` is how many deliveries a human did by hand. */
  refusals: RefusalRow[];
  idleAgents: IdleAgentRow[];
  /** Two counts and nothing else — see rule 2 in the header. */
  members: { registered: number; suppressed: number };
  /** What this snapshot cannot say, and why. A health read that implies omniscience is a lie. */
  unmeasured: string[];
}

/**
 * Registry, not regex (the bound `partner.ts` states): only identifiers the fleet actually knows are
 * protected, in both their stored and bare forms. The bare form can over-match — a price or a
 * timestamp containing `62811` gets substituted too. That trade is deliberately cheaper here than in
 * partner copy, where over-matching *refuses* an organiser's own draft: here it only blurs one word in
 * a diagnostic an organiser can still read against the audit log.
 *
 * Exported because `inbox.ts` makes the same forwardable artefact from the same log and must not
 * invent a second, weaker privacy rule for it.
 */
export function withholdMemberIdentifiers(text: string, state: FleetState): string {
  let out = text;
  // Longest token first: `wa:62811` before `62811`, so one person substitutes once, not twice.
  for (const token of memberIdentifierTokens(state).flatMap((m) => m.tokens).sort((a, b) => b.length - a.length)) {
    out = out.split(token).join(HEALTH_WITHHELD_MEMBER_REF);
  }
  return out;
}

/** Pending cards, oldest first — the queue's real risk is age, not depth. Exported for `inbox.ts`. */
export function pendingCards(state: FleetState) {
  return [...state.cards.values()].filter((c) => c.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * "Recorded action" is any row naming the agent: a card it raised, a commit it executed, a commit it
 * was refused. All three are already in the log; none is a judgement about the agent's usefulness.
 */
function actionsByAgent(state: FleetState): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (agent: string) => counts.set(agent, (counts.get(agent) ?? 0) + 1);
  for (const e of state.events) {
    if (e.type === 'CommitExecuted' || e.type === 'CommitRefused') bump(e.agent);
    else if (e.type === 'CardCreated') bump(e.card.agent);
  }
  return counts;
}

export function deriveHealth(state: FleetState, pack: Packed, now: number): HealthReport {
  const freezes: FreezeRow[] = [...state.shatter.values()]
    .filter((s) => s.releasedAt === undefined)
    .sort((a, b) => a.trippedAt - b.trippedAt)
    .map((s) => ({ channel: s.channel, trippedAt: s.trippedAt, ageMs: now - s.trippedAt }));

  const waiting = pendingCards(state);
  const escalations = waiting.filter((c) => c.forcedBy === 'escalation');
  const queue: QueueRow = {
    pending: waiting.length,
    cap: pack.budgets.queueMax,
    oldestPendingAgeMs: waiting.length > 0 ? now - waiting[0]!.createdAt : null,
    escalationPending: escalations.length,
    oldestEscalationAgeMs: escalations.length > 0 ? now - escalations[0]!.createdAt : null,
  };

  const budgets: BudgetRow[] = [...state.budgets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([eventId, b]) => ({
      eventId,
      ceilingIdr: b.ceilingIdr,
      spentIdr: b.spentIdr,
      ratio: b.ceilingIdr === null ? null : Math.round((b.spentIdr / b.ceilingIdr) * 100) / 100,
      warned: b.warnedAt !== undefined,
      stopped: b.stoppedAt !== undefined,
    }));

  const overdue: OverdueWakeRow[] = [...state.wakes.values()]
    .filter((w) => w.attempts === 0 && w.nextCheckAt <= now)
    .sort((a, b) => a.nextCheckAt - b.nextCheckAt)
    .map((w) => ({ id: w.id, purpose: withholdMemberIdentifiers(w.purpose, state), dueAgeMs: now - w.nextCheckAt }));

  const byCode = new Map<string, number>();
  for (const e of state.events as readonly { type: string; code?: string }[]) {
    if (e.type === 'CommitRefused' && e.code !== undefined) byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
  }
  const refusals: RefusalRow[] = [...byCode.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || (a.code < b.code ? -1 : 1));

  // The roster is the pack's; the actors are whatever the log names, in case they differ — an agent
  // acting that the pack never declared is exactly the kind of finding a snapshot should surface.
  const acted = actionsByAgent(state);
  const roster = new Set([...Object.keys(pack.agents), ...acted.keys()]);
  const cycles = state.phases.size;
  const idleAgents: IdleAgentRow[] = [...roster]
    .sort()
    .map((agent) => {
      const actions = acted.get(agent) ?? 0;
      return {
        agent,
        actions,
        cycles,
        recommendation: actions > 0 ? 'active' as const : cycles >= IDLE_RETIREMENT_CYCLES ? 'retire' as const : 'watch' as const,
      };
    });

  const unmeasured = [
    'member sentiment, morale, or satisfaction — not measured: PRD §5 puts member-intelligence and churn scoring out of scope for v0, and a fleet that infers how a community feels is the artefact this pack exists to prevent.',
    'member dormancy or churn risk — the same ban. Every number above counts rows the fleet itself wrote; nobody\'s absence is a signal this runtime gets to draw.',
    'whether anyone is happy with an event — nothing has sent yet: phase 1 ships no channel transport (D21) and no dated event exists (D9), so there is no member traffic to read. Printing a figure here would be invention.',
    'why a member suppressed — a stop is one row with a source and no API that clears it (§2.9); the count is honest, the reason is not this report\'s to guess.',
    'delivery, read receipts, or reach — with no adapter there is nothing to observe downstream, so a phase-1 health read says nothing about whether a message landed.',
  ];

  return {
    derivedAt: now,
    derivedFromSeq: state.seq,
    freezes,
    queue,
    budgets,
    wakes: { scheduled: state.wakes.size, overdue },
    refusals,
    idleAgents,
    members: { registered: state.members.size, suppressed: state.suppressions.size },
    unmeasured,
  };
}
