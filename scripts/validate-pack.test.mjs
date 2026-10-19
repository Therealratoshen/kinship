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

// --- the BYOD credential line (spec/HOST-CONTRACT.md seam 1, PRD FR-1.17) ------------------------------
// The owner brings the model key; it never enters Kinship. Until now that was a sentence in a document.
// These three tests are the rule: a pack that carries a key-shaped string cannot boot, and a pack that
// carries a *hash* can — because an entropy-based rule fires on revision hashes and gets switched off
// within a week, which is how a credential rule becomes a decorative rule.

test('a pack that carries a provider key fails the build, not the code review', () =>
  inCopy((dir) => {
    // Built by concatenation on purpose: a real-looking key in a test file is how the next scan gets
    // trained to ignore keys. This is a shape, not a credential.
    const fake = ['sk-', 'q'.repeat(24)].join('');
    const f = join(dir, 'skills', 'recap', 'SKILL.md');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\nSet OPENAI_API_KEY=${fake} to run the recap lane.\n`);
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-57'), 'the key belongs to the host that runs the model, never to a forkable folder');
  }));

test('a revision hash or a placeholder is not a credential — the rule is prefix-shaped, not entropy-shaped', () =>
  inCopy((dir) => {
    const f = join(dir, 'PACK.md');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\nRevision binds to ${'f83ecaf16f55dfee'.repeat(3)} and the host holds \`Bearer $KINSHIP_HOST_TOKEN\` — neither is a key.\n`);
    const r = validatePack(dir);
    assert.ok(!codes(r).includes('PKG-57'), `false positive on a hash: ${codes(r).join(', ')}`);
  }));

test('a private key block is caught by the same rule (the shape a webhook signing secret arrives in)', () =>
  inCopy((dir) => {
    const f = join(dir, '.kinship.yaml');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\n# -----BEGIN RSA PRIVATE KEY-----\n# MIIEowIBAAKCAQEA\n# -----END RSA PRIVATE KEY-----\n`);
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-57'), 'a commented-out key is still a key in a folder people fork');
  }));

// --- the organisation tier (D35): the pack is one community, the org is the operator -------------------
// A pack folder is forkable, and a fork can edit the numbers in it. The org manifest is the one place
// an operator states what those numbers may never become, and it is checked here so the first line a
// contributor gets is a build failure rather than a review comment. Resolution is explicit
// (`{ orgsRoot }`) because the file lives outside the pack folder: a test that tampered with the repo's
// own orgs/ would be a test that edits the working tree, and that is not how the other tamper tests run.

const ORGS = () => join(process.cwd(), 'orgs');
const orgCopy = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-orgs-'));
  const target = join(dir, 'orgs');
  cpSync(ORGS(), target, { recursive: true });
  try { return fn(target); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test('the shipped pack resolves its organisation and clears every floor it names', () => {
  const r = validatePack(PACK);
  assert.equal(r.ok, true, `expected PASS, got:\n  ${r.errors.join('\n  ')}`);
  assert.equal(r.checked.org, 'kinshipai', 'the tier is resolved by the gate, not only parsed by the runtime');
});

test('a cadence cap inside the validator bound but above the org floor fails by rule (PKG-60)', () =>
  inCopy((dir) => {
    // 5 passes BOUNDED_GUARDRAILS (1..5) and breaches the org's floor of 4: this is the test that
    // proves the org tier does work the generic bound cannot, and it is the direction test — 3 would
    // be *fewer* messages to the member, which is stricter than what the org holds, so 3 must pass.
    mutate(machine(dir), 'member_message_cap_per_24h: 2', 'member_message_cap_per_24h: 5');
    const r = validatePack(dir);
    const hit = r.errors.filter((e) => e.startsWith('PKG-60'));
    assert.equal(hit.length, 1, `expected one floor violation, got: ${r.errors.join(' | ')}`);
    assert.match(hit[0], /member_message_cap_per_24h/);
    assert.match(hit[0], /kinshipai/, 'it names which org holds the floor');
  }));

test('the same mutation in the other direction is legal — a cap under the org floor is the member getting less', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'member_message_cap_per_24h: 2', 'member_message_cap_per_24h: 1');
    const r = validatePack(dir);
    assert.equal(r.ok, true, `a stricter cap than the org's floor must pass: ${r.errors.join('\n  ')}`);
  }));

