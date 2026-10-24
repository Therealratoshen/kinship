/**
 * settings.ts — resolution across tiers: org → pack → (event), strictest wins, refuse never clamp.
 *
 * The naive version picks the strictest value and moves on. That is a silent clamp, and a silent
 * clamp is the worst thing a central tier can do to a community: the organiser edits
 * `member_message_cap_per_24h` to 20, the system sends 4, and nothing says so. The number in the
 * file and the number in the world disagree — the failure class this repo already refuses three
 * times over (D15 fork packs, D28 single-sourced gates, D29 the rule that was only a comment).
 *
 * So the rule splits the org tier's powers in two, and the split is the whole design:
 *
 *   - a value the pack **declared** may only be equal or stricter — weaker refuses `pack_invalid`;
 *   - a value the pack **omitted** inherits the org's floor, and provenance says `org`;
 *   - an `autonomy_ceiling` genuinely narrows, because §1.7 already does exactly that, and it may
 *     not widen, and may not say `never` (invariant #1: absence belongs to the pack).
 *
 * Which means: **an org can never change a community's number. It can refuse the community, or fill
 * a blank the community left.** That is what keeps a forkable, self-hosted thing from becoming a
 * hosted product with extra steps — and it is why `Packed.declared` exists instead of being derived.
 *
 * Direction is per key, not global: a *lower* message cap is stricter for the member, a *higher*
 * aggregation floor is stricter for the member. One min/max rule for both would let a fork write
 * `report_aggregation_floor: 1` and call it caution while sending a sponsor PDF that names two
 * people.
 *
 * So each key carries its own `strictest(a, b)` — min, max, or OR — and every branch below is derived
 * from one comparison: `strictest(pack, org) !== pack` means the pack is the weaker side. That single
 * expression is what makes the four directions safe to hold in one table; a `kind === 'boolean'`
 * special case would be the place where a direction flips unnoticed.
 */
import { refuse } from './errors.ts';
import { DEFAULT_HUMAN_SEATS } from './roles.ts';
import { DEFAULT_POSTURE } from './types.ts';
import type {
  Autonomy, CommunityPosture, Ctx, FleetState, Packed, PackedGuardrails, PackedOrg, ProvenanceRow, ResolvedSettings, SettingSource,
} from './types.ts';

/** The three tiers this function knows about. `event` is named in `limits`, never resolved. */
export interface ResolveSettingsArgs {
  pack: Packed;
  org?: PackedOrg | null;
}

/** The guardrail keys, their floor names as the files spell them, and what "stricter" means. */
interface GuardrailKey {
  key: string; // the provenance row name
  floor: string; // the name in a `guardrails:` / `floors:` block
  field: keyof PackedGuardrails;
  rule: string;
  direction: string;
  strictest: (a: number | boolean, b: number | boolean) => number | boolean;
}

const KEYS: readonly GuardrailKey[] = [
  {
    key: 'member_message_cap_per_24h', floor: 'member_message_cap_per_24h', field: 'memberMessageCapPer24h',
    rule: 'spec §2.9 / FR-5.5', direction: 'lower is stricter',
    strictest: (a, b) => Math.min(a as number, b as number),
  },
  {
    key: 'report_aggregation_floor', floor: 'report_aggregation_floor', field: 'reportAggregationFloor',
    rule: 'spec §2.9 / FR-5.3', direction: 'higher is stricter',
    strictest: (a, b) => Math.max(a as number, b as number),
  },
  {
    key: 'identity_disclosure', floor: 'identity_disclosure', field: 'identityDisclosure',
    rule: 'spec §2.8', direction: 'required is stricter',
    // true is the stricter side, so the strictest pair is a disjunction. `a && b` here would read as
    // "both must agree", which is not a direction: a pack that turned disclosure off under an org
    // that requires it would be clamped up silently instead of refused.
    strictest: (a, b) => Boolean(a || b),
  },
  {
    key: 'defaults_deny', floor: 'defaults', field: 'defaultsDeny',
    rule: 'spec §1.1 / invariant #1', direction: 'deny is stricter',
    strictest: (a, b) => Boolean(a || b),
  },
];

/** A pack built in memory has no file to consult, so it is read as having decided everything it carries. */
const isDeclared = (pack: Packed, floor: string): boolean =>
  pack.declared === undefined || pack.declared.includes(floor);

