# HANDOVER — Kinship

**A new chat in project 13256 that says `continue kinship` starts here.**

This file is kept current by the **kinship context guard** (cron `*/30 * * * *`, project 13256).
Sections 2, 3 and 4 are written once. **Section 1 is regenerated on every run** — it is the only part
that goes stale.

**Measured at:** 2026-10-24 21:03 UTC.
**Re-verified every 30 minutes since 17:02 UTC — 10 consecutive runs through 21:03, no change in any
of them** — same session, same load, same `main`, same three PR heads, same ten open issues, same
three branches with no PR. The **kinship PR watch** also ran at 17:17 UTC, reached the same
conclusion, and pushed nothing.

---

## 0. READ THIS FIRST — the live chat is dead, and it died of the quota, not the context

The most recently updated session in project 13256 that is not a task is **`455907776823462`** —
*"Continue kinship handover"* — and its `status` is **2 (failed)**.

It was opened at **16:15 UTC from this very pack** (`continue the work from here
https://github.com/Therealratoshen/kinship/blob/handover/kinship-state/HANDOVER.md`). **The pack
worked**: the new chat read it, went straight to the next slice, and spent eight minutes designing
**D113 — the pack-level capability override** (the first half of issue #36). Then at **16:23:26
UTC** it died:

```
42212: The Token Plan usage limit has been reached. To avoid interruption, please upgrade your plan
or buy credits and turn on auto consumption. (2067)
```

Filbert sent one more message at 16:24:07 — *"once the work is done for that handover then remove
that and continue with another handover if there is any"* — and **that turn failed too**, with the
same error.

**It did NOT die of context overflow.** Its last **successful** assistant turn read
**172,762 / 1,000,000 = 17.3%** — there was context to spare. **The MiniMax token-plan quota was the
wall.** A quota wall needs credits, not a new chat; a new chat will hit the same wall.

**The work it did is gone, and it is recovered.** It never committed and never pushed, and its
workspace was wiped with the session. **Its two applied edits, its 18 KB of design reasoning and its
tool timeline are in `recovered/` on this branch**, and the two patches **apply cleanly to PR #38's
head** — verified, not asserted (see §3).

**The chat before it** — `455824203276588`, *"Check chat ID and continue"* — is still `status: 0` and
was at **729,949 / 1,000,000 = 72.99%** when it was last active (15:57:36 UTC). It is **no longer the
live chat** (the new one is more recently updated), but it is where the reasoning that predates the
pack still lives.

**It has not moved since 16:24:09 UTC** — **280 minutes of silence, no retry** (measured 21:03 UTC).

**THE QUOTA HAS CLEARED — a new Kinship chat should work now.** Checked across the 12 most recently
updated sessions: **every session updated at or after 16:39 UTC is error-free** (the latest are 21:03
this guard, 18:55, 18:04, 17:19, 16:47, 16:44, 16:39 — none carrying an error). **The last quota
or rate error of any kind was at 16:24:09 UTC.** So `42212` is gone, the PR watch ran at 17:17, and
this guard has run eight times since, the last at 21:03. **Nothing about the context is blocking a new
chat** — the only thing that stopped the last one was the plan, and the plan is serving again.

**The D113 work is recovered and waiting** (see §3). A new chat does not have to re-derive it —
it applies two patches and finishes the slice.

---

## 1. THE MEASURED STATE

### `main`

| | |
|---|---|
| head sha | `c02bacb648c37fc940e229cf9fcd99a9af608ed7` |
| head commit | `Merge pull request #31 from Therealratoshen/research/transport-and-template-studies` |
| head date | 2026-10-24 10:15:53 UTC |
| highest `D###` row in `DECISIONS.md` | **D100** |
| ratification cell claims | **D10–D100** (`scripts/promises.test.mjs` reads the *last* `the range now reads D10–Dn` in the file and fails the build if it is not the log's highest row) |
| CI on that head | **10 checks, all `success`** — `gates (23)`, `gates (24)`, `Type contract (23)`, `Type contract (24)`, `MCP adapter (23)`, `MCP adapter (24)`, `Reference host (23)`, `Reference host (24)`, `Contribution provenance`, `Dependabot` |

**Two red runs on `main` are historical, not current.** `gates (23)` and `gates (24)` failed at the
governance-gates step on `8b2d0ae0e` and `f82b4566e` (01:32 and 01:34 UTC, before the D98/D100 fixes
landed). **Both shas are now ancestors of `main` and were superseded** — the current head is fully
green. **A red run on an ancestor is not a red branch.**

**`main` has not moved since 2026-10-24 10:15:53 UTC**, and no PR has merged. Nothing in this repo
changed while the live chat was dying.

### The three open pull requests — a stack, merge in this order

| PR | head branch | head sha | base | `mergeable_state` | CI for that head |
|---|---|---|---|---|---|
| **#38** | `feat/capability-manifest-and-product-surface` | `89376bf084af2aac9ad219c887eba973cdba796d` | `main` | **`blocked`** | **10 checks, all `success`** — `gates (23)`, `gates (24)`, `Type contract (23)`, `Type contract (24)`, `MCP adapter (23)`, `MCP adapter (24)`, `Reference host (23)`, `Reference host (24)`, `Contribution provenance`, `GitGuardian Security Checks` |
| **#39** | `feat/runtime-digest-and-oss-parity` | `2bbcb30d49fac37017cce128196192ab05ed97f5` | #38's branch | `clean` | **10 checks, all `success`** — `gates (23)`, `gates (24)`, `Type contract (23)`, `Type contract (24)`, `MCP adapter (23)`, `MCP adapter (24)`, `Reference host (23)`, `Reference host (24)`, `Contribution provenance`, `GitGuardian Security Checks` |
| **#40** | `feat/publishable-package` | `a603183b877cc3a407731be9cb1bcabaf22b0e27` | #39's branch | `clean` | **10 checks, all `success`** — `gates (23)`, `gates (24)`, `Type contract (23)`, `Type contract (24)`, `MCP adapter (23)`, `MCP adapter (24)`, `Reference host (23)`, `Reference host (24)`, `Contribution provenance`, `GitGuardian Security Checks` |

**#38 is `blocked`, not `dirty`.** Every CI job on its head is green; what blocks it is the **merge
rule** (see §4 — D98), which GitHub cannot explain from here because this token cannot read branch
protection (`GET /branches/main/protection` → 403). Do not report that as a CI failure.

**All three have ZERO reviews** (and zero requested reviewers). A review is his, and a review by the
author does not count.

**Why #38 reads `blocked` and #39/#40 read `clean`** (measured by the PR watch at 17:17 UTC):
**branch protection applies to `main` only**, and #39/#40 target *branches*. So when #38 lands,
**#39 and #40 must be retargeted to `main`** — and they will hit the same `blocked` state. The
protection rule is the one thing this token **cannot read**
(`GET /branches/main/protection` → 403), so only he can see or change it.

**No rebase is needed by any of the three** (measured 17:17 UTC): the current `main` (`c02bacb`) is
an **ancestor** of all three heads (`git merge-base --is-ancestor` → true for each).

**Decision-log state per head:** #38's head ends at **D111** (claims `D10–D111`); #39's and #40's
heads end at **D112** (claims `D10–D112`). `main` is at **D100** / `D10–D100`. So **D101–D112 exist
only on the open branches** — `main` does not have them yet.

**Titles:** #38 `feat(D104): the community can say what the fleet may do — and the product surface is
decided` · #39 `feat(D112): the parity claim becomes a comparison of two strings — one
path-independent sha256 over the shippable runtime` · #40 `fix(D73): the published package is now the
thing D73 decided it should be — compiled ESM + .d.ts, and nothing the runtime cannot reach`.

### The ten open issues

| # | title (short) |
|---|---|
| **#37** | How a human's presence is attested — the decision that is still the owner's (D103, the memo) |
| **#36** | The manifest's next capabilities: the pack-level override and the community's log fields — **the slice D113 was mid-way through when the session died** |
| **#35** | The WhatsApp 1:1 lane: templates, the 24-hour window, and a per-member opt-in record (D106) |
| **#34** | The `phase` field leaves the runtime — a pack-format break (D101) |
| **#33** | The approval surface: the dashboard, and then `kinship_approve` leaves the MCP tool set (D103) |
| **#32** | The Telegram adapter — the first transport (D105, D107) |
| **#30** | The contribution map's `howToVerify` omits the two adapter suites — a newcomer runs the main suite |
| **#29** | The public surface (`runtime/src/index.ts`) has no test — nothing checks that changing it |
| **#28** | The contribution map names `threads` as having no test file — it has one, with 14 cases |
| **#6** | An unsourced number in partner copy can still draft — the pack has nowhere to name a source |

### Every branch with no PR

`git branch -r --no-merged origin/main` — three branches carry work that **no pull request will ever
surface**, which is how the duplicate D-number below survived two days:

| branch | its PR | what it is |
|---|---|---|
| `feat/kinship-product-surface` | **none — it never had one** | The orphan. Its `DECISIONS.md` claims **D54** for *"the hosted surface stopped being a plan"*. `main` had already used **D54** for *"the community's coverage window"* (2026-10-22). **Landing it would land a DUPLICATE D-number.** The disclosure that actually landed is **D81** (*"A hosted surface now exists — and this row is the disclosure D19 asked for"*). **A second reason not to merge it: its range cell reads D10–D44 while its highest row is D54 — the range gate is red on it too.** |
| `feature/timer-backed-running-phase` | **#24 — CLOSED, NOT MERGED** | Its decision row was **D99**; **D99 was withdrawn by D101** (the `phase` field leaves the runtime). The branch ends at D99. Do not treat it as landed. |
| `handover/kinship-state` | none | **This pack's own branch.** Agent-owned; it holds `HANDOVER.md` and `recovered/`. |

### The session that died, and what it was doing

| | |
|---|---|
| session | `455907776823462` — *"Continue kinship handover"*, project 13256 |
| opened | 2026-10-24 16:15:13 UTC, with the URL of this pack |
| died | 2026-10-24 16:23:26 UTC — `42212` token-plan quota (2067); `finish_reason: "error"`, `usage.total_tokens: 0` |
| context at death | **172,762 / 1,000,000 = 17.3%** (last successful turn) — the context was never the problem |
| second failure | 16:24:09 UTC, on Filbert's next message, same error |
| status | **2 (failed)** |
| what it was building | **D113 — the pack-level capability override** (issue #36's first half): a pack's `capabilities:` block that may **narrow** what the org enables and may never **widen** it; `pull` is the narrow end (`push` writes a `ReviewRequested` row and obliges the host to interrupt a human); a widening is **refused**, not clamped; the two-level reader moves into `runtime/src/capabilities.ts` so the org and pack tiers share one reader and one vocabulary |
| what it got done | `runtime/src/capabilities.ts`: `CapabilityTier`, `TIER_CODE`, a parameterised `parseCapabilities`, and the new shared `parseCapabilityBlock` reader — **2 edits applied, verified to apply cleanly to #38's head** |
| what it did NOT get to | the validator rules (PKG-64+), `.kinship.schema.json`, the `settings.ts` provenance row, `runtime/test/capabilities.test.ts`, the validator test, and the D113 decision row + PRD/spec/CHANGELOG rows — **design only** |

**Its design reasoning had NOT settled the open questions.** It was still choosing between *equal
declaration = refused* vs *allowed-and-ignored*, and between *reason required always* vs *reason
required only when the pack narrows*. **Read `recovered/D113-design-reasoning.md` before re-deciding
— it argues both sides and says which way it leaned and why.**

---

## 2. WHAT A NEW SESSION MUST NOT REDO

**These are the traps. They are the same shape every session, and the cost of rediscovering one is a
defect that ships.**

### The four local gates are **NOT** CI

`node scripts/gates.mjs` runs four commands, and **CI runs that file** — but CI also runs three
things the gates do not cover. **The last three defects in this repo were found by exactly the jobs
the four gates do not cover.** So the full pre-push suite is:

```bash
node scripts/sync-counts.mjs                            # the derived counts — FIRST after ANY file change
node scripts/gates.mjs                                  # the four gates:
                                                        #   node scripts/validate-pack.mjs packs/kopdar-ops
                                                        #   node --test scripts/*.test.mjs
                                                        #   node --test runtime/test/*.test.ts
                                                        #   node runtime/tour.ts
npx tsc -p runtime/tsconfig.json --noEmit                # the type contract — NOT covered by the gates
(cd adapters/mcp && npm install && npm test)             # the MCP adapter suite — NOT covered
(cd adapters/reference && npm install && npm test)      # the reference host suite — NOT covered
```

`npx tsc` needs `npm install --no-save --no-package-lock typescript@5 @types/node@22` once.
**The typecheck is where an event-union exhaustiveness break shows up** — `runtime/src/engine.ts`'s
`timelineLine` switches over the union, so adding an event kind is a type error until the switch
learns it.

### `node scripts/sync-counts.mjs` after **any** file change

It rewrites the numbers in `AGENTS.md` and `spec/GOVERNANCE-SPEC-OUTLINE.md`. **Never hand-edit a
count.** The count gate fires on any added file — a PR that adds a file without running the script
fails the build.

### The table-shape gate fails when a blank line separates a header from its rows

It caught a mechanical insert **twice in one session**. After any table edit, re-check the shape.

### The sandbox runs Node 22; the package declares `>=23`; CI runs 23 **and** 24

`runtime/package.json` says `"engines": { "node": ">=23" }`. The sandbox here runs **Node 22.19.0**.
**A local green run says nothing about the supported versions.** CI is the source of truth.

### PR #24 is closed, not merged

**D99 was withdrawn by D101.** The branch `feature/timer-backed-running-phase` still exists, so
`git branch -r --no-merged origin/main` lists it — but nothing in it is landed, and its D-number is
dead.

### The branch `feat/kinship-product-surface` would land a **DUPLICATE D-number**

It claimed **D54** for the hosted-surface disclosure; `main` had already used **D54** for the
coverage window. **The disclosure that landed is D81.** The lesson: **an unlanded branch's D-numbers
are from the day it was written** — they were numbered against a log that has since moved on.

### A dead session's work is gone unless it was pushed — and this one proved it

The session that died at 16:23 UTC had **two edits applied** to `runtime/src/capabilities.ts`. It
never committed, never pushed, and **its workspace was wiped with it.** The only surviving copy was
its own transcript.

**The rule that follows: in this repo, a work session that is doing real work must push a branch
early and push after every concern** — the workspace is not a backup and neither is the transcript.
The pack's `recovered/` folder is a rescue, not a habit.

### Each session gets its own clone — do not assume a path

This guard's clone is at `/workspace/kinship`; the **kinship PR watch**'s is at `/workspace/kinship-repo`.
**The workspace is wiped between sessions, and a clone inside it is not a cache.** Make your own
clone; do not go looking for someone else's.

### `runtime/src/capabilities.ts` does **NOT** exist on `main`

It exists only on **PR #38's branch** (`feat/capability-manifest-and-product-surface`, head
`89376bf`) and on #39/#40, which are stacked on it. **A session that wants to build on the capability
manifest must branch from #38, not from `main`** — measured, because `git show origin/main:runtime/src/capabilities.ts`
is `fatal: path … does not exist`.

### Three more that repeat

- **A seat is resolved, never typed** (D100's lesson): the deciding actor comes from the community's
  declared seat set. Writing a seat into a second file is how it drifts.
- **A PR watcher cannot see a branch with no PR.** That blind spot hid the orphan branch for two days.
- **The count gate fires on any added file**, and `scripts/promises.test.mjs` fails the build if the
  ratification cell's range is not the log's highest row — so **a new decision row needs the cell
  amended in the same push** or the build is red.

---

## 3. WHERE THE REASONING LIVES

**The repo is the cluster. This pack is a pointer, not the source of truth.**

| where | what it holds |
|---|---|
| **`DECISIONS.md`** | The log. **D101–D112** are the rows the product-surface session produced (D101–D111 on #38's head, D112 on #39/#40's head — **none of them is on `main` yet**). The "Ratify or reject the open range" cell has been **amended twenty-two times by hand**; the last amendment is the one a gate reads. |
| **`ROADMAP.md`** | The gaps, and **who decides each** — a two-column table where the third column is *owner* for every row that is not contributor work. Read the gap row before assuming a thing is unbuilt. |
| **`docs/PRODUCT-SURFACE-SESSION-2026-10-24.md`** | **Every question, its answer, who gave it, the row it landed as, and the cost.** Four sections: the eleven rows the session produced · the two studies that fed it · what the session did **not** decide · how to check the file against the log. **It is on #38's branch, not on `main`** — read it at `origin/feat/capability-manifest-and-product-surface`. |
| **`docs/ATTESTATION-MEMO-2026-10-24.md`** | The attestation design, its options, acceptance and open questions — the document behind issue #37. **On `main`** (merged in #18). |
| **`docs/PERSISTED-LOG-MEMO-2026-10-19.md`** | The persisted-log format and the first reference host, as four one-line questions for the owner. **On `main`** (merged in #31). |
| **`recovered/`** (on this branch) | **The dead session's work, rescued.** `D113-design-reasoning.md` — its 18 KB of design reasoning, including the two questions it had NOT settled. `patch-1.patch` + `patch-2.patch` — its two applied edits to `runtime/src/capabilities.ts`, **verified to apply cleanly to PR #38's head in sequence** (base them on #38, not `main` — see §2). `D113-timeline.md` — its tool calls in order. |
| **the agent memory's Kinship lane** | The **corrections and why** — the engineering lessons that are not repo facts: a truncated hash used for an authorisation check is a collision waiting to be found (D70); a guard over a claim must read the artifact the way a human wrote it (D27); "a report in a transcript is a claim, a file is evidence"; the multi-package `file:`-of-`file:` resolution trap that made the MCP job fail in CI and pass locally (D69); the ship order in §4. It is filed under **"The Kinship lane — pointer + what the repo cannot say"** in the agent body — the standalone `kinship` memory **topic** could not be created (the memory service returns `Insufficient resources` on creates while appends work), so the lane lives in the agent body with its pointer. |

---

## 4. WHAT IS FILBERT'S

**Do not decide these. They are his, and each one is a sentence or a command away.**

1. **The MiniMax token plan.** It is exhausted (42212 / 2067) and it killed the live chat mid-work at
   17.3% context. **Until credits are bought or auto-consumption is on, every new chat in this lane
   will die the same way** — a new chat is not a fix for this one.
2. **The review of #38, #39 and #40.** All three are green on their heads and **have no reviews**.
   They are a **stack**: #38 → #39 → #40. They are the only thing between `main` and D101–D112.
3. **The ratification of the open range.** The cell claims **D10–D100** on `main` and **D10–D112**
   on the head of #39/#40. **Ratify D10–D112** once the stack lands, or **D10–D100** today — one
   sentence, and rejecting any single row needs a dated entry saying why.
4. **D9, the dated event.** Still **reserved and unset** (`| **D9** | 2026-10-17 | **Reserved.** The
   next row is the shadow-mode target event + date, and it belongs to the owner alone.`). Nothing in
   phase 1 starts before it is written. **D111 retired shadow mode, so D9's first event now waits on
   a transport.**
5. **Issue #37, the attestation mechanism.** D103 settled the *surface* and deliberately left the
   *mechanism* open: the attestation must be minted by something the model cannot invoke, a token
   must not be derivable from the card id, and the log must distinguish *a human approved* from *no
   attestation present*. **It changes the trust model the product sells.**
6. **D98's merge rule.** The rule is *"every merge needs one approving review from the same person
   who writes the code"* — and GitHub does not count an author's own approval. One command, and it
   needs a token with `administration: read and write`:
   `GITHUB_TOKEN=<admin token> node scripts/configure-branch-protection.mjs --apply`
7. **The signed tag and the npm publish token.** The two credentials between the repo and
   `npm install kinship-runtime`. The release pre-flight **refuses an unsigned tag**. **Publishing
   also takes the name** — `kinship-runtime` is free today; `@kinship/runtime` (needs an npm
   organisation) is the fallback.
8. **Whether the hosted product records its digest.** Until it does, the parity comparison in D112 is
   **one-sided** — the OSS side computes a sha256 over the shippable runtime, and there is nothing on
   the other side to compare it against.
9. **D113's direction, if the pack-level override is built.** The dead session's design leans to: a
   pack may **narrow only**; **`pull` is the narrow end**; a widening is **refused, never clamped**;
   the org and pack tiers share **one reader and one vocabulary**. It had **not settled** whether an
   *equal* declaration is refused or ignored, nor whether `reason:` is required always. **It is a
   proposal, not a decision row — and **D113 is FREE**: verified 17:17 UTC, zero `D113` rows on
   `main` and zero on #40's head. **Still check `origin/main` for a new D-row before claiming it** —
   the number was free at 17:17, not forever.**

### The ship order that follows from the above

1. the publishable package (#40 — done, **needs his publish**) · 2. the **webhook transport** + a
   `transports` capability — the keystone, because with the CLI approval that exists today it is what
   makes a live event possible at all · 3. the **phase removal** (#34) — **not a rename**: `lifecycle.ts`
   (28 uses), `plan.ts` (21), `engine.ts` (26) and `types.ts` (12) are the state machine's own
   vocabulary, so the guarantees must be **re-expressed over (action class, `when:`)** — a decision row
   before the code · 4. Telegram (#32) · 5. the dashboard (#33) · 6. WhatsApp 1:1 (#35, with PKG-30
   narrowed to the GROUP lane) · 7. the manifest's next capabilities (#36 — **D113, the slice in
   flight**) · 8. the small checks (#28, #29, #30, #6).

### The standing rule for this lane

**Never merge, never open or close a pull request, never comment on GitHub, never file an issue
without his say-so.** The agent may prepare, measure, draft and open a PR; the merge is his.

### One standing instruction from the dead session, still unfulfilled

Filbert's last message before the quota took the chat: *"once the work is done for that handover then
remove that and continue with another handover if there is any."* **This pack is that handover.** When
the Kinship work it describes is done, **remove `HANDOVER.md` and `recovered/` from this branch and
look for the next handover** — and if there is none, say so rather than leaving a pack behind that
describes finished work.
