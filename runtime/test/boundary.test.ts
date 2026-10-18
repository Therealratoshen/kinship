/**
 * The runtime boundary — the structural half of what D21 only says behaviorally.
 *
 * `Fleet.commit` refuses every member-facing send with `no_transport`, and that refusal is checked by
 * the tour. But a refusal only gates the door it stands in front of: nothing here stopped a
 * contributor from adding a *second* door — `await fetch(...)` in a new `src/` file, an SDK in
 * `package.json`, a webhook from a module that never goes through `commit()`. Once that lands, "phase 1
 * sends nothing" is a sentence about one code path rather than a property of the runtime, and the
 * shadow-mode gate (D9) would be guarding a system that already shipped delivery sideways.
 *
 * So this file gates the shape instead of the behaviour. It is deliberately a scanner over source text,
 * not a sandbox: it can prove what a file *imports and calls*, and it says so rather than claiming to
 * prove what a process *can do*.
 *
 * Four rules, each with a positive control that can fail:
 *
 *  1. **No third-party packages.** Every import specifier is relative, a `node:` builtin on the named
 *     allowlist, or the shared pack validator. `runtime/package.json` has no dependencies at all — which
 *     is also what keeps a forked pack runnable in a stranger's checkout with nothing installed.
 *  2. **No network-capable builtins, no network globals, no dynamic `import()`.** `fetch`, `WebSocket`,
 *     `XMLHttpRequest`, `sendBeacon`, and `node:net`/`http`/`https`/`http2`/`dgram`/`dns`/`tls` are the
 *     ways a message leaves a machine. The runtime must not own any of them: transport is a host seam
 *     (D21), and a host seam is code that lives *outside* `runtime/`.
 *  3. **The only file reads are the pack load.** `node:fs` is allowlisted for `src/pack.ts` alone. Not
 *     as tidiness — as the check that stops a runtime module from starting to read someone's config for
 *     credentials, which is the BYOD promise (the key never enters Kinship) written as a gate.
 *  4. **The scan is not vacuous.** `runtime/src` must contain the modules the repo claims, or an empty
 *     list would pass every rule above silently.
 *
 * Scope: `runtime/src/**` only. `runtime/tour.ts` and the tests may use `node:fs`, `node:os`, and
 * `node:child_process` freely — a demo that writes a temp pack to prove the fork gate is not a runtime
 * reaching the network, and gating them would only push contributors to add `// eslint-disable` noise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RUNTIME = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RUNTIME, 'src');

/** `node:` builtins the governance core may use, and the one module each is permitted in. */
const BUILTIN_USE: Record<string, string> = {
  'node:crypto': 'store.ts', // the revision hash — §1.5's approval binds to it
  'node:fs': 'pack.ts', // reading a pack folder is the only file read the runtime has
  'node:path': 'pack.ts', // and only to locate that folder
};

/** The shared shape gate, imported by path because it is the same code the validator tests run. */
const SHARED_VALIDATOR = '../../scripts/validate-pack.mjs';

const NETWORK_BUILTINS = ['net', 'http', 'https', 'http2', 'dgram', 'dns', 'tls'];
const NETWORK_GLOBALS = ['fetch(', 'WebSocket', 'XMLHttpRequest', 'sendBeacon'];

/** Strip comments: prose about a transport is not a transport (the same bound imports.test.ts holds). */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

interface Violation {
  file: string;
  rule: string;
}

/** Every specifier a file imports, including dynamic `import('…')` forms. */
function specifiers(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/from\s+['"]([^'"]+)['"]/g)) out.push(m[1]!);
  for (const m of body.matchAll(/import\s+['"]([^'"]+)['"]/g)) out.push(m[1]!); // `import './x.css'` side-effect form
  for (const m of body.matchAll(/import\(\s*['"]([^'"]+)['"]/g)) out.push(m[1]!);
  return out;
}

