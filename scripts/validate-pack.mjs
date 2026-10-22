#!/usr/bin/env node
/**
 * validate-pack.mjs — turn a pack folder into an API.
 *
 *   node scripts/validate-pack.mjs packs/kopdar-ops
 *
 * Shape + invariant gate for a Kinship squad pack. Adopted from the donor repo's
 * `validate-catalog.ts` + `shipped-catalog.test.ts` pattern
 * (research/PAPERCLIP-OSS-STUDY-2026-10-17.md §5 lesson 6): one script + one test file is what
 * makes "fork this folder" a promise instead of a hope.
 *
 * WHAT THIS CAN AND CANNOT PROVE, stated because a green validator is easy to over-read:
 * it checks the *shape* of the pack — files, namespaced keys, declared invariants, absent
 * capabilities, the install gate, and the organisation manifest the pack names (`organisation:`,
 * resolved from `<cwd>/orgs/<key>.yaml`, overridable via `validatePack(dir, { orgsRoot })`). It does
 * not check *enforcement*; that is `runtime/`'s job, and `runtime/src/pack.ts` boots through this same
 * script so a folder that fails here fails there too. Neither of them proves a *deployed* system
 * honours the shape — no transport ships (D21), so that proof waits behind the shadow-mode gate (D9).
 * A rule like "the moderator has no delete tool" is verified here as *absent from the declared
 * toolset*; the runtime assertion is promptfoo territory, and promptfoo is not yet wired.
 *
 * No dependencies on purpose: this has to run on a forked folder in a stranger's checkout,
 * offline, with nothing installed. Node >= 20.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanForClaims, isProse } from './claim-scan.mjs';

const SCHEMA = 'kinship/v1';
// The organisation tier's schema (D35). Distinct from the pack's on purpose: a file read as the wrong
// tier is a shape collision, and the two ids make that impossible to mistake for a typo.
const ORG_SCHEMA = 'kinship-org/v1';
const KEY_RE = /^kinshipai\/(bundled|community)\/[a-z0-9-]+\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;
const AUTONOMY = new Set(['draft', 'opt-in-auto', 'never']);
const REQUIRED_GUARDRAILS = {
  identity_disclosure: 'required',
  member_input_is_data_not_instruction: 'true',
  defaults: 'deny',
  approval_binds_to_revision: 'true',
  no_ghost_watchers: 'true',
  private_objects_return: '404',
  low_trust_cannot_auto_promote: 'true',
  // The member-as-subject group (spec §2.9, PRD FR-5). These are here because each one is
  // unrecoverable after the fact: an audit row cannot be backfilled without fabricating it, a
  // named attendee in a sponsor PDF cannot be un-sent, and a lane built without a suppression row
  // inherits the bug forever. A fork may not trade them for throughput.
  member_visible_binds_to_human: 'true',
  member_opt_out_persists_across_lanes: 'true',
  suppression_precedence: 'member-over-organiser',
  external_reports_aggregate_only: 'true',
  flagged_member_is_notified_after: 'true',
  digest_sources_are_consent_scoped: 'true',
  quiet_hours: 'member_local_time',
};
// Cross-community promotion (spec §2.11, PRD FR-6). Declaring the class opts the pack into these
// invariants; not declaring it opts out. A partnership is where an unsupervised fleet becomes a
// spam cannon with someone else's content, so the gate is conditional on the class, not global.
const CROSS_PROMO_GUARDRAILS = {
  cross_promo_never_exports_member_data: 'true',
  partner_claims_carry_sources: 'true',
  cross_promo_discloses_partner: 'true',
  suppression_applies_to_partner_content: 'true',
  cross_promo_counts_against_member_cap: 'true',
};
// Tunable member protections: the value is the owner's, the *existence and bound* are ours.
// Absent or out-of-range fails; a plausible-but-unbounded cap is how spam becomes a feature.
const BOUNDED_GUARDRAILS = {
  report_aggregation_floor: { min: 5, max: 1000 },
  member_message_cap_per_24h: { min: 1, max: 5 },
};
const REQUIRED_NEEDS = [
  'community_name', 'schedule', 'venue_source', 'sponsor_list',
  'escalation_contact', 'member_notice_text', 'rsvp_source_of_truth',
];
// Capabilities that must not appear in a bundled pack's declared toolset at all
// (spec Part 5 "structurally absent"). Absent != denied: grep is the review.
const FORBIDDEN_ACTIONS = new Set(['delete', 'ban', 'mute', 'kick', 'restrict', 'remove-message', 'unsend']);
// Same posture, applied to action *classes* rather than tools (spec Part 5; PRD FR-5.3/5.6).
// A product that can rank its members will be asked to, by a sponsor, quarterly — so the class
// name is banned in the manifest, not merely discouraged in prose.
const FORBIDDEN_CLASSES = /^(score\.member|member\.opt-out-override|member\.described-in-recap|report\.name-a-member|trust\.raise-self|message\.as-member)(\s|$)/;
const FORBIDDEN_CHANNEL_ACTION = [
  { channel: 'whatsapp', action: 'send', rule: 'whatsapp group/individual auto-send is out of scope — DECISIONS.md D11' },
];
// Copy rules (PRD §2.3 claim ceiling) enforced inside the repo, not just in the pitch.
// The member-side entries are here because the temptation is symmetric: after a good event, the easiest
// next sentence is a felt claim about members ("they feel more valued") that no member was asked about.
// The list itself lives in scripts/claim-scan.mjs, so the validator and the contract test read one
// copy of it and the contract test can check it against PRD §2.3 rather than against a comment.

// The BYOD credential line (spec/HOST-CONTRACT.md seam 1, PRD FR-1.17): the owner brings the model key
// and it never enters Kinship — so it must never enter a pack folder either, because a pack is the one
// artefact in this repo designed to be forked by strangers.
//
// PREFIX-SHAPED ON PURPOSE. An entropy-based detector fires on revision hashes, git SHAs, and long
// IDs, so the first fork that gets a false positive turns the rule off; a decorative rule is worse
// than no rule because it claims a boundary it does not hold. A real provider key has a published
// prefix, so the shape is cheap and it does not blush at a hash.
//
// The shapes are built by concatenation, not written literally: this file is scanned by the same
// category of tool that scans a fork, and a validator whose own source contains a credential-shaped
// string is a false positive waiting to train someone to ignore the scanner. `PEM` is the fence that
// opens a private-key block, assembled for exactly that reason.
const PEM = `${'-'.repeat(5)}BEGIN `;
const CREDENTIAL_SHAPES = [
  { name: 'an OpenAI/Anthropic-style API key', re: new RegExp('\\b' + 'sk-' + '[A-Za-z0-9_-]{16,}') },
  { name: 'a GitHub token', re: new RegExp('\\bgh' + '[pousr]_' + '[A-Za-z0-9]{16,}\\b') },
  { name: 'a Slack token', re: new RegExp('\\b' + 'xox' + '[baprs]-' + '[A-Za-z0-9-]{10,}') },
  { name: 'an AWS access key id', re: new RegExp('\\b' + 'AKIA' + '[0-9A-Z]{12,}\\b') },
  { name: 'a Google API key', re: new RegExp('\\b' + 'AIza' + '[0-9A-Za-z_-]{30,}\\b') },
  { name: 'a GitLab personal access token', re: new RegExp('\\b' + 'glpat-' + '[A-Za-z0-9_-]{16,}') },
  { name: 'an npm token', re: new RegExp('\\b' + 'npm_' + '[A-Za-z0-9]{30,}') },
  { name: 'a private key block', re: new RegExp(PEM + '[A-Z ]*PRIVATE KEY') },
];

const stripComment = (line) => line.replace(/\s+#.*$/, '');
const frontmatter = (text) => {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  return m ? m[1] : '';
};
const fmMap = (text) => {
  const out = {};
  for (const raw of frontmatter(text).split('\n')) {
    const line = stripComment(raw);
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
};
const fmList = (text, key) => {
  const re = new RegExp(`^${key}:\\s*\\n((?:[ \\t]+-\\s+.*\\n?)+)`, 'm');
  const m = re.exec(frontmatter(text));
  if (!m) {
    const inline = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, 'm').exec(frontmatter(text));
    return inline ? inline[1].split(',').map((s) => s.trim()).filter(Boolean) : null;
  }
  return m[1].split('\n').map((l) => stripComment(l).trim().replace(/^-\s+/, '').replace(/^["']|["']$/g, '')).filter(Boolean);
};
// Extract an indent-scoped block from a YAML-subset file.
const block = (lines, startIdx, indent) => {
  const out = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    const cur = l.length - l.trimStart().length;
    if (cur <= indent) break;
    out.push({ text: stripComment(l), indent: cur });
  }
  return out;
};

/**
 * Validate a pack folder, and the organisation manifest it names.
 *
 * `opts.orgsRoot` exists because the org file lives *outside* the pack folder: the tamper tests copy
 * a pack into a temp dir and must not copy (or edit) the repo's own `orgs/`, and a pack checked from a
 * different working directory needs to say where its operator's manifests are. Default is
 * `<cwd>/orgs`, the repo layout.
 */
