/**
 * The reducer. `applyEvent` is the ONLY thing that mutates state, and it is pure over
 * (state, event) — no clock, no randomness. Live runs and replays traverse this identical
 * function, which is the mechanism behind the replay test: fold(events) deep-equals live state.
 *
 * Appliers live next to the module that emits their events, so a spec section's read path and
 * write path sit in one file.
 */
import { freshState, append } from './store.ts';
import type { FleetEvent, FleetState, LoggedEvent } from './types.ts';

import { applyShatter } from './shatter.ts';
import { applyGrants } from './grants.ts';
import { applyMembers } from './members.ts';
import { applyLifecycle } from './lifecycle.ts';
import { applyCards } from './cards.ts';
import { applyBudget } from './budget.ts';
import { applyContainment } from './containment.ts';
import { applyThreads } from './threads.ts';

/**
 * The shape guard: the fields a given event must carry, and the type each must have.
 *
 * **Why this exists.** The log is JSON on disk, and a row in it is DATA, not code — so a row that
 * was hand-edited, truncated mid-write, or written by something else arrives at the reducer with no
 * type checking at all. Before this guard, a row with `origin.kind: 123` or a member with **no
 * timezone** folded silently and the log **verified as sound** — and a member with no timezone is
 * a member whose quiet hours cannot be checked, which is a member protection quietly switched off.
 *
 * So the reducer now **refuses a malformed row loudly**: it throws, `Fleet.replay` propagates it,
 * and `Fleet.verifyLog` reports it as `replay_failed`. That is the same containment an unknown
 * event type already had — the difference is that a bad *shape* used to be the one thing that got
 * through.
 *
 * **The guard is deliberately narrow.** It checks the fields the GOVERNANCE reads — the ones a wrong
 * value would change a decision — not every field of every event. A guard over everything is a
 * second schema to keep in step with the first, and the first is the TypeScript type. This one asks
 * a different question: *if this row were wrong, would a decision change?*
 */
const REQUIRED_SHAPE: Record<string, [string, 'string' | 'number' | 'boolean'][]> = {
  MemberRegistered: [['member.ref', 'string'], ['member.tz', 'string']],
  SuppressionRecorded: [['row.memberRef', 'string'], ['row.source', 'string']],
  GrantIssued: [['grant.actionClass', 'string'], ['grant.kind', 'string']],
  GrantRevoked: [['grantId', 'string']],
  CardCreated: [['card.id', 'string'], ['card.actionClass', 'string'], ['card.origin.id', 'string']],
  CardDecided: [['cardId', 'string'], ['verdict', 'string'], ['by', 'string']],
  AuthorizationIssued: [['auth.token', 'string'], ['auth.revisionHash', 'string'], ['auth.actionClass', 'string']],
  AuthorizationConsumed: [['token', 'string']],
  CommitRefused: [['code', 'string'], ['actionClass', 'string'], ['agent', 'string']],
  CommitExecuted: [['actionClass', 'string'], ['agent', 'string'], ['origin.id', 'string'], ['revisionHash', 'string']],
  MemberInputReceived: [['inputId', 'string'], ['memberRef', 'string'], ['textHash', 'string']],
  ThreadOpened: [['thread.id', 'string']],
  ThreadAnswered: [['threadId', 'string'], ['by', 'string'], ['note', 'string']],
  PhaseEntered: [['eventId', 'string'], ['phase', 'string']],
  PhaseCompleted: [['eventId', 'string'], ['phase', 'string']],
  WakeScheduled: [['row.id', 'string'], ['row.purpose', 'string']],
  SpendRecorded: [['eventId', 'string'], ['amountIdr', 'number']],
  EscalationRaised: [['purpose', 'string'], ['to', 'string']],
};

