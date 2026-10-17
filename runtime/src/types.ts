/**
 * Domain types for the Kinship control-plane core.
 *
 * Every type here traces to a spec section (spec/GOVERNANCE-SPEC-OUTLINE.md) and carries the
 * section number in its doc comment, so a reviewer can walk type → spec → test without guessing.
 * Erasable-syntax-only TS: this file must run under node's native type stripping (no enums, no
 * parameter properties) — that is what keeps the runtime dependency-free like the validator.
 */

// --- §1.1 the autonomy ladder -------------------------------------------------------------
/** Per action class, never per agent. Absent from a class map behaves as `never`. */
export type Autonomy = 'draft' | 'opt-in-auto' | 'never';

/** §1.9.4 / pack skills/event-lifecycle — the only legal phase sequence. */
export const PHASES = [
  'draft', 'scheduled', 'promoting', 't-minus-7', 't-minus-1',
  'running', 'recap', 'report', 'closed',
] as const;
export type Phase = (typeof PHASES)[number];

// --- content + people -----------------------------------------------------------------------
/** Content a card binds to. The hash is the identity; text without its hash is not approvable. */
export interface Revision {
  textId: string; // Indonesian — the primary language is labelled first (pack locale: [id, en])
  textEn: string;
  hash: string;
}

/** What a card is *about* — an event, a member conversation, a report window. */
export interface Origin {
  kind: string; // 'event' | 'member-thread' | 'report-window' | ...
  id: string;
}

export type Verdict = 'approve' | 'edit' | 'reject';

// --- §1.5 approval cards ----------------------------------------------------------------------
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

/** §1.5: an approval binds to a revision hash. One approval = one send of *that* content. */
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

// --- §1.8 the grant taxonomy -------------------------------------------------------------------
export type GrantKind = 'allow_once' | 'allow_always';

export interface Grant {
  id: string;
  actionClass: string;
  kind: GrantKind;
  /** The named lane. `allow always` without a named scope is refused (§1.8). */
  channel?: string;
  scope?: string;
  /** §2.11: a cross-promotion always-grant must name partner + lane + window. */
  partner?: string;
  window?: { from: number; to: number };
  /** The class-definition hash at grant time — a material template change reverts to draft (§1.8). */
  templateHash: string;
  grantedAt: number;
  grantedBy: string; // 'organiser' — nothing else can issue a grant (§2.7)
  revokedAt?: number;
  consumedAt?: number;
}

// --- §2.9 the member as a subject ----------------------------------------------------------------
export interface Member {
  ref: string;
  tz: string; // IANA — quiet hours are the member's local time, not the organiser's
  registeredAt: number;
}

/**
 * A member's stop. Cross-lane by construction, outside the escalation path, and there is no
 * API that clears it (§2.9): an opt-out the organiser can re-enable is a mute button, not consent.
 */
export interface SuppressionRow {
  memberRef: string;
  suppressedSince: number;
  source: 'member' | 'organiser'; // precedence member-over-organiser (pack guardrail)
  viaClass?: string;
}

// --- §1.3 no ghost watchers -------------------------------------------------------------------------
export interface WakeRow {
  id: string;
  purpose: string;
  nextCheckAt: number;
  attempts: number;
  eventId?: string;
  scheduledAt: number;
}

// --- §1.6 budgets -------------------------------------------------------------------------------------
export interface BudgetState {
  ceilingIdr: number | null; // null = unset → metered spend refuses (fail closed, §12-Q9)
  warnRatio: number; // pack default 0.8
  hardStop: boolean;
  spentIdr: number;
  warnedAt?: number;
  stoppedAt?: number;
}

// --- §2.6 shatter-guard ---------------------------------------------------------------------------------
export interface ShatterRow {
  channel: string;
  trippedAt: number;
  ref: string;
  releasedAt?: number;
}

// --- the event log (§1.2 audit replay) ---------------------------------------------------------------------
export type FleetEvent =
  | { type: 'MemberRegistered'; member: Member; at: number }
  | { type: 'SuppressionRecorded'; row: SuppressionRow; at: number }
  | { type: 'GrantIssued'; grant: Grant; at: number }
  | { type: 'GrantRevoked'; grantId: string; by: string; at: number }
  | { type: 'GrantConsumed'; grantId: string; commitSeq: number; at: number }
  | { type: 'GrantSuperseded'; grantId: string; reason: string; at: number }
  | { type: 'CardCreated'; card: Card; at: number }
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
  | { type: 'EscalationRaised'; purpose: string; to: string; cardId: string; at: number };

export type LoggedEvent = FleetEvent & { seq: number };

// --- §1.7 trust labels (stranger-input containment) ------------------------------------------------------------
export type TrustLabel = 'organiser' | 'fleet' | 'low_trust_review';

/** Anything a stranger wrote arrives wrapped in this. It is data, never instruction (§2.7). */
export interface QuarantinedInput {
  trust: 'low_trust_review';
  text: string;
  memberRef: string;
  receivedAt: number;
}

/**
 * The audit-log record of a member input: who sent it, when, and the text's hash. The text
 * itself is *not* in the log — the log is member-readable (§2.3), and member messages in a
 * readable timeline is a privacy failure §1.9 exists to prevent. The wrapped text lives only
 * in the live QuarantinedInput value and is never persisted.
 */
export interface InputRecord {
  memberRef: string;
  textHash: string;
  receivedAt: number;
}

// --- pack shape (parsed .kinship.yaml — see pack.ts) --------------------------------------------------------------
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

export interface Packed {
  schema: string;
  key: string;
  locale: string[];
  agents: Record<string, PackedAgent>;
  guardrails: PackedGuardrails;
  budgets: PackedBudgets;
  needs: string[];
}

/** Answers to the `needs:` gate — supplied by the organiser at boot, never invented (§2.7). */
export type NeedAnswers = Record<string, string>;

/**
 * The context every domain operation runs in. `commit` is append + apply — the only way state
 * changes — so live runs and replays traverse the identical reducer (§1.2).
 */
export interface Ctx {
  state: FleetState;
  commit: (e: FleetEvent) => void;
  now: () => number;
  /** Test-only hook from the harness — not part of the domain contract. */
  advance?: (ms: number) => void;
  pack: Packed;
  answers: NeedAnswers;
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
  /** `${eventId}|${originKind}|${originId}|${phase}` — single-active-per-origin (§1.9.4). */
  phaseClaims: Set<string>;
  checkouts: Map<string, string>; // eventId -> agent
  wakes: Map<string, WakeRow>;
  budgets: Map<string, BudgetState>;
  shatter: Map<string, ShatterRow>;
  /** memberRef -> commit timestamps, for the 24h cap (§2.9 / FR-5.5). */
  commitsByMember: Map<string, number[]>;
  /** Cross-promotion sends per event lifecycle (§2.11 cap). */
  crossPromoByEvent: Map<string, number>;
  /** Arrival metadata for member inputs — text hash only, never the text (see InputRecord). */
  inputs: Map<string, InputRecord>;
  cardCount: number;
  grantCount: number;
  events: LoggedEvent[];
}
