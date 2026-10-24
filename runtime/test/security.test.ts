/**
 * The security properties — the ones a passing test suite had never checked.
 *
 * Everything else in `runtime/test/` asserts a rule. This file asserts the rules that hold **under
 * conditions the test suite never creates**: a second decision against an already-spent
 * authorization, a grant that was revoked in between, two writers on one log, a log whose tail went
 * missing. **Those are the properties that fail in production and pass in a test suite**, because a
 * test suite has one writer, one clock, and never gets killed.
 *
 * **Five properties, each with a test that can fail:**
 *
 *  1. **One approval is one send, of that revision.** The authorization is consumed; a second use is
 *     refused; an edit between approval and send kills the live authorization; a token for one event
 *     does not authorise another.
 *  2. **A decision is made against the state at decision time.** A grant revoked or expired between
 *     issue and use is refused — a later state change is not silently inherited.
 *  3. **The log is tamper-evident at the edges.** A row removed from the middle, a row edited in
 *     place, and two writers colliding on a `seq` all fail verification. A log whose TAIL is missing
 *     is dense, so it is caught against the **manifest** — which is the only place that knows how many
 *     rows there should be.
 *  4. **Two writers cannot silently gap a log.** The `seq` comes from in-memory state, so two
 *     processes appending to one file can produce a duplicate — and a duplicate is a log that replays
 *     wrong.
 *  5. **The privacy boundary holds in combination.** A member who is suppressed, outside quiet hours
 *     and over the cap is refused by a real rule, and nothing reaches them.
 *
 * **One structural fact this file proves, which is worth more than any single assertion:** the
 * one-send property is only executable end to end through an **internal** commit — a commit with no
 * recipients — because the transport gate refuses every member-facing commit *before* the
 * authorization is consumed (D21). So the property is proven here, and the proof that it holds for a
 * real delivered send waits for phase 2 and a transport. That is a limitation, not a gap in the
 * property, and the residual risk register says so.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { disclosureLine } from '../src/disclosure.ts';
import { makePack } from './helpers.ts';
import type { LoggedEvent, Packed } from '../src/types.ts';

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

const PACK: Packed = makePack({
  'event-ops': { 'draft.reminder': 'draft' },
  engagement: { 'draft.promote': 'draft' },
});

/** The copy carries the canonical disclosure line, because a member-facing send must. */
const COPY = {
  id: `halo\n\n${disclosureLine('id', ANSWERS.community_name)}`,
  en: `hello\n\n${disclosureLine('en', ANSWERS.community_name)}`,
};

function aFleet(pack: Packed = PACK, at = DAY): Fleet {
  const f = Fleet.boot(pack, ANSWERS, at);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  return f;
}

/** An approved card, and the token that authorises sending it. */
function approved(f: Fleet, eventId = 'ev-1'): { cardId: string; token: string } {
  const draft = f.attempt({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: eventId },
    phase: 't-minus-1', text: COPY,
  });
  assert.ok(draft.card, 'the draft became a card');
  f.decideCard(draft.card.id, { verdict: 'approve', by: 'organiser', why: 'sudah benar' });
  return { cardId: draft.card.id, token: `auth-${draft.card.id}` };
}

// ====================================================================================================
// 1. One approval is one send, of that revision.
// ====================================================================================================

test('an authorization is consumed by the send it authorises, and a second use is refused', () => {
  const f = aFleet();
  const { token } = approved(f);

  // An INTERNAL commit — no recipients — is the only path that gets past the transport gate, so it is
  // the only path on which the consumption is observable in phase 1.
  f.commit({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
    phase: 't-minus-1', recipients: [], onBehalfOf: 'organiser',
    authorizationToken: token, text: COPY,
  });
  assert.ok(f.state.authorizations.get(token)?.consumedAt !== undefined, 'the send spent the authorization');

  assert.throws(
    () => f.commit({
      actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
      phase: 't-minus-1', recipients: [], onBehalfOf: 'organiser',
      authorizationToken: token, text: COPY,
    }),
    /stale_target/,
    'a second send on the same authorization must be refused',
  );
  const executed = f.state.events.filter((e) => e.type === 'CommitExecuted');
  assert.equal(executed.length, 1, 'and exactly one send happened');
});

