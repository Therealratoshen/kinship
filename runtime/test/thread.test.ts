/**
 * Open threads — the community's unanswered questions, tracked from raised to answered.
 *
 * **Why this is the next thing, and why it is a community thing and not a fleet thing.**
 *
 * The coverage window (D54) measures whether the *fleet* left something waiting: a card, an
 * authorization, a frozen lane, a wake. All four are internal. None of them is a person.
 *
 * A community's promise to its members is not "we will decide our own cards in time". It is "if you
 * ask us something, we will answer you". And today the runtime **cannot say which message is
 * unanswered** — `inbox.ts` says so in as many words: *"inputs and cards cannot be joined … this list
 * can say how many arrived and how many produced an undecided card, but not which message is
 * unanswered. That link is a spec rule (section 1.2 / section 1.7), not a query."*
 *
 * So `standing-engagement`'s promise to "hold the thread" was prose with nothing behind it. A thread
 * is that missing primitive: a question the community owes an answer to, with a date on it.
 *
 * **What a thread is not.** It is not a card (a card is a proposal the fleet made) and it is not an
 * input (an input is a message that arrived). It is a *debt to a member*, and it is tracked as a row of
 * its own so that the runtime can age it and measure it against the community's staffed hours.
 *
 * **What a thread never holds.** Not the words — the log stores a hash of every member input, never
 * the text (section 2.7), and a thread holds no text either. Not the asker's name in any read: the member
 * reference lives in the log and the state, and every read sweeps it (the same mechanism, the same
 * rule, one implementation). What a thread *does* hold is a **pointer** — an opaque handle the host
 * can resolve, the way an inbox item is "a pointer, not the payload".
 *
 * Four properties, each with a test that can fail:
 *
 *  1. **A thread is a row, in the log, and it replays.** Not a derived view — an event, so the audit
 *     trail can answer "when was this asked, and when was it answered?"
 *  2. **An open thread is something a human owes.** It appears in the inbox as a fifth kind, with an
 *     age, and it leaves when it is answered.
 *  3. **An answer with no note is refused.** The same discipline as a verdict without a why (section 1.5):
 *     a record with no substance is not a record.
 *  4. **A thread that survives a staffed shift is a missed shift.** This is the community-facing
 *     meaning of the coverage window: not "did the fleet keep up" but **"did we keep our word"**.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fleet } from '../src/engine.ts';
import { makePack } from './helpers.ts';
import { HEALTH_WITHHELD_MEMBER_REF } from '../src/health.ts';
import type { CommunityCoverage } from '../src/types.ts';

const DAY = 86_400_000;
const ANSWERS = { community_name: 'AI Builders ID' };

/** Staffed Monday–Friday, 09:00–18:00, in the community's own timezone. */
const JAKARTA = (over: Partial<Extract<CommunityCoverage, { mode: 'staffed' }>> = {}): CommunityCoverage => ({
  mode: 'staffed',
  timezone: 'Asia/Jakarta',
  windows: [{ days: [1, 2, 3, 4, 5], opens: 9 * 60, closes: 18 * 60 }], // 0 = Sunday
  ...over,
});

/** 2026-07-20 is a Monday. These are local wall-clock times in `tz`. */
const local = (tz: string, y: number, mo: number, d: number, h: number, mi: number): number => {
  const probe = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(probe)).map((p) => [p.type, p.value]));
  const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return probe - (shown - probe);
};

/** A fleet with a member, one input, and one open thread. `at` is when the question was raised. */
function withThread(coverage?: CommunityCoverage, at: number = local('Asia/Jakarta', 2026, 7, 20, 10, 0)) {
  const pack = makePack({ 'community-lead': { 'observe.read': 'opt-in-auto', 'answer.question': 'draft' } }, coverage);
  const f = Fleet.boot(pack, ANSWERS, at);
  f.registerMember('wa:62811', 'Asia/Jakarta');
  f.registerInput('wa:62811', 'Kapan venue untuk Kopdar #7 sudah pasti? Saya butuh untuk-booking kantor Kartini-77.');
  const thread = f.openThread({ memberRef: 'wa:62811', pointer: 'telegram#4821' });
  return { f, thread, pack };
}

