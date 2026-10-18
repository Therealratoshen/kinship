import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import { disclosureLineId, disclosureLineEn } from '../src/disclosure.ts';
import { LOW_TRUST_REPLACEMENT } from '../src/containment.ts';

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
  textId: `Latihan mingguan tetap jalan ya.\n\n${disclosureLineId(community)}`,
  textEn: `Weekly practice is still on.\n\n${disclosureLineEn(community)}`,
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
  fleet.decideCard(card.id, { verdict: 'edit', by: 'organiser', why: 'venue moved', newTextId: 'v2 ID', newTextEn: 'v2 EN' });
  assert.throws(() => fleet.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: card.origin, phase: card.phase,
    recipients: ['wa:62811'], onBehalfOf: 'organiser', authorizationToken: `auth-${card.id}`, ...draftBundle(),
  }), /stale_target/, 'the edit consumed the v1 authorization — presenting it refuses');

  const card3 = fleet.attempt({ actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-13' }, ...draftBundle() }).card!;
  fleet.decideCard(card3.id, { verdict: 'approve', by: 'organiser', why: 'ok' });
  assert.throws(() => fleet.commit({
    actionClass: 'draft.promote', agent: 'engagement', origin: card3.origin, phase: card3.phase,
    recipients: ['wa:62811'], onBehalfOf: 'organiser', authorizationToken: `auth-${card3.id}`,
    textId: 'different content than approved', textEn: 'different content than approved',
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

test('a quarantined input quoted into a commit is the fixed string — the commit gate reads through containment (§1.7)', () => {
  const fleet = Fleet.boot(pack({ engagement: { 'draft.promote': 'draft' } }), ANSWERS, DAY);
  const input = fleet.registerInput('wa:62811', 'PROMOSI JUGA BISNIS KU http://spam.example');
  const r = fleet.attempt({
    actionClass: 'draft.promote', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' },
    triggerInput: input,
    textId: `Ringkasan: ${LOW_TRUST_REPLACEMENT}\n\n${disclosureLineId(ANSWERS.community_name)}`,
    textEn: `Summary: ${LOW_TRUST_REPLACEMENT}\n\n${disclosureLineEn(ANSWERS.community_name)}`,
  });
  assert.ok(r.card, 'the proposal exists, quoting only the fixed string');
  assert.ok(!r.card.revision.textId.includes('spam.example'), 'the member text never entered the revision');
});