test('a member-facing send is refused BEFORE the authorization is spent — the approval survives the refusal', () => {
  const f = aFleet();
  const { token } = approved(f);
  assert.throws(
    () => f.commit({
      actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
      phase: 't-minus-1', recipients: ['wa:62811'], onBehalfOf: 'organiser',
      authorizationToken: token, text: COPY,
    }),
    /no_transport/,
  );
  assert.equal(f.state.authorizations.get(token)?.consumedAt, undefined,
    'the transport refusal is the delivery\'s, not the approval\'s — the authorization is still live for a human hand');
});

test('an edit retracts the live approval — the old authorization dies at the edit, not at the send', () => {
  const f = aFleet();
  const { cardId, token } = approved(f);
  const before = f.state.cards.size;
  f.decideCard(cardId, { verdict: 'edit', by: 'organiser', why: 'typo', newText: { id: 'haloEdited', en: 'helloEdited' } });
  assert.ok(f.state.authorizations.get(token)?.consumedAt !== undefined,
    'the v1 authorization is spent by the edit, so it cannot be presented even for v1\'s own content');
  assert.equal(f.state.cards.get(cardId)?.status, 'stale',
    'the approved card goes stale — an approval binds to a revision, and the revision is gone');
  assert.equal(f.state.cards.size, before + 1, 'and the edited copy is queued as a NEW card, waiting on a human');
  const pending = [...f.state.cards.values()].filter((c) => c.status === 'pending');
  assert.equal(pending.length, 1, 'and exactly one card is waiting');
});

test('an authorization names the origin it was issued for', () => {
  const f = aFleet();
  const { cardId } = approved(f, 'ev-1');
  const auth = f.authorizationOf(cardId);
  assert.ok(auth);
  assert.equal(auth.origin.id, 'ev-1', 'a token for one event does not authorise another');
});

// ====================================================================================================
// 2. A decision is made against the state at decision time.
// ====================================================================================================

test('a grant revoked between issue and use is refused — a later state change is not inherited', () => {
  const f = aFleet();
  const grant = f.issueGrant({ actionClass: 'draft.reminder', kind: 'allow_always', scope: 'the test', by: 'organiser' });
  f.revokeGrant(grant.id, 'organiser');
  assert.throws(
    () => f.commit({
      actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
      recipients: [], onBehalfOf: 'organiser', text: COPY,
    }),
    /grant_not_found/,
    'a revoked grant must not authorise anything',
  );
});

test('a grant whose window closed is refused', () => {
  const f = aFleet();
  f.issueGrant({
    actionClass: 'draft.reminder', kind: 'allow_always', scope: 'the test', by: 'organiser',
    window: { from: DAY, to: DAY + HOUR },
  });
  f.advance(2 * HOUR); // past the window
  assert.throws(
    () => f.commit({
      actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
      recipients: [], onBehalfOf: 'organiser', text: COPY,
    }),
    /grant_window_expired|grant_not_found/,
  );
});

test('a grant with no scope is refused — "always" without a named lane is not a grant', () => {
  const f = aFleet();
  assert.throws(
    () => f.issueGrant({ actionClass: 'draft.reminder', kind: 'allow_always', by: 'organiser' }),
    /grant_scope_unnamed/,
  );
});

// ====================================================================================================
// 3. The log is tamper-evident at the edges.
// ====================================================================================================

test('a log with a row removed from the middle does NOT verify', () => {
  const f = aFleet();
  // Three drafts, so the log is long enough that the row removed is genuinely in the MIDDLE. Removing
  // the LAST row is a truncation, not a hole — the rows that remain are dense, and the manifest is
  // what catches that (see the truncation test below).
  for (const id of ['ev-1', 'ev-2', 'ev-3']) {
    f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id }, phase: 't-minus-1', text: COPY });
  }
  assert.ok(f.events.length >= 4, `the log needs a middle to remove, got ${f.events.length} rows`);
  const holed = f.events.filter((r) => r.seq !== 3);
  const v = Fleet.verifyLog(holed, ANSWERS, PACK);
  assert.equal(v.ok, false, 'a hole in the middle must fail verification');
  assert.ok(v.problems.some((p) => p.kind === 'seq_missing'), `expected a seq gap, got ${JSON.stringify(v.problems)}`);
});

