import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPack, parseCoverage } from '../src/pack.ts';
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

test('a pack loads from any working directory, not only the repo root', () => {
  // A host installs this pack wherever it likes and runs from its own directory. The org tier is
  // found by walking UP from the pack folder, so the validator and the loader must resolve the
  // SAME file — the loader's answer has to be handed down, or the gate checks one manifest and
  // the loader reads another.
  const cwd = process.cwd();
  const elsewhere = mkdtempSync(join(tmpdir(), 'kinship-cwd-'));
  try {
    process.chdir(elsewhere);
    const p = loadPack(PACK_DIR);
    assert.equal(p.key, 'kinshipai/bundled/event-ops/kopdar');
    assert.ok(p.org, 'the org floor is still found from outside the repo — booting floorless is not a fallback');
    assert.equal(p.org?.key, 'kinshipai');
  } finally {
    process.chdir(cwd);
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test('a pack that declares a language pair the runtime does not implement refuses to load', () => {
  // The runtime implements one pair — Indonesian first, English paired — and the member-facing
  // fields and the canonical disclosure line are named for it. A pack that declares another pair
  // must be refused at load, not at send time with a refusal that names neither.
  const dir = mkdtempSync(join(tmpdir(), 'kinship-locale-'));
  try {
    const target = join(dir, 'kopdar-ops');
    cpSync(PACK_DIR, target, { recursive: true });
    const f = join(target, '.kinship.yaml');
    writeFileSync(f, readFileSync(f, 'utf8').replace(/^locale:.*$/m, 'locale: [en]'));
    assert.throws(
      () => loadPack(target),
      (e: { code?: string; message?: string }) => {
        assert.equal(e.code, 'pack_invalid');
        assert.match(String(e.message), /locale/, 'the refusal names the setting that caused it');
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

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

// --- the sanction ladder (research/COMMUNITY-GOVERNANCE-PATTERNS-2026-10-19.md §5, DECISIONS.md D37) ----
// A normal community does not have a refusal code. It has a set of rungs a person climbs before they are
// gone, and every rung comes with an explanation. This pack had the flag and the freeze and nothing else,
// so the norms the community actually runs on lived in nobody's file. Writing them down is the addition —
// and they are written down as DATA, because the moment the fleet can execute a sanction it is a
// moderation bot with a governance manual parked next to it.
//
// `loadPack` is the gate for both halves: the ladder's shape (a human on every rung, an appeal on the
// last), and its unreachability (no rung may be a tool some agent declares).

/**
 * Edit one string inside the pack's declared ladder, and fail loudly if the string is gone.
 * A tamper that silently matches nothing does not test the rule — it tests that the file still says what
 * the test thinks it says, which is the trap the `organisation:` case above had to be written around.
 */
function mutateLadder(yaml: string, search: string, replace: string): string {
  assert.ok(yaml.includes(search), `fixture drifted: \`${search}\` is no longer in packs/kopdar-ops/.kinship.yaml — update the test, do not delete it`);
  return yaml.replace(search, replace);
}

test('the shipped pack declares its sanction ladder, and the ladder comes back as ordered data', () => {
  const p = loadPack(PACK_DIR);
  assert.deepEqual(p.sanctionLadder?.map((r) => r.rung), ['nudge', 'private-word', 'public-correction', 'removal'],
    'the rungs keep their order — a ladder is a sequence, and a set of sanctions is not');
  assert.deepEqual([...new Set(p.sanctionLadder?.map((r) => r.by))], ['organiser'], 'every rung is an act a human performs');
  assert.ok(p.sanctionLadder?.every((r) => r.memberTold), 'every rung says what the member is told');
  assert.ok(p.sanctionLadder?.[3]!.appeal, 'the last rung names the way back in');
});

test('a ladder block carrying a key the parser does not know refuses to boot — the parser does not guess (D37)', () => {
  const fork = forkCopy();
  try {
    // An invented `tool:` under a rung is the sneaky wiring: it is not in any agent's `tools:` list, so
    // no reachability rule sees it, and a parser that ignored unknown keys would read the rung as clean
    // and drop the line. `block()` would then be a filter, and a filter is not a trust boundary.
    fork.mutate((yaml) => mutateLadder(yaml, '    via: organiser-in-channel\n  - rung: private-word', '    via: organiser-in-channel\n    tool: telegram | send\n  - rung: private-word'));
    assert.throws(() => loadPack(fork.dir), (e: unknown) => {
      const msg = String(e);
      assert.match(msg, /pack_invalid/);
      assert.match(msg, /tool/, 'names the key it could not read');
      assert.match(msg, /ladder parse gate/, 'and says which gate fired, so a reader does not hunt for a PKG rule that never existed');
      return true;
    });
  } finally {
    fork.cleanup();
  }
});

test('a rung with no name refuses to boot — an unreadable rung is not a skipped rung', () => {
  const fork = forkCopy();
  try {
    fork.mutate((yaml) => mutateLadder(yaml, '  - rung: nudge\n', '  -\n'));
    assert.throws(() => loadPack(fork.dir), (e: unknown) => {
      const msg = String(e);
      assert.match(msg, /pack_invalid/);
      assert.match(msg, /ladder parse gate/);
      return true;
    });
  } finally {
    fork.cleanup();
  }
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

/**
 * A writable copy of the shipped pack, in a folder that still carries the pack's slug.
 *
 * The naming is load-bearing, not cosmetic: PKG-06 requires the directory name to match `slug:`, so a
 * copy dropped straight into a random `mkdtemp` folder fails the shape gate before the tamper is ever
 * read — and an assertion written as `/pack_invalid/` then passes on a refusal that has nothing to do
 * with the mutation it claims to test. That is the D24/D28/D29 class (a check that blesses the wrong
 * reason) sitting in this repo's own suite, which the org-tier tests below exposed by needing the
 * second half of the message to be real. So the folder is named, and every tamper test names the rule
 * it expects to see.
 */
function forkCopy(): { dir: string; mutate(edit: (yaml: string) => string): void; cleanup(): void } {
  const tmp = mkdtempSync(join(tmpdir(), 'kinship-pack-'));
  const dir = join(tmp, 'kopdar-ops'); // PKG-06: path and slug must agree, or the wrong rule fires
  cpSync(PACK_DIR, dir, { recursive: true });
  return {
    dir,
    mutate: (edit) => {
      const yamlPath = join(dir, '.kinship.yaml');
      writeFileSync(yamlPath, edit(readFileSync(yamlPath, 'utf8')));
    },
    cleanup: () => rmSync(tmp, { recursive: true, force: true }),
  };
}

test('a fork that deletes a member invariant gets a pack that refuses to boot (D15 / FR-1.14)', () => {
  const fork = forkCopy();
  try {
    fork.mutate((yaml) => yaml.replace(/^  member_opt_out_persists_across_lanes: true.*\n/m, ''));
    assert.throws(() => loadPack(fork.dir), /PKG-24.*member_opt_out_persists_across_lanes/, 'the suppression invariant is not configurable away');
  } finally {
    fork.cleanup();
  }
});

test('a fork that adds `whatsapp | send` gets a pack that refuses to boot (D11/D13/D17)', () => {
  const fork = forkCopy();
  try {
    fork.mutate((yaml) => yaml.replace('      - whatsapp | draft', '      - whatsapp | draft\n      - whatsapp | send'));
    assert.throws(() => loadPack(fork.dir), /PKG-30.*whatsapp \| send/, 'the WhatsApp auto-send ban lives in the toolset, and the gate holds at boot');
  } finally {
    fork.cleanup();
  }
});

test('a fork that edits a guardrail value out of range refuses to boot (bounded protections)', () => {
  const fork = forkCopy();
  try {
    fork.mutate((yaml) => yaml.replace('member_message_cap_per_24h: 2', 'member_message_cap_per_24h: 50'));
    assert.throws(() => loadPack(fork.dir), /PKG-48.*member_message_cap_per_24h/, 'a cap of 50/day is not a cap — the bound is ours, the value is the owner\'s');
  } finally {
    fork.cleanup();
  }
});

// --- the org tier at the boot gate (D35) -----------------------------------------------
// `loadPack` is the only place a file is read, so the organisation manifest a pack names is loaded
// here and nowhere else: a fork cannot boot past its org's floor, and cannot boot a pack whose org
// file is missing — the second half matters as much as the first, because a silent "no org found"
// would drop every floor the operator thought they were holding.

test('the shipped pack names its organisation, and boot loads that manifest through the same gate', () => {
  const p = loadPack(PACK_DIR);
  assert.equal(p.organisation, 'kinshipai');
  assert.ok(p.org, 'the org tier is present on a real boot, not only in a test fixture');
  assert.equal(p.org.key, 'kinshipai');
  assert.deepEqual(p.org.humanSeats, ['organiser']);
  assert.equal(p.org.floors.memberMessageCapPer24h, 4, 'the cap no kopdar pack may exceed');
  assert.equal(p.guardrails.memberMessageCapPer24h, 2, 'the bundled pack is stricter than its own org floor, and keeps its number');
  assert.deepEqual(p.declared!.sort().includes('member_message_cap_per_24h'), true, 'the pack wrote that key, so provenance says pack, not default');
});

test('a pack that declares no organisation boots exactly as it did before the tier existed', () => {
  const fork = forkCopy();
  try {
    // The shipped line carries an explanatory comment, so the whole line goes — a replace that only
    // matched the bare `organisation: kinshipai\n` would silently edit nothing and this test would
    // then be proving that a pack with an org has no org, which is the opposite of what it says.
    fork.mutate((yaml) => yaml.replace(/^organisation:[ \t]*\S[^\n]*\n/m, ''));
    const p = loadPack(fork.dir);
    assert.equal(p.organisation, null);
    assert.equal(p.org, undefined, 'no tier, no floors, no ceiling — the pack is its own top tier');
    assert.equal(p.guardrails.memberMessageCapPer24h, 2);
  } finally {
    fork.cleanup();
  }
});

test('A FORK THAT GOES BELOW ITS ORG FLOOR REFUSES TO BOOT — and is not clamped (D35 / FR-1.18)', () => {
  const fork = forkCopy();
  try {
    // 5 is inside the validator's own bound (1..5), so this is the org floor doing the work alone.
    // Direction matters: for a *cap* the looser value is the larger one, so 5 breaches a floor of 4
    // and 3 would not — 3 is the member getting fewer messages, which is what the org asked for.
    fork.mutate((yaml) => yaml.replace('member_message_cap_per_24h: 2', 'member_message_cap_per_24h: 5'));
    assert.throws(() => loadPack(fork.dir), (e: unknown) => {
      const msg = String(e);
      assert.match(msg, /pack_invalid/);
      // The shape gate is the one that fires on this path — `validatePack` runs before the parser, and
      // it now knows the org tier too (PKG-60). The boot-level check in `settings.ts` is the same rule
      // for a runtime constructed from an object rather than a folder, and `settings.test.ts` pins it.
      assert.match(msg, /PKG-60/, 'it names the rule, so a reader can find the floor in the validator');
      assert.match(msg, /member_message_cap_per_24h/);
      assert.match(msg, /kinshipai/, 'it names the org whose floor was breached');
      assert.match(msg, /refused, not clamped/, 'and says which of the two it did');
      return true;
    }, 'a cap of 5/day is a fork widening a member protection past what the operator holds');
  } finally {
    fork.cleanup();
  }
});

test('a pack naming an organisation whose manifest is absent refuses, rather than booting floorless', () => {
  const fork = forkCopy();
  try {
    fork.mutate((yaml) => yaml.replace('organisation: kinshipai', 'organisation: no-such-org'));
    assert.throws(() => loadPack(fork.dir), (e: unknown) => {
      const msg = String(e);
      assert.match(msg, /no-such-org/, 'the refusal names the org it looked for, so the fix is obvious from the message');
      assert.match(msg, /PKG-58/, 'and the rule that caught it');
      return true;
    });
  } finally {
    fork.cleanup();
  }
});

test('the real pack boots into a Fleet whose settings carry the org tier', () => {
  const fleet = Fleet.boot(loadPack(PACK_DIR), ANSWERS, DAY);
  const s = fleet.settings();
  assert.equal(s.orgKey, 'kinshipai');
  assert.deepEqual(s.humanSeats, ['organiser']);
  assert.equal(s.guardrails.memberMessageCapPer24h, 2, 'effective: the pack\'s own stricter number');
  assert.ok(s.provenance.some((p) => p.source === 'pack'));
  assert.deepEqual(fleet.settings(), fleet.settings(), 'a pure read returns the same artefact twice, and writes nothing between the calls');
  assert.equal(fleet.state.events.length, 0, 'and boot + settings together appended no event');
});

// --- the community's coverage window, at the boot door --------------------------------------------
// The CI door is `scripts/validate-pack.mjs` (PKG-65). `loadPack` runs the validator FIRST, so a
// boot-level test of a malformed window sees **PKG-65's** message — which is why the parser's own
// refusals are proved by calling `parseCoverage` directly, further down this file. A boot-level test
// that reads `pack_invalid` and a field name cannot tell the two doors apart, and would pass with the
// parser's refusals deleted: a check that cannot fail (the D24 class).

/** A copy of the shipped pack with its `coverage:` block replaced by `body`. */
const withCoverageBlock = (body: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-coverage-'));
  const target = join(dir, 'kopdar-ops');
  cpSync(PACK_DIR, target, { recursive: true });
  const f = join(target, '.kinship.yaml');
  const text = readFileSync(f, 'utf8');
  assert.match(text, /^coverage:\s*$/m, 'the shipped pack must carry a coverage block for this test to replace it');
  writeFileSync(f, text.replace(/^coverage:\s*$[\s\S]*?(?=^\S)/m, `coverage:\n${body}\n\n`));
  return target;
};

/** One staffed window, in the file's spelling. */
const WINDOW = (days: string, opens: string, closes: string): string =>
  `  windows:\n    - days: ${days}\n      opens: "${opens}"\n      closes: "${closes}"`;

test('the shipped pack parses its coverage window into the numbers the file states', () => {
  const p = loadPack(PACK_DIR);
  assert.deepEqual(p.coverage, {
    mode: 'staffed',
    timezone: 'Asia/Jakarta',
    windows: [{ days: [1, 2, 3, 4, 5], opens: 9 * 60, closes: 18 * 60 }],
  });
});

test('a coverage window with no timezone refuses to load — business hours without a zone is not a commitment', () => {
  const target = withCoverageBlock(`  mode: staffed\n${WINDOW('mon,tue', '09:00', '18:00')}`);
  try {
    assert.throws(
      () => loadPack(target),
      (e: { code?: string; message?: string }) => {
        assert.equal(e.code, 'pack_invalid');
        assert.match(String(e.message), /timezone/i, 'the refusal names the field that caused it');
        return true;
      },
    );
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

test('a coverage window that closes before it opens refuses to load', () => {
  const target = withCoverageBlock(`  mode: staffed\n  timezone: Asia/Jakarta\n${WINDOW('mon', '18:00', '09:00')}`);
  try {
    assert.throws(
      () => loadPack(target),
      (e: { code?: string; message?: string }) => {
        assert.equal(e.code, 'pack_invalid');
        assert.match(String(e.message), /opens|closes/i, 'the refusal names the field that caused it');
        return true;
      },
    );
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

test('a coverage window with an unrecognised mode refuses to load', () => {
  const target = withCoverageBlock('  mode: whenever\n  timezone: Asia/Jakarta');
  try {
    assert.throws(
      () => loadPack(target),
      (e: { code?: string; message?: string }) => {
        assert.equal(e.code, 'pack_invalid');
        assert.match(String(e.message), /mode/i, 'the refusal names the field that caused it');
        return true;
      },
    );
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

test('a coverage window with an unknown weekday refuses to load', () => {
  const target = withCoverageBlock(`  mode: staffed\n  timezone: Asia/Jakarta\n${WINDOW('mon,funday', '09:00', '18:00')}`);
  try {
    assert.throws(
      () => loadPack(target),
      (e: { code?: string; message?: string }) => {
        assert.equal(e.code, 'pack_invalid');
        assert.match(String(e.message), /days|funday/i, 'the refusal names the field that caused it');
        return true;
      },
    );
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

test('a pack with no coverage block loads with no window at all — an unstated staffing promise is not a promise', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-nocov-'));
  try {
    const target = join(dir, 'kopdar-ops');
    cpSync(PACK_DIR, target, { recursive: true });
    const f = join(target, '.kinship.yaml');
    writeFileSync(f, readFileSync(f, 'utf8').replace(/^coverage:\s*$[\s\S]*?(?=^\S)/m, ''));
    const p = loadPack(target);
    assert.equal(p.coverage, undefined, 'no window is read back as no window, not as a default window');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a 24/7 community parses as `always` with no invented window — and no invented zone', () => {
  const target = withCoverageBlock('  mode: always');
  try {
    const p = loadPack(target);
    assert.deepEqual(p.coverage, { mode: 'always', timezone: null },
      'a community that names no zone gets `null`, not a fabricated "UTC" — an invented zone is a claim about a community nobody described');
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

test('a 24/7 community that names its zone keeps it', () => {
  const target = withCoverageBlock('  mode: always\n  timezone: Asia/Jakarta');
  try {
    const p = loadPack(target);
    assert.deepEqual(p.coverage, { mode: 'always', timezone: 'Asia/Jakarta' });
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

test('a coverage block with an unknown key refuses to load — a key the runtime does not read is a key the community believes it wrote', () => {
  const target = withCoverageBlock(`  mode: staffed\n  timezone: Asia/Jakarta\n${WINDOW('mon', '09:00', '18:00')}\n  dayz: mon`);
  try {
    assert.throws(
      () => loadPack(target),
      (e: { code?: string; message?: string }) => {
        assert.equal(e.code, 'pack_invalid');
        assert.match(String(e.message), /dayz/, 'the refusal names the key it does not have');
        return true;
      },
    );
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

test('`mode: always` alongside a shift the runtime cannot have refuses to load — the file may not disagree with itself', () => {
  const target = withCoverageBlock(`  mode: always\n${WINDOW('mon', '09:00', '18:00')}`);
  try {
    assert.throws(
      () => loadPack(target),
      (e: { code?: string; message?: string }) => {
        assert.equal(e.code, 'pack_invalid');
        assert.match(String(e.message), /always/, 'the refusal names the contradiction');
        return true;
      },
    );
  } finally {
    rmSync(join(target, '..'), { recursive: true, force: true });
  }
});

// --- the parser's own door, called directly ---------------------------------------------------------
// `loadPack` runs the validator FIRST, so a boot-level test of a malformed window sees **PKG-65's**
// message, not the parser's. A test that reads `pack_invalid` and a field name cannot tell the two
// apart — and would pass with the parser's refusals deleted, which is the check-that-cannot-fail class
// this repo records as D24. So the parser is called directly here, the way `org.test.ts` calls
// `parseOrg`, and each refusal is proved to fire with **this** gate's message.

const parse = (body: string) => parseCoverage(`coverage:\n${body}\n`, 'test/pack');

const parserRefuses = (body: string, message: RegExp): void => {
  assert.throws(
    () => parse(body),
    (e: { code?: string; message?: string }) => {
      assert.equal(e.code, 'pack_invalid');
      assert.match(String(e.message), /coverage parse gate/,
        `the refusal must come from the PARSER's door, not the validator's — this is the door a boot-level test cannot reach`);
      assert.match(String(e.message), message, 'the refusal names what it refused');
      return true;
    },
  );
};

test('the parser refuses an unknown mode, on its own door', () =>
  parserRefuses('  mode: whenever\n  timezone: Asia/Jakarta', /mode/));

test('the parser refuses a staffed window with no zone, on its own door', () =>
  parserRefuses('  mode: staffed\n  windows:\n    - days: mon\n      opens: "09:00"\n      closes: "18:00"', /timezone/));

test('the parser refuses an unknown weekday, on its own door', () =>
  parserRefuses('  mode: staffed\n  timezone: Asia/Jakarta\n  windows:\n    - days: mon,funday\n      opens: "09:00"\n      closes: "18:00"', /days|funday/));

test('the parser refuses hours that are not HH:MM, on its own door', () =>
  parserRefuses('  mode: staffed\n  timezone: Asia/Jakarta\n  windows:\n    - days: mon\n      opens: "9 in the morning"\n      closes: "18:00"', /opens|closes/));

test('the parser refuses a shift that closes before it opens, on its own door', () =>
  parserRefuses('  mode: staffed\n  timezone: Asia/Jakarta\n  windows:\n    - days: mon\n      opens: "18:00"\n      closes: "09:00"', /opens|closes/));

test('the parser refuses a key the window does not have, on its own door', () =>
  parserRefuses('  mode: staffed\n  timezone: Asia/Jakarta\n  windows:\n    - days: mon\n      opens: "09:00"\n      closes: "18:00"\n  dayz: mon', /dayz/));

test('the parser refuses a line it cannot read, on its own door', () =>
  parserRefuses('  mode: staffed\n  ??? not a key\n  timezone: Asia/Jakarta', /cannot read/));

test('the parser refuses a community with no window at all, on its own door', () =>
  parserRefuses('  mode: staffed\n  timezone: Asia/Jakarta', /windows/));

test('the parser refuses a block written twice, on its own door', () => {
  assert.throws(
    () => parseCoverage('coverage:\n  mode: always\n\ncoverage:\n  mode: always\n', 'test/pack'),
    (e: { code?: string; message?: string }) => {
      assert.equal(e.code, 'pack_invalid');
      assert.match(String(e.message), /coverage parse gate/);
      assert.match(String(e.message), /2 times|twice/i, 'the refusal says the block was written twice');
      return true;
    },
  );
});

test('the parser refuses `mode: always` beside a shift, on its own door', () =>
  parserRefuses('  mode: always\n  days: mon\n  opens: "09:00"\n  closes: "18:00"', /always/));

test('the parser refuses a zone that is not an IANA zone, on its own door', () =>
  parserRefuses('  mode: staffed\n  timezone: Middle/Earth\n  days: mon\n  opens: "09:00"\n  closes: "18:00"', /timezone/));

test('the parser refuses a zone it cannot read even in `always` mode — the one string in the section that is neither validated nor swept', () =>
  parserRefuses('  mode: always\n  timezone: Middle/Earth', /timezone/));

test('the parser refuses a window written in a shape it cannot read, rather than reading it as "no window"', () => {
  // An inline flow map is valid YAML and is not the pack format's shape. Reading it as "no window at
  // all" would report an UNKNOWN duty state for a community that did declare one — the same quiet lie
  // as reading it as "never on duty", wearing a different hat.
  assert.throws(
    () => parseCoverage('coverage: {mode: always}\n', 'test/pack'),
    (e: { code?: string; message?: string }) => {
      assert.equal(e.code, 'pack_invalid');
      assert.match(String(e.message), /coverage parse gate/);
      return true;
    },
  );
});

test('the parser reads a well-formed window, and one with no window at all', () => {
  assert.deepEqual(
    parse('  mode: staffed\n  timezone: Asia/Jakarta\n  windows:\n    - days: mon,tue\n      opens: "09:00"\n      closes: "18:00"'),
    { mode: 'staffed', timezone: 'Asia/Jakarta', windows: [{ days: [1, 2], opens: 540, closes: 1080 }] },
  );
  assert.equal(parseCoverage('locale: [id, en]\n', 'test/pack'), undefined, 'no block means no promise');
});
