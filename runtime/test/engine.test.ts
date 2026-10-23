import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import {disclosureLine} from '../src/disclosure.ts';
import { LOW_TRUST_REPLACEMENT } from '../src/containment.ts';
import { KinshipError } from '../src/errors.ts';

const ANSWERS = {
  community_name: 'AI Builders ID',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser, bukan manusia',
  schedule: 'weekly',
  venue_source: 'manual',
  sponsor_list: 'none',
  rsvp_source_of_truth: 'gform',
};

/** 07:00 UTC = 14:00 WIB — inside the member's allowed send hours (quiet hours start at 21:00 local). */
const DAY = 25_200_000;

const pack = (classes: Record<string, Record<string, string>>, needs: string[] = []) => {
  const p = makePack(classes);
  return { ...p, needs };
};

const draftBundle = (community = ANSWERS.community_name) => ({
  text: { id: `Latihan mingguan tetap jalan ya.\n\n${disclosureLine('id', community)}`, en: `Weekly practice is still on.\n\n${disclosureLine('en', community)}` },
});

test('boot refuses while a need is unanswered — a fleet that cannot name its human does not start (§2.7)', () => {
  assert.throws(() => Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }, ['community_name', 'escalation_contact']), {}),
    /need_unanswered/);
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }, ['community_name', 'escalation_contact']), ANSWERS, DAY);
  assert.ok(fleet, 'answered needs boot');
});

test('the draft-only story: proposal → approval → commit refuses at the transport gate with the authorization intact', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');
  const r = fleet.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, phase: 'promoting', ...draftBundle() });
  assert.equal(r.disposition, 'card');
  assert.ok(r.card);
  fleet.decideCard(r.card!.id, { verdict: 'approve', by: 'organiser', why: 'copy reads right' });
  assert.throws(() => fleet.commit({
    actionClass: 'draft.promote', agent: 'engagement',
    origin: { kind: 'event', id: 'kopdar-12' }, phase: 'promoting',
    recipients: ['wa:62811'], onBehalfOf: 'organiser',
    authorizationToken: `auth-${r.card!.id}`,
    ...draftBundle(),
  }), /no_transport/, 'phase 1 ships no channel transport — delivery is the organiser\'s hand (D21/D11)');
  const auth = fleet.state.authorizations.get(`auth-${r.card!.id}`);
  assert.ok(auth && auth.consumedAt === undefined, 'the refused commit did not burn the one-send authorization');
  const refused = fleet.state.events.find((e) => e.type === 'CommitRefused');
  assert.ok(refused && refused.type === 'CommitRefused' && refused.code === 'no_transport', 'the refusal is in the audit log, not swallowed');
});

test('suppression beats a live grant: the member stop fires ahead of delivery (§2.9 / FR-5.2)', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'remind.member': 'opt-in-auto' } }), ANSWERS, DAY);
  fleet.registerMember('wa:62899', 'Asia/Jakarta');
  fleet.suppressMember('wa:62899', 'member');
  fleet.issueGrant({ actionClass: 'remind.member', kind: 'allow_always', channel: 'telegram', scope: 'kopdar-12 series', by: 'organiser' });
  assert.throws(() => fleet.commit({
    actionClass: 'remind.member', agent: 'engagement', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, phase: 't-minus-1',
    recipients: ['wa:62899'], onBehalfOf: 'organiser', ...draftBundle(),
  }), /member_suppressed/, 'suppression wins even with a live always-grant in the lane — that is the order the pack promises');
});

test('member input in an auto lane produces a proposal, and no grant materialises from chat (§2.7)', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'opt-in-auto' } }), ANSWERS, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');
  const input = fleet.registerInput('wa:62811', 'kak posting promo acaraku juga dong');
  const r = fleet.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, triggerInput: input, ...draftBundle() });
  assert.equal(r.disposition, 'card', 'the auto lane narrowed to draft because the trigger is a stranger');
  assert.ok(r.card && r.card.forcedBy === 'member_input');
  assert.throws(() => fleet.commit({
    actionClass: 'draft.promote', agent: 'engagement',
    origin: { kind: 'event', id: 'kopdar-12' },
    recipients: [], ...draftBundle(),
  }), /grant_not_found/, 'no grant exists — the card path is the only path member input can cause');
});

