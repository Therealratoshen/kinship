import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setBudget, assertCanSpend, recordSpend, runState, recordRunAction } from '../src/budget.ts';
import { makeCtx, makePack } from './helpers.ts';

const ctx = () => makeCtx(makePack({ 'event-ops': { 'budget.spend': 'opt-in-auto' } }));

test('no ceiling set = no metered spend: the unset budget refuses, fail closed (§1.6, PRD §12-Q9)', () => {
  const c = ctx();
  assert.throws(() => assertCanSpend(c, 'kopdar-12'), /budget_unset/,
    'the field is real and the value is deliberately unset until shadow mode produces a figure');
});

test('warn fires at the ratio (pack default 0.8) before the stop — never silently (§1.6)', () => {
  const c = ctx();
  setBudget(c, 'kopdar-12', 100_000);
  const r1 = recordSpend(c, 'kopdar-12', 79_000, 'drafting batch 1');
  assert.equal(r1.warned, false);
  const r2 = recordSpend(c, 'kopdar-12', 2_000, 'drafting batch 2'); // 81% — over warn
  assert.equal(r2.warned, true);
  assert.ok(c.state.events.some((e) => e.type === 'BudgetWarned'));
});

test('the hard stop is the organiser\'s stop: the spend that would cross it refuses, and the stop is marked (§1.6, FR-1.12)', () => {
  const c = ctx();
  setBudget(c, 'kopdar-12', 100_000);
  recordSpend(c, 'kopdar-12', 79_000, 'recap assembly'); // 79% — under warn
  assert.doesNotThrow(() => assertCanSpend(c, 'kopdar-12'), 'headroom exists before the crossing');
  assert.throws(() => recordSpend(c, 'kopdar-12', 100_000, 'would cross'), /budget_hard_stop/);
  assert.throws(() => assertCanSpend(c, 'kopdar-12'), /budget_hard_stop/, 'the refused spend still marks the stop');
  assert.throws(() => recordSpend(c, 'kopdar-12', 1_000, 'one more'), /budget_hard_stop/, 'nothing retries past a stop');
});

test('a hard stop never silently drops a scheduled phase — it raises a card (§1.6, pack skill event-lifecycle)', () => {
  const c = ctx();
  setBudget(c, 'kopdar-12', 100_000);
  assert.throws(() => recordSpend(c, 'kopdar-12', 150_000, 'big batch'), /budget_hard_stop/);
  const stopCard = [...c.state.cards.values()].find((x) => x.forcedBy === 'budget_hard_stop');
  assert.ok(stopCard, 'the card exists');
  assert.ok(stopCard && stopCard.revision.textId.includes('Rp 150000') && stopCard.revision.textId.includes('plafon'),
    'the card names the rupiah figure and the ceiling, not a token count');
  assert.ok(c.state.events.some((e) => e.type === 'BudgetStopRaised'));
});

test('the stop is event-scoped: exhausting one event\'s budget does not pause another (§1.6)', () => {
  const c = ctx();
  setBudget(c, 'kopdar-12', 100_000);
  setBudget(c, 'kopdar-13', 100_000);
  assert.throws(() => recordSpend(c, 'kopdar-12', 120_000, 'overspend on purpose'), /budget_hard_stop/,
    'the crossing spend refuses AND marks the stop (same contract as test 3)');
  assert.throws(() => assertCanSpend(c, 'kopdar-12'), /budget_hard_stop/);
  assert.doesNotThrow(() => assertCanSpend(c, 'kopdar-13'));
});

test('exceeding max_actions_per_run truncates the run: partial kept, no retry storm (§1.6, pack = 15)', () => {
  const c = ctx();
  for (let i = 0; i < 15; i++) recordRunAction(c);
  assert.equal(runState(c).truncated, false, 'action 15 is the last one the run may take');
  recordRunAction(c);
  assert.equal(runState(c).truncated, true);
  assert.throws(() => recordRunAction(c), /run_truncated/, 'no retry storm — the run ends, partial results kept');
});
