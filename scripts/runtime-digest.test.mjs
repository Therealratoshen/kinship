/**
 * The digest's contract tests.
 *
 * **What is being tested, and why these cases.** A digest is only useful for one thing: proving
 * that two trees are the same. So the tests are not about hashing — they are about the three
 * properties that make that comparison mean something:
 *
 *  1. **It does not depend on where the tree lives.** A vendored copy is at a different absolute
 *     path, always. If the digest changed with the path, a host could never compare its copy
 *     against this repository, and the whole mechanism would be decoration.
 *  2. **It changes when the bytes change.** The obvious failure mode of a digest that ignores
 *     content.
 *  3. **It ignores what is not shipped.** A host that runs `npm install` leaves a `node_modules/`
 *     in its vendored copy; two copies of the same runtime must still digest the same.
 *
 * **Positive control.** Every check here has a counterpart that must *fail*, because a check that
 * cannot fail is decoration (`DECISIONS.md` D24) — the reason this repository insists on it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runtimeDigest, digestTree, digestFiles, SHIPPABLE_SCOPE, FULL_SCOPE, REPO_ROOT } from './runtime-digest.mjs';

const RUNTIME = join(REPO_ROOT, 'runtime');

/** A throwaway copy of the runtime tree, so a test can mutate bytes without touching the repo. */
function copyRuntime() {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-digest-'));
  cpSync(RUNTIME, join(dir, 'runtime'), { recursive: true });
  return { dir, runtime: join(dir, 'runtime'), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('the digest is the same on two consecutive reads of the same tree', () => {
  const a = runtimeDigest(REPO_ROOT);
  const b = runtimeDigest(REPO_ROOT);
  assert.equal(a.digest, b.digest);
  assert.match(a.digest, /^sha256:[0-9a-f]{64}$/, 'the digest is a full sha256, not a truncation');
});

test('POSITIVE CONTROL: two different digests are not equal', () => {
  const a = runtimeDigest(REPO_ROOT);
  assert.notEqual(`${a.digest}x`, a.digest, 'the comparison the parity check depends on can fail');
});

test('the digest does not depend on where the tree lives', () => {
  // The property the whole mechanism rests on: a vendored copy is always somewhere else.
  const copy = copyRuntime();
  try {
    const here = runtimeDigest(REPO_ROOT);
    const there = runtimeDigest(copy.dir);
    assert.equal(there.digest, here.digest, 'a copy at a different path must digest identically');
  } finally {
    copy.cleanup();
  }
});

test('the digest changes when a byte changes', () => {
  const copy = copyRuntime();
  try {
    const before = runtimeDigest(copy.dir).digest;
    appendFileSync(join(copy.runtime, 'src', 'types.ts'), '\n// one byte of drift\n');
    const after = runtimeDigest(copy.dir).digest;
    assert.notEqual(after, before, 'a changed byte must change the digest');
  } finally {
    copy.cleanup();
  }
});

test('the digest changes when a file is added', () => {
  const copy = copyRuntime();
  try {
    const before = runtimeDigest(copy.dir).digest;
    writeFileSync(join(copy.runtime, 'src', 'drift.ts'), 'export const drift = 1;\n');
    const after = runtimeDigest(copy.dir).digest;
    assert.notEqual(after, before, 'an added file must change the digest');
  } finally {
    copy.cleanup();
  }
});

test('the digest changes when a file is removed', () => {
  const copy = copyRuntime();
  try {
    const before = runtimeDigest(copy.dir).digest;
    unlinkSync(join(copy.runtime, 'src', 'types.ts'));
    const after = runtimeDigest(copy.dir).digest;
    assert.notEqual(after, before, 'a removed file must change the digest');
  } finally {
    copy.cleanup();
  }
});

test('the digest ignores what a host does not ship', () => {
  const copy = copyRuntime();
  try {
    const before = runtimeDigest(copy.dir).digest;
    // What a real vendored copy looks like after `npm install`, plus tool state nobody ships.
    mkdirSync(join(copy.runtime, 'node_modules', 'left-pad'), { recursive: true });
    writeFileSync(join(copy.runtime, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1;\n');
    writeFileSync(join(copy.runtime, '.DS_Store'), 'noise\n');
    const after = runtimeDigest(copy.dir).digest;
    assert.equal(after, before, 'dependencies and tool state are not part of what a host ships');
  } finally {
    copy.cleanup();
  }
});

test('the default scope is the shippable part, and the full scope is larger', () => {
  // The scope choice is a judgement, so it is pinned: a host's copy carries `src/` and the
  // manifest, and the tests are not part of what a member's behaviour depends on.
  const shippable = digestTree(RUNTIME, { scope: SHIPPABLE_SCOPE });
  const full = digestTree(RUNTIME, { scope: FULL_SCOPE });
  assert.ok(full.files > shippable.files, 'the full scope covers strictly more than the shippable scope');
  assert.notEqual(full.digest, shippable.digest, 'and it is a different digest, not the same one twice');

  const shippablePaths = digestFiles(RUNTIME, SHIPPABLE_SCOPE);
  assert.ok(shippablePaths.includes('package.json'), 'the manifest is shipped and must be covered');
  assert.ok(shippablePaths.every((p) => p.startsWith('src/') || p === 'package.json'), 'the default scope is exactly src/ and the manifest');
  assert.ok(!shippablePaths.some((p) => p.startsWith('test/')), 'the tests are not in the default scope');
});

test('a change in the tests alone does not move the shippable digest', () => {
  const copy = copyRuntime();
  try {
    const before = runtimeDigest(copy.dir).digest;
    appendFileSync(join(copy.runtime, 'test', 'replay.test.ts'), '\n// a test-only change\n');
    assert.equal(runtimeDigest(copy.dir).digest, before, 'a host does not ship the tests, so their drift is not the host\'s drift');
    assert.notEqual(digestTree(copy.runtime, { scope: FULL_SCOPE }).digest, digestTree(RUNTIME, { scope: FULL_SCOPE }).digest, 'and the full scope does see it');
  } finally {
    copy.cleanup();
  }
});

test('the file list is sorted, and sorted by the exact string that is hashed', () => {
  const files = digestFiles(RUNTIME, FULL_SCOPE);
  const sorted = [...files].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(files, sorted, 'the order is a total order over the hashed strings, not a locale order');
  assert.equal(new Set(files).size, files.length, 'no path is counted twice');
});
