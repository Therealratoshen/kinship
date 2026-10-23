import { test } from 'node:test';
import assert from 'node:assert/strict';
import {assertDisclosed, disclosureLine} from '../src/disclosure.ts';
import { LOCALES, SUPPORTED_LOCALE_PAIRS, localeIsSupported } from '../src/locales.ts';

const COMMUNITY = 'AI Builders ID';
const ID_EN = ['id', 'en'] as const;
const EN_AR = ['en', 'ar'] as const;

test('the disclosure lines name the assistant and the community — never a person (section 2.8)', () => {
  const id = disclosureLine('id', COMMUNITY);
  const en = disclosureLine('en', COMMUNITY);
  assert.match(id, /asisten otomatis komunitas AI Builders ID/);
  assert.match(id, /bukan oleh manusia/, 'the denial is explicit, not implied');
  assert.match(en, /automated assistant of AI Builders ID/);
  assert.match(en, /not a human/);
  assert.match(en, /escalate to the organiser/, 'section 2.4 — the escalation path is part of the disclosure');
});

test('the disclosure line is canonical in ARABIC too — a community reads the promise, not a translation', () => {
  // The point of the line is that a member can PREDICT what disclosure looks like. That only works if
  // the line is canonical in the language the community reads — so the Arabic line is a fixed string
  // this runtime promises, not a translation that drifts with the copy around it.
  const ar = disclosureLine('ar', COMMUNITY);
  assert.match(ar, /المساعد الآلي/, 'it names the assistant');
  assert.match(ar, /ليست من إنسان/, 'it says plainly that it is not a human');
  assert.ok(ar.includes(COMMUNITY), 'and it names the community');
  assert.match(ar, /المنظّم/, 'section 2.4 — the escalation path is part of the disclosure, in every language');
});

test('a member-facing draft carrying the canonical line passes the gate', () => {
  assert.doesNotThrow(() => assertDisclosed(
    {
      id: `Halo! Latihan rutin minggu ini ya.\n\n${disclosureLine('id', COMMUNITY)}`,
      en: `Hey! Weekly practice is on.\n\n${disclosureLine('en', COMMUNITY)}`,
    },
    COMMUNITY,
    ID_EN,
  ));
});

test('an improvised disclosure does not substitute for the canonical line (section 2.8)', () => {
  assert.throws(() => assertDisclosed(
    { id: 'Halo! Aku asisten AI dari komunitas ya.', en: 'Hey! I am an AI assistant, just so you know.' },
    COMMUNITY,
    ID_EN,
  ), /disclosure_missing/,
  'only the canonical line counts — a persona paragraph is imitation, and predictability is the point');
});

test('disclosing in one language but not the other fails — the pack is bilingual by rule', () => {
  const id = disclosureLine('id', COMMUNITY);
  const en = disclosureLine('en', COMMUNITY);
  assert.throws(() => assertDisclosed({ id: `ok\n\n${id}`, en: 'no english line here' }, COMMUNITY, ID_EN), /disclosure_missing/);
  assert.throws(() => assertDisclosed({ id: 'no indonesian line', en: `ok\n\n${en}` }, COMMUNITY, ID_EN), /disclosure_missing/);
});

test('an EN/AR pack is held to the same rule in both of ITS languages', () => {
  // The Arabic slot is given an IMPROVISED line and the English slot the canonical one. The gate
  // must still refuse: the rule is "every language the community declares carries the canonical
  // line", and a canonical line in one language does not cover another.
  const en = disclosureLine('en', COMMUNITY);
  const ar = disclosureLine('ar', COMMUNITY);
  assert.doesNotThrow(() => assertDisclosed(
    { en: `Hello! Practice is on.\n\n${en}`, ar: `${ar}` },
    COMMUNITY,
    EN_AR,
  ));
  assert.throws(
    () => assertDisclosed({ en: `Hello!\n\n${en}`, ar: 'an improvised line, in the wrong language entirely' }, COMMUNITY, EN_AR),
    /disclosure_missing/,
    'the Arabic slot has to carry the Arabic line — the rule is the pair the community declares, not a fixed two',
  );
});

test('the runtime implements more than one pair, and a pack may declare any of them', () => {
  assert.ok(SUPPORTED_LOCALE_PAIRS.length >= 2, 'the runtime speaks more than one pair now');
  assert.ok(localeIsSupported(['id', 'en']), 'the pair it shipped with');
  assert.ok(localeIsSupported(['en', 'ar']), 'and the one a Dubai community runs in');
  assert.ok(!localeIsSupported(['en', 'id']), 'the ORDER is the community to choose — a primary language is a choice');
  assert.ok(!localeIsSupported(['en']), 'a single language is not a pair (FR-5.6)');
  assert.ok(!localeIsSupported(['en', 'fr']), 'and a pair the runtime does not implement is refused');
});

test('every language the runtime implements carries the copy it writes on its own', () => {
  // A language with a disclosure line but no runtime copy would leave the budget-stop and escalation
  // cards — the two the runtime raises by itself — written in the wrong language. The pair is refused
  // rather than half-supported, so every language here must be complete.
  for (const [code, spec] of Object.entries(LOCALES)) {
    assert.equal(spec.code, code, 'the spec names its own code');
    assert.ok(spec.disclosure(COMMUNITY).length > 0, `${code} has a disclosure line`);
    assert.ok(spec.budgetStop('e1', 1, 2).length > 0, `${code} has the budget-stop copy`);
    assert.ok(spec.escalation('because', 'the organiser').length > 0, `${code} has the escalation copy`);
  }
});
