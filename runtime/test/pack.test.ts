import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPack } from '../src/pack.ts';
import { Fleet } from '../src/engine.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK_DIR = join(REPO_ROOT, 'packs', 'kopdar-ops');
const DAY = 25_200_000; // 07:00 UTC = 14:00 WIB

const ANSWERS = {
  community_name: 'AI Builders ID',
  schedule: 'every other Saturday',
  venue_source: 'manual',
  sponsor_list: 'none yet',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser, bukan manusia',
  rsvp_source_of_truth: 'google form',
  partner_policy: 'Kopdar Sebelah saja; wajib baris disclosure',
};

test('the real pack loads through the validator + parser, and the parsed numbers are the file\'s numbers', () => {
  const p = loadPack(PACK_DIR);
  assert.equal(p.schema, 'kinship/v1');
  assert.equal(p.key, 'kinshipai/bundled/event-ops/kopdar');
  assert.deepEqual(p.locale, ['id', 'en']);
  assert.deepEqual(Object.keys(p.agents).sort(), ['engagement', 'event-ops', 'moderator']);
  assert.equal(p.agents['engagement']?.autonomyByClass['draft.promote'], 'draft', 'member-facing classes start at draft');
  assert.equal(p.agents['moderator']?.autonomyByClass['moderate.flag'], 'opt-in-auto', 'flag-only is the moderator posture');
  assert.equal(p.agents['moderator']?.outputs, 'human_queue', 'flags land in the human queue, not on members');
  assert.equal(p.guardrails.reportAggregationFloor, 10);
  assert.equal(p.guardrails.memberMessageCapPer24h, 2);
  assert.equal(p.guardrails.defaultsDeny, true);
  assert.equal(p.budgets.llmPerEventIdr, null, 'the ceiling is a real field with an UNSET value (PRD §12-Q9)');
  assert.equal(p.budgets.queueMax, 20);
  assert.equal(p.budgets.maxActionsPerRun, 15);
  assert.equal(p.budgets.crossPromoPerEventCap, 1);
  assert.ok(p.needs.includes('escalation_contact') && p.needs.includes('partner_policy'));
});

test('boot refuses while any need is unanswered — the real gate, not a test fixture', () => {
  const partial = { community_name: 'AI Builders ID' };
  assert.throws(() => Fleet.boot(loadPack(PACK_DIR), partial, DAY), /need_unanswered/);
  const fleet = Fleet.boot(loadPack(PACK_DIR), ANSWERS, DAY);
  assert.ok(fleet, 'all eight answered — the pack boots');
});

test('the partner gate holds on the real pack: cross-promo is unreachable until partner_policy answers (§2.11)', () => {
  // §2.7 already refuses boot without the answer (test above); the ladder gate is the second
  // lock for engines constructed or replayed without boot — no path reaches the class without it.
  const { partner_policy: _omitted, ...withoutPartner } = ANSWERS;
  const gated = new Fleet(loadPack(PACK_DIR), withoutPartner, DAY);
  assert.throws(() => gated.attempt({
    actionClass: 'promote.cross-community', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' },
    textId: 'promo partner', textEn: 'partner promo',
  }), /class_unavailable/, 'partner_policy unset → the class is never, even though the pack declares it at draft');
  const open = Fleet.boot(loadPack(PACK_DIR), ANSWERS, DAY);
  const r = open.attempt({
    actionClass: 'promote.cross-community', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' },
    textId: 'promo partner', textEn: 'partner promo',
  });
  assert.equal(r.disposition, 'card', 'partner_policy answered → the class resolves to its declared draft');
});

test('the real pack runs the draft-only story end to end, with its own guardrails (§1.1, D21)', () => {
  const fleet = Fleet.boot(loadPack(PACK_DIR), ANSWERS, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');
  const disclosureId = `pesan ini dikirim oleh asisten otomatis komunitas AI Builders ID — bukan oleh manusia. balas di sini untuk eskalasi ke organiser.`;
  const disclosureEn = `this message was sent by the automated assistant of AI Builders ID — not a human. reply here to escalate to the organiser.`;
  const r = fleet.attempt({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-12' }, phase: 't-minus-1',
    textId: `Ingat ya besok kopdar!\n\n${disclosureId}`,
    textEn: `Reminder: kopdar tomorrow!\n\n${disclosureEn}`,
  });
  assert.equal(r.disposition, 'card');
  fleet.decideCard(r.card!.id, { verdict: 'approve', by: 'organiser', why: 'waktu dan tempat sudah benar' });
  assert.throws(() => fleet.commit({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-12' }, phase: 't-minus-1',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', authorizationToken: `auth-${r.card!.id}`,
    textId: `Ingat ya besok kopdar!\n\n${disclosureId}`,
    textEn: `Reminder: kopdar tomorrow!\n\n${disclosureEn}`,
  }), /no_transport/, 'the real pack cannot send either — no transport ships in phase 1');
});

test('a fork that deletes a member invariant gets a pack that refuses to boot (D15 / FR-1.14)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kinship-pack-'));
  try {
    cpSync(PACK_DIR, tmp, { recursive: true });
    const yamlPath = join(tmp, '.kinship.yaml');
    const yaml = readFileSync(yamlPath, 'utf8');
    writeFileSync(yamlPath, yaml.replace(/^  member_opt_out_persists_across_lanes: true.*\n/m, ''));
    assert.throws(() => loadPack(tmp), /pack_invalid/, 'the suppression invariant is not configurable away');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('a fork that adds `whatsapp | send` gets a pack that refuses to boot (D11/D13/D17)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kinship-pack-'));
  try {
    cpSync(PACK_DIR, tmp, { recursive: true });
    const yamlPath = join(tmp, '.kinship.yaml');
    const yaml = readFileSync(yamlPath, 'utf8');
    writeFileSync(yamlPath, yaml.replace('      - whatsapp | draft', '      - whatsapp | draft\n      - whatsapp | send'));
    assert.throws(() => loadPack(tmp), /pack_invalid/, 'the WhatsApp auto-send ban lives in the toolset, and the gate holds at boot');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('a fork that edits a guardrail value out of range refuses to boot (bounded protections)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kinship-pack-'));
  try {
    cpSync(PACK_DIR, tmp, { recursive: true });
    const yamlPath = join(tmp, '.kinship.yaml');
    const yaml = readFileSync(yamlPath, 'utf8');
    writeFileSync(yamlPath, yaml.replace('member_message_cap_per_24h: 2', 'member_message_cap_per_24h: 50'));
    assert.throws(() => loadPack(tmp), /pack_invalid/, 'a cap of 50/day is not a cap — the bound is ours, the value is the owner\'s');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
