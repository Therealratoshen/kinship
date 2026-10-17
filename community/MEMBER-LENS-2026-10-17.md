# The member lens — what the community would add, refuse, and leave over

**Method, stated before anything else:** this is a **simulated persona review**, not research.
Stage 1's research mode is *simulated + real desk research* (`design-thinking/00-challenge-brief.md`), and
there is still **zero primary user research** in this repository. No member was asked anything to produce
this file. Where a line below rests on a real source, the source is named; where it does not, it is a
constructed expectation and must be treated as a hypothesis shadow mode can falsify — never as demand.

**Persona definition** (the four things a cast must have before it reviews anything):

| | |
|---|---|
| **Question it owns** | *Does this thing, which was built for my organiser, treat me as a person — and is it worth my attention?* |
| **Evidence threshold** | A right I can exercise **without asking permission and without understanding the architecture**: know who spoke to me, know a human is accountable, stop the messages, see what's held about me, get credited for what I made. |
| **Refuses** | Silent flagging. My name in a sponsor's report. An agent that won't say it's an agent. A "stop" that doesn't stop. Anything that makes the group a broadcast channel. |
| **Verdict vocabulary** | **tolerates** (nothing breaks, still churns quietly) · **complains** (loud, public, brand incident) · **leaves** (silent, and the only one that kills a community) |

**Who "the community" is here, concretely:** the three audiences the repo already names — Rizky, the
Indonesian agent builder who lurks two groups and forks templates (`design-thinking/01-empathy-maps.md`
map 3); the ~3,976-member AIClub-wide population across 264 cities (live-verified 2026-10-17,
`DECISIONS.md` D5 — a *count*, not an adoption claim); and the people who stopped coming and never said why.
The last group is the one this lens is most useful for, because the organiser's own dashboard cannot see them.

---

## 1. What the community would add, in their words → in requirements

| They say | Real need | Named gap in the current artifacts |
|---|---|---|
| "Tell me which human is responsible for this bot." | **Accountability, not just disclosure.** FR-3.4 / spec §2.8 make an utterance say *it is an agent, of <event>*. Nothing makes it carry **the person who approved it**, or give me a way to reach them. | Disclosure exists; **attributability does not**. `escalate-to-human` is an *organiser-side* action; there is no member-facing affordance. |
| "I said stop. Stop." | **A per-member suppression object with state.** `rsvp.chase` and `nudge.no_show` target *individuals*; `no_ghost_watchers` and `queue_max` are organiser-side throttles. There is no requirement anywhere that a member's opt-out persists, is honoured across lanes, and is auditable. | **The sharpest gap in the whole spec.** Nothing in FR-1.x–4.x or Part 5's action taxonomy models the recipient's wishes at all. |
| "Don't sell my attendance to the sponsor." | **An aggregation floor in reports.** FR-2.5 makes the sponsor report a dated, regenerable deliverable. Nothing forbids it naming who came, who no-showed, or who asked a question. | FR-2.5 has *form* and no *subject-protection*. This is the one leak that cannot be un-sent. |
| "If you flag me, tell me — after." | **Due process for the accused party.** Flag-only (§3.5) is the right posture and it's honest about AutoMod precedent. But today a flag is a private record a member never sees, with no appeal path and no reason. | Spec governs the *organiser's queue*. Nobody governs the *subject of the flag*. |
| "Don't make me read three languages." | **Language preference is member data, not an organiser default.** The [id, en] pairing rule is right for *public broadcast*; for a **direct message to one person** it means two read-outs of the same thing, and for a foreign member in an Indonesian group it means an Indonesian paragraph they can't skip. | FR-3.1's pairing rule has no per-recipient preference branch. Retrofit cost is low, so this is a rule change, not a build. |
| "I answered that question for free; make it count for something." | **Proof-of-work attribution.** Map 3's gain is *seen/pride* — attributable work that turns into inbound leads. `attribution:` in the pack credits **pack authors**, not community contributors. | **This is the member's only positive benefit from Kinship, and it is currently scheduled for the hub — which D6 deferred to phase 4.** See §4. |
| "Let me be quiet." | **The right to lurk.** FR-3.1's digest is assembled "from community activity." Quiet members *are* activity if their messages get summarised into a public digest. | No rule restricts digest sourcing to content the channel has consented to publish, and no rule protects non-posters from being described. |
| "Do not score me." | **No member model.** Nothing in the repo bans engagement scoring, attendance ranking, or a per-member profile object. The incentive to add one is external and paid: sponsors ask for it. | Needs a **structurally absent** entry, per §1.1's grep-verifiable rule — not a policy sentence. Policies get deleted; absent tools don't. |
| "My phone is not your demo." | **Low-end Android on a metered connection, in WIB hours.** Per-member frequency caps and quiet hours; nothing I must install to RSVP or to opt out. | `queue_max` caps queued *cards*, not messages *received by one person*. No cadence rule exists at the recipient level. |

## 2. What the community refuses (these become ❌ lines, not backlog items)

- ❌ **A named individual in any sponsor- or externally-facing report.** Aggregate or nothing.
- ❌ **Per-member engagement scores, attendance rankings, or profiles.** The fleet may count events; it may
  not rank people.
- ❌ **An agent that answers "are you a bot?" with anything but yes** — already non-overridable (§2.8); the
  community's addition is that the *first* reply must also name the human.
