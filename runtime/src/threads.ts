/**
 * Open threads — a question the community owes an answer to.
 *
 * **The gap this closes, in the runtime's own words.** `inbox.ts` could count member inputs and
 * undecided cards, but it could not say **which message is unanswered** — the input→card link is
 * severed on purpose (section 1.2 / section 1.7), because a card that carried the input id would join a member's
 * message to a draft. So `standing-engagement`'s promise to "hold the thread" had nothing behind it:
 * a question could arrive, sit unanswered for a week, and leave no trace but a counter.
 *
 * A thread is that missing primitive, and it is deliberately **not** a join:
 *
 *  - A thread is **its own row**, opened by the host when it judges an input to be a question. The
 *    runtime never decides that something is a question — that is the agent's judgement, and a human
 *    can check it.
 *  - A thread holds **no text**. The log stores a hash of every member input and never the words
 *    (section 2.7), and a thread holds no text either. What it holds instead is a **pointer** — an opaque
 *    handle the host can resolve.
 *  - A thread holds the **member reference** so the agent can look up that member's own quiet hours
 *    before answering them (FR-5.5) — and **no read ever prints it**. The sweep is the same one the
 *    rest of the inbox uses, not a second implementation of the same rule.
 *
 * **The rule that makes it community-facing rather than fleet-facing:** an open thread is an
 * obligation, so the coverage window measures it. A question still open when a staffed shift ended is
 * the community failing to keep its word to a member — which is a different fact from "the fleet left
 * a card undecided", and a more important one.
 */
import { refuse } from './errors.ts';
import type { Ctx, FleetEvent, Thread } from './types.ts';

export interface OpenThreadArgs {
  /** The member who asked, when the host knows it. Never printed by a read. */
  memberRef?: string | null;
  /** An opaque handle the host can resolve — a message id, a link. Never the words. */
  pointer?: string | null;
}

/** Open a thread: a question the community now owes an answer to. */
export function openThread(ctx: Ctx, args: OpenThreadArgs = {}): Thread {
  const id = `thread-${ctx.state.threads.size + 1}`;
  const thread: Thread = {
    id,
    memberRef: args.memberRef ?? null,
    pointer: args.pointer ?? null,
    raisedAt: ctx.now(),
  };
  ctx.commit({ type: 'ThreadOpened', thread, at: ctx.now() });
  return thread;
}

/**
 * Close a thread: the question has been answered.
 *
 * The note is required, for the same reason a verdict's why is required (section 1.5): "it was answered" with
 * no record of how is a claim nobody can check later, and this runtime's whole product is checking
 * claims. A refused answer closes nothing.
 */
export function answerThread(ctx: Ctx, threadId: string, by: string, note: string): void {
  const thread = ctx.state.threads.get(threadId);
  if (thread === undefined) {
    refuse('thread_invalid', 'spec section 2.14 / FR-5.13',
      `no thread \`${threadId}\` is open — an answer to a question that was never asked, or already answered, is not a record`);
  }
  if (thread.answeredAt !== undefined) {
    refuse('thread_invalid', 'spec section 2.14 / FR-5.13',
      `thread \`${threadId}\` was already answered at ${thread.answeredAt} by ${thread.answeredBy ?? 'someone'} — answering it twice would make the record say two things happened`);
  }
  if (typeof note !== 'string' || note.trim() === '') {
    refuse('thread_invalid', 'spec section 2.14 / FR-5.13',
      `answering thread \`${threadId}\` needs a note of how it was answered — a record with no substance is not a record, and "it was answered" is exactly the claim nobody can check later`);
  }
  ctx.commit({ type: 'ThreadAnswered', threadId, by, note: note.trim(), at: ctx.now() });
}

/**
 * Apply a thread event to the state.
 *
 * Lives next to the module that emits the events, so a spec section's read path and write path sit
 * in one file — the rule every other applier in `runtime/` keeps.
 */
export function applyThreads(
  state: { threads: Map<string, Thread> },
  event: Extract<FleetEvent, { type: 'ThreadOpened' | 'ThreadAnswered' }>,
): void {
  if (event.type === 'ThreadOpened') {
    state.threads.set(event.thread.id, { ...event.thread });
    return;
  }
  const thread = state.threads.get(event.threadId);
  if (thread === undefined) return; // the write path refuses this; a replay of a hand-edited log does not crash
  thread.answeredAt = event.at;
  thread.answeredBy = event.by;
  thread.note = event.note;
}

/** The threads that are still open, oldest first. */
export function openThreads(state: { threads: Map<string, Thread> }): Thread[] {
  return [...state.threads.values()]
    .filter((t) => t.answeredAt === undefined)
    .sort((a, b) => a.raisedAt - b.raisedAt || (a.id < b.id ? -1 : 1));
}
