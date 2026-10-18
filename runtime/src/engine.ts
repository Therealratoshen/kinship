/**
 * The Fleet — the control-plane engine. It is NOT a runner: phase 1 has no scheduler here
 * (D10 — shadow mode runs inside the owner's Paperclip instance), and no channel transport
 * ships at all (D21), so "phase 1 sends nothing" is structural: every member-facing commit
 * refuses at the transport gate with its authorization intact, and the refusal lands in the
 * audit log rather than being swallowed.
 *
 * The per-run action cap (§1.6) is deliberately NOT wired here — a run belongs to a runner,
 * which calls `recordRunAction` between actions. The engine is the library the runner is
 * written against, and `src/runner.ts` is that runner: one call, one `Run`, one report.
 *
 * Commit order is the promise the pack makes to members, encoded as evaluation order:
 *   class availability → §2.11 member-data rule (content) → authorization/grant → per-member
 *   protections → §2.11 partner cap → disclosure + answerability → transport gate → execute. A
 *   protection that fires ahead of the transport gate stays load-bearing the day a transport exists.
 */
import { commitEvent, replay as foldEvents } from './apply.ts';
import { freshState, hashText } from './store.ts';
import { KinshipError, refuse } from './errors.ts';
import { resolveAutonomy } from './ladder.ts';
import { narrowForMemberTrigger, wrapMemberInput } from './containment.ts';
import { answerableBy, assertAnswerability, assertDisclosed } from './disclosure.ts';
import { assertContactable, assertSendHour, assertWithinCap, registerMember, suppressMember } from './members.ts';
import { assertNoMemberDataInPartnerCopy } from './partner.ts';
import { findLiveGrant, grantWithClosedWindow, issueGrant, revokeGrant, type IssueGrantArgs } from './grants.ts';
import { consumeAuthorization, createCard, decideCard, getAuthorization, type CreateCardArgs, type DecideArgs } from './cards.ts';
import {
  beginEvent, checkoutEvent, claimPhaseOrigin, completePhase, fireWake, scheduleWake,
  transitionPhase, assertWakeBacked,
} from './lifecycle.ts';
import { releaseShatter, tripShatter } from './shatter.ts';
import { setBudget, recordSpend } from './budget.ts';
import { deriveHealth, type HealthReport } from './health.ts';
import type {
  Card, Ctx, FleetEvent, FleetState, LoggedEvent, NeedAnswers, Packed, Phase, QuarantinedInput, WakeRow,
} from './types.ts';

export interface AttemptArgs {
  actionClass: string;
  agent: string;
  origin: { kind: string; id: string };
  phase?: Phase | null;
  channel?: string;
  textId: string;
  textEn: string;
  /** A member message that triggered this attempt — narrows any lane to draft (§2.7). */
  triggerInput?: QuarantinedInput;
  idempotencyKey?: string;
}

export interface AttemptResult {
  disposition: 'card' | 'auto';
  card: Card | null;
}

export interface CommitArgs {
  actionClass: string;
  agent: string;
  origin: { kind: string; id: string };
  phase?: Phase | null;
  channel?: string;
  partner?: string;
  recipients: string[];
  textId: string;
  textEn: string;
  /** The one-send token from an approved card (§1.5). Absent → a live grant is required (§1.8). */
  authorizationToken?: string;
  /** FR-5.1 — required for member-facing commits. */
  onBehalfOf?: string;
}

export class Fleet {
  readonly pack: Packed;
  readonly answers: NeedAnswers;
  private st: FleetState;
  private t: number;

  constructor(pack: Packed, answers: NeedAnswers = {}, startAt = 1_000) {
    this.pack = pack;
    this.answers = answers;
    this.st = freshState();
    this.t = startAt;
  }

  /** The boot gate: every `needs:` key is answered by the organiser, never invented (§2.7). */
  static boot(pack: Packed, answers: NeedAnswers = {}, startAt = 1_000): Fleet {
    for (const need of pack.needs) {
      const a = answers[need];
      if (a === undefined || a.trim() === '') {
        refuse('need_unanswered', 'spec §2.7 / pack needs gate',
          `need \`${need}\` is unanswered — the organiser answers it, the fleet never invents it`);
      }
    }
    return new Fleet(pack, answers, startAt);
  }

