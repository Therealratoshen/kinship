/**
 * The state store: a fresh state, an append-only event log, and the hash that binds approvals
 * to revisions (§1.5). State is only ever mutated by `applyEvent` (apply.ts) — domain code
 * validates and *emits* events; it never mutates maps directly. That is what makes
 * `Fleet.replay(events)` produce a state deep-equal to the live one (§1.2), and it is the
 * property the replay test asserts rather than trusts.
 */
import { createHash } from 'node:crypto';
import type { FleetState, LoggedEvent } from './types.ts';

export function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

export function freshState(): FleetState {
  return {
    seq: 0,
    members: new Map(),
    suppressions: new Map(),
    grants: new Map(),
    cards: new Map(),
    authorizations: new Map(),
    phases: new Map(),
    phaseClaims: new Set(),
    checkouts: new Map(),
    wakes: new Map(),
    budgets: new Map(),
    shatter: new Map(),
    commitsByMember: new Map(),
    crossPromoByEvent: new Map(),
    inputs: new Map(),
    cardCount: 0,
    grantCount: 0,
    events: [],
  };
}

/**
 * Append to the log. Monotonic seq; events are stored as structured clones of the payload.
 * The deep copy is the audit guarantee, not a nicety: `CommitExecuted` carries `recipients`,
 * an array the caller keeps holding. With a shallow spread a later `push` to that array
 * rewrites what the log says happened (§1.2 — the record must show the state *at commit
 * time*, and replay must fold exactly what was appended).
 */
export function append(state: FleetState, event: Omit<LoggedEvent, 'seq'>): LoggedEvent {
  state.seq += 1;
  const logged = structuredClone({ ...event, seq: state.seq }) as LoggedEvent;
  state.events.push(logged);
  return logged;
}
