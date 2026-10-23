/**
 * The planner — how a community's own words become actions the fleet takes on its own.
 *
 * The runtime could already adjudicate an action (`Fleet.attempt`), meter a run (`runner.ts`), schedule
 * and fire a timer (`lifecycle.ts`), and put a card in front of a human (`cards.ts`). What it could not
 * do was **decide what to do**: the caller handed it the copy on a command line, one `--text-id` at a
 * time. A host that invented the drafts would be inventing behaviour the pack does not have, so the
 * host does not think — and the result was a runtime that could judge a card but never produce one.
 *
 * This file is the missing half, and it has exactly one job: **turn a community's own copy and its own
 * event into the actions the fleet will take, at the times it will take them.**
 *
 * Three rules, each with a test that can fail:
 *
 *  1. **The copy is the community's, and it is filled from facts the community supplied.** The planner
 *     holds no copy of its own and invents no fact. A `{slot}` with no value is not a blank left in a
 *     member-facing message — it is a refusal, because a message with a hole in it is worse than no
 *     message: it ships a lie about a venue by leaving the venue out.
 *  2. **A lane that the pack does not declare is not attempted.** The pack's `agents.*.autonomy_by_class`
 *     is the inventory of what this community's fleet may do. A template for a class no agent declares
 *     is a copy written for a lane that does not exist, and the planner says so instead of inventing a
 *     lane to put it in.
 *  3. **Only a timer-backed phase gets a timer.** The pack's `event-lifecycle` skill says a phase moves
 *     "on a named condition: a human verdict, a fired timer with a persisted wake row, or a
 *     deliverable that regenerated successfully — **never on elapsed time alone**." So the planner
 *     schedules a wake for a phase only where the wake IS the named condition, and a template for any
 *     other phase is refused rather than quietly given a clock it is not allowed to have.
 *
 * And the disclosure. The pack's `promo-copy` skill says the disclosure line "is present before
 * approval, never added by the runtime" — so the community writes it, as the `{disclosure}` slot, and
 * the planner fills that slot with the runtime's canonical line for that language. The community's
 * choice of *where* the line goes is the community's; the line's wording is canonical per language, so
 * an improvised translation is not disclosure. A copy that omits the slot is refused at plan time, which
 * is before the event rather than at the commit that would have been refused anyway.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommunityPlan, renderCopy, planWakes } from '../src/plan.ts';
import { disclosureLine } from '../src/disclosure.ts';
import { makePack } from './helpers.ts';
import type { Packed } from '../src/types.ts';

const PACK = makePack({
  'event-ops': { 'draft.reminder': 'draft' },
  engagement: { 'draft.promote': 'draft' },
});

const ANSWERS = { community_name: 'AI Builders ID' };

/** A community's plan, written the way a community writes it. */
const PLAN_YAML = `
templates:
  - action_class: draft.reminder
    phase: t-minus-1
    agent: event-ops
    copy:
      id: |-
        Halo {community_name}! Besok {date} jam {time} di {venue}.
        Daftar: {registration}
        {disclosure}
      en: |-
        Hi {community_name}! Tomorrow {date} at {time}, at {venue}.
        Sign up: {registration}
        {disclosure}

event:
  id: kopdar-2026-11-07
  starts_at: "2026-11-07T19:00:00+07:00"
  venue: "Studio 一, Sudirman"
  registration: "bit.ly/kopdar-nov"
`;

// --- the parser ---------------------------------------------------------------------------------------

test('the community plan parses: its templates, its copy per language, and its event', () => {
  const plan = parseCommunityPlan(PLAN_YAML);
  assert.equal(plan.templates.length, 1);
  const t = plan.templates[0]!;
  assert.equal(t.actionClass, 'draft.reminder');
  assert.equal(t.phase, 't-minus-1');
  assert.equal(t.agent, 'event-ops');
  assert.ok(t.copy.id!.includes('{venue}'), 'the Indonesian copy keeps its slot');
  assert.ok(t.copy.en!.includes('{venue}'), 'the English copy keeps its slot');
  assert.notEqual(plan.event, null);
  assert.equal(plan.event!.id, 'kopdar-2026-11-07');
  assert.equal(plan.event!.startsAt, '2026-11-07T19:00:00+07:00');
  assert.equal(plan.event!.facts.venue, 'Studio 一, Sudirman');
});

