/**
 * license.test.mjs — every licence claim in this repository agrees with the licence it ships.
 *
 * **WHY THIS FILE EXISTS.** D72 changed the licence from MIT to Apache-2.0 and named the files
 * that would follow it: the manifests, `PACK.md`, the README's badge. It did not name the ones
 * that would not, and four of them still said the pre-D72 world:
 *
 * - `CITATION.cff` — the file GitHub renders as "Cite this repository", and the one Zotero and ADS
 *   read. It said `MIT`.
 * - `runtime/tour.ts` — the machine-readable map an agent reads first, and the artefact the README
 *   points at. It said `MIT`, hardcoded.
 * - `packs/kopdar-ops/PACK.md` note 6 — prose that still called the licence "a *proposal*".
 * - `scripts/validate-pack.mjs` `PKG-N1` — **the worst one, because it was the gate.** It printed
 *   `bundled license is 'Apache-2.0'; PRD section 12-Q4 is still the owner's call — do not copy
 *   this field into a public README yet` on **every run**, a day after the question was closed.
 *   The enforcement layer was telling readers the licence was undecided, in the one place a reader
 *   would believe it.
 *
 * **WHY NOTHING CAUGHT IT.** No gate read the `LICENSE` file. The repository has a gate over its
 * gate list, a gate over its quoted counts, a gate over the rules its own durable files name — and
 * the legal artefact, the one every other artefact quotes, was the only claim nobody checked. A
 * claim that nothing can fail on is a claim that rots; this is the check that makes the licence a
 * fact instead of a sentence.
 *
 * **THE SHAPE.** The canonical licence is read from the `LICENSE` file — the legal artefact, not a
 * manifest that could be edited to agree with itself. Every other claim is held against it. A
 * disagreement is a failure, and a `LICENSE` file this check cannot recognise is a failure too: a
 * checker that silently accepts what it does not understand is worse than no checker.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { validatePack } from './validate-pack.mjs';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : null);

/** The licence the `LICENSE` file states, recognised from its own text. */
export function canonicalLicence(text) {
  if (/Licensed under the Apache License, Version 2\.0/.test(text)) return 'Apache-2.0';
  if (/Permission is hereby granted, free of charge/.test(text)) return 'MIT';
  return null;
}

/** The frontmatter block of a pack's `PACK.md` — the file starts and ends it with `---`. */
function frontmatter(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return '';
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  return end === -1 ? '' : lines.slice(1, end).join('\n');
}

/**
 * Every licence this repository claims, and where it claims it.
 *
 * A missing file is not a claim, so a vendored pack-only checkout yields fewer claims rather than
 * a failure — the same rule the validator's `PKG-N1` uses.
 */
export function claimsIn(root) {
  const out = [];
  const push = (file, claimed) => {
    if (typeof claimed === 'string' && claimed.trim()) out.push({ file, claimed: claimed.trim() });
  };

  const cff = existsSync(join(root, 'CITATION.cff')) ? readFileSync(join(root, 'CITATION.cff'), 'utf8') : null;
  if (cff) push('CITATION.cff', /^\s*license:\s*(\S+)\s*$/m.exec(cff)?.[1]);

  for (const file of ['runtime/package.json', 'adapters/reference/package.json', 'adapters/mcp/package.json']) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    try {
      push(file, JSON.parse(readFileSync(path, 'utf8')).license);
    } catch {
      push(file, '(unparseable manifest)');
    }
  }

  const packPath = join(root, 'packs', 'kopdar-ops', 'PACK.md');
  if (existsSync(packPath)) {
    push('packs/kopdar-ops/PACK.md', /^license:\s*(\S+)/m.exec(frontmatter(readFileSync(packPath, 'utf8')))?.[1]);
  }

  return out;
}

