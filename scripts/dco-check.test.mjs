/**
 * dco-check.test.mjs — the DCO sign-off check can fail.
 *
 *   node --test scripts/dco-check.test.mjs
 *
 * **WHY THIS FILE EXISTS.** `scripts/dco-check.mjs` runs in CI on every pull request, and until now
 * **nothing tested it**. That is the defect class this repository polices most often: a rule that
 * lives in one call site is a rule about that call site, and a check that cannot fail is worse than no
 * check — because a check that always passes is a green tick that means nothing. A DCO gate that has
 * never been seen to refuse a contribution is a gate nobody can trust.
 *
 * **HOW IT IS TESTED.** The check is a CLI over a range of commits, so the test builds a real git
 * repository in a temp directory, makes real commits, and runs the real script against it. Nothing is
 * mocked, because the thing being tested *is* the git interaction — the commit trailers, the author
 * email, the range.
 *
 * **THE THREE CASES THAT MATTER.**
 * 1. A commit from outside the maintainer with no sign-off is **refused**, and the refusal says how
 *    to fix it.
 * 2. The same commit with a sign-off **passes**.
 * 3. The maintainer's own commit needs no sign-off — the ritual cannot inform the one person it
 *    cannot be about, and an exemption that is not tested is an exemption nobody has checked.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'dco-check.mjs');
const MAINTAINER = 'filborthen@gmail.com';

/** A throwaway git repository with one commit, made by `email`, optionally signed off. */
function repoWithCommit(email, { signoff = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-dco-'));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Test', '-c', `user.email=${email}`, ...args], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', email);
  writeFileSync(join(dir, 'README.md'), '# fixture\n');
  git('add', 'README.md');
  const args = ['commit', '-q', '-m', 'a contribution'];
  if (signoff) args.push('-s');
  git(...args);
  return dir;
}

/** Run the real check against a range, and return its exit code and output. */
function runCheck(dir, range = 'HEAD') {
  const out = spawnSync('node', [SCRIPT, '--repo', dir, range], { encoding: 'utf8' });
  return { code: out.status, stdout: out.stdout ?? '', stderr: out.stderr ?? '' };
}

test('a commit from outside the maintainer with no sign-off is refused', () => {
  const dir = repoWithCommit('stranger@example.com');
  try {
    const r = runCheck(dir);
    assert.equal(r.code, 1, 'an unsigned outside contribution must fail the check');
    assert.match(r.stderr, /carry no DCO sign-off/, 'the refusal must say what is wrong');
    assert.match(r.stderr, /git commit --amend -s/, 'the refusal must say how to fix it');
    assert.match(r.stderr, /stranger@example\.com/, 'the refusal must name the author');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the same commit with a sign-off passes', () => {
  const dir = repoWithCommit('stranger@example.com', { signoff: true });
  try {
    const r = runCheck(dir);
    assert.equal(r.code, 0, `a signed-off contribution must pass:\n${r.stderr}`);
    assert.match(r.stdout, /signed off/, 'and the check must say so');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the maintainer's own commit needs no sign-off", () => {
  // The exemption is the design, not a loophole: the maintainer is the copyright holder and signing
  // off their own work proves nothing. But an exemption nobody has tested is an exemption nobody has
  // checked, so it is tested here.
  const dir = repoWithCommit(MAINTAINER);
  try {
    const r = runCheck(dir);
    assert.equal(r.code, 0, `the maintainer's own commit must be exempt:\n${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('POSITIVE CONTROL: the check refuses a range with an unsigned commit and passes a signed one', () => {
  // Both halves in one fixture, so the check is seen to *discriminate* rather than to pass or fail
  // everything it is given.
  const dir = mkdtempSync(join(tmpdir(), 'kinship-dco-both-'));
  try {
    const git = (...args) => execFileSync('git', ['-c', 'user.name=Test', ...args], { cwd: dir, encoding: 'utf8' });
    git('init', '-q', '-b', 'main');
    writeFileSync(join(dir, 'a.txt'), 'a\n');
    git('-c', 'user.email=maintainer@example.com', 'add', 'a.txt');
    git('-c', 'user.email=maintainer@example.com', 'commit', '-q', '-m', 'first');
    writeFileSync(join(dir, 'b.txt'), 'b\n');
    git('-c', 'user.email=stranger@example.com', 'add', 'b.txt');
    git('-c', 'user.email=stranger@example.com', 'commit', '-q', '-m', 'second');
    writeFileSync(join(dir, 'c.txt'), 'c\n');
    git('-c', 'user.email=stranger@example.com', 'add', 'c.txt');
    git('-c', 'user.email=stranger@example.com', 'commit', '-q', '-s', '-m', 'third');

    const both = runCheck(dir, 'HEAD~2..HEAD');
    assert.equal(both.code, 1, 'the unsigned commit in the range must fail it');
    assert.match(both.stderr, /stranger@example\.com/);

    const onlySigned = runCheck(dir, 'HEAD~1..HEAD');
    assert.equal(onlySigned.code, 0, `the signed commit alone must pass:\n${onlySigned.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
