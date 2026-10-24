/**
 * The community's operating posture — **how this community is run, and what that forbids.**
 *
 * **There is no country table, and there never will be.** The runtime does not know that one place
 * tolerates more nudging than another. A `country → posture` lookup would be a stereotype baked into
 * code, and worse, it would be a rule **nobody in that community chose**. The only authority on a
 * community's manners is the community — so the community declares its posture and the runtime holds
 * the fleet to it. A pack in one place and a pack in another may declare different postures, because
 * that is the community's call, and neither is the runtime's business.
 *
 * **Why this belongs in the runtime at all.** Every other rule in the repo is about what the fleet may
 * do *to a member* (suppression, quiet hours, the per-24h cap) or what the *organiser* may do (the
 * autonomy ladder). None of them is about the community as a *body* — how it conducts itself, whether
 * it is discoverable, whether it tolerates being approached. Those are real differences between
 * communities, and a fleet that cannot be told about them will behave identically in every one.
 *
 * **Two axes, because an axis that gates nothing is a decoration:**
 *
 *  - **`contact`** — may the fleet approach a member who did not ask?
 *      - `never` — no 1:1 member message at all.
 *      - `asked_only` — 1:1 only to a member who has spoken to the community or has an open question.
 *      - `open` — anyone, still subject to the per-24h cap, quiet hours and suppression.
 *  - **`openness`** — is the community discoverable, and may the fleet post publicly?
 *      - `closed` — `commit.channel-post` is refused.
 *      - `open` — allowed, still at the class's own autonomy level.
 *
 * **And the direction of resolution is the same as everywhere else: a pack may only be STRICTER than
 * its org** (spec §1.10, "refuse, never clamp").
 */
import { refuse } from './errors.ts';
import type { Ctx } from './types.ts';

/** The action classes that put ONE message in front of ONE member. */
const ONE_TO_ONE_CLASSES: ReadonlySet<string> = new Set(['commit.individual-message', 'commit.template-send']);

/** Is this class a 1:1 member message? The channel post and the report classes are not. */
export function isOneToOneClass(actionClass: string): boolean {
  return ONE_TO_ONE_CLASSES.has(actionClass);
}

/**
 * The contact gate.
 *
 * `asked_only` asks a question the runtime can actually answer: **has this member spoken to the
 * community, or do they have a question open?** The first is "they engaged with us at some point";
 * the second is "they asked us something we have not answered" — and the second is the one that
 * matters, because it is a question the community is already late on (§2.14).
 *
 * **A member's own consent still wins.** This gate sits AFTER `assertContactable` and the quiet-hours
 * and cap checks, so a member who said stop, or who is in their quiet hours, is refused by their own
 * rule first and never reaches the posture. The posture can only ever be an ADDITIONAL limit.
 */
export function assertPostureContact(ctx: Ctx, memberRef: string, oneToOne: boolean): void {
  const posture = ctx.settings.posture;
  if (!oneToOne) return;
  if (posture.contact === 'open') return;

  if (posture.contact === 'never') {
    refuse('posture_refused', 'spec §2.15 / FR-5.14',
      `this community does not do individual outreach — \`posture.contact: never\` — so the fleet may not message \`${memberRef}\` one to one. A community that wants to answer members directly declares \`contact: asked_only\` or \`open\``);
  }

  // `asked_only`: the member must have spoken, or have a question still open.
  const spoke = ctx.state.inputs.has(memberRef) || hasOpenThread(ctx, memberRef);
  if (!spoke) {
    refuse('posture_refused', 'spec §2.15 / FR-5.14',
      `this community only answers members who asked — \`posture.contact: asked_only\` — and \`${memberRef}\` has neither spoken to the community nor a question open. A community that tolerates being approached declares \`contact: open\``);
  }
}

/** Does this member have a question the community still owes an answer to (§2.14)? */
function hasOpenThread(ctx: Ctx, memberRef: string): boolean {
  for (const thread of ctx.state.threads.values()) {
    if (thread.answeredAt === undefined && thread.memberRef === memberRef) return true;
  }
  return false;
}