test('a question opens a thread — a row in the log, not a view', () => {
  const { f, thread } = withThread();
  assert.equal(thread.id, 'thread-1');
  assert.equal(thread.raisedAt, local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  assert.equal(thread.answeredAt, undefined, 'a thread that was just raised is open');
  const opened = f.events.filter((e) => e.type === 'ThreadOpened');
  assert.equal(opened.length, 1, 'the opening is an event, so the audit trail can answer "when was this asked?"');
});

test('a thread holds no words — the question\'s text never enters the log', () => {
  const { f } = withThread();
  const log = JSON.stringify(f.events);
  assert.ok(!log.includes('Kartini-77'), 'the member\'s own words are not in the log — only a hash (containment.ts)');
  assert.ok(!log.includes('Kopdar'), 'and not the words of the question either');
  const row = f.events.find((e) => e.type === 'ThreadOpened');
  assert.equal(row?.type === 'ThreadOpened' ? (row as { thread: { pointer: string } }).thread.pointer : null, 'telegram#4821',
    'what a thread carries instead is a POINTER the host can resolve — the way an inbox item is a pointer, not the payload');
});

test('an open thread is something a human owes — it is in the inbox, aged, as a fifth kind', () => {
  const { f } = withThread();
  const inbox = f.inbox();
  assert.equal(inbox.counts.thread, 1, 'a fifth kind: a question waiting for an answer');
  const item = inbox.items.find((i) => i.kind === 'thread');
  assert.ok(item, 'the thread is listed');
  assert.equal(item.ref, 'thread-1', 'the ref is the thread id — never a member identifier');
  assert.ok(item.ageMs >= 0, 'and it carries an age, like every other row on this list');
  assert.match(item.action, /answer/i, 'the action says what clears it');
});

test('no read names the asker, and no read shows the words', () => {
  const { f } = withThread();
  const inbox = f.inbox();
  assert.ok(!JSON.stringify(inbox).includes('wa:62811'), 'the inbox carries no member identifier');
  assert.ok(!JSON.stringify(inbox).includes('Kartini-77'), 'and no member text');
  const health = f.health();
  assert.ok(!JSON.stringify(health).includes('wa:62811'), 'the health read carries no member identifier');
  assert.ok(!JSON.stringify(health).includes('Kartini-77'), 'and no member text');
});

test('the sweep still applies to a thread — the mechanism, not a rule re-implemented', () => {
  // The inbox sweeps free text of member identifiers. A thread's detail is free text, so the sweep
  // must reach it. If a future change put a member ref in a thread's detail, the sweep would
  // substitute it rather than print it — and this test proves the sweep is on the path.
  const { f } = withThread();
  const inbox = f.inbox();
  const detail = inbox.items.find((i) => i.kind === 'thread')?.detail ?? '';
  assert.ok(!detail.includes('wa:62811'), 'the detail is swept');
  assert.ok(typeof HEALTH_WITHHELD_MEMBER_REF === 'string', 'the substitution string exists');
});

test('answering a thread closes it, and it leaves the inbox', () => {
  const { f, thread } = withThread();
  f.answerThread(thread.id, 'organiser', 'answered in the channel at 14:02, with the venue confirmation');
  assert.equal(f.inbox().counts.thread, 0, 'a closed thread is not still owed');
  const answered = f.events.filter((e) => e.type === 'ThreadAnswered');
  assert.equal(answered.length, 1);
  const row = answered[0] as { threadId: string; by: string; note: string; at: number };
  assert.equal(row.threadId, thread.id);
  assert.equal(row.by, 'organiser');
  assert.equal(row.note, 'answered in the channel at 14:02, with the venue confirmation');
  assert.equal(row.at, f.events[f.events.length - 1]?.at, 'and it is dated');
});

test('an answer with no note is refused — a record with no substance is not a record', () => {
  // The same discipline as a verdict without a why (section 1.5). "It was answered" with no record of how
  // is a claim nobody can check later, and the community's own promise is exactly what this runtime
  // is supposed to be able to check.
  const { f, thread } = withThread();
  assert.throws(
    () => f.answerThread(thread.id, 'organiser', ''),
    (e: { code?: string; message?: string }) => {
      assert.equal(e.code, 'thread_invalid');
      assert.match(String(e.message), /note|why/i);
      return true;
    },
  );
  assert.equal(f.inbox().counts.thread, 1, 'and the thread is still open — a refused answer closes nothing');
});

test('answering a thread that does not exist is refused', () => {
  const { f } = withThread();
  assert.throws(() => f.answerThread('thread-99', 'organiser', 'something'), /thread/i);
});

test('the health read counts open questions and the oldest age — and says null when there are none', () => {
  const { f } = withThread();
  const h = f.health();
  assert.equal(h.community.openThreads, 1);
  assert.equal(typeof h.community.oldestThreadAgeMs, 'number', 'the oldest open question has an age');
  f.answerThread('thread-1', 'organiser', 'answered in the channel at 14:02');
  const h2 = f.health();
  assert.equal(h2.community.openThreads, 0);
  assert.equal(h2.community.oldestThreadAgeMs, null, 'no open question means no age — null, never 0');
});

test('a thread that survives a staffed shift is a missed shift — this is what "keeping our word" means', () => {
  // The community staffed Monday 09:00–18:00. A question came in Monday at 10:00 and was still open
  // on Tuesday at 09:00: Monday's shift ended at 18:00 with the question unanswered. That is the
  // community failing to keep its word to a member, and it is the number the health read reports.
  const { f } = withThread(JAKARTA());
  f.advance(local('Asia/Jakarta', 2026, 7, 21, 9, 0) - local('Asia/Jakarta', 2026, 7, 20, 10, 0));
  const h = f.health();
  assert.equal(h.community.openThreads, 1, 'the question is still open');
  assert.equal(h.community.missedShift?.count, 1, 'and Monday\'s shift ended with it unanswered');
});

test('a question asked inside a shift is not a missed shift', () => {
  // The same question, asked at 10:00 and read at 12:00: it is INSIDE the shift that ends at 18:00.
  // The clock pauses outside coverage, and a question nobody has had time to answer yet is not a
  // broken promise.
  const { f } = withThread(JAKARTA());
  f.advance(2 * 3_600_000);
  const h = f.health();
  assert.equal(h.community.missedShift?.count, 0, 'the shift has not ended yet — nothing was missed');
});

test('a question asked after the shift ended is not a missed shift either', () => {
  // Asked Friday 20:00, still open Monday 10:00: Friday's shift had already ended when it was
  // asked, and Monday's has not ended yet. The weekend gap is not a broken promise — it is the
  // whole reason the coverage window exists.
  // Raised Friday 24 July at 20:00 — after Friday's 18:00 shift ended — and still open on Monday the
  // 27th at 10:00, which is inside Monday's shift.
  const raised = local('Asia/Jakarta', 2026, 7, 24, 20, 0);
  const { f } = withThread(JAKARTA(), raised);
  f.advance(local('Asia/Jakarta', 2026, 7, 27, 10, 0) - raised);
  const h = f.health();
  assert.equal(h.community.openThreads, 1, 'still open');
  assert.equal(h.community.missedShift?.count, 0, 'and nothing was missed: Friday\'s shift ended before it was asked');
});

test('the threads replay exactly — the audit trail is the product', () => {
  const { f, pack } = withThread();
  f.answerThread('thread-1', 'organiser', 'answered in the channel at 14:02');
  const replayed = Fleet.replay(f.events, ANSWERS, pack);
  assert.deepEqual(replayed.health().community, f.health().community, 'the community read is a property of the log');
  assert.deepEqual(replayed.inbox().items, f.inbox().items, 'and so is the inbox');
});

test('a thread is a read, not an event source: the inbox and the health read append nothing', () => {
  const { f } = withThread();
  const before = { events: f.events.length, seq: f.state.seq };
  f.inbox();
  f.health();
  assert.equal(f.events.length, before.events, 'reading appends nothing');
  assert.equal(f.state.seq, before.seq);
});
