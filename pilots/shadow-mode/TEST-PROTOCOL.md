# Shadow-mode test protocol

**This is the one piece of work that converts this repository's assumptions into evidence.**
It is copied from the real test plan in `../../design-thinking/05-test-results.md` section B and made
runnable against a single event. Predictions were fixed on 2026-10-17; **do not edit section 3 after
the event** — add a row to section 6 instead. Editing a prediction after the fact destroys the only
measurement value this file has.

---

## 1. What shadow mode is

The fleet runs **draft-only** on a real event. It produces plans, promo copy (ID+EN), reminder
schedules, and recap drafts. **It sends nothing to any member.** The organiser posts, edits, or
ignores each card, exactly as they would have done without the fleet.

Why draft-only and not a real trial: it measures the thing we actually need (does a supervised
fleet change the organiser's felt load and do they keep it?) with zero member risk, zero
WhatsApp cost/ToS exposure, and no identity-disclosure incident while the reaction to agent
replies is still unknown.

## 2. Question under test (one, per protocol)

> Does a supervised event-ops fleet produce the feeling shift **overwhelmed → in control** in a
> real organiser — and the behavioural sign of trust (kept authority, requested escalation,
> second event)?

Sub-question, observed not settled: how do members react to an agent that identifies itself
(the P1 storyboard's frame 3, the highest-risk moment).

**Users:** Filbert as baseline (n=1, honest bias note), plus 2 chapter organisers after consent,
plus **1 organiser outside the network** for bias correction. W10 of `PLAN.md` is the
conversation window for the outsider.

## 3. Predictions — written before the run (2026-10-17)

| # | Prediction | If wrong, it means |
|---|---|---|
| P-1 | The after-feeling lands **only when the gate visibly catches something**. A clean silent run gives relief, not trust. | The POV ("governance is the product, not capability") is wrong → **back to Define**, not to a feature list. |
| P-2 | Diary moves ≥2 steps on the 8-point pair for the organiser. | Feelings didn't move → polite self-praise counts as **KILL**. |
| P-3 | The organiser asks to raise autonomy for **reminders** first, and refuses it for member-facing replies. | If they escalate member-facing lanes before trust data justifies it, that is the Say-vs-Do gap inverted and worth logging as its own finding. |
| P-4 | Refusal rate for full autonomy among external organisers: near-total (matches E6). | If someone grants day-one autonomy, E6's "human-gated is mandated" needs re-reading. |
| P-5 | ≥60% of value-producing work comes from **more than one** agent's tools. | If one agent does it all, the fleet claim (D3) is overkill → collapse scope to one agent + rails (PRD section 10 risk 1). |
| P-6 *(added 2026-10-17, after the member-lens pass and before any run — not part of the original five, and not a section 4 gate)* | At least one card per run needs a **member-rights field the organiser did not plan for**: a suppression check that changed the copy, an `on_behalf_of` name that had to be real, or a name dropped to keep a report aggregate. | If the counters in `EVENT-TEMPLATE.md` are zero-for-the-wrong-reason (unimplemented) across three runs, FR-5's retrofit-cost argument is unsupported and the member group moves to phase 2/3 as triaged. If they are zero because nothing was needed, that is a real finding about a draft-only run and says nothing about production. **Either way this does not change section 4's verdict** — it changes where FR-5 sits in the sequence. |

## 4. Thresholds — pre-committed, decide here and nowhere else

| Verdict | Trigger | Consequence |
|---|---|---|
| **CONTINUE-TO-BUILD** | ≥2 of 3 organisers run event #2 with the fleet **and** ≥1 requests an autonomy increase. | Phase 2 (`PLAN.md` W6–W9): publish spec + packs. |
| **REPOSITION** | Approval-gated work functions, but member-facing identity triggers complaints. | Back-office wedge. New PRD. This is section 2.4's disqualifying answer, handled as designed — not a failure of the plan. |
| **KILL** | No second-event behaviour after 4 weeks of real events. Silence and polite praise both count. | Return to Define. The corpse shape it would have been is documented: GPT Store, Flarum, 164 dead AI tools. |

## 5. Instruments

- `FEELING-DIARY.md` — semantic pairs, rated T-1 day, T+1 day, and after event #2.
- `EVENT-TEMPLATE.md` — the per-card approval log (approve / edit / reject + **why**), plus the
  near-miss section.
- `EVENT-TEMPLATE.md` → **Member-lens counters** — five tallies derived from rows already written, plus the
  verbatim answer to "who wrote this?" if anyone asks. This is the only instrument that reads the run from the
  member's side, and it costs ~2 minutes because it invents no new logging.
- Behavioural signs checklist (tick, with the date it happened):
  1. ☐ Re-runs the fleet for event #2 **without being asked**
  2. ☐ Requests an autonomy *increase* for any lane
  3. ☐ Tells another organiser unprompted
  4. ☐ Abandons the spreadsheet / forward-to-self workaround
  5. ☐ Grants WA write for reminders
- Interview guide (15 min, semi-structured — stories not opinions). Question 5 is the important
  one:
  1. "Tell me about your last event — week before to week after."
  2. "Walk me through the moment it felt heaviest. What exactly were you doing?"
  3. "Show me what you used to manage any of that — bots, sheets, forwards."
  4. "Have you ever let an AI post to your members? What happened?" (best AND worst)
  5. **"What would make you *not* use this again?"**
  6. "Anything I should have asked?"

## 6. Results — fill in after each run

**Member-lens counters per run** (P-6 evidence; one letter per row: **S** satisfied · **U** unexercised · **D** defect):

| Run | Disclosure needed / possible | `on_behalf_of` named | Suppression changed a card | Unknown-consent held | Names dropped at the floor | S/U/D |
|---|---|---|---|---|---|---|
| | | | | | | |
| | *(no runs yet — as of 2026-10-17 this row is empty, and that is the honest state)* | | | | | |

**Iteration decision** (CONTINUE / REPOSITION / KILL, per section 4, with the number that produced it):

> `[to be written in W5 — do not pre-fill]`
