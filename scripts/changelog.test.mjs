/**
 * changelog.test.mjs — the changelog's own claim, checked against the release tags.
 *
 *   node --test scripts/changelog.test.mjs
 *
 * **WHY THIS FILE EXISTS.** `CHANGELOG.md` opens with *"All notable changes to this project are
 * recorded here."* That is a claim, and for a long time it was false: **thirteen decision rows that
 * shipped after `v0.2.0` appeared in no release note** — including a whole new adapter package
 * (D69, the MCP server) and a security fix that doubled the revision hash and moved the log format
 * version (D70). Nine more that shipped *in* `v0.2.0` were missing from `v0.2.0`'s own notes. A
 * changelog that says it records everything and records a third of it is worse than no changelog,
 * because a reader stops looking.
 *
 * **THE BOUNDARY IS THE TAG, NOT A DATE.** This is the part that took the thinking. A decision row
 * is dated when the decision was **recorded**, and a release ships work whose decision was recorded
 * days earlier — D66 is dated 2026-10-23 and ships in `v0.2.0`, but D78 is dated the same day and
 * ships after `v0.2.0`. So a date cannot tell you what shipped in which release, and any check
 * written on dates would be wrong in both directions. **The tag can**: the rows a release carried are
 * the ones its commits cite, and a release is exactly the range between two tags.
 *
 *   v0.1.0..v0.2.0  ->  the rows that shipped in v0.2.0  ->  must be cited in [0.2.0]
 *   v0.2.0..HEAD     ->  the rows that shipped after it   ->  must be cited in [Unreleased]
 *
 * **WHAT IT DOES NOT DO.** It does not decide *whether* a decision deserves a release note — it
 * requires that the ones which shipped are visible, and the owner still writes the line. It does not
 * create a fifth gate: this file runs inside the existing **contract** gate, like every other
 * `scripts/*.test.mjs`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** The release tags, oldest first. */
export function tags() {
  const out = execFileSync('git', ['tag', '--list', 'v*', '--sort=v:refname'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return out.split('\n').filter((t) => t.trim() !== '');
}

/**
 * The commit **subjects** in a range.
 *
 * Subjects only, and that is the whole design. A subject names the work a commit *is*; a body
 * mentions rows it talks about — "D9 is still the only phase-1 signal" is a standing caveat in
 * half this repository's commit messages, and reading bodies would drag every caveat into every
 * release's notes. A mention is not a shipping.
 */
export function logText(range) {
  return execFileSync('git', ['log', '--format=%s', range], { cwd: ROOT, encoding: 'utf8' });
}

/**
 * Every decision row a piece of text mentions, with ranges expanded.
 *
 * `D71–D75` is five rows, not two: a commit that says it covers a range covers every row in it, and
 * a check that only read the endpoints would let three of them ship undocumented.
 */
export function decisionRowsIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/\bD(\d+)\s*[–-]\s*D(\d+)\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
  }
  for (const m of text.matchAll(/\bD(\d+)\b/g)) out.add(Number(m[1]));
  return out;
}

/** A changelog section, by its bracketed version: `[0.2.0]`, `[Unreleased]`. */
export function sectionFor(changelog, version) {
  const start = changelog.indexOf(`## [${version}]`);
  if (start === -1) return '';
  const rest = changelog.slice(start + 1);
  const next = rest.indexOf('\n## [');
  return next === -1 ? rest : rest.slice(0, next);
}

/** The decision rows a section of the changelog cites. */
export function rowsCited(section) {
  const out = new Set();
  for (const m of section.matchAll(/\bD(\d+)\b/g)) out.add(Number(m[1]));
  return out;
}

test('every decision row that shipped in a release is in that release\'s notes', () => {
  const changelog = read('CHANGELOG.md');
  const list = tags();
  assert.ok(list.length >= 2, `expected at least two release tags to compare, found ${list.length}`);

  for (let i = 1; i < list.length; i++) {
    const shipped = decisionRowsIn(logText(`${list[i - 1]}..${list[i]}`));
    const section = sectionFor(changelog, list[i].replace(/^v/, ''));
    assert.ok(section !== '', `CHANGELOG.md has no section for the release ${list[i]}`);
    const cited = rowsCited(section);
    const missing = [...shipped].filter((n) => !cited.has(n)).sort((a, b) => a - b);
    assert.deepEqual(
      missing,
      [],
      `these decision rows shipped in ${list[i]} but are not in its changelog section: ${missing.map((n) => `D${n}`).join(', ')}`,
    );
  }
});

test('every decision row that shipped after the newest release is in [Unreleased]', () => {
  const changelog = read('CHANGELOG.md');
  const list = tags();
  const shipped = decisionRowsIn(logText(`${list[list.length - 1]}..HEAD`));
  const section = sectionFor(changelog, 'Unreleased');
  assert.ok(section !== '', 'CHANGELOG.md has no [Unreleased] section');
  const cited = rowsCited(section);
  // A row whose *work* shipped in an earlier release but whose record landed after it is already
  // documented — D66's row was written the day after v0.2.0, and v0.2.0's notes carry it. Citing
  // it again here would be noise, so a row already in a released section is exempt.
  const documented = rowsCited(changelog.split('## [Unreleased]')[1] ?? '');
  const missing = [...shipped].filter((n) => !cited.has(n) && !documented.has(n)).sort((a, b) => a - b);
  assert.deepEqual(
    missing,
    [],
    `these decision rows shipped after ${list[list.length - 1]} but are in no changelog section: ${missing.map((n) => `D${n}`).join(', ')}`,
  );
});

test('POSITIVE CONTROL: a decision row missing from a section is caught', () => {
  // The scanner must be able to fail. A section with one row removed has to report exactly that row.
  const changelog = read('CHANGELOG.md');
  const section = sectionFor(changelog, 'Unreleased');
  const cited = rowsCited(section);
  assert.ok(cited.size > 0, 'the [Unreleased] section cites at least one decision row');

  const without = [...cited][0];
  const trimmed = section.replace(new RegExp(`\\bD${without}\\b`), `ROW${without}`);
  assert.ok(!rowsCited(trimmed).has(without), 'the row is gone from the trimmed section');
  assert.ok(rowsCited(section).has(without), 'and it was there to begin with');
});

test('POSITIVE CONTROL: a range in a commit message expands to every row it covers', () => {
  // `D71–D75` is five rows, not two — and a check that read only the endpoints would let three
  // decision rows ship undocumented.
  const rows = decisionRowsIn('Behavioural (D71–D75): the timer, the ladder, the writer, the schema, the licence');
  assert.deepEqual([...rows].sort((a, b) => a - b), [71, 72, 73, 74, 75]);
});