const LIMITS: readonly string[] = [
  'The event tier is not built. The resolution order the spec names is org -> pack -> event, and the third tier has no shape, no caller, and no rule: nothing in the runtime supplies an event-scoped setting, so an `event:` parameter here would be a claim rather than a setting. A per-event override is a dated decision (DECISIONS.md) before it is a field.',
  'The org tier cannot change a value a pack declared — it can only refuse the pack or fill a blank the pack left. There is no clamp on this path, so an effective number always appears in a file: either the pack\'s, or the org\'s with provenance `org`.',
  'Autonomy ceilings match exact class names. There is no wildcard, because the ladder has none and a glob would widen reach without anyone writing the class down (§1.1).',
  '`agent_roles` is reporting, not a whitelist: an org lists the roles it recognises so a snapshot can name them, and a community may add an agent without an org\'s permission. The one hard rule is that a role name may not be a human seat.',
  'Budgets are not floors. `llm_per_event_idr`, `queue_max` and `max_actions_per_run` stay the pack\'s: spend and queue depth are the organiser\'s own cost, not a promise to a member, and an org that can force a volunteer to spend is a different product.',
];

/**
 * Resolve the tier stack. Returns the values enforcement reads, and the provenance that explains
 * each one. Refuses when a pack is weaker than an org floor, or when a pack agent is named after a
 * human seat.
 */
