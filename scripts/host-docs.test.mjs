/**
 * host-docs.test.mjs — the reference host's README must document the CLI it ships.
 *
 *   node --test scripts/host-docs.test.mjs
 *
 * **WHY THIS FILE EXISTS.** The root README was rewritten on 2026-10-24 to be a front door, and the
 * long community walkthrough moved — *in the plan* — to `adapters/reference/README.md`. The plan was
 * not carried out: the walkthrough was deleted, and the root README pointed at a file that did not
 * contain it. **Nothing failed**, because nothing checked: the link resolved, the anchor existed, and
 * every gate passed.
 *
 * **The generalisable shape.** A pointer between two documents is a promise about the *content* of
 * the target, and the link checker only proves the target exists. **A promise about content cannot be
 * checked by looking at the link** — so it is checked by looking for the content, derived from the
 * code rather than from a list of the commands someone remembered.
 *
 * **THE CHECK.** The commands the CLI accepts are read out of `host.ts`'s own switch. Every one of
 * them must be named in the host's README. A new command that ships without a word about it fails
 * the build, and a README that promises a walkthrough it does not contain fails it too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Every command the reference host's CLI accepts, read out of its own switch. */
export function cliCommands(source) {
  return [...source.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]);
}

test('the host\'s README shows every command the CLI accepts, in a code block', () => {
  // **In a code block, not anywhere.** A plain substring check passes for the wrong reason: the
  // word "tick" appears in prose ("the tick is metered") and "draft" appears in the copy, so a
  // command can be "documented" by a sentence that never shows how to run it. A command is
  // documented when the reader can see it typed.
  const commands = cliCommands(read('adapters/reference/src/host.ts'));
  assert.ok(commands.length >= 8, `expected the CLI to have a set of commands, found ${commands.length}`);
  const readme = read('adapters/reference/README.md');
  const code = [...readme.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
  const undocumented = commands.filter((c) => !new RegExp(`\\b${c}\\b`).test(code));
  assert.deepEqual(
    undocumented,
    [],
    `these commands ship but the reference host's README never shows one: ${undocumented.join(', ')}`,
  );
});

test('the root README points at a walkthrough that exists where it says it does', () => {
  // The root README points a community manager at the host's README for the end-to-end journey.
  // A pointer to content is a promise about content, and the only cheap proof is that the
  // destination actually carries the journey.
  const root = read('README.md');
  assert.ok(
    root.includes('adapters/reference/README.md'),
    'the root README should point at the reference host for the end-to-end journey',
  );
  const host = read('adapters/reference/README.md');
  assert.match(host, /## Run it on your own community/, 'and that README must carry the walkthrough itself');
  for (const step of ['init', 'plan', 'approve', 'publish', 'verify', 'redact']) {
    assert.ok(host.includes(step), `the walkthrough must show the \`${step}\` step`);
  }
});
