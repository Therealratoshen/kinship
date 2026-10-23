/**
 * The organiser's inbox — the *worklist* read over the same log `health()` reads for its counts.
 *
 * Two reads, two questions, deliberately not merged:
 *   `health()` answers "what is the condition of this?" in counts, for a report an organiser forwards.
 *   `inbox()` answers "what is waiting on me, and how long has it been waiting?" as a list, for the
 *   human who opens the thing on a Tuesday morning.
 *
 * Why a community needs its own version of this: in the donor control plane the worklist belongs to an
 * *agent* — the issue row is keyed on `assigneeAgentId` and exclusive checkout makes a second claimant
 * a 409 (`research/PAPERCLIP-OSS-STUDY-2026-10-17.md` §3, "Exclusive checkout → 409"). In Kinship the
 * queue is not agent work, it is a **human's attention**, and the ways a community operator drops
 * something are different from the ways an agent run fails. So the four kinds here are the four ways a
 * promise to a member can sit unnoticed:
 *
 *   verdict   — a draft nobody has approved, edited, or rejected (§1.5)
 *   handoff   — approved and authorised but *never delivered*: in shadow mode the send is the
 *               organiser's own hand (D21), and until today an approved card that nobody forwarded
 *               by hand left no trace anywhere. This is the failure this file exists to make visible.
 *   release   — a lane frozen to draft by a complaint, waiting for the only human act that can
 *               unfreeze it (§2.6)
 *   overdue   — a wake whose time has passed and nothing re-armed it, because the runtime is not a
 *               scheduler (D10) and the host owns the tick
 *
 * Three rules, each with a test that can fail:
 *
 *  1. **A read, not an actor.** It appends nothing to the log and `Fleet.replay` reproduces it
 *     exactly (§1.2). A queue that mutated state would be a fifth governing actor with no grant,
 *     no approval, and no revocation path.
 *  2. **A member identifier does not ride along** — the same exported mechanism as `health()`
 *     (`withholdMemberIdentifiers`), applied to every free-text part *before* any truncation, so a
 *     preview cut mid-sentence cannot strand half of someone's number in a list that gets pasted
 *     into a group chat. Importing the rule instead of re-implementing it is the point: one standard,
 *     two artefacts.
 *  3. **It lists, it does not rank.** Ordering is age, because age is a row the log carries. Whether
 *     the venue card matters more than the sponsor card is the organiser's judgement, and PRD §5
 *     keeps that judgement out of the runtime. `limits` says this out loud rather than letting a
 *     sorted list imply it.
 *
 * What this is NOT: a notification system (no transport, D21), an assignment mechanism (no human
 * identity exists to assign to yet — PRD §12-Q12), or a per-person to-do list (member inputs are
 * counted, never itemised; see `memberInputs.linkable`).
 */
import { pendingCards, withholdMemberIdentifiers } from './health.ts';
import { openThreads } from './threads.ts';
import type { Card, FleetState } from './types.ts';

/**
 * The ways a promise can sit waiting on a human.
 *
 * A fifth was added in **D55** — `thread`, a question the community owes an answer to (§2.14 /
 * FR-5.13) — and it needed the spec rule this comment used to say was required. The rule: **a thread
 * is a pointer, not a payload.** It carries an id, an age, and a handle the host can resolve. It never
 * carries the member's words (the log holds a hash of every member input and never the text, §2.7) and
 * it never carries the asker's name in a read.
 */
export type InboxKind = 'verdict' | 'handoff' | 'release' | 'overdue' | 'thread';

/** How much of a draft this list shows. The full bilingual copy is on the card, not here. */
export const INBOX_PREVIEW_MAX = 160;

export interface InboxItem {
  kind: InboxKind;
  /** What to act on: a card id, a lane, or a wake id. Never a member identifier. */
  ref: string;
  /** How long it has been waiting — on the human, not on the fleet. */
  ageMs: number;
  /** The act that clears it, in the organiser's own terms. */
  action: string;
  /** Free text, swept of member identifiers, bounded by `INBOX_PREVIEW_MAX` where it quotes a draft. */
  detail: string;
}

export interface InboxMemberInputs {
  /** Inputs that arrived (§1.7). A count, because a list of them would be a list of people. */
  received: number;
  /** Pending cards a member message forced into existence. */
  awaitingVerdict: number;
  /**
   * Always `false`, and the honest reason is in `note`: the log records an input arrival and it
   * records a card forced by member input, but the card does not carry the input's id, so the two
   * rows cannot be joined. Reporting a number here as though it were answerable would be the kind of
   * claim invariant #3 exists to stop.
   */
  linkable: false;
  /**
   * Questions the community owes an answer to, right now (spec §2.14 / FR-5.13).
   *
   * A **count**, because a list of them would be a list of people. This is the one member-side
   * number this list can carry, and it is possible because an open question is a **tracked thread of
   * its own** — a row with an age, a pointer, and no words — rather than a join back to the input.
   */
  openQuestions: number;
  note: string;
}

export interface InboxReport {
  at: number;
  derivedFromSeq: number;
  counts: Record<InboxKind, number>;
  items: InboxItem[];
  memberInputs: InboxMemberInputs;
  /** What this ordering does not mean. Part of the artefact, not a disclaimer bolted on. */
  limits: string[];
}

const ACTIONS: Record<InboxKind, string> = {
  verdict: 'approve, edit, or reject — with a why (§1.5)',
  handoff: 'deliver it by hand — phase 1 ships no transport (D21), and the one-send authorization is still live',
  release: 'release the lane once the member issue is settled — only the organiser can (§2.6)',
  overdue: 're-arm the wake or answer the promise — the runtime does not tick (D10)',
  thread: 'answer the open question — the words are in the channel, not in this list (§2.7)',
};

