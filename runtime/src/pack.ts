/**
 * pack.ts — the boot gate. A pack directory is the deployable unit, and the runtime boots
 * through the SAME validator a stranger's CI runs: `loadPack` refuses `pack_invalid` when
 * `scripts/validate-pack.mjs` rejects the folder, so a fork cannot boot a pack whose
 * invariants it has edited away (FR-1.14 / D15 — a forked pack is untrusted input).
 *
 * The parser here is deliberately small and hand-rolled, like the validator's: the YAML
 * subset a pack uses is flat blocks, and a dependency-free read is the difference between
 * "fork this folder" working offline and not. Anything it cannot parse fails the boot —
 * a parser that guesses is a trust boundary with holes.
 *
 * `loadPack` is also the only place the **organisation** manifest is read (D35): a pack names its
 * org, and the org's floors come in with it. Still one reader, still `node:fs` in one file — the
 * boundary gate in `runtime/test/boundary.test.ts` allows pack.ts precisely because reading a pack
 * plus its own org file is the config read, not a credential read (the key never enters Kinship).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack } from '../../scripts/validate-pack.mjs';
import { refuse } from './errors.ts';
import { SUPPORTED_LOCALES, localeIsSupported } from './disclosure.ts';
import { parseOrg } from './org.ts';
import type { Autonomy, CommunityCoverage, CommunityPosture, Packed, PackedAgent, PackedOrg, SanctionRung } from './types.ts';

const LADDER: ReadonlySet<string> = new Set(['draft', 'opt-in-auto', 'never']);

const stripComment = (line: string): string => line.replace(/\s+#.*$/, '');

/** Top-level `key: value` scalars. */
function topScalar(yaml: string, key: string): string | null {
  const m = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(yaml);
  return m ? stripComment(m[1]!).trim() : null;
}

/** The indent-scoped block under a top-level key, comments stripped, blank lines dropped. */
function block(yaml: string, key: string): string[] {
  const lines = yaml.split('\n');
  const idx = lines.findIndex((l) => new RegExp(`^${key}:\\s*(#.*|)$`).test(l));
  if (idx === -1) return [];
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === '') continue;
    if ((l.length - l.trimStart().length) === 0) break; // next top-level key
    out.push(stripComment(l).trimEnd());
  }
  return out;
}

