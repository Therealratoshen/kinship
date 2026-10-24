/**
 * vendoring.test.mjs — the vendoring promise, proved.
 *
 *   node --test scripts/vendoring.test.mjs
 *
 * **WHY THIS FILE EXISTS.** The repository tells an adopter how to use it: **copy `runtime/` and
 * `scripts/` together, and import the `.ts` files.** The README also claimed that the hosted surface
 * "runs this code byte for byte" and called the vendoring check "a CI gate, not a promise".
 *
 * **There was no vendoring check.** The four gates are pack shape, contracts, runtime semantics and
 * the tour — and every one of them runs *inside this repository*, where the runtime sits next to the
 * pack, next to `orgs/`, next to the scripts that read it. A promise that only holds in the place the
 * promise was written is not a promise, and the front page of a repository whose thesis is *a claim
 * may not outrun its evidence* was making one (D91).
 *
 * **WHAT THIS CHECKS, IN THREE PARTS.**
 *
 * 1. That the **documented folders alone** are enough: copy `runtime/` and `scripts/` out of this
 *    repository, put them beside a pack and the org manifest beside it — which is what an adopter
 *    does — and the tour still passes **on the copy**, with no install step and nothing else from
 *    this repository present.
 * 2. That the **released** tree works the same way: the same folders, taken from the newest
 *    **release tag** rather than from the working tree, run their own tour standalone. The working
 *    tree is what a contributor sees; the tag is what an adopter downloads, and only the second
 *    one is a promise.
 * 3. That the **public surface** is real: the worked example imports **only** `runtime/src/index.ts`,
 *    and it runs **from outside this repository**. An API that is only visible by reading somebody
 *    else's imports is not an API.
 *
 * **WHY IT IS A TEST AND NOT A FIFTH GATE.** The gate list is four, and D24's reason for keeping it
 * four is that a list that grows is a list that drifts: every gate is printed in six places, and
 * those six places have to agree. This is a contract test about the repository's own packaging, which
 * is what gate 2 is for — it runs inside the **contract** gate, and it is a check, not a promise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PACK = join(ROOT, 'packs', 'kopdar-ops');

/**
 * A copy of the documented folders, and nothing else.
 *
 * `runtime/` and `scripts/` are the vendored control plane. The pack and the org manifest are the
 * adopter's own — the org manifest has to sit beside the pack, because the loader walks up for it
 * and booting floorless is refused on purpose (PKG-58).
 */
function vendoredCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-vendored-'));
  cpSync(join(ROOT, 'runtime'), join(dir, 'runtime'), { recursive: true });
  cpSync(join(ROOT, 'scripts'), join(dir, 'scripts'), { recursive: true });
  cpSync(PACK, join(dir, 'packs', 'kopdar-ops'), { recursive: true });
  cpSync(join(ROOT, 'orgs'), join(dir, 'orgs'), { recursive: true });
  return dir;
}

