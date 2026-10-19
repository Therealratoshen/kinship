/**
 * §1.5 approval cards, §1.2 the near-miss as a first-class record, §1.6 the bounded queue.
 *
 * "You approved it" is the sentence that ends a trust relationship, so an approval binds to a
 * content revision hash and grants exactly one send of exactly that content. Editing resolves
 * the old approval `stale` and queues the new revision. Rejected drafts are kept with their
 * reason — the near-miss is the highest-value entry in the audit log (§1.2).
 */
import { refuse } from './errors.ts';
import { assertSeat } from './roles.ts';
import { hashText } from './store.ts';
import type { Ctx, Card, FleetEvent, FleetState, Origin, Phase, Revision, Verdict } from './types.ts';

export interface CreateCardArgs {
  actionClass: string;
  agent: string;
  origin: Origin;
  phase: Phase | null;
  textId: string;
  textEn: string;
  idempotencyKey?: string;
  /** Set by the engine when a rule downgraded an auto lane into a card (e.g. member input). */
  forcedBy?: string;
}

export function createCard(ctx: Ctx, args: CreateCardArgs): Card {
  if (args.idempotencyKey !== undefined) {
    for (const c of ctx.state.cards.values()) {
      if (c.id === `card-${args.idempotencyKey}`) return c; // §1.5 — same key, same card
    }
  }
  const pendingCount = [...ctx.state.cards.values()].filter((c) => c.status === 'pending').length;
  if (pendingCount >= ctx.pack.budgets.queueMax) {
    refuse('queue_full', 'spec §1.6', `approval queue holds ${pendingCount} pending cards (max ${ctx.pack.budgets.queueMax}) — depth is bounded, drain before creating`);
  }
  const revision: Revision = {
    textId: args.textId,
    textEn: args.textEn,
    hash: hashText(`${args.textId}\n\u2044\u2044\n${args.textEn}`),
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
  return card;
}

export interface DecideArgs {
  verdict: Verdict;
  by: string;
  why: string;
  newTextId?: string;
  newTextEn?: string;
}

export function decideCard(ctx: Ctx, cardId: string, args: DecideArgs): Card {
  // §1.5/§2.7 — the actor must hold a human seat. Which names hold one is the organisation's
  // declaration (D36), not a string this file owns.
  assertSeat(ctx, args.by, 'spec §1.5/§2.7');
  const card = ctx.state.cards.get(cardId);
  if (!card) refuse('card_not_pending', 'spec §1.5', `no card \`${cardId}\``);
  // §1.5: "approve v1, edit to v2 → the pending approval resolves stale_target". An edit on an
  // already-approved card is the one legal decision on a decided card — it retracts the approval.
  const editOnApproved = card.status === 'approved' && args.verdict === 'edit';
  if (card.status !== 'pending' && !editOnApproved) {
    refuse('card_not_pending', 'spec §1.5', `card \`${cardId}\` is \`${card.status}\` — a decided card does not re-decide`);
  }
  if (args.why.trim() === '') {
    refuse('verdict_without_why', 'spec §1.2', 'a verdict without a why is not a record');
  }
  if (args.verdict === 'edit') {
    if (args.newTextId === undefined || args.newTextEn === undefined) {
      refuse('verdict_without_why', 'spec §1.5', 'an edit must carry the replacement revision');
    }
    const newRevision: Revision = {
      textId: args.newTextId,
      textEn: args.newTextEn,
      hash: hashText(`${args.newTextId}\n\u2044\u2044\n${args.newTextEn}`),
    };
    if (newRevision.hash === card.revision.hash) {
      refuse('verdict_without_why', 'spec §1.5', 'an edit that changes nothing is an approval');
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
      textId: args.newTextId,
      textEn: args.newTextEn,
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
    refuse('stale_target', 'spec §1.5', `authorization \`${token}\` does not exist or is already consumed — the send it authorised already happened`);
  }
  ctx.commit({ type: 'AuthorizationConsumed', token, at: ctx.now() });
}

// --- the applier ---------------------------------------------------------------------------------

export function applyCards(state: FleetState, event: Extract<FleetEvent, { type: 'CardCreated' | 'CardDecided' | 'AuthorizationIssued' | 'AuthorizationConsumed' }>): void {
  switch (event.type) {
    case 'CardCreated':
      state.cardCount += 1;
      state.cards.set(event.card.id, { ...event.card });
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