test('a stale authorization is dead at commit — edited approval, or wrong revision (§1.5)', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');
  const card = fleet.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, ...draftBundle() }).card!;
  fleet.decideCard(card.id, { verdict: 'approve', by: 'organiser', why: 'ok' });
  fleet.decideCard(card.id, { verdict: 'edit', by: 'organiser', why: 'venue moved', newText: { id: 'v2 ID', en: 'v2 EN' } });
  assert.throws(() => fleet.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: card.origin, phase: card.phase,
    recipients: ['wa:62811'], onBehalfOf: 'organiser', authorizationToken: `auth-${card.id}`, ...draftBundle(),
  }), /stale_target/, 'the edit consumed the v1 authorization — presenting it refuses');

  const card3 = fleet.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-13' }, ...draftBundle() }).card!;
  fleet.decideCard(card3.id, { verdict: 'approve', by: 'organiser', why: 'ok' });
  assert.throws(() => fleet.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: card3.origin, phase: card3.phase,
    recipients: ['wa:62811'], onBehalfOf: 'organiser', authorizationToken: `auth-${card3.id}`,
    text: { id: 'different content than approved', en: 'different content than approved' },
  }), /stale_target/, 'the token is bound to the revision hash, not to the card id');
  const auth = fleet.state.authorizations.get(`auth-${card3.id}`);
  assert.ok(auth && auth.consumedAt === undefined, 'the hash-mismatch refusal did not consume the authorization either');
});

test('a class the pack does not declare stays never through the commit path too (§1.1 default deny)', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  assert.throws(() => fleet.attempt({ actionClass: 'moderate.hide', agent: 'engagement', origin: { kind: 'event', id: 'x' }, ...draftBundle() }),
    /class_unavailable/);
  assert.throws(() => fleet.commit({ actionClass: 'moderate.hide', agent: 'engagement', origin: { kind: 'event', id: 'x' }, recipients: [], ...draftBundle() }),
    /class_unavailable/);
});

test('an internal commit executes: recipients empty, transport recorded as none, log shows it (§1.2)', () => {
  const fleet = Fleet.boot(pack({ ops: { 'recap.assemble': 'opt-in-auto' } }), ANSWERS, DAY);
  fleet.issueGrant({ actionClass: 'recap.assemble', kind: 'allow_always', scope: 'kopdar-12', by: 'organiser' });
  fleet.commit({ actionClass: 'recap.assemble', agent: 'ops', origin: { kind: 'event', id: 'kopdar-12' }, recipients: [], ...draftBundle() });
  const exec = fleet.state.events.find((e) => e.type === 'CommitExecuted');
  assert.ok(exec && exec.type === 'CommitExecuted');
  assert.equal(exec.transport, 'none');
});

test('cross-promotion commits only against a grant that names the partner (§2.11)', () => {
  const fleet = Fleet.boot(pack({ growth: { 'promote.cross-community': 'opt-in-auto' } }, ['partner_policy']), { ...ANSWERS, partner_policy: 'Kopdar Sebelah, dengan baris disclosure wajib' }, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');
  assert.throws(() => fleet.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Komunitas Lain',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', ...draftBundle(),
  }), /grant_not_found/, 'no grant names that partner');
  fleet.issueGrant({ actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram', scope: 'kopdar-12', partner: 'Kopdar Sebelah', window: { from: 0, to: 99_999_999 }, by: 'organiser' });
  assert.throws(() => fleet.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', ...draftBundle(),
  }), /no_transport/, 'the partner-matched grant authorizes the lane; delivery still refuses — phase 1 sends nothing');
});

