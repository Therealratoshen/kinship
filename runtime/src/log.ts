/**
 * Verifying a persisted log — seam 3 (spec/HOST-CONTRACT.md), as a pure read.
 *
 * The event log is the product's replayable audit trail (section 1.2). In memory that is a plain array;
 * the moment it becomes a **file** — copyable, syncable, forwardable — three questions appear that
 * memory never had to answer:
 *
 *   1. **Is the file complete?** A row deleted from the middle leaves a gap in `seq`. The gap is
 *      visible without any crypto, which is why this tier needs none.
 *   2. **Does it fold?** Replaying the rows must not throw, and the state it produces must be the
 *      state the fleet actually had.
 *   3. **Is it the log of *this* community, under *this* config?** A replay needs the pack and the
 *      eight `needs:` answers, so a file alone is not self-sufficient — and one of those answers is a
 *      named human. So the file carries a **digest** of the answers and the list of their keys, never
 *      the values, and drift shows up as a mismatch rather than as a leak.
 *
 * **What this tier does not catch, stated rather than implied.** A `CommitRefused` row folds to
 * nothing — "the log entry is the record; nothing else derives from it" — so deleting or editing one
 * leaves the folded state identical. This is tier 1: dense `seq` plus replay-and-compare. Tier 2
 * (a per-row digest chain) catches in-place edits and costs a canonical-serialisation rule, because
 * `JSON.stringify` follows key insertion order. A false "the file is corrupt" on an organiser's only
 * audit file is worse than a slower truth, so tier 2 is named and not built.
 *
 * This module is a **pure read**: no `fs`, no I/O, no clock. Writing the file is seam 3 and belongs
 * to the host — a writer inside `runtime/src` would fail the boundary gate on purpose (D32).
 */
import { hashText } from './store.ts';
import type { FleetState, LoggedEvent, NeedAnswers } from './types.ts';

/** What can be wrong with a log file. Every kind names what a reader would have to fix. */
export type LogProblemKind =
  | 'seq_missing'
  | 'seq_duplicate'
  | 'seq_out_of_order'
  | 'replay_failed'
  | 'state_mismatch'
  | 'answers_digest_mismatch';

export interface LogProblem {
  kind: LogProblemKind;
  detail: string;
  /** The row the problem was found at, when there is one. */
  seq?: number;
}

/** The result of verifying a log. `ok` is the whole answer; `problems` is why. */
export interface LogVerification {
  ok: boolean;
  problems: LogProblem[];
  rows: number;
  firstSeq: number | null;
  lastSeq: number | null;
  /** The state the rows fold to, when they fold at all. */
  state: FleetState | null;
}

/**
 * What the caller expects the log to produce. A restore-and-compare check passes the live fleet's
 * state; a file checked on its own passes only the digest.
 */
export interface LogExpectation {
  /** The state a faithful replay must reproduce — the live fleet's, in a restore check. */
  state?: FleetState;
  /** The `answersDigest` the manifest carries. A mismatch means the config under the log is not the config it was written with. */
  answersDigest?: string;
}

/**
 * A digest of the `needs:` answers. The keys are sorted so the digest does not depend on the order
 * the operator wrote them in, and the **values stay out of the file** — one of the eight is
 * `escalation_contact`, a named human, and a log that travels should not carry a second person's
 * identifier.
 */
export function answersDigest(answers: NeedAnswers): string {
  const body = Object.keys(answers)
    .sort()
    .map((k) => `${k}=${answers[k]}`)
    .join('\n');
  return hashText(body);
}

/**
 * The dense-`seq` check: the rows must be `1..N`, ascending, with no gap and no repeat.
 *
 * A gap is a deleted row and needs no cryptography to see — which is exactly why this tier can be
 * cheap. A repeat is a copied row; an out-of-order row is a file written by something other than
 * this runtime.
 */
export function seqProblems(rows: LoggedEvent[]): LogProblem[] {
  const problems: LogProblem[] = [];
  const seen = new Set<number>();
  let expected = 1;
  for (const row of rows) {
    const seq = row?.seq;
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 1) {
      problems.push({ kind: 'seq_out_of_order', detail: 'a row carries no positive integer seq — this file was not written by this runtime' });
      continue;
    }
    if (seen.has(seq)) {
      problems.push({ kind: 'seq_duplicate', detail: `seq ${seq} appears more than once — a row was copied, or the file was appended to twice`, seq });
    }
    if (seq !== expected) {
      problems.push({ kind: 'seq_missing', detail: `expected seq ${expected} and found ${seq} — a row was deleted from this file`, seq });
    }
    seen.add(seq);
    expected = seq + 1;
  }
  return problems;
}

/**
 * Deep equality over the shapes a `FleetState` holds: plain objects, arrays, `Map`s, `Set`s.
 *
 * Written here rather than imported from `node:util` because the runtime's builtin allowlist maps
 * every `node:` builtin to exactly one module (fact 9 in D41's memo) and `node:util` is not one of
 * them. A key whose value is `undefined` on one side and absent on the other compares equal, so a
 * fold that omits a field the live state carries is not a mismatch.
 */
export function deepEqualState(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Map) {
    if (!(b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k)) return false;
      if (!deepEqualState(v, b.get(k))) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    if (!(b instanceof Set) || a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  if (Array.isArray(a)) {
    if (a.length !== (b as unknown[]).length) return false;
    return a.every((v, i) => deepEqualState(v, (b as unknown[])[i]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const k of keys) {
    if (!deepEqualState(left[k], right[k])) return false;
  }
  return true;
}
