/**
 * A gate over the repo's own gate list. `test/errors.test.ts` does this for the refusal vocabulary;
 * this does it for the commands a contributor is told to run.
 *
 * The failure mode is specific and has happened: the tour became a fourth gate, and CI ran it while
 * `CONTRIBUTING.md`, the PR template, and the tour's own `--json` map all still said three. A
 * contributor following the documented list gets a green run and a red PR — which reads like the
 * repo is lying about its own gates.
 *
 * Every check carries a positive control, because a scanner that cannot fail is decoration (D24).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GATES, GATE_DOCS, checkGateDocs, missingGateCommands, staleGateClaims } from './gates.mjs';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('the gate list is the four the repo claims, in the order CI runs them', () => {
  assert.deepEqual(GATES.map((g) => g.id), ['shape', 'contract', 'semantics', 'tour']);
});

test('every documented gate runs from the repo root, with no npm and no cd', () => {
  for (const g of GATES) {
    assert.ok(!g.command.includes('cd '), `${g.id}: a 'cd' in a documented command means the list is not copy-pasteable from the repo root`);
    assert.ok(!/\b(npm|bun|pnpm)\b/.test(g.command), `${g.id}: the gates are node-only; an install step would break the on-ramp`);
    // A documented gate that points at a deleted file is a gate that silently never runs.
    for (const path of g.command.match(/[\w./*-]*\.(?:mjs|ts)/g) ?? []) {
      if (path.includes('*')) continue;
      assert.ok(existsSync(join(ROOT, path)), `${g.id}: references ${path}, which does not exist`);
    }
  }
});

test('the contributor-facing docs print all four gates and claim no other count', () => {
  const failures = checkGateDocs(ROOT);
  assert.deepEqual(failures, [], `gate list drifted:\n  ${failures.join('\n  ')}`);
});

test('POSITIVE CONTROL: a doc missing one gate is caught, and a whole doc is not', () => {
  const complete = GATES.map((g) => g.command).join('\n');
  assert.deepEqual(missingGateCommands(complete), []);
  const dropped = GATES.slice(0, 3).map((g) => g.command).join('\n');
  assert.deepEqual(missingGateCommands(dropped), [GATES[3].command], 'a doc that stopped listing the tour must fail');
  // A renamed path is a missing gate, not a near-miss: the check compares strings, not vibes.
  assert.equal(missingGateCommands(complete.replace('packs/kopdar-ops', 'packs/other'))[0], GATES[0].command);
});

test('POSITIVE CONTROL: a stale gate count is caught and a correct one is not', () => {
  assert.deepEqual(staleGateClaims('Run all four gates and paste the output.'), []);
  assert.match(staleGateClaims('Run all three gates and paste the output.')[0], /three gates/i);
  assert.equal(staleGateClaims('three CI gates stay node-only')[0], 'three CI gates');
});

test('CI runs this list rather than keeping a private copy of it', () => {
  const wf = read('.github/workflows/test.yml');
  assert.ok(wf.includes('node scripts/gates.mjs'), 'CI must invoke the shared runner, not re-type the four commands');
  // The supported range is a claim in runtime/package.json; CI holds to it (D22).
  for (const major of ['23', '24']) assert.ok(wf.includes(`'${major}'`), `CI no longer gates node ${major}`);
  assert.match(wf, /runs-on:\s*ubuntu-24\.04/, 'CI drifted to a floating runner image — reproducibility is the product');
});

test('the Node range package.json claims is the Node range CI actually tests', () => {
  // `engines.node: ">=23"` is a support claim. A claim CI does not test is a claim that rots —
  // and a matrix with a hole in it (23, 25) silently stops testing 24 while still looking wide.
  const claimed = JSON.parse(read('runtime/package.json')).engines.node;
  const matrix = (read('.github/workflows/test.yml').match(/node:\s*\[([^\]]*)\]/) ?? [])[1] ?? '';
  const majors = [...matrix.matchAll(/'(\d+)'/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
  assert.deepEqual(gaps(majors), [], 'CI matrix has a hole: every major between its ends must run');
  assert.equal(majors[0], minMajor(claimed), `CI starts at ${majors[0]} but ${claimed} promises lower support`);
});

/** The lowest major a semver range like ">=23" or ">=22.11.0" admits. */
function minMajor(range) {
  const m = range.match(/(\d+)/);
  assert.ok(m, `cannot read a major version out of "${range}"`);
  return Number(m[1]);
}

/** Majors a contiguous list is missing, e.g. [23, 25] → [24]. */
function gaps(sorted) {
  const missing = [];
  for (let i = sorted[0]; i <= sorted.at(-1); i++) if (!sorted.includes(i)) missing.push(i);
  return missing;
}

test('POSITIVE CONTROL: the Node-range checker fires on a gap and on a lower floor', () => {
  assert.deepEqual(gaps([23, 24]), []);
  assert.deepEqual(gaps([23, 25]), [24], 'a hole in the matrix must be reported, not averaged away');
  assert.equal(minMajor('>=22.11.0'), 22);
  assert.throws(() => minMajor('lts'), /cannot read a major version/);
});

test('the gate docs this checks are the ones contributors actually read', () => {
  // If a file is renamed, a doc can drop off the list and the gate goes quiet. Pin the set.
  assert.deepEqual(GATE_DOCS, ['README.md', 'AGENTS.md', 'CONTRIBUTING.md', '.github/PULL_REQUEST_TEMPLATE.md', 'runtime/tour.ts']);
  for (const rel of GATE_DOCS) assert.ok(existsSync(join(ROOT, rel)), `${rel} is on the list but missing`);
  // History files are deliberately NOT policed: DECISIONS.md and the PRD keep their dated wording,
  // and a correction there is a new dated row. Assert they are absent so nobody "fixes" that.
  for (const history of ['DECISIONS.md', 'PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md']) {
    assert.ok(!GATE_DOCS.includes(history), `${history} is append-only history — it is not a gate list`);
  }
});
