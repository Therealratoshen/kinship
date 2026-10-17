/**
 * §1.7 / §2.7 stranger-input containment. A community's hostile input arrives as a confident
 * sentence from a person in the group, so the mechanics are behavioural, not advisory:
 *
 *  - member input is `low_trust_review` and cannot raise its own trust — there is no API that
 *    promotes it, only reads;
 *  - a read INTO a higher-trust context substitutes a fixed string with attribution nulled —
 *    not truncated, not summarized, not shown-with-a-warning, so the agent never holds the
 *    text to echo into a sponsor report, a recap, or a promo draft;
 *  - the substitution is upward-only: the drafting lane reads the message at low trust,
 *    because a reply proposal that never saw the message is useless;
 *  - member input in an auto lane narrows the lane to `draft` — "yes, go ahead" in chat is
 *    input to a proposal, never a grant (§1.8 is the only grant path).
 */
import { refuse } from './errors.ts';
import { hashText } from './store.ts';
import { narrowest } from './ladder.ts';
import type { Autonomy, Ctx, FleetEvent, FleetState, QuarantinedInput, TrustLabel } from './types.ts';

/** The fixed string. A masked preview is never a value (§1.9.3) — this is a sentence, not a redaction. */
export const LOW_TRUST_REPLACEMENT = '[member input withheld from this artefact — see the audit log for its arrival]';

const RANK: Record<TrustLabel, number> = { organiser: 2, fleet: 1, low_trust_review: 0 };

export interface MemberInputArgs {
  memberRef: string;
  text: string;
  inputId?: string;
}

/**
 * Wrap a member message. The wrapped value carries the text for the low-trust drafting lane;
 * the event log and state carry only arrival metadata + the text hash — the log is
 * member-readable (§2.3) and member messages do not belong in it verbatim.
 */
export function wrapMemberInput(ctx: Ctx, args: MemberInputArgs): QuarantinedInput {
  const inputId = args.inputId ?? `input-${ctx.state.inputs.size + 1}`;
  ctx.commit({ type: 'MemberInputReceived', inputId, memberRef: args.memberRef, textHash: hashText(args.text), at: ctx.now() });
  return {
    trust: 'low_trust_review',
    text: args.text,
    memberRef: args.memberRef,
    receivedAt: ctx.now(),
  };
}

export interface LowTrustRead {
  text: string;
  /** null when substituted — the piece is unattributed in a higher-trust artefact. */
  attributedTo: string | null;
  substituted: boolean;
}

/** The ONLY read path for quarantined text. Upward reads get the fixed string, metadata nulled. */
export function readForArtefact(input: QuarantinedInput, artefactTrust: TrustLabel): LowTrustRead {
  if (RANK[input.trust] < RANK[artefactTrust]) {
    return { text: LOW_TRUST_REPLACEMENT, attributedTo: null, substituted: true };
  }
  return { text: input.text, attributedTo: input.memberRef, substituted: false };
}

/** Second line of defence for assembly paths handed raw pieces instead of reads. */
export function assertNoLowTrustInto(pieces: { trust: TrustLabel }[], artefactTrust: TrustLabel): void {
  if (pieces.some((p) => RANK[p.trust] < RANK[artefactTrust])) {
    refuse('member_input_forbidden_here', 'spec §2.7 / §1.7',
      'a higher-trust artefact does not assemble over quarantined member input — read it through readForArtefact or leave it out');
  }
}

/** Member input narrows any lane to draft; `never` stays `never` — containment cannot resurrect a class. */
export function narrowForMemberTrigger(level: Autonomy): Autonomy {
  return narrowest(level, 'draft');
}

export function applyContainment(state: FleetState, event: Extract<FleetEvent, { type: 'MemberInputReceived' }>): void {
  state.inputs.set(event.inputId, { memberRef: event.memberRef, textHash: event.textHash, receivedAt: event.at });
}
