/**
 * The human seat — one closed set instead of four string literals.
 *
 * Until now "only the organiser may do this" was written four times: `cards.ts` once, `grants.ts`
 * twice, `shatter.ts` once. Four literals is four chances to get it wrong, and the fifth act that
 * needs a human would add a fifth. They now all call `assertSeat`, which reads the set the
 * organisation declares (`orgs/<key>.yaml`) and falls back to the one seat the runtime has always
 * gated on, so a pack with no org tier behaves exactly as it did before the tier existed.
 *
 * The set is deliberately **closed**: an actor is a human iff its name is in it. That is what makes
 * the org tier's role answer to "how many roles do we need" a shape rather than a preference — and
 * the *size* stays the owner's ruling. PRD §12-Q12 (does the organiser get a delegate?) is
 * unanswered, so `org.ts` refuses a manifest with more than one seat and every refusal here names
 * §12-Q12, because the reader of this failure is the person allowed to change it.
 *
 * Two exclusions, both load-bearing, both tested:
 *
 *  - **A complainant is not an actor.** `tripShatter(channel, ref)` names who was annoyed, and that
 *    is a member. Seat-checking it would refuse a member's complaint for not being the organiser —
 *    the precise way a governance system becomes a silencer (§2.6 vs §2.7).
 *  - **Answerability is not authority.** `on_behalf_of` may be `'unattributable'` (FR-5.1): if that
 *    field had to be a seat, the cheap fix for "who sent this?" would be to say the organiser did.
 */
import { refuse } from './errors.ts';
import type { Ctx } from './types.ts';

/** The set a pack with no organisation tier resolves to — the seat the runtime has always gated on. */
export const DEFAULT_HUMAN_SEATS: readonly string[] = ['organiser'];

export function seatHolds(ctx: Ctx, by: string): boolean {
  return ctx.settings.humanSeats.includes(by);
}

/**
 * The one gate on the four human-only acts — `decideCard`, `issueGrant`, `revokeGrant`,
 * `releaseShatter`. It takes the ctx so it can see the tier that declares the set, and it takes the
 * caller's rule string so the refusal still names the section the call site belongs to.
 */
export function assertSeat(ctx: Ctx, by: string, rule?: string): void {
  if (seatHolds(ctx, by)) return;
  const seats = ctx.settings.humanSeats.join(', ');
  const who = ctx.settings.orgKey !== null
    ? `the seat set is declared by org \`${ctx.settings.orgKey}\` (${seats})`
    : `the seat set is the default one (${seats})`;
  refuse('not_the_human', rule ?? 'spec §2.7',
    `only a human seat may decide a card, issue or revoke a grant, or release a freeze; \`${by || '(empty)'}\` is not one — ${who}, and a second seat would be delegation, which is PRD §12-Q12 and still the owner's unanswered question. An agent's or a member's "yes, go ahead" is input to a proposal, never a verdict (§2.7).`);
}
