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

export function applyEvent(state: FleetState, event: LoggedEvent): void {
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
