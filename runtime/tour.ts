#!/usr/bin/env node
/**
 * Kinship tour — the runnable on-ramp.
 *
 *   node runtime/tour.ts          a guided tour that DRIVES the real `kopdar-ops` pack and shows,
 *                                 live, the three promises: it drafts (never sends), a named human
 *                                 approves, and every member-facing commit refuses at the transport
 *                                 gate (DECISIONS.md D21). This is the thing the README promises when
 *                                 it says "try it" — running tests proves the code works; this proves
 *                                 what the fleet will and won't do to a person.
 *
 *   node runtime/tour.ts --json   the same facts machine-readable, plus a contribution map: which
 *                                 guarantees hold right now (computed live, not asserted), which src
 *                                 modules have a dedicated test, which seams are intentional, and what
 *                                 is gated by design. A person — or an AI coding agent — can read it,
 *                                 pick a real target, write the failing test first, and open a PR that
 *                                 matches CONTRIBUTING.
 *
 * It is self-checking: every governance guarantee it demonstrates is asserted, and the script exits
 * non-zero if one stops holding. That is why it also runs in CI, not just as a demo.
 *
 * Zero dependencies. No install step. Node >= 23 (native type-stripping). It sends nothing, by design.
 */
import { loadPack } from './src/pack.ts';
import { Fleet } from './src/engine.ts';
import { runActions } from './src/runner.ts';
import { UNIMPLEMENTED_REFUSAL_CODES } from './src/errors.ts';
import { HEALTH_WITHHELD_MEMBER_REF } from './src/health.ts';
import type { CommitArgs } from './src/engine.ts';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // .../runtime
const REPO_ROOT = join(HERE, '..');
const PACK_DIR = join(REPO_ROOT, 'packs', 'kopdar-ops');
const DAY = 25_200_000; // 07:00 UTC = 14:00 WIB — inside the member's waking hours, clear of quiet hours

// Every `needs:` key the pack refuses to boot without. Same answers the contract test uses.
const ANSWERS: Record<string, string> = {
  community_name: 'AI Builders ID',
  schedule: 'every other Saturday',
  venue_source: 'manual',
  sponsor_list: 'none yet',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser, bukan manusia',
  rsvp_source_of_truth: 'google form',
  partner_policy: 'Kopdar Sebelah saja; wajib baris disclosure',
};

const DISCLOSURE_ID = 'pesan ini dikirim oleh asisten otomatis komunitas AI Builders ID — bukan oleh manusia. balas di sini untuk eskalasi ke organiser.';
const DISCLOSURE_EN = 'this message was sent by the automated assistant of AI Builders ID — not a human. reply here to escalate to the organiser.';
const REMINDER_ID = `Ingat ya besok kopdar!\n\n${DISCLOSURE_ID}`;
const REMINDER_EN = `Reminder: kopdar tomorrow!\n\n${DISCLOSURE_EN}`;

interface Observed { threw: boolean; code: string; message: string }

/** Run `fn`, capture whether it threw and the refusal code — a refusal is an outcome, not a crash. */
function observe(fn: () => unknown): Observed {
  try {
    fn();
    return { threw: false, code: '', message: '' };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const raw = String(err.message ?? e);
    return { threw: true, code: String(err.code ?? err.message ?? e), message: raw };
  }
}

/**
 * A writable copy of the shipped pack, in a folder that keeps its slug.
 *
 * The naming is not cosmetic: PKG-06 requires the directory name to match `slug:`, so a copy dropped
 * straight into a random temp folder refuses to boot *for that reason* — and a tamper demo would then
 * show a refusal the mutation had nothing to do with. A guarantee that passes for the wrong reason is
 * the failure class this repo keeps recording (D24, D28, D29), so the folder is named and each demo
 * below asserts the rule it expects in the message.
 */
