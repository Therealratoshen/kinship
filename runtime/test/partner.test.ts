import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMemberLeaks, assertNoMemberDataInPartnerCopy, MIN_BARE_REF_LEN } from '../src/partner.ts';
import { registerMember } from '../src/members.ts';
import { KinshipError } from '../src/errors.ts';
import { makeCtx, makePack } from './helpers.ts';
import type { Ctx } from '../src/types.ts';

/**
 * section 2.11: "Copy travels; people do not." The partner receives nothing but words the organiser
 * approved — no member list, no RSVP data, no identifier in any direction (FR-6.1). This suite is
 * that sentence as a function: the scan, what it matches, and — just as important — what it
 * deliberately does not match, so the rule is not quietly broader than its document.
 */

const ctx = (members: string[] = []): Ctx => {
  const c = makeCtx(makePack({ growth: { 'promote.cross-community': 'draft' } }));
  for (const ref of members) registerMember(c, ref, 'Asia/Jakarta');
  return c;
};

test('a registered member ref in partner copy is caught whole (section 2.11 / FR-6.1)', () => {
  const c = ctx(['wa:62811']);
  assert.deepEqual(findMemberLeaks(c.state, ['Jangan lupa absen, wa:62811 sudah daftar', 'reminder list']),
    [{ ref: 'wa:62811', token: 'wa:62811' }], 'the full ref is the obvious leak shape — a templated member line');
});

test('the bare identifier is caught too — the lane prefix is not the secret (section 2.11)', () => {
  const c = ctx(['wa:62811']);
  assert.deepEqual(findMemberLeaks(c.state, ['Kontak: 62811', '']), [{ ref: 'wa:62811', token: '62811' }],
    '"wa:" is our prefix; 62811 is still the member\'s number, and stripping it is not anonymising');
});

test('one member written two ways is one leak, reported under the unambiguous spelling', () => {
  const c = ctx(['wa:62811']);
  const leaks = findMemberLeaks(c.state, ['wa:62811 dan cadangannya 62811', 'both spellings of one person']);
  assert.equal(leaks.length, 1, 'a count of tokens would overstate the exposure — the organiser needs a count of people');
  assert.deepEqual(leaks, [{ ref: 'wa:62811', token: 'wa:62811' }]);
});

test('every language is scanned — a leak in the SECOND language is still a leak', () => {
  const c = ctx(['wa:62811']);
  assert.deepEqual(findMemberLeaks(c.state, ['partner event, all welcome', 'RSVP list: 62811']),
    [{ ref: 'wa:62811', token: '62811' }]);
});

test('clean partner copy matches nothing, and the assertion passes it', () => {
  const c = ctx(['wa:62811']);
  assert.deepEqual(findMemberLeaks(c.state, ['Kopdar Sebelah ngadain meetup Sabtu!', 'AIClub is hosting a meetup Saturday']), []);
  assert.doesNotThrow(() => assertNoMemberDataInPartnerCopy(c.state, { id: 'Kopdar Sebelah ngadain meetup!', en: 'AIClub is hosting a meetup' }));
});

test('the scan is a registry check, not a phone-number regex: an unknown number is not a member', () => {
  const c = ctx(['wa:62811']);
  assert.deepEqual(findMemberLeaks(c.state, ['Partner klaim 6281299999999 orang datang', '']), [],
    'what the fleet does not know it cannot protect — the honest bound of this rule is registered members');
});

test('a bare identifier under the bound is not scanned, and the full ref still is (the bound is stated, not hidden)', () => {
  const short = `tg:${'9'.repeat(MIN_BARE_REF_LEN - 1)}`; // 'tg:999'
  const c = ctx([short]);
  assert.deepEqual(findMemberLeaks(c.state, ['Kopdar jam 999 bukan anggota', '']), [],
    'below the bound a bare token is indistinguishable from a time or a price — a scan that fires on those gets switched off');
  assert.deepEqual(findMemberLeaks(c.state, [`ping ${short} dulu`, '']), [{ ref: short, token: short }],
    'the prefixed form is unambiguous, so it matches at any length');
});

test('two members leak as two named entries, sorted — the refusal has to be actionable', () => {
  const c = ctx(['tg:62822', 'wa:62811']);
  const leaks = findMemberLeaks(c.state, ['yang sudah konfirmasi: 62811 dan 62822', 'confirmed: 62811 and 62822']);
  assert.deepEqual(leaks.map((l) => l.ref), ['tg:62822', 'wa:62811']);
});

test('the refusal names the members and never the copy — the timeline is member-readable (section 2.3)', () => {
  const c = ctx(['wa:62811', 'tg:62822']);
  try {
    assertNoMemberDataInPartnerCopy(c.state, {
      id: 'Anggota kami wa:62811 dan 62822 sudah konfirmasi hadir ke acara partner',
      en: 'Our members wa:62811 and 62822 confirmed they will attend your event',
    });
    assert.fail('partner copy carrying member identifiers must not pass the scan');
  } catch (e) {
    assert.ok(e instanceof KinshipError, 'a refusal is a coded outcome, not a crash');
    const err = e as KinshipError;
    assert.equal(err.code, 'partner_data_leak');
    assert.ok(err.rule?.includes('section 2.11'), `the message must cite the rule, got \`${err.rule}\``);
    assert.ok(err.message.includes('wa:62811') && err.message.includes('tg:62822'),
      'the organiser has to know which members to delete: ' + err.message);
    assert.ok(err.message.includes('2 member identifier(s)'), 'and how many people are exposed');
    assert.ok(err.message.includes('written bare'), 'a bare form is flagged as the bare form, not silently treated as the ref');
    assert.ok(!err.message.includes('sudah konfirmasi'),
      'and not the sentence around it — the audit timeline is readable by members too');
  }
});

test('a leak scan does not mutate state — it is a check, not a transaction (section 1.2)', () => {
  const c = ctx(['wa:62811']);
  const before = c.state.events.length;
  assert.throws(() => assertNoMemberDataInPartnerCopy(c.state, { id: 'wa:62811 ikut ya', en: 'you too' }), /partner_data_leak/);
  assert.equal(c.state.events.length, before, 'the refusal is logged by the engine at commit time, not by the scanner');
});
