---
key: kinshipai/bundled/event-ops/kopdar
slug: kopdar-ops
name: Kopdar event-ops squad
version: 0.1.0
category: event-ops
bundled: true                      # core pack: the invariants below are held by us, not by the fork
license: Apache-2.0                # ratified (D72): the MIT default plus the explicit patent grant — see "License" note at the bottom
defaultInstall: false
recommendedFor: [recurring-offline-meetup, ai-builder-community, indonesia-bilingual]
manager: agents/event-ops/AGENTS.md
agents:
  - agents/event-ops/AGENTS.md
  - agents/engagement/AGENTS.md
  - agents/moderator/AGENTS.md
requiredSkills:
  - kinshipai/bundled/event-ops/kopdar/skills/event-lifecycle
  - kinshipai/bundled/event-ops/kopdar/skills/promo-copy
  - kinshipai/bundled/event-ops/kopdar/skills/reminder-schedule
  - kinshipai/bundled/event-ops/kopdar/skills/rsvp-chase
  - kinshipai/bundled/event-ops/kopdar/skills/no-show-nudge
  - kinshipai/bundled/event-ops/kopdar/skills/recap
  - kinshipai/bundled/event-ops/kopdar/skills/sponsor-report
  - kinshipai/bundled/event-ops/kopdar/skills/moderate-flag-only
  - kinshipai/bundled/event-ops/kopdar/skills/identity-disclosure
  - kinshipai/bundled/event-ops/kopdar/skills/member-rights
  - kinshipai/bundled/event-ops/kopdar/skills/flag-notice
  - kinshipai/bundled/event-ops/kopdar/skills/publishable-sourcing
  - kinshipai/bundled/event-ops/kopdar/skills/cross-community-promotion
  - kinshipai/bundled/event-ops/kopdar/skills/near-miss-log
  - kinshipai/bundled/event-ops/kopdar/skills/escalate-to-human
  - kinshipai/bundled/event-ops/kopdar/skills/fleet-health
  - kinshipai/bundled/event-ops/kopdar/skills/standing-engagement
  - kinshipai/bundled/event-ops/kopdar/skills/community-minutes
  - kinshipai/bundled/event-ops/kopdar/skills/community-health
requiredPacks: []                  # no cross-pack deps in v0.1; a moderation-procedure pack would be `kinshipai/...` by key
tags: [kopdar, event-ops, bilingual, id, en, draft-only, supervised]
---

# Kopdar event-ops squad

**Instruction file, not a config blob.** The machine-readable part is `.kinship.yaml` next to this file:
schema key, per-agent permissions, budgets, and the `needs:` gate. Everything that shapes agent *behaviour*
lives here and in `agents/*/AGENTS.md`, because a forked community is edited by a person, and a person edits
markdown — they do not diff a 95-line YAML.

That shape is adopted from Paperclip's teams-catalog (`TEAM.md` + `.paperclip.yaml` + `agents/*/AGENTS.md`),
verified in code at `master` on 2026-10-17 — see `research/PAPERCLIP-OSS-STUDY-2026-10-17.md` section 5. The filename is
`AGENTS.md` on purpose: it matches the donor layout *and* the wider open convention for agent instruction files
(`research/AGENT-GOVERNANCE-LANDSCAPE-2026-10-17.md` section 5), so a pack can be read by tooling that already speaks it.
Six of its properties are load-bearing here:

1. **Namespaced keys** make a fork addressable, which is the precondition for the attribution trail
   (`fork_chain` in `.kinship.yaml`) — a status payoff, not a payout.
2. **`bundled: true` is the safety boundary.** A bundled pack can guarantee "the moderator has no delete
   tool." A community pack cannot, and must not claim to.
3. **Structure, not state.** This pack ships no venue history, no member data, no cost history — just the
   blueprint. A pack that carries state is a pack that leaks someone's attendee list into the next deploy.
4. **Skills referenced by key**, so a pack can require a procedure instead of copying it.
5. **Inter-pack dependencies by key**, so the hub can resolve them rather than guess.
6. **A validator + one contract test** turns this folder into an API. Run
   `node ../../scripts/validate-pack.mjs packs/kopdar-ops` from the repo root. It fails, with a named rule,
   if an invariant is deleted rather than configured off.

## What this squad does

Three agents on one event lifecycle, in one approval queue. Nothing is member-facing without a human verdict,
and the verdict distinguishes **allow once** from **allow always** (`spec/GOVERNANCE-SPEC-OUTLINE.md` section 1.8).

| Agent | Owns | Tools it has | Tools it does **not** have |
|---|---|---|---|
| `event-ops` | the lifecycle state machine, promo/reminders/recap/sponsor-report drafting, timers | gcal write, Luma read (+write only if Plus), Gmail draft, Sheets/Notion read | WhatsApp group send (absent, D11), publish-without-approval, spend past ceiling |
| `engagement` | member-facing copy in both languages, RSVP chase, no-show nudge, FAQ answers | Telegram send, Discord send, WA **read + draft**, email draft | WA group send, anonymous reply, delete/ban |
| `moderator` | flagging, nothing else | read only | **delete, ban, mute, and any mutating action — not denied, absent from the toolset.** Also absent: `score.member`, `member.opt-out-override`, `report.name-a-member` (spec Part 5) |

