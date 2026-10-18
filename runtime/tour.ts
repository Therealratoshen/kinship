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

interface Observed { threw: boolean; code: string }

/** Run `fn`, capture whether it threw and the refusal code — a refusal is an outcome, not a crash. */
function observe(fn: () => unknown): Observed {
  try {
    fn();
    return { threw: false, code: '' };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return { threw: true, code: String(err.code ?? err.message ?? e) };
  }
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

  // 5) A fork that adds `whatsapp | send` cannot even boot — the ban lives in the toolset, gated at boot (D11/D13/D17).
  let tamper: Observed = { threw: false, code: '' };
  const tmp = mkdtempSync(join(tmpdir(), 'kinship-tour-'));
  try {
    cpSync(PACK_DIR, tmp, { recursive: true });
    const yamlPath = join(tmp, '.kinship.yaml');
    const yaml = readFileSync(yamlPath, 'utf8');
    writeFileSync(yamlPath, yaml.replace('      - whatsapp | draft', '      - whatsapp | draft\n      - whatsapp | send'));
    tamper = observe(() => loadPack(tmp));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

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

  return {
    pack, bootGate, draft, commit, cross, tamper, runner, leak,
    timeline: fleet.auditTimeline(),
    authorizationLeftIntact: draft.card !== null && fleet.authorizationOf(draft.card.id) !== undefined && fleet.authorizationOf(draft.card.id) !== null,
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
    fork_cannot_add_whatsapp_send: s.tamper.threw && /pack_invalid/.test(s.tamper.code),
    run_cap_truncates_and_keeps_partial: s.runner.truncated === true && s.runner.executed === 3 && s.runner.dropped === 2
      && s.runner.outcomes.every((o) => o.result !== 'refused'),
    partner_copy_cannot_carry_a_member_ref: s.leak.threw && /partner_data_leak/.test(s.leak.code),
    authorization_survives_refusal: s.authorizationLeftIntact,
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
  console.log(`  fork adds 'whatsapp | send' → boot ${s.tamper.threw ? `refused: ${s.tamper.code}` : 'ACCEPTED (invariant broken!)'}`);

  hr('5. The runner (spec §1.6) — a run meters itself and stops at the pack\'s cap');
  console.log(`  5 actions handed to a run capped at ${s.runner.cap} → executed ${s.runner.executed}, dropped ${s.runner.dropped}, truncated: ${s.runner.truncated}`);
  console.log(`  metered attempts: ${s.runner.actions} · actions never attempted: ${s.runner.notAttempted.length} — partial results kept, no retry storm`);

  hr('6. Cross-promotion (spec §2.11) — copy travels, people do not');
  console.log(`  partner promo carrying a member ref → refused: ${s.leak.code || '(IT PASSED — a member number reached a partner!)'}`);
  console.log('  the refusal names the member, not the sentence: the audit timeline is readable by members too (§2.3)');

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
      locale: s.pack.locale,
      needs: s.pack.needs,
      autonomyByClass: actionClasses(s.pack),
    },
    guarantees: g,
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
      ],
      readFirst: [
        'spec/GOVERNANCE-SPEC-OUTLINE.md — Part 6 maps every rule to its runtime file and holding test',
        'CONTRIBUTING.md — decisions are append-only DECISIONS.md rows; new spec rule needs a failing test first',
        'DECISIONS.md — who decided what, when, and how reversible it is',
      ],
      howToVerify: [
        'node scripts/validate-pack.mjs packs/kopdar-ops',
        'node --test scripts/validate-pack.test.mjs',
        'cd runtime && node --test test/*.test.ts',
      ],
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
