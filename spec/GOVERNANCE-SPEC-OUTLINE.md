# Governance spec — outline (v0.2, publishable before code)

**Status:** outline, not a spec — but section 1.7–1.9 and section 2.7–2.8 and Part 5 landed on
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
(`design-thinking/paperclip-lessons.md` section 2.1–2.4); the two 2026-10-17 research layers added four
more — member-input containment, disclosure as a non-overridable class, the grant taxonomy, and
the privacy mechanics — so Part 2 now has eight divergences and Part 1 has nine chassis items.

---

## Part 1 — The chassis (adopted from Paperclip, restated in community terms)

Each of these is a *requirement with a falsifiable behaviour*, not a value. The testable form
lives in PRD section 6 (FR-1.1–1.13); this file states the semantics so an implementer can build to
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
  delete or ban tool. The human acts. (PRD section 1.1; evidence E6 — flag-only is the survivable
  posture, not a caution.)
- **`never` is not a permission check.** A reviewer should be able to grep the tool list and
  see the capability absent.
- **A grant and a timer are different authorities, and the difference is the SCHEDULER.** This is the
  rule that two code paths used to look like they contradicted, so it is written down here rather than
  left to be inferred from an order of checks:
  - **A grant authorises a CLASS.** It says "this class, on this lane, in this window" — and the spec
    says it outright: *escalation is per action class, never per agent*. **Which** agent runs it is
    routing, not permission, and the class map already bounds who holds the class. So a commit of a
    `draft` class **with a grant** is legitimate: the organiser granted it.
  - **A timer may only fire a human-gated draft lane** (`timed_lane_not_draft`). A timer is the fleet
    acting **on its own**, and an unattended lane is exactly what phase 1 refuses — the runner that
    would commit it is not in the path. So the same class that a human may commit under a grant, a
    clock may not fire.
  - **And the class map is checked FIRST, before the grant is looked up** — so a grant can never
    resurrect a class an agent does not declare. The refusal says so in words: *a grant cannot
    resurrect it.* A grant can widen a lane's authorisation; it can never widen an agent's toolset.

Two of these rules already have a machine checking them, and the spec should say which ones rather than
implying the whole ladder is enforced. `scripts/validate-pack.mjs` proves the structural halves today — that
`whatsapp | send` and every mutating moderation verb are **absent** from the shipped pack's tool lists, and
that removing an invariant fails install (section 2.7, FR-1.14). The behavioural half — *no outbound call while a
class is at `draft`* — has five written cases in `evals/promptfoo/`, and **they have never been run**: there
is no runtime here to point a provider at, and promptfoo is not installed. An implementer of another
framework should read that as "the assertions exist and are the contract", not "this is tested."

**Shipped precedent, named so nobody accuses us of hiding it** (`research/PAPERCLIP-OSS-STUDY-2026-10-17.md` section 2,
verified in code): Paperclip's governed tool gateway enforces a per-action policy of *allowed / needs approval*,
with revision-bound approvals and budget hard stops. That is the same shape as levels 1 and 0. Two differences are
Kinship's, and only these:

| | Paperclip (engineering plane) | Kinship (community plane) |
|---|---|---|
| Policy is keyed on | the **agent** + project + issue | the **action class**, per channel |
| `Off` means | denied at runtime | **absent from the toolset** (grep-verifiable) |
| Approval grant | one approval clears the class | **once vs always is a real distinction** — see section 1.8 |
| Audience of the artefact | colleagues | **strangers** — see section 2.1 and section 2.7 |

