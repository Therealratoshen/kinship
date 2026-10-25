/**
 * capabilities.ts — what the fleet is allowed to do, and who answers for it.
 *
 * **The problem this file exists for.** A community's manifest already says a great deal: the
 * floors (`member_message_cap_per_24h`), the operating posture, the autonomy ceiling, the human
 * seat. What it could not say was the *shape of the human check itself* — whether the fleet **asks**
 * the human or waits to be asked. That was not an oversight so much as a missing vocabulary: there
 * was nowhere to write "push", so nobody could write it.
 *
 * **Why a capability manifest and not another setting.** The distinction this repo keeps drawing is
 * between a *formatting* choice and a *governance* choice. A setting that changes what the log
 * looks like is a formatting choice; a setting that changes whether a human is asked is a
 * governance choice — and putting the two in one dial is how a community accidentally turns the
 * check off. So the manifest carries only capabilities: things that change what the fleet may do.
 *
 * **The floor, stated as a floor.** The human check's **shape** is configurable. Its **existence**
 * is not: there is no `off` value, no `none`, no `disabled`. Writing one is refused, and the refusal
 * says why. This is not a config default that a careful operator could override — it is the absence
 * of a switch, which is the only kind of floor that cannot be set by accident.
 *
 * **The vocabulary grows only with enforcement.** A capability the runtime cannot act on is a
 * setting that lies, and this repo has now recorded that failure three times (D24's five unraised
 * refusal codes, D28's single-sourced gates, D29's rule that was only a comment). So the rule for
 * the next capability is: it lands here **only** if it changes what the runtime *does*. `human_check`
 * qualifies, because `push` writes a `ReviewRequested` event and `pull` does not — a difference
 * visible in the log and in what a host has to do. A capability that would only be read back is not
 * a capability, it is a comment with a schema.
 *
 * **What `push` does and does not do.** `push` makes the runtime *ask*: each card that needs a human
 * also writes a `ReviewRequested` row, which is the row a host turns into a notification. The
 * runtime still does not send anything — delivery is the host's seam (spec section 1.12 / the
 * credential seam), and the whole point of this file is that the *decision* to ask is made here
 * while the *delivery* stays with whoever holds the credential.
 */
import { refuse } from './errors.ts';
import type { RefusalCode } from './errors.ts';
import type {
  CapabilityDeclaration,
  CommunityCapabilities,
  PackedOrg,
  ResolvedCapabilities,
  ReviewShape,
  SettingSource,
} from './types.ts';

/**
 * The capabilities this runtime knows.
 *
 * Closed on purpose: an unknown name is **refused**, not ignored. A typo that silently disabled a
 * governance control is the failure this repo keeps recording, and a manifest is exactly where a
 * typo is cheapest and most likely.
 */
export const CAPABILITY_NAMES: readonly string[] = ['human_check'];

/** The shapes the human check can take. See `ReviewShape`. */
export const REVIEW_SHAPES: readonly ReviewShape[] = ['push', 'pull'];

/**
 * Which tier a capability declaration was read from.
 *
 * **Two tiers, one vocabulary, one reader.** The org manifest and a community's own pack declare
 * capabilities in the same shape, so they are parsed by the same reader — two implementations of
 * "how a capability is read" is two rules in two places, which is the failure class this repository
 * keeps recording. The tier only changes the refusal code and the wording, because a pack's shape
 * error and an org's shape error are the same error at two altitudes.
 */
export type CapabilityTier = 'org' | 'pack';

/** The refusal code each tier's shape errors carry. */
const TIER_CODE: Record<CapabilityTier, RefusalCode> = { org: 'org_invalid', pack: 'pack_invalid' };

/**
 * How wide each shape is — and this is the direction the pack-level override turns on.
 *
 * **`pull` is the narrow end.** Under `pull` the runtime writes no `ReviewRequested` row and
 * interrupts nobody: the human opens the inbox. Under `push` the runtime writes a row per waiting
 * card and obliges the host to turn that row into a notification. So narrowing means **the runtime
 * does less** — and the check itself survives every shape, because the check's *existence* is a
 * floor (spec section 1.12) and no shape removes it.
 *
 * **The consequence, said once so nobody discovers it by surprise:** a community that narrows to
 * `pull` accepts that its cards wait for a human to come and look. That is the community's own
 * choice about its own operation, and the reason the direction is "narrow, never widen" and not
 * "the pack decides".
 */
