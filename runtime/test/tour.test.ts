/**
 * The contribution map must not lie to a newcomer.
 *
 * **What the map is.** `node runtime/tour.ts --json` prints a contribution map: the artifact a
 * newcomer — or an agent — is pointed at, so they can see what is built, what is untested, and
 * what to run. It is computed from the files on disk rather than written by hand (D27), which is
 * exactly what makes it worth trusting, and exactly what makes a drift in it a lie rather than an
 * approximation.
 *
 * **Why it needs holding tests.** The map is computed, so it is *correct by construction* — unless
 * the computation and the repo disagree about what a fact means. Two ways that happened:
 *
 * 1. **The coverage seam.** `contributionMap()` builds the set of tested names by stripping
 *    `.test.ts` off the test file names and compares it to the module names literally. The repo's
 *    convention is exact matching everywhere else (`apply.ts` / `apply.test.ts`), so a module is
 *    focused-tested when a test file is named after it. `thread.test.ts` held the fourteen cases
 *    for `runtime/src/threads.ts` — D55 says the test was written *first*, red, before the module
 *    existed — but the file was named in the singular, so the map reported a tested module as
 *    untested. The map was right about the *convention* and the file was wrong about its *name*.
 *
 * 2. **The verify path.** `howToVerify` is the list of commands a newcomer is handed to check their
 *    work. It listed the four gates and nothing else — while CI runs the type contract and each
 *    adapter's own suite as a job of its own. A contributor who followed the map exactly would not
 *    have run a single adapter test, and the rules that decide *who may act* live in the adapters.
 *
 * **The shape of the checks here.** Each one asserts an invariant, not a snapshot: the map must not
 * report a module as untested when a focused test file exists for it, and the map must not omit a
 * suite that exists on disk. The expectations are derived here, independently of the map's own
 * computation — the map matches names literally, this file allows the singular/plural twin — so the
 * two derivations have to agree. A test that re-ran the map's own logic would agree with it by
 * construction and could not fail (D24: a check that cannot fail is decoration).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..'); // .../runtime
const REPO = join(ROOT, '..'); // .../repo

let cached: any = null;

/** The map as a newcomer reads it: the tour's own `--json` output, run the way CI runs it. */
function contributionMap(): any {
  if (cached) return cached;
  const tour = spawnSync('node', ['runtime/tour.ts', '--json'], { cwd: REPO, encoding: 'utf8' });
  assert.equal(
    tour.status,
    0,
    `the tour must hold its own guarantees for its map to mean anything:\n${tour.stderr}`,
  );
  cached = JSON.parse(tour.stdout).contributionMap;
  return cached;
}

/**
 * The repo's convention is exact: a test file is named after the module it tests. A module whose
 * test file differs only by a trailing "s" is the same file, misspelled — so the twin counts.
 */
function isTwin(a: string, b: string): boolean {
  return a === b || a === b + 's' || b === a + 's';
}

function srcModules(): string[] {
  return readdirSync(join(ROOT, 'src'))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => f.replace(/\.ts$/, ''))
    .sort();
}

function testStems(): string[] {
  return readdirSync(join(ROOT, 'test'))
    .filter((f) => f.endsWith('.test.ts'))
    .map((f) => f.replace(/\.test\.ts$/, ''))
    .sort();
}

test('the map does not report a module as untested when a focused test file exists for it', () => {
  const map = contributionMap();
  const stems = testStems();
  const wronglyListed = map.srcModulesWithoutDedicatedTestFile.filter((m: string) =>
    stems.some((t) => isTwin(t, m)),
  );
  assert.deepEqual(
    wronglyListed,
    [],
    `the map reports a tested module as untested: ${wronglyListed.join(', ')} — a test file is named after the module it tests, so the file or the map is wrong`,
  );
});

test('every module the map lists as untested really has no test file of its own', () => {
  const map = contributionMap();
  const stems = testStems();
  for (const m of map.srcModulesWithoutDedicatedTestFile) {
    assert.ok(
      !stems.some((t) => isTwin(t, m)),
      `${m} is listed as untested but a test file is named after it`,
    );
  }
});

test('the map tells a newcomer to run every adapter suite that exists on disk', () => {
  const map = contributionMap();
  const adapters = readdirSync(join(REPO, 'adapters'))
    .filter((d) => existsSync(join(REPO, 'adapters', d, 'package.json')))
    .sort();
  assert.ok(adapters.length > 0, 'the repo has adapters, so the map has suites to name');
  const missing = adapters.filter(
    (a) =>
      !map.howToVerify.some(
        (c: string) => c.includes(`adapters/${a}`) && c.includes('npm test'),
      ),
  );
  assert.deepEqual(
    missing,
    [],
    `the map omits an adapter suite: ${missing.join(', ')} — the deciding-actor rules live in the adapters, so a newcomer who follows the map has not checked them`,
  );
});

test('the map tells a newcomer to check the types, because node does not', () => {
  const map = contributionMap();
  assert.ok(
    map.howToVerify.some(
      (c: string) => c.includes('tsc') && c.includes('runtime/tsconfig.json'),
    ),
    'the runtime is TypeScript and node strips the types when it runs them — nothing checks them unless the map says so',
  );
});

test('the twin matcher is a matcher, not a rule that matches everything', () => {
  // The positive control: the helper the checks above lean on must be able to say NO.
  assert.ok(isTwin('thread', 'threads'), 'the singular/plural twin is the same file');
  assert.ok(!isTwin('thread', 'card'), 'two unrelated modules are not twins');
  assert.ok(!isTwin('thread', 'threadish'), 'a prefix is not a twin');
});
