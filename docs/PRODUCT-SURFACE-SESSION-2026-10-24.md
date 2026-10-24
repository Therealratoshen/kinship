# Product-surface session — every question, every answer, and where it landed (2026-10-24)

> **Date:** 2026-10-24 · **Status:** an index, not a record. The record is `DECISIONS.md`; this file
> exists so the owner can check the session's work without reading a thousand lines of prose.
>
> **What this file is.** The session asked twenty-one questions about the product's shape and got
> answers to all of them — eight from the owner in his own words, the rest decided by Mavis under
> the delegation he gave at the end (*"you can decide it on your own as later if there is an
> improvement then we can update it based on the community wants"*). **This file is the index of
> that: which question, which answer, who gave it, the row it became, and what it costs.**
>
> **What this file is not.** It is not a transcript, and it is not the authority. Where this file and
> `DECISIONS.md` disagree, the log is right — and where this file paraphrases a question, the
> session's own wording is the source. **The answers it records are decisions; none of them is
> ratified yet**, and the ratification range is the owner's to ratify or reject in one sentence.

## 1. The eleven rows the session produced

| # | The question | The answer | Who answered | Row | What it costs |
|---|---|---|---|---|---|
| Q6 | Who decides the shape of the human check? | **The community** — per-community, and the check's *existence* is a floor. | **Owner** | **D104** | A new manifest tier; 13 tests shipped. The pack-level override and every other capability are **not** built. |
| Q7 | How many phases does a card have? | One — and then, on the next question, **none at all**. | **Owner**, then superseded | **D101** | A pack-format break. A pack that says `phase:` stops parsing. D99 (PR #24) is withdrawn. |
| Q8 | What makes a good event template? | **The parser's refusals are the fields.** A template is the plan file in a form a human fills in. | **Owner** (asked for the study) | **D110** | Nothing to build yet — the study shipped on 2026-10-24. |
| Q9 | Which transports? | **WhatsApp, Telegram, Discord** — plus the webhook the session added, because a community whose platform is not on the list should not be a community we refuse. | **Owner** (three) + **Mavis** (the webhook) | **D105** | The adapters are **not built**, and D21's *\"no channel transport\"* promise has to be re-read rather than repeated. |
| Q10 | Whose log format is it? | **The community's** — the format and the extra fields. **The event vocabulary stays the project's**, because the log is the audit trail. | **Owner**, narrowed | **D108** | The community's own fields are **not built**; they are the manifest's next capability. |
| Q11 | What can a community configure? | **All of it that changes what the fleet may do** — as a **capability manifest**, each capability saying why it is on, and the seat that answers resolved from the community's declared seat set. | **Owner** (*"Q11, all"*) + **Mavis** (the shape) | **D104** | Shipped with the manifest. The vocabulary grows only with enforcement, so one capability exists today. **The first version named the seat in the manifest, and the MCP adapter's own test caught it** — a seat written twice is a seat that drifts (D100's lesson, one layer down). |
| Q12 | What replaces the phase field? | **Nothing — the lane is the action class, the schedule is a `when:`.** | **Owner** (*"idk how to answer but you decide it"*) | **D101** | Same pack-format break as Q7. |
| Q13 | What does *\"support WhatsApp\"* mean in practice? | **The agent works the channel like a community manager** — read, draft, escalate, send only after a human approves. And on WhatsApp specifically: **individuals yes, groups no.** | **Owner** (the role) + **Mavis** (the split) | **D106**, **D107** | D106 **narrows D11**, the public partner-facing claim. The 1:1 lane needs templates and an opt-in record per member. |
| Q14 | What does *\"production-ready\"* promise? | **The software is ready; the operator staffs their own community.** And shadow mode is retired: the first event runs live. | **Owner** (the promise) + **Mavis** (the split) | **D109**, **D111** | The phase-1 plan changes shape, and the pilot's measurement protocol was written for a rehearsal. |
| Q1 | What is the public surface? | **MCP alone.** The CLI is the operator's plumbing; the dashboard is the human's surface. | **Mavis** (delegated) | **D102** | Nothing to build for the barrel; the dashboard does not exist yet. |
| Q3, Q17 | Who runs the adapter, and what ships? | **The operator's instance; three opt-in adapter packages plus the webhook.** | **Mavis** (delegated) | **D105** | The adapters are **not built**. |
| Q20 | Can the check be turned off? | **No.** Its existence is a floor — the absence of a switch, not a default. | **Mavis** (delegated) | **D104** | A manifest that tries is refused by name. |
| Q21 | Where does a human approve? | **In the dashboard**, or the host's CLI for a headless operator — never through a model-reachable tool. | **Mavis** (delegated) | **D103** | The dashboard does not exist; `kinship_approve` leaves the MCP tool set only *after* it does. **The attestation mechanism is still the owner's open question and this row does not close it.** |

## 2. The two studies that fed it

Both landed on 2026-10-24, before the decisions that cite them:

- **`research/TRANSPORT-TERMS-STUDY-2026-10-24.md`** — what WhatsApp, Telegram and Discord's own
  terms permit, with the clause that decides each. It is the basis for D105 and D106, and it is why
  D106 is a split rather than a reversal.
- **`research/EVENT-TEMPLATE-STUDY-2026-10-24.md`** — what an event template must contain. It is
  the basis for D110, and its header records the premise the session ran under: *shadow mode is
  retired and the project becomes production-ready and self-hostable*.

## 3. What the session did **not** decide

Naming these is part of the answer, because the session's questions had a habit of hiding a fourth
question inside the third:

- **How a human's presence is attested.** D103 settled the *surface* and left the *mechanism* alone:
  the seat is resolved rather than typed (D100), but the model's hand can still trigger a verdict,
  the token is still derivable from the card id, and the log still cannot distinguish *a human
  approved* from *no attestation present*. `docs/ATTESTATION-MEMO-2026-10-24.md` holds the design,
  the options and the acceptance; the decision is the owner's.
- **A second human seat** (PRD section 12-Q12). Untouched — the runtime still gates on one seat,
  and a second name is delegation.
- **The community's own log fields** (D108). Decided in principle, not built.
- **The pack-level capability override.** Decided in principle (D104), not built.
- **Which event, and when.** **D9 is still unset**, and it is still the only thing that starts phase
  1. A decision about the shape of a product is not a decision about a date.

## 4. How to check this file against the log

- Every row above names a `DECISIONS.md` row; the rows are appended, dated, and carry their owner
  column — the owner's own words where he gave them, *\"Mavis, on the owner's …\"* where the
  delegation was used.
- The open range the owner ratifies now reads **D10–D111**, and the cell that says so is checked by
  `scripts/promises.test.mjs`: the range cannot drift from the log without the build failing.
- The capability manifest that D104 shipped is enforced by `runtime/test/capabilities.test.ts` —
  13 cases, including one that walks every word meaning *\"off\"* and one that asserts the shape
  changes what the runtime writes.
- **One of the thirteen exists because a test in another package broke.** The manifest's first
  version named the seat, and the MCP adapter's positive control (a community whose human is called
  something else) was refused at boot — correctly, because the seat was then a fact held in two
  files. The field is gone, the seat is resolved, and a `seat:` written in a manifest is now refused
  by name.
