/**
 * validate-pack.test.mjs — the contract test that makes a pack folder an API.
 *
 *   node --test scripts/validate-pack.test.mjs   (the directory form is not scanned by node 25)
 *
 * Two things are asserted: the shipped pack passes, and **each invariant fails loudly and by rule id
 * when tampered with**. The second half is the point. A validator that only ever says PASS proves
 * nothing about the rules it claims to hold — and every rule here exists because some future fork
 * would otherwise quietly widen a capability.
 *
 * Tampering happens in a temp copy, never in the working tree.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { validatePack } from './validate-pack.mjs';

const PACK = join(process.cwd(), 'packs', 'kopdar-ops');

const inCopy = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-pack-'));
  const target = join(dir, 'kopdar-ops');
  cpSync(PACK, target, { recursive: true });
  try { return fn(target); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const mutate = (file, search, replace) => {
  const text = readFileSync(file, 'utf8');
  assert.ok(text.includes(search), `fixture drifted: \`${search}\` no longer in ${relative(process.cwd(), file)} — update the test, do not delete it`);
  writeFileSync(file, text.replace(search, replace));
};
const machine = (dir) => join(dir, '.kinship.yaml');
const codes = (r) => r.errors.map((e) => e.split(' ')[0]);

test('the shipped pack passes the contract', () => {
  const r = validatePack(PACK);
  assert.equal(r.ok, true, `expected PASS, got:\n  ${r.errors.join('\n  ')}`);
  assert.equal(r.checked.agents, 3, 'three agents: event-ops, engagement, moderator');
  assert.equal(r.checked.skills, 16, 'sixteen skills — the pack payload');
});

test('a moderator that gains a send tool fails by rule, not by review', () =>
  inCopy((dir) => {
    mutate(machine(dir), '      - discord | read\n    # No delete', '      - discord | read\n      - discord | send\n    # No delete');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-33'), 'moderator must not declare any mutating tool');
  }));

test('whatsapp | send is rejected even when every other invariant holds', () =>
  inCopy((dir) => {
    mutate(machine(dir), '      - whatsapp | draft', '      - whatsapp | send');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-30'), 'D11: no WhatsApp auto-send in a bundled pack');
  }));

test('disclosure cannot be configured off', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'identity_disclosure: required', 'identity_disclosure: optional');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-25'), 'spec §2.8: disclosure is outside the escalation path');
  }));

test('deleting an invariant is a failure, not a simplification', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  defaults: deny', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-24'), 'default-deny may not be removed');
  }));

test('"allow once" may not be collapsed into "always"', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'grant_taxonomy: [allow_once, allow_always, deny]', 'grant_taxonomy: [allow, deny]');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-26'), 'spec §1.8: the once/always split is the product');
  }));

test('a pack that cannot name its human does not boot', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  - escalation_contact', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-42'), 'escalate-to-human is load-bearing');
  }));

test('declaring a skill without shipping it is a manifest lie', () =>
  inCopy((dir) => {
    rmSync(join(dir, 'skills', 'recap'), { recursive: true, force: true });
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-15'), 'every requiredSkills entry needs a file');
  }));

test('an orphan skill fails too — dead lanes get forgotten, not removed', () =>
  inCopy((dir) => {
    const s = join(dir, 'skills', 'ghost-lane');
    mkdirSync(s, { recursive: true });
    writeFileSync(join(s, 'SKILL.md'), 'x');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-20'), 'a skill no agent requires is not a pack');
  }));

test('a budget number without a hard stop is a suggestion', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'llm_per_event_idr: null', 'llm_per_event_idr: 50000');
    mutate(machine(dir), '  hard_stop: true', '  hard_stop: false');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-37'), 'warn-then-hard-stop or it is not a budget');
  }));

test('member state does not ship in a pack', () =>
  inCopy((dir) => {
    const f = join(dir, 'PACK.md');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\n\nSponsor contact: bu-dewi@pt-contoh.co.id\n`);
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-44'), 'structure, not state');
  }));

test('the banned marketing claim fails the build when asserted, and passes when cited', () => {
  const cited = validatePack(PACK);
  assert.ok(!codes(cited).includes('PKG-46'), 'the repo cites banned phrases in order to forbid them');
  assert.ok(
    inCopy((dir) => {
      const f = join(dir, 'agents', 'engagement', 'AGENTS.md');
      writeFileSync(f, `${readFileSync(f, 'utf8')}\nThe fleet provides fully autonomous community management.\n`);
      return codes(validatePack(dir));
    }).includes('PKG-46'),
    'FR-4.4: no autonomy-flavoured copy, even in an agent instruction file',
  );
});

test('an agent that reports to an agent instead of a human fails', () =>
  inCopy((dir) => {
    mutate(join(dir, 'agents', 'moderator', 'AGENTS.md'), 'reports_to: organiser', 'reports_to: event-ops');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-11'), 'the org chart is only honest if its top edge reaches a person');
  }));

test('the machine and prose halves cannot drift apart', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'key: kinshipai/bundled/event-ops/kopdar', 'key: kinshipai/community/event-ops/kopdar');
    const r = validatePack(dir);
    const c = codes(r);
    assert.ok(c.includes('PKG-22') || c.includes('PKG-23') || c.includes('PKG-05'), 'a fork may not claim bundled in one file and not the other');
  }));

// --- the member-as-subject group (spec §2.9, PRD FR-5) --------------------------------
// Every rule below fails for the same structural reason: the protection is cheap to keep at
// build time and unrecoverable after a send. An audit row cannot be backfilled without
// fabricating it, a name in a sponsor PDF cannot be un-sent, and a lane built without a
// suppression check inherits that bug into every future pack. So these are build failures,
// not review comments.

test('a member opt-out that stops persisting across lanes fails the build', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  member_opt_out_persists_across_lanes: true', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-24'), 'FR-5.2: cross-lane suppression is not configurable away');
  }));

test('an organiser grant may not be made to outrank a member\'s stop', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  suppression_precedence: member-over-organiser', '  suppression_precedence: organiser-over-member');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-25'), 'spec §2.9.2: "allow always" cannot resurrect a message someone stopped');
  }));

test('quiet hours are the recipient\'s timezone or they are not quiet hours', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  quiet_hours: member_local_time', '  quiet_hours: organiser_local_time');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-25'), 'FR-5.5: organiser-local quiet hours send at 3am for the member');
  }));

test('an answerable-but-empty on_behalf_of invariant cannot be deleted', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  member_visible_binds_to_human: true', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-24'), 'FR-5.1: the accountability field is written at send time or never');
  }));

test('a scoring class is rejected even though nothing in the pack uses it', () =>
  inCopy((dir) => {
    mutate(machine(dir), '      member.notify-flagged: draft', '      score.member: draft\n      member.notify-flagged: draft');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-53'), 'spec Part 5: a pack that can rank members will be asked to, by a sponsor');
  }));

test('an override of a member\'s stop is absent, not merely denied', () =>
  inCopy((dir) => {
    mutate(machine(dir), '      member.notify-optout: opt-in-auto', '      member.opt-out-override: never\n      member.notify-optout: opt-in-auto');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-53'), 'a `never` entry is still a capability surface; absence is the guarantee');
  }));

test('a protection value may be tuned but not removed', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  report_aggregation_floor: 10          ', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-47'), 'FR-5.3: the floor is tunable, its existence is not');
  }));

test('an aggregation floor below the bound is not a floor', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'report_aggregation_floor: 10', 'report_aggregation_floor: 1');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-48'), 'a floor of 1 means every cell is one person');
  }));

test('a cadence cap high enough to be spam is rejected as an unbounded protection', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'member_message_cap_per_24h: 2', 'member_message_cap_per_24h: 99');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-48'), 'FR-5.5: the bound is the point of the cap');
  }));

test('an off-ladder autonomy value breaks the build — the check that used to be dead', () =>
  inCopy((dir) => {
    mutate(machine(dir), '      observe.read: opt-in-auto', '      observe.read: auto');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-32'), 'a regex that only matched ladder values could never fail on `auto`');
  }));

test('an agent whose autonomy map is emptied fails, because deny-by-default is silent', () =>
  inCopy((dir) => {
    mutate(machine(dir), '      observe.read: opt-in-auto\n      moderate.flag: opt-in-auto        # flag-only in bundled packs; the human acts\n      member.notify-flagged: draft      # spec §2.9.4 — the subject of a flag is told, after the fact, with reason\n', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-52'), 'an empty map reads as a safe pack while every class is `never` by silence');
  }));

// --- cross-community promotion (spec §2.11, PRD FR-6) ---------------------------------

test('a cross-promo class without a partner policy never boots', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  - partner_policy', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-54'), 'spec §2.11: the organiser names the partners and the disclosure line, or the class is unreachable');
  }));

test('a cross-promo lane without the suppression rule is a second lane around a stop', () =>
  inCopy((dir) => {
    mutate(machine(dir), '  suppression_applies_to_partner_content: true', '');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-55'), 'FR-6.4: a partnership does not re-architect the member\'s rights');
  }));

test('partner reach is bounded in config, not in intentions', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'cross_promo_per_event_cap: 1', 'cross_promo_per_event_cap: 9');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-48'), 'a partner\'s cadence is not our cadence');
  }));

test('an agent that can post as a member is rejected — astroturfing is absent, not discouraged', () =>
  inCopy((dir) => {
    mutate(machine(dir), '      promote.cross-community: draft', '      message.as-member: never\n      promote.cross-community: draft');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-53'), 'spec §2.8 + Part 5: the fleet never pretends to be a person, and a `never` entry is still a surface');
  }));
