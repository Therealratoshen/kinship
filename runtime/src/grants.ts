/**
 * section 1.8 the grant taxonomy: once, always, and revocation. Collapsing once into always is the
 * bug that turns a helper into an unattended bot three weeks later, so the store keeps them
 * distinct and makes every always-grant name its scope. Grants are issued by the organiser
 * only — section 2.7 makes a member's "yes, go ahead" an input to a proposal, never a grant.
 */
import { refuse } from './errors.ts';
import { assertSeat } from './roles.ts';
import { hashText } from './store.ts';
import type { Ctx, FleetEvent, FleetState, Grant } from './types.ts';

export interface IssueGrantArgs {
  actionClass: string;
  kind: Grant['kind'];
  channel?: string;
  scope?: string;
  partner?: string;
  window?: { from: number; to: number };
  /** Defaults to the hash of the current class template (see registerClassTemplate). */
  templateHash?: string;
  by: string;
}

const CLASS_TEMPLATES = new Map<string, string>();
export function registerClassTemplate(actionClass: string, template: string): void {
  CLASS_TEMPLATES.set(actionClass, hashText(template));
}
export function currentTemplateHash(actionClass: string): string {
  return CLASS_TEMPLATES.get(actionClass) ?? 'no-template-registered';
}

export function issueGrant(ctx: Ctx, args: IssueGrantArgs): Grant {
  assertSeat(ctx, args.by, 'spec section 1.8 / section 2.7');
  const isCross = args.actionClass.startsWith('promote.cross');
  if (args.kind === 'allow_always') {
    if (!args.scope || args.scope.trim() === '') {
      refuse('grant_scope_unnamed', 'spec section 1.8', 'an "always" grant must name its scope — the next event is not the one that was approved');
    }
    if (isCross && (!args.partner || !args.channel || !args.window)) {
      refuse('grant_scope_unnamed', 'spec section 2.11', 'a cross-promotion always-grant must name partner + lane + window');
    }
  }
  const nextId = `grant-${ctx.state.grantCount + 1}`; // the applier advances the counter on commit
  const grant: Grant = {
    id: nextId,
    actionClass: args.actionClass,
    kind: args.kind,
    ...(args.channel !== undefined ? { channel: args.channel } : {}),
    ...(args.scope !== undefined ? { scope: args.scope } : {}),
    ...(args.partner !== undefined ? { partner: args.partner } : {}),
    ...(args.window !== undefined ? { window: args.window } : {}),
    templateHash: args.templateHash ?? currentTemplateHash(args.actionClass),
    grantedAt: ctx.now(),
    grantedBy: args.by,
  };
  ctx.commit({ type: 'GrantIssued', grant, at: ctx.now() });
  return grant;
}

/**
 * Instant, no reason required, works on once-grants too (nothing to consume after revoke) — and
 * only ever by the human who holds the grant. section 1.8 makes revocation the organiser's act; gating it
 * at the caller would leave this file's own tests able to un-gate it, so the rule lives here.
 */
export function revokeGrant(ctx: Ctx, grantId: string, by: string): void {
  assertSeat(ctx, by, 'spec section 1.8 / section 2.7');
  const g = ctx.state.grants.get(grantId);
  if (!g || g.revokedAt !== undefined || g.consumedAt !== undefined) return;
  ctx.commit({ type: 'GrantRevoked', grantId, by, at: ctx.now() });
}

export function consumeGrant(ctx: Ctx, grantId: string, commitSeq: number): void {
  const g = ctx.state.grants.get(grantId);
  if (!g || g.consumedAt !== undefined || g.revokedAt !== undefined) return;
  ctx.commit({ type: 'GrantConsumed', grantId, commitSeq, at: ctx.now() });
}

/** section 1.8 — the class definition changed materially; the grant is dead, not adapted. */
export function supersedeGrant(ctx: Ctx, grantId: string, reason: string): void {
  const g = ctx.state.grants.get(grantId);
  if (!g || g.revokedAt !== undefined) return;
  ctx.commit({ type: 'GrantSuperseded', grantId, reason, at: ctx.now() });
}

export interface LiveGrantQuery {
  actionClass: string;
  // `| undefined` is deliberate: with `exactOptionalPropertyTypes`, a caller that may not have a
  // channel or a partner passes `undefined`, and `?: string` would refuse exactly that.
  channel?: string | undefined;
  partner?: string | undefined;
  templateHash?: string;
}

/** The one lookup the engine trusts. Every rule here is a spec rule, in spec order. */
export function findLiveGrant(ctx: Ctx, q: LiveGrantQuery): Grant | null {
  const now = ctx.now();
  for (const g of ctx.state.grants.values()) {
    if (g.actionClass !== q.actionClass) continue;
    if (g.revokedAt !== undefined || g.consumedAt !== undefined) continue;
    if (q.templateHash !== undefined && g.templateHash !== q.templateHash) continue;
    if (g.channel !== undefined && g.channel !== q.channel) continue;
    if (g.partner !== undefined && g.partner !== q.partner) continue;
    if (g.window && (now < g.window.from || now > g.window.to)) continue;
    return g;
  }
  return null;
}

/**
 * A diagnostic, never an authorization path: the row that `findLiveGrant` skipped because its
 * named window closed. section 1.2 says "why not" is part of the product, and "no live grant —
 * escalation is earned" is the wrong sentence for a grant the organiser did issue and that simply
 * ran out. Only an *expired* window is reported; a window that has not opened yet is truthfully
 * "no live grant". Revoked and consumed rows are excluded — for those, the existing message is
 * already the right one.
 */
export function grantWithClosedWindow(ctx: Ctx, q: LiveGrantQuery): Grant | null {
  const now = ctx.now();
  for (const g of ctx.state.grants.values()) {
    if (g.actionClass !== q.actionClass) continue;
    if (g.revokedAt !== undefined || g.consumedAt !== undefined) continue;
    if (q.templateHash !== undefined && g.templateHash !== q.templateHash) continue;
    if (g.channel !== undefined && g.channel !== q.channel) continue;
    if (g.partner !== undefined && g.partner !== q.partner) continue;
    if (g.window && now > g.window.to) return g;
  }
  return null;
}

/** section 1.8 — "every always-grant is enumerable… if it cannot be listed, it cannot be governed." */
export function listGrants(ctx: Ctx): Grant[] {
  return [...ctx.state.grants.values()];
}

// --- the applier -------------------------------------------------------------------------------

export function applyGrants(state: FleetState, event: Extract<FleetEvent, { type: 'GrantIssued' | 'GrantRevoked' | 'GrantConsumed' | 'GrantSuperseded' }>): void {
  switch (event.type) {
    case 'GrantIssued':
      state.grantCount += 1;
      state.grants.set(event.grant.id, { ...event.grant });
      return;
    case 'GrantRevoked': {
      const g = state.grants.get(event.grantId);
      if (g && g.revokedAt === undefined) state.grants.set(event.grantId, { ...g, revokedAt: event.at });
      return;
    }
    case 'GrantConsumed': {
      const g = state.grants.get(event.grantId);
      if (g && g.consumedAt === undefined) state.grants.set(event.grantId, { ...g, consumedAt: event.at });
      return;
    }
    case 'GrantSuperseded': {
      const g = state.grants.get(event.grantId);
      if (g && g.revokedAt === undefined) state.grants.set(event.grantId, { ...g, revokedAt: event.at });
      return;
    }
  }
}