test('an aggregation floor below the org floor fails too, and the two directions are not confused (PKG-60)', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'report_aggregation_floor: 10', 'report_aggregation_floor: 6');
    assert.ok(!validatePack(dir, { orgsRoot: ORGS() }).errors.some((e) => e.startsWith('PKG-60')),
      '6 is above the org floor of 5 — higher is stricter for a floor, so this pack is legal');
    mutate(machine(dir), 'report_aggregation_floor: 6', 'report_aggregation_floor: 4');
    const r = validatePack(dir);
    assert.ok(r.errors.some((e) => e.startsWith('PKG-60') && /report_aggregation_floor/.test(e)),
      'a single min/max rule for both keys is the bug this test exists to catch');
  }));

test('a pack naming an organisation whose manifest is absent fails — no floor is worse than a missing one (PKG-58)', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'organisation: kinshipai', 'organisation: kopdar-gone');
    const r = validatePack(dir);
    assert.ok(codes(r).includes('PKG-58'), `expected PKG-58, got: ${codes(r).join(', ')}`);
    assert.match(r.errors.join(' '), /orgs[\\/]kopdar-gone\.yaml/, 'the failure says where it looked');
  }));

test('an org manifest whose key does not match its filename fails (PKG-58)', () =>
  orgCopy((orgsDir) => {
    const f = join(orgsDir, 'kinshipai.yaml');
    mutate(f, 'key: kinshipai', 'key: something-else');
    const r = validatePack(PACK, { orgsRoot: orgsDir });
    assert.ok(codes(r).includes('PKG-58'), 'two names for one org is how a pack resolves the wrong floor');
  }));

test('an org declaring a second human seat fails the build, naming PRD §12-Q12 (PKG-59)', () =>
  orgCopy((orgsDir) => {
    const f = join(orgsDir, 'kinshipai.yaml');
    mutate(f, 'human_seats:\n  - organiser', 'human_seats:\n  - organiser\n  - delegate');
    const r = validatePack(PACK, { orgsRoot: orgsDir });
    const hit = r.errors.filter((e) => e.startsWith('PKG-59'));
    assert.equal(hit.length, 1, `expected one seat violation, got: ${r.errors.join(' | ')}`);
    assert.match(hit[0], /12-Q12/, 'the message routes the fix to the owner\'s open question, not to the implementer');
  }));

test('an org that lists a seat name among its agent roles fails — that is how an agent gets the human seat (PKG-59)', () =>
  orgCopy((orgsDir) => {
    const f = join(orgsDir, 'kinshipai.yaml');
    mutate(f, '  - moderator', '  - moderator\n  - organiser');
    const r = validatePack(PACK, { orgsRoot: orgsDir });
    assert.ok(codes(r).includes('PKG-59'), 'decideCard/issueGrant/revokeGrant/releaseShatter all read the seat set');
  }));

test('an org autonomy ceiling of `never` fails the build (PKG-61) — absent is the pack\'s to declare', () =>
  orgCopy((orgsDir) => {
    const f = join(orgsDir, 'kinshipai.yaml');
    mutate(f, '  promote.cross-community: draft', '  promote.cross-community: never');
    const r = validatePack(PACK, { orgsRoot: orgsDir });
    assert.ok(codes(r).includes('PKG-61'), `expected PKG-61, got: ${codes(r).join(', ')}`);
    assert.match(r.errors.join(' '), /absent/i, 'the reason is invariant #1: a central never would be denied-not-absent');
  }));

test('a credential in an org manifest fails the same PKG-57 rule — the sweep is not only the pack folder', () =>
  orgCopy((orgsDir) => {
    const f = join(orgsDir, 'kinshipai.yaml');
    writeFileSync(f, `${readFileSync(f, 'utf8')}\n# host note: set key = ${['sk-', 'z'.repeat(24)].join('')}\n`);
    const r = validatePack(PACK, { orgsRoot: orgsDir });
    assert.ok(codes(r).includes('PKG-57'), 'the tier above the pack is forked and pasted too, and a scanner with one gap is a scanner that gets ignored');
  }));

test('a pack that names no organisation is legal and is told so in a notice, not a failure', () =>
  inCopy((dir) => {
    mutate(machine(dir), 'organisation: kinshipai', 'organisation: null');
    const r = validatePack(dir);
    assert.equal(r.ok, true, `an unaffiliated fork is a legitimate shape: ${r.errors.join('\n  ')}`);
    assert.equal(r.checked.org, null);
    assert.ok(r.notices.some((n) => /organisation/i.test(n)), 'the gate says out loud that no org floor was applied, so a green run is not read as one');
  }));