test('the per-event cross-promotion cap is enforced, not merely counted (§2.11 / FR-6.5)', () => {
  const answers = { ...ANSWERS, partner_policy: 'Kopdar Sebelah, dengan baris disclosure wajib' };
  const f = Fleet.boot(pack({ growth: { 'promote.cross-community': 'opt-in-auto' }, engagement: { 'recap.assemble': 'opt-in-auto' } }, ['partner_policy']), answers, DAY);
  f.issueGrant({ actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram', scope: 'kopdar-12', partner: 'Kopdar Sebelah', window: { from: 0, to: 99_999_999 }, by: 'organiser' });
  f.issueGrant({ actionClass: 'recap.assemble', kind: 'allow_always', scope: 'kopdar-12', by: 'organiser' });

  // Recipient-less so the commit executes instead of stopping at the transport gate (D21).
  const promo = (id: string) => ({
    actionClass: 'promote.cross-community' as const, agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id }, partner: 'Kopdar Sebelah', recipients: [], onBehalfOf: 'organiser', ...draftBundle(),
  });
  const recap = (id: string) => ({
    actionClass: 'recap.assemble' as const, agent: 'engagement',
    origin: { kind: 'event', id }, recipients: [], onBehalfOf: 'organiser', ...draftBundle(),
  });

  f.commit(promo('kopdar-12'));
  assert.equal(f.state.crossPromoByEvent.get('kopdar-12'), 1, 'the counter the cap reads is real');
  assert.throws(() => f.commit(promo('kopdar-12')), /cross_promo_cap/,
    "the pack declares cross_promo_per_event_cap: 1 — a partner's reach is not our cadence, and the limit is only a limit if something reads it");
  assert.equal(f.state.crossPromoByEvent.get('kopdar-12'), 1, 'a refused promo spends nothing');
  assert.ok(f.state.events.some((e) => e.type === 'CommitRefused' && e.code === 'cross_promo_cap'), 'and the refusal is on the record');

  f.commit(promo('kopdar-13'));
  assert.equal(f.state.crossPromoByEvent.get('kopdar-13'), 1, 'a different event has its own allowance — the cap is per event lifecycle');
  f.commit(recap('kopdar-12'));
  f.commit({ ...recap('kopdar-12') });
  assert.equal(f.state.crossPromoByEvent.has('kopdar-12'), true, 'ordinary commits do not touch the partner counter');
  assert.equal(f.state.crossPromoByEvent.get('kopdar-12'), 1);
});

test('a cap of zero means no partner promotion in this event, not an unbounded lane (FR-6.5, PKG-48 range 0–3)', () => {
  const answers = { ...ANSWERS, partner_policy: 'Kopdar Sebelah, dengan baris disclosure wajib' };
  const p = pack({ growth: { 'promote.cross-community': 'opt-in-auto' } }, ['partner_policy']);
  const zero = { ...p, budgets: { ...p.budgets, crossPromoPerEventCap: 0 } };
  const f = Fleet.boot(zero, answers, DAY);
  f.issueGrant({ actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram', scope: 'kopdar-12', partner: 'Kopdar Sebelah', window: { from: 0, to: 99_999_999 }, by: 'organiser' });
  assert.throws(() => f.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah', recipients: [], onBehalfOf: 'organiser', ...draftBundle(),
  }), /cross_promo_cap/, '0 is a decision an organiser can make, so it has to hold');
});

test('an expired partner window refuses with its own code — the organiser is told the truth (§2.11 / §1.2)', () => {
  const answers = { ...ANSWERS, partner_policy: 'Kopdar Sebelah, dengan baris disclosure wajib' };
  const f = Fleet.boot(pack({ growth: { 'promote.cross-community': 'opt-in-auto' } }, ['partner_policy']), answers, DAY);
  f.issueGrant({
    actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram', scope: 'kopdar-12',
    partner: 'Kopdar Sebelah', window: { from: DAY - 4_000, to: DAY - 1_000 }, by: 'organiser',
  });
  let caught: unknown;
  try {
    f.commit({
      actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
      origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah', recipients: [], onBehalfOf: 'organiser', ...draftBundle(),
    });
  } catch (e) { caught = e; }
  assert.ok(caught instanceof KinshipError, 'the refusal is the typed one');
  assert.equal((caught as KinshipError).code, 'grant_window_expired',
    '"no live grant — escalation is earned" is the wrong sentence for a grant the organiser did issue and that simply ran out');
  assert.match((caught as Error).message, /window/, 'and the message names the window that closed');
  assert.ok(f.state.events.some((e) => e.type === 'CommitRefused' && e.code === 'grant_window_expired'), 'the right code reaches the audit log');
});

// --- §2.11 / FR-6.1: copy travels, people do not ------------------------------------------------------

const LEAKY = {
  text: { id: 'Kopdar Sebelah ngadain meetup Sabtu — yang belum daftar hubungi 62811', en: "AIClub's meetup Saturday — if you have not registered yet, contact 62811" },
};

const partnerFleet = (promoLevel: 'draft' | 'opt-in-auto' = 'opt-in-auto') => {
  const f = Fleet.boot(
    pack({ growth: { 'promote.cross-community': promoLevel }, engagement: { 'recap.assemble': 'opt-in-auto' } }, ['partner_policy']),
    { ...ANSWERS, partner_policy: 'Kopdar Sebelah, dengan baris disclosure wajib' }, DAY,
  );
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.issueGrant({ actionClass: 'promote.cross-community', kind: 'allow_always', channel: 'telegram', scope: 'kopdar-12', partner: 'Kopdar Sebelah', window: { from: 0, to: 99_999_999 }, by: 'organiser' });
  f.issueGrant({ actionClass: 'recap.assemble', kind: 'allow_always', scope: 'kopdar-12', by: 'organiser' });
  return f;
};

test('partner copy carrying a member identifier refuses with partner_data_leak, ahead of the transport gate (§2.11 / FR-6.1)', () => {
  const f = partnerFleet();
  assert.throws(() => f.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', ...LEAKY,
  }), /partner_data_leak/,
    'no_transport is phase 1\'s temporary lock and the member-data rule is permanent — the organiser must learn the permanent one first');
  assert.ok(f.state.events.some((e) => e.type === 'CommitRefused' && e.code === 'partner_data_leak'), 'the refusal is in the audit log');
  assert.ok(f.auditTimeline().join('\n').includes('partner_data_leak'), 'and readable in the timeline');
  assert.equal(f.state.crossPromoByEvent.get('kopdar-12'), undefined, 'a refused partner send spends none of the event\'s allowance');
});

