# Host contract — the four seams (v0.1, added 2026-10-19 per `DECISIONS.md` D33)

**What this file is.** Invariant #2 says the control plane is the product and the runtime is a
commodity. That is a boundary claim, and until now the boundary lived in three places that were not
this file: a sentence in `AGENTS.md`, a refusal code (`no_transport`), and a scanner
(`runtime/test/boundary.test.ts`). This is the place it is stated once, so that someone adding a
WhatsApp sender, a scheduler, or an OpenAI call knows which folder their code belongs in and what
Kinship will still check afterwards.

**Audience:** the person writing the adapter. Not a buyer, not a member.

**The contract in one sentence.** Kinship decides *what may be sent* and proves that it was decided;
the host decides *whether anything happens at all*, holds every credential, owns the storage, and is
the only thing in this system that can touch another person.

The asymmetry is deliberate and it is the reason the seam exists: a governance core that also opens
sockets cannot be audited by reading its log, because half of its promises are kept in a protocol
layer this repo does not control. So the four things a deployment actually needs — a key, a clock, a
place to put rows, a way to reach a person — are exactly the four things `runtime/` refuses to own.

| # | Seam | The host owns | What Kinship gives the host | Where it is checked |
|---|---|---|---|---|
| 1 | **Credential** | every provider key, token, and secret, held outside this repo | a cost figure to meter, not an API call to make | `PKG-57` (packs), D32 gate (`runtime/src` may not reach the network), `runtime/package.json` has no dependencies |
| 2 | **Clock / tick** | when anything runs, and whether it ever runs | a deterministic `now`, and an `overdue` list when the host forgets | D32 gate (no timer or scheduler import), `health().wakes.overdue`, `inbox()`'s `overdue` kind |
| 3 | **Store** | persisting, pruning, backing up, and access-controlling the event log | `Fleet.events` to write down, and `Fleet.replay(events)` to prove the write | spec section 1.2, `test/replay.test.ts`, `test/store.test.ts` |
| 4 | **Transport** | the channel socket and the act of delivery | the decision to honour, and the receipt it can hand back | D32 gate, `no_transport` at the commit gate, `tour.ts`'s `gatedByDesign` |

---

## Seam 1 — credential: the owner brings the key (BYOK)

The community's model spend is the community's own. The host configures its provider; Kinship never
sees a provider key, and a pack must never contain one.

**The word, said precisely, because this repository had it wrong.** This seam is **BYOK — bring your
own KEY**: the credential is the host's, and the runtime's half of it is to have none. It is not
**BYOD**, and the two are different questions that this seam answers differently:

| | What it means here | Who holds it | Enforced by |
|---|---|---|---|
| **BYOK** — bring your own key | the provider credential, the model, the model provider | the **host** | `PKG-57` (a pack may not contain a key), the D32 gate (the runtime may not reach the network), and `runtime/package.json` declaring no dependencies |
| **BYOD** — bring your own data | the community's **members**, their registry, and the log the host writes | the **host** | the log holds member *identifiers* and never member message text; a member with no row is held (`suppression_unknown`) |

**So a community may run any model, on any provider, on its own hardware, with a key Kinship has never
seen** — and the runtime has no opinion about which one, because the pack's vocabulary does not contain
"model": it contains `budgets.llm_per_event_idr`, a ceiling in rupiah, and `budget.spend`, a lane.

**What the host does.** Calls the model with its own credential, in its own process, and passes
Kinship only the number the governance semantics need: `Fleet.recordSpend(eventId, amountIdr, note)`
meters cost against `budgets.llm_per_event_idr` without knowing which model produced the text.
Drafts arrive as text (`attempt({ text: { <language>: <copy> } })`), not as completions-in-progress. **The copy is a map keyed by language code, not a pair of fields** (D58): the field names `textId` / `textEn` *were* the decision that this product serves Indonesian communities, and they were removed so a community in English and Arabic could be expressed at all. A host written against the old pair will not typecheck against the current runtime — which is the point.

**What the runtime guarantees.** No code under `runtime/src` reads an environment variable or holds a
secret-shaped configuration — `process` appears there only inside a prose comment, and the D32 gate
rejects any import outside its three-module allowlist, so `node:process` cannot be pulled in either.
Nothing calls a provider: the gate fails the build on any third-party package, and a provider SDK is a
credential consumer by construction. `runtime/package.json` declares no `dependencies`,
`peerDependencies`, or `optionalDependencies`, and that absence is itself a test.

**Why this is a build rule, not a review rule.** A pack is the one artefact in this repo designed to be
forked by strangers, so a key sitting in `skills/recap/SKILL.md` is a key in every downstream fork.
`PKG-57` scans every line of every pack file for published provider prefixes (`sk-`, `gh[pousr]_`,
`xox…-`, `AKIA`, `AIza`, `glpat-`, `npm_`, and a PEM block header) and reports the file, the line, and
the *shape name* — never the matched value, because a scanner that prints what it found is how a secret
gets into a build log. The rule is prefix-shaped on purpose: an entropy-based detector fires on revision
hashes, and the first fork that gets a false positive turns the rule off, which is how a credential rule
becomes a decorative one.

