import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASES } from '../src/types.ts';

/**
 * `types.ts` is almost entirely erased at runtime — there is nothing to execute — so these tests
 * cover the two things in that file that ARE load-bearing: the phase sequence every lifecycle
 * transition is measured against, and the syntax contract the file states for the whole runtime
 * (erasable-only TS + `.ts` specifiers + node builtins), which is what keeps `runtime/`
 * dependency-free the way D21 shipped it. A typecheck would cover this better; there is no
 * typecheck here, so the shape of the source is what can actually be proven.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const modules = (dir: string) => readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.ts'))
  .map((f) => [`${dir}/${f}`, readFileSync(join(ROOT, dir, f), 'utf8')] as const);

/** Every file the shipped runtime consists of — the gate must cover the tour too, not just src/. */
const ALL: ReadonlyArray<readonly [string, string]> =
  [...modules('src'), ...modules('test'), ['tour.ts', readFileSync(join(ROOT, 'tour.ts'), 'utf8')] as const];

/** Strip comments so prose and doc examples never register as code. */
const noComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Strip template literals too: test/imports.test.ts holds synthetic source as fixture text, and
 * a `from './types.ts'` inside a fixture is not an import the runtime will ever resolve.
 */
const noTemplates = (src: string) => src.replace(/`(?:[^`\\]|\\.)*`/g, '``');

/**
 * Comments, templates, and string literals all stripped — for gates that read the code shape,
 * because a file that merely *mentions* forbidden syntax (in a doc sentence, or in this test's own
 * error message) must not trip them. Regex literals are left in: /enum\\s+\\w+/ cannot match itself.
 */
const codeOnly = (src: string) => noTemplates(noComments(src))
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""');

test('PHASES is exactly the sequence the pack skill and spec section 1.9.4 name — not a reordered approximation', () => {
  assert.deepEqual([...PHASES], ['draft', 'scheduled', 'promoting', 't-minus-7', 't-minus-1', 'running', 'recap', 'report', 'closed'],
    'the order is the state machine: a re-entry or a renumbered countdown is a lifecycle change, not a tidy-up');
  assert.equal(new Set(PHASES).size, PHASES.length, 'no phase appears twice');
});

test('the countdown sits between promotion and the event, in the order the reminders depend on', () => {
  const i = (p: string) => PHASES.indexOf(p as (typeof PHASES)[number]);
  assert.ok(i('t-minus-7') < i('t-minus-1'), 'a T-7 reminder must be reachable before a T-1 one');
  assert.ok(i('t-minus-1') < i('running'), 'the last reminder precedes the event itself');
  assert.ok(i('promoting') < i('t-minus-7'), 'promotion opens before the countdown starts');
  assert.ok(i('running') < i('recap') && i('recap') < i('report') && i('report') < i('closed'),
    'the after-event phases are ordered, because the report reads the recap');
});

test('phase names are log-safe: lowercase, no spaces, storable verbatim forever', () => {
  for (const p of PHASES) {
    assert.match(p, /^[a-z][a-z0-9-]*$/, `${p} appears in the audit log and in pack files — it must survive both`);
  }
});

// Node strips types; it does not implement them. These are the features that fail at import time
// with an error a new contributor will not connect to the syntax that caused it.
const NON_ERASABLE: Array<[RegExp, string]> = [
  [/\benum\s+\w+/, 'enum (emits runtime code — use a const array + union type)'],
  [/\bnamespace\s+\w+/, 'namespace (not erasable)'],
  [/\bdeclare\s+(?:module|global)\b/, 'declare module/global (not erasable)'],
  [/constructor\s*\([^)]*\b(?:private|public|protected|readonly)\b/, 'parameter property (not erasable)'],
];

const nonErasableDefects = (src: string): string[] => {
  const code = codeOnly(src);
  return NON_ERASABLE.filter(([pattern]) => pattern.test(code)).map(([, why]) => why);
};

/** Every import specifier in `src` (relative to `fromFile`) that breaks the D21 zero-dep contract. */
const importDefects = (src: string, fromFile: string): string[] => {
  const offenders: string[] = [];
  for (const m of noTemplates(noComments(src)).matchAll(/from\s+'([^']+)'/g)) {
    const spec = m[1]!;
    if (spec.startsWith('node:')) continue;
    if (spec.startsWith('.')) {
      // `.mjs` is legal: src/pack.ts calls the repo's own validator, which is JS with no deps.
      if (!/\.(ts|mjs)$/.test(spec)) offenders.push(`'${spec}' has no extension — type stripping resolves nothing without it`);
      else if (!existsSync(join(ROOT, dirname(fromFile), spec))) offenders.push(`'${spec}' does not exist on disk`);
      continue;
    }
    offenders.push(`'${spec}' is a third-party specifier`);
  }
  return offenders;
};

test('the erasable-syntax gate fires on the syntax it claims to catch, and on nothing else', () => {
  assert.deepEqual(nonErasableDefects('export enum Phase { Draft }'), ['enum (emits runtime code — use a const array + union type)']);
  assert.deepEqual(nonErasableDefects('class C { constructor(private readonly x: number) {} }'), ['parameter property (not erasable)']);
  assert.deepEqual(nonErasableDefects('// a doc note about enums and namespace Foo and declare module\nexport type T = 1;'), [],
    'prose that names the syntax must not fail the gate — that is how a scanner becomes noise');
  assert.deepEqual(nonErasableDefects("const why = 'declare module/global (not erasable)';"), [],
    'and neither may a string literal — this test file holds these very words');
});

test('the whole runtime is erasable-syntax TS: no enum, namespace, or parameter property anywhere', () => {
  for (const [where, body] of ALL) {
    assert.deepEqual(nonErasableDefects(body), [], `${where} uses non-erasable syntax`);
  }
});

test('the import gate fires on a bare specifier and an extensionless one', () => {
  assert.deepEqual(importDefects("import { z } from 'zod';", 'src/x.ts'), ["'zod' is a third-party specifier"]);
  assert.deepEqual(importDefects("import { s } from './store';", 'src/x.ts'),
    ["'./store' has no extension — type stripping resolves nothing without it"]);
  assert.deepEqual(importDefects("import { s } from './nope.ts';", 'src/x.ts'), ["'./nope.ts' does not exist on disk"]);
  assert.deepEqual(importDefects("import { test } from 'node:test';\nimport { s } from './store.ts';", 'src/x.ts'), []);
});

test('every runtime import is a node builtin or an explicit local file — the zero-dependency claim, checked', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.deepEqual([pkg.dependencies ?? null, pkg.devDependencies ?? null, pkg.peerDependencies ?? null], [null, null, null],
    'package.json declares no dependencies');
  for (const [where, body] of ALL) {
    assert.deepEqual(importDefects(body, where), [], `${where} breaks the zero-dependency contract (D21)`);
  }
});