export const REVIEW_SHAPE_WIDTH: Record<ReviewShape, number> = { pull: 0, push: 1 };

/**
 * Is this shape narrower than that one?
 *
 * One function, so the question has one answer in the codebase — the same reason the gates are
 * single-sourced (D28). A `pull` that is "narrower than push" written in one place and "wider than
 * push" in another would make the override a coin flip.
 */
export function isNarrower(shape: ReviewShape, than: ReviewShape): boolean {
  return REVIEW_SHAPE_WIDTH[shape] < REVIEW_SHAPE_WIDTH[than];
}

/**
 * The shape in force when no manifest says otherwise: `pull`.
 *
 * The runtime asks nobody until a community says it wants to be asked. That is the conservative
 * reading — a fleet that starts by interrupting a human it was never introduced to is a fleet that
 * has already spent the one thing it cannot get back.
 */
export const DEFAULT_REVIEW_SHAPE: ReviewShape = 'pull';

/**
 * The words a manifest might use to switch the check off, and the refusal they earn.
 *
 * Listed so the refusal can say *why* rather than "unknown value" — somebody who wrote `shape: off`
 * is trying to do something, and the honest answer is that the thing they are trying to do is not
 * available, not that they misspelled it.
 */
const DISABLING_WORDS: ReadonlySet<string> = new Set(['off', 'none', 'disabled', 'false', 'no', 'never']);

/** What the runtime says when a manifest declares a capability it does not know. */
function unknownCapability(tier: CapabilityTier, key: string, name: string): never {
  refuse(TIER_CODE[tier], 'capability manifest (DECISIONS.md D103)',
    `${tier} \`${key}\` declares a capability \`${name}\`, which this runtime does not have (${CAPABILITY_NAMES.join(', ')}) — an unknown capability is refused rather than ignored, because a name this runtime cannot act on would be a setting that lies about what the fleet may do`);
}

/**
 * Parse and shape-check a capability block.
 *
 * Every failure is the tier's own refusal code, and every message names the file — the same rule
 * the rest of the parsers follow, for the same reason: "which one failed" has to be in the first
 * line.
 */
export function parseCapabilities(
  raw: Record<string, { shape?: string; reason?: string }>,
  args: { tier: CapabilityTier; key: string },
): CommunityCapabilities {
  const out: CommunityCapabilities = {};
  for (const [name, fields] of Object.entries(raw)) {
    if (!CAPABILITY_NAMES.includes(name)) unknownCapability(args.tier, args.key, name);

    // An unknown field is refused, not ignored. A field this runtime does not read is a setting
    // that lies — and the first version of this manifest carried a `seat:` that the runtime then
    // resolved elsewhere, which is exactly the kind of second copy of a fact that goes stale.
    const unknown = Object.keys(fields).filter((k) => k !== 'shape' && k !== 'reason');
    if (unknown.length) {
      refuse(TIER_CODE[args.tier], 'capability manifest (DECISIONS.md D103)',
        `${args.tier} \`${args.key}\` gives capability \`${name}\` the field${unknown.length > 1 ? 's' : ''} ${unknown.map((k) => `\`${k}\``).join(', ')}, which this runtime does not read — a field nothing reads is a setting that lies, and the seat that answers is resolved from the community's declared seat set rather than written here`);
    }

    const shape = fields.shape;
    if (shape === undefined) {
      refuse(TIER_CODE[args.tier], 'capability manifest (DECISIONS.md D103)',
        `${args.tier} \`${args.key}\` declares capability \`${name}\` with no \`shape:\` — a capability that does not say how it behaves is a setting with no behaviour`);
    }
    if (DISABLING_WORDS.has(shape.trim().toLowerCase())) {
      refuse(TIER_CODE[args.tier], 'capability manifest (DECISIONS.md D103)',
        `${args.tier} \`${args.key}\` sets capability \`${name}\` to \`${shape}\` — **the human check's existence is a floor, not a setting**: there is no off state, because a community that can switch the check off has not configured a check. Its *shape* (\`push\`, \`pull\`) is configurable; its existence is not`);
    }
    if (!REVIEW_SHAPES.includes(shape as ReviewShape)) {
      refuse(TIER_CODE[args.tier], 'capability manifest (DECISIONS.md D103)',
        `${args.tier} \`${args.key}\` sets capability \`${name}\` to \`${shape}\`, which is not a shape this runtime has (${REVIEW_SHAPES.join(', ')})`);
    }

    const reason = (fields.reason ?? '').trim();
    if (!reason) {
      refuse(TIER_CODE[args.tier], 'capability manifest (DECISIONS.md D103)',
        `${args.tier} \`${args.key}\` declares capability \`${name}\` with no \`reason:\` — "we turned this on" is not a decision, and a decision nobody can read later is not a decision`);
    }

    out[name] = { shape: shape as ReviewShape, reason };
  }
  return out;
}