**What is not checked here.** That the host keeps its own key safe. That is the host's product.

**And the honest limit of BYOK, which is worth stating rather than discovering.** The runtime **cannot
price a model call.** It receives a *number* — `recordSpend(eventId, amountIdr, note)` — and holds it
against the pack's ceiling. So the budget is a bound on **the host's report**, and a host that reports
one rupiah for a fifty-rupiah call defeats it. Nothing in this repository can catch that, and nothing
should pretend otherwise: **BYOK means the key is outside, and the price of what the key bought is
outside with it.** The runtime's own position is the deliberate one in `settings.ts`: *spend and queue
depth are the organiser's own cost, not a promise to a member* — so the member-facing protections and
the money are held on opposite sides of the seam, on purpose. What the runtime *does* give the
community is the **record**: the log carries every `SpendRecorded` row, so a community can audit what
the fleet said it cost. That is the difference between *the budget is enforced* and *the spend is
visible*, and only the second one survives BYOK.

## Seam 2 — clock: the runtime does not tick (D10)

There is no scheduler in `runtime/`, and phase 1 does not add one: D10 records that shadow mode runs
inside an organiser's existing agent instance, which already has a scheduler, and D21 keeps everything
member-facing behind the shadow-mode gate.

**What the host does.** Decides when a run happens, and — since D60 — *what* the run is about: it reads
the community's working file, asks `planWakes` what the fleet would do, schedules the timers, and fires
the ones that are due by calling `fireWake` for the rows in `health().wakes.overdue`. **A wake now
carries the action it will attempt**, so firing it *is* the fleet acting, through the same gate any
hand-fed action goes through. Because the host owns
the tick, it also owns **what "a run" is** (D38): `runActions(fleet, actions)` mints its own counter, so a
host that calls it once per agent per tick bounds each agent separately and attempts `agents × max_actions_per_run`
across the tick. To make the pack's number mean the tick instead, hold one `createRun()` from
`runtime/src/budget.ts` and hand it to every call in that tick — the report's `capScope` then reads
`shared_run`, and the first crossing truncates the tick rather than one agent's batch.

**What the runtime guarantees.** Time is an injected value: `Fleet.boot(pack, answers, startAt)` takes
a number, every event carries the `at` it was committed at, and no module reads a wall clock —
`Date.now()` appears nowhere in `runtime/src`, and the only `new Date` there is `members.ts` formatting
a timestamp it was handed. So a replay run in 2027 produces the state the log recorded, which is spec
section 1.2's whole point. The D32 gate backs this structurally without claiming to: it allows three `node:`
modules in `runtime/src` (`crypto`, `fs`, `path`), so `node:timers` cannot be imported, and it rejects
dynamic `import()`, so a scheduler cannot be pulled in at runtime. What it does **not** check is a bare
`setTimeout` call written inline — seam 2 stays a design rule plus an import rule, and the honest form
of that is "no scheduler is reachable from `runtime/src` today, and two of the three ways to add one are
gated".

**The failure mode this seam exists for.** A wake whose due time has passed and never fired is a
promise that silently stopped existing — the section 1.3 near-miss, in the host's half. `health()` and
`inbox()` both surface it as overdue rather than pretending it ran.

## Seam 3 — store: the host persists, Kinship proves

**What the host does.** Writes each entry of `Fleet.events` down durably, prunes, backs up, and
decides who may read them. The log is unbounded by design; nothing in `runtime/` deletes history, so
retention is a host policy and it is not Kinship's to make.

**What the runtime guarantees.** `store.append` deep-copies every event
(`structuredClone({ ...event, seq })`), so a host that mutates its own payload object after appending
cannot rewrite history. `Fleet.replay(events)` folds any list of logged events through the same reducer
as live operation, and the tests assert deep-equality of the resulting state — which is the host's
migration and backup verification, for free: restore the rows, replay them, and a mismatch is a corrupt
store rather than a governance bug.

**Read side, same log.** `health()` answers *what condition is the fleet in* and `inbox()` answers
*what is this human waiting on*. Both are pure derivations that append nothing, and both sweep member
identifiers out before returning. A host that caches either must recompute it after every write —
a stale snapshot with a `derivedAt` the reader cannot trust is worse than no snapshot.

## Seam 4 — transport: the only thing that may touch a person

**What the host does.** Owns the channel socket, the session, the rate limits, and the moral
responsibility of sending. It calls `consumeAuthorization(token)` *after* a successful delivery.

