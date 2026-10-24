# HANDOVER — Kinship

**A new chat in project 13256 that says `continue kinship` starts here.**

This file is kept current by the **kinship context guard** (cron `*/30 * * * *`, project 13256).
Sections 2, 3 and 4 are written once. **Section 1 is regenerated on every run** — it is the only part
that goes stale.

**Measured at:** 2026-10-24 16:12 UTC.
**The live Kinship chat this pack describes:** session `455824203276588` — *"Check chat ID and
continue"*, project 13256, `status: 0` (live, not failed or aborted).
**Its context load:** **729,949 / 1,000,000 = 72.99%** — the `usage.total_tokens` of the newest
completed assistant turn against its `usage.context_window`. (The `session messages` array is
**turn-grouped, not newest-first**: its *first* element is an older turn from 15:54:27 UTC reading
678,871 / 67.89%. The load is the **newest** completed assistant turn, whose timestamp equals the
session's `updated_at`.)
**Re-verified 16:12 UTC against the 16:05 reading: no change** — same session, same load, same
`main`, same three PR heads, same ten open issues, same three branches with no PR.

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
| CI on that head | 10 checks, all `success` — `gates (23)`, `gates (24)`, `Type contract (23)`, `Type contract (24)`, `MCP adapter (23)`, `MCP adapter (24)`, `Reference host (23)`, `Reference host (24)`, `Contribution provenance`, `Dependabot` |

### The three open pull requests — a stack, merge in this order

| PR | head branch | head sha | base | `mergeable_state` | CI for that head |
|---|---|---|---|---|---|
| **#38** | `feat/capability-manifest-and-product-surface` | `89376bf084af2aac9ad219c887eba973cdba796d` | `main` | **`blocked`** | 10 checks, all `success` — `gates (23)`, `gates (24)`, `Type contract (23)`, `Type contract (24)`, `MCP adapter (23)`, `MCP adapter (24)`, `Reference host (23)`, `Reference host (24)`, `Contribution provenance`, `GitGuardian Security Checks` |
| **#39** | `feat/runtime-digest-and-oss-parity` | `2bbcb30d49fac37017cce128196192ab05ed97f5` | #38's branch | `clean` | 10 checks, all `success` — the same ten job names, all green at `2bbcb30` |
| **#40** | `feat/publishable-package` | `a603183b877cc3a407731be9cb1bcabaf22b0e27` | #39's branch | `clean` | 10 checks, all `success` — the same ten job names, all green at `a603183` |

**#38 is `blocked`, not `dirty`.** Every CI job on its head is green; what blocks it is the
**merge rule** (see §4 — D98), which GitHub cannot explain from here because this token cannot read
branch protection (`GET /branches/main/protection` → 403). Do not report that as a CI failure.

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
| **#36** | The manifest's next capabilities: the pack-level override and the community's log fields |
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
| `feat/kinship-product-surface` | **none — it never had one** | The orphan. Its `DECISIONS.md` claims **D54** for *"the hosted surface stopped being a plan"*. `main` had already used **D54** for *"the community's coverage window"* (2026-10-22). **Landing it would land a DUPLICATE D-number.** The disclosure that actually landed is **D81** (*"A hosted surface now exists — and this row is the disclosure D19 asked for"*). |
| `feature/timer-backed-running-phase` | **#24 — CLOSED, NOT MERGED** | Its decision row was **D99**; **D99 was withdrawn by D101** (the `phase` field leaves the runtime). The branch ends at D99. Do not treat it as landed. |
| `handover/kinship-state` | none | **This pack's own branch.** Agent-owned; it holds only `HANDOVER.md`. |

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
| **The agent memory's Kinship lane** | The **corrections and why** — the engineering lessons that are not repo facts: a truncated hash used for an authorisation check is a collision waiting to be found (D70); a guard over a claim must read the artifact the way a human wrote it (D27); "a report in a transcript is a claim, a file is evidence"; the multi-package `file:`-of-`file:` resolution trap that made the MCP job fail in CI and pass locally (D69); the ship order in §4 below. It is filed under **"The Kinship lane — pointer + what the repo cannot say"** in the agent body — the standalone `kinship` memory **topic** could not be created (the memory service returns `Insufficient resources` on creates while appends work), so the lane lives in the agent body with its pointer. |

---

## 4. WHAT IS FILBERT'S

**Do not decide these. They are his, and each one is a sentence or a command away.**

1. **The review of #38, #39 and #40.** All three are green on their heads and **have no reviews**.
   They are a **stack**: #38 → #39 → #40. They are the only thing between `main` and D101–D112.
2. **The ratification of the open range.** The cell claims **D10–D100** on `main` and **D10–D112**
   on the head of #39/#40. **Ratify D10–D112** once the stack lands, or **D10–D100** today — one
   sentence, and rejecting any single row needs a dated entry saying why.
3. **D9, the dated event.** Still **reserved and unset** (`| **D9** | 2026-10-17 | **Reserved.** The
   next row is the shadow-mode target event + date, and it belongs to the owner alone.`). Nothing in
   phase 1 starts before it is written. **D111 retired shadow mode, so D9's first event now waits on
   a transport.**
4. **Issue #37, the attestation mechanism.** D103 settled the *surface* and deliberately left the
   *mechanism* open: the attestation must be minted by something the model cannot invoke, a token
   must not be derivable from the card id, and the log must distinguish *a human approved* from *no
   attestation present*. **It changes the trust model the product sells.**
5. **D98's merge rule.** The rule is *"every merge needs one approving review from the same person
   who writes the code"* — and GitHub does not count an author's own approval. One command, and it
   needs a token with `administration: read and write`:
   `GITHUB_TOKEN=<admin token> node scripts/configure-branch-protection.mjs --apply`
6. **The signed tag and the npm publish token.** The two credentials between the repo and
   `npm install kinship-runtime`. The release pre-flight **refuses an unsigned tag**. **Publishing
   also takes the name** — `kinship-runtime` is free today; `@kinship/runtime` (needs an npm
   organisation) is the fallback.
7. **Whether the hosted product records its digest.** Until it does, the parity comparison in D112 is
   **one-sided** — the OSS side computes a sha256 over the shippable runtime, and there is nothing on
   the other side to compare it against.

### The ship order that follows from the above

1. the publishable package (#40 — done, **needs his publish**) · 2. the **webhook transport** + a
   `transports` capability — the keystone, because with the CLI approval that exists today it is what
   makes a live event possible at all · 3. the **phase removal** (#34) — **not a rename**: `lifecycle.ts`
   (28 uses), `plan.ts` (21), `engine.ts` (26) and `types.ts` (12) are the state machine's own
   vocabulary, so the guarantees must be **re-expressed over (action class, `when:`)** — a decision row
   before the code · 4. Telegram (#32) · 5. the dashboard (#33) · 6. WhatsApp 1:1 (#35, with PKG-30
   narrowed to the GROUP lane) · 7. the manifest's next capabilities (#36) · 8. the small checks (#28,
   #29, #30, #6).

### The standing rule for this lane

**Never merge, never open or close a pull request, never comment on GitHub, never file an issue
without his say-so.** The agent may prepare, measure, draft and open a PR; the merge is his.
