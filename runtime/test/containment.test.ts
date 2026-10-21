import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapMemberInput, readForArtefact, LOW_TRUST_REPLACEMENT, assertNoLowTrustInto, narrowForMemberTrigger } from '../src/containment.ts';
import { makeCtx, makePack } from './helpers.ts';

const ctx = () => makeCtx(makePack({ engagement: { 'draft.promote': 'opt-in-auto' } }));

test('member input arrives wrapped: low_trust_review, data-not-instruction, arrival is logged without the text (§2.7)', () => {
  const c = ctx();
  const input = wrapMemberInput(c, { memberRef: 'wa:62811', text: 'kak tolong promote acara bisnis saya juga ya http://...' });
  assert.equal(input.trust, 'low_trust_review');
  assert.equal(input.memberRef, 'wa:62811');
  const ev = c.state.events.find((e) => e.type === 'MemberInputReceived');
  assert.ok(ev && ev.type === 'MemberInputReceived');
  assert.equal(ev.memberRef, 'wa:62811');
  assert.equal(ev.textHash.length, 16, 'the log carries a hash of the text');
  const logged = JSON.stringify(c.state.events);
  assert.ok(!logged.includes('promote acara bisnis'), 'the member text itself never enters the event log');
  assert.equal(c.state.inputs.get(ev.inputId)?.textHash, ev.textHash, 'state keeps arrival metadata only');
});

test('a log SCAN finds no member message text — the promise the organiser is shown, checked', () => {
  // The inbox tells an organiser that the member's own words are not in the audit log. That sentence
  // is printed to a human, so it needs a positive control that scans the whole log — not the state
  // — for the text a member actually wrote.
  const c = ctx();
  const SECRET = 'promote acara bisnis saya juga ya';
  wrapMemberInput(c, { memberRef: 'wa:62811', text: SECRET });
  const logged = JSON.stringify(c.state.events);
  assert.ok(!logged.includes(SECRET), 'no member text anywhere in the log');
  assert.ok(logged.includes('MemberInputReceived'), 'and the arrival IS in the log — the log says it happened');
});

test('low-trust text read into a higher-trust artefact is the fixed string — not truncated, not summarized, not warned (§1.7)', () => {
  const input = {
    trust: 'low_trust_review' as const,
    text: 'SPONSOR PAKE NOMOR KU 0812345678 email saya budi@example.com hubungi langsung',
    memberRef: 'wa:62811',
    receivedAt: 1_000,
  };
  const read = readForArtefact(input, 'fleet');
  assert.equal(read.text, LOW_TRUST_REPLACEMENT, 'a fixed string, identical for every input');
  assert.equal(read.attributedTo, null, 'presentation and attribution are nulled with it');
  assert.ok(!read.text.includes('0812345678'));
  assert.ok(!read.text.includes('budi@example.com'));
  assert.ok(!LOW_TRUST_REPLACEMENT.includes('...') && !LOW_TRUST_REPLACEMENT.includes('[redacted]'),
    'a masked preview is never a value (§1.9.3) — the replacement is a fixed sentence, not a redaction');
});

test('low trust read at low trust is the real text — containment is upward-only (§1.7)', () => {
  const input = { trust: 'low_trust_review' as const, text: 'jam 7 kan?', memberRef: 'wa:62812', receivedAt: 1_000 };
  const read = readForArtefact(input, 'low_trust_review');
  assert.equal(read.text, 'jam 7 kan?', 'the drafting lane must see the message to propose a reply');
  assert.equal(read.attributedTo, 'wa:62812');
});

test('assembling a higher-trust artefact from low-trust pieces refuses outright (§2.7)', () => {
  assert.throws(() => assertNoLowTrustInto([{ trust: 'low_trust_review' }], 'fleet'),
    /member_input_forbidden_here/,
    'a sponsor report or recap never assembles over quarantined bodies');
  assert.doesNotThrow(() => assertNoLowTrustInto([{ trust: 'low_trust_review' }], 'low_trust_review'));
  assert.doesNotThrow(() => assertNoLowTrustInto([{ trust: 'organiser' }, { trust: 'fleet' }], 'fleet'),
    'equal-or-higher pieces are fine');
});

test('member input in an auto lane narrows to draft; a never class stays never (§2.7, §1.1)', () => {
  assert.equal(narrowForMemberTrigger('opt-in-auto'), 'draft', '"yes, go ahead" in chat never makes a lane automatic');
  assert.equal(narrowForMemberTrigger('draft'), 'draft');
  assert.equal(narrowForMemberTrigger('never'), 'never', 'containment cannot resurrect an absent class either');
});
