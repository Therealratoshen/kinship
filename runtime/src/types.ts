/**
 * Domain types for the Kinship control-plane core.
 *
 * Every type here traces to a spec section (spec/GOVERNANCE-SPEC-OUTLINE.md) and carries the
 * section number in its doc comment, so a reviewer can walk type → spec → test without guessing.
 * Erasable-syntax-only TS: this file must run under node's native type stripping (no enums, no
 * parameter properties) — that is what keeps the runtime dependency-free like the validator.
 */

import type { LocaleText } from './locales.ts';

// --- section 1.1 the autonomy ladder -------------------------------------------------------------
/** Per action class, never per agent. Absent from a class map behaves as `never`. */
export type Autonomy = 'draft' | 'opt-in-auto' | 'never';

/** section 1.9.4 / pack skills/event-lifecycle — the only legal phase sequence. */
export const PHASES = [
  'draft', 'scheduled', 'promoting', 't-minus-7', 't-minus-1',
  'running', 'recap', 'report', 'closed',
] as const;
export type Phase = (typeof PHASES)[number];

// --- content + people -----------------------------------------------------------------------
/** Content a card binds to. The hash is the identity; text without its hash is not approvable. */
export interface Revision {
  /**
   * The copy, in the community's declared languages — a map keyed by language code.
   *
   * It was `textId` / `textEn`, and the FIELD NAMES were the decision: this product serves
   * Indonesian communities, written into the shape of every card, every revision hash and every log
   * line. A community in English and Arabic could not be expressed, because the copy had already
   * decided the answer. The map generalises to a third language without another field, and the
   * languages themselves now live in `src/locales.ts` — one source of truth for the pair a pack may
   * declare, the disclosure line, and the copy the runtime writes on its own.
   */
  text: LocaleText;
  hash: string;
}

/** What a card is *about* — an event, a member conversation, a report window. */
export interface Origin {
  kind: string; // 'event' | 'member-thread' | 'report-window' | ...
  id: string;
}

export type Verdict = 'approve' | 'edit' | 'reject';

// --- section 1.5 approval cards ----------------------------------------------------------------------
export interface Card {
  id: string;
  actionClass: string;
  agent: string;
  origin: Origin;
  phase: Phase | null;
  revision: Revision;
  status: 'pending' | 'approved' | 'rejected' | 'stale';
  createdAt: number;
  /** Set when the card exists only because a rule downgraded an auto lane — e.g. member input. */
  forcedBy?: string;
  /** Rejection / edit reason. A verdict without a why is not a verdict (near-miss discipline). */
  why?: string;
  decidedBy?: string;
  decidedAt?: number;
}

/** section 1.5: an approval binds to a revision hash. One approval = one send of *that* content. */
export interface SendAuthorization {
  token: string;
  cardId: string;
  revisionHash: string;
  actionClass: string;
  origin: Origin;
  phase: Phase | null;
  issuedAt: number;
  consumedAt?: number;
}

// --- section 1.8 the grant taxonomy -------------------------------------------------------------------
export type GrantKind = 'allow_once' | 'allow_always';

export interface Grant {
  id: string;
  actionClass: string;
  kind: GrantKind;
  /** The named lane. `allow always` without a named scope is refused (section 1.8). */
  channel?: string;
  scope?: string;
  /** section 2.11: a cross-promotion always-grant must name partner + lane + window. */
  partner?: string;
  window?: { from: number; to: number };
  /** The class-definition hash at grant time — a material template change reverts to draft (section 1.8). */
  templateHash: string;
  grantedAt: number;
  grantedBy: string; // 'organiser' — nothing else can issue a grant (section 2.7)
  revokedAt?: number;
  consumedAt?: number;
}

// --- section 2.9 the member as a subject ----------------------------------------------------------------
export interface Member {
  ref: string;
  tz: string; // IANA — quiet hours are the member's local time, not the organiser's
  registeredAt: number;
}

/**
 * A member's stop. Cross-lane by construction, outside the escalation path, and there is no
 * API that clears it (section 2.9): an opt-out the organiser can re-enable is a mute button, not consent.
 */
export interface SuppressionRow {
  memberRef: string;
  suppressedSince: number;
  source: 'member' | 'organiser'; // precedence member-over-organiser (pack guardrail)
  viaClass?: string;
}

