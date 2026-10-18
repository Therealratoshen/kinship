/**
 * The four CI gates, in one place, runnable as one command.
 *
 * Why this file exists: the gate list was written out separately in CI's yaml, `CONTRIBUTING.md`,
 * the PR template, `README.md`, `AGENTS.md`, `runtime/tour.ts`'s contribution map, and a seeded
 * issue body. When the tour became a fourth gate, all seven drifted, and a human had to grep for
 * it — the same rot class D24 named for hardcoded test counts. `test/errors.test.ts` polices the
 * refusal vocabulary against the code; `scripts/gates.test.mjs` (run by gate 2 below) polices the
 * documented list against this file.
 *
 * Canonical form: every command runs from the repo root, with no `cd` and no npm. That is what the
 * docs must print verbatim, because the gate compares strings, not intentions.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const GATES = [
  {
    id: 'shape',
    title: 'Pack shape gate — does the pack obey the invariants?',
    command: 'node scripts/validate-pack.mjs packs/kopdar-ops',
  },
  {
    id: 'contract',
    title: 'Validator + gate contract tests — can the pack, or these docs, drift silently?',
    command: 'node --test scripts/*.test.mjs',
  },
  {
    id: 'semantics',
    title: 'Runtime semantics tests — do the governance rules actually hold?',
    command: 'node --test runtime/test/*.test.ts',
  },
  {
    id: 'tour',
    title: 'The tour — self-checks every guarantee the README claims, and CI fails on its exit code',
    command: 'node runtime/tour.ts',
  },
];

/**
 * Files that promise a gate list to a contributor. Not DECISIONS.md or the PRD: those are history,
 * and history is corrected by a new dated row, not by making the old sentence look like it was
 * always right (invariant #3).
 */
export const GATE_DOCS = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'runtime/tour.ts',
];

/** A phrase that claims a count the list no longer has. */
const STALE_CLAIMS = [/\bthree gates\b/i, /\ball three gates\b/i, /\bthree CI gates\b/i, /\b3 gates\b/i];

/** Every GATES command must appear verbatim. Returns the commands a doc is missing. */
export function missingGateCommands(text, gates = GATES) {
  return gates.filter((g) => !text.includes(g.command)).map((g) => g.command);
}

/** No doc may claim a gate count that drifted. Returns the offending phrases it still contains. */
export function staleGateClaims(text) {
  return STALE_CLAIMS.map((re) => (re.exec(text) ? re.exec(text)[0] : null)).filter(Boolean);
}

export function checkGateDocs(root = join(import.meta.dirname, '..')) {
  const failures = [];
  for (const rel of GATE_DOCS) {
    const text = readFileSync(join(root, rel), 'utf8');
    const missing = missingGateCommands(text);
    if (missing.length) failures.push(`${rel}: does not print ${missing.map((m) => `\`${m}\``).join(', ')}`);
    const stale = staleGateClaims(text);
    if (stale.length) failures.push(`${rel}: still says "${stale.join('", "')}" — the list is four; fix the sentence, do not delete the history row that said it`);
  }
  return failures;
}

/** Run the four gates in order from the repo root. Returns a report; throws nothing. */
export function runGates({ log = console.log, cwd = join(import.meta.dirname, '..') } = {}) {
  const results = [];
  for (const gate of GATES) {
    log(`\n── ${gate.title}\n   $ ${gate.command}`);
    const r = spawnSync(gate.command, { cwd, shell: true, stdio: 'inherit' });
    const ok = r.status === 0;
    results.push({ id: gate.id, command: gate.command, ok, exit: r.status });
    log(ok ? `   PASS ${gate.id}` : `   FAIL ${gate.id} (exit ${r.status})`);
    if (!ok) break; // fail fast: a later gate cannot unbreak an earlier one, and the first failure is the one to fix
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runGates({ log: (line) => console.log(line) });
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? `${failed.length} gate failed — ${failed.map((f) => f.id).join(', ')}` : 'All four gates pass.'}`);
  // A stopped-early run is not a pass: report how many gates never got to prove anything.
  if (results.length < GATES.length && !failed.length) {
    console.log(`(and ${GATES.length - results.length} never ran)`);
  }
  process.exit(failed.length ? 1 : results.length < GATES.length ? 1 : 0);
}
