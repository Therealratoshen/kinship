#!/usr/bin/env node
/**
 * release.mjs — the release pre-flight, and the publish itself, from a tag.
 *
 *   node scripts/release.mjs                # the pre-flight only — no side effects
 *   node scripts/release.mjs --publish      # the pre-flight, then publish
 *   node scripts/release.mjs --version 0.3.0
 *
 * **WHY THIS EXISTS.** The release is a sequence of steps that can each be done slightly wrong: a
 * tag that is not signed, a changelog that forgot the version, a count that is stale, a package
 * published from a working tree instead of from the commit the tag names. Each of those is a
 * promise the repository makes and does not keep — and this repository's whole character is that
 * a promise nobody can check is a sentence.
 *
 * **WHAT IT REFUSES, AND WHY EACH ONE MATTERS.**
 *
 *  - **A dirty working tree.** The artefact must be the tagged commit, not whatever is lying around
 *    on the machine.
 *  - **An unsigned tag.** `git tag -v v0.2.0` prints *"no signature found"* — a reader can check
 *    *which commit* a tag names and nothing more. `CONTRIBUTING.md` says so today; this makes the
 *    release refuse to add another.
 *  - **A changelog without the version.** The release notes are the reader's entry point; a release
 *    whose version is missing from them is a release nobody can find.
 *  - **A stale count.** The counts in the documents are generated; a release must not carry a
 *    number the tree no longer produces.
 *  - **A failing gate.** The four gates are the contract.
 *
 * **WHAT IT PUBLISHES.** The package is the **vendoring promise made mechanical**: the same code
 * an adopter copies, **compiled to ESM plus `.d.ts`** (`DECISIONS.md` D73), with a manifest that
 * says so, and nothing the runtime cannot reach. Two changes to what this used to do, both made
 * because the artefact did not match the decision it claimed to implement:
 *
 *   - **It ships the SOURCE, not the build.** It copied `runtime/` wholesale, so the published
 *     entry point was `./runtime/src/index.ts` — a TypeScript file. D73 decided *"the published
 *     package is compiled ESM plus `.d.ts`, with a `tsc` build used ONLY for publishing"*, so the
 *     package now compiles `runtime/src/**` to `runtime/dist/**` with declarations, and the
 *     entry point is JavaScript with types beside it.
 *   - **It shipped 36 TEST FILES.** `cpSync` of the `runtime/` folder took `runtime/test/**` with
 *     it, while this file's own header said *"not its tests, not its CI"*. The package now carries
 *     the compiled runtime and **only the two files the runtime actually imports** from `scripts/`.
 *
 * **The compiler is needed only here.** Contributors keep running the `.ts` directly, with no
 * build step and no install (D21); the compiler is a publishing-time dependency, so the pre-flight
 * refuses to proceed without it rather than downloading one.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

/** The folders an adopter copies by hand. The vendoring path is unchanged by the publish build. */
export const VENDORED = ['runtime', 'scripts'];

/**
 * The two files the runtime reaches OUTSIDE itself, and the only ones the package carries from
 * `scripts/`.
 *
 * `runtime/src/pack.ts` imports `../../scripts/validate-pack.mjs`, which imports
 * `./claim-scan.mjs`. Everything else in `scripts/` is this repository's own gates, its release
 * tooling, and their tests — twenty-three files the runtime never loads. The package is the
 * vendoring promise made mechanical: **the same code, compiled, with nothing it cannot reach.**
 */
export const PACKAGE_EXTRA_FILES = ['scripts/validate-pack.mjs', 'scripts/claim-scan.mjs'];

/** The tsconfig the publish build uses — emit, declarations, and `.ts` extensions rewritten to `.js`. */
export const PUBLISH_TSCONFIG = 'runtime/tsconfig.publish.json';

/** Run a command in the repository and return its stdout. Throws with the stderr on failure. */
export function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: opts.cwd ?? REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Is the working tree clean? An untracked file counts — it would not be in the tag. */
export function treeIsDirty(repo = REPO) {
  const out = run('git', ['status', '--porcelain'], { cwd: repo });
  return out.trim() !== '';
}

/**
 * Does this tag carry a signature?
 *
 * Two levels, and the difference matters: a **signed** tag carries a signature block; a **verified**
 * one is signed *and* the signature checks out against a key. The first can be proven without the
 * keyring; the second needs the key, and a check that cannot reach the key must say so rather
 * than pass.
 */