// --- section 1.3 no ghost watchers -------------------------------------------------------------------------
export interface WakeRow {
  id: string;
  purpose: string;
  nextCheckAt: number;
  attempts: number;
  eventId?: string;
  scheduledAt: number;
  /**
   * The action this wake will attempt when it fires (D60).
   *
   * A wake used to be a bare promise — "I will look at this on Thursday" — with nothing on the other
   * end of it, so firing it produced a log line and no work. The runtime could judge a card and
   * schedule a timer, and nothing ever connected the two: the *caller* handed the copy in, one
   * `--text-id` at a time.
   *
   * Binding the action to the row is what makes the timer do something, and it keeps the pack's
   * `event-lifecycle` rule true rather than bending it: the phase moves on "a fired timer with a
   * persisted wake row", and now the row carries the whole promise — the lane, the agent, the phase
   * and the copy — so what fires is what was promised, and the log says so.
   */
  action?: WakeAction;
}

/** The action a scheduled wake attempts when it fires. */
export interface WakeAction {
  actionClass: string;
  agent: string;
  phase: Phase;
  /** The channel this lane is bound to, when it is bound to one. */
  channel?: string;
  /** The copy, in the community's declared languages. */
  text: LocaleText;
}

// --- section 1.6 budgets -------------------------------------------------------------------------------------
export interface BudgetState {
  ceilingIdr: number | null; // null = unset → metered spend refuses (fail closed, section 12-Q9)
  warnRatio: number; // pack default 0.8
  hardStop: boolean;
  spentIdr: number;
  warnedAt?: number;
  stoppedAt?: number;
}

// --- section 2.6 shatter-guard ---------------------------------------------------------------------------------
export interface ShatterRow {
  channel: string;
  trippedAt: number;
  ref: string;
  releasedAt?: number;
}

// --- the event log (section 1.2 audit replay) ---------------------------------------------------------------------
export type FleetEvent =
  | { type: 'MemberRegistered'; member: Member; at: number }
  | { type: 'SuppressionRecorded'; row: SuppressionRow; at: number }
  | { type: 'GrantIssued'; grant: Grant; at: number }
  | { type: 'GrantRevoked'; grantId: string; by: string; at: number }
  | { type: 'GrantConsumed'; grantId: string; commitSeq: number; at: number }
  | { type: 'GrantSuperseded'; grantId: string; reason: string; at: number }
  | { type: 'CardCreated'; card: Card; at: number }
  | { type: 'ReviewRequested'; cardId: string; actionClass: string; seat: string; at: number }
  | { type: 'CardDecided'; cardId: string; verdict: Verdict; by: string; why: string; newRevision?: Revision; at: number }
  | { type: 'AuthorizationIssued'; auth: SendAuthorization; at: number }
  | { type: 'AuthorizationConsumed'; token: string; at: number }
  | {
      type: 'CommitExecuted';
      actionClass: string; agent: string; origin: Origin; phase: Phase | null;
      revisionHash: string; onBehalfOf: string; recipients: string[];
      channel?: string; partner?: string; transport: string;
      grantId?: string; authorizationToken?: string; at: number;
    }
  | { type: 'CommitRefused'; actionClass: string; agent: string; code: string; at: number }
  | { type: 'PhaseEntered'; eventId: string; phase: Phase; at: number }
  | { type: 'PhaseCompleted'; eventId: string; phase: Phase; at: number }
  | { type: 'PhaseOriginClaimed'; claimKey: string; agent: string; at: number }
  | { type: 'EventCheckedOut'; eventId: string; agent: string; at: number }
  | { type: 'WakeScheduled'; row: WakeRow; at: number }
  | { type: 'WakeFired'; wakeId: string; at: number }
  | { type: 'BudgetSet'; eventId: string; ceilingIdr: number | null; warnRatio: number; hardStop: boolean; at: number }
  | { type: 'SpendRecorded'; eventId: string; amountIdr: number; note: string; at: number }
  | { type: 'BudgetWarned'; eventId: string; spentIdr: number; ceilingIdr: number; at: number }
  | { type: 'BudgetStopRaised'; eventId: string; spentIdr: number; ceilingIdr: number; cardId: string; at: number }
  | { type: 'ShatterTripped'; channel: string; ref: string; at: number }
  | { type: 'ShatterReleased'; channel: string; by: string; at: number }
  | { type: 'MemberInputReceived'; inputId: string; memberRef: string; textHash: string; at: number }
  | { type: 'ThreadOpened'; thread: Thread; at: number }
  | { type: 'ThreadAnswered'; threadId: string; by: string; note: string; at: number }
  | { type: 'EscalationRaised'; purpose: string; to: string; cardId: string; at: number };

