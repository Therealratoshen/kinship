import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disclosureLineId, disclosureLineEn, assertDisclosed } from '../src/disclosure.ts';

const COMMUNITY = 'AI Builders ID';

test('the disclosure lines name the assistant and the community — never a person (§2.8)', () => {
  const id = disclosureLineId(COMMUNITY);
  const en = disclosureLineEn(COMMUNITY);
  assert.match(id, /asisten otomatis komunitas AI Builders ID/);
  assert.match(id, /bukan oleh manusia/, 'the denial is explicit, not implied');
  assert.match(en, /automated assistant of AI Builders ID/);
  assert.match(en, /not a human/);
  assert.match(en, /escalate to the organiser/, '§2.4 — the escalation path is part of the disclosure');
});

test('a member-facing draft carrying the canonical line passes the gate', () => {
  assert.doesNotThrow(() => assertDisclosed(
    `Halo! Latihan rutin minggu ini ya.\n\n${disclosureLineId(COMMUNITY)}`,
    `Hey! Weekly practice is on.\n\n${disclosureLineEn(COMMUNITY)}`,
    COMMUNITY,
  ));
});

test('an improvised disclosure does not substitute for the canonical line (§2.8)', () => {
  assert.throws(() => assertDisclosed(
    'Halo! Aku asisten AI dari komunitas ya.',
    'Hey! I am an AI assistant, just so you know.',
    COMMUNITY,
  ), /disclosure_missing/,
  'only the canonical line counts — a persona paragraph is imitation, and predictability is the point');
});

test('disclosing in one language but not the other fails — the pack is bilingual by rule', () => {
  const id = disclosureLineId(COMMUNITY);
  const en = disclosureLineEn(COMMUNITY);
  assert.throws(() => assertDisclosed(`ok\n\n${id}`, 'no english line here', COMMUNITY), /disclosure_missing/);
  assert.throws(() => assertDisclosed('no indonesian line', `ok\n\n${en}`, COMMUNITY), /disclosure_missing/);
});

test('disclosure lines are deterministic — same community, same line, byte for byte', () => {
  assert.equal(disclosureLineId(COMMUNITY), disclosureLineId(COMMUNITY));
  assert.equal(disclosureLineEn(COMMUNITY), disclosureLineEn(COMMUNITY));
});
