import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueGrant, revokeGrant, findLiveGrant, consumeGrant, supersedeGrant, listGrants } from '../src/grants.ts';
import { makeCtx, makePack } from './helpers.ts';

const ctx = () => makeCtx(makePack({ engagement: { 'draft.reminder': 'draft' } }));

test('an allow_once grant by the organiser is live, then consumed by its one send (§1.8)', () => {
  const c = ctx();
  const g = issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_once', channel: 'telegram', by: 'organiser' });
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' })?.id, g.id);
  consumeGrant(c, g.id, 1);
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' }), null,
    'a one-shot token is not a subscription');
});

test('an allow_always grant without a named scope is refused — "allow all reminders" is not shippable (§1.8)', () => {
  const c = ctx();
  assert.throws(
    () => issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', by: 'organiser' }),
    /grant_scope_unnamed/,
  );
});

test('an allow_always grant binds to its named scope: same class, different channel, no grant (§1.8)', () => {
  const c = ctx();
  issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', scope: 'event series: kopdar-bulanan', by: 'organiser' });
  assert.notEqual(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' }), null);
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'discord' }), null,
    'the next lane is not the one that was approved');
});

test('revocation is instant, needs no reason, and works from the enumerable list (§1.8)', () => {
  const c = ctx();
  const g = issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', scope: 'event series: kopdar-bulanan', by: 'organiser' });
  revokeGrant(c, g.id, 'organiser');
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' }), null);
  const listed = listGrants(c);
  assert.equal(listed.length, 1, 'if it cannot be listed, it cannot be governed');
  assert.ok(listed[0] && listed[0].revokedAt !== undefined);
});

test('a member cannot issue a grant — "yes, go ahead" in chat is input to a proposal, never a grant (§2.7)', () => {
  const c = ctx();
  assert.throws(
    () => issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', scope: 'whatever the member said', by: 'member:m1' }),
    /not_the_human/,
  );
  assert.equal(listGrants(c).length, 0, 'and nothing was stored');
});

test('a cross-promotion always-grant must name partner + lane + window, and only fires inside the window (§2.11)', () => {
  const c = ctx();
  assert.throws(
    () => issueGrant(c, { actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram', scope: 'partner promo', by: 'organiser' }),
    /grant_scope_unnamed/,
    'a grant that names no partner and no window is an omission, not generosity',
  );
  const g = issueGrant(c, {
    actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram',
    scope: 'partner promo', partner: 'AIClub.id',
    window: { from: 2_000, to: 3_000 }, by: 'organiser',
  });
  assert.equal(findLiveGrant(c, { actionClass: 'promote.cross-community', channel: 'telegram', partner: 'AIClub.id' }), null,
    'before the window opens, there is no grant');
  c.advance && c.advance(1_500); // t = 2500, inside [2000, 3000]
  assert.notEqual(findLiveGrant(c, { actionClass: 'promote.cross-community', channel: 'telegram', partner: 'AIClub.id' }), null);
  c.advance && c.advance(600); // t = 3100, window closed
  assert.equal(findLiveGrant(c, { actionClass: 'promote.cross-community', channel: 'telegram', partner: 'AIClub.id' }), null,
    'the window closed; "forever" was never granted');
  assert.equal(g.kind, 'allow_always');
});

test('a material change to the class template supersedes the grant — it reverts to draft and asks again (§1.8)', () => {
  const c = ctx();
  const g = issueGrant(c, {
    actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram',
    scope: 'event series: kopdar-bulanan', templateHash: 'template-v1', by: 'organiser',
  });
  assert.notEqual(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram', templateHash: 'template-v1' }), null);
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram', templateHash: 'template-v2' }), null,
    'silently inheriting a grant into changed behaviour is the bug this taxonomy exists to prevent');
  supersedeGrant(c, g.id, 'reminder template rewritten');
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram', templateHash: 'template-v1' }), null,
    'after supersession even the original hash is dead');
});