/** `k: v` pairs inside a block, keyed by the unindented name. */
function blockMap(entries: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of entries) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l.trim());
    if (kv && !l.startsWith('        ')) out.set(kv[1]!, kv[2]!.trim().replace(/^["']|["']$/g, ''));
  }
  return out;
}

/** `- item` entries inside a block (the `needs:` list). */
function blockList(entries: string[]): string[] {
  return entries
    .filter((l) => l.trimStart().startsWith('- '))
    .map((l) => l.trimStart().slice(2).trim().replace(/\s+#.*$/, ''));
}

function numberOr(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** The five keys a `sanction_ladder:` rung may carry, in the spelling the file uses. */
const LADDER_KEYS: Record<string, keyof SanctionRung> = {
  rung: 'rung', by: 'by', member_told: 'memberTold', via: 'via', appeal: 'appeal',
};

/**
 * The `sanction_ladder:` block, in file order — a sequence of `- key: value` maps.
 *
 * Strict in the same way the rest of this parser is, and for the same reason: a line that is skipped is
 * a line no gate ever saw. `tool: telegram | send` inside a rung would read as a clean ladder to every
 * shape check (the reachability rule compares `via`, not an invented key), and a `-` with no `rung:`
 * would drop a rung the community thought it had. Both are refused at the read, so a pack that parses
 * has been read in full.
 */
function refuseLadderLine(packKey: string, what: string): never {
  return refuse('pack_invalid', 'ladder parse gate (D37)',
    `pack \`${packKey}\` has a \`sanction_ladder:\` entry ${what} — the runtime reads \`rung\`, \`by\`, \`member_told\`, \`via\` and \`appeal\` and nothing else, so a line it cannot read is not skipped: a ladder whose file and whose parsed shape disagree is exactly the document this repo refuses to boot`);
}

function parseSanctionLadder(yaml: string, packKey: string): SanctionRung[] {
  const out: SanctionRung[] = [];
  let current: Record<string, string> | null = null;
  const flush = (): void => {
    const entry = current;
    current = null;
    if (entry === null) return;
    const unknown = Object.keys(entry).filter((k) => LADDER_KEYS[k] === undefined);
    if (unknown.length) refuseLadderLine(packKey, `that writes \`${unknown[0]}\`, a key it does not have`);
    if (entry.rung === undefined) refuseLadderLine(packKey, 'with no `rung:` name');
    out.push({
      rung: entry.rung,
      by: entry.by ?? '',
      memberTold: entry.member_told ?? '',
      via: entry.via ?? '',
      ...(entry.appeal !== undefined ? { appeal: entry.appeal } : {}),
    });
  };
  for (const raw of block(yaml, 'sanction_ladder')) {
    const t = raw.trim();
    const isItem = t === '-' || t.startsWith('- ');
    if (isItem) flush();
    if (current === null) current = {};
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(isItem ? t.slice(1).trim() : t);
    if (kv === null) refuseLadderLine(packKey, `this parser cannot read: \`${t}\``);
    current[kv[1]!] = kv[2]!.trim().replace(/^['"]|['"]$/g, '');
  }
  flush();
  return out;
}

function parseAgents(yaml: string): Record<string, PackedAgent> {
  const lines = yaml.split('\n').map((l) => stripComment(l));
  const start = lines.findIndex((l) => /^agents:\s*$/.test(l));
  if (start === -1) refuse('pack_invalid', 'pack format gate', 'no `agents:` block');
  const agents: Record<string, PackedAgent> = {};
  let current: { role: string; autonomy: Record<string, Autonomy>; tools: string[]; outputs?: string } | null = null;
  let inAutonomy = false;
  for (let i = start + 1; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim() === '') continue;
    const indent = raw.length - raw.trimStart().length;
    if (indent === 0) break; // next top-level key
    const t = raw.trim();
    if (indent === 2 && t.endsWith(':')) {
      if (current) agents[current.role] = { role: current.role, autonomyByClass: current.autonomy, tools: current.tools, ...(current.outputs !== undefined ? { outputs: current.outputs } : {}) };
      current = { role: t.replace(/:$/, ''), autonomy: {}, tools: [] };
      inAutonomy = false;
      continue;
    }
    if (!current) continue;
    if (indent === 4 && t === 'autonomy_by_class:') { inAutonomy = true; continue; }
    if (indent === 4 && t === 'tools:') { inAutonomy = false; continue; }
    if (indent === 4 && t.startsWith('outputs:')) { current.outputs = t.slice('outputs:'.length).trim(); inAutonomy = false; continue; }
    if (indent > 4 && inAutonomy) {
      const kv = /^([a-z_.-]+):\s*(\S+)/.exec(t);
      if (kv) {
        const value = kv[2]!;
        if (!LADDER.has(value)) refuse('pack_invalid', 'pack format gate', `class \`${kv[1]}\` has autonomy \`${value}\`, which is not on the ladder`);
        current.autonomy[kv[1]!] = value as Autonomy;
      }
      continue;
    }
    if (indent >= 4 && t.startsWith('- ')) {
      current.tools.push(t.slice(2).replace(/\s+#.*$/, '').trim());
    }
  }
  if (current) agents[current.role] = { role: current.role, autonomyByClass: current.autonomy, tools: current.tools, ...(current.outputs !== undefined ? { outputs: current.outputs } : {}) };
  return agents;
}

/**
 * The guardrail keys a pack *file* may write, in the spelling the files use. What the file spelled
 * out is a decision; what the parser defaulted is not (see `settings.ts` — the org may refuse a
 * decision and fill a blank, and may do only those two things).
 */
const FLOOR_NAMES = ['report_aggregation_floor', 'member_message_cap_per_24h', 'identity_disclosure', 'defaults'];

/** The keys a `coverage:` block may carry, in the spelling the file uses. */
const COVERAGE_KEYS: ReadonlySet<string> = new Set(['mode', 'timezone', 'days', 'opens', 'closes']);

/**
 * The `coverage:` key as a file writes it — the key alone, or the key with a trailing comment.
 *
 * One pattern, shared by the parser and the validator, because two readers with different ideas of
 * "what a key looks like" is how a gate ends up checking a file the runtime never sees. Hoisted to a
 * constant because a fresh `RegExp` per line is a fresh compile per line.
 */
const COVERAGE_KEY_LINE = /^coverage:\s*(#.*|)$/;

/** Local weekday names a pack may write, mapped to the number the runtime uses (0 = Sunday). */
const WEEKDAYS: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/** `HH:MM` in local time — the only shape a coverage window is written in. */
function localTimeToMinutes(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (m === null) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The keys a `posture:` block may carry, in the spelling the file uses. */
const POSTURE_KEYS: ReadonlySet<string> = new Set(['contact', 'openness']);

/**
 * The `posture:` block — how this community is run.
 *
 * Parsed here, refused here, for the same reason as the coverage block: this file is the only reader
 * of a pack folder, and the gate that matters is the one a fork cannot skip by not running CI.
 *
 * **A pack declares a posture; it does not get one handed to it.** There is no country table in this
 * runtime and there never will be: a `country → posture` lookup would be a stereotype in code, and
 * worse, a rule nobody in that community chose. The community is the only authority on its own
 * manners.
 */
function parsePosture(yaml: string, packKey: string): CommunityPosture | undefined {
  const lines = block(yaml, 'posture');
  if (lines.length === 0) return undefined; // the pack said nothing; the conservative default applies

  const map = new Map<string, string>();
  for (const l of lines) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l.trim());
    if (kv === null) {
      refuse('pack_invalid', 'posture parse gate',
        `pack \`${packKey}\` has a \`posture:\` line this parser cannot read: \`${l.trim()}\` — a posture the runtime cannot evaluate is a posture the fleet would ignore, and a community's manners are not something to guess at`);
    }
    map.set(kv[1]!, kv[2]!.trim().replace(/^["']|["']$/g, ''));
  }

  const unknown = [...map.keys()].filter((k) => !POSTURE_KEYS.has(k));
  if (unknown.length > 0) {
    refuse('pack_invalid', 'posture parse gate',
      `pack \`${packKey}\` writes \`posture.${unknown[0]}\`, a key it does not have — the runtime reads ${[...POSTURE_KEYS].map((k) => `\`${k}\``).join(' and ')} and nothing else, so a line it cannot read is not skipped: a posture whose file and whose parsed shape disagree is exactly the document this repo refuses to boot`);
  }

  const contact = map.get('contact') ?? 'asked_only';
  if (contact !== 'never' && contact !== 'asked_only' && contact !== 'open') {
    refuse('pack_invalid', 'posture parse gate',
      `pack \`${packKey}\` declares \`posture.contact: ${contact}\` — expected \`never\` (no 1:1 member message at all), \`asked_only\` (only to a member who asked or spoke) or \`open\``);
  }
  const openness = map.get('openness') ?? 'closed';
  if (openness !== 'closed' && openness !== 'open') {
    refuse('pack_invalid', 'posture parse gate',
      `pack \`${packKey}\` declares \`posture.openness: ${openness}\` — expected \`closed\` (not discoverable, no public posts) or \`open\``);
  }
  return { contact, openness };
}

/**
 * The `coverage:` block — the community's staffed hours, in the community's own local calendar.
 *
 * Parsed here, refused here, for the same reason as the sanction ladder (D37): this file is the
 * only reader of a pack folder, and the gate that matters is the one a fork cannot skip by not
 * running CI.
 *
 * The refusals here are about *shape*, not about whether the promise is wise — a community may
 * staff any hours it likes. What is refused is a window the runtime cannot read, because a window
 * that silently evaluates to "never on duty" would turn every later number into a quiet lie.
 *
 * **Exported, so its own door is testable.** `loadPack` runs the validator FIRST, so a boot-level test
 * of a malformed window sees **PKG-65's** message, not this one — a test that reads `pack_invalid` and
 * a field name cannot tell the two apart, and would pass with this parser's refusals deleted. That is
 * the check-that-cannot-fail class (D24), so this function is exported and called directly by
 * `runtime/test/pack.test.ts`, the same seam `parseOrg` gives `org.test.ts`. The shape is therefore
 * proved **twice**: by PKG-65 in CI, and by this parser on its own.
 */
export function parseCoverage(yaml: string, packKey: string): CommunityCoverage | undefined {
  // The same trap the sanction ladder guards against (D37 / PKG-62): a file may not write the
  // block twice. A reader takes the first and ignores the rest, so a second block would be a
  // staffing promise no check ever saw.
  const occurrences = yaml.split('\n').reduce(
    (acc, l) => (COVERAGE_KEY_LINE.test(l) ? acc + 1 : acc),
    0,
  );
  if (occurrences > 1) {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` writes \`coverage:\` ${occurrences} times — a reader takes the first block and ignores the rest, so a second block is a staffing promise no check ever saw. One file may not disagree with itself`);
  }

  const lines = block(yaml, 'coverage');
  if (lines.length === 0) {
    // A `coverage:` key whose value is not empty is a window this reader cannot read — an inline
    // flow map (`coverage: {mode: always}`) is YAML the pack format does not use, and reading it as
    // "no window at all" would turn a community's stated promise into an *unknown* duty state. That
    // is the same quiet lie as reading it as "never on duty", wearing a different hat.
    const inline = yaml.split('\n').find((l) => /^coverage:\s*\S/.test(l));
    if (inline !== undefined) {
      refuse('pack_invalid', 'coverage parse gate',
        `pack \`${packKey}\` writes \`${inline.trim()}\` — the coverage window is a block of \`key: value\` lines, and a window this reader cannot evaluate would read as "no window at all", which is a different claim from the one the pack made`);
    }
    return undefined; // an unstated staffing promise is not a promise
  }

  const map = new Map<string, string>();
  for (const l of lines) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l.trim());
    if (kv === null) {
      refuse('pack_invalid', 'coverage parse gate',
        `pack \`${packKey}\` has a \`coverage:\` line this parser cannot read: \`${l.trim()}\` — a window the runtime cannot evaluate is a window that would read as "never on duty" and turn every later number into a quiet lie`);
    }
    map.set(kv[1]!, kv[2]!.trim().replace(/^["']|["']$/g, ''));
  }

  // An unknown key is refused, not skipped — the same rule the sanction ladder follows (D37). A
  // typo (`dayz:` for `days:`) would otherwise read as a window with no days and no complaint, and
  // a key the runtime does not understand is a key the community believes it wrote.
  const unknown = [...map.keys()].filter((k) => !COVERAGE_KEYS.has(k));
  if (unknown.length > 0) {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` writes \`coverage.${unknown[0]}\`, a key it does not have — the runtime reads ${[...COVERAGE_KEYS].map((k) => `\`${k}\``).join(', ')} and nothing else, so a line it cannot read is not skipped: a window whose file and whose parsed shape disagree is exactly the document this repo refuses to boot`);
  }

  const mode = map.get('mode');
  if (mode !== 'always' && mode !== 'staffed') {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` declares \`coverage.mode: ${mode ?? '(absent)'}\` — expected \`always\` (a 24/7 community) or \`staffed\` (a window of hours)`);
  }
  if (mode === 'always') {
    // `always` is a claim that the community is staffed around the clock, so there are no days to
    // name and no hours to open and close. A block that writes them anyway is a file disagreeing
    // with itself — the same fault the duplicate-block rule refuses — so they are refused rather
    // than quietly dropped. The zone is kept when the pack names one and is `null` when it does
    // not: an invented "UTC" would be a claim about a community nobody described.
    for (const key of ['days', 'opens', 'closes']) {
      if (map.has(key)) {
        refuse('pack_invalid', 'coverage parse gate',
          `pack \`${packKey}\` declares \`coverage.mode: always\` and also writes \`coverage.${key}\` — a community staffed around the clock has no shift to open or close, so the file is disagreeing with itself. Drop the \`${key}\` line or declare \`mode: staffed\``);
      }
    }
    const zone = map.get('timezone');
    if (zone !== undefined) {
      try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }); }
      catch {
        refuse('pack_invalid', 'coverage parse gate',
          `pack \`${packKey}\` declares \`coverage.timezone: ${zone}\`, which is not an IANA zone — the window is a statement about that zone's local calendar, so an unreadable zone is an unreadable window`);
      }
    }
    return { mode: 'always', timezone: zone ?? null };
  }

  const timezone = map.get('timezone');
  if (timezone === undefined || timezone === '') {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` declares a staffed window with no \`timezone:\` — "business hours" without a zone is not a commitment, and an unzoned window is a window nobody can be on duty for`);
  }
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
  } catch {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` declares \`coverage.timezone: ${timezone}\`, which is not an IANA zone — the window is a statement about that zone's local calendar, so an unreadable zone is an unreadable window`);
  }

  const daysRaw = map.get('days');
  if (daysRaw === undefined || daysRaw === '') {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` declares a staffed window with no \`days:\` — a shift needs the weekdays it covers`);
  }
  const days: number[] = [];
  for (const raw of daysRaw.split(',')) {
    const name = raw.trim().toLowerCase();
    const day = WEEKDAYS[name];
    if (day === undefined) {
      refuse('pack_invalid', 'coverage parse gate',
        `pack \`${packKey}\` names \`${raw.trim()}\` in \`coverage.days:\` — expected local weekday names (sun..sat)`);
    }
    if (!days.includes(day)) days.push(day);
  }

  const opens = localTimeToMinutes(map.get('opens'));
  const closes = localTimeToMinutes(map.get('closes'));
  if (opens === null || closes === null) {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` declares a staffed window whose \`opens:\`/\`closes:\` are not \`HH:MM\` local times — the window is read as a local wall clock, so anything else cannot be evaluated`);
  }
  if (opens >= closes) {
    refuse('pack_invalid', 'coverage parse gate',
      `pack \`${packKey}\` declares \`coverage.opens: ${map.get('opens')}\` and \`coverage.closes: ${map.get('closes')}\` — a shift that closes before it opens is not a shift (an overnight window would need its own rule, not a backwards one)`);
  }

  return { mode: 'staffed', timezone, days: days.sort((a, b) => a - b), opens, closes };
}

