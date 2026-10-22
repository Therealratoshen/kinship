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

/**
 * AGENTS.md invariant 3's forbidden list, item by item. This is the half of the drift check the
 * PRD-only version missed: three of the bans — hours-saved, TAM, community size — are written
 * only here, so a list that kept them in step with §2.3 could still have lost them without a
 * single test failing.
 */
function invariantThreeItems() {
  const para = invariantThree();
  // The list is indented and hard-wrapped in AGENTS.md, so the marker does not sit on one line —
  // and the list ends at the first sentence end, which is the price rule.
  const match = para.match(/Forbidden in\s+any copy:\s*(.*?\.)\s/);
  assert.ok(match, 'AGENTS.md invariant 3 no longer lists what is forbidden — update this test');
  return match[1]
    .split(',')
    .map((s) => s.replace(/^\s*and\s+/, '').replace(/\s+/g, ' ').trim().replace(/^"|"$/g, '').replace(/\.$/, ''))
    .filter(Boolean);
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

test('a quotation may not reach across a paragraph to hide a claim', () =>
  inCopy((dir) => {
    const f = join(dir, 'README.md');
    writeFileSync(f, `He said "look at this\n\nWe offer ${PHRASE} to every member.\n\nThen "left".\n`);
    assert.ok(
      codes(validatePack(dir)).includes('PKG-46'),
      'a span that crosses a paragraph break hides every paragraph between two quotes — including a claim, and including text the author never quoted',
    );
  }));

test('a stray quotation mark cannot open a span and hide the rest of the paragraph', () =>
  inCopy((dir) => {
    const f = join(dir, 'README.md');
    writeFileSync(f, `The cap is 5" wide. We offer ${PHRASE}. The "spec" says so.\n`);
    assert.ok(
      codes(validatePack(dir)).includes('PKG-46'),
      'an opening quote must follow whitespace or an opening bracket, or a stray measurement mark is a way to say anything without saying it',
    );
  }));

test('a citation that wraps inside one paragraph is still a citation', () =>
  inCopy((dir) => {
    const f = join(dir, 'README.md');
    writeFileSync(f, `per **D16**, "we run your\nevents / we send your reminders" is banned copy.\n`);
    assert.ok(
      !codes(validatePack(dir)).includes('PKG-46'),
      "the pack's own PACK.md wraps its citation across two lines — a span confined to one paragraph must still read as a citation, or the rule would fire on the repo's own text",
    );
  }));

test('a phrase split across a hard-wrapped line is still the phrase', () =>
  inCopy((dir) => {
    const f = join(dir, 'README.md');
    writeFileSync(f, `We offer replace your community\nmanager to every member.\n`);
    assert.ok(
      codes(validatePack(dir)).includes('PKG-46'),
      'a paragraph the author merely re-wrapped must not be a way to ship the claim — a word break may fall on a hyphen or any run of whitespace',
    );
  }));

test('every banned string has a pattern that can actually fire', () => {
  for (const claim of BANNED_CLAIMS) {
    assert.ok(
      claim.re.test(claim.phrase),
      `\`${claim.phrase}\` (${claim.source}) carries a pattern that cannot match its own phrase — a ban nothing enforces is decoration, and the repo has a name for that class`,
    );
  }
});

test('every ban AGENTS.md states is in the list, not only the ones PRD §2.3 states', () => {
  const items = invariantThreeItems();
  assert.ok(items.length >= 4, 'AGENTS.md invariant 3 lost items — update this test, do not delete it');
  for (const item of items) {
    const n = normalise(item);
    const enforced = BANNED_CLAIMS.some((c) => c.traces.some((t) => n.includes(normalise(t))));
    const named = CLAIM_RULES.some((r) => n.includes(normalise(r.phrase)) || normalise(r.phrase).includes(n));
    assert.ok(
      enforced || named,
      `AGENTS.md invariant 3 forbids "${item}" and nothing in scripts/claim-scan.mjs catches it — deleting an entry has to fail the build, not pass it quietly`,
    );
  }
});

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
  const tracesDirectly = (claim) => claim.traces.some((t) => source.includes(normalise(t)));
  for (const claim of BANNED_CLAIMS) {
    if (tracesDirectly(claim)) continue;
    // An Indonesian entry traces through its English source, and that source must itself trace —
    // so a translation can never be the root of the list.
    const wanted = claim.translationOf;
    const parent = wanted === undefined
      ? undefined
      : BANNED_CLAIMS.find((c) => c.traces.some((t) => normalise(t) === normalise(wanted)));
    assert.ok(
      parent !== undefined && tracesDirectly(parent),
      `\`${claim.phrase}\` (${claim.source}) is in the code but in neither PRD §2.3 nor AGENTS.md invariant 3 — a ban no document states is a rule nobody can follow`,
    );
  }
});

test('the ceiling reaches the copy in the other language too', () => {
  // The copy this rule governs is bilingual, so a list of English strings alone would leave a
  // translation free to assert exactly what the ceiling forbids — in the other language.
  const indonesian = 'Kami menawarkan layanan yang sepenuhnya otonom untuk komunitas Anda.';
  const hits = scanForClaims(indonesian, { prose: true });
  assert.ok(hits.length > 0, 'a claim asserted in Indonesian is the same claim');
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
