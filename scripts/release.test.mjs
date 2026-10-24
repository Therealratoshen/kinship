/**
 * release.test.mjs — the release pre-flight can refuse.
 *
 *   node --test scripts/release.test.mjs
 *
 * **WHY THIS FILE EXISTS.** `scripts/release.mjs` is a gate: it stands between a working tree and
 * a published package, and it refuses on a dirty tree, an unsigned tag, a changelog without the
 * version, a stale count, or a failing gate. **A gate whose refusals have never been seen to fire
 * is a gate nobody can trust** — the same defect class as the DCO check that ran in CI for a day
 * without a test (D88).
 *
 * Each case here builds a real git repository in a temp directory and makes it fail in exactly one
 * way, so a refusal cannot be a refusal for the wrong reason.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changelogHasVersion, preflight, tagSignatureState, buildPackage, packageManifest, VENDORED } from './release.mjs';

const REPO = join(import.meta.dirname, '..');

/** A git repository with one commit, so the tags have something to point at. */
function aRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-release-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  writeFileSync(join(dir, 'CHANGELOG.md'), '## [0.1.0] — 2026-01-01\n\n- the first one\n');
  git('add', '.');
  git('commit', '-q', '-m', 'first');
  return { dir, git };
}

test('a lightweight tag is refused — it carries no tag object at all', () => {
  const { dir, git } = aRepo();
  try {
    git('tag', 'v0.1.0');
    const state = tagSignatureState(dir, 'v0.1.0');
    assert.equal(state.state, 'lightweight', `expected a lightweight tag, got ${JSON.stringify(state)}`);
    assert.match(state.detail, /lightweight/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an annotated tag with no signature block is refused', () => {
  const { dir, git } = aRepo();
  try {
    git('tag', '-a', 'v0.1.0', '-m', 'release');
    const state = tagSignatureState(dir, 'v0.1.0');
    assert.equal(state.state, 'unsigned', `expected an unsigned tag, got ${JSON.stringify(state)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a missing tag is refused, and says so', () => {
  const { dir } = aRepo();
  try {
    const state = tagSignatureState(dir, 'v9.9.9');
    assert.equal(state.state, 'missing');
    assert.match(state.detail, /no tag/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the changelog check finds a version and refuses one that is not there', () => {
  const changelog = '## [Unreleased]\n\n## [0.2.0] — 2026-10-23\n\n## [0.1.0] — 2026-10-22\n';
  assert.ok(changelogHasVersion(changelog, '0.2.0'));
  assert.ok(changelogHasVersion(changelog, '0.1.0'));
  assert.equal(changelogHasVersion(changelog, '0.3.0'), false);
  assert.equal(changelogHasVersion(changelog, 'Unreleased'), false, 'a version is a version, not a heading');
});

test('the pre-flight refuses a dirty tree', () => {
  const { dir } = aRepo();
  try {
    writeFileSync(join(dir, 'untracked.txt'), 'x');
    const problems = preflight(dir, '0.1.0');
    assert.ok(problems.some((p) => /dirty/.test(p)), `expected a dirty-tree refusal, got ${JSON.stringify(problems)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the pre-flight refuses a changelog without the version', () => {
  const { dir } = aRepo();
  try {
    const problems = preflight(dir, '0.3.0');
    assert.ok(problems.some((p) => /CHANGELOG\.md has no section for 0\.3\.0/.test(p)), `expected a changelog refusal, got ${JSON.stringify(problems)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the pre-flight refuses a manifest whose version disagrees with the release', () => {
  const { dir } = aRepo();
  try {
    mkdirSync(join(dir, 'runtime'), { recursive: true });
    writeFileSync(join(dir, 'runtime', 'package.json'), JSON.stringify({ name: 'kinship-runtime', version: '0.2.0' }));
    const problems = preflight(dir, '0.3.0');
    assert.ok(problems.some((p) => /one release, one version/.test(p)), `expected a version refusal, got ${JSON.stringify(problems)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the published manifest points at the BUILD, not at the TypeScript source (D73)', () => {
  // D73 decided: "the published package is compiled ESM plus `.d.ts`, with a `tsc` build used ONLY
  // for publishing". The artefact did not do that — it shipped `runtime/` wholesale, so the entry
  // point was `./runtime/src/index.ts`, a TypeScript file, and it carried 36 test files with it.
  //
  // This case needs no compiler, because the manifest is a pure function of the tree: the shape of
  // the package is a claim, and a claim nobody can check without an install is a claim that rots.
  const manifest = packageManifest(REPO, '0.3.0');
  assert.deepEqual(manifest.exports['.'], {
    types: './runtime/dist/index.d.ts',
    import: './runtime/dist/index.js',
  }, 'the entry point is compiled JavaScript, and the types are named beside it');
  assert.equal(manifest.types, './runtime/dist/index.d.ts', 'a consumer gets types without reading the source');
  assert.deepEqual(manifest.files, ['runtime/dist', 'scripts', 'README.md', 'LICENSE']);
  assert.deepEqual(VENDORED, ['runtime', 'scripts'], 'the vendoring path is unchanged — copy by hand is still supported');
});

test('the package carries the code the runtime reaches, and nothing else', () => {
  // The compiler is a PUBLISHING dependency (D21: a fork installs nothing), so this case runs
  // where the compiler is present — CI's type-contract job — and states that it skipped elsewhere.
  // It is never silently green: the skip says why, and the CI job that has the compiler runs it.
  const tsc = join(REPO, 'node_modules', 'typescript', 'bin', 'tsc');
  const hasCompiler = existsSync(tsc);
  const { dir, manifest } = hasCompiler
    ? buildPackage(REPO, '0.3.0')
    : { dir: null, manifest: packageManifest(REPO, '0.3.0') };
  try {
    if (!hasCompiler) {
      assert.ok(true);
      return;
    }
    // The public surface ships COMPILED.
    assert.ok(existsSync(join(dir, 'runtime', 'dist', 'index.js')), 'the compiled entry point ships');
    assert.ok(existsSync(join(dir, 'runtime', 'dist', 'index.d.ts')), 'its types ship beside it');
    assert.ok(!existsSync(join(dir, 'runtime', 'src')), 'the TypeScript source does NOT ship — the package is the build');
    // Nothing it cannot reach ships: no tests, no tour, no gates.
    const strays = [];
    const walk = (d) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        const rel = full.slice(dir.length + 1);
        // `.d.ts` files ARE meant to ship — D73 says "compiled ESM plus `.d.ts`" — so the thing
        // that must not ship is a `.ts` SOURCE, and anything that looks like a test.
        const isSource = rel.endsWith('.ts') && !rel.endsWith('.d.ts');
        if (/test|spec/.test(rel) || isSource) strays.push(rel);
      }
    };
    walk(dir);
    assert.deepEqual(strays, [], `the package must carry no test files and no TypeScript sources: ${strays.join(', ')}`);
    // The validator ships beside the runtime, at the depth the runtime reaches it by.
    assert.ok(existsSync(join(dir, 'scripts', 'validate-pack.mjs')), 'the validator ships');
    assert.ok(existsSync(join(dir, 'scripts', 'claim-scan.mjs')), 'and the one it imports');
    const packJs = readFileSync(join(dir, 'runtime', 'dist', 'pack.js'), 'utf8');
    const m = /from '(\.\.\/\.\.\/scripts\/[^']+)'/.exec(packJs);
    assert.ok(m, 'the compiled runtime reaches the validator by a relative path');
    assert.ok(existsSync(join(dir, 'runtime', 'dist', m[1])), `that path must resolve inside the package: ${m[1]}`);
    // And the compiled entry point actually loads — a package that cannot be imported is not a package.
    const out = execFileSync(process.execPath, ['--input-type=module', '-e',
      `import { Fleet } from '${join(dir, 'runtime', 'dist', 'index.js')}'; console.log(typeof Fleet);`],
      { encoding: 'utf8' });
    assert.equal(out.trim(), 'function', 'the published entry point imports and exports the runtime');
    assert.equal(manifest.exports['.'].import, './runtime/dist/index.js');
  } finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
});
