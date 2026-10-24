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
function unknownCapability(orgKey: string, name: string): never {
  refuse('org_invalid', 'capability manifest (DECISIONS.md D103)',
    `org \`${orgKey}\` declares a capability \`${name}\`, which this runtime does not have (${CAPABILITY_NAMES.join(', ')}) — an unknown capability is refused rather than ignored, because a name this runtime cannot act on would be a setting that lies about what the fleet may do`);
}

/**
 * Parse and shape-check the capability block of an organisation manifest.
 *
 * Every failure is `org_invalid`, and every message names the org — the same rule the rest of the
 * org parser follows, for the same reason: "which one failed" has to be in the first line.
 */
export function parseCapabilities(
  raw: Record<string, { shape?: string; reason?: string }>,
  args: { orgKey: string },
): CommunityCapabilities {
  const out: CommunityCapabilities = {};
  for (const [name, fields] of Object.entries(raw)) {
    if (!CAPABILITY_NAMES.includes(name)) unknownCapability(args.orgKey, name);

    // An unknown field is refused, not ignored. A field this runtime does not read is a setting
    // that lies — and the first version of this manifest carried a `seat:` that the runtime then
    // resolved elsewhere, which is exactly the kind of second copy of a fact that goes stale.
    const unknown = Object.keys(fields).filter((k) => k !== 'shape' && k !== 'reason');
    if (unknown.length) {
      refuse('org_invalid', 'capability manifest (DECISIONS.md D103)',
        `org \`${args.orgKey}\` gives capability \`${name}\` the field${unknown.length > 1 ? 's' : ''} ${unknown.map((k) => `\`${k}\``).join(', ')}, which this runtime does not read — a field nothing reads is a setting that lies, and the seat that answers is resolved from the community's declared seat set rather than written here`);
    }

    const shape = fields.shape;
    if (shape === undefined) {
      refuse('org_invalid', 'capability manifest (DECISIONS.md D103)',
        `org \`${args.orgKey}\` declares capability \`${name}\` with no \`shape:\` — a capability that does not say how it behaves is a setting with no behaviour`);
    }
    if (DISABLING_WORDS.has(shape.trim().toLowerCase())) {
      refuse('org_invalid', 'capability manifest (DECISIONS.md D103)',
        `org \`${args.orgKey}\` sets capability \`${name}\` to \`${shape}\` — **the human check's existence is a floor, not a setting**: there is no off state, because a community that can switch the check off has not configured a check. Its *shape* (\`push\`, \`pull\`) is configurable; its existence is not`);
    }
    if (!REVIEW_SHAPES.includes(shape as ReviewShape)) {
      refuse('org_invalid', 'capability manifest (DECISIONS.md D103)',
        `org \`${args.orgKey}\` sets capability \`${name}\` to \`${shape}\`, which is not a shape this runtime has (${REVIEW_SHAPES.join(', ')})`);
    }

    const reason = (fields.reason ?? '').trim();
    if (!reason) {
      refuse('org_invalid', 'capability manifest (DECISIONS.md D103)',
        `org \`${args.orgKey}\` declares capability \`${name}\` with no \`reason:\` — "we turned this on" is not a decision, and a decision nobody can read later is not a decision`);
    }

    out[name] = { shape: shape as ReviewShape, reason };
  }
  return out;
}

/**
 * Resolve the capabilities in force.
 *
 * **The org tier only, in v0.** The org manifest is the tier that already exists for exactly this
 * job — an operator who runs several communities stating once what the fleet may do — so the
 * capability lands there first. A community's own pack-level override is a later slice: the pack
 * format is validated by 62 rules and a JSON schema, and a capability that arrives half-wired
 * through a validator that does not know it is worse than one that arrives late.
 */
export function resolveCapabilities(args: {
  org?: PackedOrg | null;
  humanSeats: readonly string[];
}): ResolvedCapabilities {
  const declared = args.org?.capabilities?.human_check;
  if (!declared) {
    return {
      humanCheck: {
        shape: DEFAULT_REVIEW_SHAPE,
        seat: args.humanSeats[0] ?? 'organiser',
        reason: 'no manifest declared a shape — the runtime does not ask, and the human opens the inbox',
        source: 'default',
      },
    };
  }
  return {
    humanCheck: {
      shape: declared.shape ?? DEFAULT_REVIEW_SHAPE,
      // The seat that answers is the community's declared one (section 1.11) — resolved, never
      // written into a second file. The first version of this took a `seat:` from the manifest, and
      // the MCP adapter's own test caught it: rename a community's seat and the manifest's copy went
      // stale, and the refusal was right. That is D100's lesson one layer down.
      seat: args.humanSeats[0] ?? 'organiser',
      reason: declared.reason,
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
