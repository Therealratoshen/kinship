import { freshState } from '../src/store.ts';
import { commitEvent } from '../src/apply.ts';
import { resolveSettings } from '../src/settings.ts';
import type { Ctx, FleetEvent, Packed } from '../src/types.ts';

/** A pack with the default guardrails; per-agent class maps are the test's input. */
export function makePack(classes: Record<string, Record<string, string>>): Packed {
  return {
    schema: 'kinship/v1',
    key: 'kinshipai/bundled/event-ops/test',
    locale: ['id', 'en'],
    agents: Object.fromEntries(
      Object.entries(classes).map(([role, autonomyByClass]) => [
        role,
        { role, autonomyByClass, tools: [] },
      ]),
    ),
    guardrails: {
      reportAggregationFloor: 10,
      memberMessageCapPer24h: 2,
      identityDisclosure: true,
      defaultsDeny: true,
    },
    budgets: {
      llmPerEventIdr: null,
      warnAtRatio: 0.8,
      hardStop: true,
      queueMax: 20,
      maxActionsPerRun: 15,
      crossPromoPerEventCap: 1,
    },
    needs: [],
  };
}

/**
 * A minimal harness: real state, real reducer, a deterministic clock the test advances.
 * No stubs — if a test fails, the failing thing is the domain code, not a mock.
 */
export function makeCtx(pack: Packed, answers: Record<string, string> = {}, startAt = 1_000): Ctx {
  const state = freshState();
  let t = startAt;
  const commit = (e: FleetEvent) => {
    // The engine's contract, mirrored exactly via the shared implementation in apply.ts.
    commitEvent(state, e);
  };
  return {
    state,
    commit,
    now: () => t,
    pack,
    answers,
    // The same resolution the engine performs at construction: a harness that skipped the tier would
    // test a runtime nobody can boot. `resolveSettings` reads `pack.org`, so a fixture that wants an
    // org tier attaches the manifest and gets the floors, seats, and ceilings from it.
    settings: resolveSettings({ pack }),
    advance: (ms: number) => { t += ms; },
  };
}