test('a plan with no templates and no event parses to nothing, rather than to a failure', () => {
  const plan = parseCommunityPlan('community_name: "AI Builders ID"\n');
  assert.deepEqual(plan.templates, []);
  assert.equal(plan.event, null);
});

test('a copy in a block scalar keeps its line breaks', () => {
  const plan = parseCommunityPlan(PLAN_YAML);
  // `|-` strips the trailing newline; the interior breaks are the community's own.
  assert.ok(plan.templates[0]!.copy.id!.includes('\n'));
  assert.equal(plan.templates[0]!.copy.id!.endsWith('\n'), false);
});

test('a template with no copy at all is refused — a lane with no words is not a lane', () => {
  assert.throws(
    () => parseCommunityPlan('templates:\n  - action_class: draft.reminder\n    phase: t-minus-1\n    agent: event-ops\n'),
    /copy/i,
  );
});

test('a template with no action class is refused, and so is one with no phase', () => {
  assert.throws(() => parseCommunityPlan('templates:\n  - phase: t-minus-1\n    copy:\n      id: "hi"\n'), /action_class/);
  assert.throws(() => parseCommunityPlan('templates:\n  - action_class: draft.reminder\n    copy:\n      id: "hi"\n'), /phase/);
});

// --- slot filling ------------------------------------------------------------------------------------

test('a slot is filled from the facts the community supplied', () => {
  const r = renderCopy('Besok {date} di {venue}', { date: '7 November', venue: 'Studio' });
  assert.equal(r.text, 'Besok 7 November di Studio');
  assert.deepEqual(r.unfilled, []);
});

test('a slot with no fact is reported, and the text keeps the hole so nothing hides it', () => {
  const r = renderCopy('Besok {date} di {venue}', { date: '7 November' });
  assert.deepEqual(r.unfilled, ['venue']);
  assert.equal(r.text, 'Besok 7 November di {venue}');
});

test('a copy with no slot at all renders to itself', () => {
  const r = renderCopy('no holes here', {});
  assert.equal(r.text, 'no holes here');
  assert.deepEqual(r.unfilled, []);
});

// --- the plan ----------------------------------------------------------------------------------------

test('a plan with no event schedules nothing — there is no time to schedule against', () => {
  const plan = parseCommunityPlan(PLAN_YAML);
  const out = planWakes({ templates: plan.templates, event: null, pack: PACK, answers: ANSWERS });
  assert.deepEqual(out.wakes, []);
  assert.equal(out.problems.length, 1);
  assert.equal(out.problems[0]!.code, 'template_incomplete');
});

test('a well-formed template becomes a wake with the action it will attempt', () => {
  const plan = parseCommunityPlan(PLAN_YAML);
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.deepEqual(out.problems, []);
  assert.equal(out.wakes.length, 1);
  const w = out.wakes[0]!;
  assert.equal(w.eventId, 'kopdar-2026-11-07');
  assert.equal(w.action.actionClass, 'draft.reminder');
  assert.equal(w.action.agent, 'event-ops');
  assert.equal(w.action.phase, 't-minus-1');
  // The copy is filled in every declared language, and it carries the canonical disclosure.
  assert.ok(w.action.text.id!.includes('Studio 一, Sudirman'));
  assert.ok(w.action.text.en!.includes('bit.ly/kopdar-nov'));
  assert.ok(w.action.text.id!.includes(disclosureLine('id', 'AI Builders ID')));
  assert.ok(w.action.text.en!.includes(disclosureLine('en', 'AI Builders ID')));
});

test('the wake fires one day before the event, in the community\'s own local time', () => {
  const plan = parseCommunityPlan(PLAN_YAML);
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  // 2026-11-07T19:00:00+07:00 is 12:00:00Z; one day earlier is 2026-11-06T12:00:00Z.
  assert.equal(out.wakes[0]!.nextCheckAt, Date.parse('2026-11-06T19:00:00+07:00'));
});

test('a slot the event does not supply refuses the template — the fleet does not ship a hole', () => {
  const plan = parseCommunityPlan(PLAN_YAML.replace('registration: "bit.ly/kopdar-nov"', 'sponsor: "none yet"'));
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.equal(out.wakes.length, 0, 'a template with a hole schedules nothing');
  assert.equal(out.problems.length, 1);
  assert.equal(out.problems[0]!.code, 'slot_unfilled');
  assert.ok(out.problems[0]!.detail.includes('registration'));
});

