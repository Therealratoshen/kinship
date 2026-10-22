/**
 * org.ts — the organisation tier: the manifest above the pack.
 *
 * A pack is one community. An operator who runs a kopdar, a workshop series, and a sponsor
 * newsletter has three packs, and the thing those three must not drift apart on is the member's
 * protections. `orgs/<key>.yaml` states that floor once, so a fork that edits
 * `member_message_cap_per_24h` upward fails against *the operator's number* rather than against the
 * schema's generic bound (the validator's `BOUNDED_GUARDRAILS` allows 1–5; an org can hold 2).
 *
 * This file parses and shape-checks. It does not resolve anything (that is `settings.ts`) and it
 * does not read files (that is `pack.ts`, the only module in the runtime with `node:fs` — the
 * boundary gate in `runtime/test/boundary.test.ts` holds that line because it is the BYOD promise:
 * a runtime module reading a config file is how a key would enter Kinship).
 *
 * Three shape rules are decisions, not preferences, and each has a test:
 *
 *  - **Exactly one human seat while PRD §12-Q12 is unanswered.** The runtime gates four acts on a
 *    seat and has no delegation path, so a manifest naming two seats would be a company setting the
 *    code does not have. The refusal names the open question, because the person who can answer it
 *    is the person most likely to hit the failure.
 *  - **A seat name may not also be an agent role.** Otherwise a pack declares `agents: { organiser:
 *    … }` and an agent holds the human seat — the four seat-gated acts would accept it.
 *  - **A ceiling may not say `never`.** Invariant #1: `never` means the tool is *absent*, and the
 *    review is a grep of the pack's toolset. A central `never` would make a class present-but-
 *    unreachable — denied-not-absent, which §1.1 forbids.
 *
 * Like the pack parser, this one is hand-rolled and deliberately small: it covers the flat YAML
 * subset an org manifest uses, and anything it cannot read refuses rather than guessing, because a
 * parser that guesses is a trust boundary with holes.
 */
import { refuse } from './errors.ts';
import type { Autonomy, PackedGuardrails, PackedOrg } from './types.ts';

export const ORG_SCHEMA = 'kinship-org/v1';

/** Bare slug. The pack key regex is namespaced (`kinshipai/bundled/…`) and the two must not blur. */
const ORG_KEY_RE = /^[a-z][a-z0-9-]*$/;
const LADDER: ReadonlySet<string> = new Set(['draft', 'opt-in-auto', 'never']);

/** The floors an org may hold, with the pack field each one names and how to read its value. */
const FLOOR_KEYS: ReadonlyMap<string, keyof PackedGuardrails> = new Map([
  ['member_message_cap_per_24h', 'memberMessageCapPer24h'],
  ['report_aggregation_floor', 'reportAggregationFloor'],
  ['identity_disclosure', 'identityDisclosure'],
  ['defaults', 'defaultsDeny'],
]);

