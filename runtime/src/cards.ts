/**
 * section 1.5 approval cards, section 1.2 the near-miss as a first-class record, section 1.6 the bounded queue.
 *
 * "You approved it" is the sentence that ends a trust relationship, so an approval binds to a
 * content revision hash and grants exactly one send of exactly that content. Editing resolves
 * the old approval `stale` and queues the new revision. Rejected drafts are kept with their
 * reason — the near-miss is the highest-value entry in the audit log (section 1.2).
 */
import { refuse } from './errors.ts';
import { asks } from './capabilities.ts';
import { assertSeat } from './roles.ts';
import { hashText } from './store.ts';
import { localeTextForHash, type LocaleText } from './locales.ts';
import type { Ctx, Card, FleetEvent, FleetState, Origin, Phase, Revision, Verdict } from './types.ts';

export interface CreateCardArgs {
  actionClass: string;
  agent: string;
  origin: Origin;
  phase: Phase | null;
  /** The copy, in the community's declared languages (FR-5.6 — a declared pair, both always). */
  text: LocaleText;
  idempotencyKey?: string;
  /** Set by the engine when a rule downgraded an auto lane into a card (e.g. member input). */
  forcedBy?: string;
}

export function createCard(ctx: Ctx, args: CreateCardArgs): Card {
  if (args.idempotencyKey !== undefined) {
    for (const c of ctx.state.cards.values()) {
      if (c.id === `card-${args.idempotencyKey}`) return c; // section 1.5 — same key, same card
    }
  }
  const pendingCount = [...ctx.state.cards.values()].filter((c) => c.status === 'pending').length;
  if (pendingCount >= ctx.pack.budgets.queueMax) {
    refuse('queue_full', 'spec section 1.6', `approval queue holds ${pendingCount} pending cards (max ${ctx.pack.budgets.queueMax}) — depth is bounded, drain before creating`);
  }
  const revision: Revision = {
    text: args.text,
    hash: hashText(localeTextForHash(args.text, ctx.pack.locale)),
  };
  const card: Card = {
    id: args.idempotencyKey !== undefined ? `card-${args.idempotencyKey}` : `card-${ctx.state.cardCount + 1}`,
    actionClass: args.actionClass,
    agent: args.agent,
    origin: args.origin,
    phase: args.phase,
    revision,
    status: 'pending',
    createdAt: ctx.now(),
    ...(args.forcedBy !== undefined ? { forcedBy: args.forcedBy } : {}),
  };
  ctx.commit({ type: 'CardCreated', card, at: ctx.now() });
  // The push shape (DECISIONS.md D103): the runtime ASKS. The card is waiting for a human either
  // way — that is the floor, and it is structural, not a setting — but under `push` the runtime also
  // writes the row a host turns into a notification. Under `pull` it writes nothing: the human
  // opens the inbox. The difference is one event in the log, and it is the whole difference.
  if (asks(ctx.settings.capabilities)) {
    ctx.commit({
      type: 'ReviewRequested',
      cardId: card.id,
      actionClass: card.actionClass,
      seat: ctx.settings.capabilities.humanCheck.seat,
      at: ctx.now(),
    });
  }
  return card;
}

export interface DecideArgs {
  verdict: Verdict;
  by: string;
  why: string;
  /** The replacement copy, in the community's declared languages. */
  newText?: LocaleText;
}