export function resolveSettings(args: ResolveSettingsArgs): ResolvedSettings {
  const { pack } = args;
  const org = args.org ?? pack.org ?? null;

  const guardrails = { ...pack.guardrails };
  const provenance: ProvenanceRow[] = [];

  for (const k of KEYS) {
    const packValue = pack.guardrails[k.field] as number | boolean;
    const declared = isDeclared(pack, k.floor);
    const orgValue = org?.floors[k.field] as number | boolean | undefined;
    let effective = packValue;
    let source: SettingSource = declared ? 'pack' : 'default';
    const notes: string[] = [k.direction, k.rule];

    if (orgValue !== undefined && org) {
      if (declared) {
        // Refuse, never clamp: the pack wrote a number, the org holds a floor, and a fork that
        // weakens a member protection is not allowed to boot into a "fine, we'll ignore it".
        if (k.strictest(packValue, orgValue) !== packValue) {
          refuse('pack_invalid', 'org floor (spec §1.7 / PRD FR-1.18)',
            `pack \`${pack.key}\` sets \`${k.floor}\` to ${String(packValue)}, weaker than org \`${org.key}\`'s floor of ${String(orgValue)} — the pack is refused, not clamped, because a value silently rounded down is a file that lies about the system it configures`);
        }
        notes.push(`stricter than org \`${org.key}\`'s floor of ${String(orgValue)}`);
      } else {
        // Silence is not a decision, so the org's floor can supply it — and only when it is the
        // stricter of the two, so a parser default is never overridden by a looser org.
        effective = k.strictest(packValue, orgValue);
        if (effective !== packValue) source = 'org';
        notes.push(`the pack file never set \`${k.floor}\`; org \`${org.key}\`'s floor of ${String(orgValue)} applies${source === 'org' ? '' : ' (the default is already stricter)'}`);
      }
    }

    (guardrails as Record<string, unknown>)[k.field] = effective;
    provenance.push({ key: k.key, tier: 'guardrail', effective, source, note: notes.join(' · ') });
  }

  const humanSeats = org?.humanSeats ?? [...DEFAULT_HUMAN_SEATS];
  const seatSource: SettingSource = org ? 'org' : 'default';
  for (const seat of humanSeats) {
    provenance.push({
      key: `human_seat:${seat}`, tier: 'seat', effective: seat, source: seatSource,
      note: org ? `declared by org \`${org.key}\` — one seat only while PRD §12-Q12 is unanswered` : 'no org tier: the single seat the runtime has always gated on',
    });
  }

  // The seat set is closed, so a pack cannot hand itself a human act by naming an agent `organiser`.
  const squatters = Object.keys(pack.agents).filter((role) => humanSeats.includes(role));
  if (squatters.length) {
    refuse('pack_invalid', 'seat collision (spec §2.7 / PRD FR-1.18)',
      `pack \`${pack.key}\` declares agent(s) ${squatters.map((r) => `\`${r}\``).join(', ')} whose name is a human seat held by ${org ? `org \`${org.key}\`` : 'the runtime'} — decideCard, issueGrant, revokeGrant and releaseShatter accept a seat, so an agent with that name would hold the veto over its own output`);
  }

  // The sanction ladder (D37) — a community's own rungs, read once here. Two properties of it are not
  // the community's to author: WHO performs a rung, and whether the bottom of the ladder has a way
  // back. A rung an agent performs puts a sanction on the same side of §2.7 as a send (the fleet flags,
  // the human acts); a last rung with no appeal is the dead end every declining forum is remembered by,
  // and a pack that writes "removal" without writing "and here is how you come back" has not finished
  // the thought it started.
  const ladder = pack.sanctionLadder ?? [];
  if (ladder.length === 1) {
    refuse('pack_invalid', 'sanction ladder (DECISIONS.md D37)',
      `pack \`${pack.key}\` declares a sanction ladder of one rung (\`${ladder[0]!.rung}\`) — one step is a binary, not a graduated response, and the ladder exists because a commons that escalates in visible stages is the thing that survives its own disputes (research/COMMUNITY-GOVERNANCE-PATTERNS-2026-10-19.md §1). Two rungs, or none`);
  }
  // The capabilities the fleet actually holds, normalised so `telegram|send` and `telegram | send` are
  // one string. A rung that matches one has stopped describing a human act.
  const norm = (t: string): string => t.replace(/\s+/g, ' ').trim().toLowerCase();
  const toolHolders = new Map<string, string>();
  for (const [role, agent] of Object.entries(pack.agents)) {
    for (const tool of agent.tools) if (!toolHolders.has(norm(tool))) toolHolders.set(norm(tool), role);
  }
  ladder.forEach((rung, i) => {
    if (!rung.memberTold) {
      refuse('pack_invalid', 'sanction ladder (DECISIONS.md D37 / spec §2.9.4)',
        `pack \`${pack.key}\` sanctions at rung \`${rung.rung}\` without saying what the member is told — §2.9.4 already promises a flagged member is told, after the fact, with a reason, so a rung with no \`member_told\` is a sanction delivered in the dark`);
    }
    if (!humanSeats.includes(rung.by)) {
      refuse('pack_invalid', 'sanction ladder (DECISIONS.md D37 / spec §2.7)',
        `pack \`${pack.key}\` gives sanction rung \`${rung.rung}\` to \`${rung.by || '(empty)'}\`, which is not a human seat (${humanSeats.join(', ')}) — the fleet flags and a person sanctions, so a rung that names an agent is refused rather than quietly re-pointed at the organiser`);
    }
    const holder = toolHolders.get(norm(rung.via));
    if (holder !== undefined) {
      refuse('pack_invalid', 'sanction ladder (DECISIONS.md D37 / invariant #1)',
        `pack \`${pack.key}\` sanctions at rung \`${rung.rung}\` by \`${rung.via}\`, which agent \`${holder}\` declares as a tool — a rung the fleet can execute is not a ladder, it is a moderation lane wearing a document, and invariant #1 says the capability is removed from the tool list rather than denied at runtime`);
    }
    if (i === ladder.length - 1 && !rung.appeal) {
      refuse('pack_invalid', 'sanction ladder (DECISIONS.md D37 / spec §2.9.4)',
        `pack \`${pack.key}\` ends its sanction ladder at \`${rung.rung}\` and names no appeal — the last rung is exactly the one a member needs a route back from, and the pack's own §2.9.4 says a flag re-enters the organiser queue rather than closing the door`);
    }
  });

  const autonomyCeiling: Record<string, Autonomy> = { ...(org?.autonomyCeiling ?? {}) };
  for (const [cls, level] of Object.entries(autonomyCeiling)) {
    provenance.push({
      key: `ceiling:${cls}`, tier: 'ceiling', effective: level, source: 'org',
      note: `org \`${org?.key ?? '?'}\` holds \`${cls}\` at or below ${level}; it cannot raise it, and cannot make it absent (§1.1)`,
    });
  }

  // The community's operating posture — resolved org → pack, and the pack may only be STRICTER.
  //
  // The org's value is its most-PERMISSIVE posture: an operator running a closed professional
  // community sets the floor to `never`/`closed` and every pack under it inherits that. A pack that
  // tries to be looser is REFUSED, not clamped — the same rule the guardrails follow (spec §1.10,
  // "refuse, never clamp"), because a value silently rounded toward the org is a file that lies about
  // the system it configures.
  const CONTACT_ORDER: Record<CommunityPosture['contact'], number> = { never: 0, asked_only: 1, open: 2 };
  const OPENNESS_ORDER: Record<CommunityPosture['openness'], number> = { closed: 0, open: 1 };
  const packPosture = pack.posture;
  const orgPosture = org?.posture;

  /** Resolve one axis: the pack's value, the org's floor, and the conservative default. */
  const resolveAxis = <K extends 'contact' | 'openness'>(
    axis: K,
    packValue: CommunityPosture[K] | undefined,
    orgValue: CommunityPosture[K] | undefined,
    order: Record<CommunityPosture[K], number>,
  ): { effective: CommunityPosture[K]; source: SettingSource; note: string } => {
    if (orgValue !== undefined && org) {
      if (packValue !== undefined) {
        if (order[packValue] > order[orgValue]) {
          refuse('pack_invalid', 'org floor (spec §1.10 / PRD FR-1.18)',
            `pack \`${pack.key}\` sets \`posture.${axis}\` to \`${packValue}\`, looser than org \`${org.key}\`'s floor of \`${orgValue}\` — the pack is refused, not clamped, because a posture silently rounded toward the org is a file that lies about the system it configures`);
        }
        return {
          effective: packValue,
          source: 'pack',
          note: `declared by pack \`${pack.key}\` — stricter than or equal to org \`${org.key}\`'s floor of \`${orgValue}\``,
        };
      }
      const effective = order[orgValue] < order[DEFAULT_POSTURE[axis]] ? orgValue : DEFAULT_POSTURE[axis];
      return {
        effective,
        source: effective !== DEFAULT_POSTURE[axis] ? 'org' : 'default',
        note: `the pack file never set \`posture.${axis}\`; org \`${org.key}\`'s floor of \`${orgValue}\` applies${effective !== DEFAULT_POSTURE[axis] ? '' : ' (the default is already stricter)'}`,
      };
    }
    if (packValue !== undefined) {
      return { effective: packValue, source: 'pack', note: `declared by pack \`${pack.key}\` — no org tier names a floor for this axis` };
    }
    return {
      effective: DEFAULT_POSTURE[axis],
      source: 'default',
      note: 'neither file set it — absence is not permission, so the conservative default applies',
    };
  };

  const contact = resolveAxis('contact', packPosture?.contact, orgPosture?.contact, CONTACT_ORDER);
  const openness = resolveAxis('openness', packPosture?.openness, orgPosture?.openness, OPENNESS_ORDER);
  const posture: CommunityPosture = { contact: contact.effective, openness: openness.effective };
  provenance.push({ key: 'posture:contact', tier: 'posture', effective: contact.effective, source: contact.source, note: contact.note });
  provenance.push({ key: 'posture:openness', tier: 'posture', effective: openness.effective, source: openness.source, note: openness.note });

  return {
    orgKey: org?.key ?? null,
    packKey: pack.key,
    guardrails,
    humanSeats,
    agentRoles: org ? [...org.agentRoles] : Object.keys(pack.agents),
    autonomyCeiling,
    posture,
    provenance,
    limits: [...LIMITS],
  };
}