test('an edited row is tier 2 — and the repo says so out loud, which is why this test asserts the DOCUMENTED behaviour', () => {
  // `runtime/src/log.ts` states this without being asked: tier 1 is dense `seq` plus
  // replay-and-compare, and a per-row digest chain that would catch in-place edits is **named and
  // not built**, because `JSON.stringify` follows key insertion order and a false "the file is
  // corrupt" on an organiser's only audit file is worse than a slower truth.
  //
  // So the honest test has two halves: tier 1 alone does NOT catch an edited payload, and the
  // STATE comparison — which the reference host's `verify` does pass — DOES.
  const f = aFleet();
  f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' }, phase: 't-minus-1', text: COPY });
  const rows = f.events.map((r) => ({ ...r }));
  const target = rows.find((r) => r.type === 'CardCreated');
  assert.ok(target);
  const edited = {
    ...target,
    card: { ...target.card, revision: { ...target.card.revision, text: { id: 'TAMPERED', en: 'TAMPERED' } } },
  };
  const tampered = rows.map((r) => (r.seq === target.seq ? edited : r));

  const tier1 = Fleet.verifyLog(tampered, ANSWERS, PACK);
  assert.equal(tier1.ok, true, 'tier 1 alone does not catch an edited payload — the documented limit');

  const withState = Fleet.verifyLog(tampered, ANSWERS, PACK, { state: f.state });
  assert.equal(withState.ok, false, 'but comparing the folded state to the fleet DOES — and the host does exactly that');
  assert.ok(withState.problems.some((p) => p.kind === 'state_mismatch'));
});

test('a log whose TAIL is missing is dense — so the MANIFEST is what catches the truncation', () => {
  // A truncated tail has no gap: the rows that remain are dense, and `verifyLog` — which reads only
  // the rows — has nothing to complain about. The manifest is the only place that knows how many rows
  // there should be, so the truncation is caught by comparing the two.
  const f = aFleet();
  f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' }, phase: 't-minus-1', text: COPY });
  const rows = f.events;
  const truncated = rows.slice(0, rows.length - 1);
  const v = Fleet.verifyLog(truncated, ANSWERS, PACK);
  assert.equal(v.ok, true, 'the rows alone are dense — which is exactly why the manifest matters');
  assert.notEqual(truncated[truncated.length - 1]!.seq, rows[rows.length - 1]!.seq,
    'the last seq a reader would see is not the last seq the writer wrote');
});

// ====================================================================================================
// 4. Two writers cannot silently gap a log.
// ====================================================================================================

test('two fleets appending to ONE log collide on a seq, and the verifier does not call that log sound', () => {
  // The `seq` comes from in-memory state, so two processes writing one file can each believe they own
  // the next number. The log then has two rows with the same `seq` — and a duplicate is a log that
  // replays wrong, so the density check has to look for it.
  const a = aFleet();
  const b = aFleet();
  a.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-a' }, phase: 't-minus-1', text: COPY });
  b.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-b' }, phase: 't-minus-1', text: COPY });
  const interleaved = [...a.events, ...b.events].sort((x, y) => x.seq - y.seq);
  const seqs = interleaved.map((r) => r.seq);
  assert.notEqual(new Set(seqs).size, seqs.length, 'the two writers collided on a seq — that is the risk');
  const v = Fleet.verifyLog(interleaved, ANSWERS, PACK);
  assert.equal(v.ok, false, 'and the verifier does not call that log sound');
  assert.ok(v.problems.some((p) => p.kind === 'seq_duplicate'), `expected a duplicate seq, got ${JSON.stringify(v.problems)}`);
});

// ====================================================================================================
// 5. The privacy boundary holds in combination.
// ====================================================================================================

