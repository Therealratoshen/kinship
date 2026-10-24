/**
 * one-complete-example.ts — the whole of Kinship, in one file, using only the public surface.
 *
 *   node runtime/examples/one-complete-example.ts
 *
 * **What this is.** The example an adopter copies. It boots a pack, asks the fleet to do something,
 * reads the card or the refusal, records a human decision, and replays the log to check it. Every
 * import below is from `../src/index.ts` — the **public surface** — and nothing reaches past it, so
 * this file is simultaneously the documentation and the test: if the public surface breaks, this
 * breaks, and `scripts/vendoring.test.mjs` runs it from **outside this repository**.
 *
 * **The five steps, and what each one is for.**
 *
 * 1. **Boot a pack.** The pack declares the community, the action classes, the ladder and the
 *    budget; the answers say who this community is. A pack that does not boot does not get
 *    half-booted.
 * 2. **Attempt an action.** The fleet *proposes*. It never sends.
 * 3. **Read the outcome.** A card means "a human has to decide this"; a refusal means "the rules
 *    say no", and the refusal names the rule that fired. Both are outcomes, not errors.
 * 4. **Record a human decision.** The seat is the one the organisation declared. A verdict without
 *    a reason is refused, because a verdict nobody can read back is not a record.
 * 5. **Replay and verify.** The log is the point: it is append-only, it folds back to the state,
 *    and a row that has been tampered with does not fold.
 */
import {
  Fleet,
  loadPack,
  runActions,
  createRun,
  replay,
  KinshipError,
  type CommitArgs,
} from '../src/index.ts';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(HERE, '..', '..', 'packs', 'kopdar-ops');

/** The eight answers the shipped example pack asks for. A real community writes its own. */
const ANSWERS = {
  community_name: 'AI Builders ID',
  schedule: 'every other Saturday',
  venue_source: 'manual',
  sponsor_list: 'none yet',
  escalation_contact: 'organiser',
  member_notice_text: 'bot ini asisten organiser',
  rsvp_source_of_truth: 'google form',
  partner_policy: 'Kopdar Sebelah saja',
};

// --- 1. boot a pack -------------------------------------------------------------------------------------
const pack = loadPack(PACK_DIR);
const fleet = Fleet.boot(pack, ANSWERS, Date.parse('2026-11-07T12:00:00Z'));
console.log(`booted ${pack.key} — schema ${pack.schema}, ${Object.keys(pack.agents).length} agents`);

// --- 2. attempt an action --------------------------------------------------------------------------------
// The fleet proposes. `draft.reminder` sits at `draft` on the autonomy ladder, so the attempt
// produces a card for a human rather than a send. Nothing is delivered: the runtime ships no
// channel transport, and a member-facing commit refuses `no_transport` whoever asks.
const attempt: CommitArgs = {
  actionClass: 'draft.reminder',
  agent: 'event-ops',
  origin: { kind: 'event', id: 'ev-1' },
  phase: 't-minus-1',
  text: {
    id: 'Reminder: Kopdar besok jam 19:00.',
    en: 'Reminder: Kopdar tomorrow at 19:00.',
  },
};

const result = fleet.attempt(attempt);
if (!result.card) {
  // A refusal is an outcome, not a crash: the rules said no, and the refusal says which rule.
  console.error(`refused: ${result.refusal?.code ?? 'unknown'} — ${result.refusal?.detail ?? ''}`);
  process.exit(1);
}
console.log(`drafted card ${result.card.id} — waiting on a human`);

// --- 3. read the outcome ----------------------------------------------------------------------------------
const pending = fleet.state.cards.get(result.card.id);
console.log(`card ${pending?.id}: ${pending?.status}, action class ${pending?.actionClass}`);

// --- 4. record a human decision ---------------------------------------------------------------------------
// The seat is the one the organisation declared, and the reason is not optional. This is the step a
// model must not be able to take for itself: the whole point of the layer is that a *person* signs.
try {
  fleet.decideCard(result.card.id, {
    verdict: 'approve',
    by: 'organiser',
    why: 'the date and the venue read back correctly',
  });
  console.log(`approved by organiser — the reason is in the log`);
} catch (e) {
  if (e instanceof KinshipError) {
    console.error(`refused: ${e.code} — ${e.message}`);
    process.exit(1);
  }
  throw e;
}

// --- 5. replay and verify ----------------------------------------------------------------------------------
// The log is the artefact. `fleet.events` is what a host writes to disk, and replaying it must fold
// back to the state the fleet holds.
const events = fleet.events;
const replayed = replay(events);
const verified = Fleet.verifyLog(events, ANSWERS, pack, { state: replayed });
console.log(`replayed ${events.length} rows into a fresh state — ${replayed.cards.size} card(s) in it`);
console.log(`replayed ${events.length} rows — verified: ${verified.ok}`);
for (const problem of verified.problems) console.error(`  ${problem.kind}: ${problem.detail}`);

// And the run cap: one run, one budget, one bound — and the report says what it bounded.
const report = runActions(fleet, [], createRun());
console.log(`run report: ${report.actions} action(s), ${report.executed} executed, ${report.refused} refused, cap ${report.cap} (${report.capScope})`);

if (!verified.ok) process.exit(1);
