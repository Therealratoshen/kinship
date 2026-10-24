/**
 * index.ts — the public surface of the Kinship runtime.
 *
 * **What this file is.** A deliberately small barrel over the runtime, so that somebody adopting
 * Kinship has **one place to look** and a **short list of things they may depend on**. Before it,
 * the way in was to read `runtime/tour.ts` and copy its imports: `loadPack` from `src/pack.ts`,
 * `Fleet` from `src/engine.ts`, `runActions` from `src/runner.ts`, `createRun` from `src/budget.ts`
 * — four internal module paths that are an implementation detail, and that change when the runtime
 * is refactored. **An API that is only visible by reading somebody else's imports is not an API.**
 *
 * **What is public, and what is not.**
 *
 * - **Public** — the things below. An adopter may depend on them, and the tour and the vendoring
 *   fixture both go through this file, so it is exercised rather than merely exported.
 * - **Internal** — everything else in `runtime/src/`. A module that is not re-exported here is an
 *   implementation detail, and its shape may change. The vendoring fixture runs the runtime's own
 *   tour **from outside this repository**, so a change that breaks an adopter who used the public
 *   surface is a build failure rather than a surprise in somebody else's checkout.
 *
 * **And the honest limit, in one line:** this is the surface an *adopter* depends on. A **host
 * author** needs more of the runtime than this — the clock, the store, the plan, the log format —
 * and the *host contract* (`spec/HOST-CONTRACT.md`) is what names those seams. **Two audiences, two
 * surfaces**, and this barrel is the adopter's.
 *
 * **A worked example** lives at `runtime/examples/one-complete-example.ts`: boot a pack, attempt an
 * action, handle the card or the refusal, record a human decision, replay and verify. It imports
 * **only this file**, so it is the example and the test at the same time.
 */
export { Fleet } from './engine.ts';

/** Fold a log back to the state it describes — what a replay is. */
export { replay } from './apply.ts';
export type { AttemptArgs, AttemptResult, CommitArgs, WakeOutcome } from './engine.ts';

export { loadPack } from './pack.ts';

export { runActions } from './runner.ts';
export type { ActionOutcome, ActionResult, RunReport } from './runner.ts';

export { createRun } from './budget.ts';
export type { RunState } from './budget.ts';

export { KinshipError, REFUSAL_CODES } from './errors.ts';
export type { RefusalCode } from './errors.ts';

export { UNIMPLEMENTED_REFUSAL_CODES } from './errors.ts';

/** The marker a health read leaves in place of a member identifier. */
export { HEALTH_WITHHELD_MEMBER_REF } from './health.ts';

// The types are imported and then re-exported, rather than re-exported in place: the runtime's own
// import-discipline scanner checks that a name used in a file is **imported** by that file, and a
// re-export is not an import. The rule is right — a name a file uses should be in its scope.
import type { FleetState, FleetEvent, LoggedEvent, NeedAnswers, Packed, Verdict } from './types.ts';

export type { FleetState, FleetEvent, LoggedEvent, NeedAnswers, Packed, Verdict };
