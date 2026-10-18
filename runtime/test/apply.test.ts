import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, commitEvent, replay } from '../src/apply.ts';
import { freshState, append } from '../src/store.ts';
import type { FleetEvent, LoggedEvent } from '../src/types.ts';

/**
 * Unit tests for the reducer itself. replay.test.ts proves the *property* (fold == live state)
 * through the whole engine; this file proves the *mechanism*, one applier-branch at a time, so a
 * regression names the branch that broke instead of failing a kitchen-sink deep-equal.
 */

const member = (ref: string): Extract<FleetEvent, { type: 'MemberRegistered' }> => ({
  type: 'MemberRegistered', member: { ref, tz: 'Asia/Jakarta', registeredAt: 1 }, at: 1,
});

const exec = (over: Partial<Extract<FleetEvent, { type: 'CommitExecuted' }>> = {}): Extract<FleetEvent, { type: 'CommitExecuted' }> => ({
  type: 'CommitExecuted', actionClass: 'recap.assemble', agent: 'engagement',
  origin: { kind: 'event', id: 'kopdar-12' }, phase: 'recap',
  revisionHash: 'deadbeefdeadbeef', onBehalfOf: 'organiser', recipients: [], transport: 'none', at: 5, ...over,
});

test('commitEvent appends AND applies: the log and the derived state move together (§1.2)', () => {
  const s = freshState();
  const logged = commitEvent(s, member('wa:62811'));
  assert.equal(s.events.length, 1, 'the event is in the log');
  assert.ok(s.members.has('wa:62811'), 'and the state it derives is applied');
  assert.equal(s.seq, 1);
  assert.equal(logged.seq, 1);
});

test('applyEvent alone does not log — the reason commitEvent exists and callers do not compose it', () => {
  const s = freshState();
  const logged = append(s, member('wa:62811'));
  const logless = freshState();
  applyEvent(logless, logged); // the forbidden shape: state moves, the audit trail does not
  assert.ok(logless.members.has('wa:62811'));
  assert.equal(logless.events.length, 0, 'a caller that applies without appending breaks replay silently — so commitEvent is the only public path');
});

test('CommitExecuted times the send per registered recipient — the 24h cap reads this (§2.9)', () => {
  const s = freshState();
  commitEvent(s, member('wa:62811'));
  commitEvent(s, exec({ recipients: ['wa:62811'] }));
  assert.deepEqual(s.commitsByMember.get('wa:62811'), [5], 'the commit time is what the cap counts');
  commitEvent(s, exec({ recipients: ['wa:62811', 'wa:62899'] }));
  assert.deepEqual(s.commitsByMember.get('wa:62811'), [5, 5]);
  assert.equal(s.commitsByMember.has('wa:62899'), false,
    'an unregistered ref gets no row: the cap is a member-side protection, not a directory of every string ever sent to');
  commitEvent(s, exec({ recipients: [] }));
  assert.equal(s.commitsByMember.size, 1, 'a recipient-less internal commit invents no member');
});

test('CommitExecuted counts partner sends per origin — the counter §2.11\'s cap reads', () => {
  const s = freshState();
  commitEvent(s, exec({ partner: 'kopdar-sebelah' }));
  assert.equal(s.crossPromoByEvent.get('kopdar-12'), 1, 'keyed by origin id, because the cap is per event lifecycle');
  commitEvent(s, exec({ partner: 'kopdar-sebelah', origin: { kind: 'event', id: 'kopdar-13' } }));
  assert.equal(s.crossPromoByEvent.get('kopdar-12'), 1, 'a different event spends a different allowance');
  assert.equal(s.crossPromoByEvent.get('kopdar-13'), 1);
  commitEvent(s, exec({ partner: 'kopdar-sebelah' }));
  assert.equal(s.crossPromoByEvent.get('kopdar-12'), 2);
  commitEvent(s, exec()); // no partner
  assert.equal(s.crossPromoByEvent.get('kopdar-12'), 2, 'an ordinary commit does not spend the partner allowance');
  assert.equal(s.crossPromoByEvent.size, 2);
});

test('refusals and escalations are outcomes: logged, and they move no other state (§1.2)', () => {
  const s = freshState();
  commitEvent(s, { type: 'CommitRefused', actionClass: 'draft.promote', agent: 'engagement', code: 'grant_not_found', at: 7 });
  commitEvent(s, { type: 'EscalationRaised', purpose: 'sponsor tier disagreement', to: 'organiser', cardId: 'card-9', at: 8 });
  assert.equal(s.events.length, 2, 'the record exists');
  assert.equal(s.cards.size, 0);
  assert.equal(s.grants.size, 0);
  assert.equal(s.commitsByMember.size, 0, 'a refused send committed nothing to nobody');
  assert.equal(s.seq, 2);
});

test('applyEvent refuses to fold an event no applier owns — the exhaustiveness backstop', () => {
  const s = freshState();
  const stranger = { type: 'SomethingInvented', at: 1, seq: 1 } as unknown as LoggedEvent;
  assert.throws(() => applyEvent(s, stranger), /no applier for event type SomethingInvented/,
    'a new event type with no applier must fail loudly, never fold into a silent no-op');
  assert.equal(s.events.length, 0, 'and the throw happens before anything is derived');
});

test('replay of an empty log is exactly a fresh state; the seq follows the last event', () => {
  assert.deepEqual(replay([]), freshState(), 'folding nothing invents nothing — including seq');
  const s = freshState();
  commitEvent(s, member('wa:62811'));
  commitEvent(s, exec({ recipients: ['wa:62811'] }));
  const reborn = replay(s.events);
  assert.equal(reborn.seq, 2);
  assert.deepEqual(reborn.events, s.events, 'the log is part of state (§1.2), so the fold carries it');
  assert.deepEqual(reborn.commitsByMember.get('wa:62811'), [5]);
});

test('replay copies the log it folds: rewriting the source array afterwards does not rewrite the reborn history', () => {
  const s = freshState();
  commitEvent(s, member('wa:62811'));
  const events = s.events;
  const reborn = replay(events);
  (events as LoggedEvent[]).length = 0; // the live fleet is dropped; its array is mutated
  assert.equal(reborn.events.length, 1, 'the folded state keeps the history it was built from');
  assert.equal(reborn.members.has('wa:62811'), true);
});