/** The licence the tour's machine-readable map reports. */
export function tourLicence(root) {
  const out = execFileSync('node', [join(root, 'runtime', 'tour.ts'), '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(out)?.meta?.license;
}

test('the LICENSE file states a licence this check recognises', () => {
  const licence = read('LICENSE');
  assert.ok(licence, 'LICENSE exists');
  assert.notEqual(
    canonicalLicence(licence),
    null,
    'the LICENSE file states a licence this check does not recognise — teach it, do not let it pass silently',
  );
});

test('every licence claim in the repository agrees with the LICENSE file', () => {
  const canonical = canonicalLicence(read('LICENSE'));
  const claims = claimsIn(ROOT);
  assert.ok(claims.length >= 5, `expected the repository to make several licence claims, found ${claims.length}`);
  const stale = claims.filter((c) => c.claimed !== canonical).map((c) => `${c.file} says ${c.claimed}`);
  assert.deepEqual(
    stale,
    [],
    `these claims disagree with the LICENSE file (${canonical}):\n  ${stale.join('\n  ')}`,
  );
});

/**
 * What stands between this repository and a machine-readable licence, if anything does.
 *
 * Returns a description of the problem, or `null` when the file is the licence and nothing else.
 */
export function preambleOffence(text, notice = '') {
  const lines = text.split('\n');
  const first = lines.findIndex((l) => l.trim() !== '');
  if (first === -1) return 'LICENSE is empty';
  if (lines[first].trim() !== 'Apache License') {
    return `the first line of LICENSE is \`${lines[first].trim()}\`, not the licence header`;
  }
  if (/\[yyyy\]|\[name of copyright owner\]/.test(text)) {
    return "the appendix's copyright slot is unfilled — the licence is a template, not a grant";
  }
  if (!/Copyright 2026 Filbert Henrico/.test(notice)) {
    return 'the copyright holder is in neither the appendix nor NOTICE';
  }
  return null;
}

test('the LICENSE file is the licence itself, with nothing standing in front of it', () => {
  // GitHub decides what licence this repository ships by comparing the file to the canonical text.
  // A copyright block or a separator in front of it drops the match under the detector's threshold
  // and the repository is published as NOASSERTION / "Other" — no licence chip, no licence filter,
  // and a project whose thesis is *don't trust prose, trust the check* with its own licence
  // unverifiable by machine (D84). This is the check that stops the preamble coming back.
  assert.equal(preambleOffence(read('LICENSE'), read('NOTICE') ?? ''), null);
});

test('POSITIVE CONTROL: a preamble in front of the licence is caught', () => {
  // The defect this exists for: a copyright block and a dashed separator in front of the licence
  // text, which is what made GitHub publish this repository as NOASSERTION / "Other".
  const withPreamble = 'Copyright 2026 Filbert Henrico\n\nLicensed under the Apache License, Version 2.0\n\n' + read('LICENSE');
  assert.match(preambleOffence(withPreamble, read('NOTICE') ?? ''), /first line of LICENSE/);
  // And the template's unfilled slot is caught too.
  assert.match(preambleOffence(read('LICENSE').replace('Copyright 2026 Filbert Henrico', 'Copyright [yyyy] [name of copyright owner]'), read('NOTICE') ?? ''), /slot is unfilled/);
  // And a file that loses its attribution entirely is caught.
  assert.match(preambleOffence(read('LICENSE'), ''), /neither the appendix nor NOTICE/);
  // The fixed file passes all three.
  assert.equal(preambleOffence(read('LICENSE'), read('NOTICE') ?? ''), null);
});

test('the tour reports the shipped licence, and reads it rather than typing it in', () => {
  const canonical = canonicalLicence(read('LICENSE'));
  assert.equal(tourLicence(ROOT), canonical, 'the tour\'s machine-readable map must report the shipped licence');
  // The claim is *read*, not typed: a hardcoded string in the source is what shipped `MIT` after D72.
  const source = read('runtime/tour.ts');
  assert.doesNotMatch(
    source,
    /license:\s*['"][A-Za-z0-9.-]+['"]/,
    'the tour types a licence in as a literal — read it from the manifest instead (D83)',
  );
});

test('the validator does not claim the licence is still undecided', () => {
  // The bug this file exists for: PKG-N1 printed "Q4 is still the owner's call" on every run.
  const result = validatePack(join(ROOT, 'packs', 'kopdar-ops'), { orgsRoot: join(ROOT, 'orgs') });
  const stale = [...result.errors, ...result.notices].filter((m) => /still the owner's call|Q4 is still/i.test(m));
  assert.deepEqual(stale, [], `the validator still describes the licence as undecided:\n  ${stale.join('\n  ')}`);
  assert.ok(
    result.ok,
    `the bundled pack must validate against the repository's own licence:\n  ${result.errors.join('\n  ')}`,
  );
});

test('POSITIVE CONTROL: a stale claim is caught, and a corrected one is not', () => {
  // The checker must be able to fail. A claim that drifts back to MIT in one file has to be caught,
  // and the same check must pass once it is corrected — a rule that fails on everything proves nothing.
  const tmp = mkdtempSync(join(tmpdir(), 'kinship-licence-'));
  try {
    for (const file of ['CITATION.cff', 'runtime/package.json', 'packs/kopdar-ops/PACK.md']) {
      const dest = join(tmp, file);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(join(ROOT, file), dest);
    }
    const canonical = canonicalLicence(read('LICENSE'));
    const before = claimsIn(tmp).filter((c) => c.claimed !== canonical);
    assert.deepEqual(before, [], 'the copied claims start in agreement');

    const cffPath = join(tmp, 'CITATION.cff');
    writeFileSync(cffPath, readFileSync(cffPath, 'utf8').replace(/^license:.*$/m, 'license: MIT'));
    const after = claimsIn(tmp).filter((c) => c.claimed !== canonical);
    assert.equal(after.length, 1, 'exactly the mutated claim is out of step');
    assert.equal(after[0].file, 'CITATION.cff');

    writeFileSync(cffPath, readFileSync(cffPath, 'utf8').replace(/^license:.*$/m, `license: ${canonical}`));
    assert.deepEqual(claimsIn(tmp).filter((c) => c.claimed !== canonical), [], 'correcting it makes the check pass again');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('POSITIVE CONTROL: a bundled pack that declares the wrong licence is refused', () => {
  // The rule has to refuse, not warn. A notice is printed and scrolls past; an error stops the build.
  const result = validatePack(join(ROOT, 'packs', 'kopdar-ops'), {
    orgsRoot: join(ROOT, 'orgs'),
    repoLicense: 'MIT',
  });
  assert.equal(result.ok, false, 'a bundled pack declaring a different licence must not pass');
  assert.ok(
    result.errors.some((e) => e.includes('PKG-N1')),
    `the refusal must name the rule:\n  ${result.errors.join('\n  ')}`,
  );
});

test('POSITIVE CONTROL: a licence this check does not recognise is a failure, not a pass', () => {
  assert.equal(canonicalLicence('Some other licence entirely.'), null);
});
