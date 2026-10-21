/**
 * claims.test.mjs — the contract test for the claim ceiling (PRD §2.3).
 *
 *   node --test scripts/claims.test.mjs
 *
 * Why this file exists: PRD FR-4.4 says a grep-level test rejects the banned strings "over
 * `README.md`, pack READMEs, and UI copy". For a long time the gate only swept a pack's
 * `PACK.md`, `.kinship.yaml`, `agents/**` and `skills/**` — so the two places copy actually
 * lives, the root README and the pack's own README, were never read. And the citation heuristic
 * that lets a document *name* a banned phrase in order to forbid it also let a quoted YAML scalar
 * assert one, because a double quote is a quotation in prose and a delimiter in a data file.
 *
 * Both are the defect class this repo polices: a rule whose scope reads wider than it is
 * (D33's "a code path promising a doc"), and a check that cannot fail (D24).
 *
 * The last two tests are the ones that keep this from rotting: they read PRD §2.3 and AGENTS.md
 * and assert that `scripts/claim-scan.mjs` accounts for every forbidden cell in one list or the
 * other. A ban added to the PRD and not to the code is a build failure rather than a silent gap —
 * the generated counterpart of D37b's M1 question, answered for the one list that was still prose.
 *
 * Tampering happens in a temp copy, never in the working tree.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validatePack } from './validate-pack.mjs';
import { BANNED_CLAIMS, CLAIM_RULES, normalise, scanForClaims } from './claim-scan.mjs';

const ROOT = process.cwd();
const PACK = join(ROOT, 'packs', 'kopdar-ops');
const PRD = join(ROOT, 'PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md');

/** A phrase that is banned by PRD §2.3 ("Fully autonomous 24/7 management" / "fully autonomous"). */
const PHRASE = 'fully autonomous community management';

const inCopy = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-claims-'));
  const target = join(dir, 'kopdar-ops');
  cpSync(PACK, target, { recursive: true });
  try { return fn(target); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const codes = (r) => r.errors.map((e) => e.split(' ')[0]);

/** The forbidden column of PRD §2.3's table, cell by cell, in order. */
function claimCeilingCells() {
  const text = readFileSync(PRD, 'utf8');
  const start = text.indexOf('### 2.3 The claim ceiling');
  assert.ok(start > -1, 'PRD §2.3 moved or was renamed — update this test, do not delete it');
  const end = text.indexOf('\n### ', start + 1);
  const section = text.slice(start, end === -1 ? undefined : end);
  return section
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .slice(2) // the header row and the `|---|---|` separator
    .map((l) => (l.split('|')[2] ?? '').trim())
    .filter(Boolean);
}

/** AGENTS.md invariant 3, as one paragraph — it is the second place the list is written down. */
function invariantThree() {
  const lines = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8').split('\n');
  const i = lines.findIndex((l) => l.includes('A claim may not outrun its evidence'));
  assert.ok(i > -1, 'AGENTS.md invariant 3 moved — update this test, do not delete it');
  const para = [];
  for (let j = i; j < lines.length && lines[j].trim() !== ''; j++) para.push(lines[j]);
  return para.join(' ');
}

/** The quoted spans of a cell. A cell with none is a rule, not a string. */
const quoted = (cell) => [...cell.matchAll(/"([^"]*)"/g)].map((m) => m[1]);

test("the pack's own README is swept for the claim ceiling", () =>
  inCopy((dir) => {
    const f = join(dir, 'README.md');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\n${PHRASE}.\n`);
    assert.ok(
      codes(validatePack(dir)).includes('PKG-46'),
      "FR-4.4: a pack README is copy, and copy is where the claim lands — the pack's marketing line must be gated like its instructions are",
    );
  }));

test('a double-quoted YAML value is an assertion, not a quotation', () =>
  inCopy((dir) => {
    const f = join(dir, '.kinship.yaml');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\nnotes: "${PHRASE}"\n`);
    assert.ok(
      codes(validatePack(dir)).includes('PKG-46'),
      'a quoted scalar in a data file is a value the pack declares, not a quotation — the citation rule is a prose convention and does not travel into YAML',
    );
  }));

test('a quoted phrase in prose is a citation, not an assertion', () =>
  inCopy((dir) => {
    const f = join(dir, 'README.md');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\n"${PHRASE}" is banned copy.\n`);
    assert.ok(
      !codes(validatePack(dir)).includes('PKG-46'),
      'a document may name a banned phrase in order to forbid it — the pack README and PACK.md do exactly that, and the gate has to let them',
    );
  }));

test('the copy this repo ships asserts no banned claim', () => {
  for (const rel of ['README.md', 'packs/kopdar-ops/README.md', 'packs/kopdar-ops/PACK.md']) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    assert.deepEqual(
      scanForClaims(text, { prose: true }),
      [],
      `${rel} asserts a claim the ceiling forbids — the pitch is the copy the rule was written for`,
    );
  }
});

test('every banned string traces to a line in PRD §2.3 or AGENTS.md invariant 3', () => {
  const source = normalise([...claimCeilingCells(), invariantThree()].join(' '));
  for (const claim of BANNED_CLAIMS) {
    assert.ok(
      claim.traces.some((t) => source.includes(normalise(t))),
      `\`${claim.phrase}\` (${claim.source}) is in the code but in neither PRD §2.3 nor AGENTS.md invariant 3 — a ban no document states is a rule nobody can follow`,
    );
  }
});

test('every forbidden cell in PRD §2.3 is enforced, or named as a rule no sweep can enforce', () => {
  const cells = claimCeilingCells();
  assert.ok(cells.length >= 5, 'the claim ceiling table lost rows — update this test, do not delete it');
  for (const cell of cells) {
    const spans = quoted(cell);
    if (spans.length) {
      for (const span of spans) {
        const n = normalise(span);
        assert.ok(
          BANNED_CLAIMS.some((c) => c.traces.some((t) => n.includes(normalise(t)))),
          `PRD §2.3 forbids "${span}" and no entry in scripts/claim-scan.mjs catches it — a ban in the PRD the gate does not know is a gap, not a ceiling`,
        );
      }
    } else {
      assert.ok(
        CLAIM_RULES.some((r) => normalise(cell).includes(normalise(r.phrase))),
        `PRD §2.3 states "${cell}" as a rule rather than a string, and scripts/claim-scan.mjs does not name it — a rule no sweep can enforce still has to be written down somewhere`,
      );
    }
  }
});