/** The one read path for a protection value. Enforcement never touches `pack.guardrails`. */
export function effectiveGuardrails(ctx: Ctx): PackedGuardrails {
  return ctx.settings.guardrails;
}

/** The org's ceiling for a class, if it names one. Exact keys only — there is no wildcard. */
export function ceilingFor(settings: ResolvedSettings, actionClass: string): Autonomy | undefined {
  return settings.autonomyCeiling[actionClass];
}

/**
 * The settings artefact — the third read side (after `health()` and `inbox()`), and the one that
 * answers a question the other two cannot: not "what condition is this in" or "what is waiting on
 * me", but **"what is actually in force, and which file put it there."** An organiser running three
 * packs needs that per pack, and a member-protection claim without provenance is unverifiable.
 *
 * Same contract as its siblings, each half checked by a test: a pure fold of log + tier stack, it
 * appends nothing, replays identically, and dates itself.
 */
export interface SettingsReport {
  at: number;
  derivedFromSeq: number;
  orgKey: string | null;
  packKey: string;
  /** The tiers that took part in this resolution, in the order applied. */
  tiers: string[];
  humanSeats: string[];
  agentRoles: string[];
  guardrails: PackedGuardrails;
  autonomyCeiling: Record<string, Autonomy>;
  /** The operating posture in force — how this community is run (see CommunityPosture). */
  posture: CommunityPosture;
  provenance: ProvenanceRow[];
  limits: string[];
}

export function deriveSettings(state: FleetState, settings: ResolvedSettings, now: number): SettingsReport {
  return {
    at: now,
    derivedFromSeq: state.seq,
    orgKey: settings.orgKey,
    packKey: settings.packKey,
    tiers: [...(settings.orgKey !== null ? ['org'] : []), 'pack'],
    humanSeats: [...settings.humanSeats],
    agentRoles: [...settings.agentRoles],
    guardrails: { ...settings.guardrails },
    autonomyCeiling: { ...settings.autonomyCeiling },
    posture: { ...settings.posture },
    provenance: settings.provenance.map((p) => ({ ...p })),
    limits: [...settings.limits],
  };
}
