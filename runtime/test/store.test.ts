/**
 * The log is the product's promise (§1.2): a replayable record of what happened. These tests hold
 * `append` to what its own doc-comment claims, which is the part no functional test could catch —
 * a shallow copy behaves identically until a caller touches its payload after committing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { append, freshState, hashText } from '../src/store.ts';
import type { LoggedEvent } from '../src/types.ts';

const refusal = (over: Record<string, unknown> = {}): Omit<LoggedEvent, 'seq'> =>
  ({ type: 'CommitRefused', actionClass: 'draft.reminder', agent: 'event-ops', code: 'queue_full', at: 1_000, ...over }) as Omit<LoggedEvent, 'seq'>;

test('freshState starts empty and at seq 0 — no hidden shared seed between fleets', () => {
  const a = freshState();
  assert.equal(a.seq, 0);
  assert.deepEqual(a.events, []);
  assert.equal(a.members.size, 0);
  assert.equal(a.crossPromoByEvent.size, 0);
  const b = freshState();
  a.members.set('wa:1', { ref: 'wa:1', tz: 'UTC' } as never);
  assert.equal(b.members.size, 0, 'two fresh states must not share a Map');
});

test('append gives monotonic sequence numbers and keeps log order', () => {
  const s = freshState();
  const first = append(s, refusal({ at: 1 }));
  const second = append(s, refusal({ at: 2 }));
  assert.equal(first.seq, 1);
  assert.equal(second.seq, 2);
  assert.deepEqual(s.events.map((e) => e.seq), [1, 2], 'the log is append-only and ordered');
  assert.equal(s.seq, 2, 'state.seq tracks the log');
});

test('append never mutates the caller\'s payload — no seq leaking backwards', () => {
  const s = freshState();
  const payload = refusal({ at: 7 });
  append(s, payload);
  assert.equal('seq' in payload, false, 'the logged form is a copy; the caller\'s object stays as it was');
});

test('append freezes the logged event: a nested value mutated after commit does not rewrite history', () => {
  const s = freshState();
  // The shape that actually reaches the log today: CommitExecuted carries `recipients: string[]`,
  // and an array is an object — so a shallow spread shares it with the caller.
  const payload = refusal({ at: 9, recipients: ['wa:62811'] }) as Omit<LoggedEvent, 'seq'> & { recipients: string[] };
  const logged = append(s, payload) as LoggedEvent & { recipients: string[] };
  payload.recipients.push('wa:62899'); // a caller reusing its own array after the commit
  assert.deepEqual(logged.recipients, ['wa:62811'],
    'the audit record must say who was on the list AT COMMIT TIME, not whatever the caller\'s array became');
});

test('hashText is stable, 16 hex characters, and separates the two languages (§1.5 revision binding)', () => {
  const id = hashText('ingat kopdar');
  assert.match(id, /^[0-9a-f]{16}$/, 'the approval binds to a hash a card can quote');
  assert.equal(id, hashText('ingat kopdar'), 'same text, same hash — replay depends on this');
  assert.notEqual(id, hashText('Ingat Kopdar'), 'one letter is a different revision, and the approval goes stale');
  assert.notEqual(hashText('a'), hashText('b'));
  // The revision is the copy joined in the pack's declared language order, so swapping them is a new revision.
  const sep = '\n⁄⁄\n';
  assert.notEqual(hashText(`a${sep}b`), hashText(`b${sep}a`), 'a draft may not look unchanged by swapping languages');
});
