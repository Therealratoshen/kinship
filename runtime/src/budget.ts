/**
 * section 1.6 bounded work and budgets — event-scoped and denominated in money the organiser actually
 * spends (FR-1.12), not tokens. The enforcement *mechanism* is wrapped, not built (D14:
 * LiteLLM carries the vendor-side stop); what lives here is the denomination layer's control
 * semantics: warn before the stop, refuse past it, and — because a hard stop must never
 * silently drop a scheduled phase — the engine raises a card when the stop fires.
 *
 * A ceiling of `null` is the honest boot state (PRD section 12-Q9): the field is real, the number is
 * unset until shadow mode produces one, and an unset ceiling refuses metered spend rather than
 * inventing a limit.
 */
import { refuse } from './errors.ts';
import { localeCopy } from './locales.ts';
import { createCard } from './cards.ts';
import type { Ctx, FleetEvent, FleetState, Packed } from './types.ts';

export function setBudget(ctx: Ctx, eventId: string, ceilingIdr: number | null, warnRatio = ctx.pack.budgets.warnAtRatio): void {
  if (ceilingIdr !== null && (!Number.isFinite(ceilingIdr) || ceilingIdr <= 0)) {
    refuse('budget_unset', 'spec section 1.6', `ceiling \`${ceilingIdr}\` is not a budget`);
  }
  ctx.commit({ type: 'BudgetSet', eventId, ceilingIdr, warnRatio, hardStop: ctx.pack.budgets.hardStop, at: ctx.now() });
}

export function assertCanSpend(ctx: Ctx, eventId: string): void {
  const b = ctx.state.budgets.get(eventId);
  if (!b || b.ceilingIdr === null) {
    refuse('budget_unset', 'spec section 1.6 / PRD section 12-Q9', `no ceiling is set for \`${eventId}\` — an unbounded fleet is not a supervised one, so metered spend refuses`);
  }
  if (b && b.stoppedAt !== undefined) {
    refuse('budget_hard_stop', 'spec section 1.6 / FR-1.12', `event \`${eventId}\` hit its hard stop at Rp ${b.spentIdr} — the organiser set this stop`);
  }
}

export interface SpendResult { spentIdr: number; warned: boolean; stopped: boolean }

export function recordSpend(ctx: Ctx, eventId: string, amountIdr: number, note: string): SpendResult {
  assertCanSpend(ctx, eventId);
  const b = ctx.state.budgets.get(eventId);
  if (!b || b.ceilingIdr === null) throw new Error('unreachable: assertCanSpend passed');
  const wouldBe = b.spentIdr + amountIdr;
  const warned = b.warnedAt === undefined && wouldBe >= b.ceilingIdr * b.warnRatio;
  const stopped = b.hardStop && wouldBe >= b.ceilingIdr;
  if (warned) {
    ctx.commit({ type: 'BudgetWarned', eventId, spentIdr: wouldBe, ceilingIdr: b.ceilingIdr, at: ctx.now() });
  }
  if (stopped) {
    // A hard stop must never silently drop a scheduled phase — it raises a card (section 1.6).
    const card = createCard(ctx, {
      actionClass: 'budget.spend',
      agent: 'engine',
      origin: { kind: 'event', id: eventId },
      phase: null,
      text: localeCopy(ctx, 'budgetStop', (spec) => spec.budgetStop(eventId, wouldBe, b.ceilingIdr ?? 0)),
      forcedBy: 'budget_hard_stop',
    });
    ctx.commit({ type: 'BudgetStopRaised', eventId, spentIdr: wouldBe, ceilingIdr: b.ceilingIdr, cardId: card.id, at: ctx.now() });
    refuse('budget_hard_stop', 'spec section 1.6 / FR-1.12',
      `event \`${eventId}\` would reach Rp ${wouldBe} of its Rp ${b.ceilingIdr} ceiling — stopped, and a card is raised`);
  }
  ctx.commit({ type: 'SpendRecorded', eventId, amountIdr, note, at: ctx.now() });
  return { spentIdr: wouldBe, warned, stopped: false };
}

// --- per-run action cap (section 1.6: exceed → truncated, partial kept, no retry storm) ------------------

/**
 * Run-scoped, deliberately NOT replayable state: the log records what the fleet did, while a
 * run's counter is the runner's memory of this invocation — a fact the fold must not reproduce.
 * It is therefore a value the caller owns, never a module singleton: a singleton makes two runs
 * impossible and leaks one run's exhaustion into the next, which enforces a per-process rule
 * where section 1.6 states a per-run one.
 */
export interface RunState { actions: number; truncated: boolean }

export const createRun = (): RunState => ({ actions: 0, truncated: false });

export type RunAction = 'ok' | 'truncated';

/**
 * The gate before each metered action. The FIRST attempt past the cap is the truncation event
 * itself: it returns `'truncated'` without throwing, and a well-behaved caller stops there and
 * keeps its partial results. A caller that ignores the signal and asks again is the retry storm
 * the cap exists to prevent — that one is refused with `run_truncated`.
 */
export function recordRunAction(run: RunState, pack: Packed): RunAction {
  if (run.truncated) {
    refuse('run_truncated', 'spec section 1.6', `run already truncated at ${pack.budgets.maxActionsPerRun} actions — partial results kept, no retry storm`);
  }
  run.actions += 1;
  if (run.actions > pack.budgets.maxActionsPerRun) {
    run.truncated = true;
    return 'truncated';
  }
  return 'ok';
}

/** A view, not the handle: reading the run's state cannot erase a truncation. */
export function runState(run: RunState): RunState {
  return { ...run };
}

// --- the applier ---------------------------------------------------------------------------------

export function applyBudget(state: FleetState, event: Extract<FleetEvent, { type: 'BudgetSet' | 'SpendRecorded' | 'BudgetWarned' | 'BudgetStopRaised' }>): void {
  switch (event.type) {
    case 'BudgetSet':
      state.budgets.set(event.eventId, {
        ceilingIdr: event.ceilingIdr,
        warnRatio: event.warnRatio,
        hardStop: event.hardStop,
        spentIdr: 0,
      });
      return;
    case 'SpendRecorded': {
      const b = state.budgets.get(event.eventId);
      if (b) state.budgets.set(event.eventId, { ...b, spentIdr: b.spentIdr + event.amountIdr });
      return;
    }
    case 'BudgetWarned': {
      const b = state.budgets.get(event.eventId);
      if (b && b.warnedAt === undefined) state.budgets.set(event.eventId, { ...b, warnedAt: event.at });
      return;
    }
    case 'BudgetStopRaised': {
      const b = state.budgets.get(event.eventId);
      if (b && b.stoppedAt === undefined) state.budgets.set(event.eventId, { ...b, stoppedAt: event.at });
      return;
    }
  }
}