  /** §1.2 — fold the same log through the same reducer; the replay test asserts deep-equality. */
  static replay(events: LoggedEvent[], answers: NeedAnswers = {}, pack?: Packed): Fleet {
    const st = foldEvents(events);
    const last = events.length > 0 ? events[events.length - 1]!.at : 1_000;
    const fleet = new Fleet(pack ?? ({ schema: 'kinship/v1', key: 'replayed', locale: ['id', 'en'], agents: {}, guardrails: {
      reportAggregationFloor: 10, memberMessageCapPer24h: 2, identityDisclosure: true, defaultsDeny: true,
    }, budgets: {
      llmPerEventIdr: null, warnAtRatio: 0.8, hardStop: true, queueMax: 20, maxActionsPerRun: 15, crossPromoPerEventCap: 1,
    }, needs: [] } as Packed), answers, last);
    fleet.st = st;
    return fleet;
  }

  get state(): FleetState {
    return this.st;
  }

  get events(): LoggedEvent[] {
    return this.st.events;
  }

  now(): number {
    return this.t;
  }

  advance(ms: number): void {
    this.t += ms;
  }

  private ctx(): Ctx {
    return {
      state: this.st,
      commit: (e: FleetEvent) => commitEvent(this.st, e),
      now: () => this.t,
      pack: this.pack,
      answers: this.answers,
    };
  }

  /** Log a refused attempt (§1.2 — refusals are outcomes; the near-miss discipline applies). */
  private logRefusal(args: { actionClass: string; agent: string }, e: unknown): never {
    if (e instanceof KinshipError) {
      commitEvent(this.st, { type: 'CommitRefused', actionClass: args.actionClass, agent: args.agent, code: e.code, at: this.t });
    }
    throw e;
  }

  // --- proposals -----------------------------------------------------------------------------------

  attempt(args: AttemptArgs): AttemptResult {
    try {
      let level = resolveAutonomy({ pack: this.pack, role: args.agent, actionClass: args.actionClass, state: this.st, answers: this.answers, channel: args.channel });
      if (args.triggerInput !== undefined) level = narrowForMemberTrigger(level);
      if (level === 'never') {
        refuse('class_unavailable', 'spec §1.1', `class \`${args.actionClass}\` is absent from \`${args.agent}\`'s toolset — not denied, absent`);
      }
      if (level === 'draft') {
        const c = this.ctx();
        const cardArgs: CreateCardArgs = {
          actionClass: args.actionClass, agent: args.agent, origin: args.origin,
          phase: args.phase ?? null, textId: args.textId, textEn: args.textEn,
          ...(args.idempotencyKey !== undefined ? { idempotencyKey: args.idempotencyKey } : {}),
          ...(args.triggerInput !== undefined ? { forcedBy: 'member_input' } : {}),
        };
        return { disposition: 'card', card: createCard(c, cardArgs) };
      }
      return { disposition: 'auto', card: null }; // the runner commits; the engine is the gate, not the scheduler
    } catch (e) {
      return this.logRefusal(args, e);
    }
  }

