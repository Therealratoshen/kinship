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
 * **WHAT THIS CHECKS.** That the **documented folders alone** are enough: copy `runtime/` and
 * `scripts/` out of this repository, put them beside a pack and the org manifest beside it — which
 * is what an adopter does — and the tour still passes **on the copy**, with no install step and
 * nothing else from this repository present.
 *
 * **WHY IT IS A TEST AND NOT A FIFTH GATE.** The gate list is four, and D24's reason for keeping it
 * four is that a list that grows is a list that drifts: every gate is printed in six places, and
 * those six places have to agree. This is a contract test about the repository's own packaging, which
 * is what gate 2 is for — it runs inside the **contract** gate, and it is a check, not a promise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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
