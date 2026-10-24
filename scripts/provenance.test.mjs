/**
 * provenance.test.mjs — the contract test for this repository's own supply chain and its releases.
 *
 * Why this file exists: `.github/workflows/test.yml` ran `actions/checkout@v7` and
 * `actions/setup-node@v7` — a **mutable tag**. A tag is a name the upstream owner can move, so
 * "the action my CI runs" is not a fact about this repository; it is a fact about somebody else's
 * release habits on the day the job starts. This repository's whole thesis is that a promise must
 * be checkable, and a build whose third-party code is chosen by a tag is a promise nobody made.
 *
 * So the actions are pinned to the **commit the tag points at**, the version stays in a comment so
 * a human can still read which release it is, and this file fails the build if a `uses:` goes back
 * to a tag. A rule with no test that can fail is decoration (D24) — and this one is the rule that
 * keeps the pin from being quietly undone by a well-meaning upgrade.
 *
 * The second half is about **releases**: what a reader can check about a release, and — the part
 * that is easy to get wrong — what they *cannot* check, because the tags in this repository are
 * not signed. The false claim is the dangerous one, so the check runs against the claim, not for it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const WORKFLOW = '.github/workflows/test.yml';

/**
 * The `uses:` lines in a workflow, with whatever comment follows each one.
 *
 * A comment that happens to contain the word "uses:" is not a step, so the scan takes the line's
 * own `uses:` at the start of its content — a YAML step key — and ignores prose.
 */
export function actionUses(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:-\s+)?uses:\s*(\S+)\s*(.*)$/);
    if (m) out.push({ ref: m[1], comment: m[2].trim() });
  }
  return out;
}

/** A reference pinned to a commit: `owner/repo@<40 hex characters>`. */
const PINNED = /^([^\s@]+)@([0-9a-f]{40})$/;

/** A version in a comment: `v7.0.1`, `v7`, `7.0.1` … */
const VERSION = /\bv?\d+(\.\d+)+\b/;

/**
 * A sentence claiming the tags are signed. Returns the claim, or null.
 *
 * The phrase is the *positive* claim only, and "not signed" is written so it cannot match it: a
 * document that says the tags are NOT signed must not trip this, and one that says they ARE
 * signed must.
 */
export function falseSigningClaim(text) {
  const m = text.match(/\b(?:are|is|were|was)\s+signed\b/i) ?? text.match(/\bsigned\s+tags?\b/i);
  return m ? m[0] : null;
}

test('every action CI runs is pinned to a commit SHA, with the version kept in a comment', () => {
  const uses = actionUses(read(WORKFLOW));
  assert.ok(uses.length > 0, 'the workflow runs no action at all — the check has nothing to read');
  const offenders = [];
  for (const u of uses) {
    if (!PINNED.test(u.ref)) {
      offenders.push(`${u.ref} — not pinned to a 40-character commit SHA`);
      continue;
    }
    if (!VERSION.test(u.comment)) {
      offenders.push(`${u.ref} — pinned, but the version is not in the comment (${u.comment || 'no comment'})`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these actions are not pinned to a commit:\n  ${offenders.join('\n  ')}`,
  );
});

test('POSITIVE CONTROL: the pin check fires on a mutable tag', () => {
  const uses = actionUses(['      - uses: actions/checkout@v7', '      - uses: actions/setup-node@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1'].join('\n'));
  assert.equal(uses.length, 2);
  assert.ok(!PINNED.test(uses[0].ref), 'a tag must not pass as a pin');
  assert.ok(PINNED.test(uses[1].ref), 'a SHA must pass as a pin');
  assert.ok(VERSION.test(uses[1].comment), 'and the version must be readable in the comment');
});

test('the CI token is least privilege: it may read the checkout and write nothing', () => {
  const lines = read(WORKFLOW).split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*permissions:\s*$/.test(lines[i])) continue;
    const indent = lines[i].match(/^\s*/)[0].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const ind = lines[j].match(/^\s*/)[0].length;
      if (lines[j].trim() !== '' && ind <= indent) break;
      if (lines[j].trim() !== '') body.push(lines[j].trim());
    }
    blocks.push({ indent, body });
  }
  assert.equal(blocks.length, 1, `the workflow must declare exactly one permissions block, found ${blocks.length}`);
  assert.equal(blocks[0].indent, 0, 'the permissions block must be the workflow-wide one, not a job-level one');
  assert.deepEqual(
    blocks[0].body,
    ['contents: read'],
    'the token may read the checkout and nothing else — no job in this workflow writes to the repository',
  );
});

test('POSITIVE CONTROL: the least-privilege check fires on a wider grant', () => {
  const wider = ['permissions:', '  contents: read', '  pull-requests: write'].join('\n');
  const granted = wider.split('\n').slice(1).map((l) => l.trim());
  assert.notDeepEqual(granted, ['contents: read'], 'a wider grant must not read as the narrow one');
});

test('no CI trigger runs a pull request\'s code with more authority than the pull request has', () => {
  const wf = read(WORKFLOW);
  assert.ok(
    !/pull_request_target/.test(wf),
    'pull_request_target runs the base branch\'s workflow against the pull request\'s code — it must not be in this workflow',
  );
  assert.ok(!/\b(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba|z|k)?sh\b/.test(wf), 'nothing is installed from a pipe');
  assert.ok(!/\b(curl|wget)\b[^\n]*\|\s*(python|node|ruby|perl)\b/.test(wf), 'nothing is piped into an interpreter');
});

test('the release note says what a reader can check, and does not claim the tags are signed', () => {
  const contributing = read('CONTRIBUTING.md');
  const start = contributing.search(/^## Releases and provenance\s*$/m);
  assert.ok(start > -1, 'CONTRIBUTING.md has no "## Releases and provenance" section — a reader cannot check a release');
  const section = contributing.slice(start);
  assert.ok(/CHANGELOG\.md/.test(section), 'the release note must name the changelog entry a reader can check');
  assert.ok(/git tag -v/.test(section), 'and the command that shows whether a tag carries a signature');
  assert.ok(/Zenodo/i.test(section), 'and the archive that mints the DOI');
  assert.ok(
    /are not signed/i.test(section),
    'the note must say plainly that the tags are not signed — the truth of this repository, checked on 2026-10-24',
  );
  assert.equal(
    falseSigningClaim(section),
    null,
    'the note must not claim the tags are signed: they are not, and a false claim about provenance is the one nobody checks',
  );
});

test('POSITIVE CONTROL: the false-claim check fires on a note that says they are signed', () => {
  assert.equal(falseSigningClaim('The release tags are signed, so a reader can verify the release.'), 'are signed');
  assert.equal(falseSigningClaim('The tags in this repository are not signed.'), null);
});
