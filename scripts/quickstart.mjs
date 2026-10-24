#!/usr/bin/env node
/**
 * quickstart.mjs — the five-minute integration story, in one command.
 *
 *   node scripts/quickstart.mjs
 *
 * **What it is.** The outside-in review's sharpest finding was that the on-ramp is a *sequence of
 * long commands with hardcoded card ids*, and that the interesting proof — a card, a human's
 * decision, a refusal, a verified log, a shareable redacted copy — is spread across five of them.
 * This script runs that sequence and prints where everything landed.
 *
 * **What it does, in order.**
 *  1. **Links the runtime into the reference adapter** — the adapter's one dependency is a *path* to
 *     `runtime/`, so "installing" it is a symlink and nothing is downloaded. If the link is already
 *     there, it is left alone.
 *  2. **Makes a workspace** under `logs/` (gitignored — it holds member data) with its own copy of
 *     the example pack and the community's own two files, so **your** files are never touched.
 *  3. **Runs the sequence**: `plan` (a read) → `run` (the fleet drafts) → `approve` (a human
 *     decision, with a reason) → `publish` (**refused** — phase 1 ships no transport) → `verify` →
 *     `redact`.
 *  4. **Prints the paths**: the log, the card, and the redacted copy you can hand to a maintainer.
 *
 * **What it deliberately does not do.** It does not send anything, and it cannot: the runtime ships
 * no channel transport, so the publish step is refused by design and the refusal is in the log. It
 * does not touch a pack's own `pack.local.yaml` — the copy is made first, and the copy is what gets
 * initialised.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const ADAPTER = join(REPO, 'adapters', 'reference');
const RUNTIME = join(REPO, 'runtime');
const PACK = join(REPO, 'packs', 'kopdar-ops');

/** The example event's moment — the same one the tour and the host tests use. */
const NOW = '2026-11-07T19:00:00+07:00';

const say = (line) => console.log(line);

/** The adapter's one dependency is a path, so "installing" it is a symlink and nothing is fetched. */
function linkRuntime() {
  const modules = join(ADAPTER, 'node_modules');
  const link = join(modules, 'kinship-runtime');
  if (existsSync(link)) return 'already linked';
  mkdirSync(modules, { recursive: true });
  symlinkSync(relative(modules, RUNTIME), link, 'dir');
  return 'linked';
}

async function main() {
  say('Kinship — the whole thing in one command.');
  say('');

  // 1. the link
  say('runtime: ' + linkRuntime() + ' (adapters/reference/node_modules/kinship-runtime -> ../../runtime)');

  // 2. the workspace — its own copy of the pack, its own files, its own log
  const logRootBase = join(REPO, 'logs');
  mkdirSync(logRootBase, { recursive: true });
  const workspace = mkdtempSync(join(logRootBase, 'quickstart-'));
  // The directory keeps the pack's own slug: the validator refuses a pack whose directory name and
  // its key disagree (PKG-06), and a copy that is refused on arrival is a copy nobody can run.
  const packDir = join(workspace, 'kopdar-ops');
  const logRoot = join(workspace, 'log');
  cpSync(PACK, packDir, { recursive: true });
  say(`workspace: ${workspace}`);
  say('');

  const { runCommand, bootHost } = await import('../adapters/reference/src/host.ts');
  const base = { packDir, configFile: join(packDir, 'pack.local.yaml'), planFile: join(packDir, 'pack.local.plan.yaml'), logRoot, tickMs: 5000, watch: false };

  // 3. the sequence
  for (const line of runCommand({ ...base, command: 'init' })) say(line);
  for (const line of runCommand({ ...base, command: 'plan', now: Date.parse(NOW) })) say(line);
  for (const line of runCommand({ ...base, command: 'run', now: Date.parse(NOW) })) say(line);

  // The card the fleet left on a human's desk — read from the log the host just wrote.
  const host = bootHost({ ...base, now: Date.parse(NOW) });
  const card = [...host.fleet.state.cards.values()].find((c) => c.status === 'pending');
  if (card === undefined) {
    say('no card was drafted — the plan produced nothing to approve');
    rmSync(workspace, { recursive: true, force: true });
    process.exit(1);
  }
  say('');
  for (const line of runCommand({ ...base, command: 'approve', cardId: card.id, verdict: 'approve', why: 'the date and the venue read back correctly' })) say(line);

  // 4. the refusal, which is the point: nothing member-facing sends.
  for (const line of runCommand({ ...base, command: 'publish', cardId: card.id, recipients: ['wa:62811'] })) say(line);

  say('');
  for (const line of runCommand({ ...base, command: 'verify' })) say(line);
  say('');
  for (const line of runCommand({ ...base, command: 'redact' })) say(line);

  // 5. where everything landed
  const logDir = join(logRoot, ...host.pack.key.split('/'));
  say('');
  say('what you can look at:');
  say(`  the log:            ${logDir}`);
  say(`  the log in one line: ${JSON.parse(readFileSync(join(logDir, 'manifest.json'), 'utf8')).rowCount} rows, and every one of them is a record of what happened`);
  say(`  the redacted copy:  ${logRoot} — the identifiers are out, the structure is in, and the original is untouched`);
  say('');
  say('nothing was sent: the publish step was refused, and the refusal is in the log.');
  say('To try it with your own community, copy packs/kopdar-ops/ and run `init` in it.');
}

main().catch((e) => {
  console.error(`quickstart refused: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