const stripComment = (line: string): string => line.replace(/\s+#.*$/, '');
const unquote = (v: string): string => v.trim().replace(/^["']|["']$/g, '');
const topScalar = (yaml: string, key: string): string | null => {
  const m = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(yaml);
  return m ? unquote(stripComment(m[1]!)) : null;
};

/** `- item` entries under a top-level list key, or the inline `[a, b]` form. `[]` is an empty list. */
function topList(yaml: string, key: string): string[] | null {
  const lines = yaml.split('\n');
  const idx = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (idx === -1) return null;
  const head = unquote(stripComment(lines[idx]!.slice(key.length + 1)));
  if (head.startsWith('[')) return head.replace(/[\[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === '') continue;
    if ((l.length - l.trimStart().length) === 0) break;
    const item = unquote(stripComment(l).trim().replace(/^-\s*/, ''));
    if (item) out.push(item);
  }
  return out;
}

/** `k: v` pairs under a top-level block key, in file order, with the line numbers for the messages. */
function topBlock(yaml: string, key: string): Array<{ k: string; v: string; line: number }> {
  const lines = yaml.split('\n');
  const idx = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (idx === -1) return [];
  const out: Array<{ k: string; v: string; line: number }> = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === '') continue;
    const indent = l.length - l.trimStart().length;
    if (indent === 0) break;
    const kv = /^([^:]+):[ \t]*(.*)$/.exec(stripComment(l).trim());
    if (!kv) {
      refuse('org_invalid', 'org shape gate', `${key} has a line (${i + 1}) that is not ` + '`k: v` — this parser does not guess at a floor it cannot read');
    }
    out.push({ k: unquote(kv[1]!), v: unquote(stripComment(kv[2]!)), line: i + 1 });
  }
  return out;
}

const dupes = (list: string[]): string[] => [...new Set(list.filter((x, i) => list.indexOf(x) !== i))];

/**
 * Parse + shape-check an organisation manifest. Every failure is `org_invalid`, and every message
 * names the org, because the org tier is the one place in this repo where several files share one
 * shape — "which one failed" has to be in the first line a reader sees.
 */
export function parseOrg(yaml: string, origin = 'the manifest'): PackedOrg {
  const schema = topScalar(yaml, 'schema');
  const key = topScalar(yaml, 'key');
  const at: (msg: string) => never = (msg) => refuse('org_invalid', 'org shape gate',
    `org \`${key ?? '(key unreadable)'}\` (${origin}): ${msg}`);

  if (schema !== ORG_SCHEMA) at(`schema is \`${schema ?? '(absent)'}\`, expected \`${ORG_SCHEMA}\` — a pack manifest read as an org manifest is a tier collision, not a typo`);
  if (!key) at('no `key:` — an unaddressable org cannot be named by a pack');
  if (!ORG_KEY_RE.test(key!)) at(`key \`${key}\` is not a bare org slug (\`${ORG_KEY_RE.source}\`) — the org namespace is not the pack namespace`);
  const name = topScalar(yaml, 'name');

  const humanSeats = topList(yaml, 'human_seats');
  if (humanSeats === null) at('no `human_seats:` — an org with no human seat is an unattended fleet, and spec §2.7 puts approval and veto with a named human');
  if (!humanSeats.length) at('`human_seats` is empty — same failure in the other direction: a list that exists but names nobody');
  const extra = humanSeats.slice(1);
  if (extra.length) at(`\`human_seats\` declares ${humanSeats.length} seats (${humanSeats.join(', ')}), and only one is supported: a second seat is delegation, and delegation is PRD §12-Q12 — the owner's open question, not a feature to half-build`);
  const seatDupes = dupes(humanSeats);
  if (seatDupes.length) at(`\`human_seats\` repeats ${seatDupes.join(', ')} — a list that dedupes hides the second declaration, and the second declaration was someone's intent`);

  const agentRoles = topList(yaml, 'agent_roles');
  if (agentRoles === null) at('no `agent_roles:` — the org recognises a roster, and an empty roster is a deliberate `[]`, not an omission');
  const roleDupes = dupes(agentRoles);
  if (roleDupes.length) at(`\`agent_roles\` repeats ${roleDupes.join(', ')}`);
  const collisions = agentRoles.filter((r) => humanSeats.includes(r));
  if (collisions.length) at(`\`${collisions.join(', ')}\` is both a human seat and an agent role — a pack could then give an agent the seat that decideCard, issueGrant, revokeGrant and releaseShatter accept (§2.7)`);

  const floors: Partial<PackedGuardrails> = {};
  for (const { k, v, line } of topBlock(yaml, 'floors')) {
    const field = FLOOR_KEYS.get(k);
    // An unknown floor key is refused rather than ignored: a typo'd floor that silently does not
    // apply is exactly the decorative rule this repo keeps recording (D24, D28, D29).
    if (!field) at(`floors line ${line} names \`${k}\`, which is not a floor this runtime can hold (${[...FLOOR_KEYS.keys()].join(', ')})`);
    if (field === 'memberMessageCapPer24h' || field === 'reportAggregationFloor') {
      if (!/^\d+$/.test(v)) at(`floors.\`${k}\` is \`${v}\` on line ${line} — a number was expected, and a plausible word is not a bound`);
      (floors as Record<string, unknown>)[field] = Number(v);
      continue;
    }
    if (field === 'identityDisclosure') {
      if (!['required', 'not_required', 'true', 'false'].includes(v)) at(`floors.\`${k}\` is \`${v}\` on line ${line} — expected \`required\` or \`not_required\``);
      floors.identityDisclosure = v === 'required' || v === 'true';
      continue;
    }
    if (!['deny', 'allow', 'true', 'false'].includes(v)) at(`floors.\`${k}\` is \`${v}\` on line ${line} — expected \`deny\` or \`allow\``);
    floors.defaultsDeny = v === 'deny' || v === 'true';
  }

  const autonomyCeiling: Record<string, Autonomy> = {};
  for (const { k, v, line } of topBlock(yaml, 'autonomy_ceiling')) {
    if (!LADDER.has(v)) at(`autonomy_ceiling.\`${k}\` is \`${v}\` on line ${line}, which is not on the ladder`);
    // `never` is legal on the ladder and illegal here, for the reason in the header: the pack owns
    // absence, and a central `never` would be a denial wearing absence's clothes.
    if (v === 'never') at(`autonomy_ceiling.\`${k}\` is \`never\` on line ${line} — \`never\` means the tool is absent from the pack, and a ceiling cannot make a tool absent: invariant #1`);
    autonomyCeiling[k] = v as Autonomy;
  }

  return { schema: ORG_SCHEMA, key: key!, ...(name !== null ? { name } : {}), humanSeats, agentRoles, floors, autonomyCeiling };
}
