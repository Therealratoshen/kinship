# Governance spec — outline (v0.2, publishable before code)

**Status:** outline, not a spec — but §1.7–§1.9 and §2.7–§2.8 and Part 5 landed on
first-hand code evidence (`research/PAPERCLIP-OSS-STUDY-2026-10-17.md`) and the competitor
scan (`research/COMPETITOR-ANALYSIS-2026-10-17.md`) on 2026-10-17, so the shape is no longer
guessed. It still has three open items (Part 4) before publication. This is the S4-lite artifact the final gate
green-lit as half-a-day work, on the reasoning that it is the OSS differentiator publishable *before* any
code exists — and the thing that makes an AIClub pitch honest. **The estimate has moved:** two evidence layers
landed into it on 2026-10-17, which is disclosed here rather than quietly absorbed.

**Audience:** an implementer, not a buyer. The spec's success metric is forks-of-spec adopted
by other deployments (P4), which is a slow burn. Write for the person who wants to add
community governance to an existing agent framework and doesn't want to invent the trust model.

**Scope of the idea:** community governance is a solved-looking problem in *engineering*
contexts (Paperclip proves it: exclusive checkout, disposition guard, typed approvals, audit
trail) and an unsolved problem in *community* contexts, where the audience is strangers, the
brand is personal, and a wrong message reaches people who know you. This spec started from the
four things an engineering plane does not need and a community plane cannot do without
(`design-thinking/paperclip-lessons.md` §2.1–2.4); the two 2026-10-17 research layers added four
more — member-input containment, disclosure as a non-overridable class, the grant taxonomy, and
the privacy mechanics — so Part 2 now has eight divergences and Part 1 has nine chassis items.

---

## Part 1 — The chassis (adopted from Paperclip, restated in community terms)

Each of these is a *requirement with a falsifiable behaviour*, not a value. The testable form
lives in PRD §6 (FR-1.1–1.13); this file states the semantics so an implementer can build to
them without reading the PRD.

### 1.1 Autonomy ladder

Three levels, defined **per action class**, not per agent:

| Level | Name | Behaviour | Outbound calls |
|---|---|---|---|
| 0 | `draft` | Agent produces content + rationale; a human posts it or approves it. | **zero** |
| 1 | `opt-in-auto` | Agent executes without asking, *only* for an action class the organiser explicitly enabled, in a named channel. | allowed, logged |
| 2 | `never` | Action class does not exist in the agent's toolset. Not "denied at runtime" — **absent**. | n/a |

Rules that make the ladder real:

- **Default is deny.** An action class with no configured level behaves as `never`.
- **Escalation is earned and reversible in one tap.** Going 0→1 is a decision the organiser
  takes after seeing caught-near-miss evidence; 1→0 is instant and needs no reason.
- **Moderation is `flag` at level 2 always, in core packs.** The moderator agent has no
  delete or ban tool. The human acts. (PRD §1.1; evidence E6 — flag-only is the survivable
  posture, not a caution.)
- **`never` is not a permission check.** A reviewer should be able to grep the tool list and
  see the capability absent.

Two of these rules already have a machine checking them, and the spec should say which ones rather than
implying the whole ladder is enforced. `scripts/validate-pack.mjs` proves the structural halves today — that
`whatsapp | send` and every mutating moderation verb are **absent** from the shipped pack's tool lists, and
that removing an invariant fails install (§2.7, FR-1.14). The behavioural half — *no outbound call while a
class is at `draft`* — has five written cases in `evals/promptfoo/`, and **they have never been run**: there
is no runtime here to point a provider at, and promptfoo is not installed. An implementer of another
framework should read that as "the assertions exist and are the contract", not "this is tested."

**Shipped precedent, named so nobody accuses us of hiding it** (`research/PAPERCLIP-OSS-STUDY-2026-10-17.md` §2,
verified in code): Paperclip's governed tool gateway enforces a per-action policy of *allowed / needs approval*,
with revision-bound approvals and budget hard stops. That is the same shape as levels 1 and 0. Two differences are
Kinship's, and only these:

| | Paperclip (engineering plane) | Kinship (community plane) |
|---|---|---|
| Policy is keyed on | the **agent** + project + issue | the **action class**, per channel |
| `Off` means | denied at runtime | **absent from the toolset** (grep-verifiable) |
| Approval grant | one approval clears the class | **once vs always is a real distinction** — see §1.8 |
| Audience of the artefact | colleagues | **strangers** — see §2.1 and §2.7 |

So: the ladder is adopted, not invented, and §2.3's claim ceiling forbids selling it as novel. What is added is the
per-action-class keying, the absent-not-denied posture, the grant taxonomy, and the stranger boundary.

`[OPEN]` Is a fourth level needed — `auto-then-notify` (act, then tell the organiser within N
minutes)? Two-speed latency argument says yes for member-replies, but it is untested and
should not ship in v0.1 of this spec.

### 1.2 Audit replay

Every action logs: actor agent, trigger, input hash, autonomy level in force at the time,
outcome, and the human verdict (approve / edit / reject) with the edit diff.

- The log renders as a **readable event timeline**, not JSON. The organiser must be able to
  show a member or a sponsor what happened without a terminal.
- Kill mid-action → the log shows a `started,aborted` pair. An aborted action must never
  appear as a completed one.
- **The near-miss is a first-class record.** A draft the organiser rejected because it was
  wrong (wrong time, wrong venue, wrong name) is the highest-value entry in the log: it is
  the visible evidence that the gate works. Stage 5's central unverified behavioural claim is
  *trust = caught-near-miss visibility*; the spec must make near-misses easy to surface, and
  the pilot must measure whether that claim holds.