function tamperPack(mutate: (yaml: string) => string): { obs: Observed; cleanup: () => void } {
  const tmp = mkdtempSync(join(tmpdir(), 'kinship-tour-'));
  const dir = join(tmp, 'kopdar-ops');
  cpSync(PACK_DIR, dir, { recursive: true });
  const yamlPath = join(dir, '.kinship.yaml');
  writeFileSync(yamlPath, mutate(readFileSync(yamlPath, 'utf8')));
  const obs = observe(() => loadPack(dir));
  return { obs, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

// --- the tour: drive the real pack, record what it refuses ------------------------------------------

function runStory() {
  const pack = loadPack(PACK_DIR);

  // 1) The boot gate: an installer cannot boot with any `needs:` key unanswered — the fleet never invents content.
  const missingOne = { ...ANSWERS };
  delete missingOne.community_name;
  const bootGate = observe(() => Fleet.boot(pack, missingOne, DAY));

  const fleet = Fleet.boot(pack, ANSWERS, DAY);
  fleet.registerMember('wa:62811', 'Asia/Jakarta');

  // 2) Draft-only: an attempt is a CARD for a human to decide, never a send.
  const draft = fleet.attempt({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-12' },
    phase: 't-minus-1', textId: REMINDER_ID, textEn: REMINDER_EN,
  });

  // 3) The organiser approves — then the commit still hits the transport gate, and the authorisation survives.
  if (draft.card) fleet.decideCard(draft.card.id, { verdict: 'approve', by: 'organiser', why: 'waktu dan tempat sudah benar' });
  const commit = observe(() => fleet.commit({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-12' },
    phase: 't-minus-1', recipients: ['wa:62811'], onBehalfOf: 'organiser',
    authorizationToken: draft.card ? `auth-${draft.card.id}` : 'auth-none',
    textId: REMINDER_ID, textEn: REMINDER_EN,
  }));

  // 4) Cross-promotion without a partner_policy answer: the class is *absent*, not denied (spec §2.11).
  const noPartner = { ...ANSWERS };
  delete noPartner.partner_policy;
  const crossFleet = new Fleet(pack, noPartner, DAY);
  const cross = observe(() => crossFleet.attempt({
    actionClass: 'promote.cross-community', agent: 'engagement', origin: { kind: 'event', id: 'kopdar-12' },
    textId: 'promo partner', textEn: 'partner promo',
  }));

  // 5) A fork cannot widen a protection it did not write. Two shapes of the same rule, both through the
  //    real boot gate on a slug-named copy: a tool the pack may not declare (D11), and a member number
  //    the org holds a floor on (D35). The folder naming matters — see `tamperPack`.
  const whatsappFork = tamperPack((yaml) => yaml.replace('      - whatsapp | draft', '      - whatsapp | draft\n      - whatsapp | send'));
  const floorFork = tamperPack((yaml) => yaml.replace('member_message_cap_per_24h: 2', 'member_message_cap_per_24h: 5'));
  const tamper = whatsappFork.obs;
  const orgFloor = floorFork.obs;

  // 5b) A pack cannot hand an agent the human's name. The seat set is closed (D36), so an agent called
  //     `organiser` would hold the veto over its own output — refused at resolution, before any state.
  const seatFork = observe(() => new Fleet({
    ...pack,
    agents: { ...pack.agents, organiser: { role: 'organiser', tools: [], autonomyByClass: { 'commit.channel-post': 'opt-in-auto' as const } } },
  }, ANSWERS, DAY));
  whatsappFork.cleanup();
  floorFork.cleanup();

  // 6) The runner (§1.6): a run owns its own meter, stops at the pack's cap, keeps its partial results.
  //    The cap is tightened to 3 for the demo — the real pack says 15; the rule being shown is the same.
  const tight = { ...pack, budgets: { ...pack.budgets, maxActionsPerRun: 3 } };
  const runnerFleet = Fleet.boot(tight, ANSWERS, DAY);
  runnerFleet.issueGrant({ actionClass: 'draft.reminder', kind: 'allow_always', scope: 'the tour demo', by: 'organiser' });
  const action = (id: string): CommitArgs => ({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id },
    recipients: [], onBehalfOf: 'organiser', textId: REMINDER_ID, textEn: REMINDER_EN,
  });
  const runner = runActions(runnerFleet, [action('kopdar-1'), action('kopdar-2'), action('kopdar-3'), action('kopdar-4'), action('kopdar-5')]);

  // 7) §2.11: copy travelling toward a partner may not carry a member identifier — the refusal names
  //    the member, never the sentence around it, because the timeline is member-readable (§2.3).
  const leakyId = `Kopdar Sebelah ngadain meetup Sabtu — yang belum daftar hubungi wa:62811.\n\n${DISCLOSURE_ID}`;
  const leakyEn = `Kopdar Sebelah is hosting a meetup Saturday — if you have not registered, contact wa:62811.\n\n${DISCLOSURE_EN}`;
  const leak = observe(() => fleet.commit({
    actionClass: 'promote.cross-community', agent: 'engagement', channel: 'telegram',
    origin: { kind: 'event', id: 'kopdar-12' }, partner: 'Kopdar Sebelah',
    recipients: ['wa:62811'], onBehalfOf: 'organiser', textId: leakyId, textEn: leakyEn,
  }));

  // 8) The fleet-condition snapshot (§1.2's read side): what the logged rows say about right now.
  //    Its member-ref field is filled the way a real one would be — a wake whose purpose names a
  //    person — so the privacy property below has something true to catch, not an empty state.
  const healthFleet = Fleet.boot(pack, ANSWERS, DAY);
  healthFleet.registerMember('wa:62811', 'Asia/Jakarta');
  healthFleet.beginEvent('kopdar-12');
  healthFleet.attempt({
    actionClass: 'draft.reminder', agent: 'event-ops', origin: { kind: 'event', id: 'kopdar-12' },
    phase: 't-minus-1', textId: REMINDER_ID, textEn: REMINDER_EN,
  });
  healthFleet.tripShatter('telegram', 'wa:62811');
  healthFleet.scheduleWake({ purpose: 'nudge wa:62811 about the venue change', nextCheckAt: DAY + 600_000, eventId: 'kopdar-12' });
  healthFleet.advance(3_600_000); // an hour later: a frozen lane, a card nobody has decided, a wake past due
  const health = healthFleet.health();
  // 9) The organiser's inbox over the same log: not counts, the list — and the fifth thing a count
  //    cannot show is the approved card whose send is still sitting with a human (D21).
  const inbox = healthFleet.inbox();

  // 10) The tier stack (D35/D36): what is actually in force, and which file put it there. The same log
  //     read as health/inbox — it appends nothing, dates itself, and replays identically — and the only
  //     one that answers "is this number the pack's or the org's?", which is the question a member
  //     protection has to be able to answer (§1.2).
  const eventsBeforeSettings = fleet.state.events.length;
  const settings = fleet.settings();
  const settingsIsPureRead = fleet.state.events.length === eventsBeforeSettings
    && JSON.stringify(fleet.settings()) === JSON.stringify(settings);

  // The org floor the pack beat, read out of the provenance row rather than restated here.
  const capRow = settings.provenance.find((p) => p.key === 'member_message_cap_per_24h');

  return {
    pack, bootGate, draft, commit, cross, tamper, orgFloor, seatFork, runner, leak, health, inbox,
    settings, settingsIsPureRead, capRow,
    mainFleetHealth: fleet.health(),
    mainFleetInbox: fleet.inbox(),
    timeline: fleet.auditTimeline(),
    authorizationLeftIntact: draft.card !== null && fleet.authorizationOf(draft.card.id) !== undefined && fleet.authorizationOf(draft.card.id) !== null,
    approvedCardId: draft.card ? draft.card.id : '',
  };
}

// --- the contribution map: computed from the files on disk, never a hardcoded claim -----------------

interface TestFile { file: string; tests: number }

function contributionMap() {
  const src = readdirSync(join(HERE, 'src')).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, '')).sort();
  const testFiles = readdirSync(join(HERE, 'test')).filter((f) => f.endsWith('.test.ts')).sort();

  const tests: TestFile[] = testFiles.map((f) => {
    const body = readFileSync(join(HERE, 'test', f), 'utf8');
    return { file: f, tests: (body.match(/^\s*test\(/gm) ?? []).length };
  });

  const testedNames = new Set(testFiles.map((f) => f.replace(/\.test\.ts$/, '')));
  // Honest, computed seam signal: src modules with no test file named after them. Not "untested" —
  // they may be covered by engine/replay integration tests — just where a focused test is missing.
  const noDedicatedTestFile = src.filter((s) => !testedNames.has(s));

  return { tests, src, noDedicatedTestFile };
}

