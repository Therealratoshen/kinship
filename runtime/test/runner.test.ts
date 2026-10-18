import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet, type CommitArgs } from '../src/engine.ts';
import { runActions } from '../src/runner.ts';
import { KinshipError } from '../src/errors.ts';
import { makePack } from './helpers.ts';
import { disclosureLineId, disclosureLineEn } from '../src/disclosure.ts';

/**
 * The runner is §1.6's owner of a run. Phase 1's scheduler is the organiser's own Paperclip
 * instance (D10), so this runtime ships only the half that has to be *right*: meter the run, stop
 * at the cap with partial results kept, never retry, and record each refusal as an outcome rather
 * than a crash. It executes commits the caller already holds — it does not invent proposals.
 */

const ANSWERS = {
  community_name: 'AI Builders ID', escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser', partner_policy: 'Kopdar Sebelah + disclosure',
};
const DAY = 25_200_000;

const pack = (maxActions: number) => {
  const p = makePack({ engagement: { 'recap.assemble': 'opt-in-auto', 'remind.member': 'opt-in-auto' } });
  return { ...p, budgets: { ...p.budgets, maxActionsPerRun: maxActions } };
};

const internal = (i: number): CommitArgs => ({
  actionClass: 'recap.assemble', agent: 'engagement',
  origin: { kind: 'event', id: `kopdar-${i}` }, recipients: [], onBehalfOf: 'organiser',
  textId: `Rekap ${i}.\n\n${disclosureLineId(ANSWERS.community_name)}`,
  textEn: `Recap ${i}.\n\n${disclosureLineEn(ANSWERS.community_name)}`,
});

const fleetWithGrant = (maxActions: number) => {
  const f = Fleet.boot(pack(maxActions), ANSWERS, DAY);
  f.issueGrant({ actionClass: 'recap.assemble', kind: 'allow_always', scope: 'all kopdars', by: 'organiser' });
  f.issueGrant({ actionClass: 'remind.member', kind: 'allow_always', channel: 'telegram', scope: 'all kopdars', by: 'organiser' });
  return f;
};

const executedCount = (f: Fleet) => f.state.events.filter((e) => e.type === 'CommitExecuted').length;

test('a run under the cap executes everything it is handed and reports no truncation (§1.6)', () => {
  const f = fleetWithGrant(15);
  const out = runActions(f, [internal(1), internal(2), internal(3)]);
  assert.equal(out.executed, 3);
  assert.equal(out.refused, 0);
  assert.equal(out.dropped, 0);
  assert.equal(out.truncated, false);
  assert.equal(out.cap, 15, 'the cap in the report is the pack\'s, not a constant the runner invented');
  assert.equal(out.actions, 3, 'metered actions = attempted actions');
  assert.equal(executedCount(f), 3, 'and the engine really ran them');
  assert.deepEqual(out.outcomes.map((o) => o.result), ['executed', 'executed', 'executed']);
});

test('the crossing action is dropped, the actions before it stand, and the tail is never attempted (§1.6)', () => {
  const f = fleetWithGrant(3);
  const out = runActions(f, [internal(1), internal(2), internal(3), internal(4), internal(5)]);
  assert.equal(out.executed, 3, 'partial results are kept — truncation is not a rollback');
  assert.equal(executedCount(f), 3);
  assert.equal(out.truncated, true);
  assert.equal(out.dropped, 2, 'two actions did not happen because of the cap');
  assert.equal(out.executed + out.refused + out.dropped, 5, 'the report accounts for every action handed in — nothing vanishes');
  assert.equal(out.actions, 4, 'the meter counts the crossing attempt too — that attempt is what tripped the cap');
  assert.equal(out.outcomes.length, 4, 'one line per action the runner touched: three executed plus the crossing');
  assert.equal(out.outcomes[3]!.result, 'dropped');
  assert.deepEqual(out.notAttempted, [internal(5)], 'the organiser can see exactly what the run did not do — and it will not be retried');
});

test('a refused action is an outcome, not a crash — and it still costs a metered action (§1.2 / §1.6)', () => {
  const f = Fleet.boot(pack(15), ANSWERS, DAY); // no grants at all
  const out = runActions(f, [internal(1), internal(2)]);
  assert.equal(out.executed, 0);
  assert.equal(out.refused, 2);
  assert.equal(out.truncated, false, 'a run of refusals is not a failure of the run cap — the cap bounds work, not disagreement');
  assert.deepEqual([...new Set(out.outcomes.map((o) => o.code))], ['grant_not_found'],
    'the refusal keeps its code, because "why not" is part of the product');
  assert.ok(out.outcomes[0]!.reason!.includes('escalation is earned'), 'and the rule sentence survives into the run report');
  assert.equal(out.actions, 2, 'work attempted is what the cap bounds — a refusal is not free');
  assert.equal(f.state.events.filter((e) => e.type === 'CommitRefused').length, 2, 'the log, not the return value, is the record');
});

test('the runner cannot deliver to a member: every recipient-bearing action refuses at the transport gate (D21)', () => {
  const f = fleetWithGrant(15);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  const out = runActions(f, [{
    actionClass: 'remind.member', agent: 'engagement', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, recipients: ['wa:62811'], onBehalfOf: 'organiser',
    textId: `Ingat kopdar.\n\n${disclosureLineId(ANSWERS.community_name)}`,
    textEn: `Kopdar reminder.\n\n${disclosureLineEn(ANSWERS.community_name)}`,
  }]);
  assert.deepEqual(out.outcomes.map((o) => o.code), ['no_transport'], 'phase 1 sends nothing, and the runner is no way around that');
  assert.equal(out.executed, 0);
});

test('a second call is a second run: an exhausted run stops itself, not the process (§1.6)', () => {
  const f = fleetWithGrant(2);
  const first = runActions(f, [internal(1), internal(2), internal(3)]);
  assert.equal(first.truncated, true);
  const second = runActions(f, [internal(4), internal(5)]);
  assert.equal(second.executed, 2, 'the second run starts clean — a process-wide counter would have refused it');
  assert.equal(second.truncated, false);
  assert.equal(executedCount(f), 4);
});

test('the runner leaves no trace outside the event log: replay still deep-equals (§1.2)', () => {
  const f = fleetWithGrant(3);
  runActions(f, [internal(1), internal(2), internal(3), internal(4)]);
  const reborn = Fleet.replay(f.events, ANSWERS, pack(3));
  assert.deepEqual(reborn.state, f.state, "a run's counter is the runner's memory, not state the fold must reproduce");
});

test('a bug is not swallowed as a refusal: a non-KinshipError leaves the run', () => {
  const f = fleetWithGrant(15);
  const broken = { ...internal(1), recipients: undefined } as unknown as CommitArgs;
  assert.throws(() => runActions(f, [broken, internal(2)]), (e: unknown) => {
    assert.ok(!(e instanceof KinshipError), 'garbage in the arguments is a crash, and a crash is not an outcome row');
    assert.ok(e instanceof TypeError);
    return true;
  });
  assert.equal(executedCount(f), 0, 'the run stopped where the bug was');
  assert.equal(f.state.events.filter((e) => e.type === 'CommitExecuted' || e.type === 'CommitRefused').length, 0,
    'and the log records no bogus outcome for it');
});