Lifecycle (`skills/event-lifecycle`): `draft → scheduled → promoting → t-minus-7 → t-minus-1 → running →
recap → report → closed`. One origin can only ever produce one send per phase; the phase machine is what
makes "did we already remind them?" a lookup instead of a judgement call.

## The skills

Skills are procedures an agent loads, not features. Sixteen, and each one exists to close a specific hole.
Three of them (`member-rights`, `flag-notice`, `publishable-sourcing`) were added on 2026-10-17 after reading
the whole pack from the **member's** side instead of the organiser's — see
`community/MEMBER-LENS-2026-10-17.md`; the sixteenth (`cross-community-promotion`) was added the same day for
the other direction communities grow — joining up with each other. An assertion column is included because a
skill nobody can test is a suggestion.

| Skill | Agent | Contract | Fails the pack if |
|---|---|---|---|
| `event-lifecycle` | event-ops | Drives the phase machine, per-phase approval, timers, and what "done" means per phase | a phase can be entered without its predecessor's verdict or a timer has no persisted wake row |
| `promo-copy` | engagement | Paired ID+EN, primary language labelled, disclosure line attached | a member-facing draft is single-language or omits the disclosure |
| `reminder-schedule` | event-ops | T-7d/T-1d cadence, cheapest channel first, live rate check before any WA template | a reminder is scheduled on a paid template while cheaper lanes are unwarned |
| `rsvp-chase` | engagement | Reconciles against the named guest-list export, chases non-responders | it states a headcount it did not read from a source |
| `no-show-nudge` | engagement | Post-event, email → Telegram/Discord, **never a paid WA template** | it selects a paid channel first |
| `recap` | engagement | Notes/turnout → recap draft, cites only real links | it invents an attendance figure |
| `sponsor-report` | event-ops | Dated window, named sources, regenerable, carries `Model Used` | its numbers are not reproducible by re-running it |
| `moderate-flag-only` | moderator | Flag → human queue with reason + confidence | a delete/ban tool appears in the toolset |
| `identity-disclosure` | every member-facing agent | Every utterance identifies as an agent; never denies being one | disclosure is a setting rather than an absent alternative |
| `member-rights` | every member-facing agent | Four moments at the point of contact: who is answerable (`on_behalf_of`), a stop that persists cross-lane and beats any grant, aggregate-only external artefacts, and cadence/hours owned by the recipient | a member-visible utterance has no `on_behalf_of`, or a suppressed member is reachable by any lane |
| `flag-notice` | moderator | The subject of a flag is told, after the fact, with reason + the deciding human; appeals re-enter the organiser's queue and the flagging agent may not resolve them | a flag is silently treated, or the flagger adjudicates its own appeal |
| `publishable-sourcing` | engagement, event-ops | Digests/recaps cite only channels marked publish-consented; a member who never posted is not described | a recap attributes behaviour to a lurker, or cites a non-consented channel |
| `cross-community-promotion` | engagement, event-ops | Partner content is copy out / never member data out; partner numbers need a source the organiser named; the partner is disclosed in both languages; suppression and the member cap apply unchanged; an always-grant must name partner + lane + window | a partner artefact reaches a member who said stop, or an unsourced partner figure is repeated as ours |
| `near-miss-log` | all | Records a caught error with the *why*, exportable | a rejected draft is deleted instead of logged |
| `escalate-to-human` | all | When to hand off, to whom, over which channel, with what context | `needs.escalation_contact` is unset |
| `fleet-health` | all | Bounded `complain` + ≤3 constructive suggestions per run, no double-firing | a complaint and a suggestion fire for the same event |

`complain` / `suggestion-box` as a *fleet* signal is taken from Paperclip's skill pair (`study section 6.8`); it is
the cheapest early warning that the reminder lane has become a mess.

**Not built, on purpose:** a workflow-canvas skill, a memory-engine skill, an eval-harness skill. All three
are commodities (`research/COMPETITOR-ANALYSIS-2026-10-17.md` section 3) — adopt, do not author (`DECISIONS.md` D12).

## "Isn't this what a free Discord bot already does?"

Yes, partly — and more of it than this section claimed when it was first written. Corrected 2026-10-17 after
`research/COMMUNITY-SAAS-AND-BOT-LANDSCAPE-2026-10-17.md` section 2: **Apollo** ships recurring events, button signups,
per-option capacity, auto-waitlists, up to 5 custom reminders, digests, gcal sync and cross-server posting for
$0/$8/$25 per month, and **Luma Plus already bundles automated reminders** via email/SMS/push/WhatsApp. So the
honest answer is not "bots can't do event lifecycle" — some of them can. Free bots already cover: scheduled
announcements, welcome messages, role assignment, keyword AutoMod flags, digests, and event sign-ups. Any pack
lane that only replicates one of those is **not** a reason to install this.

