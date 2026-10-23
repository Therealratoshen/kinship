import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCard, decideCard } from '../src/cards.ts';
import { makeCtx, makePack } from './helpers.ts';

const ctx = () => makeCtx(makePack({ engagement: { 'draft.promote': 'draft' } }));
const draft = (c: ReturnType<typeof ctx>, i = 1) => ({
  actionClass: 'draft.promote', agent: 'engagement',
  origin: { kind: 'event', id: `kopdar-${i}` }, phase: 'promoting' as const,
  text: { id: `Promo ID ${i}`, en: `Promo EN ${i}` },
});

test('a card binds to the revision it was created with (§1.5)', () => {
  const c = ctx();
  const card = createCard(c, draft(c));
  assert.equal(card.status, 'pending');
  assert.equal(card.revision.hash.length, 16);
  const other = createCard(c, draft(c, 2));
  assert.notEqual(card.revision.hash, other.revision.hash, 'different content, different identity');
});

test('duplicate approval requests with the same idempotencyKey return the existing card (§1.5)', () => {
  const c = ctx();
  const a = createCard(c, { ...draft(c), idempotencyKey: 'promo-kopdar-12' });
  const b = createCard(c, { ...draft(c), idempotencyKey: 'promo-kopdar-12' });
  assert.equal(b.id, a.id);
  assert.equal(c.state.cards.size, 1);
});

test('the queue is bounded: card 21 refuses with queue_full (§1.6, pack queue_max = 20)', () => {
  const c = ctx();
  for (let i = 1; i <= 20; i++) createCard(c, draft(c, i));
  assert.throws(() => createCard(c, draft(c, 21)), /queue_full/);
});

test('approve issues a one-send authorization bound to the revision hash (§1.5)', () => {
  const c = ctx();
  const card = createCard(c, draft(c));
  decideCard(c, card.id, { verdict: 'approve', by: 'organiser', why: 'copy is right, dates read back correct' });
  assert.equal(c.state.cards.get(card.id)?.status, 'approved');
  const token = [...c.state.authorizations.values()][0];
  assert.ok(token);
  assert.equal(token && token.revisionHash, card.revision.hash);
  assert.equal(token && token.actionClass, 'draft.promote');
});

test('only the organiser decides — an agent approving its own card is not_the_human (§2.7)', () => {
  const c = ctx();
  const card = createCard(c, draft(c));
  assert.throws(() => decideCard(c, card.id, { verdict: 'approve', by: 'agent:engagement', why: 'self-serve' }), /not_the_human/);
  assert.throws(() => decideCard(c, card.id, { verdict: 'approve', by: 'member:m1', why: 'member said yes in chat' }), /not_the_human/,
    '"yes, go ahead" in the group is not a verdict');
});

test('a reject without a why is refused, and a rejected draft is kept, never deleted (§1.2 near-miss discipline)', () => {
  const c = ctx();
  const card = createCard(c, draft(c));
  assert.throws(() => decideCard(c, card.id, { verdict: 'reject', by: 'organiser', why: '' }), /verdict_without_why/);
  decideCard(c, card.id, { verdict: 'reject', by: 'organiser', why: 'wrong venue — still lists the old RT hall' });
  const kept = c.state.cards.get(card.id);
  assert.equal(kept && kept.status, 'rejected');
  assert.equal(kept && kept.why, 'wrong venue — still lists the old RT hall',
    'the near-miss is the highest-value entry in the log');
});

test('approve v1, edit to v2: the old approval resolves stale_target and v2 queues as a new approval (§1.5)', () => {
  const c = ctx();
  const card = createCard(c, draft(c));
  decideCard(c, card.id, { verdict: 'approve', by: 'organiser', why: 'ok' });
  decideCard(c, card.id, {
    verdict: 'edit', by: 'organiser', why: 'venue moved',
    newText: { id: 'Promo ID v2', en: 'Promo EN v2' },
  });
  assert.equal(c.state.cards.get(card.id)?.status, 'stale', 'resolved stale_target');
  assert.equal(c.state.authorizations.size, 1, 'the v1 authorization is dead and no new one exists until v2 is approved');
  const pending = [...c.state.cards.values()].find((x) => x.status === 'pending');
  assert.ok(pending, 'v2 queues as a new approval');
  assert.notEqual(pending && pending.revision.hash, card.revision.hash);
});

test('deciding a non-pending card is refused (§1.5)', () => {
  const c = ctx();
  const card = createCard(c, draft(c));
  decideCard(c, card.id, { verdict: 'approve', by: 'organiser', why: 'ok' });
  assert.throws(() => decideCard(c, card.id, { verdict: 'reject', by: 'organiser', why: 'changed my mind' }), /card_not_pending/,
    'revoke the authorization instead — a decided card does not re-decide');
});
