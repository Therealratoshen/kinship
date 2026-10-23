import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REFUSAL_CODES, UNIMPLEMENTED_REFUSAL_CODES, KinshipError, refuse } from '../src/errors.ts';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import {disclosureLine} from '../src/disclosure.ts';

/**
 * The refusal vocabulary is a product surface: codes go into the audit log, the card, and the
 * test failure a contributor reads. `errors.ts` says a code is a closed set and renaming one is a
 * versioned event — so this file tests the shape of the set, and that no code in it is a lie.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const sources = () => readdirSync(SRC).filter((f) => f.endsWith('.ts') && f !== 'errors.ts')
  .map((f) => readFileSync(join(SRC, f), 'utf8'))
  // Strip comments: `quiet_hours` in a doc sentence must not count as an enforcement site.
  .map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));

const isRaised = (code: string): boolean =>
  sources().some((s) => new RegExp(`\\b(?:refuse|new KinshipError)\\(\\s*'${code}'`).test(s));

const ANSWERS = { community_name: 'AI Builders ID', escalation_contact: 'organiser', member_notice_text: 'bot ini asisten organiser', partner_policy: 'Kopdar Sebelah + disclosure' };

test('a refusal message names the code, the rule, and the reason — in that order (§1.2)', () => {
  const e = new KinshipError('quiet_hours', 'member is asleep', 'spec §2.9');
  assert.equal(e.message, '[quiet_hours] (spec §2.9) member is asleep',
    'the log line has to be readable by someone who did not write the rule');
  assert.equal(e.code, 'quiet_hours');
  assert.equal(e.rule, 'spec §2.9');
  assert.equal(e.name, 'KinshipError');
  assert.ok(e instanceof Error, 'so existing catch/expect-throws machinery works without a special case');
});

test('the rule is optional in the type but never invented: no rule, no parentheses', () => {
  const e = new KinshipError('pack_invalid', 'the pack has no agents');
  assert.equal(e.message, '[pack_invalid] the pack has no agents');
  assert.equal(e.rule, undefined);
});

test('refuse() throws and is typed never — the only way domain code says no', () => {
  const thrower = (): ReturnType<typeof refuse> => refuse('stale_target', 'spec §1.5', 'the revision changed');
  assert.throws(thrower, (e: unknown) => {
    assert.ok(e instanceof KinshipError, 'catchers rely on the class, not on message text');
    assert.equal((e as KinshipError).code, 'stale_target');
    return true;
  });
});

test('the code set is closed, unique, and snake_case — codes are kept forever in the audit log', () => {
  assert.ok(new Set(REFUSAL_CODES).size === REFUSAL_CODES.length, 'no code appears twice');
  for (const c of REFUSAL_CODES) {
    assert.match(c, /^[a-z][a-z0-9_]*$/, `${c} must be snake_case — it is stored in the log verbatim`);
    assert.equal(c, c.trim(), `${c} has stray whitespace`);
  }
});

test('every code is either enforced or named as debt — the vocabulary contains no silent lies', () => {
  const unenforced = REFUSAL_CODES.filter((c) => !isRaised(c));
  const declared = Object.keys(UNIMPLEMENTED_REFUSAL_CODES);
  assert.deepEqual([...unenforced].sort(), [...declared].sort(),
    'a code that is neither raised nor declared as debt is a promise the runtime does not keep — fix the code or name the gap');
  for (const [code, reason] of Object.entries(UNIMPLEMENTED_REFUSAL_CODES)) {
    assert.ok(REFUSAL_CODES.includes(code as (typeof REFUSAL_CODES)[number]), `${code} is declared debt but is not a real code`);
    assert.ok(reason.length > 20, `${code} needs a reason a reviewer can act on, not a shrug`);
  }
});

test('no code is both raised and declared debt: the list cannot rot into a graveyard', () => {
  for (const code of Object.keys(UNIMPLEMENTED_REFUSAL_CODES)) {
    assert.equal(isRaised(code), false, `${code} is now enforced — delete it from UNIMPLEMENTED_REFUSAL_CODES`);
  }
});

test('the debt list cannot carry a duplicated key — an object literal keeps the last one and hides the first', () => {
  // Found the hard way: an edit that was meant to delete a debt entry rewrote it under an existing
  // key name. `Partial<Record<…>>` does not complain, `Object.keys` silently dedupes, and every
  // gate below then passes over prose a reviewer still reads as two separate declarations.
  const src = readFileSync(join(SRC, 'errors.ts'), 'utf8');
  const start = src.indexOf('UNIMPLEMENTED_REFUSAL_CODES');
  const block = src.slice(start, src.indexOf('\n};', start));
  const written = [...block.matchAll(/^\s\s([a-z][a-z0-9_]*):/gm)].map((m) => m[1]);
  assert.equal(written.length, Object.keys(UNIMPLEMENTED_REFUSAL_CODES).length,
    `the literal writes ${written.length} entries and JS exposes ${Object.keys(UNIMPLEMENTED_REFUSAL_CODES).length} — a repeated key is a dead sentence that reads like a rule: ${written.join(', ')}`);
  for (const key of written) {
    assert.ok(REFUSAL_CODES.includes(key as (typeof REFUSAL_CODES)[number]), `${key} is declared debt but is not a real code`);
  }
});

test('every refusal the engine logs uses a code from the closed set — the audit vocabulary cannot drift', () => {
  const f = Fleet.boot(makePack({ engagement: { 'remind.member': 'opt-in-auto' } }), ANSWERS, 1_000);
  // Two real refusals, through the public surface.
  assert.throws(() => f.attempt({ actionClass: 'nonexistent.class', agent: 'engagement', origin: { kind: 'event', id: 'e1' }, text: { id: 'x', en: 'y' } }), /class_unavailable/);
  assert.throws(() => f.commit({
    actionClass: 'remind.member', agent: 'engagement', origin: { kind: 'event', id: 'e1' },
    recipients: [], onBehalfOf: 'organiser',
    text: { id: `x\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `y\n\n${disclosureLine('en', ANSWERS.community_name)}` },
  }), /grant_not_found/);
  const logged = f.state.events.filter((e) => e.type === 'CommitRefused').map((e) => (e as { code: string }).code);
  assert.deepEqual(logged, ['class_unavailable', 'grant_not_found']);
  for (const code of logged) {
    assert.ok((REFUSAL_CODES as readonly string[]).includes(code), `\`${code}\` is in the log but not in the vocabulary`);
  }
});