export function decideCard(ctx: Ctx, cardId: string, args: DecideArgs): Card {
  // section 1.5 / section 2.7 — the actor must hold a human seat. Which names hold one is the organisation's
  // declaration (D36), not a string this file owns.
  assertSeat(ctx, args.by, 'spec section 1.5 / section 2.7');
  const card = ctx.state.cards.get(cardId);
  if (!card) refuse('card_not_pending', 'spec section 1.5', `no card \`${cardId}\``);
  // section 1.5: "approve v1, edit to v2 → the pending approval resolves stale_target". An edit on an
  // already-approved card is the one legal decision on a decided card — it retracts the approval.
  const editOnApproved = card.status === 'approved' && args.verdict === 'edit';
  if (card.status !== 'pending' && !editOnApproved) {
    refuse('card_not_pending', 'spec section 1.5', `card \`${cardId}\` is \`${card.status}\` — a decided card does not re-decide`);
  }
  if (args.why.trim() === '') {
    refuse('verdict_without_why', 'spec section 1.2', 'a verdict without a why is not a record');
  }
  if (args.verdict === 'edit') {
    if (args.newText === undefined) {
      refuse('verdict_without_why', 'spec section 1.5', 'an edit must carry the replacement revision');
    }
    const newRevision: Revision = {
      text: args.newText,
      hash: hashText(localeTextForHash(args.newText, ctx.pack.locale)),
    };
    if (newRevision.hash === card.revision.hash) {
      refuse('verdict_without_why', 'spec section 1.5', 'an edit that changes nothing is an approval');
    }
    ctx.commit({ type: 'CardDecided', cardId, verdict: 'edit', by: args.by, why: args.why, newRevision, at: ctx.now() });
    // The edit retracts any approval the card still carries — a live v1 authorization dies here,
    // not at commit time, so the stale token cannot be presented even for v1's own content.
    const liveAuth = getAuthorization(ctx, cardId);
    if (liveAuth) ctx.commit({ type: 'AuthorizationConsumed', token: liveAuth.token, at: ctx.now() });
    const next = createCard(ctx, {
      actionClass: card.actionClass,
      agent: card.agent,
      origin: card.origin,
      phase: card.phase,
      text: args.newText,
    });
    return next;
  }
  ctx.commit({ type: 'CardDecided', cardId, verdict: args.verdict, by: args.by, why: args.why, at: ctx.now() });
  if (args.verdict === 'approve') {
    const auth = {
      token: `auth-${cardId}`,
      cardId,
      revisionHash: card.revision.hash,
      actionClass: card.actionClass,
      origin: card.origin,
      phase: card.phase,
      issuedAt: ctx.now(),
    };
    ctx.commit({ type: 'AuthorizationIssued', auth, at: ctx.now() });
  }
  return ctx.state.cards.get(cardId) as Card;
}

/** The live, unconsumed authorization for a card, if any. The engine consumes it at commit. */
export function getAuthorization(ctx: Ctx, cardId: string) {
  for (const a of ctx.state.authorizations.values()) {
    if (a.cardId === cardId && a.consumedAt === undefined) return a;
  }
  return null;
}

export function consumeAuthorization(ctx: Ctx, token: string): void {
  const a = ctx.state.authorizations.get(token);
  if (!a || a.consumedAt !== undefined) {
    refuse('stale_target', 'spec section 1.5', `authorization \`${token}\` does not exist or is already consumed — the send it authorised already happened`);
  }
  ctx.commit({ type: 'AuthorizationConsumed', token, at: ctx.now() });
}

// --- the applier ---------------------------------------------------------------------------------

export function applyCards(state: FleetState, event: Extract<FleetEvent, { type: 'CardCreated' | 'CardDecided' | 'AuthorizationIssued' | 'AuthorizationConsumed' | 'ReviewRequested' }>): void {
  switch (event.type) {
    case 'CardCreated':
      state.cardCount += 1;
      state.cards.set(event.card.id, { ...event.card });
      return;
    case 'ReviewRequested':
      // No state to change: the request is a fact about the LOG, not about the fleet's condition.
      // The card itself already sits in the queue, so `pull` and `push` produce the same state and
      // different logs — and the log is where the audit trail lives.
      return;
    case 'CardDecided': {
      const card = state.cards.get(event.cardId);
      if (!card) return;
      const status = event.verdict === 'approve' ? 'approved' : event.verdict === 'reject' ? 'rejected' : 'stale';
      // A stale card keeps the revision it was created with — it records what *was* approved and
      // that the edit went stale. The replacement revision lives on the new card (and in this
      // event's `newRevision` for the audit log), not on the corpse of the old one.
      state.cards.set(event.cardId, {
        ...card,
        status,
        why: event.why,
        decidedBy: event.by,
        decidedAt: event.at,
      });
      return;
    }
    case 'AuthorizationIssued':
      state.authorizations.set(event.auth.token, { ...event.auth });
      return;
    case 'AuthorizationConsumed': {
      const a = state.authorizations.get(event.token);
      if (a && a.consumedAt === undefined) state.authorizations.set(event.token, { ...a, consumedAt: event.at });
      return;
    }
  }
}
