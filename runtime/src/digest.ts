/**
 * The daily digest — what happened in a window, per channel, for the person who has to answer for it.
 *
 * Why this exists. `health()` answers *what condition is the fleet in* and `inbox()` answers *what is
 * this human waiting on*. Neither answers the question a community manager actually opens the app
 * with: **"what happened in my community yesterday, and what do I owe someone?"** A manager running
 * three channels does not want a state snapshot; they want the day's list, sorted by what is still
 * waiting, with the refusals named — because a refusal the manager never learns about is a refusal
 * the manager cannot act on.
 *
 * **Four rules, each with a test that can fail.**
 *
 *  1. **A digest is a READ.** It appends nothing. A summary that mutates the log is not a summary;
 *     it is a second writer, and the replay would no longer reproduce the state the fleet holds.
 *  2. **It counts only the window, and it says the window.** A digest of "recently" is a digest
 *     nobody can check, because "recently" is whatever the reader felt like. The window is a number
 *     the caller passes, the window's start and end are in the result, and a row outside it is not
 *     counted.
 *  3. **It never names a member.** The digest is a document a manager reads and forwards; a member
 *     identifier in it would travel further than the log it came from. Counts and codes only — the
 *     same discipline `health()` and `inbox()` already hold.
 *  4. **It says what it cannot attribute.** A refusal and a thread carry **no event id** in the log,
 *     so they cannot be split per channel — they are counted once, globally, and the result says so.
 *     **A digest that quietly puts a global number in a per-channel column is a digest that lies by
 *     layout.** If the log ever grows a channel on those two events, this file grows with it.
 *
 * **And the honest part: a digest can only report what the fleet logged.** It says what the fleet
 * drafted, what a human decided, what was refused, and what is still open. It does not say what the
 * members said to each other — the runtime has no visibility into a conversation between members, and
 * inventing one would be the exact failure this repo keeps recording. **A per-channel digest of the
 * community's own discussion is a transport's job, not a governance core's** — and until phase 2
 * ships a transport, the digest's channel breakdown is over *the fleet's* channels (the event ids it
 * acted in), not over the community's chat groups. That limit is stated in the result itself, as
 * `scope`, so a reader is never left to guess.
 */
import { deriveHealth } from './health.ts';
import { deriveInbox } from './inbox.ts';
import type { FleetState, LoggedEvent, Packed } from './types.ts';

/** One channel of the digest: the event the fleet acted in. */
export interface DigestChannel {
  /** The channel key — the event id the fleet's actions were scoped to. */
  channel: string;
  /** Drafts this channel produced in the window. */
  drafts: number;
  /** Cards a human approved in the window. */
  approved: number;
  /** Cards a human rejected in the window. */
  rejected: number;
  /** Cards a human edited in the window. */
  edited: number;
  /** Threads the community still owes an answer to, across every channel (the log carries none). */
  openThreads: number;
}

export interface DigestReport {
  /** The start of the window — the digest says which window it is about. */
  from: number;
  /** The end of the window. */
  to: number;
  /** What this digest covers, in words a reader cannot misread. */
  scope: string;
  /** Per channel, sorted by the channel with the most waiting first. */
  channels: DigestChannel[];
  /** The totals across every channel. */
  totals: {
    drafts: number;
    approved: number;
    rejected: number;
    edited: number;
    /** Refusals in the window. Counted once, globally — see rule 4. */
    refusals: number;
    /** Threads still open, at the end of the window. Counted once, globally. */
    openThreads: number;
  };
  /** What is waiting on a human right now, in the inbox's own words. */
  waiting: number;
  /** The refusals by code, across every channel. */
  refusalsByCode: Record<string, number>;
  /**
   * What this digest does NOT cover, named. A report that does not say its own blind spot is a
   * report someone will over-read.
   */
  notMeasured: string[];
}

function bump(target: Record<string, number>, code: string): void {
  target[code] = (target[code] ?? 0) + 1;
}

/**
 * The digest.
 *
 * `now` is the end of the window and `windowMs` how far back it reaches. The window is **half-open**
 * at the start and closed at the end: a row at exactly `now` is in it, a row at exactly `from` is
 * not. A half-open interval is easier to reason about than a closed one, and the boundary is where a
 * bug would live.
 */
