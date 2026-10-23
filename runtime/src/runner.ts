/**
 * The runner — section 1.6's owner of a run.
 *
 * The engine is deliberately *not* a scheduler: phase 1 runs inside the organiser's own Paperclip
 * instance (D10), and no channel transport ships at all (D21). What this runtime can state
 * honestly is the half that has to be right — the run's own accounting. So `runActions` meters
 * each action against `budgets.max_actions_per_run`, stops at the first crossing with the partial
 * results kept, drops the rest without attempting them (no retry storm), and returns a report an
 * organiser can read: what ran, what was refused and why, what the cap stopped.
 *
 * Three decisions it encodes:
 *  1. A refused action still counts against the cap. The bound is on work attempted, not work
 *     delivered — a run of twenty refusals is twenty attempts the organiser paid for.
 *  2. A `KinshipError` is an outcome, not a crash: the batch continues and the refusal keeps its
 *     code (section 1.2 — "why not" is part of the product). Anything else is a bug and propagates; the
 *     runner does not turn garbage arguments into a tidy report.
 *  3. The run's counter is never written to state. It lives in a handle the caller may hold, but the
 *     fold never sees it, so `Fleet.replay` still reproduces the ledger exactly (section 1.2).
 *
 * A fourth is now explicit rather than implicit: **a run is the caller's handle, not this function's
 * invocation.** `runActions` makes its own handle when none is handed in, which means one call bounds
 * itself and a scheduler that ticks once per agent gets `agents × max_actions_per_run` attempted
 * actions with nothing refusing it. That is a legitimate shape — per-agent fairness is what section 1.6's
 * "per-agent, per-run" wording asks for — but it is only legitimate when the reader can tell which
 * bound they are looking at, so the report says so in `capScope`, and a host that wants one cap per
 * tick hands in one handle. `D38` records why the trap was worth naming in the type rather than only
 * in a comment.
 */
import { createRun, recordRunAction, runState, type RunState } from './budget.ts';
import { KinshipError } from './errors.ts';
import type { CommitArgs, Fleet } from './engine.ts';

export type ActionResult = 'executed' | 'refused' | 'dropped';

export interface ActionOutcome {
  index: number;
  actionClass: string;
  agent: string;
  origin: CommitArgs['origin'];
  result: ActionResult;
  /** The refusal code, when `refused` — the same closed vocabulary the audit log uses. */
  code?: string;
  /** The engine's full sentence, kept so the report is readable without opening the log. */
  reason?: string;
}

export interface RunReport {
  /** Metered attempts, including the one that crossed the cap. */
  actions: number;
  executed: number;
  refused: number;
  /** Actions that did not happen because the run hit its cap — dropped at the gate and never attempted. */
  dropped: number;
  truncated: boolean;
  cap: number;
  /**
   * What `cap` actually bounded, stated because "15" is otherwise read as a fleet ceiling. This is the
   * runner reporting what it can *observe*: a handle that already counts actions has by definition been
   * handed in before, so the bound spans calls; a fresh or internal handle bounds this call alone. It
   * cannot see whether the caller intends to reuse the handle next tick — only whether they did.
   */
  capScope: 'this_call' | 'shared_run';
  outcomes: ActionOutcome[];
  /** Handed in, never gated: the run ended before reaching them, and nothing will retry them. */
  notAttempted: CommitArgs[];
}

const summary = (a: CommitArgs) => ({ index: 0, actionClass: a.actionClass, agent: a.agent, origin: a.origin });

/**
 * `run` is the caller's, and its absence is a decision: omit it and the cap bounds *this call*, which is
 * what a scheduler that ticks once per agent wants per agent. Hand in one handle across calls and the same
 * cap bounds the tick instead of multiplying by the number of agents — section 1.6's "per-run" has always meant
 * "per run the caller declares", never "per call the runner happens to make".
 */
export function runActions(fleet: Fleet, actions: readonly CommitArgs[], run: RunState = createRun()): RunReport {
  const shared = run.actions > 0; // observed reuse, not a claim about the caller's intent
  const cap = fleet.pack.budgets.maxActionsPerRun;
  const outcomes: ActionOutcome[] = [];
  let next = 0;

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    const gate = recordRunAction(run, fleet.pack);
    if (gate === 'truncated') {
      outcomes.push({
        ...summary(a), index: i, result: 'dropped',
        reason: `section 1.6 — this run stopped at its cap of ${cap} actions; the partial results above are kept and nothing here is retried`,
      });
      next = i + 1; // the crossing action is accounted for; everything after it is not attempted
      break;
    }
    try {
      fleet.commit(a);
      outcomes.push({ ...summary(a), index: i, result: 'executed' });
    } catch (e) {
      if (!(e instanceof KinshipError)) throw e; // a bug is not an outcome row
      outcomes.push({ ...summary(a), index: i, result: 'refused', code: e.code, reason: e.message });
    }
    next = i + 1;
  }

  const notAttempted = actions.slice(next);
  const state = runState(run);
  const count = (r: ActionResult) => outcomes.filter((o) => o.result === r).length;
  return {
    actions: state.actions,
    executed: count('executed'),
    refused: count('refused'),
    dropped: count('dropped') + notAttempted.length,
    truncated: state.truncated,
    cap,
    capScope: shared ? 'shared_run' : 'this_call',
    outcomes,
    notAttempted,
  };
}