test('the member-data rule outranks the cadence rule: a full cap does not hide a leak (§2.11)', () => {
  const f = partnerFleet();
  f.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah', recipients: [], onBehalfOf: 'organiser', ...draftBundle(),
  });
  assert.equal(f.state.crossPromoByEvent.get('kopdar-12'), 1, 'the event\'s one partner send is spent');
  assert.throws(() => f.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah', recipients: [], onBehalfOf: 'organiser', ...LEAKY,
  }), /partner_data_leak/,
    'the cap would also refuse this, but "wait for the next event" is the wrong advice for copy that must be rewritten');
});

test('a partner promo to a member who said stop reports the stop, not the cap — §2.11: the member\'s rights survive the partnership', () => {
  const f = partnerFleet();
  f.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah', recipients: [], onBehalfOf: 'organiser', ...draftBundle(),
  });
  f.suppressMember('wa:62811', 'member');
  assert.throws(() => f.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', ...draftBundle(),
  }), /member_suppressed/,
    'the cap is also spent here, but "wait for the next event" would be a lie: this member is unreachable in every lane, partner included');
});

test('the scan is bound to partner-facing copy — our own recap may name our own members (§2.11 scope)', () => {
  const f = partnerFleet();
  f.commit({
    actionClass: 'recap.assemble', agent: 'engagement',
    origin: { kind: 'event', id: 'kopdar-12' }, recipients: [], onBehalfOf: 'organiser', ...LEAKY,
  });
  const exec = f.state.events.filter((e) => e.type === 'CommitExecuted');
  assert.equal(exec.length, 1, 'the same tokens pass when no partner is on the receiving end — the rule is about the direction, not the digits');
});

test('an organiser-approved cross-promo card is still §2.11 copy — the token path runs the partner rules too (§2.11 / FR-6.1, D27)', () => {
  const f = partnerFleet('draft');
  const card = f.attempt({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, ...LEAKY,
  }).card!;
  assert.ok(card, 'the class is reachable once partner_policy is answered — so the leaky copy is what the organiser is being asked to approve');
  f.decideCard(card.id, { verdict: 'approve', by: 'organiser', why: 'partner sudah kenal, copy-nya oke' });
  assert.throws(() => f.commit({
    actionClass: 'promote.cross-community', agent: 'growth', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', authorizationToken: `auth-${card.id}`, ...LEAKY,
  }), /partner_data_leak/,
    'a one-send approval authorises the lane; it does not vouch for the member number inside the copy — the §2.11 rules are content rules, not authorization rules');
  assert.equal(f.state.crossPromoByEvent.get('kopdar-12'), undefined, 'and the refused token send spends none of the event allowance either');
});