export type LoggedEvent = FleetEvent & { seq: number };

// --- section 1.7 trust labels (stranger-input containment) ------------------------------------------------------------
export type TrustLabel = 'organiser' | 'fleet' | 'low_trust_review';

/** Anything a stranger wrote arrives wrapped in this. It is data, never instruction (section 2.7). */
export interface QuarantinedInput {
  trust: 'low_trust_review';
  text: string;
  memberRef: string;
  receivedAt: number;
}

/**
 * The audit-log record of a member input: who sent it, when, and the text's hash. The text
 * itself is *not* in the log — the log is member-readable (section 2.3), and member messages in a
 * readable timeline is a privacy failure section 1.9 exists to prevent. The wrapped text lives only
 * in the live QuarantinedInput value and is never persisted.
 */
export interface InputRecord {
  memberRef: string;
  textHash: string;
  receivedAt: number;
}

/**
 * A question the community owes an answer to — a member asked something, and nobody has answered it
 * yet.
 *
 * **This is the community-facing row, and the reason it exists is a gap the inbox named itself.**
 * `inbox.ts` could say how many member inputs arrived and how many produced an undecided card, but
 * **not which message is unanswered** — the input→card link is severed on purpose (section 1.2 / section 1.7). So
 * `standing-engagement`'s promise to "hold the thread" had nothing behind it. A thread is that
 * missing primitive: a debt to a member, with a date on it, tracked as a row so it can be aged and
 * measured against the community's own staffed hours.
 *
 * **What it never holds.** Not the words — the log stores a hash of every member input and never the
 * text (section 2.7), and a thread holds no text either. Not the asker in any read: `memberRef` lives in
 * the log and the state, and every read sweeps it. What it holds instead is a **pointer** — an opaque
 * handle the host can resolve, the way an inbox item is "a pointer, not the payload".
 */
export interface Thread {
  id: string;
  /** The member who asked, when the host knows it. In the log and the state; a READ NEVER PRINTS IT. */
  memberRef: string | null;
  /** An opaque handle the host can resolve — a message id, a link. Never the words themselves. */
  pointer: string | null;
  /** When the question was raised. */
  raisedAt: number;
  /** When it was answered. Absent means open. */
  answeredAt?: number;
  /** Who answered it. */
  answeredBy?: string;
  /** How it was answered. Never empty: an answer with no note is not a record. */
  note?: string;
}

// --- pack shape (parsed .kinship.yaml — see pack.ts) --------------------------------------------------------------
/**
 * One rung of the ladder a community climbs before a member is gone (`DECISIONS.md` D37, applied from
 * `research/COMMUNITY-GOVERNANCE-PATTERNS-2026-10-19.md` section 5). **Declared, never executed**: `by` is a
 * human seat, `via` describes the human act rather than naming a tool, and the final rung names the
 * `appeal`. The runtime parses it so a fork cannot quietly widen it — it does not read it when deciding
 * anything, because a fleet that can sanction is a moderation bot with a governance manual beside it.
 */
export interface SanctionRung {
  rung: string;
  /** The human seat that performs this rung. Never a declared agent role. */
  by: string;
  /** What the member is told at this rung — the difference between a sanction and a disappearance. */
  memberTold: string;
  /** How the rung is carried out, in prose (`host-ui`, `organiser-in-dm`). Not a `channel | action` tool. */
  via: string;
  /** Only meaningful on the last rung, and required there: the way back into the community. */
  appeal?: string;
}

export interface PackedAgent {
  role: string;
  autonomyByClass: Record<string, Autonomy>;
  tools: string[]; // 'channel | action' strings, kept for review; the runtime does not execute tools
  outputs?: string;
}

export interface PackedBudgets {
  llmPerEventIdr: number | null;
  warnAtRatio: number;
  hardStop: boolean;
  queueMax: number;
  maxActionsPerRun: number;
  crossPromoPerEventCap: number | null;
}

export interface PackedGuardrails {
  reportAggregationFloor: number;
  memberMessageCapPer24h: number;
  identityDisclosure: boolean;
  defaultsDeny: boolean;
}

/**
 * The community's coverage window — the hours a human is on duty for it.
 *
 * **Not the member's quiet hours.** FR-5.5 puts those in the member's local time (`members.ts`);
 * this is the community's own staffing promise, and only the community can state it. The two clocks
 * answer different questions and are deliberately not merged — see `src/community.ts`.
 *
 * A discriminated union, because the two modes are not the same shape of claim and pretending they
 * are would make the read lie. A **staffed** window names a zone, the weekdays it covers, and the
 * hours it opens and closes — and every one of those is load-bearing. An **always** community has
 * no window: it is staffed around the clock, so there are no days to name, no hours to open and
 * close, and no shift that can end. It may still name the zone it lives in, and that zone is
 * reported as `null` when the pack did not say — an invented "UTC" would be a claim about a
 * community nobody described.
 */
