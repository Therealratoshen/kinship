/**
 * The event-lifecycle machine (pack skill `event-lifecycle`) plus the section 1.3 / section 1.4 / section 1.9.4
 * chassis rules that make the loop honest:
 * - phases may not be skipped — "did we already remind them?" is a lookup, not a judgement call;
 * - one origin produces one send per phase, enforced as a claim (section 1.9.4 single-active-per-origin);
 * - one agent owns one event loop at a time; the second checkout is a 409 that is never retried (section 1.4);
 * - a promise to follow up requires a persisted wake row — prose is not a waiting path (section 1.3).
 */
import { refuse } from './errors.ts';
import { PHASES } from './types.ts';
import type { Ctx, FleetEvent, FleetState, Phase, WakeRow } from './types.ts';

const PHASE_INDEX = new Map<string, number>(PHASES.map((p, i) => [p, i]));

export function beginEvent(ctx: Ctx, eventId: string): void {
  if (ctx.state.phases.has(eventId)) return; // idempotent
  ctx.commit({ type: 'PhaseEntered', eventId, phase: 'draft', at: ctx.now() });
}

export function transitionPhase(ctx: Ctx, eventId: string, next: Phase): void {
  const st = ctx.state.phases.get(eventId);
  if (!st || st.current === null) refuse('phase_sequence_violated', 'pack skill event-lifecycle', `event \`${eventId}\` has not begun`);
  if (st.current === 'closed') refuse('phase_sequence_violated', 'pack skill event-lifecycle', 'closed is terminal');
  const cur = PHASE_INDEX.get(st.current);
  const nxt = PHASE_INDEX.get(next);
  if (cur === undefined || nxt === undefined || nxt !== cur + 1) {
    refuse('phase_sequence_violated', 'pack skill event-lifecycle', `cannot move ${st.current} → ${next}: only the immediate successor is legal`);
  }
  const predecessor = PHASES[cur];
  if (predecessor !== undefined && !st.completed.has(predecessor)) {
    refuse('phase_sequence_violated', 'pack skill event-lifecycle',
      `cannot enter \`${next}\` without \`${predecessor}\` completing — a phase can only be entered through its predecessor's verdict`);
  }
  ctx.commit({ type: 'PhaseEntered', eventId, phase: next, at: ctx.now() });
}

export function completePhase(ctx: Ctx, eventId: string, phase: Phase): void {
  const st = ctx.state.phases.get(eventId);
  if (!st || st.current !== phase) {
    refuse('phase_sequence_violated', 'pack skill event-lifecycle', `cannot complete \`${phase}\`: it is not the current phase`);
  }
  ctx.commit({ type: 'PhaseCompleted', eventId, phase, at: ctx.now() });
}

/** section 1.9.4 — the key is `(eventId, originKind, originId, phase)`; the second claim is a 409. */
export function claimPhaseOrigin(ctx: Ctx, eventId: string, originKind: string, originId: string, phase: Phase, agent: string): void {
  const claimKey = `${eventId}|${originKind}|${originId}|${phase}`;
  if (ctx.state.phaseClaims.has(claimKey)) {
    refuse('conflict_409', 'spec section 1.4 / section 1.9.4', `origin \`${originKind}:${originId}\` is already active in phase \`${phase}\` — do not retry; pick different work`);
  }
  ctx.commit({ type: 'PhaseOriginClaimed', claimKey, agent, at: ctx.now() });
}

export function checkoutEvent(ctx: Ctx, eventId: string, agentId: string): void {
  const holder = ctx.state.checkouts.get(eventId);
  if (holder !== undefined && holder !== agentId) {
    refuse('conflict_409', 'spec section 1.4', `event loop \`${eventId}\` is checked out by \`${holder}\` — never retried`);
  }
  if (holder === agentId) return; // re-checkout by the owner is a no-op
  ctx.commit({ type: 'EventCheckedOut', eventId, agent: agentId, at: ctx.now() });
}

export function scheduleWake(ctx: Ctx, opts: { purpose: string; nextCheckAt: number; eventId?: string }): WakeRow {
  const row: WakeRow = {
    id: `wake-${ctx.state.wakes.size + 1}`,
    purpose: opts.purpose,
    nextCheckAt: opts.nextCheckAt,
    attempts: 0,
    ...(opts.eventId !== undefined ? { eventId: opts.eventId } : {}),
    scheduledAt: ctx.now(),
  };
  ctx.commit({ type: 'WakeScheduled', row, at: ctx.now() });
  return row;
}

/** section 1.3 — the check every "I'm monitoring this" claim must pass. */
export function assertWakeBacked(ctx: Ctx, purpose: string, eventId?: string): WakeRow {
  for (const w of ctx.state.wakes.values()) {
    if (w.purpose === purpose && w.nextCheckAt > ctx.now() && (eventId === undefined || w.eventId === eventId)) return w;
  }
  refuse('ghost_watcher', 'spec section 1.3', `a promise to follow up on \`${purpose}\` needs a persisted wake row — prose is not a waiting path`);
}

export function fireWake(ctx: Ctx, wakeId: string): void {
  const w = ctx.state.wakes.get(wakeId);
  if (!w) return;
  ctx.commit({ type: 'WakeFired', wakeId, at: ctx.now() });
}

// --- the applier ---------------------------------------------------------------------------------

export function applyLifecycle(state: FleetState, event: Extract<FleetEvent, { type: 'PhaseEntered' | 'PhaseCompleted' | 'PhaseOriginClaimed' | 'EventCheckedOut' | 'WakeScheduled' | 'WakeFired' }>): void {
  switch (event.type) {
    case 'PhaseEntered': {
      const st = state.phases.get(event.eventId) ?? { current: null, completed: new Set<Phase>() };
      st.current = event.phase;
      state.phases.set(event.eventId, st);
      return;
    }
    case 'PhaseCompleted': {
      const st = state.phases.get(event.eventId);
      if (st) {
        st.completed.add(event.phase);
        state.phases.set(event.eventId, st);
      }
      return;
    }
    case 'PhaseOriginClaimed':
      state.phaseClaims.add(event.claimKey);
      return;
    case 'EventCheckedOut':
      state.checkouts.set(event.eventId, event.agent);
      return;
    case 'WakeScheduled':
      state.wakes.set(event.row.id, { ...event.row });
      return;
    case 'WakeFired': {
      const w = state.wakes.get(event.wakeId);
      if (w) state.wakes.set(event.wakeId, { ...w, attempts: w.attempts + 1 });
      return;
    }
  }
}
