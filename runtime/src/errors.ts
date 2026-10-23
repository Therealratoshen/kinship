/**
 * Refusals. Every refusal carries a code (closed set) and the rule it enforces, so a card, a
 * log line, or a test failure names the invariant — "why not" is part of the product (§1.2).
 * Codes are strings the audit log keeps forever; renaming one is a versioned event, not an edit.
 */
export const REFUSAL_CODES = [
  'class_unavailable', // §1.1 — the class is `never` (absent), not denied
  'not_the_human', // §2.7 — a member or an agent tried to act as the organiser
  'grant_scope_unnamed', // §1.8 — an always-grant must name its scope
  'grant_not_found', // §1.8 — no live grant covers this send
  'grant_window_expired', // §2.11 — an always-grant's named window has closed
  'stale_target', // §1.5 — approval no longer binds to the revision being sent
  'card_not_pending', // §1.5 — a decided card cannot be decided again
  'queue_full', // §1.6 — queue_max reached; depth is bounded
  'verdict_without_why', // §1.2 — a reject/edit without a reason is not a record
  'phase_sequence_violated', // lifecycle — phases may not be skipped
  'conflict_409', // §1.4 — exclusive ownership; never retried
  'ghost_watcher', // §1.3 — a promise with no persisted wake row
  'budget_unset', // §1.6/§12-Q9 — no ceiling set → no metered spend
  'budget_hard_stop', // §1.6 — the stop the organiser set
  'run_truncated', // §1.6 — max_actions_per_run exceeded; partial kept, no retry storm
  'member_suppressed', // §2.9 — the member's stop, beats any grant
  'suppression_unknown', // §2.9 — absent row is unknown, fail closed
  'member_cap_exceeded', // §2.9/FR-5.5 — per-24h cap, member-side
  'quiet_hours', // §2.9/FR-5.5 — the member's local hours, not the organiser's
  'report_below_floor', // §2.9/FR-5.3 — a named report under the aggregation floor is refused
  'disclosure_missing', // §2.8 — no member-facing send without it
  'answerability_missing', // FR-5.1 — no commit without on_behalf_of
  'member_input_forbidden_here', // §2.7 — member text cannot cross into a higher-trust artefact
  'unsourced_number', // §2.11 — a partner claim with no source the organiser named
  'partner_data_leak', // §2.11 — no member identifier travels toward a partner
  'cross_promo_cap', // §2.11 — partner reach is bounded per event
  'no_transport', // D21 / D11 — this runtime ships no channel adapter; a commit must be wired to one
  'need_unanswered', // §2.7 — the pack refuses to boot with invented content
  'pack_invalid', // §2.7/D15/FR-1.18 — a pack that fails the validator, or goes below its org's floor, never instantiates
  'org_invalid', // FR-1.18/D35 — an organisation manifest that is not shaped right cannot hold a floor for anyone
  'idempotent_hit', // §1.5 — same idempotencyKey returned the existing card
  'thread_invalid', // §2.14/FR-5.13 — a thread closed with no note, or closed twice, is not a record
  'posture_refused', // §2.15/FR-5.14 — the community's own posture says the fleet may not do this
] as const;

export type RefusalCode = (typeof REFUSAL_CODES)[number];

/**
 * Declared-but-not-yet-raised codes. A code is part of the audit vocabulary, so it is legal to
 * ship the word before the rule — illegal to ship it *silently*. `test/errors.test.ts` fails if a
 * code is neither raised in `src/` nor listed here, and if a listed code starts being raised
 * without leaving the list. Each entry says what is actually enforced today, so a reader is not
 * misled by the existence of the word.
 */
export const UNIMPLEMENTED_REFUSAL_CODES: Partial<Record<RefusalCode, string>> = {
  idempotent_hit:
    'same-key reuse IS correct (§1.5) and returns the existing card from cards.ts. This code is reserved for a caller-visible "you already asked for that" signal the engine does not yet expose — it is not a refusal.',
  unsourced_number:
    '§2.11 requires a partner claim to cite a source the organiser named. Not built: nothing inspects commit content for a claim, so an unsourced number drafts today. Needs the content check, not the word — and needs the pack to have a place to name a source, which it does not yet have.',
};

export class KinshipError extends Error {
  code: RefusalCode;
  rule: string | undefined;

  constructor(code: RefusalCode, message: string, rule?: string) {
    super(`[${code}] ${rule ? `(${rule}) ` : ''}${message}`);
    this.name = 'KinshipError';
    this.code = code;
    this.rule = rule;
  }
}

/** The only way domain code says no. Throws; callers catch and turn into CommitRefused. */
export function refuse(code: RefusalCode, rule: string, message: string): never {
  throw new KinshipError(code, message, rule);
}