- ❌ **Auto-replies in a peer's voice.** An agent that drafts like a fellow member and posts into a
  discussion is not "engagement", it is the reason AI-restrictive bans spread (frozen evidence,
  `design-thinking/01-research-notes.md` — the AI-restrictive subreddit-ban doubling).
- ❌ **A "stop" that is a preference toggle the organiser can re-enable.** Suppression is the member's, and
  escalation paths that promote classes must not promote past it.
- ❌ **Being the product's demo.** Attendee data, photos, and quotes do not appear in marketing, decks, or a
  pack's example fixture without per-person consent.
- ❌ **Read-receipt style surveillance dressed as analytics** — "who opened the reminder" is logistics for the
  organiser and surveillance for the member; pick the aggregate.

## 3. What would make them **leave** (silent, fatal, invisible to the organiser)

1. **Volume.** The documented failure of AI community tooling is flooding (map 3's "generic-skeleton flood").
   Three fleet messages a week into a group that used to get two human ones is how a group goes quiet, and
   the organiser's own dashboard will show *engagement up*.
2. **Being spoken about, not to.** A recap or digest that paraphrases members to a wider audience without
   their knowledge.
3. **A wrong message sent under someone's name.** The brand risk the whole approval design exists for — and
   the member's version of it is worse: *I was told the organiser's bot said something about me and nobody
   could tell me who approved it.*
4. **A flag they never learn about,** followed by quieter treatment. Not a complaint — a departure.

## 4. The one thing this lens says that contradicts the current plan

**Deferring the hub (D6, Branch B) defers the member's only direct benefit.** Everything the community
*gains* from Kinship — attributable work, faster answers in their own language, a quieter group, a
visible human chain — is either hub-shaped or requires real member-facing sends, and phase 1 sends
nothing by design. So the honest read is:

> To a member, v0's fleet is a **subtraction**: fewer wrong messages, less spam, faster replies.
> Subtractions are not felt as benefits by the people who never experienced the alternative.

That does not overturn Branch B — the organiser is user #1 (D4) and the cold-start evidence (E1) says
venue-first dies. It does mean **the member-facing value claim must not appear in the AIClub pitch as
though it were already delivered**, and it means the attribution need (Rizky's actual gain) is currently
owned by nobody in the plan. That is an owner decision, not a research finding, so it is recorded as one.

## 5. Triage against the actual capacity (~4–5 h/week, `PLAN.md`)

Three of these **bind now**, because retrofitting them is a migration plus an apology, and one is cheap:

| Binds now | Why it cannot wait |
|---|---|
| **Utterance → named human** in the audit record | The replay promise is the product. A log that never stored `on_behalf_of` cannot be backfilled without fabricating history — which destroys the one claim worth forking for. |
| **Aggregation floor in reports** | A report with attendee names leaves the building once. Unrecoverable. |
| **Member suppression as a persisted object** | Chase/nudge lanes are in the action taxonomy *today*. Building them without a recipient-side suppression row means every future lane inherits the bug. |
| *(cheap)* **No-member-model** as a structurally-absent tool entry | Costs a line in the pack and a validator rule. Its whole value is that it is grep-verifiable. |

**Phase 2** (needs real sends to matter): per-member cadence caps + quiet hours; direct-message language
preference. **Phase 3** (needs the hub, or an owner ruling on §4): proof-of-work attribution. **Gated on
Q3/UU PDP** without asserting the regime: the member's access-and-erasure *capability* — buildable as a
regime-independent property (FR-1.9/1.10 precedent), scheduled when the data subject can actually ask.

**What shadow mode can measure without sending anything** (so this lens doesn't become an untestable essay):
instrument the drafted cards. Per event, count how many drafts would have needed a disclosure line, a named
human, a suppression check, or an aggregate-only field. That number is the member-lens proxy, it costs zero
outbound messages, and if it is near zero the honest conclusion is that phase 1 cannot validate the member
lane at all — which is itself worth knowing before the AIClub conversation.

## 6. Disposition, recorded the same day (so this file is not left hanging)

| Finding | Where it landed | What it may **not** be cited as |
|---|---|---|
| Nine needs → requirements | PRD **FR-5.1–5.10**, spec **§2.9** | Member demand. No member was interviewed. |
| The ❌ refusals (§2) | spec **Part 5** absent list + validator `FORBIDDEN_CLASSES` (PKG-53) | A runtime guarantee — the validator proves shape, not enforcement |
| Silent-leave triggers (§3) | three new skills: `member-rights`, `flag-notice`, `publishable-sourcing` (pack now 15) | Tested behaviour; nothing has run |
| The §4 contradiction | PRD **Q10** (open) + spec §2.10 reserved + `DECISIONS.md` **D18** consequence line | Resolved. It is the owner's call. |
| The instrumentation idea | `EVENT-TEMPLATE.md` member counters + `TEST-PROTOCOL.md` **P-6** (explicitly not a §4 gate) | Evidence that FR-5 is right — P-6 can demote it, which is the point of writing it down |

The ten new tamper cases in `scripts/validate-pack.test.mjs` (14 → 25) are the part of this review that is
already real: an invariant a fork cannot delete costs nothing to state and everything to retrofit.

---

**Closed at the end of this artifact.** This persona does not carry into the next task; if the member lens is
needed again it is re-cast against a fresher artifact. What survives is the requirement list, the ❌ lines, and
the §4 contradiction — of which §6 records the disposition, and Q10 remains the owner's call rather than this review's.