/** The value at a dotted path, or `undefined`. */
function at(node: unknown, path: string): unknown {
  let cur: unknown = node;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Refuse a row whose shape is wrong, before the reducer touches the state.
 *
 * The throw is deliberate and it is the *loud* failure: the caller that folds a log learns that
 * the log is not sound, instead of receiving a state that looks plausible and is not.
 */
export function assertEventShape(event: LoggedEvent): void {
  const required = REQUIRED_SHAPE[event.type];
  if (required === undefined) return; // an unknown type is caught by the reducer's own default
  for (const [path, kind] of required) {
    const value = at(event, path);
    // `number` must be a FINITE number: a NaN in a timestamp or an amount compares false to
    // itself and would slip past a typeof check.
    const ok = kind === 'number'
      ? typeof value === 'number' && Number.isFinite(value)
      : typeof value === 'string' && value.length > 0;
    if (!ok) {
      throw new Error(
        `applyEvent: row ${event.seq} (${event.type}) is malformed — \`${path}\` must be a non-empty ${kind}` +
        (value === undefined ? ' and is missing' : ` and is ${typeof value}`) +
        '. A row that cannot be trusted is a log that cannot be replayed.',
      );
    }
  }
}

export function applyEvent(state: FleetState, event: LoggedEvent): void {
  assertEventShape(event);
  switch (event.type) {
    case 'ShatterTripped':
    case 'ShatterReleased':
      applyShatter(state, event);
      return;
    case 'GrantIssued':
    case 'GrantRevoked':
    case 'GrantConsumed':
    case 'GrantSuperseded':
      applyGrants(state, event);
      return;
    case 'MemberRegistered':
    case 'SuppressionRecorded':
      applyMembers(state, event);
      return;
    case 'PhaseEntered':
    case 'PhaseCompleted':
    case 'PhaseOriginClaimed':
    case 'EventCheckedOut':
    case 'WakeScheduled':
    case 'WakeFired':
      applyLifecycle(state, event);
      return;
    case 'CardCreated':
    case 'CardDecided':
    case 'AuthorizationIssued':
    case 'AuthorizationConsumed':
      applyCards(state, event);
      return;
    case 'BudgetSet':
    case 'SpendRecorded':
    case 'BudgetWarned':
    case 'BudgetStopRaised':
      applyBudget(state, event);
      return;
    case 'MemberInputReceived':
      applyContainment(state, event);
      return;
    case 'ThreadOpened':
    case 'ThreadAnswered':
      applyThreads(state, event);
      return;
    case 'CommitExecuted':
    case 'CommitRefused':
    case 'EscalationRaised':
      applyEngine(state, event);
      return;
    default: {
      const never: never = event;
      void never;
      throw new Error(`applyEvent: no applier for event type ${(event as FleetEvent).type}`);
    }
  }
}

/**
 * The applier for engine-owned events. Lives here rather than in engine.ts because engine.ts
 * imports this module's `commitEvent` — an applier next to the reducer beats an import cycle.
 */
function applyEngine(state: FleetState, event: Extract<FleetEvent, { type: 'CommitExecuted' | 'CommitRefused' | 'EscalationRaised' }>): void {
  switch (event.type) {
    case 'CommitExecuted': {
      // Per-member commit times feed the 24h cap (section 2.9). With no transport this phase, only
      // recipient-less commits execute — the cap is latent, and load-bearing the day one lands.
      for (const ref of event.recipients) {
        if (state.members.has(ref)) {
          const times = state.commitsByMember.get(ref) ?? [];
          times.push(event.at);
          state.commitsByMember.set(ref, times);
        }
      }
      if (event.partner !== undefined) {
        state.crossPromoByEvent.set(event.origin.id, (state.crossPromoByEvent.get(event.origin.id) ?? 0) + 1);
      }
      return;
    }
    case 'CommitRefused':
    case 'EscalationRaised':
      return; // the log entry is the record; nothing else derives from it
  }
}

export function replay(events: LoggedEvent[]): FleetState {
  const state = freshState();
  for (const e of events) applyEvent(state, e);
  // The log is part of state (section 1.2) — a fold that dropped it would not be deep-equal to the
  // live state, and the replay test exists precisely to catch that.
  state.events = [...events];
  state.seq = events.length > 0 ? events[events.length - 1]!.seq : 0;
  return state;
}

/**
 * The engine's commit contract, in one place: append to the log, then run the reducer on the
 * logged form. Live runs, replays, and the test harness all go through this — a caller that
 * applied without appending would break the section 1.2 replay property while every functional test
 * still passed, which is exactly why it lives here and not in each caller.
 */
export function commitEvent(state: FleetState, event: FleetEvent): LoggedEvent {
  const logged = append(state, event);
  applyEvent(state, logged);
  return logged;
}