/** The rule, over a (file, source) pair — exported to no one, used as a test seam on purpose. */
function violationsFor(file: string, src: string): Violation[] {
  const body = codeOnly(src);
  const found: Violation[] = [];
  const push = (rule: string) => found.push({ file, rule });

  for (const spec of specifiers(body)) {
    if (spec === SHARED_VALIDATOR) {
      if (file !== 'pack.ts') push(`only pack.ts may reach the shared shape gate: ${spec}`);
      continue;
    }
    if (spec.startsWith('./')) continue; // a sibling module — the normal shape of this runtime
    if (spec.startsWith('../')) { push(`path escapes runtime/src: ${spec}`); continue; }
    if (spec.startsWith('node:')) {
      const builtin = spec.slice('node:'.length);
      if (NETWORK_BUILTINS.includes(builtin)) push(`network-capable builtin: ${spec}`);
      const allowedIn = BUILTIN_USE[spec];
      if (allowedIn === undefined) push(`builtin not on the allowlist: ${spec}`);
      else if (allowedIn !== file) push(`${spec} is allowlisted for ${allowedIn}, used in ${file}`);
      continue;
    }
    push(`third-party package: ${spec}`);
  }

  if (/import\s*\(/.test(body)) found.push({ file, rule: 'dynamic import() — an SDK can be pulled in at runtime' });
  for (const needle of NETWORK_GLOBALS) {
    if (body.includes(needle)) found.push({ file, rule: `network global: ${needle}` });
  }
  return found;
}

const srcFiles = () => readdirSync(SRC).filter((f) => f.endsWith('.ts'));

test('runtime/src imports no package, no network builtin, and no network global (D21, structurally)', () => {
  const offenders = srcFiles().flatMap((f) => violationsFor(f, readFileSync(join(SRC, f), 'utf8')));
  assert.deepEqual(offenders, [], `the runtime reached outside its boundary:\n${offenders.map((o) => `  ${o.file}: ${o.rule}`).join('\n')}`);
});

test('runtime/package.json still declares no dependencies — the on-ramp is "nothing installed"', () => {
  const pkg = JSON.parse(readFileSync(join(RUNTIME, 'package.json'), 'utf8'));
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    assert.equal(pkg[field], undefined, `${field} appeared: a transport SDK would arrive there first`);
  }
});

test('the only file the runtime reads is a pack folder, and only from pack.ts (§2.7 / the BYOD line)', () => {
  const readers = srcFiles().filter((f) => /readFileSync|writeFileSync|appendFile|createReadStream/.test(codeOnly(readFileSync(join(SRC, f), 'utf8'))));
  assert.deepEqual(readers, ['pack.ts'], 'a runtime module reading a config file is how a key would enter Kinship — the host holds it, not us');
});

test('POSITIVE CONTROLS: each rule fires, so none of them can pass for the wrong reason', () => {
  // A package import — the shape a channel SDK arrives in.
  assert.match(JSON.stringify(violationsFor('sender.ts', `import { Client } from '@whatsapp/api';\nvoid Client;\n`)), /third-party package/);
  // A network builtin, on the allowlist for nobody.
  assert.match(JSON.stringify(violationsFor('sender.ts', `import net from 'node:net';\nvoid net;\n`)), /network-capable builtin/);
  // A global call, no import needed — why the specifier list alone would not have been enough.
  assert.match(JSON.stringify(violationsFor('sender.ts', `export async function post(u: string) { return await fetch(u); }\n`)), /network global/);
  // A dynamic import of an SDK that is not in package.json today.
  assert.match(JSON.stringify(violationsFor('sender.ts', `export async function load() { return await import('axios'); }\n`)), /dynamic import/);
  // `node:fs` used somewhere other than the pack loader — the credential-file shape.
  assert.match(JSON.stringify(violationsFor('sender.ts', `import { readFileSync } from 'node:fs';\nvoid readFileSync;\n`)), /allowlisted for pack\.ts, used in sender\.ts/);
  // And the legal file, so the rule is not a blanket ban that fails on the real code too.
  assert.deepEqual(violationsFor('store.ts', `import { createHash } from 'node:crypto';\nimport type { FleetState } from './types.ts';\nvoid createHash;\nvoid (0 as unknown as FleetState);\n`), []);
});

test('the scanner is looking at the real runtime, not at an empty directory it can bless', () => {
  const names = srcFiles();
  for (const expected of ['engine.ts', 'cards.ts', 'grants.ts', 'health.ts', 'inbox.ts', 'pack.ts', 'store.ts']) {
    assert.ok(names.includes(expected), `${expected} is missing from runtime/src — the scan passing because the list is empty is not a pass`);
  }
  // The extractor proved against real source, not only against fixtures: if this ever reads nothing,
  // every specifier rule above goes quiet. (No hardcoded file count — that is the D24 rot class.)
  const external = specifiers(codeOnly(readFileSync(join(SRC, 'pack.ts'), 'utf8'))).filter((s) => !s.startsWith('./'));
  assert.deepEqual(external.sort(), ['../../scripts/validate-pack.mjs', 'node:fs', 'node:path'].sort(),
    `pack.ts's external imports were not extracted: ${JSON.stringify(external)}`);
});

test('prose about a transport is not a transport (the comment-stripping bound)', () => {
  const commented = `/** Every member-facing commit refuses with no_transport: fetch() is not called here. */\n// WebSocket is a host seam (D21).\nexport function noop(): void {}\n`;
  assert.deepEqual(violationsFor('engine.ts', commented), []);
});