/** Run node in a directory, and say what happened. */
function runIn(dir, args) {
  const r = spawnSync('node', args, { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

test('the documented folders alone are enough — the tour passes on a copy', () => {
  const dir = vendoredCopy();
  try {
    const r = runIn(dir, ['runtime/tour.ts']);
    assert.equal(r.code, 0, `the tour must pass on a vendored copy:\n${r.out.slice(-2000)}`);
    assert.match(r.out, /All governance guarantees hold/, 'and it must be the real tour, not a quiet failure');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the vendored copy carries no install step — the shape gate runs on it as it is', () => {
  const dir = vendoredCopy();
  try {
    const r = runIn(dir, ['scripts/validate-pack.mjs', 'packs/kopdar-ops']);
    assert.equal(r.code, 0, `the shape gate must pass on a vendored copy:\n${r.out.slice(-2000)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('POSITIVE CONTROL: a vendored copy with a broken runtime does not pass', () => {
  // The check must be able to fail. A fixture that passes on anything is not a fixture, and a
  // vendoring promise nobody can disprove is a promise nobody made.
  const dir = vendoredCopy();
  try {
    // Break the runtime the way a bad copy would break it: the file the engine lives in, emptied.
    writeFileSync(join(dir, 'runtime', 'src', 'engine.ts'), 'export const Fleet = undefined;\n');
    const r = runIn(dir, ['runtime/tour.ts']);
    assert.notEqual(r.code, 0, 'a vendored copy with a broken runtime must not pass');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the copy holds the documented folders and nothing else from this repository', () => {
  // The claim is about *these* folders. If the copy silently needed something else — a file at the
  // root, a sibling directory — the promise would be "copy the repository", which is not what the
  // README says an adopter does.
  const dir = vendoredCopy();
  try {
    const top = readdirSync(dir).sort();
    assert.deepEqual(top, ['orgs', 'packs', 'runtime', 'scripts'], 'the copy holds exactly what was copied');
    // And the vendored control plane is the two documented folders.
    for (const folder of ['runtime', 'scripts']) {
      assert.ok(statSync(join(dir, folder)).isDirectory(), `${folder} is a folder`);
    }
    // Nothing from the root of this repository rode along.
    for (const forbidden of ['README.md', 'DECISIONS.md', 'ROADMAP.md', 'package.json', '.github']) {
      assert.equal(existsSync(join(dir, forbidden)), false, `${forbidden} must not be in a vendored copy`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the RELEASED tree works standalone — the tag is what an adopter downloads', () => {
  // The working tree is what a contributor sees. The **tag** is what somebody else downloads, and
  // only that one is a promise about the published artefact. So the same check, run against the
  // folders taken from the newest release tag.
  const tags = execFileSync('git', ['tag', '--list', 'v*', '--sort=v:refname'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((t) => t.trim() !== '');
  if (tags.length === 0) {
    // Not a silent skip: the reason is printed, and the consequence is named.
    return assert.fail('no release tag to check — the published artefact has not been released, so there is nothing to prove about it');
  }
  const tag = tags[tags.length - 1];
  const dir = mkdtempSync(join(tmpdir(), 'kinship-released-'));
  try {
    // Only the documented folders, and the pack and the org manifest beside them.
    execFileSync('git', ['archive', tag, 'runtime', 'scripts', 'packs', 'orgs'], { cwd: ROOT, encoding: 'buffer' });
    execFileSync('tar', ['-x', '-C', dir], { input: execFileSync('git', ['archive', tag, 'runtime', 'scripts', 'packs', 'orgs'], { cwd: ROOT, encoding: 'buffer' }) });
    const r = runIn(dir, ['runtime/tour.ts']);
    assert.equal(r.code, 0, `the released tree (${tag}) must run its own tour standalone:\n${r.out.slice(-2000)}`);
    assert.match(r.out, /All governance guarantees hold/, 'and it must be the real tour');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the public example runs from OUTSIDE this repository, on the public surface only', () => {
  // The example is what an adopter copies, so it has to work on a copy — and it has to import
  // **only** the public surface, or it is teaching people to reach past it.
  const dir = vendoredCopy();
  try {
    const r = runIn(dir, ['runtime/examples/one-complete-example.ts']);
    assert.equal(r.code, 0, `the worked example must run on a vendored copy:\n${r.out.slice(-2000)}`);
    assert.match(r.out, /verified: true/, 'and it must end in a verified log');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the worked example imports only the public surface', () => {
  // A file that reaches past the barrel teaches adopters to reach past it. The barrel is the
  // promise; the example is the proof that the promise is enough.
  const source = readFileSync(join(ROOT, 'runtime', 'examples', 'one-complete-example.ts'), 'utf8');
  const imports = [...source.matchAll(/^import[^;]*from\s+'([^']+)'/gm)].map((m) => m[1]);
  assert.ok(imports.length > 0, 'the example imports something');
  const internal = imports.filter((spec) => spec.startsWith('../src/') && spec !== '../src/index.ts');
  assert.deepEqual(internal, [], `the example must import only the public surface, found: ${internal.join(', ')}`);
  assert.ok(imports.includes('../src/index.ts'), 'the example must import the public surface');
});
