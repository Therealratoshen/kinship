/**
 * The daily digest — the read a community manager opens the app with.
 *
 * The rules it holds, each with a test that can fail:
 *
 *  1. **A digest is a READ.** It appends nothing, and the state it reads is unchanged afterwards.
 *  2. **It counts only the window, and it says the window.** The start and the end are in the result,
 *     and a row outside the window is not counted.
 *  3. **It never names a member.** The digest travels — a manager forwards it — so a member identifier
 *     in it would travel further than the log it came from.
 *  4. **It says what it cannot attribute.** A refusal and a thread carry no event id in the log, so
 *     they are counted once, globally, and the result says so. A digest that quietly puts a global
 *     number in a per-channel column lies by layout.
 *  5. **It says what it cannot see.** It is the FLEET's day, not the community's chatter — the runtime
 *     has no visibility into a conversation between members, and the digest must not pretend to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveDigest } from '../src/digest.ts';
import { Fleet } from '../src/engine.ts';
import { disclosureLine } from '../src/disclosure.ts';
import { makePack } from './helpers.ts';
import type { Packed } from '../src/types.ts';

const DAY = 25_200_000;
const HOUR = 3_600_000;

const ANSWERS = {
  community_name: 'AI Builders ID',
  schedule: 'every other Saturday',
  venue_source: 'manual',
  sponsor_list: 'none yet',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser',
  rsvp_source_of_truth: 'google form',
  partner_policy: 'Kopdar Sebelah saja',
};

/** The copy carries the canonical disclosure line — a member-facing send must. */
const COPY = {
  id: `halo\n\n${disclosureLine('id', ANSWERS.community_name)}`,
  en: `hello\n\n${disclosureLine('en', ANSWERS.community_name)}`,
};

const PACK: Packed = makePack({
  'event-ops': { 'draft.reminder': 'draft' },
  engagement: { 'draft.promote': 'draft' },
});

/** A fleet that has done two channels' worth of work, with one refusal and one open thread. */
function aDay(): { fleet: Fleet; pack: Packed } {
  const pack = PACK;
  const fleet = Fleet.boot(pack, ANSWERS, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');

  // Channel 1: a draft the organiser approved.
  const a = fleet.attempt({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-1' },
    phase: 't-minus-1', text: { id: 'halo', en: 'hello' },
  });
  assert.ok(a.card);
  fleet.decideCard(a.card.id, { verdict: 'approve', by: 'organiser', why: 'tanggal sudah benar' });

  // Channel 2: a draft the organiser rejected.
  const b = fleet.attempt({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-2' },
    phase: 'promoting', text: { id: 'halo', en: 'hello' },
  });
  assert.ok(b.card);
  fleet.decideCard(b.card.id, { verdict: 'reject', by: 'organiser', why: 'terlalu awal' });

  // A refusal — and a refusal carries NO event id, which is the whole of rule 4. A grant is needed
  // so the refusal is the TRANSPORT gate and not "no grant" — the code we want to show is the one
  // that fires last.
  fleet.issueGrant({ actionClass: 'draft.promote', kind: 'allow_always', scope: 'the digest fixture', by: 'organiser' });
  assert.throws(() => fleet.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-1' },
    recipients: ['wa:62811'], onBehalfOf: 'organiser', text: COPY,
  }), /no_transport/);

  // A thread the community still owes an answer to.
  fleet.openThread({ memberRef: 'wa:62811', pointer: 'msg-42' });
  return { fleet, pack };
}

const digestOf = (fleet: Fleet, pack: Packed, now: number, windowMs: number) =>
  deriveDigest({ events: fleet.events, state: fleet.state, pack, now, windowMs });

test('the digest is a READ — it appends nothing and the state is unchanged', () => {
  const { fleet, pack } = aDay();
  const before = fleet.events.length;
  const seq = fleet.state.seq;
  const d = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  assert.equal(fleet.events.length, before, 'a digest writes no rows');
  assert.equal(fleet.state.seq, seq, 'and the state does not move');
  assert.ok(d.totals.drafts > 0);
});

test('the digest says its window, and counts only what is in it', () => {
  const { fleet, pack } = aDay();
  const inside = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  assert.equal(inside.from, DAY + HOUR - 24 * HOUR);
  assert.equal(inside.to, DAY + HOUR);
  assert.equal(inside.totals.drafts, 2, 'both drafts are in the window');

  // A window that closed before the work happened counts nothing.
  const before = digestOf(fleet, pack, DAY - HOUR, 24 * HOUR);
  assert.equal(before.totals.drafts, 0, 'a row outside the window is not counted');
  assert.equal(before.totals.approved, 0);
});

test('the digest is per channel, and a channel is the event the fleet acted in', () => {
  const { fleet, pack } = aDay();
  const d = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  const kopdar1 = d.channels.find((c) => c.channel === 'kopdar-1');
  const kopdar2 = d.channels.find((c) => c.channel === 'kopdar-2');
  assert.ok(kopdar1 && kopdar2, 'both channels are named');
  assert.equal(kopdar1.drafts, 1);
  assert.equal(kopdar1.approved, 1);
  assert.equal(kopdar2.drafts, 1);
  assert.equal(kopdar2.rejected, 1);
});

test('a refusal is counted once, globally — the log carries no event id on it', () => {
  const { fleet, pack } = aDay();
  const d = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  assert.equal(d.totals.refusals, 1);
  assert.equal(d.refusalsByCode.no_transport, 1);
  // And NO channel claims it, because claiming it would be a number the log cannot support.
  const claimed = d.channels.filter((c) => (c as unknown as { refusals?: unknown }).refusals !== undefined);
  assert.equal(claimed.length, 0, 'no per-channel refusal column — the log cannot support one');
  assert.ok(d.notMeasured.some((n) => n.includes('refusal')), 'and the digest says so');
});

test('an open thread is counted once, globally — the log carries no event id on it either', () => {
  const { fleet, pack } = aDay();
  const d = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  assert.equal(d.totals.openThreads, 1);
  assert.ok(d.notMeasured.some((n) => n.includes('thread')));
});

test('the digest never names a member', () => {
  const { fleet, pack } = aDay();
  const d = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  const text = JSON.stringify(d);
  assert.equal(text.includes('wa:62811'), false, 'a digest is a document a manager forwards');
  assert.equal(text.includes('62811'), false);
});

test('the digest says what it cannot see — it is the FLEET\'s day, not the community\'s chatter', () => {
  const { fleet, pack } = aDay();
  const d = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  assert.ok(d.scope.includes('NOT a summary of what members said to each other'), d.scope);
  assert.ok(d.notMeasured.some((n) => n.includes('what members said to each other')));
  assert.ok(d.notMeasured.some((n) => n.includes('sentiment')));
});

test('the digest says what is waiting on a human right now — and an APPROVED card is still waiting', () => {
  const { fleet, pack } = aDay();
  const d = digestOf(fleet, pack, DAY + HOUR, 24 * HOUR);
  // Both cards were decided, so nothing is waiting on a VERDICT. But the approved card became a
  // HANDOFF — "deliver it by hand, phase 1 ships no transport" — and the one-send authorization is
  // still live. **An approved card is not done; it is waiting for a human to carry it.** That is
  // exactly the thing a community manager must not miss, so the digest counts it.
  assert.equal(d.waiting, 1);
  assert.equal(d.totals.approved, 1);
  assert.equal(d.totals.rejected, 1);
});
