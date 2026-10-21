/**
 * The four CI gates, in one place, runnable as one command.
 *
 * Why this file exists: the gate list was written out separately in CI's yaml, `CONTRIBUTING.md`,
 * the PR template, `README.md`, `AGENTS.md`, `runtime/tour.ts`'s contribution map, and a seeded
 * issue body. When the tour became a fourth gate, all seven drifted, and a human had to grep for
 * it — the same rot class D24 named for hardcoded test counts. `test/errors.test.ts` polices the
 * refusal vocabulary against the code; `scripts/gates.test.mjs` (run by gate 2 below) polices the
 * documented list against this file.
 *
 * Canonical form: every command runs from the repo root, with no `cd` and no npm. That is what the
 * docs must print verbatim, because the gate compares strings, not intentions.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const GATES = [
  {
    id: 'shape',
    title: 'Pack shape gate — does the pack obey the invariants?',
    command: 'node scripts/validate-pack.mjs packs/kopdar-ops',
  },
  {
    id: 'contract',
    title: 'Validator + gate contract tests — can the pack, or these docs, drift silently?',
    command: 'node --test scripts/*.test.mjs',
  },
  {
    id: 'semantics',
    title: 'Runtime semantics tests — do the governance rules actually hold?',
    command: 'node --test runtime/test/*.test.ts',
  },
  {
    id: 'tour',
    title: 'The tour — self-checks every guarantee the README claims, and CI fails on its exit code',
    command: 'node runtime/tour.ts',
  },
];

/**
 * Files that promise a gate list to a contributor. Not DECISIONS.md or the PRD: those are history,
 * and history is corrected by a new dated row, not by making the old sentence look like it was
 * always right (invariant #3).
 */
export const GATE_DOCS = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'runtime/tour.ts',
];

/** A phrase that claims a count the list no longer has. */
const STALE_CLAIMS = [/\bthree gates\b/i, /\ball three gates\b/i, /\bthree CI gates\b/i, /\b3 gates\b/i];

/** Every GATES command must appear verbatim. Returns the commands a doc is missing. */
export function missingGateCommands(text, gates = GATES) {
  return gates.filter((g) => !text.includes(g.command)).map((g) => g.command);
}

/** No doc may claim a gate count that drifted. Returns the offending phrases it still contains. */
export function staleGateClaims(text) {
  return STALE_CLAIMS.map((re) => (re.exec(text) ? re.exec(text)[0] : null)).filter(Boolean);
}

export function checkGateDocs(root = join(import.meta.dirname, '..')) {
  const failures = [];
  for (const rel of GATE_DOCS) {
    const text = readFileSync(join(root, rel), 'utf8');
    const missing = missingGateCommands(text);
    if (missing.length) failures.push(`${rel}: does not print ${missing.map((m) => `\`${m}\``).join(', ')}`);
    const stale = staleGateClaims(text);
    if (stale.length) failures.push(`${rel}: still says "${stale.join('", "')}" — the list is four; fix the sentence, do not delete the history row that said it`);
  }
  return failures;
}

/* -------------------------------------------------------------------------------------------
 * A second gate over the repo's own claims: do the tables render as written?
 *
 * The defect class is specific and has happened twice in this repo — an unescaped `|` inside a
 * code span. GitHub counts a pipe as a cell separator unless it is escaped, so one stray pipe
 * turns a three-cell requirement row into five and the reader sees a different sentence from the
 * one written. D36's row in `DECISIONS.md` and the **v0.8** row in the PRD's changelog both had
 * one; both were repaired without changing a word, because a rendering repair is not a decision.
 *
 * A row with FEWER cells than its header is legal — GFM pads it — so only overfull rows are
 * defects. And the scan covers every markdown file in the repository, history files included: a
 * broken table in `DECISIONS.md` or the PRD is still a broken table, even though neither file is
 * a gate list.
 * ------------------------------------------------------------------------------------------- */

/** A markdown table's cells, counted the way GFM counts them: an escaped pipe is not a separator. */
const tableCells = (line) => line.replace(/\\\|/g, '').split('|').length - 2;

/** A delimiter row: cells whose only content is hyphens, colons and pipes. */
const isDelimiterRow = (line) => /^\s*\|[\s:|-]+\|\s*$/.test(line);

/** Every table row in this text that carries more cells than its header. */
export function overfullTableRows(text) {
  const lines = text.split('\n');
  const rows = [];
  let header = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (header === null) {
      if (line.trim().startsWith('|') && isDelimiterRow(lines[i + 1] ?? '')) {
        header = tableCells(line);
        i++; // the delimiter row itself
      }
      continue;
    }
    if (!line.trim().startsWith('|')) {
      header = null;
      continue;
    }
    const count = tableCells(line);
    if (count > header) rows.push({ line: i + 1, cells: count, header });
  }
  return rows;
}

/** Every markdown file under a root, skipping `.git` and `node_modules`. */
export function markdownFiles(root, found = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) markdownFiles(path, found);
    else if (entry.name.endsWith('.md')) found.push(path);
  }
  return found;
}

/**
 * Rows that will not render as table rows: a maximal run of pipe-led lines that does not begin
 * with a header and a delimiter. Without that pair GFM has no table, and the run renders as
 * literal text — the pipes and all.
 *
 * This is not a hypothetical: `DECISIONS.md` carried a blank line between its decision rows, so on
 * github.com the register rendered as a table for D1–D18 and as raw pipe-text for every decision
 * after it — verified against the rendered page, not inferred from the spec. A blank line inside
 * a table ends the table; that is the rule, and nothing in the repo noticed.
 */
export function orphanedTableRows(text) {
  const lines = text.split('\n');
  const orphans = [];
  let inFence = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence || !line.trim().startsWith('|')) {
      i++;
      continue;
    }
    const start = i;
    while (i < lines.length && lines[i].trim().startsWith('|') && !/^\s*```/.test(lines[i])) i++;
    const run = lines.slice(start, i);
    if (!(run.length > 1 && isDelimiterRow(run[1]))) {
      orphans.push({ line: start + 1, rows: run.length });
    }
  }
  return orphans;
}

/** Run the four gates in order from the repo root. Returns a report; throws nothing. */
export function runGates({ log = console.log, cwd = join(import.meta.dirname, '..') } = {}) {
  const results = [];
  for (const gate of GATES) {
    log(`\n── ${gate.title}\n   $ ${gate.command}`);
    const r = spawnSync(gate.command, { cwd, shell: true, stdio: 'inherit' });
    const ok = r.status === 0;
    results.push({ id: gate.id, command: gate.command, ok, exit: r.status });
    log(ok ? `   PASS ${gate.id}` : `   FAIL ${gate.id} (exit ${r.status})`);
    if (!ok) break; // fail fast: a later gate cannot unbreak an earlier one, and the first failure is the one to fix
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runGates({ log: (line) => console.log(line) });
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? `${failed.length} gate failed — ${failed.map((f) => f.id).join(', ')}` : 'All four gates pass.'}`);
  // A stopped-early run is not a pass: report how many gates never got to prove anything.
  if (results.length < GATES.length && !failed.length) {
    console.log(`(and ${GATES.length - results.length} never ran)`);
  }
  process.exit(failed.length ? 1 : results.length < GATES.length ? 1 : 0);
}