/**
 * Where the organisation manifests are. A fork is a whole repo, so `orgs/` sits beside `packs/` and
 * walking up from the pack folder finds it; a pack handed to the loader from somewhere else (a temp
 * copy in a test, a mounted folder in CI) is resolved from the working directory, the same way
 * `scripts/validate-pack.mjs` finds the repo. First candidate that exists wins, and if none does the
 * boot refuses rather than proceeding floorless.
 */
function findOrgsRoot(dir: string): { root: string | null; checked: string[] } {
  const checked: string[] = [];
  let cur = dir;
  for (let depth = 0; depth < 4; depth++) {
    cur = join(cur, '..');
    const candidate = join(cur, 'orgs');
    checked.push(candidate);
    if (existsSync(candidate)) return { root: candidate, checked };
  }
  const fromCwd = join(process.cwd(), 'orgs');
  checked.push(fromCwd);
  if (existsSync(fromCwd)) return { root: fromCwd, checked };
  return { root: null, checked };
}

/**
 * Read + validate a pack directory. The validator runs FIRST — a structurally invalid pack
 * refuses before anything is parsed, so the parser is only ever trusted on a gated folder.
 */
export function loadPack(dir: string): Packed {
  // The org tier is found by walking UP from the pack folder, not by looking in the working
  // directory — a host that installs this pack anywhere but the repo root, which is every host,
  // would otherwise fail the validator on a path it has never heard of. The loader's resolution
  // and the validator's have to be the SAME resolution, or the gate checks one file and the
  // loader reads another. So the root is found once, here, and handed down.
  const { root: orgsRoot, checked } = findOrgsRoot(dir);
  const result = validatePack(dir, orgsRoot === null ? {} : { orgsRoot });
  if (!result.ok) {
    refuse('pack_invalid', 'pack format gate (validator)', `${result.errors.length} shape violation(s): ${result.errors.join(' | ')}`);
  }
  const yaml = readFileSync(join(dir, '.kinship.yaml'), 'utf8');
  const schema = topScalar(yaml, 'schema');
  const key = topScalar(yaml, 'key');
  if (schema !== 'kinship/v1') refuse('pack_invalid', 'pack format gate', `schema is \`${schema}\`, expected \`kinship/v1\``);
  if (!key) refuse('pack_invalid', 'pack format gate', 'pack key missing');

  const localeRaw = topScalar(yaml, 'locale') ?? SUPPORTED_LOCALES.join(',');
  const locale = localeRaw.replace(/[\[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  // A pack may declare the language pair it runs in, but it may only declare the pair this runtime
  // implements. The member-facing fields are `textId` and `textEn` and the canonical disclosure line
  // exists for those two languages, so a pack that declares anything else would boot and then fail
  // at send time with a refusal that names neither the language nor the setting that caused it.
  // Supporting another language is a runtime change, not a pack edit.
  if (!localeIsSupported(locale)) {
    refuse('pack_invalid', 'pack format gate (locale)',
      `pack \`${key}\` declares \`locale: ${localeRaw}\` but this runtime implements only ${SUPPORTED_LOCALES.join(' and ')} — the member-facing fields are \`textId\` and \`textEn\` and the canonical disclosure line exists for those two languages, so a pack cannot declare a pair the runtime will not honour`);
  }

  const guard = blockMap(block(yaml, 'guardrails'));
  const budgets = blockMap(block(yaml, 'budgets'));
  const needs = blockList(block(yaml, 'needs'));
  const agents = parseAgents(yaml);
  const coverage = parseCoverage(yaml, key);
  const posture = parsePosture(yaml, key);

  const llmRaw = budgets.get('llm_per_event_idr');
  const llmPerEventIdr = llmRaw !== undefined && /^\d+$/.test(llmRaw) ? Number(llmRaw) : null; // null stays null: the unset ceiling refuses (§12-Q9)

  // --- the organisation tier (D35) ---------------------------------------------------------------
  // The pack names an org; the org holds floors. This is the only place either file is read, and the
  // rule is fail-closed: an `organisation:` whose manifest cannot be found is a refusal, never a
  // silent drop to no-tier, because the operator is the one party who would not learn their floor
  // stopped applying.
  const organisationRaw = topScalar(yaml, 'organisation');
  const organisation = organisationRaw === null || organisationRaw === '' || organisationRaw === 'null' ? null : organisationRaw;
  let org: PackedOrg | undefined;
  if (organisation !== null) {
    const file = orgsRoot === null ? null : join(orgsRoot, `${organisation}.yaml`);
    if (file === null || !existsSync(file)) {
      refuse('pack_invalid', 'org tier gate (FR-1.18)',
        `pack \`${key}\` names organisation \`${organisation}\` and no manifest was found — checked ${checked.map((c) => `\`${join(c, `${organisation}.yaml`)}\``).join(', ')} — booting floorless is not a fallback here, it is the failure this gate exists to catch`);
    }
    org = parseOrg(readFileSync(file, 'utf8'), file);
    if (org.key !== organisation) {
      refuse('pack_invalid', 'org tier gate (FR-1.18)',
        `pack \`${key}\` names organisation \`${organisation}\` and the manifest at \`${file}\` declares key \`${org.key}\` — two names for one org means a pack can resolve the wrong floor`);
    }
  }

  // --- the sanction ladder (D37) -------------------------------------------------------------------
  // Parsed here because this file is the only reader of a pack folder, and refused here because the
  // gate that matters is the one a fork cannot skip by not running CI.
  const sanctionLadder = parseSanctionLadder(yaml, key);

  return {
    schema: 'kinship/v1',
    key,
    locale,
    agents,
    guardrails: {
      reportAggregationFloor: numberOr(guard.get('report_aggregation_floor'), 10),
      memberMessageCapPer24h: numberOr(guard.get('member_message_cap_per_24h'), 2),
      identityDisclosure: guard.get('identity_disclosure') === 'required' || guard.get('identity_disclosure') === 'true',
      defaultsDeny: guard.get('defaults') === 'deny',
    },
    budgets: {
      llmPerEventIdr,
      warnAtRatio: numberOr(budgets.get('warn_at_ratio'), 0.8),
      hardStop: budgets.get('hard_stop') !== 'false',
      queueMax: numberOr(budgets.get('queue_max'), 20),
      maxActionsPerRun: numberOr(budgets.get('max_actions_per_run'), 15),
      crossPromoPerEventCap: guard.has('cross_promo_per_event_cap') ? numberOr(guard.get('cross_promo_per_event_cap'), 1) : 1,
    },
    needs,
    organisation,
    ...(org !== undefined ? { org } : {}),
    // A pack that declared no coverage window reads back as absent, not as a default window: an
    // unstated staffing promise is not a promise, and the reads report the duty state as unknown.
    ...(coverage !== undefined ? { coverage } : {}),
    // A pack that declared no posture reads back as absent, not as a default: the conservative
    // default is applied by the RESOLVER, where the org's floor can still supply it and the
    // provenance can say which file decided.
    ...(posture !== undefined ? { posture } : {}),
    // A pack that declared no ladder reads back as `undefined`, not as `[]` and not as a default ladder:
    // the runtime has no business supplying norms a community never wrote down (D37).
    ...(sanctionLadder.length > 0 ? { sanctionLadder } : {}),
    declared: FLOOR_NAMES.filter((name) => guard.has(name)),
  };
}
