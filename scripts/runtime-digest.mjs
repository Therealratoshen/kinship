/**
 * The runtime digest — *which* runtime is this?
 *
 * **The problem it exists for.** The install path for this repository is **vendoring by copy**
 * (`DECISIONS.md` D52): a host takes `runtime/` and puts it inside itself. That is the sanctioned
 * way to consume a control plane, and it is exactly why a copy can be **old** without anyone
 * noticing. A forked host whose copy is three releases behind still runs, still passes its own
 * tests, and still behaves — just not the behaviour this repository currently claims. Nothing in
 * the tree can see that, because the copy is not in the tree.
 *
 * The hosted product at `shortcutsistem.com` is the case that made this concrete: it is built
 * from a private repository that vendors this runtime, so the open-source project could not say
 * anything true about the code that ships. This script makes one true thing sayable: **the
 * digest of the runtime a host was built from, and the digest of the runtime in this repository,
 * are the same string or they are not.**
 *
 * **What it is.** One deterministic `sha256` over a canonical byte stream built from the
 * shippable part of the runtime: every file's repository-relative path, a NUL, then its bytes,
 * concatenated in sorted path order. The path is *relative*, so a copy at any absolute path
 * digests to the same value — which is the whole point, since a vendored copy lives somewhere
 * else.
 *
 * **What it is not.** It is not a signature, not an attestation, and not a supply-chain guarantee.
 * It says "these bytes are the same bytes", and nothing about who put them there, when, or why.
 * Two trees with the same digest are the same tree; a tree that was tampered with *and* had its
 * digest recomputed is still a tree with a digest. A digest proves equality, never provenance.
 *
 * **The scope choice is deliberate and is the one judgement here.** By default the digest covers
 * `runtime/src/**` and `runtime/package.json` — the part a host actually vendors and the part
 * whose behaviour a member can feel. The tests, the tour, and the tsconfig are **not** in the
 * default scope: a host does not need them, and including them would make every fork's digest
 * differ for reasons that have nothing to do with the governance semantics. `--full` digests the
 * entire `runtime/` tree instead, for a host that vendors the lot and wants the stricter check.
 * Both scopes are named in the output, so a digest is never ambiguous about what it covered.
 *
 * **What a host is expected to do with it.** Record the digest it was built from, next to the
 * log (`spec/HOST-CONTRACT.md` seam 3) or in its own build metadata, and re-compute it on start.
 * Then "is this copy current?" is a comparison of two strings rather than a question about
 * anyone's memory. Whether the hosted product adopts that is the owner's call, not this
 * repository's — this file only makes the comparison possible.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
/** The repository root, one level above `scripts/`. */
export const REPO_ROOT = join(HERE, '..');

/** The shippable part of the runtime: what a host vendors, and what a member's behaviour depends on. */
export const SHIPPABLE_SCOPE = ['src', 'package.json'];

/** The whole `runtime/` tree, tests and tour included. */
export const FULL_SCOPE = ['.'];

/** A path segment that is never digested: dependencies, and version-control and tool state. */
const IGNORED_SEGMENTS = new Set(['node_modules', '.git', '.github']);

/**
 * The files a scope covers, as repository-relative POSIX paths, sorted.
 *
 * The sort is by path, and it is a *total* order over the exact strings that go into the hash —
 * not over a locale, and not over a comparison that treats `a/b` and `a.b` alike. Two machines
 * with different locales must produce the same digest, or the digest proves nothing.
 */
export function digestFiles(root, scope = SHIPPABLE_SCOPE) {
  const files = [];
  const walk = (dir, prefix) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // a scope that names something absent is an empty scope, not a crash
    }
    for (const entry of entries) {
      if (IGNORED_SEGMENTS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else if (entry.isFile()) files.push(rel);
    }
  };
  for (const part of scope) {
    if (part === '.') walk(root, '');
    else if (part.includes('.')) {
      // A scope entry that names a file rather than a directory.
      const abs = join(root, part);
      try {
        readFileSync(abs);
        files.push(part);
      } catch { /* absent */ }
    } else walk(join(root, part), part);
  }
  return [...new Set(files)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * The digest of a runtime tree.
 *
 * @param {string} root      the `runtime/` directory to digest
 * @param {object} [options]
 * @param {string[]} [options.scope]  which parts of the tree to cover
 * @returns {{digest: string, files: number, bytes: number, scope: string[]}}
 */
export function digestTree(root, { scope = SHIPPABLE_SCOPE } = {}) {
  const files = digestFiles(root, scope);
  const hash = createHash('sha256');
  let bytes = 0;
  for (const rel of files) {
    const content = readFileSync(join(root, ...rel.split('/')));
    hash.update(rel, 'utf8');
    hash.update('\0', 'utf8');
    hash.update(content);
    bytes += content.length;
  }
  return {
    digest: `sha256:${hash.digest('hex')}`,
    files: files.length,
    bytes,
    scope: [...scope],
  };
}

/**
 * The digest of the runtime in a repository, by default this one.
 *
 * @param {string} [repoRoot]  a repository root containing `runtime/`
 * @param {object} [options]
 * @param {string[]} [options.scope]
 */
export function runtimeDigest(repoRoot = REPO_ROOT, options = {}) {
  return digestTree(join(repoRoot, 'runtime'), options);
}

/** The one-line form, which is what a host records. */
export function runtimeDigestLine(repoRoot = REPO_ROOT, options = {}) {
  const r = runtimeDigest(repoRoot, options);
  return `runtime-digest ${r.digest}`;
}

function main(argv) {
  const full = argv.includes('--full');
  const json = argv.includes('--json');
  const rootFlag = argv.indexOf('--root');
  const repoRoot = rootFlag !== -1 ? argv[rootFlag + 1] : REPO_ROOT;
  const scope = full ? FULL_SCOPE : SHIPPABLE_SCOPE;
  const result = runtimeDigest(repoRoot, { scope });

  if (json) {
    process.stdout.write(JSON.stringify({
      digest: result.digest,
      scope: result.scope,
      files: result.files,
      bytes: result.bytes,
      note: 'A digest proves two trees are byte-identical. It is not a signature and not an attestation.',
    }, null, 2) + '\n');
  } else {
    process.stdout.write(`runtime-digest ${result.digest}\n`);
    process.stdout.write(`scope         ${result.scope.join(' + ')}\n`);
    process.stdout.write(`files         ${result.files}\n`);
    process.stdout.write(`bytes         ${result.bytes}\n`);
    process.stdout.write('note          a digest proves two trees are byte-identical; it is not a signature\n');
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}