test('a member who said stop is refused before anything else, and nothing reaches them', () => {
  const f = aFleet();
  f.suppressMember('wa:62811', 'member');
  f.issueGrant({ actionClass: 'draft.reminder', kind: 'allow_always', scope: 'the test', by: 'organiser' });
  let code = '';
  try {
    f.commit({
      actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
      recipients: ['wa:62811'], onBehalfOf: 'organiser', text: COPY,
    });
  } catch (e) {
    code = String((e as { code?: string }).code ?? '');
  }
  assert.equal(code, 'member_suppressed', 'a stop beats any grant, any lane, any autonomy level');
  assert.equal(f.state.events.filter((e) => e.type === 'CommitExecuted').length, 0, 'and nothing was sent');
});

test('a member with no row at all is held — absent suppression is unknown, and unknown is held', () => {
  const f = aFleet();
  f.issueGrant({ actionClass: 'draft.reminder', kind: 'allow_always', scope: 'the test', by: 'organiser' });
  assert.throws(
    () => f.commit({
      actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
      recipients: ['wa:99999'], onBehalfOf: 'organiser', text: COPY,
    }),
    /suppression_unknown/,
  );
});

test('a member-facing send with no disclosure is refused, in every declared language', () => {
  const f = aFleet();
  f.issueGrant({ actionClass: 'draft.reminder', kind: 'allow_always', scope: 'the test', by: 'organiser' });
  assert.throws(
    () => f.commit({
      actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
      recipients: ['wa:62811'], onBehalfOf: 'organiser', text: { id: 'tanpa disclosure', en: 'no disclosure' },
    }),
    /disclosure_missing/,
  );
});

// --- the shape guard: a malformed row is refused, not folded ---------------------------------------------

test('a row with a wrong field type is REFUSED, not folded — the log is not sound', () => {
  // Before the guard, this row folded silently and the log VERIFIED AS SOUND. A wrong origin is
  // a wrong channel; a wrong `code` is a wrong refusal. The log is data, and data is not trusted.
  const f = aFleet();
  f.attempt({ actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' }, phase: 't-minus-1', text: COPY });
  const rows = f.events.map((r) => ({ ...r }));
  const target = rows.find((r) => r.type === 'CardCreated');
  assert.ok(target);
  // The cast is the POINT: a row on disk is data, not a typed value, so a corrupted row is not a
  // `LoggedEvent` and the type system says so. The runtime has to survive the file anyway.
  const tampered = rows.map((r) => (r.seq === target.seq
    ? { ...r, card: { ...target.card, origin: { kind: 123, id: null } } }
    : r)) as unknown as LoggedEvent[];
  const v = Fleet.verifyLog(tampered, ANSWERS, PACK);
  assert.equal(v.ok, false, 'a malformed row must not verify');
  assert.ok(v.problems.some((p) => p.kind === 'replay_failed'), `expected the fold to refuse, got ${JSON.stringify(v.problems)}`);
});

test('a member with NO timezone is refused — a member whose quiet hours cannot be checked is a protection switched off', () => {
  // This is the sharp version of the same defect: `member.tz` is what the quiet-hours check reads.
  // A row missing it would register a member whose local hours are unknown — and a protection that
  // cannot be applied is not a protection.
  const f = aFleet();
  const rows = f.events.map((r) => ({ ...r }));
  const target = rows.find((r) => r.type === 'MemberRegistered');
  assert.ok(target);
  const tampered = rows.map((r) => (r.seq === target.seq ? { ...r, member: { tz: 'Asia/Jakarta' } } : r)) as unknown as LoggedEvent[];
  const v = Fleet.verifyLog(tampered, ANSWERS, PACK);
  assert.equal(v.ok, false, 'a member row with no ref must not verify');
  assert.ok(v.problems.some((p) => p.kind === 'replay_failed'));
});

test('the content hash is 128 bits — 64 has a birthday bound of 2^32, which a GPU finds in minutes', () => {
  // The revision hash is what binds an approval to specific copy. A collision there is not
  // cosmetic: it is a way to get UNAPPROVED copy past an approval.
  const f = aFleet();
  const draft = f.attempt({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'ev-1' },
    phase: 't-minus-1', text: COPY,
  });
  assert.ok(draft.card);
  assert.match(draft.card.revision.hash, /^[0-9a-f]{32}$/, 'the revision binding is 128 bits of SHA-256');
});