test('the audit timeline is a readable record, not JSON — near-misses and refusals are visible (§1.2)', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');
  const card = fleet.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, ...draftBundle() }).card!;
  fleet.decideCard(card.id, { verdict: 'reject', by: 'organiser', why: 'wrong venue — still lists the old RT hall' });
  assert.throws(() => fleet.commit({ actionClass: 'draft.promote', agent: 'engagement', origin: card.origin, recipients: ['wa:62811'], onBehalfOf: 'organiser', ...draftBundle() }), /grant_not_found/);
  const lines = fleet.auditTimeline();
  assert.ok(lines.every((l) => /^#\d+ /.test(l)), 'every line is a seq-prefixed record — the organiser can show a member what happened');
  const joined = lines.join('\n');
  assert.ok(joined.includes('wrong venue — still lists the old RT hall'), 'the near-miss keeps its why (§1.2 first-class)');
  assert.ok(joined.includes('rejected'), 'rejections render as rejections, not as silent gaps');
  assert.ok(joined.includes('grant_not_found'), 'refused attempts render with their refusal code');
  assert.ok(!joined.trimStart().startsWith('{') && !joined.includes('"type":'), 'the timeline is prose, not a JSON dump');
});

test('a revocation in the timeline names the human who did it — an audit trail without an actor is not evidence (§1.2 / §1.8)', () => {
  const f = Fleet.boot(pack({ ops: { 'recap.assemble': 'opt-in-auto' } }), ANSWERS, DAY);
  const g = f.issueGrant({ actionClass: 'recap.assemble', kind: 'allow_always', scope: 'kopdar-12', by: 'organiser' });
  f.revokeGrant(g.id, 'organiser');
  const lines = f.auditTimeline().join('\n');
  assert.ok(lines.includes(`grant ${g.id} revoked by organiser`),
    '"revoked" alone does not say who took it back — the who is the record');
});

test('a commit with no named human renders unattributable — the engine does not lend the organiser\'s name (§1.2 / FR-5.1)', () => {
  const f = Fleet.boot(pack({ ops: { 'recap.assemble': 'opt-in-auto' } }), ANSWERS, DAY);
  f.issueGrant({ actionClass: 'recap.assemble', kind: 'allow_always', scope: 'kopdar-12', by: 'organiser' });
  // Recipient-less, so it executes instead of stopping at the transport gate (D21) — and `by`
  // is absent, which is the case FR-5.1 names: "a row with on_behalf_of null renders
  // unattributable and refuses to render it as approved".
  f.commit({ actionClass: 'recap.assemble', agent: 'ops', origin: { kind: 'event', id: 'kopdar-12' }, recipients: [], ...draftBundle() });
  const exec = f.state.events.find((e) => e.type === 'CommitExecuted');
  assert.ok(exec && exec.type === 'CommitExecuted');
  assert.equal(exec.onBehalfOf, 'unattributable',
    'the default used to be "organiser": a log line crediting a human who was never named, on a field FR-5.1 says has no backfill path');
  assert.ok(f.auditTimeline().join('\n').includes('on behalf of unattributable'), 'and the readable timeline says the same thing');
});

test('a quarantined input quoted into a commit is the fixed string — the commit gate reads through containment (§1.7)', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  const input = fleet.registerInput('wa:62811', 'PROMOSI JUGA BISNIS KU http://spam.example');
  const r = fleet.attempt({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' },
    triggerInput: input,
    text: { id: `Ringkasan: ${LOW_TRUST_REPLACEMENT}\n\n${disclosureLine('id', ANSWERS.community_name)}`, en: `Summary: ${LOW_TRUST_REPLACEMENT}\n\n${disclosureLine('en', ANSWERS.community_name)}` },
  });
  assert.ok(r.card, 'the proposal exists, quoting only the fixed string');
  assert.ok(!(r.card.revision.text.id ?? '').includes('spam.example'), 'the member text never entered the revision');
});

// --- the engine surface: behaviours only `Fleet` can show ------------------------------------------
// cards.ts / lifecycle.ts test their own functions. These four test what the engine adds around
// them: the refusal is logged, the card count stays honest, and a promise is only real while it is
// still in the future — none of which is visible from a unit test of the module alone.