So: the ladder is adopted, not invented, and section 2.3's claim ceiling forbids selling it as novel. What is added is the
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
member refs (section 2.3). Which artefact is allowed to name a person is unanswered and recorded as an open
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
rather than a payload. Ranking judgement stays out of the runtime, the same boundary section 2.9's
FR-5.8 structural rule draws. **What this section still does not settle:** PRD section 12-Q12 (who the organiser is,
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

Amended 2026-10-19 (`DECISIONS.md` D38): **"per-run" is scoped by the caller's handle, and the run report says
which scope it used.** The sentence above says *per-agent, per-run*, and a host that calls the runner once per
agent per tick is obeying it — the cost is that `max_actions_per_run: 15` then bounds **each call**, so three
agents can attempt 45 actions in a tick while the pack reads like a fleet ceiling of 15. That is not a bug to
silently clamp: a shared counter would leak one run's exhaustion into the next, which is exactly why the
counter is a value the caller owns rather than a module singleton. The rule is that the scope is **stated, not
assumed** — `runActions(fleet, actions)` bounds the call and reports `capScope: 'this_call'`; a host that wants
one bound per tick hands in one `createRun()` and the report says `'shared_run'`. A run's counter stays outside
replayable state (section 1.2), so it is *not* visible in the health snapshot, and any attempts-per-window figure there
would be invention.

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
automated work. It is not a privacy system."* The privacy half is section 1.9.

### 1.8 The grant taxonomy: once, always, and revocation

Level 0 (`draft`) → the human decides, and the decision has **three** distinct behaviours, not two. Collapsing
them is the bug that turns a helper into an unattended bot three weeks later:

| Verdict | What it grants | Stored as | Expiry |
|---|---|---|---|
| **Allow once** | this revision, this send, this channel only | a one-shot token consumed at dispatch | after use |
| **Allow always** | the action **class**, in a **named** channel, for a **named** scope | a stored rule `(actionClass, channel, scope, grantedAt, grantedBy)` | never automatic — revocable in one tap, and revocation is instant and needs no reason |
| **Deny** | nothing; the draft is kept with the rejection reason | the near-miss record (section 1.2) | n/a |

Rules that make it honest:

- **An "always" grant must name its scope.** A rule that reads "allow all reminders" is not shippable; it must
  bind to the event series or the channel, because the next event is not the one that was approved.
- **Approval binds to revision (section 1.5), so "always" binds to the class definition.** If the class's content
  template changes materially, the grant reverts to `draft` and asks again. Silently inheriting a grant into a
  changed behaviour is the failure mode this taxonomy exists to prevent.
- **Every always-grant is enumerable.** The organiser can see a list of what they permanently allowed, per agent,
  and revoke from that list. If it cannot be listed, it cannot be governed.
- **Escalation to `opt-in-auto` requires evidence**, not confidence: at least one caught near-miss or N accepted
  drafts in that class (PRD section 9's metrics decide N; shadow mode has not produced it yet).

Precedent check, stated honestly: no product surveyed ships the *once*/*always* split as a stored, revocable,
enumerable rule (`research/COMPETITOR-ANALYSIS-2026-10-17.md` section 3, row A-1). Circle ships approval-gated agents
without the split; Discord AutoMod and Discourse ship flag-only moderation without grants. That is the closest
this spec comes to a genuine addition — and it is still a taxonomy question, not a new engine.

### 1.9 Containment of sensitive data (the privacy half)

Four mechanics, each adopted from a deployment that already ships them, each falsifiable:

1. **Private objects return `404`, not `403`.** A non-member cannot learn the object exists.
2. **Break-glass is audited, not forbidden.** An organiser/admin reading a restricted object must pass an
   explicit break-glass flag, which **writes a visible record** and puts a warning on the artefact. It does not
   change the read predicate and does not create a grant. Direct answer to section 2.3's "who can see the audit log":
   the community can see who looked.
3. **A masked display preview is never a value.** Any token/email/phone field rendered into a draft, log line,
   or card is the *parsed raw value or nothing*; a string containing literal `...` or `[redacted]` is a masked
   preview and must fail validation if treated as a key. There is a regression test for that sentence in the
   donor codebase; Kinship must carry an equivalent test, because a community deployment holds attendee emails
   on day one. Three redaction layers (transport log, persisted log, UI display) rather than one.
4. **Single-active-per-origin, enforced in the database** — a partial unique index on
   `(eventId, originKind, originId, phase)`, not an application check. One webhook delivery can only ever spawn
   one reminder. This is also what makes section 1.3's monitor promise cheap to keep and duplicate sends impossible
   (FR-2.2).

**Actor identity is verified, not self-declared.** Every logged action carries a run id checked against a signed
token, so the chain action → run → actor cannot be asserted by the agent writing the log.

### 1.10 Settings resolution across tiers: org → pack → event, refuse never clamp

An operator may hold many community packs, so settings resolve across tiers. The tier order is **org → pack →
event** and each tier may only do two things to the tier below it: **narrow an autonomy class** (section 1.7) or
**supply a value the lower tier left blank**. It may not replace a value the lower tier *declared*.

**Refuse, never clamp.** A pack that declares a member protection weaker than its org's floor does not boot; the
refusal names the key, both numbers, and the org. This is not pedantry, it is the difference between a floor and a
lie: an organiser edits `member_message_cap_per_24h` to 20, the system sends 4, and the file now disagrees with
the world. Kinship already refuses that failure class in three other places — fork packs (D15), single-sourced
gate lists (D28), a rule that existed only as a comment (D29).

**Which means the org tier cannot change a community's number.** Under refuse-not-clamp, "strictest wins"
degenerates for any key both tiers wrote: it can refuse the community, or fill a blank the community left, and
provenance says which. That consequence is the load-bearing one for a self-hosted, forkable product — it is the
line between an operator holding floors and a hosted product with extra steps. So:

- **a declared value is a validation** (`pack_invalid` when the pack goes below the floor);
- **an omitted value inherits**, and the resolved row is provenance `org` rather than `pack`;
- **an autonomy ceiling is a real section 1.7 narrowing** — it may only move a class down, may not widen it, and may
  not say `never`, because absence is the pack's to declare (invariant #1: a central `never` would be a denial
  wearing absence's clothes);
- **direction is per key.** A *lower* message cap is stricter for the member; a *higher* aggregation floor is
  stricter. A single min/max rule across both would let a fork set `report_aggregation_floor: 1`, call it
  caution, and ship a sponsor PDF that names two people;
- **budgets are not floors.** Spend ceilings and queue depth stay the pack's — a volunteer's money and patience
  are the organiser's own cost, not a promise to a member;
- **the third tier is not built.** The event tier has no shape, no caller, and no rule; naming it here keeps the
  resolution order honest instead of quietly two-tier forever.

Every effective value carries a provenance row — key, tier, source (`pack` / `org` / `default`), and a note
carrying the number it beat — because "which file put this number in force?" is a governance question and the
answer must be an artefact, not an inference. `Fleet.settings()` is the third read side (after `health()` and
`inbox()`) and holds the same contract: a pure fold over the log plus the tier stack, appends nothing, dates
itself, replays identically. Enforcement reads the **resolved** values, never the raw pack, or the tier is a
report rather than a rule.

### 1.11 The human seat set

Invariant #1 says escalation is per action class; section 2.7 says the escalation path terminates at a named human. The
runtime needs the second half to be a *set*, not a literal: `decideCard`, `issueGrant`, `revokeGrant` and
`releaseShatter` all consult one resolved seat set (`orgs/*.yaml`'s `human_seats`, default `['organiser']`)
through one helper, so the fifth human-only act cannot acquire a fifth copy of the comparison.

Two exclusions are part of the rule, not footnotes to it:

- **A complainant is not an actor.** `tripShatter(channel, ref)` names who was annoyed, and that is a member.
  Seat-checking it would refuse a member's complaint because they are not the organiser — the exact way a
  governance system becomes a silencer (section 2.6 vs section 2.7). The freeze still applies; only a seat releases it.
- **Answerability is not authority.** `on_behalf_of` may be `'unattributable'` (FR-5.1). If that field had to be
  a seat, the fix for "who sent this?" would become "say the organiser said it."

**The shape is a set; the size is one** while PRD section 12-Q12 (delegation) is the owner's unanswered question. An org
that declares a second seat is refused at parse time rather than half-supported, and a pack agent named after a
seat is refused at resolution — otherwise an agent could take the name the human veto accepts. `agent_roles` is
reporting, not a whitelist: a community may add an agent without its org's permission, and the one hard rule is
that a role name may not collide with a seat.

### 1.12 The capability manifest: what the fleet may do, and who answers for it

Section 1.10 says how a **number** is resolved across tiers. This says how a **power** is declared,
because the two are not the same thing and mixing them in one dial is how a community accidentally
turns the check off.

- **A manifest carries capabilities, not settings.** A capability changes what the fleet may *do*;
  a formatting choice (what the log looks like) is not a capability, and neither is a member
  protection (those are floors, section 1.10). The rule is the distinction: *a setting that changes
  whether a human is asked is a governance choice, and a governance choice is not allowed to sit
  next to a cosmetic one without being named as one.*
- **Every capability says why it is on.** A power nobody justifies is not a configuration, it is a wider
  blast radius with a YAML key on it.
- **The seat that answers is resolved, not written.** The manifest has **no** `seat:` field: the seat set
  the community declares (`human_seats:`, section 1.11) answers for every capability, exactly as it does
  for the four human-only acts. A seat written in a second file is a seat that drifts — the same lesson as
  D100, one layer down, and the MCP adapter's own test caught it.
- **The human check's existence is a floor.** Its *shape* is configurable — `push` (the runtime asks:
  a card that needs a human also writes a `ReviewRequested` row, which is what a host turns into a
  notification) or `pull` (the human opens the inbox and the runtime interrupts nobody). There is no
  `off`, and every word that means one is refused **by name**. The floor is the *absence of a
  switch*, which is the only kind of floor that cannot be set by accident.
- **The vocabulary grows only with enforcement.** A capability the runtime could merely read back
  would be a setting that lies — the failure this spec keeps recording (a refusal code that is
  never raised, a rule that is only a comment, a number nobody recomputes). So a capability lands
  here only if it changes what the runtime *does*. `human_check` qualifies; `log_fields` does not
  yet, and is therefore not in the vocabulary.
- **The shape of the check is the community's; the vocabulary of the log is not.** A community
  chooses the log's *format* and may add its own fields; the runtime's event vocabulary is the
  project's, because the log is the audit trail and a replay has to reproduce the same state — two
  communities with different vocabularies would have logs no tool could read together.

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

**Mechanism added 2026-10-17.** This section was written as a principle with no implementation shape. section 1.7 supplies
it (trust preset resolved by intersection, fails closed, low-trust output cannot auto-promote) and section 2.7 states the
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
member's "yes, go ahead" is input to a proposal rather than a grant (section 1.8, section 2.7). What is **not**
true: there is no registry of humans. Authority is a string compared to one literal in three files,
`FleetState` holds members and no humans, a pack's `PackedAgent.role` is shape-checked and confers
nothing, and the organiser appears in a pack only as free-text `needs.escalation_contact`. Choosing
the schema also chooses what `not_the_human` means when a *second* human exists — today that phrase
is a single name, and section 2.3's "two organisers disagree" has no code path because there is only one
seat. **The ceiling is not open, and does not depend on the answer:** no agent and no member may
hold an approval role, and escalation stays scoped per action class rather than per agent
(invariant #1).

**(Additive, 2026-10-18 — D30 made the per-audience rule concrete enough to show a contradiction, and did
not resolve it.** This section calls the timeline something the organiser can "show a member or a sponsor"
(section 1.2), and the fleet-condition snapshot is built to be forwardable: it names no member, even in a
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
mid-lane on a real event. That difference is the reason section 2.1 needed a mechanism at all.

The containment rules, as behaviour rather than intent:

- **Group text is `low_trust_review` by default, and cannot raise its own trust.** A member saying "yes, go
  ahead and send it" in chat changes nothing; that is input to a *proposal*, never a grant. Only the organiser
  grant path (section 1.8) authorises a send.
- **Low-trust content cannot cross into a higher-trust artefact.** A quarantined message body must not appear,
  quoted or paraphrased, inside a sponsor report, a recap, or a promo draft — the substitution in section 1.7 happens
  at read time, so the agent never sees the text to echo.
- **A member cannot cause a tool call.** The reachable object is a draft card with a named human owner. This is
  the property an AIClub organiser will ask about first, and it is the one a reviewer can test in ninety seconds
  by trying.
- **`needs:` values from a forked pack are untrusted input too.** Pack instructions that shell out must use the
  argument-safe invocation (the donor repo documents why one CLI form runs a shell over an issue body and the
  other does not — `research/PAPERCLIP-OSS-STUDY-2026-10-17.md` section 6.7). The pack format inherits the attack
  surface; Kinship packs must carry the warning.
- **A pack that did not come from us is hostile input, and the registry is the delivery path**
  (`DECISIONS.md` D15, PRD **FR-1.14**). This is the one containment rule that is about *Kinship's own*
  supply chain rather than a member's message: a hub that distributes forkable packs is a hub that
  distributes instructions plus tool grants plus named secrets, to a runtime that will honour them. The
  measured base rate for poisoned entries in agent-skill and MCP registries is roughly **12% with
  confirmation bias in the sampling** (`research/AGENT-GOVERNANCE-LANDSCAPE-2026-10-17.md` section 6) — the number
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
of 2026-10-17 — treat as a lane to re-scan before publication, not as novelty to advertise (section 2.3's forbidden line
applies).

### 2.8 Disclosure as a non-overridable action class

section 2.5 states the requirement — every member-facing utterance identifies itself as an agent. This section states
the **governance** consequence, which is the part that makes it credible rather than a preference:

- Identity disclosure is **not an autonomy level and not a setting**. There is no `Allowed` state in which an
  agent may send member-facing content without it, because **the tool that would do so does not exist in the
  toolset**. The capability is absent, per section 1.1's "`never" is grep-verifiable" rule.
- It is therefore **outside the escalation path**: a shatter-guard freeze (section 2.6) can demote a lane, and an
  organiser grant (section 1.8) can promote a class, and neither operation can touch disclosure. Promotion of a
  disclosure-bearing class promotes *sending*, never *anonymity*.
- An agent may not deny being an agent. If asked "are you a bot", the only permitted answers are affirmative
  ones plus what it is doing there. This is a skill-level constraint (`identity-disclosure`, loaded by every
  member-facing agent) **and** a structural one — the assertion must be checkable in the outbound payload, not
  only in the prompt.
- The pack cannot configure it away. A fork that deletes the disclosure field fails validation (section 1.9's test
  discipline and the pack validator in `packs/kopdar-ops/`), rather than silently shipping a quieter bot.

Why it belongs in the spec and not the roadmap: this is the single line item most likely to cause the backlash
the evidence base predicts (section 2.5; Moltbook decay, AI-restrictive subreddit bans doubling), and the cheapest
possible defence. It is also the property that makes an *unofficial* WhatsApp automation route unacceptable —
see `DECISIONS.md` D11 and `research/COMPETITOR-ANALYSIS-2026-10-17.md` section 1.

### 2.9 The member as a subject, not only as an input source

section 2.7 protects the fleet *from* the member. This section protects the member *from* the fleet, and the distinction
matters because everything else in this spec is organiser-facing: an audit trail the organiser can read is not a
right the member can exercise. Derived in `community/MEMBER-LENS-2026-10-17.md` — a **simulated** lens, no primary
research behind it, and that is exactly why its rules are written as structural constraints rather than as
promises about what members will appreciate.

Four properties, each stated so an implementer can fail a test on it:

- **Every member-visible utterance carries the human it is on behalf of.** Disclosure (section 2.8) answers *what* spoke;
  this answers *who is answerable for it*. The field is `on_behalf_of`, it is written at send time into the audit
  record, and it is **not derivable later** — which is why it binds in v0 even though nothing member-facing ships in
  phase 1. A log that omitted it cannot be backfilled without fabricating history, and a fabricated audit trail is
  worse than none: it is the product's core claim, quietly false.
- **A member's suppression is a persisted object with state, and it is the member's.** `(memberRef, actionClass,
  suppressedSince, source)` — honoured across every lane, checked before any commit class runs, and **outside the
  escalation path**: no autonomy promotion, no `allow always` grant, and no pack setting may promote past it. A
  "stop" that the organiser can re-enable is not an opt-out; it is a mute button on someone else's consent.
  Contrast with section 1.3: a ghost watcher promises a human action that has no row. A ghost opt-out is worse — it
  promises a *member* protection that has no row, and the breach is the one that gets screenshotted.
- **Nothing that leaves the community may identify a member.** Reports (sponsor, recap, digest) are
  **aggregate-only** above a named floor, and the floor is a config value with a hard minimum, not a suggestion.
  The mechanism is the same one section 1.9 already built for PII: redaction layers applied at *assembly* time, so the
  agent never sees a name it could leak, plus a validation assertion on the artefact itself. A single
  named-attendee report is unrecoverable once sent — the only acceptable failure mode here is refusing to assemble.
- **A flag is a record about a person, and the person is a party to it.** Flag-only (section 2.3, section 3.5) is the right
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
and is **not asserted here** (PRD section 12-Q3). What is built here is the regime-independent substrate that makes any
such answer possible — a suppression ledger, an accountability field, and artefacts that cannot leak a name.

### 2.10 Reserved — the member's positive benefit

`community/MEMBER-LENS-2026-10-17.md` section 4 names an open sequencing contradiction: the one thing a member
*gains* — attributable proof-of-work — is owned by the hub, which D6 deferred to phase 4. That is the owner's
call, not a spec section, until he rules on it. Written here so the gap is not lost inside a review file.

### 2.11 Cross-community promotion: content in, copy out — never member data out

Communities join up. A partner community asks ours to promote their event, a co-hosted edition needs both
audiences, and the organiser — being a person who wants his community to have nice things — says yes. That
consent is real, and it transfers **zero trust**: the partner is a third party the organiser vouches for,
not a lane the fleet extends. Four rules make the "yes" safe to say:

- **A partner gets no key, no grant, and no scope.** The grant taxonomy (section 1.8) is held by humans; a partner
  is a *subject* of copy, never a holder of autonomy. `promote.cross-community` sits at `draft`, and a pack
  that declares the class must also answer `needs.partner_policy` — the named allowed partners and the
  required disclosure line — or the class is unreachable. Fail closed, same as every other gate.
- **The fleet cannot authenticate a partner's facts.** Their attendance figures, their price, their date are
  stranger input at section 2.7's trust level with one difference: the organiser vouched for the *partner*, not for
  the *numbers*. So a partner number without a source the organiser named escalates — this is the existing
  "a number has no source" trigger, applied to a vouched sender. Vouching for a friend is not evidence.
- **The member's rights survive the partnership unchanged.** A member who said stop is not reachable by
  partner content — a partnership is not a second lane around the suppression row, and partner promotions
  count against `member_message_cap_per_24h` like anything else. The disclosure line names the partner and
  the relationship, in both languages, on top of the standing section 2.8 disclosure — it does not replace it.
- **Copy travels; people do not.** The partner receives nothing but words the organiser approved. No member
  list, no RSVP data, no identifier in any direction — which is `memberdata.export`'s absent status doing
  its job. Whether a *co-hosted* event ever justifies a merged guest list is a separate question, gated on
  section 12-Q3's regime answer and on per-member consent at RSVP time; until both exist, the default is **never**
  (PRD section 12-Q11). Members who belong to both communities are unknowable to the fleet, and that is fine: the
  cap, not clairvoyance, is what stops the double-spam.

The pattern this closes is the classic unsupervised-fleet failure: a partner asks for reach, the organiser
says yes once, and an always-grant quietly means every event, forever, to everyone — including the people
who said stop. A grant that names no partner and no window is not generosity; it is an omission (section 1.8).

### 2.12 The sanction ladder: the community writes its rungs down, the fleet cannot climb them

section 2.9.4 promised the flagged member due process — told after the fact, with a reason, appealing into the same
queue. section 1 item 4 of `research/COMMUNITY-GOVERNANCE-PATTERNS-2026-10-19.md` records what real communities
actually do: they sanction **graduatedly** — a nudge, then a private word, then a public correction, then
removal as a rare and regretted last step (Ostrom, graduated sanctions). Nothing in this spec so far let a
community *state* that sequence, because the only vocabulary available was an action class, and an action
class is a thing an agent can do. That is the wrong container: the sequence belongs to the community and the
act belongs to a person. So the pack may now declare a ladder as **data**, and this section states the five
properties an implementer can fail a test on (`DECISIONS.md` **D37**, PRD **FR-5.11**):

- **A rung is not a capability.** `sanction_ladder:` lives beside `guardrails:` in the pack and appears in no
  `tools:` list, no `autonomy_by_class` key, and no action class. There is no `moderate.sanction` class to
  escalate — Part 5's absent list carries it. **The gate is reachability, not vocabulary:** a rung's `via:` is
  refused when some agent in the same pack declares that exact tool, and is legal when nobody does, because a
  community is allowed to write down that its organiser uses Discord's own ban button. `PKG-63`.
- **Every rung names a human seat.** `by:` must be a member of the org's `human_seats` set (section 1.11, D36),
  defaulting to `organiser`. This is invariant #1 stated from below: the fleet flags, a person sanctions, and a
  ladder that hands a rung to an agent is an autonomous moderation lane wearing a ladder's clothes. `PKG-62`.
- **Every rung says what the member is told.** `member_told:` is required. A sanction the subject learns about
  by inference is a rumour, and section 2.9.4 already promised better than that.
- **The last rung names the way back.** `appeal:` is required on the final rung only — the bottom of a ladder is
  exactly where a member needs the route back in, and a rung with no way back is an ejection, not a sanction.
- **Two rungs, or none.** A ladder of one rung is a binary. **Absence is legal and no default ladder is
  supplied**: a community that does not moderate has no rungs to name, and a runtime that invents them would be
  writing the community's norms for it — the same reason `needs:` refuses to imagine a sponsor list.

The reading rules belong to the strict reader, not the shape gate. `runtime/src/pack.ts` refuses an unknown key
inside a rung, a line it cannot parse, and a rung with no name; the validator deliberately does **not** refuse
those, because `loadPack` runs the validator first and a duplicated refusal would make the parser's door
unreachable — a check that cannot fail is the D24 class, and a validator that silently *skipped* an unreadable
line would be worse. What the validator does check is that the file may not contradict itself: a second
`sanction_ladder:` block in one file fails, because a hand-rolled reader takes the first and ignores the rest,
so a fork could ship a ladder no check ever saw.

`[UNVERIFIED]` Whether a declared ladder changes anything for a member is untestable here: phase 1 sends
nothing (D21), the rungs are executed by humans outside the fleet, and the ladder is not wired to any event
type. What this section claims is narrower and checkable — that a pack can record its consequences honestly,
and that recording them does not hand the fleet a way to carry them out.

### 2.13 The community's coverage window: the hours a human was on duty, and what waited past them

Every governance rule in this spec so far is about what the **fleet** may do and what a **member** is owed.
None of them is about the third thing a community has: a promise it made to itself about when a human would
be watching. A community that answers questions between 09:00 and 18:00 on weekdays has made a staffing
promise; a runtime that says nothing about it cannot tell the difference between "we answered" and "nobody
was there", and a community that cannot tell that difference cannot tell whether it is keeping its word.

This is the gap the SLA literature keeps separate and the community-agent literature mostly collapses.
The member's quiet hours (FR-5.5, `members.ts`) answer *"may I contact this person?"* and live in the
**member's** zone — a member protection. The coverage window answers *"was anyone watching when this
community was left waiting?"* and lives in the **community's** zone — a staffing fact. They are different
questions, different clocks, and different owners, so they are not allowed to share a field.

Four properties, each one a thing an implementer can fail a test on (`DECISIONS.md` **D54**):

- **A window is pack data, not an org floor.** `coverage:` lives beside `guardrails:` in the pack, and only
  the community can state its own staffing. It is not a floor an org may impose, and it is not a member
  protection the org may lower. **Absence is legal**: a pack that declares no window has an *unknown* duty
  state, and the read says `null` — never `0`. Zero would claim the community was never on duty, which is a
  different and false claim.
- **The two modes are not the same shape of claim, and the type says so.** `mode: staffed` names a zone, the
  weekdays it covers, and the hours it opens and closes — every one load-bearing. `mode: always` is a 24/7
  community: it has **no window**, so there are no days to name, no hours to open and close, and no shift that
  can end. The type is a discriminated union, because pretending the two modes have the same shape would make
  the read lie. A community that names no zone in `always` mode reads back `null` — an invented "UTC" would be a
  claim about a community nobody described — and a file that writes `days:`/`opens:`/`closes:` alongside
  `mode: always` is **refused**, because it disagrees with itself.
- **The window is a local wall clock, never a stored offset.** "09:00 in Jakarta" is a statement about
  Jakarta's calendar, so it is evaluated there. A window that spans a daylight-saving transition therefore
  keeps its local meaning; 09:00 is 09:00 on both sides of the change. Storing a UTC offset and subtracting
  it is exactly how a "09:00–18:00 staffed window" silently becomes "10:00–19:00" twice a year.
- **Only a shift whose end has passed counts as missed.** The SLA rule: "requests submitted outside
  coverage hours have their response-time clock start at the beginning of the next coverage window"
  (ArcadeDB's SLA, read 2026-10-22). An obligation raised at 10:00 and still open at 12:00 is *inside* the
  shift that ends at 18:00; it has not been missed. **The clock pauses outside coverage.**
- **A gap that spans a closed window is not a miss.** Created Friday 20:00, still open Monday 10:00, staffed
  Monday–Friday: Friday's shift ended *before* the obligation existed and Monday's has not ended yet, so
  nothing was missed. This is the "Friday 5:30pm → clock starts Monday 9am" case, and it is the single rule
  that separates a staffing promise from a blame metric — a runtime that counted it would be publishing a
  number about the community's diligence, and the number would be false.

The read it produces is a section of the existing health snapshot, and it is **a read**: it appends nothing
and replays identically (section 1.2). It names the window, says whether a human was on duty at the moment of the
read, and counts the obligations that outlived a staffed shift. It does **not** say whether the community is
healthy, and it does not say what anyone felt — PRD section 5 keeps sentiment and churn out of v0, and a health
read that implies omniscience is a lie. The `unmeasured` list grows an entry saying so, because a health read
that only states what it can measure teaches the reader to trust the parts it did not.

The reading rules belong to the strict reader. `runtime/src/pack.ts` refuses a mode it does not know, a
staffed window with no zone, an unknown weekday, hours that are not `HH:MM`, a shift that closes before it
opens, a key the block does not have, a file that writes the block twice, and a `mode: always` block that also
writes a shift. The last two are for the same reason the ladder's duplicate is refused: a hand-rolled reader
takes the first block and ignores the rest, so a fork could ship a window no check ever saw, and a file that
writes `days:` beside `mode: always` is disagreeing with itself.

**The two doors are split by what each can judge, and the split is the point.** The validator (`PKG-65`) checks
the *shape* — the mode is one of two, a staffed window has a zone and days and `HH:MM` hours that do not run
backwards, `mode: always` carries no shift — because those are the properties a fork's CI can read off a file.
The parser owns the *reading* strictness — a line it cannot parse, a key it does not have — and the validator
deliberately stays silent on those, because `loadPack` runs the validator first and a refusal there would make
the parser's own door unreachable (a check that cannot fire is worth exactly nothing; the D24 class). The two
readers must also agree on *which file they see*: the validator's `coverage:` pattern matches the parser's,
comment and all, because a gate that only found the bare spelling would skip a window the runtime does read.

`[UNVERIFIED]` Whether a coverage window changes the community's behaviour is untestable here: phase 1 sends
nothing (D21), no dated event exists (D9), and the window is not wired to any refusal yet — the standing
engagement lane honours it in its own instructions, not in a gate. What this section claims is narrower and
checkable — that a community can record its own staffing promise, that the runtime can read it without
guessing, and that a promise it did not make reads as unknown rather than as zero.

### 2.14 The community's open threads: a question the community owes an answer to

*(Requirement: PRD **FR-5.13**. Decision: `DECISIONS.md` **D55**.)*

section 2.13 gave the community a clock. It did not give it a **debt**. The clock measures whether the *fleet* left
something waiting — a card, an authorization, a frozen lane, a wake — and all four of those are the fleet's own
housekeeping. None of them is a person.

And the runtime could not say the one thing a community would actually want to know. `inbox.ts` said so in its
own words: *"inputs and cards cannot be joined … this list can say how many arrived and how many produced an
undecided card, but not which message is unanswered. That link is a spec rule (section 1.2 / section 1.7), not a query."* So a
member could ask a question, go unanswered for a week, and leave behind a counter and nothing else — and
`standing-engagement`'s promise to *"hold the thread"* had no runtime behind it at all.

**A thread is that missing primitive, and it is deliberately not a join.** The severed input→card link stays
severed; what is added is a row of its own:

- **A thread is opened by the host, not judged by the runtime.** The host calls `openThread` when it judges an
  input to be a question. The runtime never decides that something is a question — that is the agent's
  judgement, and a human can check it. The runtime tracks.
- **A thread holds no text.** The log stores a hash of every member input and never the words (section 2.7), and a
  thread holds no text either. What it holds instead is a **pointer** — an opaque handle the host can resolve —
  because an inbox item is *"a pointer, not the payload"*.
- **A thread holds the member reference, and no read prints it.** The reference is in the log and the state, so
  the agent can look up that member's own quiet hours before answering them (FR-5.5). Every read sweeps it, with
  the same mechanism and the same rule the rest of the inbox uses — not a second implementation of it.
- **An answer needs a note.** A thread closed with no record of *how* is the same non-record a verdict without a
  why is (section 1.5). A refused answer closes nothing.
- **An open thread is a fifth way a promise waits on a human**, and it is the one that is about a *member* rather
  than about the fleet's own queue.

**And this is what makes section 2.13's clock community-facing rather than fleet-facing.** An open thread is an
obligation, so the coverage window measures it: **a question still open when a staffed shift ended is the
community failing to keep its word to a member.** That is a different fact from "the fleet left a card
undecided", and a more important one — it is the fact a community-lead agent exists to be able to answer, and
the fact the health read's `unmeasured` list has to keep separate from sentiment (PRD section 5 keeps member
intelligence and churn scoring out of v0; this is neither, because it measures the community's responsiveness
and not anybody's state of mind).

Three rules carry it, each with a test that can fail:

1. **A thread is a row, and it replays.** Not a derived view — an event, so the audit trail can answer *"when was
   this asked, and when was it answered?"* exactly as it answers that for every other action.
2. **An open thread is something a human owes.** It appears in the inbox with an age, and it leaves when it is
   answered. The count is a count: a list of them would be a list of people.
3. **A question still inside its shift is not a missed shift.** The same clock rule as section 2.13, applied to a
   question: the community has not had the staffed hours yet.

`[UNVERIFIED]` Whether a community actually answers faster with threads is untestable here: phase 1 sends
nothing (D21), no dated event exists (D9), and the host that would open threads is not wired to a channel yet.
What this section claims is narrower and checkable — that a question can be tracked from raised to answered, that
the runtime can age it and measure it against the community's own hours, and that no read of it carries the
member's words or names the member who asked.

### 2.15 The community's operating posture: how this community is run

Every rule in this spec is about what the **fleet** may do to a **member** (suppression, quiet hours,
the per-24h cap) or what the **organiser** may do (the autonomy ladder). None of them is about the
community as a *body* — how it conducts itself, whether it is discoverable, whether it tolerates being
approached. Those are real differences between communities, and a fleet that cannot be told about them
will behave identically in every one of them.

**And the one thing this section deliberately does not do: there is no country table.** The runtime does
not know that one place tolerates more nudging than another, and this section does not teach it. A
`country → posture` lookup would be a stereotype baked into code, and worse, it would be a rule **nobody
in that community chose**. The only authority on a community's manners is the community. So the
**community declares its posture**, and the runtime **holds the fleet to it**. Two packs in two places
may declare different postures, because that is the community's call and not the runtime's business.

Two axes, because an axis that gates nothing is a decoration:

- **`contact`** — may the fleet approach a member who did not ask? `never` (no 1:1 member message at
  all), `asked_only` (1:1 only to a member who has spoken to the community, or who has a question still
  open — section 2.14), `open` (anyone, still subject to the per-24h cap, the member's quiet hours, and a
  member's "Stop."). This is the "people here tolerate being nudged" / "people here do not" axis, and
  it is about **people**, not about channels.
- **`openness`** — is the community discoverable, and may the fleet post publicly? `closed` refuses
  `commit.channel-post` outright; `open` allows it, still at the class's own autonomy level and still
  `allow once only` in v0. This is the "some accounts should be private" axis.

**The direction of resolution is the same as everywhere else in this spec: a pack may only be STRICTER
than its org.** The org's value is its most-*permissive* posture — an operator running a closed
professional community sets the floor to `never`/`closed` and every pack under it inherits that. A pack
that tries to be looser is **refused, not clamped** (section 1.10), because a value silently rounded toward the
org is a file that lies about the system it configures.

**Absence is not permission.** A pack that declares no posture gets the conservative default —
`contact: asked_only`, `openness: closed` — and a fork that deleted the block did not decide to be open.
**This is a behaviour change for any pack that has never declared a posture**, and it is a *tightening*:
the classes concerned (`commit.individual-message`, `commit.channel-post`) already required an explicit
grant and already sit at `draft` in v0, so the reach removed is small and in the safe direction.

**And a posture can only ever be an ADDITIONAL limit.** The contact gate sits *after* `assertContactable`,
the quiet-hours check and the per-24h cap, so a member who said stop, or who is in their quiet hours, is
refused by their own rule first and never reaches the posture. A community's manner is a floor under the
fleet, not a licence to override a member.

`[UNVERIFIED]` Whether any posture actually changes a community's behaviour is untestable here: phase 1
sends nothing (D21), no dated event exists (D9), and the pack that would exercise a `never` posture is a
pack nobody has written yet. What this section claims is narrower and checkable — that a community can
declare how it is run, that the runtime resolves it against its org, that the fleet is held to it, and
that the effective posture is reported with the provenance that says which file decided.

### 2.16 A split working week: a community's hours may differ by the day

section 2.13 gave the community one staffed window: a zone, the days, the hours. **One window can only say
"these days, these hours"** — and a community whose week is split cannot be said at all.

A split week is not exotic, and it is not a matter of taste:

- The **UAE** federal government works **Monday–Thursday 07:30–15:30** and **Friday 07:30–12:00 — a
  half day** — with **Saturday and Sunday** as the weekend (u.ae, the official UAE government platform,
  and the DGHR "New Weekly Work System" FAQ; read 2026-10-23; the system took effect 1 January 2022).
  **Dubai and most emirates** follow the federal pattern. **Sharjah does not**: it works Monday–Thursday
  only — a four-day week — with **Friday, Saturday *and* Sunday** as the weekend. So even inside one
  country, the weekend is not one thing.
- A church, a school, a makerspace with a Saturday session, a community with a members-only evening —
  all the same shape.

**So the window becomes a LIST of windows**, and each window carries its own days and hours. A one-window
community is the list of one, and it reads exactly as it always did — the shipped pack's Monday–Friday
09:00–18:00 is unchanged in meaning.

**And the thing that would go wrong without it.** A community whose weekend is Saturday–Sunday, read by
a runtime that assumed the Western week, would be told it is **on duty on Friday evening** and **off duty
on Saturday morning** — both exactly backwards. A staffing promise measured against the wrong calendar is
worse than no promise, because it produces a confident number.

**This is a general capability with a primary-sourced example — not a country table.** The runtime still
does not know what Dubai is, or what the UAE's working week is, and section 2.15's rule holds: the **community
declares** its own windows and the runtime reads them. A pack for a Sharjah community would declare
Friday–Sunday off, and **nothing in the code would have to change** — which is exactly the point of
declaring rather than looking up. The UAE facts are the *evidence* that a split week is a real shape
worth supporting; they are not a table the runtime carries.

`[UNVERIFIED]` Whether any community's split week changes its behaviour is untestable here: phase 1 sends
nothing (D21), no dated event exists (D9), and no pack has yet declared a split week. What this section
claims is narrower and checkable — that a community can declare different hours for different days, that
the runtime reads each window's own days and hours, and that a shift which ended on a SHORT day is a shift
that ended.

### 2.17 The runtime speaks the community's language pair, not Indonesia's

section 2.15 gave a community the right to say how it is run. It could not yet say **what language it runs in**,
and that was not an oversight — it was written into the shape of the code. Every card carried `textId` and
`textEn`. Every revision hash was taken over those two strings. Every log line named them. **The field
names were the decision**, and they said: this product serves Indonesian communities, in two languages,
forever.

That is why "cover Dubai" could not be a pack edit. A community in English and Arabic could not be
*expressed*, let alone served, because the copy had already answered the question.

**So the copy is now a map keyed by language code, and the pair is a pack-level declaration.**
`runtime/src/locales.ts` is the single source of truth: the pairs a community may declare
(`['id','en']` and `['en','ar']`), the canonical disclosure line in each language, and the copy the
runtime writes **on its own** — the budget-stop card (section 1.6) and the escalation card (section 2.4) — in each of
them.

Three rules, each with a test that can fail:

1. **Every declared language carries the canonical disclosure line, or the send refuses** (FR-5 / section 2.8).
   The rule was always true in spirit — "a member-facing send discloses itself" — and it is now true in
   the community's own languages rather than in a fixed two. **The line is canonical, not a translation**:
   a member in Arabic gets the *same promise* the English member gets, not an approximation of it.
2. **The runtime's own cards are written in the community's languages.** A budget stop raised in
   Indonesian to a community that reads English and Arabic is a card nobody can act on — and a card
   nobody can act on is worse than no card, because it looks like a record of something happening.
3. **The revision hash is taken in the pack's declared order**, not the order a caller happened to type
   the keys in. The revision is the artefact; two calls carrying the same two strings are the same
   revision however they were written, and different copy in *either* language is a different one.

**And what this is NOT.** It is not a claim about a culture. Arabic is here because a community in Dubai
needs it and the disclosure line has to be canonical in whatever language the community reads. What a
community *tolerates* — whether it wants being approached, whether it is discoverable — is still the
**posture** (section 2.15), declared by the community, and still not a table this runtime carries.

**The cost, stated plainly, because this one changed the log.** The card's revision now carries
`text: { <language>: <copy> }` instead of `textId` / `textEn`. That is a **log-format change**: a log
written by an earlier build does not replay against this one, and the reference host's `manifest.json`
carries a `formatVersion` for exactly this reason. The revision hash's *inputs* are unchanged in kind —
the same copy, joined in the pack's order — so an approval still binds to exactly the bytes that ship
(section 1.5), but a pack's own log must be re-written.

`[UNVERIFIED]` Whether a community served in Arabic behaves differently is untestable here: phase 1 sends
nothing (D21), no dated event exists (D9), and no pack declares the pair yet. What this section claims
is narrower and checkable — that a community may declare a pair the runtime implements, that its copy is
carried in both of its languages, that the disclosure gate holds in each of them, and that the runtime's
own cards are written in them too.

### 2.18 The fleet runs on the community's own words

Everything above is machinery for judging an action. None of it decided **what to do**. The runtime could
adjudicate a card, meter a run, schedule and fire a timer, and put a card in front of a human — and the
*caller* handed it the copy, one `--text-id` at a time, on a command line. A host that invented the
drafts would be inventing behaviour the pack does not have, so the host did not think. The result was a
control plane that could judge a card and never produce one, and a "production mode" that was a script
somebody had written by hand.

**So the community's own words became the fleet's instructions, and the runtime learned to read them.**

A community's working file carries three things: **the copy** (per lane, per phase, in the languages the
pack declares), **the next event** (when it is, and the facts the copy may draw on), and **the members**
(who they are, and who has said stop). The file is the community's and is gitignored, like the eight
answers — the runtime never reads it from disk; the host reads it and hands it over in memory.

Four rules, each with a test that can fail:

1. **The copy is the community's, and it is filled from facts the community supplied.** The runtime writes
   no member-facing copy of its own and invents no fact. A `{slot}` with no value is **not** a blank left
   in a message — it refuses the template, because a message with a hole in it ships a lie about a venue
   by leaving the venue out.
2. **A lane the pack does not declare is not attempted.** `agents.*.autonomy_by_class` is the inventory of
   what this community's fleet may do. A copy written for a class no agent declares has nobody to hold it.
3. **Only a timer-backed phase gets a timer.** The pack's `event-lifecycle` skill says a phase moves "on a
   named condition: a human verdict, a fired timer with a persisted wake row, or a deliverable that
   regenerated successfully — **never on elapsed time alone**." So `t-minus-7` and `t-minus-1` get wakes,
   and every other phase is refused a clock it is not allowed to have. **The rule is kept, not bent.**
4. **The disclosure is present before approval, and the community put it there.** The `{disclosure}` slot
   is filled with the runtime's canonical line for that language, in the place *the community* put it; a
   copy without the slot is refused at plan time — which is before the event, rather than at the commit
   that would have refused it anyway.

**And the timer is local.** "T-1d" means one day before the event *at the event's own local time*: the
shift is applied to the calendar date in the offset the community wrote, and the offset is carried across
unchanged. Subtracting 24 hours from an instant would put a reminder on the wrong local hour twice a
year — the same wall-clock rule section 2.13's coverage window is held to, applied to the timer for the
same reason.

**What a scheduled wake now carries.** A wake used to be a bare promise — "I will look at this on
Thursday" — with nothing on the other end of it, so firing it produced a log line and no work. **A wake
now carries the action it will attempt**: the lane, the agent, the phase and the copy. Firing it *is* the
fleet taking that action, through the same gate any hand-fed action goes through, so every refusal still
applies — and the phase-origin claim is taken first, because "one reminder per event per phase" is
structural (the pack's `reminder-schedule` skill) and not a courtesy the second timer extends.

**What this is NOT.** It is not a model. There is no language model anywhere in this repository, and there
is not going to be one: the copy is the community's, the facts are the community's, the rules are the
pack's, and the runtime's job is to refuse what does not add up. A model would have made the copy better
and the *guarantees* worse, because a guarantee about a sentence nobody wrote is not a guarantee.

**What it does not change.** No transport ships, so every member-facing commit still refuses at
`no_transport` (D21) — and now a **new user can watch that happen**: plan, run, approve, publish, and the
gate stops the send with the authorization left intact. Nothing member-facing sends, and no autonomy
class changed.

`[UNVERIFIED]` Whether a community's own copy in the fleet's hands reads well to its members is untestable
here: phase 1 sends nothing (D21), no dated event exists (D9), and no pack declares its own templates yet.
What this section claims is narrower and checkable — that a community's copy, its facts and its members
can be read, that a lane the pack does not declare is refused, that a template with a hole is refused, that
a timer-backed phase produces a wake that attempts its action, and that a human may still say no.

---

## Part 3 — What this spec must NOT contain

- ❌ Any performance or ROI claim ("saves hours"). Banned by the PRD honesty contract section 5 and
  the claim ceiling.
- ❌ Any market-size or community-size number, including any Indonesian talent-gap point
  estimate (the viral "21,500 by 2030" figure is **banned as unverifiable**).
- ❌ A claim of compliance with any regime. UU PDP and platform data terms are an
  **open question** (PRD section 12-Q3), stated as one. What the spec *does* claim are the
  regime-independent properties: dated/versioned outputs, human-in-the-loop, replayable audit,
  no silent messaging.
- ❌ An OSI license commitment baked into the spec body (see section 12-Q4; open the schema+SDK,
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
   `research/COMPETITOR-ANALYSIS-2026-10-17.md` section 5 rather than invented. (Fifteen skills and 21 classes as of
   the same day's member-lens pass — section 2.9 added four member-facing classes; sixteen skills and 22 classes after
   the same-day cross-promotion addition (section 2.11, D20). The derivation set is what existed when Part 5 was
   written and is left as the record.)
3. **Still open.** The 2.3 authority model, at least as a named open problem with the two candidate shapes.
4. **Still open.** A "how to audit a deployment in five minutes" section — the replay UI as a checklist, since
   a self-hosting organiser will not read the log otherwise.
5. ~~Reuse decision (section 12-Q6/Q8)~~ — **answered on first-hand code evidence**, not opinion: Kinship is a thin
   purpose-built plane, Paperclip's pack format is the donor, and the mechanism mapping lives in
   `research/PAPERCLIP-OSS-STUDY-2026-10-17.md` section 4 (decision `DECISIONS.md` D10). The publishable artifact must
   carry that mapping table as an appendix, because "what did you borrow" is the first question a framework
   reader asks — and section 2.3 forbids answering it with a claim of novelty.

## Part 5 — The action-class taxonomy (closes former open item 2)

The ladder is meaningless without a finite verb list. These classes are derived from the twelve pack skills
(`research/COMPETITOR-ANALYSIS-2026-10-17.md` section 5) and the PRD section 6 requirements, not composed freshly. **Default is
deny**, so "default" below is the most permissive posture a v0 pack may boot with; anything higher is an organiser
grant (section 1.8).

| Class | Verbs in it | v0 default | Highest posture that may ship | Constraint that travels with it |
|---|---|---|---|---|
| `observe.read` | read channel history, read RSVP source | `auto` (zero outbound) | `auto` | Scoped to *named* channels/events; read is not silent member-data export |
| `draft.promote` | ID+EN promo copy, event blurb | `draft` | `opt-in-auto` | Disclosure line attached; no invented attendee counts |
| `draft.reminder` | T-7d / T-1d reminder | `draft` | `opt-in-auto` | Per-origin single-active (section 1.9.4) |
| `commit.individual-message` | email / Telegram / Discord individual send | `draft` | `opt-in-auto` | Cheapest channel first; budget-checked before send |
| `commit.template-send` | WhatsApp approved template → **individuals** | `draft` | `opt-in-auto`, only with live rate + budget headroom | Priced in the card; refuses when the rate card is stale (FR-4.3); **never a group** |
| `commit.channel-post` | post into the group under the community's name | `draft` | **Allow once only, in v0** | Highest brand risk; this is the class shadow mode exists to earn |
| `answer.question` | fast reply lane (what time / where) | `draft` | `opt-in-auto` | Disclosure mandatory (section 2.5 / section 2.8) + visible escalate button |
| `rsvp.chase` | reconcile guest list, chase non-responders | `draft` | `opt-in-auto` | Never invents a headcount; cites the export it read |
| `nudge.no-show` | post-event nudge | `draft` | `opt-in-auto` | Email → Telegram/Discord before any paid template |
| `report.assemble` | recap, sponsor report | `draft` | `opt-in-auto` (to a named human) | Dated window, regenerable, its own `Model Used` line |
| `moderate.flag` | flag to human queue with reason + confidence | `auto` | `auto` | **Flag-only in bundled packs**; no delete/ban tool exists |
| `escalate.to-human` | hand off with context | `auto` | `auto` | Load-bearing: the pack refuses to boot without `needs.escalation_contact` |
| `budget.spend` | any metered LLM/tool call | `auto` under ceiling | `auto` | Warn-then-hard-stop in the organiser's currency (section 1.6) |
| `member.suppression-check` | read a member's opt-out state before any commit class | **`auto`, mandatory, unbypassable** | same | Every `commit.*` and `nudge.*` runs it first; absent suppression ≠ suppression, so a missing row is treated as *unknown* and the message is held (section 1.7 fails closed) |
| `member.notify-optout` | persist a member's stop/snooze, across all lanes | `auto` | `auto` | section 2.9. It is outside the escalation path: no grant can promote past it, and the organiser cannot re-enable it |
| `member.notify-flagged` | tell a member they were flagged, after the fact, with reason and the deciding human | `draft` | `auto` (to a named human) | section 2.9's due-process rule; the appeal re-enters the same queue the flag came from |
| `report.aggregate-only` | assemble a sponsor/recap report with no identifiable member | `auto` under the floor | `auto` | section 2.9; the redaction happens at assembly so the agent never holds the name (section 1.9's mechanism, reused) |
| `promote.cross-community` | a partner community's event/copy to our members | `draft` | `opt-in-auto`, grant must name **partner + lane + window** | section 2.11; `needs.partner_policy` gates the class; partner numbers escalate without a named source; counts against the member cap; never carries member data |

**Structurally absent — `never`, not denied.** These must be greppable as missing from every bundled pack:

- ❌ `whatsapp.group-send` — the official capability is capped at **8 participants** and is opt-in gated, so it
  cannot reach a real group (`DECISIONS.md` D13, competitor section 1 as corrected); the unofficial route risks the
  organiser's own number (D11)
- ❌ `message.anonymous` / `message.without-disclosure` — section 2.8
- ❌ `message.as-member` — an agent posting as if it were a community member (astroturfing). section 2.8 makes agents say what they are; this makes pretending structurally impossible. A partner asking the fleet to "just post it like a member wrote it" is declined by absence, not by policy
- ❌ `moderation.delete` / `moderation.ban` — the human acts (E6, FR-3.2)
- ❌ `moderation.sanction` — there is no action class for climbing the ladder (section 2.12, **D37**). A ladder is a pack's
  *statement* about what its humans do, so it has no class, no tool, and no autonomy level; `PKG-63` refuses a rung
  whose `via:` names a tool some agent declares, which is the same boundary seen from the pack's side
- ❌ `score.member` — engagement scores, attendance rankings, per-member profiles. Not "restricted": absent.
  A product that *can* rank members will be asked to, by a sponsor, quarterly (section 2.9)
- ❌ `member.opt-out-ignore` / `member.opt-out-override` — clearing or bypassing a suppression row is not a
  capability the toolset contains, so no autonomy escalation, grant, or pack edit can reach it (section 2.9)
- ❌ `report.name-a-member` — an identifiable individual in any externally-facing artefact (section 2.9)
- ❌ `memberdata.export` to an unapproved destination — UU PDP posture is an open question (PRD section 12-Q3), so the
  class does not ship while the question is open
- ❌ `spend.beyond-budget` / `price.commit` — a hard stop that can be retried past is not a stop
- ❌ `trust.raise-self` — an agent cannot widen its own scope or re-label an object it read (section 1.7)

`[OPEN]` Two classes are named but unproven and must not be promoted in phase 1: `commit.channel-post` and
`answer.question` at `opt-in-auto`. Their promotion threshold is a shadow-mode output, not a spec decision.

---

## Part 6 — Implementation map (added 2026-10-17, `DECISIONS.md` D21)

The outline above is now implemented as tested code in `runtime/` — a dependency-free TypeScript
library (node ≥ 23, erasable syntax, no install step; zero dependencies. The size is counted rather
than remembered — `find runtime/src runtime/test runtime/tour.ts -name '*.ts' | xargs wc -l | tail -1`
prints 13,560 as of 2026-10-23. The gate suite itself is **178 cases** across `scripts/`, split 6,361 domain code / 6,500 tests / 699 tour. The count is re-run whenever a
row is added here — the previous row in this sentence said 5,148 on 2026-10-18, then 7,035 the same day's
D35–D36 pass, then 7,361 at D37 (the sanction ladder: 155 lines of runtime tests and 50 of tour against 121 of
domain code, plus 88 more test lines under `scripts/`, which this counter does not scan), and the 74-line gap
since is D38 (the run-cap scope: 23 of domain code, 27 of runtime tests, 24 of tour — a whole capability for a
signature that already had its meter). This map is the walk a reviewer
takes from a spec rule to the code and the test that holds it. Its boundary, stated before the rows:
it maps *the semantics*, not a deployed system. No channel transport ships, every member-facing
commit refuses at the transport gate with its one-send authorization intact, and phase 2's transport
integration — where end-to-end proof would begin — stays behind the shadow-mode gate.

| Spec rule | Code | Held by |
|---|---|---|
| section 1.1 ladder: default deny, absent ≠ denied, unknown role, `never` as floor | `src/ladder.ts`, `src/types.ts` (`Autonomy`) | `test/ladder.test.ts` |
| section 1.2 audit replay: append-only log, `replay` deep-equality, readable `#seq` timeline, refusals as records | `src/store.ts` (`append` stores a **structured clone**, so a caller mutating its payload afterwards cannot rewrite history), `src/apply.ts`, `src/engine.ts` (`auditTimeline`, `logRefusal`) | `test/store.test.ts`, `test/apply.test.ts`, `test/replay.test.ts`, `test/engine.test.ts` |
| section 1.2 read side (PRD **FR-1.15**, and the first enforcement of **FR-1.11**): the fleet's condition is one dated, positioned snapshot derived only from rows already logged — freezes, queue depth *and card age*, budget state with `null` for an unset ceiling, overdue wakes, refusals counted by code, idle agents — carrying no member identifier and naming what it refuses to measure | `src/health.ts` (`deriveHealth`, exposed as `Fleet.health()`; `withhold()` reuses `partner.ts`'s registry scan), `src/engine.ts` (the method appends nothing) | `test/health.test.ts` (15 cases: purity across two calls, replay deep-equality of the *read*, `retire` at 3 cycles vs `watch` at 1, prefixed/bare/clean substitution controls, the two-integer member block and the `unmeasured` field), `runtime/tour.ts` (3 of the 11 guarantees that existed at D30; the tour now prints 36 — the number in these read-side rows is recomputed per pass, never carried) |
| section 2.19 the daily digest (D65): what the fleet did in a window, per channel, for the person who has to answer for it — a READ, a stated window, no member named, and a named limit on what it cannot attribute | `src/digest.ts` (`deriveDigest`), `src/engine.ts` (`Fleet.digest(now, windowMs)`), `adapters/reference/src/host.ts` (`digest` command) | `test/digest.test.ts` (8 cases: a digest appends nothing, the window is half-open at the start and closed at the end, the channel is the event id, a refusal and an open thread are counted globally because the log carries no event id on them, no member is named, and the scope limit is stated), `runtime/tour.ts` (4 guarantees: the window, the day's work, nobody named, and what it cannot see) |
| section 1.5 / 1.9 one-send, revocation, and the edges of the log (D68): the properties that hold under conditions a test suite never creates — a second send on a spent authorization, a grant revoked in between, two writers on one log, a row removed or edited | `src/cards.ts` (`consumeAuthorization`), `src/engine.ts` (the commit path's own pre-check — the one-send property is enforced at **two** layers, and the test kills only when both are broken), `src/grants.ts` (`revokeGrant`, `findLiveGrant`), `src/log.ts` (`seqProblems`: `seq_missing`, `seq_duplicate`, `seq_out_of_order`) | `test/security.test.ts` (14 cases: the authorization is consumed and a second use refused · the transport refusal leaves the authorization live · an edit retracts the approval and re-queues · a token names its origin · a revoked grant and an expired window are refused · a grant with no scope is refused · a hole in the middle fails verification · an edited row is **tier 2, named and not built** and is caught only by the state comparison, which the host does · a truncated tail is dense and is caught by the manifest · two writers collide on a seq and the verifier does not call it sound · a stop beats everything · an unknown member is held · a missing disclosure is refused) |
| **D69 — the MCP adapter**: any assistant in any platform can ASK KINSHIP FOR PERMISSION. The assistant proposes an action; **the runtime decides** — a card for a human, or a refusal with the rule that fired. There is **no tool that delivers anything to a member**: phase 1 ships no transport (D21), so a member-facing send ends at `no_transport` whoever calls it, and the refusal is in the log | `adapters/mcp/` — a second host, reusing the reference host's seams (the answers reader, the log store, the clock) rather than re-implementing the store; MCP `2025-06-18` over stdio, JSON-RPC 2.0 | `adapters/mcp/test/server.test.ts` (10 cases, **over a real pipe**: the framing, the line endings and the handshake are part of the contract — `initialize` · `tools/list` · `kinship_propose` DRAFTS and never sends · `kinship_approve` without a reason is refused · an unknown tool and method are JSON-RPC errors · the persona names only refusal codes the runtime can raise and fits Grok's 4,000-character budget) |
| section 1.3 no ghost watchers: a promise to follow up requires a persisted wake row | `src/lifecycle.ts` (`scheduleWake`, `assertWakeBacked`) | `test/lifecycle.test.ts` |
| section 2.18 the fleet runs on the community's own words: the copy is the community's, a hole in it refuses the template, a lane the pack does not declare is refused, only a timer-backed phase gets a timer, and a scheduled wake carries the action it will attempt (D60) | `src/plan.ts` (`parseCommunityPlan`, `renderCopy`, `planWakes`, `shiftLocalDays` — the planner is pure: the host reads the community's file and hands the plan over in memory), `src/lifecycle.ts` (`scheduleWake` takes the action; `fireWake` returns the row it fired), `src/engine.ts` (`fireWake` attempts the bound action through the same gate, and takes the phase-origin claim first), `src/members.ts` (`registerMember`, `suppressMember`), `adapters/reference/src/host.ts` (`plan`, `run`, `publish`; `--plan`, `--now`, `--verdict`, `--recipient`) | `test/plan.test.ts` (18 cases), `test/lifecycle.test.ts`, `test/engine.test.ts` (the wake→attempt path, the 409 that keeps a second timer from sending twice, the refusal that is logged, and the run cap on the path the fleet uses), `adapters/reference/test/host.test.ts` (26 cases: plan writes nothing, a second run does not schedule the same promise twice, the human may reject, the publish refusal, and the daily digest), and `runtime/tour.ts` (5 new guarantees: a scheduled wake attempts its action, the drafted card waits on a human, a second timer for the same phase is refused, **that refusal is in the log**, and the run cap stops the fleet) |
| section 1.4 exclusive ownership; the 409 that is never retried | `src/lifecycle.ts` (`claimPhaseOrigin`, `checkoutEvent`) | `test/lifecycle.test.ts` |
| section 1.5 revision-bound approvals; edit consumes the live authorization, v2 re-queues, `stale_target` | `src/cards.ts` (revision hash over both languages) | `test/cards.test.ts`, `test/engine.test.ts` |
| section 1.6 bounded work: unset ceiling refuses, warn-then-hard-stop raises a card, event-scoped, run cap truncates — **and the cap names its own scope** | `src/budget.ts`, `src/runner.ts` (`runActions(fleet, actions, run?)` meters every attempted action, stops at the first crossing with partial results kept, drops the tail without attempting it; the run is the caller's handle, so `report.capScope` is `'this_call'` or `'shared_run'` — D38) | `test/budget.test.ts`, `test/runner.test.ts` (9 cases, two of them the shared-handle bound and the scope label), `runtime/tour.ts` (`one_handle_bounds_the_tick_across_calls`) |
| section 1.7 fail-closed trust resolution; narrower always wins | `src/ladder.ts` (`narrowest`), `src/containment.ts` (`narrowForMemberTrigger`) | `test/ladder.test.ts` |
| section 1.8 grant taxonomy: once / always-named-scope / revocation / supersession; only **a human seat** issues **or revokes** (D36) | `src/grants.ts` (`findLiveGrant` is the authorization path; `grantWithClosedWindow` is a read-only diagnostic that lets section 2.11's expiry name itself; `revokeGrant` gates its own actor rather than trusting a caller — `test/grants.test.ts` proves a member ref revoking directly used to succeed) | `test/grants.test.ts`, `test/engine.test.ts`, `test/roles.test.ts` |
| section 1.9 / section 2.7 stranger-input containment: member text out of the log, upward read substitutes a fixed sentence, no masked preview | `src/containment.ts` | `test/containment.test.ts`, `test/engine.test.ts` |
| section 1.10 settings resolution across tiers (org → pack), **refuse never clamp** (PRD **FR-1.18**, `DECISIONS.md` D35): a value the pack *declared* is validated against the org floor, not widened — so an org can only refuse a pack or fill a blank the pack omitted; a ceiling entry is a real section 1.7 narrowing and may not say `never` (absence belongs to the pack); strictness *direction* is per key (min for a cap, max for an aggregation floor, OR for the two booleans) so `identity_disclosure: required` and `defaults: deny` are the stricter sides; a pack naming an org whose manifest is absent fails boot rather than running floorless | `src/org.ts` (parse + shape), `src/settings.ts` (`resolveSettings`/`deriveSettings`, `effectiveGuardrails`, `ceilingFor` — and the enforcement paths read the *resolved* values, not the raw pack), `src/pack.ts` (the one `node:fs` reader; the org file is read here and nowhere else), `orgs/kinshipai.yaml`, `scripts/validate-pack.mjs` **PKG-58–61** (the same shape rules enforced twice by design — CI and boot) | `test/settings.test.ts`, `test/org.test.ts`, `test/pack.test.ts` (the two tamper cases that breach a floor from inside the validator's own bound, and the missing-org case), `scripts/validate-pack.test.mjs` (PKG-58–61), `runtime/tour.ts` (`fork_cannot_lower_an_org_floor`, `org_floor_is_visible_in_the_effective_number`) |
| section 1.11 the human seat set (D36): one set, four acts (approve/reject a card, issue/revoke a grant, release a frozen lane, take a member decision), with two exclusions that are part of the rule — a shatter **complainant is not an actor** (freezing is not a privilege) and **answerability is not authority** (`on_behalf_of` may name a seat that cannot act, and `'unattributable'` is legal). Shape is enforced, size is not: an org declaring more than one seat is refused *naming PRD section 12-Q12*, which is the owner's unanswered question about delegation. A pack agent named after a seat is a collision, not a role | `src/roles.ts` (`DEFAULT_HUMAN_SEATS`, `seatHolds`, `assertSeat(ctx, by, rule?)`), called from `src/cards.ts`, `src/grants.ts` (×2), `src/shatter.ts` | `test/roles.test.ts` (8 cases incl. the two exclusions and the renamed-seat case: an org whose seat is `ketua` works, and the four former `!== 'organiser'` literals are gone — `test/roles.test.ts` fails the build if a fifth returns), `runtime/tour.ts` (`pack_cannot_add_a_human_seat`) |
| section 2.5 / section 2.8 disclosure as a class: canonical bilingual line inside the approved revision; `on_behalf_of` | `src/disclosure.ts` (`answerableBy` records FR-5.1's `unattributable` for a commit that names no human — an internal commit may have no human, it may not borrow one), `src/engine.ts` (commit order, and a timeline that reads the actor off the event instead of restating it) | `test/disclosure.test.ts`, `test/engine.test.ts` |
| section 2.6 shatter-guard: complaint freezes the lane to draft; only **a human seat** releases (the row said "the organiser" until D36 made the seat set the source of that authority — the *rule* is unchanged, the name now comes from the org) | `src/shatter.ts`, `src/ladder.ts`, `src/roles.ts` (`assertSeat`) | `test/ladder.test.ts`, `test/replay.test.ts`, `test/roles.test.ts` (the complainant-is-not-an-actor exclusion) |
| section 2.9 member as subject: suppression beats any grant, absent row fails closed, no un-suppress, cap counts the member, quiet hours are the member's clock, aggregation floor refuses below 10 | `src/members.ts`, `src/engine.ts` (commit order) | `test/members.test.ts`, `test/engine.test.ts` (order proof) |
| section 2.11 cross-promotion: partner gate, partner + lane + window grants, per-event cap, no member identifier in partner-facing copy | `src/ladder.ts`, `src/grants.ts` (`grantWithClosedWindow` names an expired window instead of hiding it), `src/partner.ts` (the identifier scan: registry-bounded, both languages, names the member and never the copy), `src/apply.ts` (cap counter), `src/engine.ts` (commit order: the content rule runs ahead of authorization so the approved-card path is covered too; the cap sits after the per-member protections and before the transport gate) | `test/ladder.test.ts`, `test/grants.test.ts`, `test/partner.test.ts`, `test/engine.test.ts` (order proofs), `test/pack.test.ts` |
| section 1.12 the capability manifest (PRD **FR-1.20**, `DECISIONS.md` **D104**): a community's manifest declares what the fleet may do — each capability saying **why** it is on, and the seat that answers **resolved from the community's declared seat set** (section 1.11) rather than written into the manifest — and the human check's **existence** is a floor with no off switch, while its **shape** is configurable and enforceable: under `push` a card that needs a human also writes a `ReviewRequested` row naming the seat, and under `pull` it does not. An unknown capability name, a field the runtime does not read (a `seat:` is one), a capability with no `reason:`, and a shape outside `push`/`pull` are each **refused by name** rather than ignored; every word meaning *off* is refused naming the floor | `src/capabilities.ts` (`CAPABILITY_NAMES`, `REVIEW_SHAPES`, `DEFAULT_REVIEW_SHAPE`, `parseCapabilities`, `resolveCapabilities`, `asks`), `src/org.ts` (`parseOrgCapabilityBlock` — the two-level reader that refuses what it cannot read), `src/settings.ts` (resolution + the provenance row), `src/types.ts` (`CommunityCapabilities`, `ResolvedCapabilities`, the `ReviewRequested` event), `src/cards.ts` (the shape decides what a card writes), `src/apply.ts` (the shape guard entry), `orgs/kinshipai.yaml` (`capabilities:`) | `test/capabilities.test.ts` (13 cases: the whole vocabulary of *off* refused, the unknown name, the missing seat, the foreign seat, the missing reason, the unknown shape, the default `pull`, the provenance row, and the two that keep it honest — `push` writes the request and `pull` does not) |
| section 2.12 the sanction ladder (PRD **FR-5.11**, `DECISIONS.md` **D37**): a pack may declare its graduated response as **data**, and the fleet cannot carry any of it out — every rung names a human seat from section 1.11's set, states what the member is told (section 2.9.4), the last rung names the appeal, two rungs or none, absence is legal and **no default ladder is supplied**. The gate is reachability rather than vocabulary: a `via:` is refused when some agent declares that exact tool and is legal when nobody does | `src/types.ts` (`SanctionRung`), `src/pack.ts` (`parseSanctionLadder` — the strict reader: unknown key, unreadable line, unnamed rung), `src/settings.ts` (`resolveSettings` re-checks the shape + reachability at boot), `scripts/validate-pack.mjs` **PKG-62 / PKG-63** (the shape and the reachability, in CI), `packs/kopdar-ops/.kinship.yaml` (4 rungs: nudge → private-word → public-correction → removal) | `test/pack.test.ts` (15 cases incl. the empty-ladder and duplicate-block refusals, and the POSITIVE CONTROL that a pack with no ladder boots unchanged), `test/settings.test.ts` (the seat refusal, the missing `member_told`, the missing appeal, the single-rung binary, and a rung wired to `telegram \| send`), `scripts/validate-pack.test.mjs` (8 cases, both directions per rule incl. `via: discord \| ban` passing because no agent declares it), `runtime/tour.ts` (`sanction_ladder_is_declared_and_out_of_reach`, `fork_cannot_hand_a_rung_to_an_agent_or_a_tool`; the tour now prints 36) |
| Pack boot gate: a fork cannot weaken an invariant (FR-1.14) — the validator's own `validatePack` runs before parsing | `src/pack.ts` | `test/pack.test.ts` (tamper cases on the real `packs/kopdar-ops`) |
| section 1.2 read side, **second artefact** (PRD **FR-1.16**): the same log read as a *list* instead of counts — what a human currently owes, by kind (`verdict` / `handoff` / `release` / `overdue`), ordered by how long it has waited, with ranking explicitly refused, the identifier sweep run **before** the 160-char preview cut, and `memberInputs.linkable: false` because the log carries no input→card join | `src/inbox.ts` (`deriveInbox`, exposed as `Fleet.inbox()`), borrowing `health.ts`'s now-exported `pendingCards` + `withholdMemberIdentifiers` rather than re-implementing them, `src/engine.ts` (the method appends nothing) | `test/inbox.test.ts` (11 cases: purity across two calls and replay deep-equality *of the read*, the `handoff` kind that lived only in the log until D31, cross-kind age ordering, the leak-at-the-cutline control, `limits` naming age ≠ importance), `runtime/tour.ts` (4 of the 15 guarantees that existed at D31; the tour now prints 36 — this row and the health row above each said 19 when they were written, and the count is recomputed per pass, never carried; D38 moved it again 21 → 22) |
| section 1.2 read side, **third artefact** (D35): the *tier stack* itself as a dated, positioned read — what each effective guardrail value is, which file put it there (`pack` / `org` / `default`), which org floor a pack-level value is holding above, what the resolved autonomy ceiling allows per action class, the seat set, the recognised agent roles, and the limits it refuses to exceed. A settings *write* would be a fifth governing actor, so `Fleet.settings()` appends nothing and replays identical | `src/settings.ts` (`deriveSettings`, exposed as `Fleet.settings()` through `src/engine.ts`, which appends nothing), `src/pack.ts` (`Packed.declared` — the set of keys the pack itself wrote, which is what makes provenance a fact rather than a guess) | `test/settings.test.ts` (27 cases as of D37 — was 20 when this row was written: incl. purity across two calls and replay deep-equality *of the read*, provenance sourced from the keys the pack actually wrote rather than the ones it merely did not override, and the seat-collision refusal that stops a pack from handing itself a human act by naming an agent `organiser`) |
| section 2.13 the community's coverage window (PRD **FR-5.12**, `DECISIONS.md` **D54**): a pack may declare the hours a human is **on duty** for it, and the health read reports the window, the duty state at the moment of the read, and how many obligations outlived a staffed shift. Evaluated as a **local wall clock** in the community's own zone (never a stored UTC offset, so 09:00 stays 09:00 across a DST change); **only a shift whose end has passed counts as missed**, so the clock pauses outside coverage; a gap spanning a closed window is not a miss. **Absence is legal and reads as `null`, never `0`** — an unstated staffing promise is an unknown duty state, and zero would claim the community was never on duty. Not the member's quiet hours: that clock is the member's (FR-5.5) and answers a different question. The two modes are a **discriminated union** — `always` is a 24/7 community with no window at all, and a file writing `days:` beside `mode: always` is refused as self-contradictory | `src/community.ts` (`isOnDuty`, `shiftCompletedBetween`, `deriveCoverageVerdict` — the arithmetic never converts an instant to UTC), `src/types.ts` (`CommunityCoverage`, the union), `src/pack.ts` (`parseCoverage` — the strict reader: unknown mode, no zone, unknown weekday, non-`HH:MM` hours, a backwards shift, an unknown key, a duplicate block, a self-contradicting `always`), `src/health.ts` (the `community` section of the snapshot, derived from the same four obligation kinds `inbox` lists), `scripts/validate-pack.mjs` **PKG-65** (the *shape*, in CI — the reading strictness stays in the parser, or the parser's own door becomes unreachable), `packs/kopdar-ops/.kinship.yaml` (the shipped window: `Asia/Jakarta`, Mon–Fri, 09:00–18:00) | `test/community.test.ts` (16 cases: the duty window by community timezone, `always` mode, the weekend gap that is not a miss, both ends of the shift-end boundary, the local-**day** half of the wall-clock rule, the DST-local-meaning case, the health read's shape, the null-not-zero case, the member-identifier sweep, and the pure-read/replay property), `test/pack.test.ts` (the boot-door refusals **and** the parser's own door called directly — nine refusals proved with the *parser's* message, because `loadPack` runs the validator first and a boot-level test can only ever see PKG-65's), `scripts/validate-pack.test.mjs` (14 new coverage cases of that file's 67, incl. the duplicate-block refusal, the POSITIVE CONTROL that a pack with no window passes, and the case that proves the validator does NOT shadow the parser's unknown-key door), `runtime/tour.ts` (`health_reports_the_communitys_coverage_window`, `health_reports_an_unknown_duty_state_as_null`) |
| section 2.15 the community's operating posture (PRD **FR-5.14**, `DECISIONS.md` **D56**): a community declares **how it is run** — `contact` (may the fleet approach a member who did not ask: `never` · `asked_only` · `open`) and `openness` (is it discoverable, may the fleet post publicly: `closed` · `open`) — and the runtime holds the fleet to it. **There is no country table and never will be**: a `country → posture` lookup would be a stereotype in code and a rule nobody in that community chose. Resolved org → pack, and the pack may only be **stricter** — a looser pack is refused, not clamped. **Absence is not permission**: no posture declared means the conservative default (`asked_only` / `closed`). The gates are the 1:1 member classes (`commit.individual-message`, `commit.template-send`) and `commit.channel-post`; the contact gate sits *after* the member's own protections, so a posture can only ever be an additional limit | `src/posture.ts` (`assertPostureContact`, `isOneToOneClass`), `src/types.ts` (`CommunityPosture`, `DEFAULT_POSTURE`), `src/pack.ts` (`parsePosture` — the strict reader), `src/org.ts` (`parseOrgPosture` — the org's most-permissive floor), `src/settings.ts` (`resolveSettings` — org → pack, refuse never clamp; the provenance rows), `src/engine.ts` (the two gates), `orgs/kinshipai.yaml` (`posture:`), `packs/kopdar-ops/.kinship.yaml` (`posture:`) | `test/posture.test.ts` (9 cases: the contact gate at all three levels, the openness gate, the conservative default, the org floor refused and honoured, and the provenance), `runtime/tour.ts` (`the_community_declares_its_own_posture`) |
| section 2.16 a split working week (PRD **FR-5.15**, `DECISIONS.md` **D57**): the staffed window becomes a **LIST** of windows, each with its own days and hours, because a community's week may be split — the UAE's federal government works Monday–Thursday and a **half day** on Friday, with Saturday and Sunday as the weekend (u.ae and the DGHR FAQ, read 2026-10-23), and Sharjah's weekend is Friday–Sunday. A one-window community is the list of one and reads exactly as before. **A general capability with a primary-sourced example, not a country table**: the community declares its own windows and the runtime reads them | `src/types.ts` (`CoverageWindow`, and `CommunityCoverage.windows`), `src/community.ts` (`isOnDuty` and `shiftCompletedBetween` over the list), `src/pack.ts` (`parseCoverage` + `listBlocks` — the list reader), `scripts/validate-pack.mjs` **PKG-65** (the same list, read the same way), `packs/kopdar-ops/.kinship.yaml` (`coverage.windows:`) | `test/windows.test.ts` (6 cases: the UAE split week, the weekend the COMMUNITY declares rather than the runtime assuming, a short day's shift ending, a question inside the long part of the day, the weekend between a half day and the next full day, and a one-window community reading exactly as it did), `test/community.test.ts` (the one-window cases, unchanged in meaning) |
| section 2.17 the runtime speaks the community's language pair, not Indonesia's (PRD **FR-5.16**, `DECISIONS.md` **D58**): the member-facing copy is a **map keyed by language code**, the pair is a pack-level declaration, and `src/locales.ts` is the single source of truth — the pairs a community may declare (`id+en`, `en+ar`), the canonical disclosure line in each, and the copy the runtime writes on its own (the budget-stop and escalation cards). Every declared language must carry the canonical line, or the send refuses (FR-5 / section 2.8); the runtime's own cards are written in the community's languages; the revision hash is taken in the pack's declared order. **This changes the log format** — a revision carries `text: { <language>: <copy> }` instead of `textId`/`textEn` — and the tour is now inside the typecheck | `src/locales.ts` (`LOCALES`, `SUPPORTED_LOCALE_PAIRS`, `localeIsSupported`, `localeCopy`, `localeTextForHash`), `src/disclosure.ts` (`disclosureLine`, `assertDisclosed` over the declared pair), `src/types.ts` (`LocaleText`), `src/cards.ts`, `src/engine.ts`, `src/partner.ts`, `src/inbox.ts`, `src/budget.ts`, `src/pack.ts` (the `locale:` gate), `runtime/tsconfig.json` (the tour is now typechecked) | `test/locales.test.ts` (5 cases: the pairs, an EN/AR community drafting a card with copy in both languages, the hash and the pack's order, the runtime's own budget-stop card in English and Arabic and NOT Indonesian, and a pair the runtime does not implement being refused), `test/disclosure.test.ts` (the canonical Arabic line, and the gate holding in a community's own pair) |
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
`unsourced_number` (section 2.11 needs both a content check and a place in the pack to name a source, and
the pack has no such key yet). `cross_promo_cap` and `grant_window_expired` were in that list and are
now enforced (2026-10-18, D24); `partner_data_leak` left it the same day (2026-10-18, **D27** —
`src/partner.ts`, enforced ahead of authorization for both the grant and the approved-card path).
