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
import { parseOrg } from './org.ts';
import type { Autonomy, Packed, PackedAgent, PackedOrg, SanctionRung } from './types.ts';

const LADDER: ReadonlySet<string> = new Set(['draft', 'opt-in-auto', 'never']);

const stripComment = (line: string): string => line.replace(/\s+#.*$/, '');

/** Top-level `key: value` scalars. */
function topScalar(yaml: string, key: string): string | null {
  const m = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(yaml);
  return m ? stripComment(m[1]).trim() : null;
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
  const result = validatePack(dir);
  if (!result.ok) {
    refuse('pack_invalid', 'pack format gate (validator)', `${result.errors.length} shape violation(s): ${result.errors.join(' | ')}`);
  }
  const yaml = readFileSync(join(dir, '.kinship.yaml'), 'utf8');
  const schema = topScalar(yaml, 'schema');
  const key = topScalar(yaml, 'key');
  if (schema !== 'kinship/v1') refuse('pack_invalid', 'pack format gate', `schema is \`${schema}\`, expected \`kinship/v1\``);
  if (!key) refuse('pack_invalid', 'pack format gate', 'pack key missing');

  const localeRaw = topScalar(yaml, 'locale') ?? '[id, en]';
  const locale = localeRaw.replace(/[\[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);

  const guard = blockMap(block(yaml, 'guardrails'));
  const budgets = blockMap(block(yaml, 'budgets'));
  const needs = blockList(block(yaml, 'needs'));
  const agents = parseAgents(yaml);

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
    const { root, checked } = findOrgsRoot(dir);
    const file = root === null ? null : join(root, `${organisation}.yaml`);
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
    // A pack that declared no ladder reads back as `undefined`, not as `[]` and not as a default ladder:
    // the runtime has no business supplying norms a community never wrote down (D37).
    ...(sanctionLadder.length > 0 ? { sanctionLadder } : {}),
    declared: FLOOR_NAMES.filter((name) => guard.has(name)),
  };
}
