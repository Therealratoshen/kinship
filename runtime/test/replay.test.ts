import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import {disclosureLine} from '../src/disclosure.ts';

const DAY = 25_200_000; // 07:00 UTC = 14:00 WIB

const ANSWERS = {
  community_name: 'AI Builders ID',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser',
  partner_policy: 'Kopdar Sebelah + baris disclosure',
};

const newFleet = () => Fleet.boot(thePack(), ANSWERS, DAY);

const thePack = () => makePack({
  engagement: { 'draft.promote': 'draft', 'remind.member': 'opt-in-auto', 'recap.assemble': 'opt-in-auto' },
  growth: { 'promote.cross-community': 'opt-in-auto' },
});

/**
 * A kitchen-sink run touching every applier: members, suppression, grants, cards, edits,
 * authorizations, refused commits, executed commits, phases, claims, checkouts, wakes,
 * budgets, shatter, member input, escalation. Then: fold the log, demand deep-equality.
 * section 1.2 is a property claim, so the test runs the widest scenario the module can express.
 */
function runKitchenSink(): Fleet {
  const f = newFleet();
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.registerMember('wa:62822', 'Asia/Jakarta');
  f.suppressMember('wa:62822', 'member');
  f.beginEvent('kopdar-12');
  f.completePhase('kopdar-12'); // draft completes
  f.transitionPhase('kopdar-12', 'scheduled');
  f.completePhase('kopdar-12'); // scheduled completes
  f.transitionPhase('kopdar-12', 'promoting');
  f.claimPhaseOrigin('kopdar-12', 'event', 'kopdar-12', 'promoting', 'engagement');
  f.checkoutEvent('kopdar-12', 'engagement');
  f.scheduleWake({ purpose: 'chase no-shows', nextCheckAt: DAY + 86_400_000, eventId: 'kopdar-12' });
  f.assertWakeBacked('chase no-shows', 'kopdar-12'); // exists → not a ghost watcher

  const input = f.registerInput('wa:62811', 'kak gaboleh gitu, admin tolong');
  const promo = f.attempt({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, phase: 'promoting',
    text: { id: `Promo.\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `Promo.\n\n${disclosureLine('en', ANSWERS.community_name)}` },
  });
  f.decideCard(promo.card!.id, { verdict: 'reject', by: 'organiser', why: 'tanggal salah — ini minggu depan' }); // near-miss kept
  const promo2 = f.attempt({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, phase: 'promoting',
    text: { id: `Promo v2.\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `Promo v2.\n\n${disclosureLine('en', ANSWERS.community_name)}` },
  });
  f.decideCard(promo2.card!.id, { verdict: 'approve', by: 'organiser', why: 'tanggal sudah benar' });
  assert.throws(() => f.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, phase: 'promoting',
    recipients: ['wa:62822'], onBehalfOf: 'organiser', authorizationToken: `auth-${promo2.card!.id}`,
    text: { id: `Promo v2.\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `Promo v2.\n\n${disclosureLine('en', ANSWERS.community_name)}` },
  }), /member_suppressed/); // refusal #1, logged
  assert.throws(() => f.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' },
    recipients: ['wa:62811'], onBehalfOf: 'organiser',
    text: { id: 'x', en: 'y' },
  }), /grant_not_found/); // refusal #2, logged

  const gRecap = f.issueGrant({ actionClass: 'recap.assemble', kind: 'allow_always', scope: 'kopdar-12', by: 'organiser' });
  f.commit({ actionClass: 'recap.assemble', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, phase: 'recap', recipients: [], text: { id: 'internal', en: 'internal' } }); // executes
  f.issueGrant({ actionClass: 'remind.member', kind: 'allow_always', channel: 'telegram', scope: 'kopdar-12 series', by: 'organiser' });
  f.revokeGrant(gRecap.id, 'organiser');

  f.setBudget('kopdar-12', 100_000);
  f.recordSpend('kopdar-12', 85_000, 'draft batch'); // warn fires
  assert.throws(() => f.recordSpend('kopdar-12', 100_000, 'crossing'), /budget_hard_stop/); // stop + card
  assert.throws(() => f.recordSpend('kopdar-12', 1_000, 'after stop'), /budget_hard_stop/); // nothing retries past a stop

  f.tripShatter('telegram', 'wa:62899');
  f.releaseShatter('telegram', 'organiser');
  f.raiseEscalation('two organisers disagree on sponsor tier', 'organiser');
  void input;
  return f;
}

test('replay: folding the event log reproduces live state exactly — section 1.2 is a property, not a promise', () => {
  const live = runKitchenSink();
  const reborn = Fleet.replay(live.events, ANSWERS);
  assert.deepEqual(reborn.state, live.state, 'fold(events) deep-equals the live state — the audit trail is a real replay, not a narrative');
});

test('replay is stable: the reborn fleet\'s log refolds to itself, and seq never moves backwards', () => {
  const live = runKitchenSink();
  const reborn = Fleet.replay(live.events, ANSWERS);
  assert.equal(reborn.state.seq, live.state.seq);
  const refolded = Fleet.replay(reborn.events, ANSWERS);
  assert.deepEqual(refolded.state, reborn.state, 'replay of a replay is the same state — folding is idempotent over the log');
});

test('the replayed fleet keeps governing: a refused attempt on the reborn state throws the same refusal', () => {
  const live = runKitchenSink();
  const reborn = Fleet.replay(live.events, ANSWERS, thePack());
  // The suppressed member is still suppressed in the folded state — governance survives the fold.
  assert.throws(() => reborn.commit({
    actionClass: 'remind.member', agent: 'engagement', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, phase: 't-minus-1',
    recipients: ['wa:62822'], onBehalfOf: 'organiser',
    text: { id: `x\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `y\n\n${disclosureLine('en', ANSWERS.community_name)}` },
  }), /member_suppressed/);
  // And the reborn clock continues where the log left off (quiet hours still judged in member-local time).
  assert.equal(reborn.now(), live.events[live.events.length - 1]!.at);
});
