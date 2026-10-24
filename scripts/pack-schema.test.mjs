/**
 * The pack JSON Schema — and what this test can honestly prove about it.
 *
 * **WHAT THE SCHEMA IS FOR.** Editors read it: `agents.*.autonomy_by_class` gets autocomplete, a
 * mistyped key gets underlined, and the community organiser finds out before they run something. It is
 * **ADVICE**. The gate is `scripts/validate-pack.mjs`, which refuses a pack that breaks an
 * invariant. The schema is a superset of what the gate accepts; it is never a substitute for it.
 *
 * **WHAT THIS TEST PROVES, AND WHAT IT DOES NOT.**
 * It proves the schema has not drifted from the two things it describes: **the code's vocabulary**
 * (the autonomy levels, the coverage modes, the posture's contact values, the schema version) and
 * **the shipped pack's own shape**. A schema that names a level the runtime does not have, or a
 * property the pack does not use, is a schema that will send an editor somewhere useless.
 *
 * It does **not** prove that a pack validates against the schema, because **this repository has no
 * JSON Schema engine and is not going to grow one** — the runtime has no dependencies, and that is
 * the point. A full structural validation would be a second schema to keep in step with the first.
 * The open item is recorded: a pack is checked by the gate, and an editor is told what the gate
 * expects.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PACK_DIR = join(ROOT, 'packs', 'kopdar-ops');
const SCHEMA_PATH = join(PACK_DIR, '.kinship.schema.json');
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const packText = readFileSync(join(PACK_DIR, '.kinship.yaml'), 'utf8');

test('the schema is well-formed and says it is advice, not the gate', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.type, 'object');
  assert.match(schema.description, /THIS SCHEMA IS ADVICE/i);
  assert.match(schema.description, /validate-pack\.mjs/, 'and it names the gate that does refuse');
});

test('the schema names exactly the top-level keys the shipped pack uses', () => {
  // The top-level keys of the pack file: `key: value` at column zero.
  const actual = packText.split('\n')
    .filter((l) => /^[a-z_]+:/.test(l))
    .map((l) => l.slice(0, l.indexOf(':')));
  const named = Object.keys(schema.properties);
  const missing = actual.filter((k) => !named.includes(k));
  assert.deepEqual(missing, [], `the pack uses top-level keys the schema does not name: ${missing.join(', ')}`);
  const extra = named.filter((k) => !actual.includes(k));
  assert.deepEqual(extra, [], `the schema names top-level keys the pack does not use: ${extra.join(', ')}`);
});

test('every enumeration in the schema matches the code vocabulary, not a copy of it', () => {
  // The autonomy levels, straight out of the runtime's type.
  const autonomy = readFileSync(join(ROOT, 'runtime', 'src', 'types.ts'), 'utf8');
  const levels = [...autonomy.match(/export type Autonomy = ([^;]+);/)[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  const schemaLevels = schema.properties.agents.additionalProperties.properties.autonomy_by_class.additionalProperties.enum;
  assert.deepEqual([...schemaLevels].sort(), [...levels].sort(),
    "the schema's autonomy levels are the runtime's levels — a schema that names a level the runtime does not have sends an editor somewhere useless");

  // The coverage modes, out of the parser.
  const pack = readFileSync(join(ROOT, 'runtime', 'src', 'pack.ts'), 'utf8');
  const modes = [...pack.matchAll(/mode === '([a-z]+)'/g)].map((m) => m[1]);
  assert.ok(modes.length > 0, 'the parser must still name the modes');
  for (const m of modes) {
    assert.ok(schema.properties.coverage.properties.mode.enum.includes(m), `the schema does not name the coverage mode \`${m}\``);
  }

  // The posture's contact values.
  const posture = readFileSync(join(ROOT, 'runtime', 'src', 'posture.ts'), 'utf8');
  const contacts = [...posture.matchAll(/'(never|asked_only|open)'/g)].map((m) => m[1]);
  for (const c of new Set(contacts)) {
    assert.ok(schema.properties.posture.properties.contact.enum.includes(c), `the schema does not name the contact value \`${c}\``);
  }
});

test('the required list is real — every required key is one the pack actually has', () => {
  assert.ok(schema.required.length > 0, 'a schema with no required list describes nothing');
  const actual = packText.split('\n').filter((l) => /^[a-z_]+:/.test(l)).map((l) => l.slice(0, l.indexOf(':')));
  for (const k of schema.required) {
    assert.ok(actual.includes(k), `the schema requires \`${k}\`, which the shipped pack does not have`);
  }
});

test('the pack format version in the schema is the one the runtime accepts', () => {
  const pack = readFileSync(join(ROOT, 'runtime', 'src', 'pack.ts'), 'utf8');
  const m = pack.match(/schema !== '([^']+)'/);
  assert.ok(m, 'the runtime must still name the schema version it accepts');
  assert.equal(schema.properties.schema.const, m[1], 'the schema and the runtime agree on the pack format version');
});