  commit(args: CommitArgs): void {
    try {
      const level = resolveAutonomy({ pack: this.pack, role: args.agent, actionClass: args.actionClass, state: this.st, answers: this.answers, channel: args.channel });
      if (level === 'never') {
        refuse('class_unavailable', 'spec §1.1', `class \`${args.actionClass}\` is absent from \`${args.agent}\`'s toolset — a grant cannot resurrect it`);
      }

      // --- the partner-facing content rule (§2.11 / FR-6.1) -------------------------------------------
      // A CONTENT rule, not an authorization rule, so it runs ahead of the authorization branch and
      // covers the approved-card (one-send token) path as well as the grant path: an organiser who
      // approves a partner promo vouches for the copy's intent, not for a member's number travelling
      // toward a third party. It also runs ahead of the transport gate — `no_transport` is phase 1's
      // temporary lock and this rule is permanent, so the organiser learns the permanent one first.
      if (args.partner !== undefined) assertNoMemberDataInPartnerCopy(this.st, args.textId, args.textEn);

      // --- authorization or grant ------------------------------------------------------------------
      let grantId: string | undefined;
      let authToken: string | undefined;
      if (args.authorizationToken !== undefined) {
        const token = args.authorizationToken;
        const auth = this.st.authorizations.get(token);
        if (!auth || auth.consumedAt !== undefined) {
          refuse('stale_target', 'spec §1.5', `authorization \`${token}\` is missing or already used — the send it authorised already happened`);
        }
        if (auth && auth.actionClass !== args.actionClass) {
          refuse('stale_target', 'spec §1.5', `authorization \`${token}\` was issued for \`${auth.actionClass}\`, not \`${args.actionClass}\``);
        }
        const revisionHash = hashText(`${args.textId}\n\u2044\u2044\n${args.textEn}`);
        if (auth && auth.revisionHash !== revisionHash) {
          refuse('stale_target', 'spec §1.5', 'the content is not the revision that was approved — approve the new revision first');
        }
        authToken = token;
      } else {
        const c = this.ctx();
        const grant = findLiveGrant(c, { actionClass: args.actionClass, channel: args.channel, partner: args.partner });
        if (!grant) {
          // Name the real reason when the organiser did grant this and the window simply ran out.
          const expired = grantWithClosedWindow(c, { actionClass: args.actionClass, channel: args.channel, partner: args.partner });
          if (expired?.window) {
            refuse('grant_window_expired', 'spec §2.11',
              `the always-grant \`${expired.id}\` for \`${args.actionClass}\` named the window \`${expired.window.from}\u2013${expired.window.to}\` and it has closed — a time-bounded grant does not revive itself; the organiser renews it`);
          }
          refuse('grant_not_found', 'spec §1.8', `no live grant authorizes \`${args.actionClass}\`${args.channel ? ` in \`${args.channel}\`` : ''} — escalation is earned, and every always-grant is revocable`);
        }
        if (grant && args.channel !== undefined && grant.channel !== args.channel) {
          refuse('grant_not_found', 'spec §1.8', `the live grant names \`${grant.channel ?? 'no channel'}\`, not \`${args.channel}\` — an always-grant binds its lane`);
        }
        grantId = grant?.id;
      }

      // --- per-member protections, ahead of delivery ------------------------------------------------
      for (const ref of args.recipients) {
        assertContactable(this.st, ref);
        const m = this.st.members.get(ref);
        if (m) assertSendHour(m.tz, this.t);
        assertWithinCap(this.pack, ref, this.t, this.st.commitsByMember.get(ref) ?? []);
      }

      // --- the partner-reach bound (§2.11 / FR-6.5) ---------------------------------------------------
      // Where it sits is a decision: after the per-member protections, because §2.11's third bullet
      // says the member's rights survive the partnership — a send to a member who said stop is
      // reported as `member_suppressed`, never as a cadence problem; and before the transport gate,
      // because the cap is permanent while `no_transport` is phase 1's temporary lock.
      if (args.partner !== undefined) {
        const cap = this.pack.budgets.crossPromoPerEventCap;
        const used = this.st.crossPromoByEvent.get(args.origin.id) ?? 0;
        if (cap !== null && used >= cap) {
          refuse('cross_promo_cap', 'spec §2.11 / FR-6.5',
            `event \`${args.origin.id}\` already carries ${used} cross-promotion send(s) against a cap of ${cap} — a partner's reach is not our cadence, and the bound is the pack's, not the agent's`);
        }
      }

      // --- disclosure + answerability ----------------------------------------------------------------
      if (args.recipients.length > 0) {
        assertDisclosed(args.textId, args.textEn, this.answers['community_name'] ?? '');
        assertAnswerability(args.onBehalfOf);
        // --- the transport gate: the outermost lock (D21) -------------------------------------------
        refuse('no_transport', 'D21 / D11',
          'phase 1 ships no channel transport — delivery is the organiser\'s hand; the authorization is left intact and the refusal is logged');
      }

      // --- execute (internal, recipient-less commits only, this phase) --------------------------------
      const c = this.ctx();
      if (authToken !== undefined) consumeAuthorization(c, authToken);
      c.commit({
        type: 'CommitExecuted', actionClass: args.actionClass, agent: args.agent, origin: args.origin,
        phase: args.phase ?? null, revisionHash: hashText(`${args.textId}\n\u2044\u2044\n${args.textEn}`),
        onBehalfOf: answerableBy(args.onBehalfOf), recipients: args.recipients, transport: 'none',
        ...(args.channel !== undefined ? { channel: args.channel } : {}),
        ...(args.partner !== undefined ? { partner: args.partner } : {}),
        ...(grantId !== undefined ? { grantId } : {}),
        ...(authToken !== undefined ? { authorizationToken: authToken } : {}),
        at: this.t,
      });
    } catch (e) {
      this.logRefusal(args, e);
    }
  }

  // --- human verdicts + grants -----------------------------------------------------------------------

  decideCard(cardId: string, args: DecideArgs): Card {
    return decideCard(this.ctx(), cardId, args);
  }

  issueGrant(args: IssueGrantArgs) {
    return issueGrant(this.ctx(), args);
  }

  revokeGrant(grantId: string, by: string): void {
    revokeGrant(this.ctx(), grantId, by);
  }

  /** The live authorization of a card, if any — what the organiser's manual hand-off consumes. */
  authorizationOf(cardId: string) {
    return getAuthorization(this.ctx(), cardId);
  }

  raiseEscalation(purpose: string, to: string): Card {
    const card = createCard(this.ctx(), {
      actionClass: 'engine.escalation', agent: 'engine', origin: { kind: 'escalation', id: purpose }, phase: null,
      textId: `Eskalasi: ${purpose}. Butuh keputusan ${to}.`,
      textEn: `Escalation: ${purpose}. Needs a decision from ${to}.`,
      forcedBy: 'escalation',
    });
    this.ctx().commit({ type: 'EscalationRaised', purpose, to, cardId: card.id, at: this.t });
    return card;
  }

  // --- members, inputs, lifecycle, budgets -----------------------------------------------------------

  registerMember(ref: string, tz: string): void {
    registerMember(this.ctx(), ref, tz);
  }

  suppressMember(ref: string, source: 'member' | 'organiser'): void {
    suppressMember(this.ctx(), ref, { source });
  }

  /** Wrap a member message (§2.7). Returns the quarantined value; the log keeps metadata only. */
  registerInput(memberRef: string, text: string): QuarantinedInput {
    return wrapMemberInput(this.ctx(), { memberRef, text });
  }

  beginEvent(eventId: string): void {
    beginEvent(this.ctx(), eventId);
  }

  transitionPhase(eventId: string, next: Phase): void {
    transitionPhase(this.ctx(), eventId, next);
  }

  completePhase(eventId: string): void {
    completePhase(this.ctx(), eventId, this.state.phases.get(eventId)?.current ?? 'draft');
  }

  claimPhaseOrigin(eventId: string, originKind: string, originId: string, phase: Phase, agent: string): void {
    claimPhaseOrigin(this.ctx(), eventId, originKind, originId, phase, agent);
  }

  checkoutEvent(eventId: string, agentId: string): void {
    checkoutEvent(this.ctx(), eventId, agentId);
  }

  scheduleWake(opts: { purpose: string; nextCheckAt: number; eventId?: string }): WakeRow {
    return scheduleWake(this.ctx(), opts);
  }

  assertWakeBacked(purpose: string, eventId?: string): WakeRow {
    return assertWakeBacked(this.ctx(), purpose, eventId);
  }

  fireWake(wakeId: string): void {
    fireWake(this.ctx(), wakeId);
  }

  setBudget(eventId: string, ceilingIdr: number | null): void {
    setBudget(this.ctx(), eventId, ceilingIdr);
  }

  recordSpend(eventId: string, amountIdr: number, note: string) {
    return recordSpend(this.ctx(), eventId, amountIdr, note);
  }

  tripShatter(channel: string, ref: string): void {
    tripShatter(this.ctx(), channel, ref);
  }

  releaseShatter(channel: string, by: string): void {
    releaseShatter(this.ctx(), channel, by);
  }

  // --- §1.2 the readable timeline ---------------------------------------------------------------------

  auditTimeline(): string[] {
    return this.st.events.map((e) => `#${e.seq} ${timelineLine(e)}`);
  }

  /**
   * The fleet-condition snapshot (§1.2 read side): a pure function over the log, so it dates itself,
   * appends nothing, and replays identically. It answers "what is the condition of this right now?"
   * — freezes, queue age, budget state, overdue wakes, refusal counts, idle agents (FR-1.11) — and
   * `unmeasured` answers the part of that question this runtime is not allowed to claim: how the
   * community *feels* is not in the log, and PRD §5 keeps it out of v0.
   */
  health(): HealthReport {
    return deriveHealth(this.st, this.pack, this.t);
  }
}

