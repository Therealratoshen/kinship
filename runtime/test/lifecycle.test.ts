import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginEvent, transitionPhase, completePhase, claimPhaseOrigin, checkoutEvent, scheduleWake, fireWake, assertWakeBacked } from '../src/lifecycle.ts';
import { makeCtx, makePack } from './helpers.ts';
import { PHASES } from '../src/types.ts';

const ctx = () => makeCtx(makePack({ 'event-ops': { 'draft.reminder': 'draft' } }));

test('an event starts at draft and may only move through the immediate successor (pack lifecycle)', () => {
  const c = ctx();
  beginEvent(c, 'kopdar-12');
  assert.throws(() => transitionPhase(c, 'kopdar-12', 'running'), /phase_sequence_violated/,
    't-minus-7 and t-minus-1 exist because "did we already remind them?" must be a lookup, not a judgement call');
  completePhase(c, 'kopdar-12', 'draft');
  transitionPhase(c, 'kopdar-12', 'scheduled');
  completePhase(c, 'kopdar-12', 'scheduled');
  transitionPhase(c, 'kopdar-12', 'promoting');
  assert.equal(c.state.phases.get('kopdar-12')?.current, 'promoting');
});

test('a phase cannot be entered without its predecessor completing (pack skill assertion)', () => {
  const c = ctx();
  beginEvent(c, 'kopdar-12');
  assert.throws(() => transitionPhase(c, 'kopdar-12', 'scheduled'), /phase_sequence_violated/,
    '`draft` has no completing verdict yet');
  completePhase(c, 'kopdar-12', 'draft');
  transitionPhase(c, 'kopdar-12', 'scheduled');
  assert.throws(() => transitionPhase(c, 'kopdar-12', 'promoting'), /phase_sequence_violated/);
  completePhase(c, 'kopdar-12', 'scheduled');
  transitionPhase(c, 'kopdar-12', 'promoting'); // now legal
});

test('closed is terminal — nothing re-enters a finished event loop', () => {
  const c = ctx();
  beginEvent(c, 'kopdar-12');
  const rest = ['scheduled', 'promoting', 't-minus-7', 't-minus-1', 'running', 'recap', 'report', 'closed'] as const;
  let guard = 0;
  while (c.state.phases.get('kopdar-12')?.current !== 'closed' && guard < 20) {
    guard += 1;
    const current = c.state.phases.get('kopdar-12')?.current;
    if (current === null || current === undefined) break;
    completePhase(c, 'kopdar-12', current);
    const idx = PHASES.indexOf(current);
    const next = PHASES[idx + 1];
    if (next === undefined) break;
    transitionPhase(c, 'kopdar-12', next);
  }
  assert.equal(c.state.phases.get('kopdar-12')?.current, 'closed');
  assert.throws(() => transitionPhase(c, 'kopdar-12', 'running'), /phase_sequence_violated/);
});

test('single-active-per-origin: a second claim for the same (event, origin, phase) is a 409 that is never retried (section 1.9.4, section 1.4)', () => {
  const c = ctx();
  beginEvent(c, 'kopdar-12');
  claimPhaseOrigin(c, 'kopdar-12', 'rsvp-export', 'sheet-1', 'promoting', 'event-ops');
  assert.throws(() => claimPhaseOrigin(c, 'kopdar-12', 'rsvp-export', 'sheet-1', 'promoting', 'engagement'), /conflict_409/);
  claimPhaseOrigin(c, 'kopdar-12', 'rsvp-export', 'sheet-1', 't-minus-7', 'engagement'); // another phase is a different claim
});

test('exclusive ownership of the event loop: two agents, one 409, and the caller picks different work (section 1.4)', () => {
  const c = ctx();
  beginEvent(c, 'kopdar-12');
  checkoutEvent(c, 'kopdar-12', 'event-ops');
  assert.throws(() => checkoutEvent(c, 'kopdar-12', 'engagement'), /conflict_409/,
    'two agents answering the same loop looks like a bot swarm');
  checkoutEvent(c, 'kopdar-12', 'event-ops'); // re-checkout by the owner is a no-op, not a conflict
});

test('no ghost watchers: "I\'ll follow up Thursday" requires a persisted wake row with nextCheckAt (section 1.3)', () => {
  const c = ctx();
  assert.throws(() => assertWakeBacked(c, 'chase rsvp non-responders'), /ghost_watcher/,
    'prose is not a waiting path');
  const w = scheduleWake(c, { purpose: 'chase rsvp non-responders', nextCheckAt: c.now() + 86_400_000, eventId: 'kopdar-12' });
  assert.doesNotThrow(() => assertWakeBacked(c, 'chase rsvp non-responders'));
  fireWake(c, w.id);
  assert.equal(c.state.wakes.get(w.id)?.attempts, 1, 'the attempts counter exists, so "monitoring" is countable');
});

// --- the wake carries the action it will attempt (D60) ----------------------------------------------------

test('a scheduled wake carries the action it will attempt, and the row records it', () => {
  const c = ctx();
  const w = scheduleWake(c, {
    purpose: 'draft.reminder@t-minus-1:kopdar-12',
    nextCheckAt: c.now() + 86_400_000,
    eventId: 'kopdar-12',
    action: { actionClass: 'draft.reminder', agent: 'event-ops', phase: 't-minus-1', text: { id: 'halo', en: 'hello' } },
  });
  assert.equal(w.action?.actionClass, 'draft.reminder');
  assert.equal(w.action?.phase, 't-minus-1');
  assert.deepEqual(w.action?.text, { id: 'halo', en: 'hello' });
});

test('a wake with no action is still a wake — the promise is unchanged by what it will do', () => {
  const c = ctx();
  const w = scheduleWake(c, { purpose: 'chase rsvp non-responders', nextCheckAt: c.now() + 86_400_000 });
  assert.equal(w.action, undefined);
  assert.doesNotThrow(() => assertWakeBacked(c, 'chase rsvp non-responders'));
});

test('firing a wake returns the row it fired, so the caller can read the action off it', () => {
  const c = ctx();
  const w = scheduleWake(c, { purpose: 'chase rsvp non-responders', nextCheckAt: c.now() + 86_400_000 });
  const fired = fireWake(c, w.id);
  assert.equal(fired?.id, w.id);
  assert.equal(fired?.action, undefined, 'a wake with no action is a timer and nothing more');
  assert.equal(c.state.wakes.get(w.id)?.attempts, 1);
});

test('firing a wake that does not exist returns nothing, and logs nothing', () => {
  const c = ctx();
  const before = c.state.events.length;
  assert.equal(fireWake(c, 'wake-999'), undefined);
  assert.equal(c.state.events.length, before, 'a wake that was never scheduled cannot be fired');
});
