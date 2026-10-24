/**
 * onramp.test.mjs — the contract test for the three things that let somebody (or something) enter
 * this repository: the devcontainer, the `llms.txt` index, and the compatibility matrix.
 *
 * Why this file exists: all three are **packaging**, and packaging is where a repository's promises
 * quietly rot. A devcontainer that installs the wrong node, an index that points at a file that
 * moved, or a compatibility table that says `>=23` after the promise changed — none of these fail
 * a build, because nothing in the runtime depends on them. They fail a *reader*, months later, in
 * the worst way available: quietly, and with a confident-looking number.
 *
 * So each one is a claim, and each claim is checked against the code it describes. A number in a
 * table is a claim; the code is the only thing that can settle it (D37b's M1 question, asked again
 * of a file that did not exist when it was first asked).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const WORKFLOW = '.github/workflows/test.yml';

/** The documents `llms.txt` must point at — the set the repository decided an index needs. */
export const INDEXED = [
  'README.md',
  'spec/GOVERNANCE-SPEC-OUTLINE.md',
  'spec/HOST-CONTRACT.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'DECISIONS.md',
  'ROADMAP.md',
  'SECURITY.md',
  'SUPPORT.md',
  'packs/kopdar-ops/README.md',
  'packs/kopdar-ops/README.id.md',
];

/** The rows of a markdown table, as cells, without the header or the delimiter. */
export function tableRows(text) {
  const rows = [];
  let seenDelimiter = false;
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) { seenDelimiter = true; continue; }
    if (!seenDelimiter) continue;   // the header row
    rows.push(cells);
  }
  return rows;
}

/** The row of a table whose first cell names the thing, or null. */
export function rowFor(text, label) {
  return tableRows(text).find((cells) => cells[0].replace(/\*/g, '').toLowerCase() === label.toLowerCase()) ?? null;
}

/* ------------------------------------------------------------------ the devcontainer -------- */

test('the devcontainer gives a contributor a working environment in one click', () => {
  const cfg = JSON.parse(read('.devcontainer/devcontainer.json'));
  assert.ok(cfg.image, 'the devcontainer names the image it starts from');
  assert.ok(cfg.features, 'and the features it adds');

  // The node version the container installs must be the version the package promises. A container
  // on a different major than `engines.node` is a first-failure for everybody who opens one.
  const engines = JSON.parse(read('runtime/package.json')).engines.node;
  const promised = Number(engines.match(/(\d+)/)[1]);
  const nodeFeature = Object.entries(cfg.features).find(([id]) => /\/node\b/.test(id));
  assert.ok(nodeFeature, 'the devcontainer installs node through the node feature');
  const installed = String(nodeFeature[1].version ?? '').replace(/^lts$/i, '');
  assert.equal(Number(installed), promised, `the container installs node ${installed}, and the package promises ${engines}`);

  // The command that runs when the container is created: the two adapter installs, then the gates.
  const post = String(cfg.postCreateCommand ?? '');
  assert.match(post, /node scripts\/gates\.mjs/, 'the container runs the gates when it is created');
  assert.match(post, /--prefix adapters\/reference/, 'and installs the reference host');
  assert.match(post, /--prefix adapters\/mcp/, 'and the MCP adapter');

  // Every path the command names must be there — a command that points at a directory which moved
  // is the one-click environment failing on the first click.
  for (const m of post.matchAll(/(?:--prefix|node)\s+([\w./-]+)/g)) {
    const target = m[1];
    if (target.includes('*')) continue;
    assert.ok(existsSync(join(ROOT, target)), `the devcontainer names ${target}, which is not in the repository`);
  }
});

test('POSITIVE CONTROL: the devcontainer check fires on a container on the wrong node', () => {
  const engines = JSON.parse(read('runtime/package.json')).engines.node;
  const promised = Number(engines.match(/(\d+)/)[1]);
  const wrong = { features: { 'ghcr.io/devcontainers/features/node:1': { version: '20' } } };
  const installed = Number(String(wrong.features['ghcr.io/devcontainers/features/node:1'].version).replace(/^lts$/i, ''));
  assert.notEqual(installed, promised, 'a container on another major must not read as the promised one');
});

/* -------------------------------------------------------------------------- llms.txt -------- */

test('llms.txt indexes the documents a reader needs, and every link in it resolves', () => {
  const body = read('llms.txt');
  assert.match(body, /^# .+/m, 'llms.txt opens with an H1');

  for (const rel of INDEXED) {
    assert.ok(body.includes(rel), `llms.txt does not point at ${rel}`);
    assert.ok(existsSync(join(ROOT, rel)), `llms.txt points at ${rel}, which is not in the repository`);
  }

  // Every relative link resolves — the index is a promise about paths, and a path that moved is
  // the one thing a reader of an index cannot work around.
  const broken = [];
  for (const m of body.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    if (!existsSync(join(ROOT, target.split('#')[0]))) broken.push(target);
  }
  assert.deepEqual(broken, [], `llms.txt points at files that are not there:\n  ${broken.join('\n  ')}`);

  // A list of links, each with a one-line description: an index of bare links is a file list.
  const items = [...body.matchAll(/^- \[([^\]]+)\]\(([^)]+)\):\s*(.+)$/gm)];
  assert.ok(items.length >= INDEXED.length, `llms.txt lists ${items.length} described links, expected at least ${INDEXED.length}`);
  for (const [, title, target, description] of items) {
    assert.ok(description.trim().length > 0, `${target} has no description`);
    assert.ok(!description.includes('\n'), `${target} has a description that runs onto another line`);
  }
});