/**
 * Read a `capabilities:` block out of a manifest, at either tier.
 *
 * **The shape is two levels deep** — a capability, then its fields — and the reader is
 * hand-rolled and deliberately small: it covers the flat YAML subset a manifest uses, and
 * anything it cannot read **refuses** rather than guessing, because a parser that guesses is a
 * trust boundary with holes.
 *
 * **It lives here, not in either tier's file**, because the org manifest and the pack manifest
 * declare capabilities identically and two readers would be two rules in two places.
 */
export function parseCapabilityBlock(
  yaml: string,
  args: { tier: CapabilityTier; key: string },
): CommunityCapabilities | undefined {
  const code = TIER_CODE[args.tier];
  const label = `${args.tier} \`${args.key}\``;
  const lines = yaml.split('\n');
  const idx = lines.findIndex((l) => /^capabilities:/.test(l));
  if (idx === -1) return undefined;

  const raw: Record<string, { shape?: string; reason?: string }> = {};
  let current: string | null = null;

  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() === '' || l.trimStart().startsWith('#')) continue;
    const indent = l.length - l.trimStart().length;
    if (indent === 0) break; // the block ended

    const content = stripComment(l).trim();

    if (indent === 2) {
      const name = content.replace(/:.*$/, '').trim();
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        refuse(code, 'capability manifest shape gate',
          `${label}: capabilities line ${i + 1} names \`${name}\`, which is not a capability name this runtime can read (\`lowercase_snake_case\`)`);
      }
      if (content !== `${name}:`) {
        refuse(code, 'capability manifest shape gate',
          `${label}: capabilities line ${i + 1} is \`${content}\` — a capability opens a block of its own fields, it does not carry a value`);
      }
      current = name;
      raw[current] = {};
      continue;
    }

    if (indent === 4) {
      if (current === null) {
        refuse(code, 'capability manifest shape gate',
          `${label}: capabilities line ${i + 1} sets a field before any capability is named`);
      }
      const kv = /^([^:]+):[ \t]*(.*)$/.exec(content);
      if (!kv) {
        refuse(code, 'capability manifest shape gate',
          `${label}: capabilities line ${i + 1} is not \`key: value\` — this parser does not guess at a field it cannot read`);
      }
      const k = kv[1]!.trim();
      const v = unquote(kv[2]!.trim());
      const fields = raw[current]!;
      if (k in fields) {
        refuse(code, 'capability manifest shape gate',
          `${label}: capability \`${current}\` sets \`${k}\` twice — a duplicate field is a second intent, and this parser keeps the first, which would hide it`);
      }
      (fields as Record<string, string>)[k] = v;
      continue;
    }

    refuse(code, 'capability manifest shape gate',
      `${label}: capabilities line ${i + 1} is indented ${indent} — this block is two levels deep (a capability, then its fields) and nothing deeper`);
  }

  if (Object.keys(raw).length === 0) return undefined;
  return parseCapabilities(raw, args);
}