// --- assertion layer: the tour doubles as a smoke test CI can gate ----------------------------------

function guarantees(s: ReturnType<typeof runStory>) {
  return {
    boot_requires_all_needs: s.bootGate.threw && /need_unanswered/.test(s.bootGate.code),
    member_action_starts_as_draft: s.draft.disposition === 'card',
    commit_refuses_no_transport: s.commit.threw && /no_transport/.test(s.commit.code),
    cross_promo_needs_partner_policy: s.cross.threw && /class_unavailable/.test(s.cross.code),
    // Both refusals name the rule that fired, not merely `pack_invalid`: with a random temp folder
    // name PKG-06 (path vs slug) would fail the boot on its own and this demo would bless nothing.
    fork_cannot_add_whatsapp_send: s.tamper.threw && /PKG-30/.test(s.tamper.message),
    fork_cannot_lower_an_org_floor: s.orgFloor.threw && /PKG-60/.test(s.orgFloor.message)
      && /member_message_cap_per_24h/.test(s.orgFloor.message) && /refused, not clamped/.test(s.orgFloor.message),
    pack_cannot_add_a_human_seat: s.seatFork.threw && /pack_invalid/.test(s.seatFork.code) && /seat collision/.test(s.seatFork.message),
    org_floor_is_visible_in_the_effective_number: s.settings.guardrails.memberMessageCapPer24h === 2
      && s.capRow?.source === 'pack' && /4/.test(s.capRow?.note ?? ''),
    settings_report_is_a_pure_read: s.settingsIsPureRead,
    run_cap_truncates_and_keeps_partial: s.runner.truncated === true && s.runner.executed === 3 && s.runner.dropped === 2
      && s.runner.outcomes.every((o) => o.result !== 'refused'),
    partner_copy_cannot_carry_a_member_ref: s.leak.threw && /partner_data_leak/.test(s.leak.code),
    authorization_survives_refusal: s.authorizationLeftIntact,
    // The snapshot must be non-empty for the privacy check to mean anything: a report over an empty
    // fleet carries no member ref because it carries nothing at all.
    health_snapshot_reports_what_was_logged: s.health.freezes.length === 1
      && s.health.wakes.overdue.length === 1
      && s.health.queue.pending === 1 && s.health.queue.oldestPendingAgeMs === 3_600_000,
    health_snapshot_carries_no_member_identifier: s.health.freezes.length === 1
      && !JSON.stringify(s.health).includes('wa:62811')
      && JSON.stringify(s.health).includes(HEALTH_WITHHELD_MEMBER_REF),
    health_counts_the_sends_a_human_did: (s.mainFleetHealth.refusals.find((r) => r.code === 'no_transport')?.count ?? 0) === 1,
    // The inbox is the same log read as a list instead of counts: a card, a frozen lane, and an
    // overdue wake all show, oldest-waiting first, and nothing about a person rides in it.
    inbox_lists_everything_awaiting_a_human: s.inbox.counts.verdict === 1 && s.inbox.counts.release === 1
      && s.inbox.counts.overdue === 1 && s.inbox.counts.handoff === 0 && s.inbox.items.length === 3
      && s.inbox.items.every((i, n) => n === 0 || s.inbox.items[n - 1]!.ageMs >= i.ageMs),
    inbox_names_the_send_a_human_still_owes: s.mainFleetInbox.items.some((i) => i.kind === 'handoff' && i.ref === s.approvedCardId),
    inbox_carries_no_member_identifier: !JSON.stringify([s.inbox, s.mainFleetInbox]).includes('wa:62811')
      && JSON.stringify(s.inbox).includes(HEALTH_WITHHELD_MEMBER_REF),
    inbox_counts_inputs_without_naming_a_person: s.inbox.memberInputs.received === 0
      && s.inbox.memberInputs.linkable === false && /cannot be joined/.test(s.inbox.memberInputs.note),
  };
}