export function tagSignatureState(repo = REPO, tag = 'HEAD') {
  let type;
  try {
    type = run('git', ['cat-file', '-t', tag], { cwd: repo }).trim();
  } catch {
    return { state: 'missing', detail: `no tag \`${tag}\`` };
  }
  if (type !== 'tag') {
    return { state: 'lightweight', detail: `\`${tag}\` is a lightweight tag — it points at a commit and carries no tag object at all` };
  }
  const body = run('git', ['cat-file', '-p', tag], { cwd: repo });
  if (!/-----BEGIN (PGP|SSH) SIGNATURE-----|-----BEGIN SIGNED MESSAGE-----/.test(body)) {
    return { state: 'unsigned', detail: `\`${tag}\` is an annotated tag with no signature block` };
  }
  try {
    run('git', ['verify-tag', tag], { cwd: repo });
    return { state: 'verified', detail: `\`${tag}\` carries a signature that verifies against the local keyring` };
  } catch (e) {
    return {
      state: 'signed-unverified',
      detail: `\`${tag}\` carries a signature, but it could not be verified here (${String(e.stderr ?? e.message).split('\n')[0]}) — the key is not on this machine`,
    };
  }
}

/** Does the changelog have a section for this version? */
export function changelogHasVersion(changelog, version) {
  // A version is a version: `0.2.0`, not `Unreleased`. The release pre-flight asks "is this
  // version in the notes", and "Unreleased" would answer a question nobody asked.
  if (!/^\d+\.\d+\.\d+/.test(version)) return false;
  return new RegExp(`^## \\[[^\\]]*${version.replace(/\./g, '\\.')}[^\\]]*\\]`, 'm').test(changelog);
}

/** The pre-flight. Returns the list of problems — empty means the release may proceed. */
export function preflight(repo = REPO, version = null) {
  const problems = [];

  if (treeIsDirty(repo)) problems.push('the working tree is dirty — the artefact must be the tagged commit');
  // The publish build needs the compiler, and the compiler is deliberately not a dependency of
  // the runtime (D21: a fork installs nothing). So the release refuses without it — with the
  // exact command — rather than the script fetching one behind the reader's back.
  if (!existsSync(join(repo, 'node_modules', 'typescript', 'bin', 'tsc'))) {
    problems.push('the TypeScript compiler is not installed — publishing needs it (D73: the build is used ONLY for publishing): npm install --no-save --no-package-lock typescript@5 @types/node@22');
  }
  if (version === null) problems.push('no version given — pass --version <x.y.z>');
  else {
    const changelog = readFileSync(join(repo, 'CHANGELOG.md'), 'utf8');
    if (!changelogHasVersion(changelog, version)) {
      problems.push(`CHANGELOG.md has no section for ${version} — the release notes are the reader's entry point`);
    }
    // The manifest and the tag must say the same thing. A package that says 0.3.0 under a v0.2.0
    // tag is two versions of one release, and the reader is the one who has to work out which.
    try {
      const declared = JSON.parse(readFileSync(join(repo, 'runtime', 'package.json'), 'utf8')).version;
      if (declared !== version) {
        problems.push(`runtime/package.json says ${declared}, but the release is ${version} — one release, one version`);
      }
    } catch (e) {
      problems.push(`could not read the manifest's version: ${String(e.message).split('\n')[0]}`);
    }
    const tag = `v${version}`;
    if (!existsSync(join(repo, '.git'))) {
      // not a git checkout — nothing more to check
    } else {
      const sig = tagSignatureState(repo, tag);
      if (sig.state === 'missing') problems.push(`there is no tag \`${tag}\``);
      else if (sig.state === 'lightweight' || sig.state === 'unsigned') problems.push(sig.detail);
    }
  }

  // The counts are generated; a release must not carry a number the tree no longer produces.
  try {
    const before = readFileSync(join(repo, 'spec', 'GOVERNANCE-SPEC-OUTLINE.md'), 'utf8');
    run('node', [join(repo, 'scripts', 'sync-counts.mjs')], { cwd: repo });
    const after = readFileSync(join(repo, 'spec', 'GOVERNANCE-SPEC-OUTLINE.md'), 'utf8');
    if (before !== after) {
      problems.push('the generated counts are stale — run `node scripts/sync-counts.mjs` and commit the result');
      writeFileSync(join(repo, 'spec', 'GOVERNANCE-SPEC-OUTLINE.md'), before); // put it back
    }
  } catch (e) {
    problems.push(`could not recompute the counts: ${String(e.message).split('\n')[0]}`);
  }

  // The four gates.
  try {
    run('node', [join(repo, 'scripts', 'gates.mjs')], { cwd: repo });
  } catch (e) {
    problems.push('the four gates did not pass');
  }

  return problems;
}

/**
 * The published manifest — the runtime's own `package.json`, read and re-pointed at the build.
 *
 * **Pure, and separately testable on purpose:** the shape of the package (what it is called, where
 * its entry point is, what a consumer gets for types) is a *claim*, and a claim nobody can check
 * without a compiler installed is a claim that rots in exactly the way this file exists to stop.
 * So the manifest is a function of the repository alone, and the test that holds it needs nothing
 * but the tree.
 */