**What the runtime guarantees.** Nothing in `runtime/` can send. The commit path runs its gates in a
fixed order and ends in a transport gate that refuses with `no_transport` (D21), leaving the
one-send authorization live, so the phase-1 queue is real work for a human rather than a lost action.
The D32 gate proves the stronger claim structurally: no file under `runtime/src` imports a network
builtin (`net`, `http`, `https`, `http2`, `dgram`, `dns`, `tls`), calls `fetch`, `WebSocket`,
`XMLHttpRequest` or `sendBeacon`, opens a dynamic import, or touches `node:fs` outside `pack.ts`
(booting a pack is the one legitimate filesystem read, and it is read-only).

**What an adapter looks like, and where it lives.** Adapters go outside `runtime/` — a sibling
package, e.g. `adapters/<host>/`, with its own manifest and its own dependencies. Never inside
`runtime/src`, and never as a dependency of `kinship-runtime`. The reason is mechanical: the boundary
gate's scope is `runtime/src/**`, so an adapter placed there fails CI on purpose, and an adapter placed
outside it is a package a reviewer can see has network access.

**A transport adapter must keep every promise it inherits.** Deliver only content carrying a live,
unconsumed authorization for that exact revision (section 1.5); never send into a suppressed member's lane,
whatever the grant says (section 2.9); ship the disclosure line inside the approved text (section 2.5); respect the
recipient's own timezone for quiet hours (section 2.9); and call `recordSpend` for what it cost. An adapter
that bypasses one of these is not a bug in the adapter — it is the absence of the product.

---

## The first host is Paperclip (D10), and what that means concretely

Phase 1 is not a new control plane; it is Kinship's semantics running inside an instance the owner
already operates. The mapping a `adapters/paperclip/` would implement:

| Kinship | Paperclip host |
|---|---|
| `Card` pending a verdict | an issue awaiting a human disposition, with the card id in its metadata |
| `decideCard(…, { verdict, by, why })` | the board/user decision path — a verdict without a `why` is not a verdict (section 1.5) |
| `Run` / `runActions` | a heartbeat window, with `max_actions_per_run` as the in-window action count |
| `scheduleWake` / `fireWake` | adapter poll cadence, and the issue's monitor columns |
| `Fleet.events` | the issue trail plus one durable log of its own, because section 1.2's replay needs the full ordered list |
| `Ctx.now()` | the host's clock, snapshotted per run |
| `budgets.llm_per_event_idr` | the host's budget reporting, converted to the ID figure the organiser chose |

**Deliberately not mapped: Paperclip's exclusive card checkout** (`assigneeAgentId` → 409, study section 3).
It has no analogue to key against yet — `by` is a bare string, and PRD section 12-Q12 (human roles: who is the
organiser, may authority be delegated) is unratified. A lock keyed on an identity that does not exist is
either inert or it pre-empts that decision. Recorded in D31's row; it becomes buildable the day Q12 has
an answer.

## What this contract does not promise

1. **No proof that a deployed host honours any of it.** There is no transport, so there is no
   end-to-end artefact to inspect (D21). Shadow mode produces the first one.
2. **No sandbox.** The D32 gate is a scanner over source text: it proves what a file *imports and
   calls*, not what a process *can do*. A host could still hand a `runtime/` object to code that sends.
3. **No adapter ships here.** Writing one is gated by D9, and `runtime/tour.ts` prints that in its
   `gatedByDesign` list so a contributor's first read of the repo says it out loud.
4. **No certification that a key stays out of a fork.** `PKG-57` guards the folder; the host's own
   secret storage is the host's.

---

**Changelog**

| Version | Date | Change |
|---|---|---|
| v0.3 | 2026-10-24 | **The credential seam is named correctly.** It was headed *BYOD* — "the owner brings the key" — and the word is wrong twice over: the thing is a **key** (BYOK), and **BYOD** is a different question this seam answers differently (the community's own *data*: its members, its registry, its log). The two are now tabled side by side, and the **honest limit of BYOK is stated**: the runtime cannot price a model call, so the budget is a bound on the host's *report* — what the runtime gives the community instead is the **record**, the `SpendRecorded` row in the log. Also: the D58 note on the copy being a map keyed by language code. |
| v0.2 | 2026-10-23 | **D60/D61.** The host now *plans* as well as ticks: the community's working file carries its own copy, its next event and its members, and `runtime/src/plan.ts` turns that into the actions the fleet takes. A wake carries the action it will attempt, so firing it is the fleet acting. The run cap now covers that path (it lived only in `runActions` before), a refused phase-origin claim is **logged** rather than silently dropped, and the `textId` / `textEn` field names left this file in D58 — the copy is a map keyed by language code. Seam 1 is unchanged: the host still holds every credential and it still cannot reach a person. |
| v0.1 | 2026-10-19 | Opened as `DECISIONS.md` D33: the four seams named in one place, the adapter-location rule made mechanical, the Paperclip mapping written down, and Paperclip's card checkout recorded as declined pending PRD section 12-Q12. |
