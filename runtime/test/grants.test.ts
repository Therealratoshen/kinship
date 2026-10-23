import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueGrant, revokeGrant, findLiveGrant, consumeGrant, supersedeGrant, listGrants, grantWithClosedWindow } from '../src/grants.ts';
import { makeCtx, makePack } from './helpers.ts';

const ctx = () => makeCtx(makePack({ engagement: { 'draft.reminder': 'draft' } }));

test('an allow_once grant by the organiser is live, then consumed by its one send (section 1.8)', () => {
  const c = ctx();
  const g = issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_once', channel: 'telegram', by: 'organiser' });
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' })?.id, g.id);
  consumeGrant(c, g.id, 1);
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' }), null,
    'a one-shot token is not a subscription');
});

test('an allow_always grant without a named scope is refused — "allow all reminders" is not shippable (section 1.8)', () => {
  const c = ctx();
  assert.throws(
    () => issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', by: 'organiser' }),
    /grant_scope_unnamed/,
  );
});

test('an allow_always grant binds to its named scope: same class, different channel, no grant (section 1.8)', () => {
  const c = ctx();
  issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', scope: 'event series: kopdar-bulanan', by: 'organiser' });
  assert.notEqual(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' }), null);
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'discord' }), null,
    'the next lane is not the one that was approved');
});

test('revocation is instant, needs no reason, and works from the enumerable list (section 1.8)', () => {
  const c = ctx();
  const g = issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', scope: 'event series: kopdar-bulanan', by: 'organiser' });
  revokeGrant(c, g.id, 'organiser');
  assert.equal(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' }), null);
  const listed = listGrants(c);
  assert.equal(listed.length, 1, 'if it cannot be listed, it cannot be governed');
  assert.ok(listed[0] && listed[0].revokedAt !== undefined);
});

test('a member cannot issue a grant — "yes, go ahead" in chat is input to a proposal, never a grant (section 2.7)', () => {
  const c = ctx();
  assert.throws(
    () => issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', scope: 'whatever the member said', by: 'member:m1' }),
    /not_the_human/,
  );
  assert.equal(listGrants(c).length, 0, 'and nothing was stored');
});

test('revocation is the organiser\'s act at the primitive, not only at the engine (section 1.8 / section 2.7)', () => {
  // The comment here used to read "the engine gates who calls this". It did not: `engine.ts`
  // forwards `revokeGrant` straight through, and the tests call this file directly — so the rule
  // lived only in a sentence. A primitive that is safe only when reached by one caller is not safe.
  const c = ctx();
  const g = issueGrant(c, { actionClass: 'draft.reminder', kind: 'allow_always', channel: 'telegram', scope: 'event series: kopdar-bulanan', by: 'organiser' });
  assert.throws(() => revokeGrant(c, g.id, 'member:m1'), /not_the_human/);
  assert.throws(() => revokeGrant(c, g.id, 'agent:engagement'), /not_the_human/);
  assert.notEqual(findLiveGrant(c, { actionClass: 'draft.reminder', channel: 'telegram' }), null,
    'a refused revocation changes nothing — the grant is still live and still enumerable');
});

test('a cross-promotion always-grant must name partner + lane + window, and only fires inside the window (section 2.11)', () => {
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

test('an expired window is named as the reason, never hidden behind grant_not_found (section 1.2 / section 2.11)', () => {
  const c = ctx();
  issueGrant(c, {
    actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram',
    scope: 'partner promo', partner: 'AIClub.id', window: { from: 2_000, to: 3_000 }, by: 'organiser',
  });
  const q = { actionClass: 'promote.cross-community', channel: 'telegram', partner: 'AIClub.id' };

  // Before the window opens there is nothing expired — the honest answer is still "no live grant".
  assert.equal(findLiveGrant(c, q), null);
  assert.equal(grantWithClosedWindow(c, q), null, 'a window that has not opened has not expired either');

  c.advance && c.advance(1_500); // inside [2000, 3000]
  assert.equal(grantWithClosedWindow(c, q), null, 'a live grant is not an expired one');

  c.advance && c.advance(600); // t = 3100
  assert.equal(findLiveGrant(c, q), null, 'the window closed; "forever" was never granted');
  const dead = grantWithClosedWindow(c, q);
  assert.ok(dead, 'and the row still exists, because the audit trail does not delete history');
  assert.equal(dead?.window?.to, 3_000, 'the diagnostic hands back the window so the refusal can name it');
});

test('a revoked grant is not reported as expired: the organiser took it back, that is a different fact (section 2.11)', () => {
  const c = ctx();
  const g = issueGrant(c, {
    actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram',
    scope: 'partner promo', partner: 'AIClub.id', window: { from: 2_000, to: 9_000 }, by: 'organiser',
  });
  c.advance && c.advance(8_000); // t = 9000 — still inside the window
  revokeGrant(c, g.id, 'organiser');
  assert.equal(grantWithClosedWindow(c, { actionClass: 'promote.cross-community', channel: 'telegram', partner: 'AIClub.id' }), null,
    'revocation is the reason, and it is already the message grant_not_found tells');
});

test('a material change to the class template supersedes the grant — it reverts to draft and asks again (section 1.8)', () => {
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