**(Additive, 2026-10-18 — D30, PRD FR-1.15: the log now has a read side, and it is a derived artefact,
not a new promise.** `Fleet.health()` returns a dated, positioned snapshot of *the fleet's* condition —
live freezes, queue depth against the pack's cap, budget ratios, overdue wakes, refusals by code, idle
agents, two member integers — computed from events already in the log. It appends nothing, mutates
nothing, and replays identically from the log, so the snapshot is a property of the log rather than of
the process that read it, and `derivedFromSeq` says which log it describes. It will not score a person:
it carries no per-member row and no rate, it substitutes a member identifier out of a free-text field
instead of forwarding it, and it lists in `unmeasured` what it cannot see — sentiment, dormancy, delivery,
reach — because nothing has sent (D21) and no dated event has started phase 1 (D9). **What this section
does not settle:** the snapshot is held to the stricter privacy rule while `auditTimeline()` still prints
member refs (§2.3). Which artefact is allowed to name a person is unanswered and recorded as an open
decision, not a standard this spec already has.)

**(Additive, 2026-10-19 — D31, PRD FR-1.16: the read side has two artefacts now, because they answer two
different questions.** `Fleet.health()` answers *what condition is the fleet in* — counts, for a reader who
is being told. `Fleet.inbox()` answers *what is this human waiting on* — a list, for the person who has to
act: one item per undecided draft (`verdict`), per approved card whose one-send authorization has never been
consumed (`handoff`), per lane frozen pending a human release (`release`), per wake past due with nothing
re-arming it (`overdue`). The `handoff` kind is the one this section had been leaving invisible: since D21 a
send refuses *after* approval, by design, so the queue of words a person must deliver by hand has existed in
the log since the first commit and in no artefact at all — a count of `no_transport` refusals says how many
hand-deliveries there were, not which one has been waiting three days. It is a read on the same terms as
`health()`: it appends nothing, it replays identically, it borrows the same registry-based identifier sweep
and runs it *before* the preview cut rather than after, and it **lists without ranking** — `limits` states
that age is not importance, that a handoff cannot be confirmed as delivered, and that an item is a pointer
rather than a payload. Ranking judgement stays out of the runtime, the same boundary §2.9's
FR-5.8 structural rule draws. **What this section still does not settle:** PRD §12-Q12 (who the organiser is,
and whether any human authority may be delegated). Paperclip's exclusive card checkout maps onto a card
cleanly and is declined until that is answered, because a lock keyed on an identity that does not exist is
either inert or it pre-empts the decision — see `DECISIONS.md` D31.)

### 1.3 No ghost watchers

An agent may claim "I'm monitoring this" or "I'll follow up on Thursday" only if a persisted
monitor row exists with `nextCheckAt` and an attempts counter. Setting a waiting state without
a scheduled wake is rejected. Prose is not a waiting path.

*Why this matters more in a community than in engineering:* a stalled "the agent will chase
the no-shows" is not a missed task, it is a member who was promised contact and got silence.

### 1.4 Exclusive ownership, and the 409 that is never retried

One agent owns one conversation or one event loop at a time. A second checkout returns `409`
and **must not be retried** — the caller picks different work. In a group chat, two agents
answering the same member looks like a bot swarm, which is the documented failure that gets
communities to ban AI wholesale (E6: AI-restrictive subreddits doubled).

### 1.5 Revision-bound approvals

An approval binds to a **content revision**. Approve v1, edit to v2 → the pending approval
resolves `stale_target` and v2 queues as a new approval. Duplicate approval requests with the
same `idempotencyKey` return the existing card rather than making a second one.

*Why:* "you approved it" is the sentence that ends a trust relationship. If the thing that
shipped is not the thing that was approved, no approval meant anything.

### 1.6 Bounded work and budgets

Per-agent, per-run caps on LLM spend and queue depth. Exceeding a cap → `truncated=true`,
partial result kept, **no retry storm**. Budget is organiser-set with a hard pause;
spend-per-event is reportable (sponsor-facing), which is an unclaimed differentiator.

Amended 2026-10-17 (PRD FR-1.12): the budget is **event-scoped and denominated in money the organiser
actually spends** — IDR for the beachhead, not tokens. Warn at a threshold, hard-stop above it, and a
hard stop must never silently drop a scheduled phase: it raises a card. Precedent for the mechanism is
Paperclip's `billed_cents` + `hardStop` (verified in code); the *denomination and scope* are ours, because
"4.2M tokens" means nothing to a volunteer organiser and "Rp 500.000 for this kopdar" means everything.

**The enforcement is wrapped, not built** (`DECISIONS.md` D14, PRD FR-1.12). A hard stop on LLM spend is a
commodity — LiteLLM (MIT) already does budget-with-hard-stop, and rebuilding it would be the classic mistake
of shipping a worse version of something the category solved. Kinship's contribution is the *denomination
layer*: translate "this event's remaining budget, in IDR" into the vendor's budget object at event creation,
and convert the vendor's `BudgetExceeded` into an approval-queue card rather than a silent 429. Two properties
must hold in the test and neither belongs to the dependency: the stop is **event-scoped** (exhausting one
event's budget must not pause another), and it is **money-denominated** (the card that fires names a rupiah
figure, not a token count).

### 1.7 Fail-closed trust resolution

Every object an agent reads carries a trust label. The effective policy for a run is the **intersection** of
agent-level, project/event-level, and object-level presets — **narrower wins, and it fails closed**: if the
intersection is ambiguous or a low-trust preset cannot resolve to a concrete local scope, the agent gets the
narrower posture, not the default.

A quarantined low-trust body is **replaced by a fixed string when read into a higher-trust context**, with its
presentation and metadata nulled — not truncated, not summarized, not "shown with a warning." Low-trust output
**cannot auto-promote** to an approved action in a higher-trust lane; promotion is a human act.

Mechanism verified in Paperclip (`sourceTrust` jsonb, `services/source-trust.ts`, `doc/LOW-TRUST-PRESETS.md`).
Their own caveat transfers verbatim and must appear in Kinship's docs: *"this is containment for hostile
automated work. It is not a privacy system."* The privacy half is §1.9.

### 1.8 The grant taxonomy: once, always, and revocation

Level 0 (`draft`) → the human decides, and the decision has **three** distinct behaviours, not two. Collapsing
them is the bug that turns a helper into an unattended bot three weeks later:

| Verdict | What it grants | Stored as | Expiry |
|---|---|---|---|
| **Allow once** | this revision, this send, this channel only | a one-shot token consumed at dispatch | after use |
| **Allow always** | the action **class**, in a **named** channel, for a **named** scope | a stored rule `(actionClass, channel, scope, grantedAt, grantedBy)` | never automatic — revocable in one tap, and revocation is instant and needs no reason |
| **Deny** | nothing; the draft is kept with the rejection reason | the near-miss record (§1.2) | n/a |

Rules that make it honest:

- **An "always" grant must name its scope.** A rule that reads "allow all reminders" is not shippable; it must
  bind to the event series or the channel, because the next event is not the one that was approved.
- **Approval binds to revision (§1.5), so "always" binds to the class definition.** If the class's content
  template changes materially, the grant reverts to `draft` and asks again. Silently inheriting a grant into a
  changed behaviour is the failure mode this taxonomy exists to prevent.
- **Every always-grant is enumerable.** The organiser can see a list of what they permanently allowed, per agent,
  and revoke from that list. If it cannot be listed, it cannot be governed.
- **Escalation to `opt-in-auto` requires evidence**, not confidence: at least one caught near-miss or N accepted
  drafts in that class (PRD §9's metrics decide N; shadow mode has not produced it yet).

Precedent check, stated honestly: no product surveyed ships the *once*/*always* split as a stored, revocable,
enumerable rule (`research/COMPETITOR-ANALYSIS-2026-10-17.md` §3, row A-1). Circle ships approval-gated agents
without the split; Discord AutoMod and Discourse ship flag-only moderation without grants. That is the closest
this spec comes to a genuine addition — and it is still a taxonomy question, not a new engine.

### 1.9 Containment of sensitive data (the privacy half)

Four mechanics, each adopted from a deployment that already ships them, each falsifiable:

1. **Private objects return `404`, not `403`.** A non-member cannot learn the object exists.
2. **Break-glass is audited, not forbidden.** An organiser/admin reading a restricted object must pass an
   explicit break-glass flag, which **writes a visible record** and puts a warning on the artefact. It does not
   change the read predicate and does not create a grant. Direct answer to §2.3's "who can see the audit log":
   the community can see who looked.
3. **A masked display preview is never a value.** Any token/email/phone field rendered into a draft, log line,
   or card is the *parsed raw value or nothing*; a string containing literal `...` or `[redacted]` is a masked
   preview and must fail validation if treated as a key. There is a regression test for that sentence in the
   donor codebase; Kinship must carry an equivalent test, because a community deployment holds attendee emails
   on day one. Three redaction layers (transport log, persisted log, UI display) rather than one.
4. **Single-active-per-origin, enforced in the database** — a partial unique index on
   `(eventId, originKind, originId, phase)`, not an application check. One webhook delivery can only ever spawn
   one reminder. This is also what makes §1.3's monitor promise cheap to keep and duplicate sends impossible
   (FR-2.2).

**Actor identity is verified, not self-declared.** Every logged action carries a run id checked against a signed
token, so the chain action → run → actor cannot be asserted by the agent writing the log.

---

## Part 2 — The community divergences (this is the actual contribution)

An engineering plane assumes the humans are colleagues and the work is internal. A community
plane must handle four things Paperclip does not, and the spec is worth writing precisely
because of these.

### 2.1 Trust-boundary inversion

Paperclip's rule is effectively: whoever is in the system is a trusted actor with an identity.
In a community, **the people sending input are strangers**, and the sensitive artefacts
(member messages, guest lists) are the ones they're trying to reach. Therefore:

- Member-authored content is **data, never instruction**. A message in a group cannot cause a
  tool call; it can only cause a *proposal* that a human approves.
- Prompt-injection resistance is a governance requirement here in a way it isn't for an
  internal fleet, because the attacker population is unlimited and bored.
- Secrets (API keys, sponsor contacts, attendee emails) are proposal-gated and never rendered
  into member-visible output.

**Mechanism added 2026-10-17.** This section was written as a principle with no implementation shape. §1.7 supplies
it (trust preset resolved by intersection, fails closed, low-trust output cannot auto-promote) and §2.7 states the
consequence for a live group.

### 2.2 Commitment vs preparation (the rule-#1 split)

Paperclip's rule #1: never ask a human to do what an agent could do. In a community that rule
is **dangerous as written** — the thing an organiser most wants preserved is their own voice
and judgment in front of members. Kinship's version:

> **Never ask a human to do what an agent could *prepare*. Never let an agent *commit* to a
> member without the human.**

The split is the product. Drafting a reminder = preparation (delegate freely). Sending it to
200 people under your community's name = commitment (human, unless level 1 explicitly enabled).

### 2.3 Multi-audience governance

Engineering: one audience (the team). Community, at minimum: members, organiser, sponsors,
platform, and the agents themselves — each with different rights over the same artefact.

`[OPEN]` Needs a real model. Minimum questions: who can see the audit log? Who can change an
autonomy level (organiser only? can a delegated trusted role?) Who is accountable when two
organisers disagree? v0.1 of this spec should state the *requirement* (authority is
per-audience and revocable) and leave the schema open rather than inventing an RBAC no one
asked for.

**(Additive, 2026-10-18 — the owner asked for exactly this schema ("i think there should be role
setting for agent and human role too"), and this section stays `[OPEN]` because answering it is a
decision, not an implementation.** It is recorded as PRD **Q12** and `DECISIONS.md` **D29**. What is
true in code today, so a reader does not mistake the openness for a gap: the *acts* are gated —
only `'organiser'` may decide a card, issue or revoke a grant, or release a shatter freeze, and a
member's "yes, go ahead" is input to a proposal rather than a grant (§1.8, §2.7). What is **not**
true: there is no registry of humans. Authority is a string compared to one literal in three files,
`FleetState` holds members and no humans, a pack's `PackedAgent.role` is shape-checked and confers
nothing, and the organiser appears in a pack only as free-text `needs.escalation_contact`. Choosing
the schema also chooses what `not_the_human` means when a *second* human exists — today that phrase
is a single name, and §2.3's "two organisers disagree" has no code path because there is only one
seat. **The ceiling is not open, and does not depend on the answer:** no agent and no member may
hold an approval role, and escalation stays scoped per action class rather than per agent
(invariant #1).

**(Additive, 2026-10-18 — D30 made the per-audience rule concrete enough to show a contradiction, and did
not resolve it.** This section calls the timeline something the organiser can "show a member or a sponsor"
(§1.2), and the fleet-condition snapshot is built to be forwardable: it names no member, even in a
free-text wake purpose, and substitutes the identifier out. The timeline is not built that way — it prints
`member wa:62811 registered` and names the `ref` a shatter froze. So two artefacts of one log currently
follow two standards, and the stricter one was chosen for the artefact that is easy to forward. Someone
must rule which artefact is allowed to name a person; until that ruling exists, this is a `[OPEN]`
question with an implementation on one side of it, not a completed rule.)

### 2.4 Two-speed latency

Community patience and engineering patience differ by orders of magnitude. A member asking
"What time does it start?" expects seconds; an agent proposing a sponsor report can take an
hour. The spec must separate the **fast reply lane** (answer-as-itself, identity disclosed,
escalation button, level 0–1) from the **slow commitment lane** (approval queue, never
time-pressure the organiser into approving).

### 2.5 Identity disclosure (added — not in Paperclip at all)

Every member-facing agent utterance identifies itself as an agent, in a way that is not
imitation: "assistant of Kopdar #12", never a person's name, never a typing-indicator
performance. This is a *product surface*, not a compliance footnote — it is the line item most
likely to cause the backlash the evidence base predicts (Moltbook decay; subreddit bans), and
most likely to prevent it if done openly.

`[UNVERIFIED]` Whether disclosure increases or decreases member trust in an Indonesian
WA-first community is unknown. Frame 3 of the P1 storyboard names it the highest-risk moment;
the pilot observes it rather than settling it.

### 2.6 Shatter-guard

A single complaint freezes the agent's level-1 lanes back to `draft` for that channel,
automatically, pending organiser review — with a written record of what triggered it.

Rationale: the failure mode for community agents is not a wrong answer, it is a slow
accumulation of annoyance that ends in the agent being ejected. A guard that trips early and
reversibly is cheaper than a reputation that doesn't come back. `[INFERENCE]` — untested;
the pilot should watch for whether it fires spuriously and becomes its own annoyance.

### 2.7 Strangers as input, in a live group (member-input containment)

An engineering plane's hostile input arrives as a malformed payload from a known integration. A community's
hostile input arrives as **a confident sentence from a person in the group**, and it arrives while the fleet is
mid-lane on a real event. That difference is the reason §2.1 needed a mechanism at all.

The containment rules, as behaviour rather than intent:

- **Group text is `low_trust_review` by default, and cannot raise its own trust.** A member saying "yes, go
  ahead and send it" in chat changes nothing; that is input to a *proposal*, never a grant. Only the organiser
  grant path (§1.8) authorises a send.
- **Low-trust content cannot cross into a higher-trust artefact.** A quarantined message body must not appear,
  quoted or paraphrased, inside a sponsor report, a recap, or a promo draft — the substitution in §1.7 happens
  at read time, so the agent never sees the text to echo.
- **A member cannot cause a tool call.** The reachable object is a draft card with a named human owner. This is
  the property an AIClub organiser will ask about first, and it is the one a reviewer can test in ninety seconds
  by trying.
- **`needs:` values from a forked pack are untrusted input too.** Pack instructions that shell out must use the
  argument-safe invocation (the donor repo documents why one CLI form runs a shell over an issue body and the
  other does not — `research/PAPERCLIP-OSS-STUDY-2026-10-17.md` §6.7). The pack format inherits the attack
  surface; Kinship packs must carry the warning.
- **A pack that did not come from us is hostile input, and the registry is the delivery path**
  (`DECISIONS.md` D15, PRD **FR-1.14**). This is the one containment rule that is about *Kinship's own*
  supply chain rather than a member's message: a hub that distributes forkable packs is a hub that
  distributes instructions plus tool grants plus named secrets, to a runtime that will honour them. The
  measured base rate for poisoned entries in agent-skill and MCP registries is roughly **12% with
  confirmation bias in the sampling** (`research/AGENT-GOVERNANCE-LANDSCAPE-2026-10-17.md` §6) — the number
  is soft, the direction is not, and the direction is enough to set the posture. Three requirements follow,
  all checkable:
  1. **A community pack cannot weaken an invariant, only tighten it.** Removing `identity_disclosure`,
     setting a member-facing class above `draft` without an evidence grant, adding a mutating moderation
     tool, or declaring `whatsapp | send` is rejected at install with `{ code: 'invariant_removed' }`. A
     fork that wants one of those ships its own runtime and says so in public.
  2. **`bundled: true` is a claim about us, not a label.** Only Kinship-authored packs may set it, and the
     validator treats a community fork that keeps it as an error — because that fork is advertising an
     invariant it does not hold, which is worse than advertising nothing.
  3. **Reviewing a pack must not require executing it.** The validator is a dependency-free static check
     (`scripts/validate-pack.mjs`, node ≥ 20, no install step) precisely so a hostile pack can be inspected
     from a container that never loads it. A governance product whose review step runs the reviewed code has
     inverted its own threat model.

  Trust *provenance* also binds: `attribution.author` is immutable in the pack hash and the fork chain is
  public, so a pack that silently swaps its author is a hash mismatch, not a metadata edit.

`[UNVERIFIED]` No surveyed community product ships this boundary as a resolved, fail-closed preset. Discord
AutoMod and Discourse classify *content*; neither gates a *tool call* on resolved trust. Absence of evidence as
of 2026-10-17 — treat as a lane to re-scan before publication, not as novelty to advertise (§2.3's forbidden line
applies).

### 2.8 Disclosure as a non-overridable action class

§2.5 states the requirement — every member-facing utterance identifies itself as an agent. This section states
the **governance** consequence, which is the part that makes it credible rather than a preference:

- Identity disclosure is **not an autonomy level and not a setting**. There is no `Allowed` state in which an
  agent may send member-facing content without it, because **the tool that would do so does not exist in the
  toolset**. The capability is absent, per §1.1's "`never" is grep-verifiable" rule.
- It is therefore **outside the escalation path**: a shatter-guard freeze (§2.6) can demote a lane, and an
  organiser grant (§1.8) can promote a class, and neither operation can touch disclosure. Promotion of a
  disclosure-bearing class promotes *sending*, never *anonymity*.
- An agent may not deny being an agent. If asked "are you a bot", the only permitted answers are affirmative
  ones plus what it is doing there. This is a skill-level constraint (`identity-disclosure`, loaded by every
  member-facing agent) **and** a structural one — the assertion must be checkable in the outbound payload, not
  only in the prompt.
- The pack cannot configure it away. A fork that deletes the disclosure field fails validation (§1.9's test
  discipline and the pack validator in `packs/kopdar-ops/`), rather than silently shipping a quieter bot.

Why it belongs in the spec and not the roadmap: this is the single line item most likely to cause the backlash
the evidence base predicts (§2.5; Moltbook decay, AI-restrictive subreddit bans doubling), and the cheapest
possible defence. It is also the property that makes an *unofficial* WhatsApp automation route unacceptable —
see `DECISIONS.md` D11 and `research/COMPETITOR-ANALYSIS-2026-10-17.md` §1.

### 2.9 The member as a subject, not only as an input source

§2.7 protects the fleet *from* the member. This section protects the member *from* the fleet, and the distinction
matters because everything else in this spec is organiser-facing: an audit trail the organiser can read is not a
right the member can exercise. Derived in `community/MEMBER-LENS-2026-10-17.md` — a **simulated** lens, no primary
research behind it, and that is exactly why its rules are written as structural constraints rather than as
promises about what members will appreciate.

Four properties, each stated so an implementer can fail a test on it:

- **Every member-visible utterance carries the human it is on behalf of.** Disclosure (§2.8) answers *what* spoke;
  this answers *who is answerable for it*. The field is `on_behalf_of`, it is written at send time into the audit
  record, and it is **not derivable later** — which is why it binds in v0 even though nothing member-facing ships in
  phase 1. A log that omitted it cannot be backfilled without fabricating history, and a fabricated audit trail is
  worse than none: it is the product's core claim, quietly false.
- **A member's suppression is a persisted object with state, and it is the member's.** `(memberRef, actionClass,
  suppressedSince, source)` — honoured across every lane, checked before any commit class runs, and **outside the
  escalation path**: no autonomy promotion, no `allow always` grant, and no pack setting may promote past it. A
  "stop" that the organiser can re-enable is not an opt-out; it is a mute button on someone else's consent.
  Contrast with §1.3: a ghost watcher promises a human action that has no row. A ghost opt-out is worse — it
  promises a *member* protection that has no row, and the breach is the one that gets screenshotted.
- **Nothing that leaves the community may identify a member.** Reports (sponsor, recap, digest) are
  **aggregate-only** above a named floor, and the floor is a config value with a hard minimum, not a suggestion.
  The mechanism is the same one §1.9 already built for PII: redaction layers applied at *assembly* time, so the
  agent never sees a name it could leak, plus a validation assertion on the artefact itself. A single
  named-attendee report is unrecoverable once sent — the only acceptable failure mode here is refusing to assemble.
- **A flag is a record about a person, and the person is a party to it.** Flag-only (§2.3, §3.5) is the right
  posture; it is also incomplete, because it silently *treats*. The rule: a flag against a member is disclosed to
  that member after the fact, with its reason and the human who decided, and the appeal lands in the same queue the
  flag came from. `moderate.flag` may stay level-2 for everything except producing that notice.

**The structurally-absent half.** Two verbs must not exist in a bundled pack's toolset, for the same reason
`whatsapp | send` does not: **`score.member`** (engagement scores, attendance rankings, per-member profiles) and
**`message.suppress-opt-out`** (clearing or overriding a member's suppression row). Grep-verifiable, checked by the
validator, and recorded in Part 5's absent list. A community product that can rank its members will be asked to,
by a sponsor, on a quarterly basis; the protection has to be the absence of the capability, not a policy sentence
nobody reads during the quarter they're short on budget.

`[UNVERIFIED]` Whether members value these properties enough to matter for retention is unmeasured — the lens that
produced them is simulated. What is *not* unverified is the asymmetry: a member who discovers they were scored,
named to a sponsor, or muted past their opt-out does not file a complaint, they leave, and the organiser's
dashboard reads that as normal churn. The rules above are cheap precisely because the alternative is unfalsifiable
until it has already cost the community.

The regime question stays a question: what a member can *demand* (access, erasure, objection) is UU PDP territory
and is **not asserted here** (PRD §12-Q3). What is built here is the regime-independent substrate that makes any
such answer possible — a suppression ledger, an accountability field, and artefacts that cannot leak a name.

### 2.10 Reserved — the member's positive benefit

`community/MEMBER-LENS-2026-10-17.md` §4 names an open sequencing contradiction: the one thing a member
*gains* — attributable proof-of-work — is owned by the hub, which D6 deferred to phase 4. That is the owner's
call, not a spec section, until he rules on it. Written here so the gap is not lost inside a review file.

### 2.11 Cross-community promotion: content in, copy out — never member data out

Communities join up. A partner community asks ours to promote their event, a co-hosted edition needs both
audiences, and the organiser — being a person who wants his community to have nice things — says yes. That
consent is real, and it transfers **zero trust**: the partner is a third party the organiser vouches for,
not a lane the fleet extends. Four rules make the "yes" safe to say:

- **A partner gets no key, no grant, and no scope.** The grant taxonomy (§1.8) is held by humans; a partner
  is a *subject* of copy, never a holder of autonomy. `promote.cross-community` sits at `draft`, and a pack
  that declares the class must also answer `needs.partner_policy` — the named allowed partners and the
  required disclosure line — or the class is unreachable. Fail closed, same as every other gate.
- **The fleet cannot authenticate a partner's facts.** Their attendance figures, their price, their date are
  stranger input at §2.7's trust level with one difference: the organiser vouched for the *partner*, not for
  the *numbers*. So a partner number without a source the organiser named escalates — this is the existing
  "a number has no source" trigger, applied to a vouched sender. Vouching for a friend is not evidence.
- **The member's rights survive the partnership unchanged.** A member who said stop is not reachable by
  partner content — a partnership is not a second lane around the suppression row, and partner promotions
  count against `member_message_cap_per_24h` like anything else. The disclosure line names the partner and
  the relationship, in both languages, on top of the standing §2.8 disclosure — it does not replace it.
- **Copy travels; people do not.** The partner receives nothing but words the organiser approved. No member
  list, no RSVP data, no identifier in any direction — which is `memberdata.export`'s absent status doing
  its job. Whether a *co-hosted* event ever justifies a merged guest list is a separate question, gated on
  §12-Q3's regime answer and on per-member consent at RSVP time; until both exist, the default is **never**
  (PRD §12-Q11). Members who belong to both communities are unknowable to the fleet, and that is fine: the
  cap, not clairvoyance, is what stops the double-spam.

The pattern this closes is the classic unsupervised-fleet failure: a partner asks for reach, the organiser
says yes once, and an always-grant quietly means every event, forever, to everyone — including the people
who said stop. A grant that names no partner and no window is not generosity; it is an omission (§1.8).

---

## Part 3 — What this spec must NOT contain

- ❌ Any performance or ROI claim ("saves hours"). Banned by the PRD honesty contract §5 and
  the claim ceiling.
- ❌ Any market-size or community-size number, including any Indonesian talent-gap point
  estimate (the viral "21,500 by 2030" figure is **banned as unverifiable**).
- ❌ A claim of compliance with any regime. UU PDP and platform data terms are an
  **open question** (PRD §12-Q3), stated as one. What the spec *does* claim are the
  regime-independent properties: dated/versioned outputs, human-in-the-loop, replayable audit,
  no silent messaging.
- ❌ An OSI license commitment baked into the spec body (see §12-Q4; open the schema+SDK,
  host the hub — the Dify/Comfy shape — is the current *recommendation*, not a decision).
- ❌ Simulated quotes presented as evidence.
- ❌ **A predicted member feeling.** The member lens (`community/MEMBER-LENS-2026-10-17.md`) is simulated and its
  requirements enter this spec as *structural constraints* — things that are impossible to get wrong silently — not
  as claims that members will appreciate them. "Members will feel safer" is unsellable until measured; "a name
  cannot appear in a sponsor report" is true at build time or it is false.

## Part 4 — Open items before this is publishable (W6 of `PLAN.md`)

1. **Still open.** A worked example: one event's audit log, real or clearly-labelled synthetic, showing a
   caught near-miss end-to-end.
2. ~~The action-class taxonomy~~ — **closed 2026-10-17**, see Part 5. Derived from the twelve skills in
   `research/COMPETITOR-ANALYSIS-2026-10-17.md` §5 rather than invented. (Fifteen skills and 21 classes as of
   the same day's member-lens pass — §2.9 added four member-facing classes; sixteen skills and 22 classes after
   the same-day cross-promotion addition (§2.11, D20). The derivation set is what existed when Part 5 was
   written and is left as the record.)
3. **Still open.** The 2.3 authority model, at least as a named open problem with the two candidate shapes.
4. **Still open.** A "how to audit a deployment in five minutes" section — the replay UI as a checklist, since
   a self-hosting organiser will not read the log otherwise.
5. ~~Reuse decision (§12-Q6/Q8)~~ — **answered on first-hand code evidence**, not opinion: Kinship is a thin
   purpose-built plane, Paperclip's pack format is the donor, and the mechanism mapping lives in
   `research/PAPERCLIP-OSS-STUDY-2026-10-17.md` §4 (decision `DECISIONS.md` D10). The publishable artifact must
   carry that mapping table as an appendix, because "what did you borrow" is the first question a framework
   reader asks — and §2.3 forbids answering it with a claim of novelty.

## Part 5 — The action-class taxonomy (closes former open item 2)

The ladder is meaningless without a finite verb list. These classes are derived from the twelve pack skills
(`research/COMPETITOR-ANALYSIS-2026-10-17.md` §5) and the PRD §6 requirements, not composed freshly. **Default is
deny**, so "default" below is the most permissive posture a v0 pack may boot with; anything higher is an organiser
grant (§1.8).

| Class | Verbs in it | v0 default | Highest posture that may ship | Constraint that travels with it |
|---|---|---|---|---|
| `observe.read` | read channel history, read RSVP source | `auto` (zero outbound) | `auto` | Scoped to *named* channels/events; read is not silent member-data export |
| `draft.promote` | ID+EN promo copy, event blurb | `draft` | `opt-in-auto` | Disclosure line attached; no invented attendee counts |
| `draft.reminder` | T-7d / T-1d reminder | `draft` | `opt-in-auto` | Per-origin single-active (§1.9.4) |
| `commit.individual-message` | email / Telegram / Discord individual send | `draft` | `opt-in-auto` | Cheapest channel first; budget-checked before send |
| `commit.template-send` | WhatsApp approved template → **individuals** | `draft` | `opt-in-auto`, only with live rate + budget headroom | Priced in the card; refuses when the rate card is stale (FR-4.3); **never a group** |
| `commit.channel-post` | post into the group under the community's name | `draft` | **Allow once only, in v0** | Highest brand risk; this is the class shadow mode exists to earn |
| `answer.question` | fast reply lane (what time / where) | `draft` | `opt-in-auto` | Disclosure mandatory (§2.5/§2.8) + visible escalate button |
| `rsvp.chase` | reconcile guest list, chase non-responders | `draft` | `opt-in-auto` | Never invents a headcount; cites the export it read |
| `nudge.no-show` | post-event nudge | `draft` | `opt-in-auto` | Email → Telegram/Discord before any paid template |
| `report.assemble` | recap, sponsor report | `draft` | `opt-in-auto` (to a named human) | Dated window, regenerable, its own `Model Used` line |
| `moderate.flag` | flag to human queue with reason + confidence | `auto` | `auto` | **Flag-only in bundled packs**; no delete/ban tool exists |
| `escalate.to-human` | hand off with context | `auto` | `auto` | Load-bearing: the pack refuses to boot without `needs.escalation_contact` |
| `budget.spend` | any metered LLM/tool call | `auto` under ceiling | `auto` | Warn-then-hard-stop in the organiser's currency (§1.6) |
| `member.suppression-check` | read a member's opt-out state before any commit class | **`auto`, mandatory, unbypassable** | same | Every `commit.*` and `nudge.*` runs it first; absent suppression ≠ suppression, so a missing row is treated as *unknown* and the message is held (§1.7 fails closed) |
| `member.notify-optout` | persist a member's stop/snooze, across all lanes | `auto` | `auto` | §2.9. It is outside the escalation path: no grant can promote past it, and the organiser cannot re-enable it |
| `member.notify-flagged` | tell a member they were flagged, after the fact, with reason and the deciding human | `draft` | `auto` (to a named human) | §2.9's due-process rule; the appeal re-enters the same queue the flag came from |
| `report.aggregate-only` | assemble a sponsor/recap report with no identifiable member | `auto` under the floor | `auto` | §2.9; the redaction happens at assembly so the agent never holds the name (§1.9's mechanism, reused) |
| `promote.cross-community` | a partner community's event/copy to our members | `draft` | `opt-in-auto`, grant must name **partner + lane + window** | §2.11; `needs.partner_policy` gates the class; partner numbers escalate without a named source; counts against the member cap; never carries member data |

**Structurally absent — `never`, not denied.** These must be greppable as missing from every bundled pack:

- ❌ `whatsapp.group-send` — the official capability is capped at **8 participants** and is opt-in gated, so it
  cannot reach a real group (`DECISIONS.md` D13, competitor §1 as corrected); the unofficial route risks the
  organiser's own number (D11)
- ❌ `message.anonymous` / `message.without-disclosure` — §2.8
- ❌ `message.as-member` — an agent posting as if it were a community member (astroturfing). §2.8 makes agents say what they are; this makes pretending structurally impossible. A partner asking the fleet to "just post it like a member wrote it" is declined by absence, not by policy
- ❌ `moderation.delete` / `moderation.ban` — the human acts (E6, FR-3.2)
- ❌ `score.member` — engagement scores, attendance rankings, per-member profiles. Not "restricted": absent.
  A product that *can* rank members will be asked to, by a sponsor, quarterly (§2.9)
- ❌ `member.opt-out-ignore` / `member.opt-out-override` — clearing or bypassing a suppression row is not a
  capability the toolset contains, so no autonomy escalation, grant, or pack edit can reach it (§2.9)
- ❌ `report.name-a-member` — an identifiable individual in any externally-facing artefact (§2.9)
- ❌ `memberdata.export` to an unapproved destination — UU PDP posture is an open question (PRD §12-Q3), so the
  class does not ship while the question is open
- ❌ `spend.beyond-budget` / `price.commit` — a hard stop that can be retried past is not a stop
- ❌ `trust.raise-self` — an agent cannot widen its own scope or re-label an object it read (§1.7)

`[OPEN]` Two classes are named but unproven and must not be promoted in phase 1: `commit.channel-post` and
`answer.question` at `opt-in-auto`. Their promotion threshold is a shadow-mode output, not a spec decision.

---

## Part 6 — Implementation map (added 2026-10-17, `DECISIONS.md` D21)

The outline above is now implemented as tested code in `runtime/` — a dependency-free TypeScript
library (node ≥ 23, erasable syntax, no install step; zero dependencies. The size is counted rather
than remembered — `find runtime/src runtime/test runtime/tour.ts -name '*.ts' | xargs wc -l | tail -1`
prints 5,148 as of 2026-10-18, split 2,388 domain code / 2,399 tests / 361 tour). This map is the walk a reviewer
takes from a spec rule to the code and the test that holds it. Its boundary, stated before the rows:
it maps *the semantics*, not a deployed system. No channel transport ships, every member-facing
commit refuses at the transport gate with its one-send authorization intact, and phase 2's transport
integration — where end-to-end proof would begin — stays behind the shadow-mode gate.

| Spec rule | Code | Held by |
|---|---|---|
| §1.1 ladder: default deny, absent ≠ denied, unknown role, `never` as floor | `src/ladder.ts`, `src/types.ts` (`Autonomy`) | `test/ladder.test.ts` |
| §1.2 audit replay: append-only log, `replay` deep-equality, readable `#seq` timeline, refusals as records | `src/store.ts` (`append` stores a **structured clone**, so a caller mutating its payload afterwards cannot rewrite history), `src/apply.ts`, `src/engine.ts` (`auditTimeline`, `logRefusal`) | `test/store.test.ts`, `test/apply.test.ts`, `test/replay.test.ts`, `test/engine.test.ts` |
| §1.2 read side (PRD **FR-1.15**, and the first enforcement of **FR-1.11**): the fleet's condition is one dated, positioned snapshot derived only from rows already logged — freezes, queue depth *and card age*, budget state with `null` for an unset ceiling, overdue wakes, refusals counted by code, idle agents — carrying no member identifier and naming what it refuses to measure | `src/health.ts` (`deriveHealth`, exposed as `Fleet.health()`; `withhold()` reuses `partner.ts`'s registry scan), `src/engine.ts` (the method appends nothing) | `test/health.test.ts` (15 cases: purity across two calls, replay deep-equality of the *read*, `retire` at 3 cycles vs `watch` at 1, prefixed/bare/clean substitution controls, the two-integer member block and the `unmeasured` field), `runtime/tour.ts` (3 of the 11 guarantees that existed at D30; the tour now prints 15) |
| §1.3 no ghost watchers: a promise to follow up requires a persisted wake row | `src/lifecycle.ts` (`scheduleWake`, `assertWakeBacked`) | `test/lifecycle.test.ts` |
| §1.4 exclusive ownership; the 409 that is never retried | `src/lifecycle.ts` (`claimPhaseOrigin`, `checkoutEvent`) | `test/lifecycle.test.ts` |
| §1.5 revision-bound approvals; edit consumes the live authorization, v2 re-queues, `stale_target` | `src/cards.ts` (revision hash over both languages) | `test/cards.test.ts`, `test/engine.test.ts` |
| §1.6 bounded work: unset ceiling refuses, warn-then-hard-stop raises a card, event-scoped, run cap truncates | `src/budget.ts`, `src/runner.ts` (`runActions` owns one `Run` per call: meters every attempted action, stops at the first crossing with partial results kept, drops the tail without attempting it) | `test/budget.test.ts`, `test/runner.test.ts` |
| §1.7 fail-closed trust resolution; narrower always wins | `src/ladder.ts` (`narrowest`), `src/containment.ts` (`narrowForMemberTrigger`) | `test/ladder.test.ts` |
| §1.8 grant taxonomy: once / always-named-scope / revocation / supersession; only the organiser issues **or revokes** | `src/grants.ts` (`findLiveGrant` is the authorization path; `grantWithClosedWindow` is a read-only diagnostic that lets §2.11's expiry name itself; `revokeGrant` gates its own actor rather than trusting a caller — `test/grants.test.ts` proves a member ref revoking directly used to succeed) | `test/grants.test.ts`, `test/engine.test.ts` |
| §1.9 / §2.7 stranger-input containment: member text out of the log, upward read substitutes a fixed sentence, no masked preview | `src/containment.ts` | `test/containment.test.ts`, `test/engine.test.ts` |
| §2.5 / §2.8 disclosure as a class: canonical bilingual line inside the approved revision; `on_behalf_of` | `src/disclosure.ts` (`answerableBy` records FR-5.1's `unattributable` for a commit that names no human — an internal commit may have no human, it may not borrow one), `src/engine.ts` (commit order, and a timeline that reads the actor off the event instead of restating it) | `test/disclosure.test.ts`, `test/engine.test.ts` |
| §2.6 shatter-guard: complaint freezes the lane to draft; only the organiser releases | `src/shatter.ts`, `src/ladder.ts` | `test/ladder.test.ts`, `test/replay.test.ts` |
| §2.9 member as subject: suppression beats any grant, absent row fails closed, no un-suppress, cap counts the member, quiet hours are the member's clock, aggregation floor refuses below 10 | `src/members.ts`, `src/engine.ts` (commit order) | `test/members.test.ts`, `test/engine.test.ts` (order proof) |
| §2.11 cross-promotion: partner gate, partner + lane + window grants, per-event cap, no member identifier in partner-facing copy | `src/ladder.ts`, `src/grants.ts` (`grantWithClosedWindow` names an expired window instead of hiding it), `src/partner.ts` (the identifier scan: registry-bounded, both languages, names the member and never the copy), `src/apply.ts` (cap counter), `src/engine.ts` (commit order: the content rule runs ahead of authorization so the approved-card path is covered too; the cap sits after the per-member protections and before the transport gate) | `test/ladder.test.ts`, `test/grants.test.ts`, `test/partner.test.ts`, `test/engine.test.ts` (order proofs), `test/pack.test.ts` |
| Pack boot gate: a fork cannot weaken an invariant (FR-1.14) — the validator's own `validatePack` runs before parsing | `src/pack.ts` | `test/pack.test.ts` (tamper cases on the real `packs/kopdar-ops`) |
| §1.2 read side, **second artefact** (PRD **FR-1.16**): the same log read as a *list* instead of counts — what a human currently owes, by kind (`verdict` / `handoff` / `release` / `overdue`), ordered by how long it has waited, with ranking explicitly refused, the identifier sweep run **before** the 160-char preview cut, and `memberInputs.linkable: false` because the log carries no input→card join | `src/inbox.ts` (`deriveInbox`, exposed as `Fleet.inbox()`), borrowing `health.ts`'s now-exported `pendingCards` + `withholdMemberIdentifiers` rather than re-implementing them, `src/engine.ts` (the method appends nothing) | `test/inbox.test.ts` (11 cases: purity across two calls and replay deep-equality *of the read*, the `handoff` kind that lived only in the log until D31, cross-kind age ordering, the leak-at-the-cutline control, `limits` naming age ≠ importance), `runtime/tour.ts` (4 of its 15 guarantees) |
| Host boundary: what `runtime/` may not own (PRD **FR-1.17**, `DECISIONS.md` D32/D33) — no third-party package, no network builtin or network global, no dynamic `import()`, no `node:fs` outside `pack.ts`; and a credential-shaped prefix in any pack file fails the shape gate | `runtime/test/boundary.test.ts` (the scanner: scope `runtime/src/**`, comments stripped so prose about a transport is not a transport), `scripts/validate-pack.mjs` **PKG-57**, `runtime/package.json` (an empty dependency set is itself asserted), semantics in **`spec/HOST-CONTRACT.md`** | `test/boundary.test.ts` (6 cases — one positive control per rule, a legal-file control, and an anti-vacuity check that the scanned module list is non-empty), `scripts/validate-pack.test.mjs` (a key-shaped string fails the build; a 48-hex revision hash and a `$KINSHIP_HOST_TOKEN` placeholder pass; a PEM block fails) |

Two things this map deliberately does not claim. First, that a deployed system honours any of it end
to end — no transport exists to prove that with. Second, that the run cap makes the engine a
scheduler: it does not, and should not (D10 — phase 1 schedules inside the organiser's own instance).
`src/runner.ts` is the run's owner, `recordRunAction` its meter, and the engine still refuses to
schedule anything; wiring `runActions` to a real queue is the open contribution.

The map is also honest about its vocabulary. `src/errors.ts` carries the closed set of refusal codes,
and `test/errors.test.ts` fails if a code is neither raised in `src/` nor listed in
`UNIMPLEMENTED_REFUSAL_CODES` with the reason it is still debt — and fails a third way, if the list
is written with a duplicated key, because an object literal keeps the last one and every other gate
then passes over prose a reviewer reads as two rules (`D27` found that by shipping one). Two codes
are declared and not yet enforced — `idempotent_hit` (a return value, not a refusal) and
`unsourced_number` (§2.11 needs both a content check and a place in the pack to name a source, and
the pack has no such key yet). `cross_promo_cap` and `grant_window_expired` were in that list and are
now enforced (2026-10-18, D24); `partner_data_leak` left it the same day (2026-10-18, **D27** —
`src/partner.ts`, enforced ahead of authorization for both the grant and the approved-card path).
