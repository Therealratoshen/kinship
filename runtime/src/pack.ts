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
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack } from '../../scripts/validate-pack.mjs';
import { refuse } from './errors.ts';
import type { Autonomy, Packed, PackedAgent } from './types.ts';

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
  };
}