// --- output -----------------------------------------------------------------------------------------

function actionClasses(pack: ReturnType<typeof loadPack>) {
  const out: Record<string, Record<string, string>> = {};
  for (const [name, agent] of Object.entries(pack.agents)) {
    out[name] = { ...(agent.autonomyByClass as Record<string, string>) };
  }
  return out;
}

function printHuman(s: ReturnType<typeof runStory>, g: ReturnType<typeof guarantees>): void {
  const hr = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}`);
  console.log('Kinship tour — the fleet proposes, the organiser approves, nothing sends.');
  console.log(`pack ${s.pack.key} · node ${process.version} · zero dependencies`);

  hr('1. Boot gate — the pack refuses to invent your community');
  console.log(`  booted with one need unanswered → refused: ${s.bootGate.code || '(no refusal!)'}`);
  console.log(`  booted with all ${s.pack.needs.length} needs answered → OK`);

  hr('2. Draft-only — an attempt is a card, never a message');
  console.log(`  event-ops tried class 'draft.reminder' → disposition: ${s.draft.disposition}${s.draft.card ? ` (card ${s.draft.card.id})` : ''}`);
  console.log('  member-facing classes start at draft, not auto — a human must decide');

  hr('3. Approval, then the transport gate (D21)');
  console.log(`  organiser approved the card. the fleet then tried to COMMIT to wa:62811 →`);
  console.log(`  refused: ${s.commit.code || '(IT SENT — this is the bug we cannot ship!)'}`);
  console.log(`  one-send authorisation left intact for the organiser's own hand: ${s.authorizationLeftIntact}`);

  hr('4. Governance refuses bad lanes and bad forks');
  console.log(`  cross-promo without partner_policy → ${s.cross.code || '(reachable!)'} — absent, not denied (spec §2.11)`);
  console.log(`  fork adds 'whatsapp | send' → boot ${s.tamper.threw ? `refused by ${/PKG-\d+/.exec(s.tamper.message)?.[0] ?? s.tamper.code}` : 'ACCEPTED (invariant broken!)'}`);
  console.log(`  fork raises the member cap 2 → 5, above its org's floor of 4 → boot ${s.orgFloor.threw ? `refused by ${/PKG-\d+/.exec(s.orgFloor.message)?.[0] ?? s.orgFloor.code}: ${/refused, not clamped/.test(s.orgFloor.message) ? 'refused, not clamped' : '(said nothing about clamping)'}` : 'ACCEPTED (the org tier is decorative!)'}`);
  console.log(`  pack names an agent after the human seat → ${s.seatFork.threw ? `refused: ${s.seatFork.code}` : 'ACCEPTED (an agent would hold the veto)'}`);

  hr('5. The runner (spec §1.6) — a run meters itself and stops at the pack\'s cap');
  console.log(`  5 actions handed to a run capped at ${s.runner.cap} → executed ${s.runner.executed}, dropped ${s.runner.dropped}, truncated: ${s.runner.truncated}`);
  console.log(`  metered attempts: ${s.runner.actions} · actions never attempted: ${s.runner.notAttempted.length} — partial results kept, no retry storm`);

  hr('6. Cross-promotion (spec §2.11) — copy travels, people do not');
  console.log(`  partner promo carrying a member ref → refused: ${s.leak.code || '(IT PASSED — a member number reached a partner!)'}`);
  console.log('  the refusal names the member, not the sentence: the audit timeline is readable by members too (§2.3)');

  hr('7. The fleet-condition snapshot (spec §1.2, read side) — what the log says about right now');
  console.log(`  frozen lanes: ${s.health.freezes.map((f2) => `${f2.channel} (${f2.ageMs / 3_600_000}h)`).join(', ') || 'none'}`);
  console.log(`  approval queue: ${s.health.queue.pending} pending of ${s.health.queue.cap}, oldest ${s.health.queue.oldestPendingAgeMs}ms · ${s.health.wakes.overdue.length} wake(s) past due`);
  console.log(`  hand deliveries so far (no_transport refusals on the tour fleet): ${s.mainFleetHealth.refusals.find((r) => r.code === 'no_transport')?.count ?? 0} — D21, as a number`);
  console.log(`  idle agents (FR-1.11): ${s.mainFleetHealth.idleAgents.map((a) => `${a.agent}:${a.recommendation}`).join(' ')}`);
  console.log(`  a member identifier in a wake purpose was substituted, not forwarded: ${JSON.stringify(s.health).includes('wa:62811') ? 'NO — LEAK' : 'yes'}`);
  console.log(`  what this report will not say: ${s.health.unmeasured.length} named items, incl. sentiment and churn (PRD §5 keeps them out of v0)`);

  hr('8. The organiser inbox (spec §1.2, read side) — not the condition, the list');
  console.log(`  counts: ${Object.entries(s.inbox.counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  for (const item of s.inbox.items) {
    console.log(`  · ${item.kind.padEnd(7)} ${item.ageMs / 60_000}min  ${item.detail.slice(0, 72)}${item.detail.length > 72 ? '…' : ''}`);
    console.log(`    action: ${item.action}`);
  }
  console.log(`  the shadow-mode queue a count cannot show: ${s.mainFleetInbox.items.filter((i) => i.kind === 'handoff').length} approved card(s) with a live authorization and no delivery — the send is a human's hand (D21)`);
  console.log(`  member inputs: ${s.inbox.memberInputs.received} received, ${s.inbox.memberInputs.awaitingVerdict} awaiting a verdict, joinable: ${s.inbox.memberInputs.linkable} — ${s.inbox.memberInputs.note.slice(0, 58)}…`);
  console.log(`  ordering means waiting, not importance: ${s.inbox.limits.length} stated limits`);

  hr('9. The tier stack (spec §1.7, PRD FR-1.18) — what is in force, and which file put it there');
  console.log(`  resolved from: ${s.settings.tiers.join(' -> ')} · org ${s.settings.orgKey ?? '(none — this pack is its own top tier)'}`);
  for (const row of s.settings.provenance.filter((p) => p.tier === 'guardrail')) {
    console.log(`  · ${row.key.padEnd(28)} ${String(row.effective).padEnd(5)} from ${row.source.padEnd(7)} ${row.note.slice(0, 60)}${row.note.length > 60 ? '…' : ''}`);
  }
  console.log(`  human seats: ${s.settings.humanSeats.join(', ')} — one, while PRD §12-Q12 (delegation) is the owner's unanswered question`);
  console.log(`  agent roles the org recognises: ${s.settings.agentRoles.join(', ')}`);
  console.log(`  ceilings that only narrow: ${Object.entries(s.settings.autonomyCeiling).map(([c, l]) => `${c}<=${l}`).join(' ') || 'none'}`);
  console.log(`  a settings read that wrote to the log would be a fifth governing actor: ${s.settingsIsPureRead ? 'it appends nothing, and replays identical' : 'FAIL — it mutated state'}`);
  console.log(`  what this tier cannot do: ${s.settings.limits.length} stated limits, incl. "the org cannot change a value a pack declared"`);

  hr('Still prose (derived from `UNIMPLEMENTED_REFUSAL_CODES`, not restated)');
  for (const code of Object.keys(UNIMPLEMENTED_REFUSAL_CODES)) console.log(`  ${code} — declared debt; see \`tour.ts --json\` .contributionMap.declaredDebt before opening a PR on it`);

  hr('The audit trail — every outcome above is a replayable log line');
  for (const line of s.timeline) console.log(`  ${line}`);

  hr('Verdict');
  for (const [k, v] of Object.entries(g)) console.log(`  ${v ? 'OK  ' : 'FAIL'}  ${k.replace(/_/g, ' ')}`);
  const allOk = Object.values(g).every(Boolean);
  console.log(`\n${allOk ? 'All governance guarantees hold. Run `node runtime/tour.ts --json` for the contribution map.' : 'A guarantee BROKE — do not trust anything downstream.'}`);
}