/** A YAML comment, stripped. The readers here take one line at a time. */
const stripComment = (line: string): string => line.replace(/\s+#.*$/, '');

/** One layer of quoting, removed. A manifest may write a reason with or without it. */
const unquote = (v: string): string => v.trim().replace(/^["']|["']$/g, '');

/**
 * Resolve the capabilities in force.
 *
 * **Two tiers, and the pack's only power is to narrow** (DECISIONS.md D113, issue #36).
 *
 * The org tier is where a capability is *enabled*: it says what the fleet may do under this
 * operator. A community's own pack may **narrow** that and nothing else. So the resolution is
 * `org -> pack`, and the pack's declaration is in force only when it is strictly narrower than
 * the org's effective shape:
 *
 *   - **narrower** → the pack's shape and the pack's reason are in force, and the provenance says
 *     `pack`. The community is running its own community, and it said why.
 *   - **equal** → **refused.** The org already decided this, so the block is a second copy of a
 *     decision — and a second copy goes stale (D100, the `seat:` lesson). "Narrows nothing" is
 *     the honest refusal, and it leaves the block with exactly one meaning: *I am narrowing this*.
 *   - **wider** → **refused.** A pack may narrow, never widen. This is the same "refuse, never
 *     clamp" rule the floors follow, and it is the whole reason a community cannot hand itself a
 *     power its operator did not enable.
 *
 * **A pack with no org above it is its own top tier**, so there is nothing to narrow past and its
 * declaration is the enabling one — the same way a pack with no `organisation:` line is already
 * its own top tier for the floors.
 */
export function resolveCapabilities(args: {
  org?: PackedOrg | null;
  packCapabilities?: CommunityCapabilities | undefined;
  packKey?: string;
  humanSeats: readonly string[];
}): ResolvedCapabilities {
  const seat = args.humanSeats[0] ?? 'organiser';

  // **Both blocks are re-validated here, not only at the parser.** A pack can be built in memory —
  // the repo supports that explicitly — and an in-memory pack never went through the file parser,
  // so a capability with no `reason:`, or a shape that means "off", would otherwise reach the
  // resolver unchallenged. The parser is the gate for a pack that came from a folder; this is the
  // gate for one that did not, and the two run the same reader so there is one rule.
  const orgBlock = args.org?.capabilities !== undefined
    ? parseCapabilities(args.org.capabilities, { tier: 'org', key: args.org.key })
    : undefined;
  const packBlock = args.packCapabilities !== undefined
    ? parseCapabilities(args.packCapabilities, { tier: 'pack', key: args.packKey ?? 'this pack' })
    : undefined;

  const orgDecl = orgBlock?.human_check;
  const packDecl = packBlock?.human_check;

  if (packDecl !== undefined) {
    const packKey = args.packKey ?? 'this pack';
    const packShape = packDecl.shape ?? DEFAULT_REVIEW_SHAPE;

    // No org above: this pack IS the top tier, so its declaration is the enabling one.
    if (args.org === undefined || args.org === null) {
      return {
        humanCheck: { shape: packShape, seat, reason: packDecl.reason, source: 'pack' },
      };
    }

    // The org's effective shape — what it enables, or the conservative default when it said
    // nothing at all. Absence is not permission: an org that names no capability enables none
    // beyond the runtime's own default.
    const orgShape = orgDecl?.shape ?? DEFAULT_REVIEW_SHAPE;

    if (isNarrower(packShape, orgShape)) {
      return {
        humanCheck: { shape: packShape, seat, reason: packDecl.reason, source: 'pack' },
      };
    }

    if (packShape === orgShape) {
      refuse('pack_invalid', 'capability manifest (DECISIONS.md D113)',
        `pack \`${packKey}\` declares capability \`human_check\` as \`${packShape}\`, which is what org \`${args.org.key}\` already declares — this narrows nothing, and an override that does not narrow is a second copy of a decision (D100), and a second copy goes stale. Remove the block, or narrow it`);
    }

    refuse('pack_invalid', 'capability manifest (DECISIONS.md D113)',
      `pack \`${packKey}\` declares capability \`human_check\` as \`${packShape}\`, which is WIDER than the \`${orgShape}\` org \`${args.org.key}\` enables — a pack may narrow a capability, never widen one. The org enables the shape; the community may only make it narrower`);
  }

  if (!orgDecl) {
    return {
      humanCheck: {
        shape: DEFAULT_REVIEW_SHAPE,
        seat,
        reason: 'no manifest declared a shape — the runtime does not ask, and the human opens the inbox',
        source: 'default',
      },
    };
  }
  return {
    humanCheck: {
      shape: orgDecl.shape ?? DEFAULT_REVIEW_SHAPE,
      // The seat that answers is the community's declared one (section 1.11) — resolved, never
      // written into a second file. The first version of this took a `seat:` from the manifest, and
      // the MCP adapter's own test caught it: rename a community's seat and the manifest's copy went
      // stale, and the refusal was right. That is D100's lesson one layer down.
      seat,
      reason: orgDecl.reason,
      source: 'org',
    },
  };
}

/**
 * Does this shape mean the runtime asks?
 *
 * One function, so the question has one answer in the codebase — the same reason the repo keeps
 * single-sourcing its gates (D28). A `push` somewhere and a `pull` somewhere else would make the
 * shape a decoration.
 */
export function asks(capabilities: ResolvedCapabilities): boolean {
  return capabilities.humanCheck.shape === 'push';
}

/** The source label a capability's provenance row carries. */
export type { SettingSource };
