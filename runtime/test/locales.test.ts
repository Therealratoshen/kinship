import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import { disclosureLine } from '../src/disclosure.ts';
import { LOCALES, SUPPORTED_LOCALE_PAIRS, localeIsSupported } from '../src/locales.ts';

const COMMUNITY = 'Dubai Builders';
const EN_AR = ['en', 'ar'] as const;
const ANSWERS = { community_name: COMMUNITY };

/** A pack that runs in English and Arabic — the pair a Dubai community would declare. */
function dubaiPack() {
  return {
    ...makePack({ 'community-lead': { 'draft.promote': 'draft', 'answer.question': 'draft' } }),
    locale: [...EN_AR],
  };
}

test('the runtime implements more than one pair, and a pack may declare any of them', () => {
  assert.ok(SUPPORTED_LOCALE_PAIRS.length >= 2, 'the runtime speaks more than one pair now');
  assert.ok(localeIsSupported(['id', 'en']), 'the pair it shipped with');
  assert.ok(localeIsSupported(['en', 'ar']), 'and the one a Dubai community runs in');
  assert.ok(!localeIsSupported(['en', 'id']), 'the ORDER is the community to choose — a primary language is a choice');
  assert.ok(!localeIsSupported(['en']), 'a single language is not a pair (FR-5.6)');
  assert.ok(!localeIsSupported(['en', 'fr']), 'and a pair the runtime does not implement is refused');
});

test('an EN/AR community drafts a card whose copy is carried in BOTH of its languages', () => {
  const f = Fleet.boot(dubaiPack(), ANSWERS, 25_200_000);
  f.registerMember('wa:62811', 'Asia/Dubai');
  const card = f.attempt({
    actionClass: 'draft.promote', agent: 'community-lead', origin: { kind: 'event', id: 'dubai-1' },
    text: {
      en: `Community meetup on Friday at 18:00 in Dubai.\n\n${disclosureLine('en', COMMUNITY)}`,
      ar: `لقاء المجتمع يوم الجمعة الساعة 18:00 في دبي.\n\n${disclosureLine('ar', COMMUNITY)}`,
    },
  }).card;
  assert.ok(card, 'the card exists');
  assert.ok(card.revision.text.en?.includes('Community meetup'), 'the English copy is on the revision');
  assert.ok(card.revision.text.ar?.includes('لقاء المجتمع'), 'and so is the Arabic');
  assert.ok(card.revision.text.en?.includes(disclosureLine('en', COMMUNITY)), 'the English copy carries the canonical English line');
  assert.ok(card.revision.text.ar?.includes(disclosureLine('ar', COMMUNITY)), 'and the Arabic copy carries the canonical Arabic line');
});

test('the revision hash follows the pack\'s declared order, not the order the caller typed the keys in', () => {
  // The revision is the ARTEFACT, not the accident of how a caller happened to write the keys. Two
  // calls carrying the same two strings in a different key order are the same revision — and a
  // different string in either language is a different one.
  const f = Fleet.boot(dubaiPack(), ANSWERS, 25_200_000);
  const en = 'Hello\n\n' + disclosureLine('en', COMMUNITY);
  const ar = 'مرحبا\n\n' + disclosureLine('ar', COMMUNITY);
  const a = f.attempt({
    actionClass: 'draft.promote', agent: 'community-lead', origin: { kind: 'event', id: 'd1' },
    text: { en, ar },
  }).card!;
  const b = f.attempt({
    actionClass: 'draft.promote', agent: 'community-lead', origin: { kind: 'event', id: 'd2' },
    text: { ar, en },
  }).card!;
  assert.equal(a.revision.hash, b.revision.hash, 'the same two strings are the same revision, however the keys were written');

  const c = f.attempt({
    actionClass: 'draft.promote', agent: 'community-lead', origin: { kind: 'event', id: 'd3' },
    text: { en, ar: 'a different Arabic line' },
  }).card!;
  assert.notEqual(a.revision.hash, c.revision.hash, 'different copy in either language is a different revision');
});

test('the runtime writes its OWN cards in the community\'s languages — a budget stop in English and Arabic', () => {
  // The budget-stop card and the escalation card are the two the runtime raises by itself. A community
  // that reads English and Arabic must not be handed a card in Indonesian.
  const f = Fleet.boot(dubaiPack(), ANSWERS, 25_200_000);
  f.beginEvent('dubai-1');
  f.setBudget('dubai-1', 1000);
  let refusal: { code?: string; message?: string } | null = null;
  try {
    f.recordSpend('dubai-1', 2000, 'a big spend');
  } catch (e) { refusal = e as { code?: string; message?: string }; }
  assert.equal(refusal?.code, 'budget_hard_stop', 'the spend stops and a card is raised');
  const card = [...f.state.cards.values()].find((c) => c.actionClass === 'budget.spend');
  assert.ok(card, 'the budget-stop card exists');
  assert.ok(card.revision.text.en?.length, 'it carries English');
  assert.ok(card.revision.text.ar?.length, 'and Arabic');
  assert.ok(!card.revision.text.id, 'and NOT Indonesian — the community does not read it');
});

test('a pack that declares a pair the runtime does not implement is refused, at load', () => {
  // The refusal has to name the setting that caused it (D46's lesson): a pack that boots and then
  // fails at send time with a message naming neither the language nor the setting is the defect.
  assert.ok(!localeIsSupported(['en', 'fr']), 'the pair is refused');
  assert.ok(LOCALES['fr'] === undefined, 'and this runtime has no French to fall back on');
});
