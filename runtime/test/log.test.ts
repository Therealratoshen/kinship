import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { answersDigest, deepEqualState, seqProblems } from '../src/log.ts';
import { makePack } from './helpers.ts';
import {disclosureLine} from '../src/disclosure.ts';

const DAY = 25_200_000; // 07:00 UTC = 14:00 WIB

const ANSWERS = {
  community_name: 'AI Builders ID',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser',
  partner_policy: 'Kopdar Sebelah + baris disclosure',
};

const thePack = () => makePack({
  engagement: { 'draft.promote': 'draft', 'remind.member': 'opt-in-auto' },
});

/** A run that touches members, cards, an approval, an authorization and a refusal. */
function aRun(): Fleet {
  const f = Fleet.boot(thePack(), ANSWERS, DAY);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.beginEvent('kopdar-12');
  const promo = f.attempt({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, phase: 'promoting',
    text: { id: `Promo.\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `Promo.\n\n${disclosureLine('en', ANSWERS.community_name)}` },
  });
  f.decideCard(promo.card!.id, { verdict: 'approve', by: 'organiser', why: 'tanggal sudah benar' });
  assert.throws(() => f.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, phase: 'promoting',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', text: { id: 'x', en: 'y' },
  }), /grant_not_found/); // refused — no live grant, and the refusal is logged
  return f;
}

test('a log written by the fleet verifies clean against the state the fleet holds', () => {
  const live = aRun();
  const v = Fleet.verifyLog(live.events, ANSWERS, thePack(), { state: live.state });
  assert.equal(v.ok, true, `expected a clean verification, got: ${v.problems.map((p) => p.detail).join('; ')}`);
  assert.equal(v.rows, live.events.length);
  assert.equal(v.firstSeq, 1);
  assert.equal(v.lastSeq, live.events.length);
});

test('a deleted row is caught by the dense-seq check — no crypto needed to see a gap', () => {
  const live = aRun();
  const rows = live.events.filter((e) => e.seq !== 2);
  const v = Fleet.verifyLog(rows, ANSWERS, thePack());
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.kind === 'seq_missing'), 'a gap in seq is a deleted row');
});

test('a copied row is caught', () => {
  const live = aRun();
  const rows = [...live.events, live.events[1]!];
  const v = Fleet.verifyLog(rows, ANSWERS, thePack());
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.kind === 'seq_duplicate'), 'the same seq twice is a copied row');
});

test('a row whose folded field was edited is caught by the state comparison', () => {
  const live = aRun();
  const rows = live.events.map((e) => (e.type === 'MemberRegistered' ? { ...e, member: { ...e.member, tz: 'Europe/Berlin' } } : e));
  const v = Fleet.verifyLog(rows, ANSWERS, thePack(), { state: live.state });
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.kind === 'state_mismatch'), 'an edited field that folds changes the state, and the state is compared');
});

test('a config that changed under the log is caught by the answers digest', () => {
  const live = aRun();
  const digest = answersDigest(ANSWERS);
  const v = Fleet.verifyLog(live.events, { ...ANSWERS, escalation_contact: 'someone-else' }, thePack(), { answersDigest: digest });
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.kind === 'answers_digest_mismatch'), 'the manifest digest and the answers under it must agree');
});

test('a deleted row is caught by density, and an EDITED refusal row is not — the tier-1 limit, pinned', () => {
  // Two different things, and the difference is the whole reason tier 2 exists:
  //  - deleting a refusal row leaves a GAP in `seq`, which density catches with no crypto at all;
  //  - editing that row in place (rewriting its `code`) folds to the same state, because
  //    `CommitRefused` folds to nothing — "the log entry is the record; nothing else derives from
  //    it" — so tier 1 cannot see it. A refusal is the row a fleet most wants to be honest about,
  //    so this limit is stated rather than left to be discovered: tier 2, a per-row digest chain,
  //    is the tier that would catch it.
  const live = aRun();
  const refused = live.events.filter((e) => e.type === 'CommitRefused');
  assert.equal(refused.length, 1, 'the fixture must actually refuse something');

  const deleted = live.events.filter((e) => e.seq !== 2);
  const v1 = Fleet.verifyLog(deleted, ANSWERS, thePack(), { state: live.state });
  assert.equal(v1.ok, false, 'a deleted row leaves a gap, and the gap is visible');
  assert.ok(v1.problems.some((p) => p.kind === 'seq_missing'), 'a gap in seq is the deleted row');

  const edited = live.events.map((e) => (e.type === 'CommitRefused' ? { ...e, code: 'grant_not_found' } : e));
  const v2 = Fleet.verifyLog(edited, ANSWERS, thePack(), { state: live.state });
  assert.equal(v2.ok, true, 'tier 1 cannot see an edited refusal — and that is the documented limit, not a bug');
});

test('the answers digest is stable under key order and changes with a value', () => {
  assert.equal(answersDigest({ a: '1', b: '2' }), answersDigest({ b: '2', a: '1' }), 'the order the operator wrote them in must not change the digest');
  assert.notEqual(answersDigest({ a: '1' }), answersDigest({ a: '2' }), 'a changed answer must change the digest');
});

test('the digest does not leak the values it covers', () => {
  const digest = answersDigest({ escalation_contact: 'organiser' });
  assert.ok(!digest.includes('organiser'), 'the digest is a fingerprint, not the answer');
});

test('deep equality treats an absent key and an undefined value as the same', () => {
  assert.equal(deepEqualState({ a: 1, b: undefined }, { a: 1 }), true, 'a field the fold omits is not a mismatch');
  assert.equal(deepEqualState({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(deepEqualState(new Map([['k', { x: 1 }]]), new Map([['k', { x: 1 }]])), true, 'maps compare by value, not by reference');
  assert.equal(deepEqualState(new Map([['k', { x: 1 }]]), new Map([['k', { x: 2 }]])), false);
});

test('the seq checker names a row that is not a number', () => {
  const problems = seqProblems([{ seq: 'one' } as never]);
  assert.equal(problems.length, 1);
  assert.equal(problems[0]!.kind, 'seq_out_of_order');
});