/**
 * One staffed window: the local weekdays it covers, and the hours it opens and closes.
 *
 * **A community's week may be SPLIT.** One window can only say "these days, these hours", and a split
 * week is not exotic — the UAE's federal government works Monday–Thursday 07:30–15:30 and **Friday
 * 07:30–12:00, a half day**, with **Saturday and Sunday** as the weekend (u.ae and the DGHR "New Weekly
 * Work System" FAQ, read 2026-10-23; effective 1 January 2022; Sharjah's weekend differs again). So does
 * a church, a school, a makerspace with a Saturday session. Reading one window for such a community
 * would say it is on duty on Friday evening and off duty on Saturday morning — both exactly backwards,
 * and a confident number built on the wrong calendar is worse than no number.
 */
export interface CoverageWindow {
  /** Local weekdays this window covers, 0 = Sunday. */
  days: number[];
  /** Minutes from local midnight when the shift opens. */
  opens: number;
  /** Minutes from local midnight when the shift closes. */
  closes: number;
}

export type CommunityCoverage =
  | {
      mode: 'always';
      /** The community's own zone, or `null` when the pack named none. Never consulted. */
      timezone: string | null;
    }
  | {
      mode: 'staffed';
      /** IANA zone. The window is a statement about this zone's local calendar, never a stored offset. */
      timezone: string;
      /**
       * The staffed windows, **at least one**. A community with a split week declares more than one —
       * and the windows are the community's own calendar, not the runtime's: two emirates in one country
       * have different weekends, and nothing in the code has an opinion about either.
       */
      windows: CoverageWindow[];
    };

export interface Packed {
  schema: string;
  key: string;
  locale: string[];
  agents: Record<string, PackedAgent>;
  guardrails: PackedGuardrails;
  budgets: PackedBudgets;
  needs: string[];
  /**
   * The community's coverage window, when the pack declares one. `undefined` means the pack says
   * nothing about staffing, and the reads report that as an unknown duty state rather than as
   * "always on duty" — an absent window is not a promise.
   */
  coverage?: CommunityCoverage;
  /**
   * How this community is run. `undefined` means the pack said nothing, and the conservative
   * default applies — absence is not permission, and a fork that deleted the block did not decide to
   * be open.
   */
  posture?: CommunityPosture;
  /** The org tier this pack names, if any. `null` means the pack is its own top tier (section 1.7). */
  organisation?: string | null;
  /** The manifest `loadPack` resolved for that key — present only when `organisation` is set. */
  org?: PackedOrg;
  /**
   * The guardrail keys the pack file actually spelled out. Absence of a key is not a choice, so it
   * inherits the org's floor; a key the file *did* write is a decision, and the org may only refuse
   * it (see `settings.ts` — refuse, never clamp). Optional: a pack built in memory is treated as
   * having decided everything it carries, which is the conservative reading.
   */
  declared?: string[];
  /**
   * The community's sanction rungs, in order, when the pack wrote them down. `undefined` means the pack
   * declared no ladder — which is legal (a community that does not moderate has no rungs to name) and is
   * deliberately not a default ladder the runtime supplied on its behalf.
   */
  sanctionLadder?: SanctionRung[];
  /**
   * The capabilities this community NARROWS, when the pack wrote them down.
   *
   * `undefined` means the pack declared no override at all, and the org's declaration stands
   * untouched. It is deliberately not an empty override: an absent block is not a decision, so it
   * inherits rather than overriding.
   *
   * **A pack may only narrow.** The org tier enables a capability; this block may make it
   * narrower and nothing else (DECISIONS.md D113, spec section 1.12). A pack with no
   * `organisation:` line is its own top tier, and there its declaration is the enabling one.
   */
  capabilities?: CommunityCapabilities;
}

/** Answers to the `needs:` gate — supplied by the organiser at boot, never invented (section 2.7). */
export type NeedAnswers = Record<string, string>;

// --- the organisation tier (PRD FR-1.18, DECISIONS.md D35/D36) ------------------------------------

// --- the capability manifest (DECISIONS.md D103) -------------------------------------------------------

