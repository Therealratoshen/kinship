/**
 * The state store: a fresh state, an append-only event log, and the hash that binds approvals
 * to revisions (section 1.5). State is only ever mutated by `applyEvent` (apply.ts) — domain code
 * validates and *emits* events; it never mutates maps directly. That is what makes
 * `Fleet.replay(events)` produce a state deep-equal to the live one (section 1.2), and it is the
 * property the replay test asserts rather than trusts.
 */
import { createHash } from 'node:crypto';
import type { FleetState, LoggedEvent } from './types.ts';

/**
 * The content hash — 128 bits of SHA-256, hex-encoded.
 *
 * **Why 32 hex characters and not 16.** A 16-character hex slice is 64 bits, and the birthday bound
 * for a 64-bit hash is 2^32 — about 4.3 billion. A modern GPU computes billions of SHA-256 digests
 * a second, so **a collision is minutes of work, not a theoretical concern.** And this hash is not
 * decorative: it is the *revision binding* (spec section 1.5) — the thing that decides whether the
 * copy being sent is the copy that was approved. A collision there is not a cosmetic defect; it is a
 * way to get unapproved copy past an approval. At 128 bits the birthday bound is 2^64, which no
 * cluster will reach.
 *
 * The cost is 16 more characters per hash in the log. That is the right trade: a log that fits in
 * less space and cannot be trusted is not a log.
 */
export function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 32);
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
    threads: new Map(),
    cardCount: 0,
    grantCount: 0,
    events: [],
  };
}

/**
 * Append to the log. Monotonic seq; events are stored as structured clones of the payload.
 * The deep copy is the audit guarantee, not a nicety: `CommitExecuted` carries `recipients`,
 * an array the caller keeps holding. With a shallow spread a later `push` to that array
 * rewrites what the log says happened (section 1.2 — the record must show the state *at commit
 * time*, and replay must fold exactly what was appended).
 */
export function append(state: FleetState, event: Omit<LoggedEvent, 'seq'>): LoggedEvent {
  state.seq += 1;
  const logged = structuredClone({ ...event, seq: state.seq }) as LoggedEvent;
  state.events.push(logged);
  return logged;
}
