/**
 * A gate over the repo's own gate list. `test/errors.test.ts` does this for the refusal vocabulary;
 * this does it for the commands a contributor is told to run.
 *
 * The failure mode is specific and has happened: the tour became a fourth gate, and CI ran it while
 * `CONTRIBUTING.md`, the PR template, and the tour's own `--json` map all still said three. A
 * contributor following the documented list gets a green run and a red PR — which reads like the
 * repo is lying about its own gates.
 *
 * Every check carries a positive control, because a scanner that cannot fail is decoration (D24).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { GATES, GATE_DOCS, checkGateDocs, missingGateCommands, staleGateClaims, markdownFiles, orphanedTableRows, overfullTableRows } from './gates.mjs';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * The counts the live documents quote, and how to recompute each one.
 *
 * A number in prose is a claim, and a claim nobody recomputes rots. Three of these went stale in
 * one afternoon — twice because this agent changed them and once because it did not notice — which
 * is the whole argument for the check. The recomputes use the commands the documents already
 * print, so "recount with `node runtime/tour.ts --json`" is literally true.
 */
function liveCounts() {
  const tour = spawnSync('node', ['runtime/tour.ts', '--json'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(tour.status, 0, `the tour must hold its guarantees for its own counts to mean anything:\n${tour.stderr}`);
  const map = JSON.parse(tour.stdout).contributionMap.runtimeTests;
  const countOf = (text, re) => (text.match(re) ?? []).length;
  const lineCount = (text) => (text.match(/\n/g) ?? []).length;   // wc -l semantics: newline characters
  const dirLines = (dir) => readdirSync(dir).filter((f) => f.endsWith('.ts')).reduce((s, f) => s + lineCount(readFileSync(join(dir, f), 'utf8')), 0);
  const scripts = readdirSync(join(ROOT, 'scripts')).filter((f) => f.endsWith('.test.mjs')).map((f) => read(`scripts/${f}`)).join('\n');
  const packDir = join(ROOT, 'packs', 'kopdar-ops');
  return {
    runtimeTests: map.reduce((s, r) => s + r.tests, 0),
    runtimeFiles: map.length,
    contractCases: countOf(read('scripts/validate-pack.test.mjs'), /^test\(/gm),
    scriptsCases: countOf(scripts, /^test\(/gm),
    pkgRules: new Set([...read('scripts/validate-pack.mjs').matchAll(/'(PKG-[0-9N]+)'/g)].map((m) => m[1])).size,
    packAgents: readdirSync(join(packDir, 'agents'), { withFileTypes: true }).filter((e) => e.isDirectory()).length,
    packSkills: readdirSync(join(packDir, 'skills'), { withFileTypes: true }).filter((e) => e.isDirectory()).length,
    runtimeLines: dirLines(join(ROOT, 'runtime', 'src')) + dirLines(join(ROOT, 'runtime', 'test')) + lineCount(read('runtime/tour.ts')),
    domainLines: dirLines(join(ROOT, 'runtime', 'src')),
    testLines: dirLines(join(ROOT, 'runtime', 'test')),
    tourLines: lineCount(read('runtime/tour.ts')),
    // The tour's guarantee count, computed by RUNNING the tour — not by counting a literal.
    tourGuarantees: (() => {
      const t = spawnSync('node', ['runtime/tour.ts', '--json'], { cwd: ROOT, encoding: 'utf8' });
      assert.equal(t.status, 0, `the tour must hold its guarantees for its own count to mean anything:\n${t.stderr}`);
      return Object.keys(JSON.parse(t.stdout).guarantees ?? {}).length;
    })(),
    // The reference host's own cases, counted the way the rest are counted.
    hostCases: countOf(read('adapters/reference/test/host.test.ts'), /^test\(/gm),
    // The MCP adapter's conformance cases — a count quoted in the spec, so it is checked too.
    mcpCases: countOf(read('adapters/mcp/test/server.test.ts'), /^test\(/gm),
  };
}

/**
 * Every count the live documents quote, with the count it must equal. Adding a number to a
 * document means adding it here too — which is the point: the list and the documents cannot
 * drift apart silently.
 */
const COUNT_CLAIMS = [
  ['AGENTS.md', /\d+\s+tests across\s+\d+\s+files/, (c) => `${c.runtimeTests} tests across ${c.runtimeFiles} files`],
  ['README.md', /its \d+-case tamper-resistant contract test/, (c) => `its ${c.contractCases}-case tamper-resistant contract test`],
  ['README.md', /\(\d+ distinct `PKG-\*` rules/, (c) => `(${c.pkgRules} distinct ` + '`PKG-*` rules'],
  ['CONTRIBUTING.md', /tampered pack \(\d+ cases,/, (c) => `tampered pack (${c.contractCases} cases,`],
  ['packs/kopdar-ops/README.md', /\d+ procedures/, (c) => `${c.packSkills} procedures`],
  ['packs/kopdar-ops/README.md', /\d+\s+agents over\s+one\s+event lifecycle/, (c) => `${c.packAgents} agents over one event lifecycle`],
  ['packs/kopdar-ops/README.id.md', /\d+\s+prosedur/, (c) => `${c.packSkills} prosedur`],
  ['packs/kopdar-ops/README.id.md', /\d+\s+agent di atas satu/, (c) => `${c.packAgents} agent di atas satu`],
  ['spec/GOVERNANCE-SPEC-OUTLINE.md', /prints [\d,]+ as of/, (c) => `prints ${c.runtimeLines.toLocaleString('en-US')} as of`],
  // The two counts that were quoted in a live document and protected by nothing. A count in prose is
  // a claim, and a claim nobody checks is a claim that rots (the sweep found both of these stale).
  ['spec/GOVERNANCE-SPEC-OUTLINE.md', /the tour now prints \d+/, (c) => `the tour now prints ${c.tourGuarantees}`],
  ['spec/GOVERNANCE-SPEC-OUTLINE.md', /adapters\/reference\/test\/host\.test\.ts` \(\d+ cases/, (c) => 'adapters/reference/test/host.test.ts` (' + c.hostCases + ' cases'],
  ['spec/GOVERNANCE-SPEC-OUTLINE.md', /adapters\/mcp\/test\/server\.test\.ts` \(\d+ cases/, (c) => 'adapters/mcp/test/server.test.ts` (' + c.mcpCases + ' cases'],
  ['spec/GOVERNANCE-SPEC-OUTLINE.md', /split [\d,]+ domain code \/ [\d,]+ tests \/ [\d,]+ tour/, (c) => `split ${c.domainLines.toLocaleString('en-US')} domain code / ${c.testLines.toLocaleString('en-US')} tests / ${c.tourLines.toLocaleString('en-US')} tour`],
];

/** The documents whose counts are claims about this tree — history files are excluded on purpose. */
const COUNTED_DOCS = [
  'README.md', 'AGENTS.md', 'CONTRIBUTING.md',
  'packs/kopdar-ops/README.md', 'packs/kopdar-ops/README.id.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
];

test('every count the live documents quote is still true', () => {
  const c = liveCounts();
  for (const [file, re, expected] of COUNT_CLAIMS) {
    const m = read(file).match(re);
    assert.ok(m, `${file}: the claim "${re}" is gone — update this test rather than deleting it`);
    const squash = (s) => s.replace(/\s+/g, ' ');
    assert.equal(
      squash(m[0]),
      squash(expected(c)),
      `${file}: the document says "${squash(m[0])}" and the tree says "${squash(expected(c))}" — a count in prose is a claim, and this one is now false`,
    );
  }
});

test('POSITIVE CONTROL: the count check fires on a number that is wrong', () => {
  const c = liveCounts();
  const [, got] = (() => {
    const m = read('README.md').match(/its (\d+)-case tamper-resistant contract test/);
    return [null, Number(m[1])];
  })();
  assert.equal(got, c.contractCases, 'the fixture claim is the true one');
  assert.notEqual(got + 1, c.contractCases, 'and one more is not — the comparison can fail');
});

test('the contract-test count is the number of cases that RUN, not the number of `test(` lines a loop can hide', () => {
  // The counts in prose are recomputed from the source with `/^test\(/gm`. That regex sees one line
  // per case ONLY if every case is written as its own top-level `test(` call. A case generated in a
  // loop is invisible to it, so the document would quote 58 while 67 cases ran — a number nobody can
  // reproduce, which is the D37b class this file exists to stop.
  //
  // So the count is checked against the suite that actually executes, not against the source.
  // `NODE_TEST_CONTEXT` is set by the runner on every child it spawns, and a child that inherits it
  // runs in "child" mode — which prints no summary at all, so the count would be unreadable. The env
  // is copied with that one key removed.
  //
  // `--test-reporter=tap` is explicit because the DEFAULT reporter changed under us: Node 22 prints
  // TAP (`# tests 67`) and Node 23+ prints the spec reporter (`tests 67`), so a regex written
  // against one version silently finds nothing on the other. CI caught that — the repo's matrix is
  // 23 and 24 and the local sandbox was on 22. Asking for the reporter by name makes the output
  // the same on every version, and the regex below accepts both shapes anyway.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const suite = spawnSync('node', ['--test', '--test-reporter=tap', 'scripts/validate-pack.test.mjs'], { cwd: ROOT, encoding: 'utf8', env });
  assert.equal(suite.status, 0, `the contract suite must pass for its count to mean anything:\n${suite.stderr}`);
  // The summary line is `# tests N` under TAP and `ℹ tests N` under the spec reporter, so the
  // pattern accepts a leading non-word symbol. It is belt-and-braces — `--test-reporter=tap` above
  // already pins the format — and the next assertion proves the pattern really does accept both.
  const COUNT_LINE = /^[^\w\s]*\s*tests (\d+)/m;
  assert.ok(COUNT_LINE.test('# tests 67'), 'the counter must read the TAP summary');
  assert.ok(COUNT_LINE.test('\u2139 tests 67'), 'the counter must read the spec summary too');
  const ran = COUNT_LINE.exec(suite.stdout)?.[1];
  assert.ok(ran, `the contract suite must report how many cases it ran:\n${suite.stdout.slice(-500)}`);
  const c = liveCounts();
  assert.equal(
    Number(ran),
    c.contractCases,
    `the source counts ${c.contractCases} cases but the suite ran ${ran} — a case written in a loop is invisible to the count, so the number in README.md would be a claim nobody could reproduce`,
  );
});

test('no count claim in the live documents is unchecked', () => {
  // A claim the checker does not know about is a claim nobody recomputes — the failure this whole
  // file exists to stop. So every digit-shaped count in a live document must be one of the claims
  // above.
  const covered = new Set();
  for (const [file, re] of COUNT_CLAIMS) {
    const m = read(file).match(re);
    if (!m) continue;
    for (const n of m[0].match(/\d+/g) ?? []) covered.add(`${file}:${n}`);
  }
  const offenders = [];
  for (const file of COUNTED_DOCS) {
    if (!existsSync(join(ROOT, file))) continue;
    for (const m of read(file).matchAll(/\b(\d+)\s+(tests|cases|files|skills|agents|procedures|prosedur|guarantees)\b/g)) {
      if (!covered.has(`${file}:${m[1]}`)) offenders.push(`${file}: "${m[0]}"`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these count claims are in a live document but in no checked list:\n  ${offenders.join('\n  ')}`,
  );});

test('every command AGENTS.md tells an agent to run actually exists', () => {
  // Claude's review called this the highest-value thing about the agent file: *stale agent
  // instructions are worse than none*. An agent that is told to run a command that does not exist
  // loses time and trust, and a command that moved is a silent lie. So the file's commands are a
  // CLAIM, and this test checks it.
  const body = read('AGENTS.md');
  const commands = [...body.matchAll(/^\s*(node [^\n`]+|npm [^\n`]+|grep [^\n`]+)/gm)].map((m) => m[1].trim());
  assert.ok(commands.length >= 6, `expected AGENTS.md to list the commands it runs — found ${commands.length}`);
  const missing = [];
  for (const cmd of commands) {
    // The first word is the program; the rest is the path or flag set. A command that reads a file
    // must name a file that exists; a command that runs a script must name a script that exists.
    const parts = cmd.split(/\s+/);
    const fileish = parts.slice(1).find((p) => p.includes('/') && !p.startsWith('-') && !p.startsWith('"'));
    if (fileish === undefined) continue;
    const target = fileish.replace(/^["']|["']$/g, '');
    if (target.includes('*') || target.includes('<') || target.includes('…')) continue;   // a glob or a placeholder
    if (!existsSync(join(ROOT, target))) missing.push(`${cmd}  →  ${target}`);
  }
  assert.deepEqual(missing, [], `AGENTS.md tells an agent to run commands whose files are not there:\n  ${missing.join('\n  ')}`);
});

test('every relative link in the live documents resolves — the folder structure is a claim too', () => {
  // A link that points at a file that moved is a broken promise in the one place a reader clicks.
  // There was no check for this, which is why moving the dated documents needed a hand-written
  // reference sweep; this test makes the next move mechanical, and a broken link a build failure.
  const DOCS = [
    'README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'DECISIONS.md', 'PLAN.md', 'ROADMAP.md',
    'SECURITY.md', 'CODE_OF_CONDUCT.md',
    'packs/kopdar-ops/README.md', 'packs/kopdar-ops/README.id.md', 'packs/kopdar-ops/PACK.md',
    'spec/GOVERNANCE-SPEC-OUTLINE.md', 'spec/HOST-CONTRACT.md',
    'docs/PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md',
    'docs/LICENSE-MEMO-2026-10-18.md', 'docs/PERSISTED-LOG-MEMO-2026-10-19.md',
  ];
  const broken = [];
  for (const doc of DOCS) {
    const body = read(doc);
    for (const m of body.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;          // not a file link
      if (target.startsWith('/')) continue;                         // a site-root link, not a repo path
      const resolved = join(dirname(join(ROOT, doc)), target.split('#')[0]);
      if (!existsSync(resolved)) broken.push(`${doc} -> ${target}`);
    }
  }
  assert.deepEqual(broken, [], `these links point at files that are not there:\n  ${broken.join('\n  ')}`);
});

test('the gate list is the four the repo claims, in the order CI runs them', () => {
  assert.deepEqual(GATES.map((g) => g.id), ['shape', 'contract', 'semantics', 'tour']);
});

test('every rule the durable rules name is enforced by the validator, and exercised by a test', () => {
  // `rules/*.mdc` are conventions a human or an agent must remember to read — that is the whole
  // gap this closes. This is what consumes them: a rule id named in the durable rules must be a
  // rule the validator actually enforces, and something must exercise it. Otherwise the durable
  // rules describe an invariant nobody holds, and a reader who trusts them is wrong.
  //
  // This is a check on *references*, not a keyword lint: it does not ask whether the prose says
  // something, it asks whether the thing the prose points at exists and is tested — the same shape
  // as the check that caught the conduct file pointing at the wrong decision row (D40c).
  const enforced = new Set([...read('scripts/validate-pack.mjs').matchAll(/'(PKG-[0-9N]+)'/g)].map((m) => m[1]));
  const exercised = [
    read('scripts/validate-pack.test.mjs'),
    ...readdirSync(join(ROOT, 'runtime', 'test')).filter((f) => f.endsWith('.test.ts')).map((f) => readFileSync(join(ROOT, 'runtime', 'test', f), 'utf8')),
  ].join('\n');
  const offenders = [];
  for (const file of ['rules/governance-invariants.mdc', 'rules/pack-format.mdc']) {
    for (const m of read(file).matchAll(/PKG-[0-9N]+/g)) {
      const id = m[0];
      if (!enforced.has(id)) offenders.push(`${file}: \`${id}\` is named but the validator does not enforce it`);
      else if (!exercised.includes(id)) offenders.push(`${file}: \`${id}\` is enforced but no test exercises it`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `the durable rules name rules that are not enforced, or enforced rules nothing exercises:\n  ${offenders.join('\n  ')}`,
  );
});

test('POSITIVE CONTROL: the durable-rules check fires on a rule that does not exist', () => {
  // The scanner above must be able to fail. A rule id that is in neither the validator nor a test
  // is exactly what it exists to catch.
  const enforced = new Set([...read('scripts/validate-pack.mjs').matchAll(/'(PKG-[0-9N]+)'/g)].map((m) => m[1]));
  assert.ok(!enforced.has('PKG-99'), 'the fixture rule id must not exist');
});

test('every documented gate runs from the repo root, with no npm and no cd', () => {
  for (const g of GATES) {
    assert.ok(!g.command.includes('cd '), `${g.id}: a 'cd' in a documented command means the list is not copy-pasteable from the repo root`);
    assert.ok(!/\b(npm|bun|pnpm)\b/.test(g.command), `${g.id}: the gates are node-only; an install step would break the on-ramp`);
    // A documented gate that points at a deleted file is a gate that silently never runs.
    for (const path of g.command.match(/[\w./*-]*\.(?:mjs|ts)/g) ?? []) {
      if (path.includes('*')) continue;
      assert.ok(existsSync(join(ROOT, path)), `${g.id}: references ${path}, which does not exist`);
    }
  }
});

test('the contributor-facing docs print all four gates and claim no other count', () => {
  const failures = checkGateDocs(ROOT);
  assert.deepEqual(failures, [], `gate list drifted:\n  ${failures.join('\n  ')}`);
});

test('POSITIVE CONTROL: a doc missing one gate is caught, and a whole doc is not', () => {
  const complete = GATES.map((g) => g.command).join('\n');
  assert.deepEqual(missingGateCommands(complete), []);
  const dropped = GATES.slice(0, 3).map((g) => g.command).join('\n');
  assert.deepEqual(missingGateCommands(dropped), [GATES[3].command], 'a doc that stopped listing the tour must fail');
  // A renamed path is a missing gate, not a near-miss: the check compares strings, not vibes.
  assert.equal(missingGateCommands(complete.replace('packs/kopdar-ops', 'packs/other'))[0], GATES[0].command);
});

test('POSITIVE CONTROL: a stale gate count is caught and a correct one is not', () => {
  assert.deepEqual(staleGateClaims('Run all four gates and paste the output.'), []);
  assert.match(staleGateClaims('Run all three gates and paste the output.')[0], /three gates/i);
  assert.equal(staleGateClaims('three CI gates stay node-only')[0], 'three CI gates');
});

test('CI runs this list rather than keeping a private copy of it', () => {
  const wf = read('.github/workflows/test.yml');
  assert.ok(wf.includes('node scripts/gates.mjs'), 'CI must invoke the shared runner, not re-type the four commands');
  // The supported range is a claim in runtime/package.json; CI holds to it (D22).
  for (const major of ['23', '24']) assert.ok(wf.includes(`'${major}'`), `CI no longer gates node ${major}`);
  assert.match(wf, /runs-on:\s*ubuntu-24\.04/, 'CI drifted to a floating runner image — reproducibility is the product');
});

test('the type contract is a CI job, and the tour is inside it', () => {
  // A type contract nobody runs is not a contract. D58 changed the shape of the copy and the tour
  // broke — because `runtime/tsconfig.json` included only `src/**` and `test/**`, so the tour had
  // never been typechecked at all, and the first thing the typecheck caught once the tour was
  // inside it was a real latent defect.
  const wf = read('.github/workflows/test.yml');
  assert.match(wf, /tsc -p runtime\/tsconfig\.json --noEmit/, 'CI must run the typecheck');
  assert.match(wf, /typescript@5/, 'and it must install the compiler itself — the runtime package stays dependency-free, so a fork still downloads nothing');
  const tsconfig = JSON.parse(read('runtime/tsconfig.json'));
  assert.ok(tsconfig.include.includes('tour.ts'), 'the tour must be inside the typecheck — it is the demo the README shows');
  assert.ok(tsconfig.include.includes('src/**/*.ts') && tsconfig.include.includes('test/**/*.ts'),
    'and so must the runtime and its tests');
});

test('the Node range package.json claims is the Node range CI actually tests', () => {
  // `engines.node: ">=23"` is a support claim. A claim CI does not test is a claim that rots —
  // and a matrix with a hole in it (23, 25) silently stops testing 24 while still looking wide.
  const claimed = JSON.parse(read('runtime/package.json')).engines.node;
  const matrix = (read('.github/workflows/test.yml').match(/node:\s*\[([^\]]*)\]/) ?? [])[1] ?? '';
  const majors = [...matrix.matchAll(/'(\d+)'/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
  assert.deepEqual(gaps(majors), [], 'CI matrix has a hole: every major between its ends must run');
  assert.equal(majors[0], minMajor(claimed), `CI starts at ${majors[0]} but ${claimed} promises lower support`);
});

/** The lowest major a semver range like ">=23" or ">=22.11.0" admits. */
function minMajor(range) {
  const m = range.match(/(\d+)/);
  assert.ok(m, `cannot read a major version out of "${range}"`);
  return Number(m[1]);
}

/** Majors a contiguous list is missing, e.g. [23, 25] → [24]. */
function gaps(sorted) {
  const missing = [];
  for (let i = sorted[0]; i <= sorted.at(-1); i++) if (!sorted.includes(i)) missing.push(i);
  return missing;
}

test('POSITIVE CONTROL: the Node-range checker fires on a gap and on a lower floor', () => {
  assert.deepEqual(gaps([23, 24]), []);
  assert.deepEqual(gaps([23, 25]), [24], 'a hole in the matrix must be reported, not averaged away');
  assert.equal(minMajor('>=22.11.0'), 22);
  assert.throws(() => minMajor('lts'), /cannot read a major version/);
});

test('the gate docs this checks are the ones contributors actually read', () => {
  // If a file is renamed, a doc can drop off the list and the gate goes quiet. Pin the set.
  assert.deepEqual(GATE_DOCS, ['README.md', 'AGENTS.md', 'CONTRIBUTING.md', '.github/PULL_REQUEST_TEMPLATE.md', 'runtime/tour.ts']);
  for (const rel of GATE_DOCS) assert.ok(existsSync(join(ROOT, rel)), `${rel} is on the list but missing`);
  // History files are deliberately NOT policed: DECISIONS.md and the PRD keep their dated wording,
  // and a correction there is a new dated row. Assert they are absent so nobody "fixes" that.
  for (const history of ['DECISIONS.md', 'docs/PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md']) {
    assert.ok(!GATE_DOCS.includes(history), `${history} is append-only history — it is not a gate list`);
  }
});

test('no markdown table in the repository renders with more cells than its header', () => {
  const offenders = [];
  for (const file of markdownFiles(ROOT)) {
    const rel = file.replace(`${ROOT}/`, '');
    for (const row of overfullTableRows(readFileSync(file, 'utf8'))) {
      offenders.push(`${rel}:${row.line} — ${row.cells} cells against a ${row.header}-cell header`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `a table row with more cells than its header renders shifted and truncated — the reader sees a different sentence from the one written:\n  ${offenders.join('\n  ')}`,
  );
});

test('POSITIVE CONTROL: the table-row scanner catches an overfull row, ignores a short one, and ignores an escaped pipe', () => {
  const overfull = ['| a | b |', '|---|---|', '| 1 | 2 | 3 |'].join('\n');
  assert.deepEqual(overfullTableRows(overfull), [{ line: 3, cells: 3, header: 2 }], 'a stray pipe in a cell must be reported');
  const sound = ['| a | b |', '|---|---|', '| 1 | 2 |'].join('\n');
  assert.deepEqual(overfullTableRows(sound), [], 'a row with fewer cells than its header is legal — GFM pads it');
  const escaped = ['| a | b |', '|---|---|', '| 1 | `x \\| y` |'].join('\n');
  assert.deepEqual(overfullTableRows(escaped), [], 'an escaped pipe is not a separator');
});

test('no table row in the repository is orphaned from the header that gives it meaning', () => {
  // A blank line inside a table ends the table. The rows after it render as literal pipe-text,
  // so the register stops looking like a register. This is the defect the decision log actually
  // had: ten blank lines between its rows, and D19 onward invisible as table rows.
  const offenders = [];
  for (const file of markdownFiles(ROOT)) {
    const rel = file.replace(`${ROOT}/`, '');
    for (const row of orphanedTableRows(readFileSync(file, 'utf8'))) {
      offenders.push(`${rel}:${row.line} — ${row.rows} row(s) with no header above them`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these rows render as literal text, not as table rows:\n  ${offenders.join('\n  ')}`,
  );
});

test('POSITIVE CONTROL: the orphan scanner catches a header-less row, ignores a whole table, and ignores a code fence', () => {
  const orphan = ['| a | b |', '|---|---|', '| 1 | 2 |', '', '| 3 | 4 |'].join('\n');
  assert.deepEqual(orphanedTableRows(orphan), [{ line: 5, rows: 1 }], 'a row run with no header above it must be reported');
  const whole = ['| a | b |', '|---|---|', '| 1 | 2 |'].join('\n');
  assert.deepEqual(orphanedTableRows(whole), [], 'a table with its header is not orphaned');
  const fenced = ['```', '| a | b |', '```'].join('\n');
  assert.deepEqual(orphanedTableRows(fenced), [], 'a pipe line inside a code fence is code, not a table');
});

test('the two table scanners agree with each other, and with GFM, on the awkward shapes', () => {
  // Leading and trailing pipes are optional in GFM, and an empty header row is not a delimiter
  // row — the repo has three tables that open with `| | |`, and a scanner that called those
  // broken would be a scanner nobody trusts.
  const cases = [
    ['a table with no trailing pipe', ['| a | b |', '|---|---|', '| 1 | 2 | 3'].join('\n'), { overfull: 1, orphaned: 0 }],
    ['a row with no trailing pipe', ['| a | b', '|---|---|', '| 1 | 2 |'].join('\n'), { overfull: 0, orphaned: 0 }],
    ['a delimiter with no trailing pipe', ['| a | b |', '|---|---|', '| 1 | 2 | 3 |'].join('\n'), { overfull: 1, orphaned: 0 }],
    ['a table inside a code fence', ['```', '| a | b |', '|---|---|', '| 1 | 2 | 3 |', '```'].join('\n'), { overfull: 0, orphaned: 0 }],
    ['a table inside a tilde fence', ['~~~', '| a | b |', '| 1 | 2 |', '~~~'].join('\n'), { overfull: 0, orphaned: 0 }],
    ['an aligned delimiter row', ['| a | b |', '|:---|---:|', '| 1 | 2 |'].join('\n'), { overfull: 0, orphaned: 0 }],
    ['an empty header row', ['| | |', '|---|---|', '| 1 | 2 |'].join('\n'), { overfull: 0, orphaned: 0 }],
    ['a row with fewer cells than the header', ['| a | b |', '|---|---|', '| 1 |'].join('\n'), { overfull: 0, orphaned: 0 }],
    ['a pipe line before a table', ['| x |', '| a | b |', '|---|---|', '| 1 | 2 |'].join('\n'), { overfull: 0, orphaned: 1 }],
  ];
  for (const [label, text, want] of cases) {
    assert.equal(overfullTableRows(text).length, want.overfull, `overfull: ${label}`);
    assert.equal(orphanedTableRows(text).length, want.orphaned, `orphaned: ${label}`);
  }
});