export function deriveDigest(args: {
  events: readonly LoggedEvent[];
  state: FleetState;
  pack: Packed;
  now: number;
  windowMs: number;
}): DigestReport {
  const { events, state, pack, now, windowMs } = args;
  const from = now - windowMs;
  const inWindow = (at: number): boolean => at > from && at <= now;

  const channels = new Map<string, DigestChannel>();
  const channelFor = (key: string): DigestChannel => {
    let c = channels.get(key);
    if (c === undefined) {
      c = { channel: key, drafts: 0, approved: 0, rejected: 0, edited: 0, openThreads: 0 };
      channels.set(key, c);
    }
    return c;
  };

  // A card's channel is its origin's id. A verdict names the card, not the origin, so the map from
  // card id to channel is built from the cards themselves — the log is the only place it exists.
  const cardChannel = new Map<string, string>();
  for (const e of events) {
    if (e.type === 'CardCreated') cardChannel.set(e.card.id, e.card.origin.id);
  }

  const refusalsByCode: Record<string, number> = {};
  let refusalCount = 0;

  for (const e of events) {
    if (!inWindow(e.at)) continue;
    switch (e.type) {
      case 'CardCreated': {
        channelFor(e.card.origin.id).drafts += 1;
        break;
      }
      case 'CardDecided': {
        const key = cardChannel.get(e.cardId) ?? 'unscoped';
        const c = channelFor(key);
        if (e.verdict === 'approve') c.approved += 1;
        else if (e.verdict === 'reject') c.rejected += 1;
        else c.edited += 1;
        break;
      }
      case 'CommitRefused': {
        // **No channel.** The refusal event carries an action class, an agent and a code — and no
        // event id — so it cannot be attributed to a channel. It is counted once, globally, and the
        // result says so (rule 4). A per-channel refusal count would be a number the log cannot
        // support.
        refusalCount += 1;
        bump(refusalsByCode, e.code);
        break;
      }
      default:
        break;
    }
  }

  // --- the threads the community still owes an answer to ---
  // The thread carries no event id either, so this is a global number, not a per-channel one.
  const openThreads = [...state.threads.values()].filter((t) => t.answeredAt === undefined).length;

  const list = [...channels.values()].sort((a, b) => {
    // The channel with the most waiting comes first, then the most drafts, then the name — so the
    // order is stable for a reader comparing two digests.
    const waitingA = a.openThreads + a.drafts;
    const waitingB = b.openThreads + b.drafts;
    if (waitingB !== waitingA) return waitingB - waitingA;
    if (b.drafts !== a.drafts) return b.drafts - a.drafts;
    return a.channel.localeCompare(b.channel);
  });

  const totals = {
    drafts: 0, approved: 0, rejected: 0, edited: 0,
    refusals: refusalCount, openThreads,
  };
  for (const c of list) {
    totals.drafts += c.drafts;
    totals.approved += c.approved;
    totals.rejected += c.rejected;
    totals.edited += c.edited;
  }

  const health = deriveHealth(state, pack, now);
  const inbox = deriveInbox(state, now);

  return {
    from,
    to: now,
    scope:
      "the fleet's own actions in this window, per event id — drafts, human verdicts, refusals, and the " +
      "threads still open. It is NOT a summary of what members said to each other: the runtime has no " +
      "visibility into a conversation between members, and a per-channel digest of the community's own " +
      "chat groups is a transport's job, not a governance core's. Refusals and open threads carry no " +
      'event id in the log, so they are counted once, globally.',
    channels: list,
    totals,
    waiting: inbox.counts.verdict + inbox.counts.handoff + inbox.counts.overdue,
    refusalsByCode,
    notMeasured: [
      'what members said to each other — the runtime never sees it',
      'sentiment, and whether anything was read',
      "whether a draft was any good — the approval rate is the closest thing, and it is in `approved`",
      "the community's own channels, as distinct from the fleet's event ids",
      'which channel a refusal belonged to — the log carries no event id on a refusal',
      'which channel an open thread belonged to — the log carries no event id on a thread',
      `the fleet's condition is reported elsewhere, and this digest does not repeat it (${health.queue.pending} pending)`,
    ],
  };
}