/**
 * The copy a preview shows: the community's PRIMARY language — the first code in its declared pair.
 *
 * The organiser's own language is the one they read, and the pack declares the order, so the runtime
 * does not have to guess. A member's other language is one click away in the card, which carries every
 * declared language.
 */
function primaryCopy(card: Card): string {
  const locale = card.revision.text;
  const first = Object.keys(locale)[0];
  return first === undefined ? '' : (locale[first] ?? '');
}

/** One line, so a host can print the list without knowing which fields are free text. */
function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > INBOX_PREVIEW_MAX ? `${flat.slice(0, INBOX_PREVIEW_MAX)}…` : flat;
}

export function deriveInbox(state: FleetState, now: number): InboxReport {
  // Every free-text part is swept on the way in, before any cut or join.
  const sweep = (text: string) => withholdMemberIdentifiers(text, state);
  const originOf = (kind: string, id: string) => `${sweep(kind)}:${sweep(id)}`;
  const items: InboxItem[] = [];

  for (const card of pendingCards(state)) {
    items.push({
      kind: 'verdict',
      ref: card.id,
      ageMs: now - card.createdAt,
      action: ACTIONS.verdict,
      detail: [card.actionClass, originOf(card.origin.kind, card.origin.id), `"${preview(sweep(primaryCopy(card)))}"`,
        ...(card.forcedBy !== undefined ? [`forced by ${card.forcedBy}`] : [])].join(' · '),
    });
  }

  // Approved, authorised, undelivered. Once a transport exists the commit consumes the token and this
  // kind empties by itself — which is why it is derived from the authorization rather than from a flag.
  for (const auth of state.authorizations.values()) {
    if (auth.consumedAt !== undefined) continue;
    const card = state.cards.get(auth.cardId);
    if (!card || card.status !== 'approved') continue;
    items.push({
      kind: 'handoff',
      ref: auth.cardId,
      ageMs: now - auth.issuedAt,
      action: ACTIONS.handoff,
      detail: [auth.actionClass, originOf(card.origin.kind, card.origin.id), `authorization ${auth.token}`,
        `"${preview(sweep(primaryCopy(card)))}"`].join(' · '),
    });
  }

  for (const row of state.shatter.values()) {
    if (row.releasedAt !== undefined) continue;
    items.push({
      kind: 'release',
      ref: row.channel,
      ageMs: now - row.trippedAt,
      action: ACTIONS.release,
      // The lane, never the complainant: `ref` on a shatter row is a person and stays in the log (§2.3).
      detail: `lane ${row.channel} is frozen to draft — every member-facing class in it waits on this decision`,
    });
  }

  for (const wake of state.wakes.values()) {
    if (wake.attempts !== 0 || wake.nextCheckAt > now) continue;
    items.push({
      kind: 'overdue',
      ref: wake.id,
      ageMs: now - wake.nextCheckAt,
      action: ACTIONS.overdue,
      detail: `${wake.id} was due at ${wake.nextCheckAt} — ${preview(sweep(wake.purpose))}`,
    });
  }

  // An open thread: a question the community owes an answer to. The `ref` is the thread id and the
  // detail is a POINTER — the handle the host can resolve, and the age. The words are deliberately
  // absent: a question's text is member content, and this list is meant to be forwardable to
  // co-organisers. The asker's name is absent too, and the sweep runs on what is here anyway.
  for (const thread of openThreads(state)) {
    items.push({
      kind: 'thread',
      ref: thread.id,
      ageMs: now - thread.raisedAt,
      action: ACTIONS.thread,
      detail: [
        thread.pointer !== null ? sweep(thread.pointer) : 'no handle recorded',
        `raised ${thread.raisedAt}`,
        'the words are in the channel — the log holds a hash, never the text (§2.7)',
      ].join(' · '),
    });
  }

  items.sort((a, b) => b.ageMs - a.ageMs || (a.ref < b.ref ? -1 : 1));

  const counts: Record<InboxKind, number> = { verdict: 0, handoff: 0, release: 0, overdue: 0, thread: 0 };
  for (const item of items) counts[item.kind] += 1;

  const memberInputs: InboxMemberInputs = {
    received: state.inputs.size,
    awaitingVerdict: pendingCards(state).filter((c) => c.forcedBy === 'member_input').length,
    openQuestions: openThreads(state).length,
    linkable: false,
    note: 'inputs and cards cannot be joined: a card forced by member input records the forcing, not the input id, so this list cannot say which CARD answers which message. That link is a spec rule (§1.2/§1.7), not a query. What it CAN say is how many questions are open, because an open question is a tracked thread of its own — a row with an age, a pointer and no words (spec §2.14). The words are read from the channel, never from here: the log holds a hash of every member input, never the text (§2.7), and no read names the asker.',
  };

  const limits = [
    'Age is the ordering, not importance: this list cannot rank a community\'s needs — deciding whether the venue card matters more than the sponsor card is the organiser\'s judgement, and PRD §5 keeps that judgement out of the runtime.',
    'It cannot confirm a handoff was actually sent: phase 1 ships no transport and no delivery receipts (D21), so an unconsumed authorization is the only evidence available, and a send a human did by hand without a commit stays invisible here.',
    'An item is a pointer, not the payload: the full bilingual copy and the who/why of a complaint live in the audit log, not in this list — which is why this list is safe to forward and the timeline is a separate question (§2.3). The member\'s own words do NOT: the log stores a hash of every member input, never the text (§2.7), so what the audit log holds of a complaint is that it happened, not what was said.',
  ];

  return { at: now, derivedFromSeq: state.seq, counts, items, memberInputs, limits };
}