function printJson(s: ReturnType<typeof runStory>, g: ReturnType<typeof guarantees>): void {
  const cm = contributionMap();
  const payload = {
    meta: {
      project: 'Kinship',
      repo: 'https://github.com/Therealratoshen/kinship',
      node: process.version,
      zeroDependencies: true,
      installStep: false,
      sendsNothingByConstruction: g.commit_refuses_no_transport && g.member_action_starts_as_draft,
      license: 'MIT',
    },
    pack: {
      key: s.pack.key,
      schema: s.pack.schema,
      organisation: s.pack.organisation,
      locale: s.pack.locale,
      needs: s.pack.needs,
      autonomyByClass: actionClasses(s.pack),
    },
    tierStack: {
      whatItIs: 'runtime/src/settings.ts (`Fleet.settings()`, resolved once in the constructor) — the org -> pack resolution the spec names (§1.7 / PRD FR-1.18). `orgs/<key>.yaml` holds floors and an autonomy ceiling; the pack holds its own numbers; enforcement reads the RESOLVED values, never the raw pack.',
      note: 'The org tier has exactly two powers, and the third it does not have is the design: it can REFUSE a pack whose declared value is weaker than its floor, and it can FILL a key the pack never wrote. It can never replace a number a pack declared — refuse, not clamp — so the effective value always appears in a file. Guardrail floors are validations (`pack_invalid`); ceilings are real narrowings (§1.7); `never` in an org ceiling is refused because absence is the pack\'s to declare (invariant #1); a seat set is an org declaration, size one while PRD §12-Q12 is unanswered.',
      resolved: s.settings,
      proof: {
        fork_below_org_floor: s.orgFloor.threw ? s.orgFloor.message : 'ACCEPTED — the tier is decorative',
        pack_agent_named_after_a_seat: s.seatFork.threw ? s.seatFork.message : 'ACCEPTED — an agent would hold the human veto',
        settings_read_is_pure: s.settingsIsPureRead,
      },
    },
    guarantees: g,
    fleetCondition: {
      whatItIs: 'runtime/src/health.ts (`Fleet.health()`) — a read-only snapshot derived from rows already in the log: live lane freezes and their age, queue depth plus the age of the oldest pending card and escalation, budget state per event, overdue wakes, refusals counted by code, idle agents (FR-1.11), and `unmeasured`.',
      note: 'It reports the fleet\'s condition, not the community\'s feelings: PRD §5 puts member-intelligence / churn scoring out of v0, and phase 1 ships no transport (D21/D9), so there is no member traffic to read. The `unmeasured` array is part of the artefact, not a disclaimer bolted on. No member identifier rides in it (§2.9/FR-5.3): a free-text field naming a registered member is substituted with a fixed sentence.',
      snapshot: s.health,
      tourFleet: s.mainFleetHealth,
    },
    organiserInbox: {
      whatItIs: 'runtime/src/inbox.ts (`Fleet.inbox()`) — the same log read as a list instead of counts: undecided drafts (verdict), approved-but-undelivered cards whose one-send authorization is still live (handoff, D21), lanes frozen pending a human release (release), and wakes past due with nothing re-arming them (overdue). Ordered by waiting time, oldest first.',
      note: 'It is a read: it appends nothing and replays identically (§1.2). It borrows health.ts\'s privacy sweep rather than re-implementing it, so no member identifier rides in it (§2.9), and it counts member inputs without itemising them because the log carries no input→card link. Age is the ordering, not importance — `limits` says so, because PRD §5 keeps ranking judgement out of the runtime.',
      items: s.inbox.items,
      tourFleet: s.mainFleetInbox,
    },
    contributionMap: {
      runtimeTests: cm.tests,
      srcModules: cm.src,
      srcModulesWithoutDedicatedTestFile: cm.noDedicatedTestFile,
      intentionalSeams: [
        {
          id: 'per-run-action-cap',
          spec: '§1.6 / budgets.max_actions_per_run',
          where: 'runtime/src/runner.ts (`runActions`) · runtime/src/engine.ts (header)',
          status: 'The engine is still not a scheduler on purpose (D10 — phase 1 schedules inside the organiser\'s own instance), and the cap is not wired into `Fleet.commit`. The run side does now ship: `runActions()` owns one run\'s meter, stops at the first crossing with partial results kept, drops the tail without attempting it, and returns a report. Wiring it into a real scheduler is the open contribution, not writing the meter.',
        },
      ],
      gatedByDesign: [
        { id: 'channel-transport', where: 'DECISIONS.md D21', note: 'Behind the shadow-mode gate (D9). Do NOT open a PR adding a transport — "phase 1 sends nothing" is the point.' },
        { id: 'whatsapp-send', where: 'DECISIONS.md D11/D13/D17', note: 'The validator refuses `whatsapp | send` at pack boot. Never add it.' },
        { id: 'host-adapter-inside-runtime', where: 'spec/HOST-CONTRACT.md (D33) · runtime/test/boundary.test.ts (D32)', note: 'An adapter — a provider SDK, a channel socket, a scheduler, a key — belongs in a sibling package (`adapters/<host>/`), never under `runtime/src`: the boundary gate fails the build on it there, on purpose. Do NOT open a PR adding one inside runtime/ before D9.' },
        { id: 'second-human-seat', where: 'PRD §12-Q12 · runtime/src/roles.ts · orgs/*.yaml (`human_seats`)', note: 'The seat SHAPE is a set; the SIZE is one, and that is the owner\'s open question about delegation, not a runtime limitation to "fix" by adding a `delegate`. A second seat means deciding who can veto a member-facing send on someone else\'s behalf — a decision log entry before it is code.' },
        { id: 'org-tier-clamp', where: 'runtime/src/settings.ts · spec §1.7 / PRD FR-1.18', note: 'A pack weaker than its org\'s floor is REFUSED, never silently rounded to the floor. Do NOT open a PR "simplifying" this into strictest-wins-with-a-warning: a value edited to 20 and enforced at 4 is a file that lies about the system it configures.' },
      ],
      readFirst: [
        'spec/GOVERNANCE-SPEC-OUTLINE.md — Part 6 maps every rule to its runtime file and holding test',
        'spec/HOST-CONTRACT.md — the four seams (credential, clock, store, transport): what the host owns, what Kinship checks afterwards, and where an adapter\'s code belongs',
        'CONTRIBUTING.md — decisions are append-only DECISIONS.md rows; new spec rule needs a failing test first',
        'DECISIONS.md — who decided what, when, and how reversible it is',
      ],
      howToVerify: [
        'node scripts/gates.mjs',
        'node scripts/validate-pack.mjs packs/kopdar-ops',
        'node --test scripts/*.test.mjs',
        'node --test runtime/test/*.test.ts',
        'node runtime/tour.ts',
      ],
      // Derived from the list `test/errors.test.ts` polices, so this cannot drift from it:
      // these are the spec promises that are still prose. Read `blockedOn` before opening a PR.
      declaredDebt: Object.entries(UNIMPLEMENTED_REFUSAL_CODES).map(([code, why]) => ({
        code,
        why,
        blockedOn: code === 'unsourced_number'
          ? 'an owner decision: the pack has no key that names a source for a figure, so the check has nothing to measure against. Spec/PRD work, not code.'
          : 'not debt to pay off — a return value, not a refusal. Do not "implement" it.',
      })),
    },
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printHelp(): void {
  console.log(`Kinship tour — drive the real pack, see the governance refuse, and find a first PR.

  node runtime/tour.ts        run the guided tour (prints the audit trail + verdict)
  node runtime/tour.ts --json emit the machine-readable contribution map
  node runtime/tour.ts --help this message

The tour asserts every guarantee it shows and exits non-zero if one breaks, so CI runs it too.`);
}

// --- main -------------------------------------------------------------------------------------------

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

const story = runStory();
const g = guarantees(story);
if (argv.includes('--json')) printJson(story, g);
else printHuman(story, g);

// Self-check: any guarantee that broke fails the process (and therefore CI).
process.exitCode = Object.values(g).every(Boolean) ? 0 : 1;