test('POSITIVE CONTROL: the index check fires on a link that does not resolve', () => {
  const body = '- [Gone](docs/NOT-THERE.md): a file that moved.';
  const broken = [...body.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .map((m) => m[1])
    .filter((t) => !/^(https?:|mailto:|#)/.test(t) && !existsSync(join(ROOT, t.split('#')[0])));
  assert.deepEqual(broken, ['docs/NOT-THERE.md'], 'a dead link must be reported');
});

/* -------------------------------------------------------------- the compatibility matrix ---- */

test('the compatibility matrix states what the code states, and a gate keeps it there', () => {
  const doc = read('docs/COMPATIBILITY.md');

  // --- node: a support promise, a CI matrix, and a technical floor are three different numbers.
  const engines = JSON.parse(read('runtime/package.json')).engines.node;
  const floor = (read('scripts/gates.mjs').match(/NODE_FLOOR = \[(\d+), (\d+)\]/) ?? []).slice(1).map(Number);
  const matrix = [...(read(WORKFLOW).match(/node:\s*\[([^\]]*)\]/) ?? [])[1].matchAll(/'(\d+)'/g)].map((m) => Number(m[1]));
  const node = rowFor(doc, 'Node');
  assert.ok(node, 'the matrix has no Node row');
  const nodeText = node.join(' ');
  assert.ok(nodeText.includes(engines), `the Node row must state the declared range (${engines})`);
  assert.ok(nodeText.includes(`${floor[0]}.${floor[1]}`), `the Node row must state the technical floor (${floor[0]}.${floor[1]})`);
  for (const major of matrix) {
    assert.ok(nodeText.includes(String(major)), `the Node row must state that CI gates node ${major}`);
  }
  // And it must not claim more than the matrix does. The promise is open-ended (`>=23`), so "CI
  // gates every major in it" was a claim about an unbounded range that CI does not test — and a
  // claim CI does not test is a claim that rots. The row says which majors CI gates, and the
  // matrix is the source of that sentence.
  assert.doesNotMatch(
    nodeText,
    /every major/i,
    'the Node row must not claim CI gates every major in an open-ended promise — name the majors it gates',
  );

  // --- the pack schema: one value, in three places, and anything else is refused.
  const packSchema = read('packs/kopdar-ops/.kinship.yaml').match(/^schema:\s*(\S+)/m)[1];
  const validatorSchema = read('scripts/validate-pack.mjs').match(/const SCHEMA = '([^']+)'/)[1];
  assert.equal(packSchema, validatorSchema, 'the pack and the validator must name the same schema');
  const schema = rowFor(doc, 'Pack schema');
  assert.ok(schema, 'the matrix has no Pack schema row');
  assert.ok(schema.join(' ').includes(packSchema), `the Pack schema row must state ${packSchema}`);

  // --- the log format: the host's own number, not a remembered one.
  const formatVersion = Number(read('adapters/reference/src/store.ts').match(/FORMAT_VERSION = (\d+)/)[1]);
  const format = rowFor(doc, 'Log format');
  assert.ok(format, 'the matrix has no Log format row');
  assert.match(format.join(' '), new RegExp(`\\b${formatVersion}\\b`), `the Log format row must state version ${formatVersion}`);

  // --- the refusal vocabulary: a closed set, so its size is a fact worth stating.
  const codes = [...read('runtime/src/errors.ts').matchAll(/^  '([a-z0-9_]+)',/gm)].map((m) => m[1]);
  const refusals = rowFor(doc, 'Refusal codes');
  assert.ok(refusals, 'the matrix has no Refusal codes row');
  const refusalText = refusals.join(' ');
  assert.match(refusalText, new RegExp(`\\b${codes.length}\\b`), `the Refusal codes row must state the size of the closed set (${codes.length})`);
  assert.match(refusalText, /closed set/i, 'and must say the set is closed');
  assert.match(refusalText, /dated/i, 'and that it grows by a dated row');
});

test('POSITIVE CONTROL: the matrix check fires on a version that is not the code\'s', () => {
  const doc = read('docs/COMPATIBILITY.md');
  const formatVersion = Number(read('adapters/reference/src/store.ts').match(/FORMAT_VERSION = (\d+)/)[1]);
  const wrong = doc.replace(new RegExp(`\\b${formatVersion}\\b`), String(formatVersion + 1));
  const row = rowFor(wrong, 'Log format');
  assert.ok(row && !row.join(' ').match(new RegExp(`\\b${formatVersion}\\b`)), 'a wrong version must not read as the right one');
});