/**
 * How the human is reached when a card is waiting.
 *
 * - `push` — the runtime **asks**: every card that needs a human also writes a `ReviewRequested`
 *   event, which is the row a host turns into a notification ("a message is waiting for you").
 * - `pull` — the runtime does not ask. The card is in the human's inbox and stays there until the
 *   human opens it.
 *
 * There is no third value on purpose. "Both" was in the question as asked, and it is not a runtime
 * distinction: the inbox exists under `pull` too, so `both` is `push` plus a host that also shows
 * the inbox — which is the host's business, not a third behaviour of the runtime.
 */
export type ReviewShape = 'push' | 'pull';

/**
 * One capability, as a community declares it.
 *
 * **The reason is required, and that is the point of the shape.** A capability that changes what
 * the fleet may do has to say why — an operator who turns a power on without justifying it has not
 * configured anything, they have just widened the blast radius.
 *
 * **There is no `seat` field, and that is a correction rather than an omission.** The first version
 * of this type carried one, and the MCP adapter's own test suite broke the moment a community
 * renamed its seat: the manifest would name one seat while `human_seats` named another, and the
 * refusal was correct. That is D100's lesson arriving one layer down — *the seat is resolved, not
 * typed* — and a seat written in a second file is a seat that drifts. **The seat that answers for a
 * capability is the community's declared seat set** (section 1.11), the same set every other
 * human-only act consults, and the log records which seat answered.
 */
export interface CapabilityDeclaration {
  /** The shape of the human check. Only `human_check` has one today. */
  shape?: ReviewShape;
  /** Why this community runs it this way. */
  reason: string;
}

/** The capabilities a community declared, by name. */
export type CommunityCapabilities = Record<string, CapabilityDeclaration>;

/** One capability, resolved: what is in force, and which tier put it there. */
export interface ResolvedCapability {
  shape: ReviewShape;
  seat: string;
  reason: string;
  source: SettingSource;
}

/**
 * The capabilities in force.
 *
 * **The vocabulary grows only with enforcement.** A capability the runtime cannot act on is a
 * setting that lies, and this repo has recorded that failure three times (D24, D28, D29) — so a
 * capability that lands here must change what the runtime *does*, not what a file says about it.
 */
export interface ResolvedCapabilities {
  /**
   * The human check.
   *
   * Its **shape** is configurable; its **existence** is not. A community may choose to be pulled or
   * pushed, and it may not choose to have no check at all — there is no `off` value, and writing one
   * is refused with that reason (DECISIONS.md D103).
   */
  humanCheck: ResolvedCapability;
}
/**
 * A parsed, shape-checked `orgs/<key>.yaml`: the manifest above the pack. A pack is one community;
 * an org is the operator who runs several of them and does not want their member protections to
 * depend on which folder a fork started from. `floors` holds only the keys the file names — an org
 * holds what it declares, no more.
 */
/**
 * How this community is run — its operating posture.
 *
 * **There is no country table.** The runtime does not know that one country tolerates more nudging
 * than another, and this type does not teach it: a `country → posture` lookup would be a stereotype
 * baked into code, and worse, it would be a rule **nobody in that community chose**. The only
 * authority on a community's manners is the community. So the community declares its posture and the
 * runtime holds the fleet to it — and a pack in one place and a pack in another may declare different
 * postures, because that is the *community's* call, not the runtime's.
 *
 * Two axes, because every axis has to gate something concrete or it is a decoration:
 *
 *  - **`contact`** — may the fleet approach a member who did not ask? `never` (no 1:1 member message
 *    at all), `asked_only` (1:1 only to a member who has spoken to the community or has an open
 *    question), `open` (anyone, still subject to the per-24h cap, quiet hours and suppression). This
 *    is the "people here tolerate being nudged" / "people here do not" axis, and it is about PEOPLE.
 *  - **`openness`** — is the community discoverable, and may the fleet post publicly? `closed` refuses
 *    `commit.channel-post` outright; `open` allows it, still at the class's own autonomy level. This
 *    is the "some accounts should be private" axis.
 *
 * **The direction of resolution is the same as everywhere else: a pack may only be STRICTER than its
 * org.** A pack that tries to be looser is refused, not clamped (spec section 1.10, "refuse, never clamp").
 */
export interface CommunityPosture {
  /** How the fleet may approach a member who did not ask. `never` · `asked_only` · `open`. */
  contact: 'never' | 'asked_only' | 'open';
  /** Whether the community is discoverable and the fleet may post publicly. `closed` · `open`. */
  openness: 'closed' | 'open';
}

