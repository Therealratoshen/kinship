# Kinship — 90-day execution plan

**Window:** 2026-10-19 → 2027-01-16 (13 weeks).
**Effort budget: 4–5 h/week.** This is a hard ceiling, not an aspiration. The PRD names
owner-time as a first-class risk (§10: ">5 h/week maintainer load in phase 1 → kill or hand
to a contributor"), and it is the only resource in this project that is genuinely scarce —
the stack, the channels, and the community are already owned.

**The plan is anchored to an event date, not a calendar.** Weeks below are written relative
to **E-day** (the shadow-mode event) as well as absolute dates, because phase 1 cannot start
until an event is picked. Picking it is the first action; the rest of the plan is only
scheduling.

## Capacity ledger (honest arithmetic)

| | Hours |
|---|---|
| Budget per week | 4–5 |
| Phase 1 (weeks 1–5, event cycle) | ~4/wk |
| Phase 2 (weeks 6–9, second event + spec) | ~5/wk |
| Phase 3 (weeks 10–13, AIClub or none) | 0 until the gate opens |
| Reserve for the other nine projects | assumed non-zero; weeks 9–10 are deliberately light (holiday) |

If any week exceeds 5 h, **cut scope, not sleep.** The candidate to cut is always the same:
code. The diary and the spec are the parts that produce value even if the code never ships.

## Phases, with entry / exit / kill

| Phase | Weeks | Scope | Entry | Exit | **Kill / stop condition** |
|---|---|---|---|---|---|
| **0. Framing** | done 2026-10-17 | Research, design-thinking stages, PRD, decision log, this plan | — | ✅ complete | Verdict was conditional-GO; condition is phase 1. |
| **1. Shadow mode, event #1** | W1–W5 around E-day | Fleet **drafts only**. Zero outbound member-facing sends by the fleet. Organiser posts manually or via existing tools. Every draft + every approval recorded. **Runs inside the owner's existing Paperclip instance as a `kopdar-ops` company — no Kinship code is required for phase 1 (`DECISIONS.md` D10), which is why W2 costs configuration hours rather than build hours. Reminder lane is email/Telegram/Discord, never a WhatsApp template** (`research/COMPETITOR-ANALYSIS-2026-10-17.md` §5–§6). | Target event chosen and dated (→ `DECISIONS.md` D9) | Diary has a real before/after number + audit trail of ≥1 near-miss the gate caught | Event cancelled/ postponed twice → run shadow mode on a *non-event* week (content calendar) rather than waiting; the measurement is the feeling shift, not the meetup |
| **2. Second event + spec publish** | W6–W9 | Repeat on event #2 with one autonomy escalation *only if* W5 evidence licenses it. Publish `spec/` + `packs/` as the first public OSS artifacts. | Phase 1 exit **and** the CONTINUE threshold in `pilots/shadow-mode/TEST-PROTOCOL.md` §4 | Two events run, spec published, ≥1 external reader forked or commented on the pack | **No second-event behaviour after 4 weeks of real events → kill this approach, return to Define.** Pre-committed; polite self-praise counts as kill. |
| **3. AIClub pitch (partner lane)** | W10–W13, only if gate opens | One chapter, one event, shadow mode, 6 weeks. Read-only trial. | Phase 2 exit + **D5 sequencing rule satisfied** (one clean event of proof) + AIClub operator consent + §12-Q3 legal read started | ≥2 deployments still running at 30 days | All chapter organisers refuse member-facing autonomy → reposition to back-office event ops and write a new PRD. Do not extend the pitch. |
| **4. Hub-as-demo** | **not this quarter** | Repo public beyond spec+packs, landing, gallery | Phase 3 signal | — | Deliberately out of window. E1 says venue-first dies; the hub follows the demo. |

## Weekly

| Wk | Dates | Focus | Deliverable (something that exists at the end) | h |
|---|---|---|---|---|
| 1 | Oct 19–25 | **Pick the event.** Fill `pilots/shadow-mode/EVENT-TEMPLATE.md`. Baseline feeling rating scheduled. | D9 row in `DECISIONS.md` with event name + date; completed event template | 3 |
| 2 | Oct 26–Nov 1 | Draft-only fleet config for that event, **as a company inside the existing Paperclip instance** (D10): `kopdar-ops` project, three agents at `draft` posture, T-7d/T-1d routines, approval cards as the human verdict. Reminder lane = email/Telegram/Discord. | `packs/kopdar-ops/` filled with real names/channels (`pack.local.yaml`, gitignored); first draft cards produced | 4 |
| 3 | Nov 2–8 | Fleet drafts promo (ID+EN), reminder schedule, recap plan. Organiser approves/edits/rejects each card **as once / always / deny** (§1.8 grant taxonomy), records *why*. | ≥5 cards with verdicts + edit-reason notes; audit log format decided | 4 |
| 4 | **E-day** | Run shadow mode live. Do nothing differently except log. Before/after diary entries. | Diary: T-1 rating, T+1 rating; caught-near-miss entry if any | 4 |
| 5 | Nov 16–22 | **Read the result.** Run `TEST-PROTOCOL.md` §4 thresholds honestly. 15-min self-interview with the negative-space question. | Verdict written: CONTINUE / REPOSITION / KILL — with the number that produced it | 3 |
| 6 | Nov 23–29 | If CONTINUE: publish `spec/`. The outline already carries §1.7–§1.9, §2.7–§2.8 and the Part 5 action-class table, so this is completion (worked example + authority model + five-minute audit checklist + the borrow-mapping appendix), not a rewrite. | Spec v1.0 readable by a stranger | 5 |
| 7 | Nov 30–Dec 6 | **Confirmation, not a spike** — Q8 is answered on code evidence (**D10**). Re-check the study's findings against the repo's current `master`, note anything that moved, price the migration off Paperclip. | One page: "does D10 still hold", with the migration cost | 4 |
| 8 | Dec 7–13 | Event #2 in shadow mode with one escalated lane (e.g. reminders auto-send) *only if* W5 licensed it. | Second diary + escalation rationale | 5 |
| 9 | Dec 14–20 | Light week. **Pack tidy-up shrank, because the hygiene set landed early (2026-10-17):** `SECURITY.md`, `AGENTS.md` + 2 rules, the PR template's `Model Used` field, the validator + a 25-case contract test (member-as-subject invariants tamper-tested since the §2.9 pass), and five draft-only eval cases are already in the repo. What is left is genuinely light: a pack README and the license memo. | `packs/kopdar-ops/README.md`; license memo (§12-Q4 as a question with a recommendation) | 2 |
| 10 | Dec 21–Jan 3 | Holiday. No build. Optionally: 2 conversations with peer organisers (PRD §9 metric — *conversations held*, not commitments). | Entries in `pilots/shadow-mode/OBSERVER-NOTES.md` | 0–2 |
| 11 | Jan 4–10 | If phase 2 gate held: prepare the AIClub one-pager from real event data (P3 sketch becomes evidence-backed). | Pitch doc whose every number traces to a diary entry | 4 |
| 12 | Jan 11–17 | **90-day review.** Re-read `06-final-gate.md`, update PRD ledger + changelog, decide the next 90 days or stop. | PRD changelog row; D-next in decision log | 3 |

## Explicitly not doing this quarter

These are on HOLD by verdict, listed so they don't return as "obvious" work:

- ❌ Hub/forum UI, profiles, feeds, discussion threads (E1: venue-first ghost-towns).
- ❌ Template marketplace with payouts (motivation claim already falsified by reports 3/4).
- ❌ **WhatsApp group automation, in any form** — *corrected 2026-10-17 by `DECISIONS.md` D13; the ban stands,
  the reason changed.* Meta's **Groups API does exist**, which falsifies the original "the capability does not
  exist" wording, but it is opt-in-business-account gated, **capped at 8 participants**, unavailable on
  Business-app numbers, with no edit/delete and no template metrics in groups — i.e. it cannot reach a real
  kopdar group. The unofficial routes (WAHA/Baileys/Evolution-class) can, and they risk the organiser's *own
  number*, with bans reported as permanent, no notice, no appeal. So the ban is a **product-envelope plus
  asymmetric-risk** decision, not a capability claim; its falsifier is named in D13 (Meta raising the cap).
  Citation: `research/COMPETITOR-ANALYSIS-2026-10-17.md` §1 (corrected). In the current pack format this rule
  is not a comment anyone can delete — `whatsapp | send` is absent from `.kinship.yaml` and the validator
  rejects it if it appears (**D17**).
- ❌ WhatsApp auto-send to members at scale in phase 1 (cost/ToS + brand-incident risk; draft-only is the point).
- ❌ Meetup / Facebook Groups automation (E5: gated and dead respectively — banned from scope).
- ❌ Any "autonomous 24/7" marketing or landing copy — and no "we invented approvals/budgets/heartbeats"
  claim either (PRD §2.3, added from the Paperclip study §4). **Also banned by `DECISIONS.md` D16: "we run
  your events" / "we send your reminders" framing** — Apollo ships the whole event loop free-to-$25/mo and
  Luma Plus already bundles automated reminders, so that sentence describes an incumbent, not us. The
  allowed frame is the cross-channel chain + governance + the bilingual rule.
- ❌ Multi-tenant SaaS hosting.
- ❌ Any code that isn't needed to produce a draft card and log its verdict. *Read precisely, because this
  repo now contains code and someone will ask:* the exception is `scripts/validate-pack.mjs` + its contract
  test and the eval cases — they are the **pack schema's gate**, the artifact that makes the format adoptable,
  and they run on node ≥ 20 with no install step and no runtime. They are not platform code, they enforce
  nothing at execution time, and they do not produce a card. That distinction is the one line in the README the
  phase-1 gate depends on. *Amended 2026-10-17, `DECISIONS.md` D21 (owner instruction: "so next, lets build
  it"):* the **control-plane core** (`runtime/` — ladder, grants, cards, lifecycle, budgets, member
  protections, disclosure, containment, shatter-guard, replayable audit, engine, pack boot gate) was built
  ahead of the measurement, delegated, at ~0 owner hours. It still produces no send — no channel transport
  ships, so every member-facing commit refuses `no_transport` — and W2–W5 still run inside Paperclip (D10),
  so the line this bullet defends (no platform before the evidence) keeps its meaning: the runtime is the
  spec's semantics as tested code, not a platform.
- ❌ **Build a memory engine, a trace store, an eval harness, an orchestrator, or a translation model** —
  all commoditised; buy or adopt (PRD §5.2, `DECISIONS.md` D12).
- ❌ A workflow-canvas UI. The canvas is n8n's product, it is already in the owner's stack, and competing
  with it on its own terms is the substitution risk named in PRD §10.

### HOLD items (evidence-gated, may lift — these are not bans)

| HOLD | Condition to lift | Consequence while held |
|---|---|---|
| **BSP markup is unknown ⇒ no per-member acquisition cost may be printed anywhere.** Meta publishes no Indonesia rate (bucketed under "Rest of Asia Pacific"), and reseller cards for the same product span a **4.5× band ($0.0104–$0.04727)**, including two readings of one vendor help page four weeks apart. | A real BSP account exists and its own rate card is readable at send time. | Any total-cost or CAC claim is invented. Decks cite Meta's published category structure only, never a Rp figure. FR-4.3 makes the *product* read the organiser's live rate card and refuse when stale — because no rate compiled by research can be trusted. |
| **Luma's write API is gated behind Luma Plus (~$59/mo, vendor pricing, unverified as current).** Read access is free. | The organiser (or AIClub) actually holds Plus. | Kinship must not *require* a paid third-party subscription to function. Event-creation lanes degrade to gcal + manual (`venue_source: manual`), and the dependency is named as a risk in PRD §5.1 rather than hidden in a setup step. |
| **Google Translate's 2026 rate, Skool's $9/$99, Circle's agent tier gate, Common Room's entry price, and Qiscus/Mekari/Wati pricing are unresolved** (403/404/JS-gated as of 2026-10-17). | Primary source readable. | None of these may appear in external copy while unresolved. None of them gates phase 1. |
| **`budgets.llm_per_event_idr` has no sanctioned default** (PRD §12-Q9). | Shadow mode produces one real spend figure. | The pack field is a labelled placeholder; do not print a ceiling number in the README or the pitch. |
| **The replay/audit backend is Enterprise-gated at the vendors** — Langfuse and AgentOps both put retention and audit-style replay behind paid tiers (`research/AGENT-GOVERNANCE-LANDSCAPE-2026-10-17.md` §4). | A self-hosted deployment of the chosen trace store exists and its free tier is read from the vendor page on the day of the claim. | **Self-host is an obligation, not a preference** (D14): Kinship promises a replayable audit trail it cannot outsource to a metered SaaS. Until the store is chosen, no claim about retention length may be printed. |
| **D14's named adopt list is not yet owner-ratified** (LiteLLM for budget enforcement, Langfuse or AgentOps self-hosted for traces, Mem0 or Letta for memory, MCP for tools, promptfoo-style evals). | Owner ratifies or swaps each named product. | Phase 1 does not depend on any of them — it runs in the existing Paperclip instance. W6/W9 spec text refers to *classes* of dependency, with names as candidates, until ratification. |
| **Negative evidence is not absence of capability:** Discord's help centre returned 403 on every attempt in the scan, and `bettermode.com/toggy` 404'd. | A readable primary page for each. | "No shipped Discord AI agent" is written as *we could not find one*, and Toggy's tier gating is written as *unverifiable*. Neither may become a competitive claim in the pitch. |
| **Cross-promotion is spec-first and stays unreached until a partner is named** (`DECISIONS.md` D20): `promote.cross-community` ships at `draft` and is unreachable until `needs.partner_policy` names the allowed partners and the required disclosure line. Phase 1 sends nothing, so no W2–W5 lane exercises it. | The owner names a real partner and a disclosure line, after one clean shadow-mode event. | Cost while held: ~0 — spec §2.11, a skill, validator rules, all written while the repo is pre-code. **The AIClub pitch may not offer cross-promotion as a feature until D20 is ratified and a partner is named.** Co-hosted guest-list merges are Q11, default never. |
| **No member has been asked anything, so FR-5 may not be pitched as member demand.** The member-as-subject group came from a **simulated** lens (`community/MEMBER-LENS-2026-10-17.md`), and its four v0-bound rows are justified by retrofit cost alone. Worse, the lens surfaced a sequencing contradiction the plan cannot answer: the member's only *positive* benefit (attributable proof-of-work) is hub-shaped, and D6 defers the hub — so v0's member value is subtraction only (**Q10**). | One real member interview, or the owner answers Q10. | Held work costs ~0 phase-1 hours: it is spec text, pack files and validator rules written while the repo is pre-code. **Nothing may be built for it in W2–W5, and the AIClub pitch may not say members asked for it.** If P-6's counters come back zero-for-the-wrong-reason across three runs, FR-5.5–5.10 drop out of v0 as triaged — that is the pre-committed exit, not a debate. |

## What this plan changes versus the version before 2026-10-17

Two research layers landed (`research/`), and the plan absorbed them without moving the gate:

1. **W7 was a spike; it is now a confirmation.** Q8 (build on Paperclip vs a thin plane) is answered on
   first-hand code evidence — thin purpose-built plane, their pack format as donor
   (`research/PAPERCLIP-OSS-STUDY-2026-10-17.md` §4 → **D10**). W7's deliverable is one page that
   *re-checks* that answer against any framework change since the read and states the migration cost, not
   a fresh build-vs-buy investigation. Budget unchanged at 4 h.
2. **W2–W5 need no Kinship code.** Phase 1 runs as a company in the existing Paperclip instance. Honest
   cost of that choice, stated in the protocol: it couples phase-1 evidence to a dependency we don't
   control, and it teaches Paperclip's vocabulary rather than Kinship's. Accepted, because the measurement
   that gates the build arrives ~2 weeks earlier at ~0 build hours.
3. **W6's spec now has §1.7–§1.9, §2.7–§2.8 and Part 5 in it**, so "spec v0.1 readable by a stranger"
   means the v0.2 outline, not a from-scratch draft.
4. **Repo hygiene moved earlier than planned, and W9 got lighter as a result.** The 8-line `SECURITY.md`,
   `AGENTS.md` + two rule files, the pack validator + contract test, the PR template's `Model Used` field, and
   five promptfoo-style cases asserting the draft-only invariant were all folded into W9 as a 2-hour task, which
   was optimistic. They are landed on 2026-10-17 instead, at ~0 hours of phase-1 time, because the honest cost of
   each is near zero while the repo is pre-code. One caveat that must survive into W9: the eval cases are
   **written and unrun** — promptfoo is not installed and there is no runtime to point a provider at, so they are
   the shape of the gate, not coverage of it.
5. **The control-plane core was pulled forward out of phase 2 (2026-10-17, D21 — owner instruction,
   delegated).** `runtime/` exists: 73 tests across 11 suites, zero dependencies, node-native TypeScript
   (a recorded deviation: no bun on this machine; `bun test` is one command away when it exists). The plan's
   arithmetic is unchanged — owner hours stay ~0 and the 4–5 h/wk ceiling is untouched. What moved is risk,
   not schedule: build hours now precede the feeling-shift evidence, and if W5 returns KILL, the runtime is
   part of the documented corpse shape. The phase-1 gate text above is unchanged, and `D9` is still the only
   thing that starts the measurement.

**Nothing in the phase-1 gate moves.** Shadow mode still needs one dated event (D9), still sends nothing,
and is still the cheapest conversion of assumption to evidence available.

## What would make this plan wrong

Named in advance so a bad answer leads somewhere specific:

1. **The feeling doesn't move** (W5 diary flat) → the wedge isn't supervised delegation;
   back to Define, not to a feature list.
2. **Only back-office actions ever get approved** → the product is event-ops back office,
   not community management; new PRD.
3. **It takes >5 h/week to run one shadow-mode event** → the fleet is not yet reducing load,
   and the owner-time kill condition fires regardless of how good the demo looks.
4. **AIClub says no** → the beachhead assumption (D5) was owner hope, not evidence; the
   plan survives via the outsider organiser in W10.
