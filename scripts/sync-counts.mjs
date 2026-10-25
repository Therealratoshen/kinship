#!/usr/bin/env node
/**
 * `sync-counts.mjs` — write the derived numbers into the documents, so nobody has to remember them.
 *
 * **THE PROBLEM THIS SOLVES.** The repository quotes its own test counts, its file counts, its line
 * count and its tour guarantees in prose, in more than one document. Those are **derived facts**:
 * they are not written by a human, they are *computed from the tree*. So quoting them by hand creates
 * a defect class that has no reason to exist — and it has happened repeatedly: the count gate caught
 * three stale numbers the day the checker landed, and it has caught another on nearly every increment
 * since. **A checker reports the symptom; a generator removes it.**
 *
 * **WHAT IT DOES.** It computes the numbers and **rewrites the claims in place**, in the documents
 * that quote them. Run it after any change that moves a count:
 *
 *     node scripts/sync-counts.mjs
 *
 * **WHAT IT DELIBERATELY DOES NOT DO.**
 * - It does not touch the **dated decision rows**. Those are history: a row that said "390 tests"
 *   on 2026-10-24 said 390 tests on 2026-10-24, and rewriting it would be rewriting history —
 *   which is the one thing this repository refuses to do.
 * - It does not touch **prose**. Only the numbers move. A sentence that is wrong is a writing
 *   problem, not a counting problem.
 * - It does not decide **whether a claim should exist**. If a document stops quoting a count, the
 *   generator does not put it back; that is an editing decision.
 *
 * **AND THE GATE STILL CHECKS.** `scripts/gates.test.mjs` asserts that the documents match what
 * this script produces. So the generator is the single source of truth, and the gate is what proves
 * nobody edited a number by hand. Two layers, but the second one cannot drift, because it is the
 * first one.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = join(import.meta.dirname, '..');

/** Count the top-level `test(` cases in a file — the same shape the count gate uses. */
function casesIn(file) {
  // A file that does not exist in this tree counts as zero: a split branch may predate it, and the
  // claim about it is not in that branch's documents either.
  try {
    return (readFileSync(file, 'utf8').match(/^test\(/gm) ?? []).length;
  } catch {
    return 0;
  }
}

/** Newline count, `wc -l` semantics. */
const lines = (text) => text.split('\n').length - 1;

/** Every `.ts` file directly in a directory, summed by newline count. */
function dirLines(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .reduce((sum, f) => sum + lines(readFileSync(join(dir, f), 'utf8')), 0);
}

function tourGuarantees() {
  const out = execFileSync('node', [join(ROOT, 'runtime', 'tour.ts'), '--json'], { cwd: ROOT, encoding: 'utf8' });
  return Object.keys(JSON.parse(out).guarantees ?? {}).length;
}

export function computeCounts() {
  const runtimeTests = readdirSync(join(ROOT, 'runtime', 'test'))
    .filter((f) => f.endsWith('.test.ts'))
    .reduce((sum, f) => sum + casesIn(join(ROOT, 'runtime', 'test', f)), 0);
  const runtimeFiles = readdirSync(join(ROOT, 'runtime', 'test')).filter((f) => f.endsWith('.test.ts')).length;
  const scriptsCases = readdirSync(join(ROOT, 'scripts'))
    .filter((f) => f.endsWith('.test.mjs'))
    .reduce((sum, f) => sum + casesIn(join(ROOT, 'scripts', f)), 0);
  const domain = dirLines(join(ROOT, 'runtime', 'src'));
  const tests = dirLines(join(ROOT, 'runtime', 'test'));
  const tour = lines(readFileSync(join(ROOT, 'runtime', 'tour.ts'), 'utf8'));
  // The distinct validator rule ids — the pattern is the one the README's own "recount" command
  // prints, so the instruction stays literally true.
  const pkgRules = new Set(
    [...readFileSync(join(ROOT, 'scripts', 'validate-pack.mjs'), 'utf8').matchAll(/'(PKG-[0-9N]*)'/g)].map((m) => m[1]),
  ).size;
  return {
    runtimeTests,
    runtimeFiles,
    scriptsCases,
    // The validator's own contract test — the "tamper-resistant contract test" the README and
    // CONTRIBUTING both quote. It was a number two documents carried and NOTHING recomputed, so a
    // validator rule added anywhere in this repository meant hand-editing prose in two files — the
    // exact defect class this repository keeps recording. It is generated now.
    contractCases: casesIn(join(ROOT, 'scripts', 'validate-pack.test.mjs')),
    pkgRules,
    hostCases: casesIn(join(ROOT, 'adapters', 'reference', 'test', 'host.test.ts')),
    mcpCases: casesIn(join(ROOT, 'adapters', 'mcp', 'test', 'server.test.ts')),
    tourGuarantees: tourGuarantees(),
    runtimeLines: domain + tests + tour,
    domainLines: domain,
    testLines: tests,
    tourLines: tour,
  };
}

/** The documents that quote a derived number, and how each number is written in them. */
const CLAIMS = [
  {
    file: 'AGENTS.md',
    apply: (s, c) => s.replace(
      /\(\d+ tests across \d+ files as of [\d-]+/,
      `(${c.runtimeTests} tests across ${c.runtimeFiles} files as of ${today()}`,
    ),
  },
  {
    file: 'README.md',
    apply: (s, c) => s
      .replace(
        /\(\d+ distinct `PKG-\*` rules/,
        `(${c.pkgRules} distinct ` + '`PKG-*` rules',
      )
      .replace(
        /its \d+-case tamper-resistant contract test/,
        `its ${c.contractCases}-case tamper-resistant contract test`,
      ),
  },
  {
    file: 'CONTRIBUTING.md',
    apply: (s, c) => s.replace(
      /tampered pack \(\d+ cases,/,
      `tampered pack (${c.contractCases} cases,`,
    ),
  },
  {
    file: 'adapters/mcp/README.md',
    apply: (s, c) => s.replace(
      /\*\*\d+ conformance tests\*\*/,
      `**${c.mcpCases} conformance tests**`,
    ),
  },
  {
    file: 'spec/GOVERNANCE-SPEC-OUTLINE.md',
    apply: (s, c) => s
      .replace(/prints [\d,]+ as of/, `prints ${c.runtimeLines.toLocaleString('en-US')} as of`)
      .replace(
        /split [\d,]+ domain code \/ [\d,]+ tests \/ [\d,]+ tour/,
        `split ${c.domainLines.toLocaleString('en-US')} domain code / ${c.testLines.toLocaleString('en-US')} tests / ${c.tourLines.toLocaleString('en-US')} tour`,
      )
      .replace(/The gate suite itself is \*\*\d+ cases\*\*/, `The gate suite itself is **${c.scriptsCases} cases**`)
      .replace(/`adapters\/reference\/test\/host\.test\.ts` \(\d+ cases/, `\`adapters/reference/test/host.test.ts\` (${c.hostCases} cases`)
      .replace(/`adapters\/mcp\/test\/server\.test\.ts` \(\d+ cases/, `\`adapters/mcp/test/server.test.ts\` (${c.mcpCases} cases`),
  },
];

function today() {
  // The date a claim is *dated*, not the date it is written: the last time the number moved. Hmm —
  // simpler and more honest: today. The claim says when the tree was counted.
  return new Date().toISOString().slice(0, 10);
}

/** Write the numbers. Returns the files it changed. */
export function syncCounts(root = ROOT) {
  const c = computeCounts();
  const changed = [];
  for (const claim of CLAIMS) {
    const path = join(root, claim.file);
    const before = readFileSync(path, 'utf8');
    const after = claim.apply(before, c);
    if (after !== before) {
      writeFileSync(path, after);
      changed.push(claim.file);
    }
  }
  return { counts: c, changed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { counts, changed } = syncCounts();
  console.log('counts:');
  console.log(`  runtime ${counts.runtimeTests} tests across ${counts.runtimeFiles} files`);
  console.log(`  scripts ${counts.scriptsCases} cases · host ${counts.hostCases} · mcp ${counts.mcpCases} · tour ${counts.tourGuarantees}`);
  console.log(`  runtime ${counts.runtimeLines} lines (${counts.domainLines} domain / ${counts.testLines} tests / ${counts.tourLines} tour)`);
  console.log(changed.length > 0 ? `written: ${changed.join(', ')}` : 'no claim needed moving');
}
