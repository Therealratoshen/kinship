import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerMember, suppressMember, assertContactable, assertWithinCap, assertSendHour, assertAggregateOnly, renderBracket, listSuppressions } from '../src/members.ts';
import { makeCtx, makePack } from './helpers.ts';

// Asia/Jakarta = UTC+7, no DST. 17:00 UTC = 00:00 WIB (quiet); 07:00 UTC = 14:00 WIB (awake).
const ctx = () => makeCtx(makePack({ engagement: { 'commit.individual-message': 'draft' } }));
const AT = (utcHour: number) => Date.UTC(2026, 10, 20, utcHour, 0, 0);

test('a registered member is contactable until they say stop', () => {
  const c = ctx();
  registerMember(c, 'm1', 'Asia/Jakarta');
  assert.doesNotThrow(() => assertContactable(c.state, 'm1'));
});

test('an unknown member is UNKNOWN, not clear — absent suppression row fails closed (§2.9)', () => {
  const c = ctx();
  assert.throws(() => assertContactable(c.state, 'ghost'), /suppression_unknown/);
});

test('a stop is cross-lane: one row, every class, no exceptions (§2.9 / FR-5.2)', () => {
  const c = ctx();
  registerMember(c, 'm1', 'Asia/Jakarta');
  suppressMember(c, 'm1', { source: 'member', viaClass: 'nudge.no-show' });
  assert.throws(() => assertContactable(c.state, 'm1'), /member_suppressed/,
    'the stop arrived through one lane; it holds on every lane');
});

test('there is no un-suppress: a second call cannot clear it, and no API exists that does (§2.9)', () => {
  const c = ctx();
  registerMember(c, 'm1', 'Asia/Jakarta');
  suppressMember(c, 'm1', { source: 'member', viaClass: 'nudge.no-show' });
  suppressMember(c, 'm1', { source: 'organiser' }); // idempotent re-record, never a clearing
  assert.throws(() => assertContactable(c.state, 'm1'), /member_suppressed/);
  const rows = listSuppressions(c.state, 'm1');
  assert.equal(rows.length, 1, 'one stop, one row — not a toggle');
});

test('the per-24h cap counts the member, not the lane (§2.9 / FR-5.5, pack cap = 2)', () => {
  const c = ctx();
  const t0 = AT(7);
  const commits: number[] = [t0 - 3 * 3600_000];
  assert.doesNotThrow(() => assertWithinCap(c, 'm1', t0, commits)); // 1 in window + this one = 2
  commits.push(t0 - 1 * 3600_000);
  assert.throws(() => assertWithinCap(c, 'm1', t0, commits), /member_cap_exceeded/); // 2 + 1 = 3 > 2
  assert.doesNotThrow(() => assertWithinCap(c, 'm1', t0, [t0 - 25 * 3600_000, t0 - 24.5 * 3600_000]),
    'the window is rolling 24h, not a daily batch — outside it does not count');
});

test('quiet hours are the member local time, not the organiser (§2.9 / FR-5.5)', () => {
  const c = ctx();
  const organiserIsAwake = AT(17); // 17:00 UTC — daytime for a UTC organiser
  assert.throws(() => assertSendHour('Asia/Jakarta', organiserIsAwake), /quiet_hours/,
    '00:00 in Jakarta is quiet no matter how awake the organiser is');
  assert.doesNotThrow(() => assertSendHour('Asia/Jakarta', AT(7))); // 14:00 WIB
});

test('nothing leaves the community under the aggregation floor — refuse, never truncate (§2.9 / FR-5.3)', () => {
  const c = ctx();
  assert.throws(
    () => assertAggregateOnly(c, 9, ['bu-dewi', 'pak-anton']),
    /report_below_floor/,
    'a named-attendee report under the floor is refused at assembly, not redacted after',
  );
  assert.doesNotThrow(() => assertAggregateOnly(c, 10, ['bu-dewi']));
  assert.equal(renderBracket(c, 9), '[fewer than 10 attendees]',
    'below the floor renders a bracket, not a number');
});