/** The posture in force when neither file declares one: absence is not permission. */
export const DEFAULT_POSTURE: CommunityPosture = { contact: 'asked_only', openness: 'closed' };

export interface PackedOrg {
  schema: string; // 'kinship-org/v1'
  key: string;
  name?: string;
  /** The closed set of names the runtime accepts as the human in section 2.7. Exactly one while section 12-Q12 stands. */
  humanSeats: string[];
  /** Roles the org recognises, for reporting. Not a whitelist: a community may add an agent. */
  agentRoles: string[];
  floors: Partial<PackedGuardrails>;
  /** Per action class, exact keys only, and never `never` — absence is the pack's to declare. */
  autonomyCeiling: Record<string, Autonomy>;
  /**
   * The capabilities this operator runs — what the fleet is allowed to do. Optional: an org that
   * declares none runs the runtime's conservative defaults, and the conservative default for the
   * human check is `pull` (the runtime asks nobody until a manifest says otherwise).
   */
  capabilities?: CommunityCapabilities;
  /**
   * The operator's most-PERMISSIVE posture for the communities under this org. A pack may be
   * stricter; a pack that tries to be looser is refused, not clamped.
   */
  posture?: CommunityPosture;
}

/** Which file the effective value came from. `default` means neither file named it. */
export type SettingSource = 'pack' | 'org' | 'default';

/** One row of "who set this, and what it beat" — section 1.2 says why is part of the product. */
export interface ProvenanceRow {
  key: string;
  tier: 'guardrail' | 'seat' | 'ceiling' | 'posture' | 'capability';
  effective: string | number | boolean;
  source: SettingSource;
  note: string;
}

/** The output of resolution: the values enforcement actually reads, plus their provenance. */
export interface ResolvedSettings {
  orgKey: string | null;
  packKey: string;
  guardrails: PackedGuardrails;
  humanSeats: string[];
  agentRoles: string[];
  autonomyCeiling: Record<string, Autonomy>;
  /** The operating posture in force — how this community is run (see CommunityPosture). */
  posture: CommunityPosture;
  /** The capabilities in force — what the fleet is allowed to do (see ResolvedCapabilities). */
  capabilities: ResolvedCapabilities;
  provenance: ProvenanceRow[];
  limits: string[];
}

/**
 * The context every domain operation runs in. `commit` is append + apply — the only way state
 * changes — so live runs and replays traverse the identical reducer (section 1.2).
 *
 * `settings` is the resolved tier stack, built once at construction. Enforcement reads *this* and
 * never `pack.guardrails` directly: two read paths to one number is how a fork ends up with a
 * reported protection it does not have.
 */
export interface Ctx {
  state: FleetState;
  commit: (e: FleetEvent) => void;
  now: () => number;
  /** Test-only hook from the harness — not part of the domain contract. */
  /** The clock seam (spec section 2.7 / HOST-CONTRACT seam 2). Optional because the engine advances its own clock; a host that owns one supplies it. */
  advance?: (ms: number) => void;
  pack: Packed;
  answers: NeedAnswers;
  settings: ResolvedSettings;
}

// --- state -------------------------------------------------------------------------------------------------------
export interface EventPhaseState {
  current: Phase | null;
  completed: Set<Phase>;
}

export interface FleetState {
  seq: number;
  members: Map<string, Member>;
  suppressions: Map<string, SuppressionRow>;
  grants: Map<string, Grant>;
  cards: Map<string, Card>;
  authorizations: Map<string, SendAuthorization>;
  phases: Map<string, EventPhaseState>;
  /** `${eventId}|${originKind}|${originId}|${phase}` — single-active-per-origin (section 1.9.4). */
  phaseClaims: Set<string>;
  checkouts: Map<string, string>; // eventId -> agent
  wakes: Map<string, WakeRow>;
  budgets: Map<string, BudgetState>;
  shatter: Map<string, ShatterRow>;
  /** memberRef -> commit timestamps, for the 24h cap (section 2.9 / FR-5.5). */
  commitsByMember: Map<string, number[]>;
  /** Cross-promotion sends per event lifecycle (section 2.11 cap). */
  crossPromoByEvent: Map<string, number>;
  /** Arrival metadata for member inputs — text hash only, never the text (see InputRecord). */
  inputs: Map<string, InputRecord>;
  /** Open and answered questions — a community's debts to its members (see Thread). */
  threads: Map<string, Thread>;
  cardCount: number;
  grantCount: number;
  events: LoggedEvent[];
}
