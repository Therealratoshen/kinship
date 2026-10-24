# Shadow-mode event template

Copy this file to `event-<slug>.md` for each run. Fill it **before** the event where marked
T-1; the rest gets filled as cards come in. Time to complete on a real event: under 20 minutes
spread across the week. If it takes longer than that, the fleet is adding load rather than
removing it — log that in the "honest cost" section, because it is a kill condition, not a
nuisance.

---

## Event

| Field | Value |
|---|---|
| Name / edition | *(e.g. Kopdar #N)* |
| Date (**E-day**) | |
| Format | ☐ offline ☐ online ☐ hybrid |
| Venue / platform | |
| Expected attendance | |
| Community / channel(s) | |
| Sponsor(s), if any | *(may be "none" — never fabricated)* |
| Escalation contact (human) | |
| Fleet config used | `pack.local.yaml` @ `<git sha or version>` |
| Autonomy level per lane | all `draft` unless a prior run licensed otherwise — list any exceptions and which run licensed them |

## Baseline — how this event is normally run (fill at T-7, honestly)

The comparison that matters is **against your own manual baseline**, not against an abstract
"before AI". Write what you'd actually do:

- Promo: *(e.g. "I write one WA broadcast, copy-paste to Telegram, post Discord by hand")*
- Reminders: *(sheets? forward-to-self? nothing?)*
- Day-of: *(who chases no-shows, what happens with the location message)*
- Recap: *(do you do one at all? how long does it take?)*
- Total hands-on time, your estimate: `____ h` `[record as estimate; do not publish as a saving]`

---

## Card log

One row per card the fleet proposed. **The "why" column is the data.** A reject without a
reason is a lost finding.

| # | Lane | Card (what was proposed) | Verdict | Autonomy level | Edit/reject **why** | Time to decide |
|---|---|---|---|---|---|---|
| 1 | slow_commitment · draft-promo | ID+EN promo post | ☐ approve ☐ edit ☐ reject | draft | | |
| 2 | slow_commitment · send-reminder | T-7d / T-1d schedule | | draft | | |
| 3 | fast_reply · answer-question | Drafted answer to a member FAQ | | draft | | |
| 4 | day-of · nudge-no-show | 1:1 nudge copy (opt-out honoured?) | | draft | | |
| 5 | slow_commitment · assemble-recap | Turnout + 3 photo picks + next-date poll | | draft | | |
| 6 | moderator · flag | `flagged(reason, confidence)` — acted on? | | flag | | |

**Approval-without-edit rate:** `___ / ___` (PRD section 9 target: ≥50% by phase-2 exit; this is the
trust proxy, and it is also the quality signal — a low rate means the drafts aren't usable,
which is a rebuild question, not a UX question).

---

## Member-lens counters — derived, not filled in

The member is the only party in this run who never approved a card, so their side gets counted from the
rows you already wrote above. **No new logging. Five tallies, ~2 minutes, at the end of the week** — each
one is a field that would have been impossible to reconstruct after a send (`community/MEMBER-LENS-2026-10-17.md`
section 5; PRD FR-5).

| Counter | Count | What a non-zero means | What a permanent zero means |
|---|---|---|---|
| Member-facing cards that needed a disclosure line | `___ / ___` | disclosure is real work, not a footer | if every card is internal, the run never tested section 2.8 |
| Cards with a **named human** in the approval path (`on_behalf_of` non-null) | `___ / ___` | FR-5.1 is honourable at build time | a zero here means the field does not exist, **not** that nobody asked |
| Times a suppression / opt-out check changed or blocked a card | | a member's "Stop." had an effect | check the reason: unimplemented is a defect, unexercised is fine |
| Times a first-contact message had **no** suppression row and was held anyway | | fail-closed on unknown consent worked (FR-5.2) | if nothing was held, was anything actually checked? |
| Names the recap / sponsor report had to drop to stay aggregate | | the floor did real work at assembly time | zero is good **only** if the artefact was assembled with the floor set |

> **Read this table the right way before writing it off.** A zero is not a pass. Each of these five is
> either *satisfied*, *unexercised*, or *unimplemented*, and only the first is evidence. Mark which one it
> is per row — that single letter is the whole output of this section, and it is what decides whether FR-5
> stays bound in v0 or slips to phase 2 (`PLAN.md` capacity ledger).

One question, asked of anyone who notices the fleet at all, and recorded verbatim if asked: **"who wrote
this?"** Their answer, and whether the answer was a human's name or a shrug, is the cheapest read on
FR-5.1 that exists.

## ⚠️ Caught near-miss

The single most valuable section of this file. Record anything the fleet got **wrong and the
gate stopped**: a wrong time, a wrong venue, an invented sponsor, a name misspelled, copy that
was too formal, a reminder that would have double-sent.

| What the fleet proposed | What was actually true | How it was caught | Would it have reached a member at level 1? |
|---|---|---|---|
| | | | |

> Prediction P-1 in `TEST-PROTOCOL.md` section 3 says the after-feeling lands **only** when the gate
> visibly catches something. If this table is empty after a "clean" run, that is not a success
> — it is the condition under which P-1 predicts relief without trust. Note it explicitly.

Also record the inverse: **anything the fleet got right that you would have missed.** (A
forgotten reminder window, a duplicate email collapsed, an opt-out honoured.) Both directions
count as evidence; only the first is a governance story and only the second is a load story.

## Incidents

| Type | Happened? | Detail |
|---|---|---|
| Member reacted to an agent utterance | ☐ | *(sub-question in section 2 — observe, don't settle)* |
| Shatter-guard would have fired | ☐ | complaint → freeze-to-draft; did it fire spuriously? |
| Two agents wanted the same thread | ☐ | 409 + no-retry behaviour correct? |
| Ghost-watcher attempt | ☐ | agent claimed a follow-up with no persisted monitor |
| Budget/queue cap hit | ☐ | `truncated=true`? partial kept? no retry storm? |
| Anything sent to a member without approval | ☐ | **STOP THE RUN if yes.** Record, and treat as a spec defect, not a pilot hiccup. |
| A card addressed a member who had said stop | ☐ | **Also a stop-the-run defect** (FR-5.2): suppression is cross-lane and beats any grant, so a lane that could reach them is a lane built wrong. |
| A member-visible draft with no human named behind it | ☐ | FR-5.1: `on_behalf_of` is written at send time or never. An empty field is a defect, not a TODO. |
| A name that would have left the community in a recap/report | ☐ | FR-5.3: unrecoverable after assembly. Record what the floor caught and what it did not. |

## Honest cost

| | |
|---|---|
| Minutes spent reviewing cards | |
| Minutes this template took to fill | |
| Did reviewing feel lighter or heavier than doing the work? | |
| What would make you skip reviewing next time? | *(that impulse is what shadow mode exists to expose)* |

## Feeling check (do this even if you skip everything else)

Rate both pairs at T-1 (day before) and T+1 (day after), in `FEELING-DIARY.md`.
That is the measurement the whole conditional GO was waiting on.

## Verdict for this event

- Run again for event #2? ☐ yes ☐ no — **why**:
- Any lane you'd now want at `opt-in-auto`, and which run licensed it:
- Any lane you'd *never* delegate, and what made that clear:
- One sentence, in your own words, about what this was like: `______`