function timelineLine(e: LoggedEvent): string {
  switch (e.type) {
    case 'MemberRegistered': return `member ${e.member.ref} registered (${e.member.tz})`;
    case 'MemberInputReceived': return `input from ${e.memberRef} received (sha ${e.textHash.slice(0, 8)})`;
    case 'SuppressionRecorded': return `member ${e.row.memberRef} stopped — source: ${e.row.source}`;
    // The actor is read from the stored event, never restated here: a timeline that prints a
    // literal "organiser" is asserting a fact the log does not carry.
    case 'GrantIssued': return `grant ${e.grant.id} ${e.grant.kind} for ${e.grant.actionClass}${e.grant.channel ? ` in ${e.grant.channel}` : ''} by ${e.grant.grantedBy}`;
    case 'GrantRevoked': return `grant ${e.grantId} revoked by ${e.by}`;
    case 'GrantConsumed': return `grant ${e.grantId} consumed`;
    case 'GrantSuperseded': return `grant ${e.grantId} superseded: ${e.reason}`;
    case 'CardCreated': return `card ${e.card.id} created — ${e.card.actionClass} by ${e.card.agent} (${e.card.origin.kind}:${e.card.origin.id})`;
    case 'CardDecided':
      if (e.verdict === 'reject') return `card ${e.cardId} rejected by ${e.by}: "${e.why}" — kept as a near-miss record`;
      if (e.verdict === 'edit') return `card ${e.cardId} edited by ${e.by}: "${e.why}" — approval went stale, v2 queues`;
      return `card ${e.cardId} approved by ${e.by}`;
    case 'AuthorizationIssued': return `authorization ${e.auth.token} issued for ${e.auth.actionClass} (revision ${e.auth.revisionHash})`;
    case 'AuthorizationConsumed': return `authorization ${e.token} consumed`;
    case 'CommitExecuted': return `commit ${e.actionClass} by ${e.agent} (transport: ${e.transport}, on behalf of ${e.onBehalfOf})`;
    case 'CommitRefused': return `commit ${e.actionClass} by ${e.agent} refused: ${e.code}`;
    case 'PhaseEntered': return `event ${e.eventId} entered ${e.phase}`;
    case 'PhaseCompleted': return `event ${e.eventId} completed ${e.phase}`;
    case 'PhaseOriginClaimed': return `origin claimed: ${e.claimKey}`;
    case 'EventCheckedOut': return `event ${e.eventId} checked out by ${e.agent}`;
    case 'WakeScheduled': return `wake ${e.row.id} scheduled (${e.row.purpose}) for ${e.row.nextCheckAt}`;
    case 'WakeFired': return `wake ${e.wakeId} fired`;
    case 'BudgetSet': return `budget for ${e.eventId} set to ${e.ceilingIdr === null ? 'unset' : `Rp ${e.ceilingIdr}`}`;
    case 'SpendRecorded': return `spend on ${e.eventId}: Rp ${e.amountIdr} (${e.note})`;
    case 'BudgetWarned': return `budget warning on ${e.eventId}: Rp ${e.spentIdr} of Rp ${e.ceilingIdr}`;
    case 'BudgetStopRaised': return `budget STOP on ${e.eventId}: Rp ${e.spentIdr} of Rp ${e.ceilingIdr} — card ${e.cardId} raised`;
    case 'ShatterTripped': return `shatter-guard tripped on ${e.channel} (by ${e.ref}) — lanes frozen to draft`;
    case 'ShatterReleased': return `shatter-guard on ${e.channel} released by ${e.by}`;
    case 'EscalationRaised': return `escalation raised to ${e.to}: ${e.purpose} (card ${e.cardId})`;
  }
}