test('a lane no agent in the pack declares is refused, not invented', () => {
  const plan = parseCommunityPlan(PLAN_YAML.replace('action_class: draft.reminder', 'action_class: draft.something-else'));
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.equal(out.wakes.length, 0);
  assert.equal(out.problems[0]!.code, 'lane_undeclared');
});

test('a template naming an agent the pack does not have is refused', () => {
  const plan = parseCommunityPlan(PLAN_YAML.replace('agent: event-ops', 'agent: nobody'));
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.equal(out.wakes.length, 0);
  assert.equal(out.problems[0]!.code, 'lane_undeclared');
});

test('a phase that is not timer-backed gets no timer — the pack forbids moving a phase on elapsed time alone', () => {
  const plan = parseCommunityPlan(PLAN_YAML.replace('phase: t-minus-1', 'phase: promoting'));
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.equal(out.wakes.length, 0);
  assert.equal(out.problems[0]!.code, 'phase_not_timer_backed');
  assert.ok(out.problems[0]!.detail.includes('t-minus-7'), 'the problem names the phases that do have a timer');
});

test('a copy with no disclosure slot is refused before approval, not at the commit', () => {
  const plan = parseCommunityPlan(PLAN_YAML.replace('{disclosure}', ''));
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.equal(out.wakes.length, 0);
  assert.equal(out.problems[0]!.code, 'disclosure_missing');
});

test('the planner writes no copy of its own — every word in a wake came from the community', () => {
  const plan = parseCommunityPlan(PLAN_YAML);
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  const text = out.wakes[0]!.action.text;
  // Every line of the community's copy is still there, and the only thing added is the disclosure
  // the community asked for by name.
  assert.ok(text.id!.includes('Halo AI Builders ID!'));
  assert.ok(text.id!.includes('Daftar: bit.ly/kopdar-nov'));
});

test('a pack that declares another language pair gets the copy in the languages it declares', () => {
  const pack: Packed = { ...PACK, locale: ['en', 'ar'] };
  const plan = parseCommunityPlan(PLAN_YAML);
  const out = planWakes({ templates: plan.templates, event: plan.event, pack, answers: ANSWERS });
  // The community wrote `id` and `en`; this pack runs in `en` and `ar`. The copy it has is used, and
  // the language it does not have is a refusal, not an empty string shipped to a member.
  assert.equal(out.wakes.length, 0);
  assert.equal(out.problems[0]!.code, 'locale_missing');
});

// --- the three HIGH defects the verifier found (D63) ----------------------------------------------------

test('an EMPTY fact is not a fact — the message ships a hole, so the template is refused', () => {
  // `venue: ""` is a value to a naive reader and a hole to a member. The rule says a slot with no
  // value refuses the template — and an empty string is the absence of a value, not a value.
  const plan = parseCommunityPlan(PLAN_YAML.replace('registration: "bit.ly/kopdar-nov"', 'venue: ""'));
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.equal(out.wakes.length, 0, 'a template with an empty fact schedules nothing');
  assert.equal(out.problems[0]!.code, 'slot_unfilled');
  assert.ok(out.problems[0]!.detail.includes('venue'));
});

test('a MALFORMED slot is reported, not shipped — `{venue }` is a typo, not prose', () => {
  const plan = parseCommunityPlan(PLAN_YAML.replace('{venue}', '{venue }'));
  const out = planWakes({ templates: plan.templates, event: plan.event, pack: PACK, answers: ANSWERS });
  assert.equal(out.wakes.length, 0, 'a copy with a typo\'d slot is never sent');
  assert.equal(out.problems[0]!.code, 'slot_malformed');
  assert.ok(out.problems[0]!.detail.includes('venue'), 'and the problem names what it looked like');
});

test('a brace pair that is not a slot is left alone — a promo may contain braces', () => {
  const r = renderCopy('kirim ke { } kalau perlu', { venue: 'Studio' });
  assert.equal(r.text, 'kirim ke { } kalau perlu');
  assert.deepEqual(r.unfilled, []);
  assert.deepEqual(r.malformed, []);
});

test('renderCopy reports an empty value as unfilled and a malformed slot separately', () => {
  const r = renderCopy('di {venue} pada {date!}', { venue: '', date: '7 Nov' });
  assert.deepEqual(r.unfilled, ['venue']);
  assert.deepEqual(r.malformed, ['date!']);
});