// Extract a top-level YAML-subset *list* (`key:` then `  - item`, or the inline `[a, b]` form).
// Returns null when the key is absent — "absent" and "empty" are different failures, and the org
// tier's rules say so separately.
const machList = (text, key) => {
  const lines = text.split('\n');
  const idx = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (idx === -1) return null;
  const head = stripComment(lines[idx].slice(key.length + 1)).trim();
  if (head.startsWith('[')) return head.replace(/[\[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    if (l.length - l.trimStart().length === 0) break;
    const item = stripComment(l).trim().replace(/^-\s+/, '');
    if (item) out.push(item);
  }
  return out;
};

// Extract a top-level block as ordered `key: value` pairs (the `floors:` / `autonomy_ceiling:` shapes).
const machPairs = (text, key) => {
  const lines = text.split('\n');
  const idx = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (idx === -1) return [];
  const out = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    if (l.length - l.trimStart().length === 0) break;
    const kv = /^([^:]+):\s*(.*)$/.exec(stripComment(l).trim());
    if (kv) out.push([kv[1].trim().replace(/^["']|["']$/g, ''), kv[2].trim().replace(/^["']|["']$/g, '')]);
  }
  return out;
};

export function validatePack(dir, opts = {}) {
  const errors = [];
  const notices = [];
  const add = (rule, msg) => errors.push(`${rule}  ${msg}`);
  const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
  const ORGS_ROOT = opts.orgsRoot ?? join(process.cwd(), 'orgs');

  const packText = read(join(dir, 'PACK.md'));
  const machText = read(join(dir, '.kinship.yaml'));
  if (!packText) add('PKG-01', 'PACK.md missing — a pack is a markdown directory first');
  if (!machText) add('PKG-02', '.kinship.yaml missing — the machine half is absent');
  if (errors.length) return { ok: false, errors, notices };

  // --- 1. identity + namespacing ---------------------------------------------------------
  const fm = fmMap(packText);
  for (const k of ['key', 'slug', 'name', 'version', 'category', 'bundled', 'license', 'manager']) {
    if (!fm[k]) add('PKG-03', `PACK.md frontmatter missing \`${k}\``);
  }
  if (fm.key && !KEY_RE.test(fm.key)) add('PKG-04', `pack key \`${fm.key}\` is not namespaced as kinshipai/{bundled|community}/<category>/<slug> — forks are unaddressable without it`);
  const isBundled = fm.bundled === 'true';
  if (fm.key?.startsWith('kinshipai/bundled/') && !isBundled) add('PKG-05', 'key says bundled but `bundled:` is not true — the safety boundary must be stated in one voice');
  if (fm.key?.startsWith('kinshipai/community/') && isBundled) add('PKG-05', 'key says community but `bundled: true` — only core packs may claim invariants are held');
  if (fm.key && basename(dirname(dir)) !== fm.slug && basename(dir) !== fm.slug) add('PKG-06', `slug \`${fm.slug}\` does not match the directory name — path and key must agree`);
  if (isBundled && fm.license && fm.license.toLowerCase() !== 'mit') notices.push(`PKG-N1  bundled license is \`${fm.license}\`; PRD §12-Q4 is still the owner's call — do not copy this field into a public README yet`);

  // --- 2. agents ------------------------------------------------------------------------
  const agentPaths = fmList(packText, 'agents') || [];
  if (!agentPaths.length) add('PKG-07', 'PACK.md declares no agents');
  const roles = new Set();
  for (const rel of agentPaths) {
    const t = read(join(dir, rel));
    if (!t) { add('PKG-08', `declared agent file missing: ${rel}`); continue; }
    const a = fmMap(t);
    const hasKey = (k) => new RegExp(`^${k}:`, 'm').test(frontmatter(t));
    for (const k of ['role', 'key', 'reports_to']) if (!a[k]) add('PKG-09', `${rel} frontmatter missing \`${k}\``);
    if (!hasKey('skills') && !(fmList(t, 'skills') || []).length) add('PKG-09', `${rel} frontmatter declares no \`skills:\` list`);
    if (a.key && fm.key && !a.key.startsWith(`${fm.key}/agents/`)) add('PKG-10', `${rel} key \`${a.key}\` is not namespaced under the pack key`);
    if (a.reports_to && a.reports_to !== 'organiser') add('PKG-11', `${rel} reports_to \`${a.reports_to}\` — in this pack every agent reports to a human, not to an agent (the org chart is prompt-level theatre otherwise)`);
    if (a.role) roles.add(a.role);
    if (/whatsapp/i.test(t) && /\bgroup send\b/i.test(t) && !/absent|no such|not in|never|missing/i.test(t)) add('PKG-12', `${rel} mentions a WhatsApp group send without naming it absent`);
  }

  // --- 3. skills ------------------------------------------------------------------------
  const skillKeys = fmList(packText, 'requiredSkills') || [];
  if (!skillKeys.length) add('PKG-13', 'PACK.md declares no requiredSkills — skills are the pack payload');
  const skillDirs = existsSync(join(dir, 'skills')) ? readdirSync(join(dir, 'skills')) : [];
  for (const key of skillKeys) {
    if (!KEY_RE.test(key) && !key.startsWith(`${fm.key}/skills/`)) add('PKG-14', `skill key \`${key}\` is not under the pack namespace`);
    const name = key.split('/').pop();
    const t = read(join(dir, 'skills', name, 'SKILL.md'));
    if (!t) { add('PKG-15', `required skill has no file: skills/${name}/SKILL.md — a declared procedure that does not exist is a lie in a manifest`); continue; }
    const s = fmMap(t);
    if (s.key !== key) add('PKG-16', `skills/${name}/SKILL.md key \`${s.key}\` != manifest key \`${key}\``);
    if (!/\*\*Assertion\.\*\*|Assertion\b/.test(t)) add('PKG-17', `skills/${name}/SKILL.md states no assertion — an untestable skill is a suggestion`);
    const users = fmList(t, 'used_by') || [];
    for (const u of users) if (!roles.has(u)) add('PKG-18', `skills/${name}/SKILL.md used_by \`${u}\` is not a declared agent role (${[...roles].join(', ')})`);
    if (!skillDirs.includes(name)) add('PKG-19', `skills/${name} missing from the skills directory`);
  }
  for (const d of skillDirs) {
    if (!skillKeys.some((k) => k.endsWith(`/${d}`))) add('PKG-20', `skills/${d} exists but no agent requires it — dead weight or a forgotten lane`);
  }

  // --- 4. machine half: schema + invariants ---------------------------------------------
  const ml = machText.split('\n');
  const top = (k) => { const re = new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(machText); return re ? stripComment(re[1]).trim() : null; };
  if (top('schema') !== SCHEMA) add('PKG-21', `schema is \`${top('schema')}\`, expected \`${SCHEMA}\` — version the namespace on day one (the donor repo has two spec generations live in one catalog)`);
  if (top('key') !== fm.key) add('PKG-22', `PACK.md key \`${fm.key}\` != .kinship.yaml key \`${top('key')}\``);
  if (top('bundled') !== String(isBundled)) add('PKG-23', '`bundled` disagrees between PACK.md and .kinship.yaml');
  for (const [k, v] of Object.entries(REQUIRED_GUARDRAILS)) {
    const actual = new RegExp(`^\\s+${k}:\\s*(.*)$`, 'm').exec(machText);
    if (!actual) add('PKG-24', `required invariant \`${k}\` deleted from guardrails — this pack's invariants are not configurable away`);
    else if (stripComment(actual[1]).trim() !== v) add('PKG-25', `invariant \`${k}\` is \`${stripComment(actual[1]).trim()}\`, must be \`${v}\``);
  }
  const tax = new RegExp('^\\s+grant_taxonomy:\\s*\\[(.*)\\]', 'm').exec(machText);
  if (!tax || !['allow_once', 'allow_always', 'deny'].every((t) => tax[1].includes(t))) add('PKG-26', 'grant_taxonomy must carry allow_once + allow_always + deny — collapsing once into always is the bug that turns a helper into an unattended bot (spec §1.8)');
  for (const [k, bound] of Object.entries(BOUNDED_GUARDRAILS)) {
    const m = new RegExp(`^\\s+${k}:\\s*(.*)$`, 'm').exec(machText);
    if (!m) { add('PKG-47', `\`${k}\` is missing — the value may be tuned, the protection may not be removed (spec §2.9)`); continue; }
    const val = Number(stripComment(m[1]).trim());
    if (!Number.isInteger(val) || val < bound.min || val > bound.max)
      add('PKG-48', `\`${k}\` is \`${stripComment(m[1]).trim()}\`, outside the useful range ${bound.min}–${bound.max} — an unbounded protection is not a protection`);
  }

  // --- 5. the community's coverage window (its staffed hours) ------------------------------
  // A shape gate, not a judgement: a community may staff any hours it likes. What is refused is a
  // window the runtime cannot evaluate, because a window that silently reads as "never on duty"
  // would turn every later number into a quiet lie. The parser refuses the same shapes at boot
  // (`runtime/src/pack.ts`); this gate is what a fork's CI catches before anyone runs it.
  //
  // The same trap the sanction ladder guards against (PKG-62) applies here: a file may not write
  // the block twice, because a reader takes the first and ignores the rest.
  //
  // The key pattern matches the PARSER's, comment and all — `coverage:` followed by a comment is
  // the same block, and a gate that only found the bare spelling would skip a window the runtime
  // does read. Two readers with different ideas of "what a key looks like" is how a gate ends up
  // checking a file the runtime never sees.
  const COVERAGE_KEY = /^coverage:\s*(#.*|)$/;
  const coverageIdxs = ml.reduce((acc, l, i) => (COVERAGE_KEY.test(l) ? [...acc, i] : acc), []);
  if (coverageIdxs.length > 1) {
    add('PKG-65', `\`coverage:\` is written ${coverageIdxs.length} times (lines ${coverageIdxs.map((i) => i + 1).join(', ')}) — a second block is read by no one: a reader takes the first and ignores the rest, so a fork could ship a window no check ever saw. One file may not disagree with itself`);
  }
  const coverageIdx = coverageIdxs[0];
  if (coverageIdx !== undefined) {
    // The block's base indent is the indent of its FIRST key, and every key is read at that indent.
    // A hard-coded 2 would make this reader and the parser disagree on a pack that indents its
    // coverage keys by four spaces — valid YAML — and the gate would report "mode: (absent)" for a
    // window the runtime reads perfectly well. Two readers must agree on the SHAPE of what they read,
    // not only on the key that introduces it.
    const covBlock = block(ml, coverageIdx, 0);
    const baseIndent = covBlock.length > 0 ? covBlock[0].indent : 2;
    const covLines = covBlock.filter((l) => l.indent === baseIndent).map((l) => l.text.trim());
    const cov = new Map();
    for (const l of covLines) {
      const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l);
      // A line this gate cannot read is NOT this gate's judgement to make, and it is not quietly
      // dropped either: `runtime/src/pack.ts` refuses the boot on it (`coverage parse gate`).
      // Reading strictness belongs to the single parser, because a second reader with its own idea
      // of "unreadable" is how one of the two ends up a check that can never fire — and a refusal
      // here would run FIRST, so the parser's own door would be unreachable (the D24 class).
      if (kv === null) continue;
      cov.set(kv[1], stripComment(kv[2]).trim().replace(/^["']|["']$/g, ''));
    }
    const mode = cov.get('mode');
    if (mode !== 'always' && mode !== 'staffed') {
      add('PKG-65', `\`coverage.mode: ${mode ?? '(absent)'}\` — expected \`always\` (a 24/7 community) or \`staffed\` (a window of hours)`);
    } else if (mode === 'always') {
      // A community staffed around the clock has no shift to open or close, so a file that writes
      // those keys is disagreeing with itself — the same fault the duplicate-block rule refuses.
      for (const key of ['days', 'opens', 'closes']) {
        if (cov.has(key)) {
          add('PKG-65', `\`coverage.mode: always\` and also \`coverage.${key}\` — a community staffed around the clock has no shift to open or close. Drop the \`${key}\` line or declare \`mode: staffed\``);
        }
      }
    } else if (mode === 'staffed') {
      const tz = cov.get('timezone');
      if (tz === undefined || tz === '') {
        add('PKG-65', 'a staffed window with no `timezone:` — "business hours" without a zone is not a commitment');
      } else {
        try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); }
        catch { add('PKG-65', `\`coverage.timezone: ${tz}\` is not an IANA zone — the window is a statement about that zone's local calendar`); }
      }
      const daysRaw = cov.get('days');
      if (daysRaw === undefined || daysRaw === '') {
        add('PKG-65', 'a staffed window with no `days:` — a shift needs the weekdays it covers');
      } else {
        for (const d of daysRaw.split(',').map((x) => x.trim().toLowerCase())) {
          if (!['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(d)) {
            add('PKG-65', `\`coverage.days:\` names \`${d}\` — expected local weekday names (sun..sat)`);
          }
        }
      }
      const mins = (raw) => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(raw ?? '');
        if (m === null) return null;
        const h = Number(m[1]), mi = Number(m[2]);
        return h > 23 || mi > 59 ? null : h * 60 + mi;
      };
      const opens = mins(cov.get('opens'));
      const closes = mins(cov.get('closes'));
      if (opens === null || closes === null) {
        add('PKG-65', '`coverage.opens:`/`coverage.closes:` must be `HH:MM` local times — the window is read as a local wall clock');
      } else if (opens >= closes) {
        add('PKG-65', '`coverage.opens:` is not before `coverage.closes:` — a shift that closes before it opens is not a shift');
      }
    }
  }

  // --- 6. declared toolsets: absent, not denied -----------------------------------------
  const agentsIdx = ml.findIndex((l) => /^agents:\s*$/.test(l));
  if (agentsIdx === -1) add('PKG-27', '.kinship.yaml declares no `agents:` block');
  const agentBlocks = (() => {
    // Bound the scan to the `agents:` block — otherwise the first nested map under a later
    // top-level key (e.g. `attribution: provenance:`) is mistaken for an agent role.
    const end = ml.findIndex((l, i) => i > agentsIdx && /^[A-Za-z_][\w-]*:/ .test(l));
    const stop = end === -1 ? ml.length : end;
    return ml
      .map((l, i) => ({ l: stripComment(l).trim(), i, indent: l.length - l.trimStart().length }))
      .filter((o) => o.i > agentsIdx && o.i < stop && o.indent === 2 && /:$/.test(o.l));
  })();
  const machRoles = agentBlocks.map((o) => o.l.replace(/:$/, ''));
  const allClassNames = [];
  // Every tool the fleet may actually execute, kept for the sanction-ladder gate (PKG-63) below: a
  // rung is only unreachable if nothing in this list can carry it out.
  const fleetTools = [];
  for (const r of roles) if (!machRoles.includes(r)) add('PKG-28', `agent \`${r}\` has prose instructions but no permissions block in .kinship.yaml`);
  for (const { l, i, indent } of agentBlocks) {
    const role = l.replace(/:$/, '');
    const raw = block(ml, i, indent);
    const body = raw.map((o) => o.text.trim());
    const tools = body.filter((t) => t.startsWith('- ') && t.includes('|')).map((t) => t.slice(2).split('|').map((s) => s.trim()));
    for (const [channel, action] of tools) fleetTools.push({ role, tool: `${channel} | ${action}` });
    for (const [channel, action] of tools) {
      if (FORBIDDEN_ACTIONS.has(action)) add('PKG-29', `agent \`${role}\` declares \`${channel} | ${action}\` — that capability must be absent from a bundled pack, not denied at runtime`);
      for (const f of FORBIDDEN_CHANNEL_ACTION) if (channel === f.channel && action === f.action) add('PKG-30', `agent \`${role}\` declares \`${channel} | ${action}\`: ${f.rule}`);
      if (/\bgroup\b/i.test(channel) && /send|post/i.test(action)) add('PKG-31', `agent \`${role}\` declares a group-send tool — no such class exists in this pack (spec Part 5)`);
    }
    // `autonomy_by_class` is walked by indent, not by matching the ladder values: a regex that only
    // matches `draft|opt-in-auto|never` cannot fail on a value outside that list, so the old form of
    // this check was an assertion that could never fire. An invented `auto` must break the build.
    const abcIdx = raw.findIndex((o) => /^autonomy_by_class:$/.test(o.text.trim()));
    const classes = [];
    if (abcIdx !== -1) {
      const base = raw[abcIdx].indent;
      for (let j = abcIdx + 1; j < raw.length && raw[j].indent > base; j++) {
        const kv = /^([a-z_.-]+):\s*(.*)$/.exec(raw[j].text.trim());
        if (kv) classes.push({ name: kv[1], value: kv[2] });
      }
    }
    if (!classes.length) add('PKG-52', `agent \`${role}\` declares no \`autonomy_by_class\` entries — with defaults: deny that is a silent pack whose every class is \`never\``);
    for (const c of classes) {
      allClassNames.push(c.name);
      if (!AUTONOMY.has(c.value)) add('PKG-32', `agent \`${role}\` class \`${c.name}\` has autonomy \`${c.value}\`, which is not on the ladder (draft | opt-in-auto | never)`);
      if (FORBIDDEN_CLASSES.test(c.name)) add('PKG-53', `agent \`${role}\` declares \`${c.name}\` — structurally absent from a bundled pack (spec Part 5, §2.9): a member may not be scored, a member's stop may not be overridden, and no agent may widen its own scope`);
    }
    if (role === 'moderator') {
      const sends = tools.filter(([, action]) => /send|write|post|publish|delete|ban|mute/.test(action));
      if (sends.length) add('PKG-33', `moderator declares mutating tools (${sends.map((s) => s.join('|')).join(', ')}) — flag-only is the bundled posture and the human acts`);
      if (!/outputs:\s*human_queue/.test(machText)) add('PKG-34', 'moderator has no `outputs: human_queue` — flags with nowhere to go are noise');
    }
  }

  // --- 7. budgets: real field, unset value ----------------------------------------------
  const budgetIdx = ml.findIndex((l) => /^budgets:\s*$/.test(l));
  if (budgetIdx === -1) add('PKG-35', '.kinship.yaml declares no budgets — an unbounded fleet is not a supervised one');
  else {
    const bb = block(ml, budgetIdx, 0).map((o) => o.text.trim());
    const field = bb.find((t) => t.startsWith('llm_per_event_idr:'));
    if (!field) add('PKG-36', 'budgets.llm_per_event_idr missing — the field must exist even while the number is the owner\'s call (PRD §12-Q9)');
    else {
      const val = field.split(':')[1].trim();
      if (!/^\d+$/.test(val)) {
        notices.push(`PKG-N2  llm_per_event_idr is \`${val}\`: correct. Do not replace it with a plausible number — shadow mode produces the first real figure`);
      } else {
        if (!bb.some((t) => /hard_stop:\s*true/.test(t))) add('PKG-37', 'a numeric budget without hard_stop: true is a suggestion, not a budget');
        if (!bb.some((t) => /warn_at_ratio:/.test(t))) add('PKG-38', 'a numeric budget without warn_at_ratio can hit a wall silently');
        notices.push(`PKG-N3  llm_per_event_idr is set to ${val} — confirm it traces to a measured spend, not to a guess`);
      }
    }
    if (!bb.some((t) => /currency_denomination:\s*event_scoped_money/.test(t))) add('PKG-39', 'budget must be denominated in event-scoped money, not tokens (spec §1.6) — a volunteer organiser cannot read "4.2M tokens"');
  }

  // --- 8. the install gate ---------------------------------------------------------------
  const needsIdx = ml.findIndex((l) => /^needs:\s*$/.test(l));
  const needs = needsIdx === -1 ? [] : block(ml, needsIdx, 0).map((o) => o.text.trim().replace(/^-\s+/, '').replace(/\s*#.*$/, '')).filter(Boolean);
  if (!needs.length) add('PKG-40', 'no `needs:` gate — an installer can boot this pack and invent content, which is the failure mode that makes AI community tools feel like spam');
  for (const n of REQUIRED_NEEDS) if (!needs.includes(n)) add('PKG-41', `needs.\`${n}\` missing — required for every pack`);
  if (!needs.includes('escalation_contact')) add('PKG-42', 'needs.escalation_contact is unskippable: a fleet that cannot name the human it hands off to is an unattended bot with better manners');
  if (!needs.includes('member_notice_text')) add('PKG-43', 'needs.member_notice_text is unskippable: disclosure copy must be authored by the organiser, not generated at send time');

  // --- cross-community promotion: declaring the class opts you into its gate (spec §2.11) --------
  if (allClassNames.some((c) => c.startsWith('promote.cross'))) {
    if (!needs.includes('partner_policy')) add('PKG-54', 'the pack declares `promote.cross-community` but needs.partner_policy is unanswered — the organiser must name the allowed partners and the required disclosure line, or the class stays unreachable');
    for (const [k, v] of Object.entries(CROSS_PROMO_GUARDRAILS)) {
      const m = new RegExp(`^\\s+${k}:\\s*(.*)$`, 'm').exec(machText);
      if (!m) add('PKG-55', `cross-promo invariant \`${k}\` missing — a partnership is not a second lane around the member's rights (spec §2.11)`);
      else if (stripComment(m[1]).trim() !== v) add('PKG-55', `cross-promo invariant \`${k}\` is \`${stripComment(m[1]).trim()}\`, must be \`${v}\``);
    }
    const cap = new RegExp('^\\s+cross_promo_per_event_cap:\\s*(.*)$', 'm').exec(machText);
    if (!cap) add('PKG-56', '`cross_promo_per_event_cap` missing — partner reach must be bounded in config, not in good intentions');
    else {
      const val = Number(stripComment(cap[1]).trim());
      if (!Number.isInteger(val) || val < 0 || val > 3)
        add('PKG-48', `\`cross_promo_per_event_cap\` is \`${stripComment(cap[1]).trim()}\`, outside the useful range 0–3 — a partner's cadence is not our cadence`);
    }
  }

  // --- 9. the organisation tier (D35 / PRD FR-1.18) ----------------------------------------
  // The pack is one community; `orgs/<key>.yaml` is the operator who runs several of them. Four rules,
  // and the reason each one is here rather than in a review comment:
  //
  //   PKG-58  the named org resolves to exactly one readable manifest — a missing org file is worse
  //           than no org at all, because the operator would believe a floor was holding;
  //   PKG-59  the human seat set is one seat, and no seat name is also an agent role (§2.7);
  //   PKG-60  every floor the org holds is met or beaten by this pack — per key, because a cadence cap
  //           and an aggregation floor are not strict in the same direction;
  //   PKG-61  no ceiling says `never` — absence is the pack's to declare (invariant #1).
  //
  // Resolution lives here and in `runtime/src/settings.ts`, and the two are not duplicates by
  // accident: this gate is what a fork's CI runs before anything boots, and the runtime is what
  // refuses a pack someone booted without CI. Same rule, two doors, both tested.
  const machLines = machText.split('\n').map(stripComment).join('\n');
  const orgRefRaw = /^organisation:[ \t]*(.*)$/m.exec(machLines)?.[1]?.trim() ?? null;
  const orgRef = orgRefRaw === null || orgRefRaw === '' || orgRefRaw === 'null' ? null : orgRefRaw;
  let orgPath = null;
  let orgText = null;
  // The human seat set, hoisted so the sanction-ladder gate below can read it. `null` means there is
  // no org tier (or it names no seats), in which case the seat is the one the runtime has always
  // gated on — see `runtime/src/roles.ts`.
  let orgSeats = null;
  if (orgRef === null) {
    notices.push(`PKG-N4  no \`organisation:\` — this pack is its own top tier, so NO org floor was applied to it and no org holds its member protections. Legal for an unaffiliated fork; a gap for a bundled pack`);
  } else {
    orgPath = join(ORGS_ROOT, `${orgRef}.yaml`);
    orgText = read(orgPath);
    if (!orgText) {
      add('PKG-58', `\`organisation: ${orgRef}\` names a manifest that does not exist (looked for \`${orgPath}\`) — booting floorless is not a fallback: the operator wrote this pack into an org because they thought its floors were in force`);
    } else {
      const orgLines = orgText.split('\n').map(stripComment).join('\n');
      const oSchema = /^schema:[ \t]*(.*)$/m.exec(orgLines)?.[1]?.trim();
      if (oSchema !== ORG_SCHEMA) add('PKG-58', `${orgPath} declares schema \`${oSchema ?? '(absent)'}\`, expected \`${ORG_SCHEMA}\` — a pack manifest read as an org manifest is a tier collision, not a typo`);
      const oKey = /^key:[ \t]*(.*)$/m.exec(orgLines)?.[1]?.trim();
      if (oKey !== orgRef) add('PKG-58', `${orgPath} declares key \`${oKey ?? '(absent)'}\` but is filed as \`${orgRef}.yaml\` — two names for one org is how a pack resolves the wrong floor`);

      // --- PKG-59: the seats and the roster -----------------------------------------------------
      const seats = machList(orgText, 'human_seats');
      orgSeats = seats && seats.length ? seats : null;
      if (seats === null) add('PKG-59', `${orgPath} declares no \`human_seats:\` — spec §2.7 puts approval and veto with a named human, and an org with no seat is an unattended fleet`);
      else if (seats.length === 0) add('PKG-59', `${orgPath} has an empty \`human_seats:\` — same failure in the other direction: a list that names nobody`);
      else if (seats.length > 1) add('PKG-59', `${orgPath} declares ${seats.length} human seats (${seats.join(', ')}) and only one is supported — a second seat is delegation, which is PRD §12-Q12, the owner's open question; until it is answered the runtime has no delegation path to gate`);
      const roster = machList(orgText, 'agent_roles');
      if (roster === null) add('PKG-59', `${orgPath} declares no \`agent_roles:\` — the org states the roster it recognises; an empty roster is a deliberate \`[]\``);
      else for (const r of seats ?? []) {
        if (roster.includes(r)) add('PKG-59', `${orgPath} lists \`${r}\` as both a human seat and an agent role — a pack could then give an agent the name that decideCard/issueGrant/revokeGrant/releaseShatter accept (§2.7)`);
      }

      // --- PKG-60: the floors, per key, in the right direction ------------------------------------
      const floors = new Map(machPairs(orgText, 'floors'));
      const packValue = (name) => {
        const m = new RegExp(`^\\s+${name}:[ \\t]*(.*)$`, 'm').exec(machText);
        return m ? stripComment(m[1]).trim() : null;
      };
      const capFloor = floors.get('member_message_cap_per_24h');
      if (capFloor !== undefined) {
        const packCap = Number(packValue('member_message_cap_per_24h'));
        if (Number.isFinite(packCap) && packCap > Number(capFloor)) {
          add('PKG-60', `\`member_message_cap_per_24h\` is ${packCap}, above org \`${orgRef}\`'s floor of ${capFloor} — for a cadence cap the SMALLER number is the stricter one, so this pack sends the member more than the operator holds (spec §2.9 / FR-5.5). The pack is refused, not clamped: a value silently rounded down is a file that lies`);
        }
      }
      const aggFloor = floors.get('report_aggregation_floor');
      if (aggFloor !== undefined) {
        const packAgg = Number(packValue('report_aggregation_floor'));
        if (Number.isFinite(packAgg) && packAgg < Number(aggFloor)) {
          add('PKG-60', `\`report_aggregation_floor\` is ${packAgg}, below org \`${orgRef}\`'s floor of ${aggFloor} — for an aggregation floor the LARGER number is the stricter one (spec §2.9 / FR-5.3). Refused, not clamped`);
        }
      }
      const orgDisclosure = floors.get('identity_disclosure');
      if (orgDisclosure === 'required' && packValue('identity_disclosure') !== 'required') {
        add('PKG-60', `\`identity_disclosure\` is \`${packValue('identity_disclosure') ?? '(absent)'}\` but org \`${orgRef}\` requires it — disclosure is outside the escalation path (spec §2.8), so no pack opts out of it`);
      }
      const orgDefaults = floors.get('defaults');
      if (orgDefaults === 'deny' && packValue('defaults') !== 'deny') {
        add('PKG-60', `\`defaults\` is \`${packValue('defaults') ?? '(absent)'}\` but org \`${orgRef}\` holds \`deny\` — an unset class may not become an open one (spec §1.1, invariant #1)`);
      }
      for (const [k] of floors) {
        if (!['member_message_cap_per_24h', 'report_aggregation_floor', 'identity_disclosure', 'defaults'].includes(k)) {
          add('PKG-60', `${orgPath} holds a floor named \`${k}\`, which this runtime cannot enforce — a typo'd floor that silently does not apply is the decorative-rule class this repo keeps recording (D24, D28, D29)`);
        }
      }

      // --- PKG-61: ceilings ---------------------------------------------------------------------
      const LADDER_VALUES = ['draft', 'opt-in-auto', 'never'];
      for (const [cls, val] of machPairs(orgText, 'autonomy_ceiling')) {
        if (!LADDER_VALUES.includes(val)) add('PKG-61', `autonomy_ceiling \`${cls}\` is \`${val}\` in \`${orgPath}\`, which is not on the ladder (draft | opt-in-auto | never)`);
        else if (val === 'never') add('PKG-61', `autonomy_ceiling \`${cls}\` is \`never\` — \`never\` means the tool is ABSENT from the pack and a reviewer greps for it (invariant #1); a central \`never\` would be a denial wearing absence's clothes, so absence stays the pack's to declare`);
      }
    }
  }

  // --- 10. the sanction ladder (DECISIONS.md D37) ---------------------------------------------------
  // A community may write down the rungs a member climbs before they are gone. The block is optional —
  // a community that does not moderate has no rungs to name, and nothing here may hand it a ladder it
  // did not write — and where it exists, two gates hold, opposite in direction, which is why they are
  // two PKG ids and not one:
  //
  //   PKG-62  the ladder is a PROMISE the community makes to its members, so it is read back as one: at
  //           least two rungs (one step is a binary, not graduated response), every rung names a human
  //           seat as its actor and says what the member is told, and the bottom rung names the way
  //           back in (spec §2.9.4). A sanction delivered in the dark is a rumour, not a process.
  //   PKG-63  the ladder is not a LANE: a rung's `via` may not name a tool some agent declares under
  //           `tools:`. Invariant #1 read from the other side — a capability the fleet can execute lives
  //           in the tools list where a reviewer can grep it, so a rung the fleet can execute is a
  //           moderation lane wearing a community document.
  //
  // The reachability check covers exactly the field the runtime reads (`via`) and no other spelling of
  // it, because that is the field that can mean something. Reading strictness — a rung that invents a
  // key, a line that is not `key: value`, a rung with no name — belongs to `runtime/src/pack.ts`'s parse
  // gate and is deliberately NOT duplicated here: `loadPack` runs this script first, so a validator that
  // also refused an unreadable line would leave the parser's refusal unable to ever fire, which is the
  // check-that-cannot-fail class this repo keeps recording (D24, D28, D29). Nothing is quietly dropped:
  // the line the validator declines to judge, the parser refuses.
  // The same rules are enforced again at boot in `runtime/src/settings.ts`: CI door and boot door, both
  // tested, exactly as the org tier is gated twice.
  const ladderIdxs = ml.reduce((acc, l, i) => (/^sanction_ladder:/.test(l) ? [...acc, i] : acc), []);
  if (ladderIdxs.length > 1) {
    add('PKG-62', `\`sanction_ladder:\` is written ${ladderIdxs.length} times (lines ${ladderIdxs.map((i) => i + 1).join(', ')}) — a second block is read by no one: a reader takes the first and ignores the rest, so a fork could ship a ladder no check ever saw. One file may not disagree with itself`);
  }
  if (ladderIdxs.length > 0) {
    // The seat set comes from the org the pack names; with no org tier the only seat is the one the
    // runtime has always gated on (`runtime/src/roles.ts`, DEFAULT_HUMAN_SEATS).
    const seats = orgSeats ?? ['organiser'];
    const rungs = [];
    let current = null;
    for (const entry of block(ml, ladderIdxs[0], 0)) {
      const t = entry.text.trim();
      if (!t) continue;
      if (t === '-' || t.startsWith('- ')) { current = {}; rungs.push(current); if (t === '-') continue; }
      const kv = /^-?\s*([A-Za-z_][\w-]*):\s*(.*)$/.exec(t);
      // A line this gate cannot read is NOT this gate's judgement to make, and it is not quietly dropped
      // either: `runtime/src/pack.ts` refuses the boot on it (`ladder parse gate`). Reading strictness
      // belongs to the single parser, because a second reader with its own idea of "unreadable" is how
      // one of the two ends up a check that can never fire.
      if (!kv || current === null) continue;
      current[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
    }
    // Only a rung that names itself can be judged: an entry with no `rung:` is the parse gate's refusal.
    const named = rungs.filter((r) => typeof r.rung === 'string' && r.rung !== '');
    if (named.length === 0) {
      add('PKG-62', '`sanction_ladder:` is declared with no rung under it — the key tells a reader this community has a moderation policy and the empty list says it has none. Either write the rungs or delete the key');
    }
    if (named.length === 1) {
      add('PKG-62', `ladder of one rung (\`${named[0].rung}\`) — one step is a binary, not a graduated response: the finding this pack is built from is that effective communities escalate, and the sequence is nudge → private word → public correction → removal (research/COMMUNITY-GOVERNANCE-PATTERNS-2026-10-19.md §1). Two rungs, or none`);
    }
    const norm = (t) => String(t).replace(/\s+/g, ' ').trim().toLowerCase();
    const holders = new Map();
    for (const { role, tool } of fleetTools) {
      const k = norm(tool);
      if (!holders.has(k)) holders.set(k, []);
      holders.get(k).push(role);
    }
    named.forEach((rung, i) => {
      if (!rung.member_told) {
        add('PKG-62', `rung \`${rung.rung}\` sanctions without saying what the member is told (spec §2.9.4) — the member is the subject of this ladder, not the audience of a sanction delivered in the dark`);
      }
      if (!seats.includes(rung.by)) {
        add('PKG-62', `rung \`${rung.rung}\` gives the sanction to \`${rung.by ?? '(absent)'}\`, which is not a human seat (${seats.join(', ')}) — the fleet flags and a person sanctions (§2.7); an agent that removes a member is the failure mode this pack exists to refuse`);
      }
      const hit = holders.get(norm(rung.via ?? ''));
      if (hit) {
        add('PKG-63', `rung \`${rung.rung}\` is carried by \`${rung.via}\`, which ${hit.map((r) => `agent \`${r}\``).join(' and ')} declare as a tool — a rung the fleet can execute is not a ladder, it is an autonomous moderation lane (invariant #1). Drop the tool or hand the rung to the human's own action`);
      }
      if (i === named.length - 1 && !rung.appeal) {
        add('PKG-62', `the ladder ends at \`${rung.rung}\` and names no appeal — the bottom of a sanction ladder is exactly where the route back in has to be written down (spec §2.9.4); a rung with no way back is an ejection, not a sanction`);
      }
    });
  }

  // --- 11. structure, not state -----------------------------------------------------------
  // NOTE: the declared `locale:` is checked by the PARSER, not here — see `runtime/src/pack.ts`.
  // Reading strictness lives in the parser alone (rules/pack-format.mdc): `loadPack` runs this
  // validator first, so a refusal here would make the parser's own door unreachable, and a check
  // that cannot fire is worth exactly nothing (D24).
  // Every markdown file at the pack's root is pack prose, and every one of them is swept — a pack
  // that adds a README in another language, or a NOTES.md, must not get a quieter copy of the
  // rules. `pack.local.yaml` is deliberately not swept: it is the operator's own file, it holds
  // their real names and contacts, and "packs carry structure, never state" is the rule it lives
  // outside of.
  const rootProse = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => join(dir, e.name));
  const files = [join(dir, '.kinship.yaml'), ...rootProse, ...(orgPath ? [orgPath] : [])];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(md|ya?ml|json)$/.test(e.name)) files.push(p); } };
  for (const sub of ['agents', 'skills']) if (existsSync(join(dir, sub))) walk(join(dir, sub));
  for (const f of files) {
    const t = read(f); if (!t) continue;
    const rel = f.replace(`${process.cwd()}/`, '');
    const emails = (t.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || []).filter((e) => !e.includes('example'));
    if (emails.length) add('PKG-44', `${rel} contains what looks like a real address (${emails[0]}) — packs carry structure, never member or sponsor state (study §5 lesson 5)`);
    const phones = t.match(/(?:\+62|08\d{2})[-\s]?\d[\d\s-]{6,}\d/g);
    if (phones) add('PKG-45', `${rel} contains what looks like an Indonesian phone number — attendee contacts do not ship in a pack`);
    // PKG-57: the credential line, swept over every line of every file in the folder — including
    // commented lines, because a commented-out key is still a key in a folder people fork, and
    // including markdown, because the onboarding doc is where a "just set OPENAI_API_KEY=…"
    // instruction arrives. Report the shape and the line; never echo the match into the build log.
    const lines = t.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const shape = CREDENTIAL_SHAPES.find((s) => s.re.test(lines[i]));
      if (shape) add('PKG-57', `${rel}:${i + 1} carries the shape of ${shape.name} — a credential never enters a pack: the host holds it (BYOD, spec/HOST-CONTRACT.md seam 1) and a pack is a folder strangers fork`);
    }
    if (isBundled) {
      // The claim ceiling is checked against *assertions*, not citations: a phrase inside a code
      // span — or inside a double-quoted span in prose — is the repo naming a banned phrase in
      // order to forbid it. A double quote in a data file is a delimiter, not a quotation, so
      // `isProse` decides which rule applies; scripts/claim-scan.mjs carries the reasoning and the
      // limit it cannot catch.
      for (const claim of scanForClaims(t, { prose: isProse(rel) })) {
        add('PKG-46', `${rel} asserts the banned claim "${claim}" (PRD §2.3 claim ceiling) — the fleet proposes, the organiser approves`);
      }
    }
  }

  return { ok: errors.length === 0, errors, notices, checked: { agents: machRoles.length, skills: skillKeys.length, org: orgRef } };
}

const invokedDirectly = process.argv[1] && basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]);
if (invokedDirectly) {
  const dir = process.argv[2] || 'packs/kopdar-ops';
  const r = validatePack(dir);
  console.log(`\nvalidate-pack — ${dir}`);
  console.log(`  schema ${SCHEMA} · ${r.checked ? `${r.checked.agents} agents, ${r.checked.skills} skills · org ${r.checked.org ?? '(none)'}` : ''}`);
  for (const n of r.notices) console.log(`  notice  ${n}`);
  for (const e of r.errors) console.log(`  FAIL    ${e}`);
  console.log(r.ok ? '\n  PASS — pack shape and invariants hold (enforcement is not proved by this script; see header)\n' : `\n  ${r.errors.length} rule(s) violated\n`);
  process.exit(r.ok ? 0 : 1);
}