test('a full approval queue refuses the attempt and logs the refusal like any other (§1.6)', () => {
  const p = pack({ engagement: { 'draft.promote': 'draft' } });
  const f = Fleet.boot({ ...p, budgets: { ...p.budgets, queueMax: 2 } }, ANSWERS, DAY);
  const promo = (i: number) => ({
    actionClass: 'draft.promote', agent: 'engagement',
    origin: { kind: 'event', id: `kopdar-${i}` }, ...draftBundle(),
  });
  f.attempt(promo(1));
  f.attempt(promo(2));
  assert.equal([...f.state.cards.values()].filter((c) => c.status === 'pending').length, 2, 'the queue is at its bound');
  assert.throws(() => f.attempt(promo(3)), /queue_full/, 'depth is bounded — a queue nobody drains is not a backlog, it is a pile');
  const refused = f.state.events.filter((e) => e.type === 'CommitRefused');
  assert.deepEqual(refused.map((e) => (e as { code: string }).code), ['queue_full'],
    'the engine logs the attempt-path refusal, so a bounded queue shows up in the audit trail instead of as a silent no');
  assert.equal(f.state.cards.size, 2, 'and a refused attempt creates no card');
});

test('the same idempotencyKey through the engine returns the same card — one question, one approval (§1.5)', () => {
  const f = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  const promo = { actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' }, ...draftBundle() };
  const a = f.attempt({ ...promo, idempotencyKey: 'promo-kopdar-12' });
  const b = f.attempt({ ...promo, idempotencyKey: 'promo-kopdar-12' });
  assert.equal(b.card!.id, a.card!.id, 'a retry of the same proposal is the same card, not a second one');
  assert.equal(f.state.events.filter((e) => e.type === 'CardCreated').length, 1,
    'the log says one card — replay cannot hand the organiser the same question twice');
  assert.equal(f.state.events.filter((e) => e.type === 'CommitRefused').length, 0,
    'and a same-key reuse is a return value, not a refusal (errors.ts declares `idempotent_hit` as exactly that)');
  const c = f.attempt({ ...promo, idempotencyKey: 'chase-kopdar-12' });
  assert.notEqual(c.card!.id, a.card!.id, 'a different key is a different question and gets its own card');
  assert.equal(f.state.cards.size, 2);
});

test('an escalation is a card for a named human, an event, and a timeline line — a member cannot answer it (§2.7 / FR-5.1)', () => {
  const f = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  const card = f.raiseEscalation('sponsor tier disagreement: the partner wants their logo on every poster', 'organiser');
  assert.equal(card.actionClass, 'engine.escalation');
  assert.equal(card.forcedBy, 'escalation', 'the card exists because a rule asked for it, not because an agent chose to draft');
  assert.ok(f.state.events.some((e) => e.type === 'EscalationRaised'), 'the escalation is an event, not only a card');
  assert.ok(f.auditTimeline().join('\n').includes('escalation raised to organiser'), 'and it reads as an escalation in the timeline (§1.2)');
  assert.throws(() => f.decideCard(card.id, { verdict: 'approve', by: 'member:m1', why: 'ya udah' }), /not_the_human/,
    'the escalation asks a named human — a member answering it is the astroturf §2.7 forbids');
});

test('a wake is only a waiting path while it is in the future — the engine refuses its own expired promise (§1.3)', () => {
  const f = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  assert.throws(() => f.assertWakeBacked('chase rsvp non-responders'), /ghost_watcher/, 'no row, no promise');
  const wake = f.scheduleWake({ purpose: 'chase rsvp non-responders', nextCheckAt: DAY + 1_000, eventId: 'kopdar-12' });
  assert.equal(f.assertWakeBacked('chase rsvp non-responders', 'kopdar-12').id, wake.id,
    'a persisted future wake is the only thing that makes "I will follow up" true');
  assert.throws(() => f.assertWakeBacked('chase rsvp non-responders', 'kopdar-13'), /ghost_watcher/,
    'a wake bound to one event does not back the same promise on another');
  f.advance(2_000); // past nextCheckAt, and it never fired
  assert.throws(() => f.assertWakeBacked('chase rsvp non-responders', 'kopdar-12'), /ghost_watcher/,
    'a wake that went due unfired is a broken promise, not a waiting path — the organiser must be told, not reassured');
});