What the surveyed bots do not do, and what these skills exist for:

- **per-phase approval.** An event *loop* exists in Apollo; an event loop where each phase produces a card a
  named human signs for, and where the loop's state is auditable, does not.
- **cross-channel** sequencing with cost awareness (email before a paid WhatsApp template), across a fleet the
  community already runs rather than inside one bot's own server.
- an **approval queue that binds to a content revision** and distinguishes *once* from *always* — a bot's
  "auto-post" toggle is a per-feature switch, not a grant with a named scope (section 1.8).
- **audit replay** a sponsor or a member can be shown, including the near-misses the gate caught.
- **per-event spend in the organiser's currency**, with a hard stop.
- the **bilingual ID+EN pairing** on every member-facing card, which no foreign vendor ships as a rule.

So the posture is **additive**: keep AutoMod, keep MEE6, keep Apollo, keep the welcome bot. Kinship sits above
the fleet the community already has and governs it (`PRD` FR-4.2). A pack that instructs an organiser to
uninstall a free bot to install this is selling the wrong thing — and per `DECISIONS.md` **D16**, "we run your
events / we send your reminders" is banned copy for the same reason: an incumbent already does it, free.

## Notes a forker must read before changing anything

1. **Meetup and Facebook Groups are absent, not disabled.** Meetup's API is application-gated; FB Groups'
   Graph access was deprecated in 2024-04. Adding either is a ToS question, not a tool entry.
2. **`whatsapp | send` on any lane is deliberately missing** — the capability is not in this pack's toolset at
   all. Corrected 2026-10-17: the original reason ("nothing official offers group automation") was **false** —
   Meta's Groups API is live. The boundary is re-derived on the true facts as **D13** and holds anyway: it is
   OBA-gated, capped at **8 participants**, unavailable on Business-app numbers, has no edit/delete and no
   template metrics in groups. So the class is absent because an 8-person, opt-in-only, non-editable group send
   is not what an organiser is asking for, and the unofficial route that *does* scale risks their own number
   with permanent, no-appeal bans. Falsifier: a raised cap retires D11/D13 for this lane.
   **Amended 2026-10-24 (`DECISIONS.md` D106):** note 2 above is about the **group** lane, and the
   group lane is still refused exactly as written. What changed is the **individual** lane, which D106
   opens: WhatsApp sends to individual members — free-form inside the 24-hour window, an approved
   template outside it — through an adapter that does not exist yet. So "`whatsapp | send` on any
   lane is deliberately missing" is still true today (there is no adapter, and a pack that declares a
   tool the runtime cannot reach is a pack that lies), and it stops being true for the individual lane
   when that adapter lands. The group lane does not.
3. **`budgets.llm_per_event_idr` has no sanctioned default.** The field is real and enforced; the number is the
   owner's to set (PRD section 12-Q9). Shipping a made-up ceiling would be exactly the invented figure the honesty
   contract forbids.
4. **Luma writes require Luma Plus** (vendor-subscription dependency, price unverified as current). Without
   it, `venue_source` degrades to gcal or manual; the pack must stay installable either way.
5. **Nothing here licenses the sentence "runs itself."** The load-bearing sentence is: the fleet proposes, the
   organiser approves, every action is logged and replayable.
6. **License.** `license: Apache-2.0` is the **ratified** licence (D72): the MIT default plus the explicit patent
   grant and its patent-termination clause. PRD section 12-Q4 is closed. The `LICENSE` file carries the verbatim
   Apache-2.0 text, and `NOTICE` records the Paperclip teams-catalog donation so the provenance ships in the
   package. The reasoning, and why the category's own MIT shape was not followed, is in
   `docs/LICENSE-MEMO-2026-10-18.md`.

## Open, and honest about being open

- The `once`/`always` grant store is specified in the governance spec (section 1.8) and **now implemented in
  `runtime/src/grants.ts`** — corrected 2026-10-18; this bullet read "implemented nowhere" when it was written,
  before the runtime landed under `DECISIONS.md` **D21**. Shape is checked by the validator, semantics by
  `runtime/test/grants.test.ts`. **What is still true:** neither proves a *deployed* system honours it — that
  proof needs a transport, and none ships (see the section above).
- `identity-disclosure` and `commit.channel-post` at any posture above `draft` are **unproven**. Promotion
  thresholds are a shadow-mode output (PRD section 9), not a pack setting to decide here.
- No primary user research backs any lane in this pack. It is a faithful model of one organiser's workflow —
  the organiser who wrote it.
- **No member has been asked anything.** The three member-facing skills encode what a *simulated* member lens
  said it would refuse, which is a constraint the build can honour or fail and not evidence of demand. The one
  contradiction that lens surfaced — deferring the hub (D6, Branch B) also defers the member's only *positive*
  benefit, so v0's member value is subtraction alone — is open as PRD section 12 **Q10** and is the owner's call, not
  this pack's.