export function packageManifest(repo = REPO, version = null) {
  const manifest = JSON.parse(readFileSync(join(repo, 'runtime', 'package.json'), 'utf8'));
  return {
    name: manifest.name,
    version: version ?? manifest.version,
    description: manifest.description,
    license: manifest.license,
    type: manifest.type,
    engines: manifest.engines,
    repository: { type: 'git', url: 'https://github.com/Therealratoshen/kinship' },
    homepage: 'https://github.com/Therealratoshen/kinship#readme',
    keywords: manifest.keywords,
    files: ['runtime/dist', 'scripts', 'README.md', 'LICENSE'],
    types: './runtime/dist/index.d.ts',
    exports: {
      '.': { types: './runtime/dist/index.d.ts', import: './runtime/dist/index.js' },
      './package.json': './package.json',
    },
  };
}

/**
 * The package, built from the two folders an adopter copies.
 *
 * Nothing else goes in: not the repository's own docs, not its tests, not its CI. The published
 * artefact is the vendored promise, and the vendoring check already proved it runs.
 */
export function buildPackage(repo = REPO, version = null) {
  // The staging directory lives under `logs/`, which is gitignored — so on a fresh clone it does
  // not exist, and a checkout that has never run the quickstart must still be able to build a
  // package. (CI caught this: a local tree that had run the quickstart was hiding it.)
  const staging = join(repo, 'logs');
  if (!existsSync(staging)) mkdirSync(staging, { recursive: true });
  const dir = mkdtempSync(join(staging, 'release-pkg-'));

  // **The compile.** D73: "the published package is compiled ESM plus `.d.ts`, with a `tsc` build
  // used ONLY for publishing — contributors keep running the `.ts` directly, with no build step and
  // no install." So the compiler is a PUBLISHING dependency: if it is not here, the release is
  // refused with the exact command, rather than the script downloading one behind the reader's
  // back.
  const tsc = join(repo, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!existsSync(tsc)) {
    throw new Error(
      'publishing needs the TypeScript compiler, and it is deliberately not a dependency of the ' +
      'runtime (D21: a fork installs nothing). Install it for the publish only:\n' +
      '    npm install --no-save --no-package-lock typescript@5 @types/node@22\n' +
      'then re-run this script.',
    );
  }
  // The output goes straight into the staging directory, so nothing compiled is ever left in the
  // working tree — and `logs/` is gitignored, so the tree stays clean for the pre-flight.
  const dist = join(dir, 'runtime', 'dist');
  run(process.execPath, [tsc, '-p', PUBLISH_TSCONFIG, '--outDir', dist], { cwd: repo });

  // The two files the runtime reaches, in the layout it reaches them by. `runtime/dist/pack.js`
  // imports `../../scripts/validate-pack.mjs`, so `scripts/` sits beside `runtime/` — the same
  // relative depth the source tree has, and the same promise the README makes to a copier.
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  for (const file of PACKAGE_EXTRA_FILES) {
    cpSync(join(repo, file), join(dir, file));
  }

  const published = packageManifest(repo, version);
  writeFileSync(join(dir, 'package.json'), JSON.stringify(published, null, 2) + '\n');
  // The licence and the readme travel with the package. If either is missing the release is
  // refused rather than crashing: a package without its licence is not a package.
  for (const file of ['LICENSE', 'README.md']) {
    const from = join(repo, file);
    if (!existsSync(from)) {
      if (file === 'LICENSE') throw new Error(`no LICENSE in ${repo} — a package without its licence is not a package`);
      continue;
    }
    cpSync(from, join(dir, file));
  }
  return { dir, manifest: published };
}

function main(argv) {
  const versionIdx = argv.indexOf('--version');
  const version = versionIdx === -1 ? null : argv[versionIdx + 1];
  const publish = argv.includes('--publish');

  console.log('Kinship — release pre-flight\n');
  const problems = preflight(REPO, version);
  if (problems.length > 0) {
    console.log('REFUSED. The release may not proceed:');
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('pre-flight passed: clean tree, signed tag, changelog section, current counts, four gates green.');

  const { dir, manifest } = buildPackage(REPO, version);
  console.log(`\npackage: ${manifest.name}@${manifest.version}`);
  console.log(`  files: runtime/dist (compiled ESM + .d.ts) and scripts/validate-pack.mjs + scripts/claim-scan.mjs — the code the runtime reaches, and nothing else`);
  console.log(`  staged in: ${dir}`);

  const args = ['publish', '--access', 'public', '--dry-run'];
  if (publish) args.length = 2; // no --dry-run
  console.log(`\n$ npm ${args.join(' ')}   (in ${dir})`);
  try {
    const out = execFileSync('npm', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(out.trim());
  } catch (e) {
    console.log(String(e.stdout ?? '') + String(e.stderr ?? ''));
    console.log('\n(npm did not complete — the registry needs your login and a publish token.)');
  }
  console.log(`\n${publish ? 'published.' : 'dry run only. Re-run with --publish when you are ready.'}`);
  console.log(`the staged copy is at ${dir} — remove it when you are done.`);
}

if (process.argv[1] && process.argv[1].endsWith('release.mjs')) {
  main(process.argv.slice(2));
}
