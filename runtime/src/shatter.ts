/**
 * §2.6 shatter-guard. A single complaint freezes the agent's level-1 lanes back to `draft` for
 * that channel, automatically, pending organiser review — with a written record of what
 * triggered it. The failure mode for community agents is not a wrong answer, it is a slow
 * accumulation of annoyance that ends in the agent being ejected; a guard that trips early and
 * reversibly is cheaper than a reputation that does not come back. `[INFERENCE]` per spec —
 * untested in the field; the pilot watches for it firing spuriously and becoming its own
 * annoyance.
 *
 * Release is an organiser act with an event, never an agent act — and it can never touch
 * disclosure (§2.8): the freeze demotes a lane, it does not anonymise one.
 */
import { refuse } from './errors.ts';
import type { FleetEvent, FleetState, ShatterRow } from './types.ts';

export function tripShatter(ctx: Ctx, channel: string, ref: string): void {
  const existing = ctx.state.shatter.get(channel);
  if (existing && existing.releasedAt === undefined) return; // idempotent while frozen
  ctx.commit({ type: 'ShatterTripped', channel, ref, at: ctx.now() });
}

export function releaseShatter(ctx: Ctx, channel: string, by: string): void {
  if (by !== 'organiser') refuse('not_the_human', 'spec §2.6', 'only the organiser releases a shatter freeze');
  const row = ctx.state.shatter.get(channel);
  if (!row || row.releasedAt !== undefined) return;
  ctx.commit({ type: 'ShatterReleased', channel, by, at: ctx.now() });
}

/** True while the freeze is live — the ladder reads this, nothing else does. */
export function isShattered(state: Ctx['state'], channel: string | undefined): boolean {
  if (!channel) return false;
  const row = state.shatter.get(channel);
  return row !== undefined && row.releasedAt === undefined;
}

// --- the applier (the only writer of state.shatter) ------------------------------------------

export function applyShatter(state: FleetState, event: Extract<FleetEvent, { type: 'ShatterTripped' | 'ShatterReleased' }>): void {
  if (event.type === 'ShatterTripped') {
    const row: ShatterRow = { channel: event.channel, trippedAt: event.at, ref: event.ref };
    state.shatter.set(event.channel, row);
    return;
  }
  const row = state.shatter.get(event.channel);
  if (row && row.releasedAt === undefined) {
    row.releasedAt = event.at;
    state.shatter.set(event.channel, { ...row, releasedAt: event.at });
  }
}
