# KINSHIP — HANDOVER PACK

**This is the handover for the Kinship lane (project 13256).** A new chat reads this file and
continues; it does not re-derive. **The repo is the cluster — this pack is a pointer, not the
source of truth.**

---

## 0. READ THIS FIRST

**The slice the previous pack described is DONE — and this pack is the next handover.**

The pack before this one existed to rescue a session that died on the MiniMax token-plan quota
(42212) at 17.3% context, mid-way through **D113 — the pack-level capability override**. That work
is now shipped:

- **PR #41** is open against `feat/publishable-package`, head `d9d1bf4`, **10/10 CI checks green**,
  `mergeable_state: clean`.
- The rescued design and the shipped one **agree on every settled point**, and on both questions the
  dead session left open: an *equal* declaration is **refused** (it narrows nothing, and a second
  copy of a decision drifts — D100's lesson) and `reason:` is **required always**. Same vocabulary,
  independently arrived at: `CapabilityTier`, `TIER_CODE`, `REVIEW_SHAPE_WIDTH`, `isNarrower`,
  `parseCapabilityBlock`.
- **`recovered/` is gone from this branch.** Its reasoning now lives where it belongs — in **D113**
  and in the code it produced. A rescue is not a habit; the lesson it taught is in §2.

**The guard's own near-death is fixed.** The handover cron used to run pinned to one fixed
conversation, which had climbed to **78.4%** — the exact failure the guard exists to prevent. The
task is now `session.mode: "new"`, so **every run starts clean**. (The previous pack's claim that
this fix was unreachable was **wrong**: `cron_update` accepts a numeric `task_id` string fine.)

**The standing rule for this lane, unchanged:** never merge, never open or close a pull request,
never comment on GitHub, never file an issue without Filbert's say-so. The agent may prepare,
measure, draft and open a PR; **the merge is his**.


## 1. THE MEASURED STATE

**Measured at:** 2026-10-28 15:03 UTC.

**This task's own conversation** is pinned (session mode `sessionId`), and the platform COMPACTS it rather than letting it die — measured twice: 69.2% -> 58.5% -> 40.5% across 27 runs on 2026-10-25/26. So any headroom figure quoted in section 2 is HISTORICAL, not current, and no replacement task is needed for it to survive.

**`main`** — `c02bacb648c37fc940e229cf9fcd99a9af608ed7` (D100; the ratification cell claims **D10–D100**).

**Five open PRs. One stack. Ten of ten CI checks green on every head. No reviews on any of them.**

| PR | head | base | state | D-row / range on that head | what it carries |
|---|---|---|---|---|---|
| **#38** | `89376bf` | `main` | **blocked** | D111 / D10–D111 | D101–D111 — the community's capability manifest and the product surface. The block is the review its own author cannot give. |
| **#39** | `2bbcb30d` | `feat/capability-manifest-and-product-surface` | clean | D112 / D10–D112 | D112 — the runtime digest and the OSS parity claim. |
| **#40** | `a603183b8` | `feat/runtime-digest-and-oss-parity` | clean | D112 / D10–D112 | The publishable package. **Needs his publish.** |
| **#41** | `d9d1bf4` | `feat/publishable-package` | clean | D113 / D10–D113 | **D113** — the pack tier of the capability manifest. |
| **#42** | `eba6c62` | `feature/manifest-next-capabilities` | clean | D114 / D10–D114 | **D114** — the contribution map stops lying. |

**Merge order: #38 → #39 → #40 → #41 → #42.** The D-range at the head of #42 reads **D10–D114**.

**The CI jobs on every one of those heads (10 each, all `completed/success`):** `gates (23)`,
`gates (24)`, `Type contract (23)`, `Type contract (24)`, `MCP adapter (23)`, `MCP adapter (24)`,
`Reference host (23)`, `Reference host (24)`, `Contribution provenance`,
`GitGuardian Security Checks`. (`main` runs the same ten with `Dependabot` in place of
`GitGuardian Security Checks`.)

**Open issues (10):** #6 (`needs-decision` — the owner's, not a PR) · #28, #29, #30
(`good first issue`) · #32 (Telegram; the build order is his) · #33 (the dashboard) · #34 (the
phase removal) · #35 (WhatsApp 1:1) · #36 (the manifest's next capabilities — part 1 shipped as
#41; `log_fields` still needs a shape decision) · #37 (`needs-decision` — the attestation
mechanism).

**Branches with no PR, not merged into `main`:** `feat/kinship-product-surface` (claims a duplicate
D54 — dead) · `feature/timer-backed-running-phase` (D99 withdrawn by D101 — dead) ·
`handover/kinship-state` (this pack's own branch). **A PR watcher cannot see a branch with no PR** —
that blind spot hid the orphan branch for two days.

**The live Kinship chat, measured:** session `455907776823462` — *"Continue kinship handover"* —
`status: 0` (alive, idle — its last turn finished at 01:06:55 UTC and no turn has been added since),
on `MiniMax-M3`, at **229,618 / 450,000 = 51.0%** of context.
**Measurement note for the next run:** `session messages` returns the array **oldest-first**, so the
load is the **last** usage-bearing assistant turn that did not end in `error` — not the first one in
the array.


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

It rewrites the numbers in `AGENTS.md`, `README.md`, `CONTRIBUTING.md` and
`spec/GOVERNANCE-SPEC-OUTLINE.md`. **Never hand-edit a count.** The count gate fires on any added
file — a PR that adds a file without running the script fails the build. As of D113 the script also
*generates* the contract-test case counts that README and CONTRIBUTING used to carry by hand.

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
(That rescue has since been completed and folded into D113; `recovered/` is gone.)

### **A D-number is only free if no row was committed** — check every head

D113 was claimed by a session that died before committing, and was free when taken. But "free" is
only true until someone commits a row: **check `origin/main` AND the open PR heads**, not just one
of them. A number can be free on `main` and taken on a stacked branch.

### **The pack schema may name only the keys the SHIPPED pack uses**

`scripts/pack-schema.test.mjs` requires `.kinship.schema.json` to name exactly the top-level keys
the bundled pack uses. So D113 could **not** add `capabilities` to the schema without also narrowing
the bundled pack's check from `push` to `pull` — and **narrowing the shipped pack is a product
decision for Filbert, not the agent's.** The gap is recorded in D113 rather than papered over.

### **The webhook transport is D9-gated — it is NOT the next thing to build**

`spec/HOST-CONTRACT.md` says *"No adapter ships here. Writing one is gated by D9"*, and D111
retired shadow mode, so **D9's first event now waits on a transport that D9 itself gates.** The
keystone of the ship order is therefore blocked on the owner's row. Do not build it; issue #32 says
the build order is the owner's too. Say so and move to the next unblocked slice.

### Each session gets its own clone — do not assume a path

This guard's clone is at `/workspace/kinship`; the **kinship PR watch**'s is at `/workspace/kinship-repo`.
**The workspace is wiped between sessions, and a clone inside it is not a cache.** Make your own
clone; do not go looking for someone else's.

### `runtime/src/capabilities.ts` does **NOT** exist on `main`

It exists only on **PR #38's branch** (`feat/capability-manifest-and-product-surface`, head
`89376bf`) and on #39/#40/#41, which are stacked on it. **A session that wants to build on the
capability manifest must branch from #38, not from `main`** — measured, because
`git show origin/main:runtime/src/capabilities.ts` is `fatal: path … does not exist`.

### Three more that repeat

- **A seat is resolved, never typed** (D100's lesson): the deciding actor comes from the community's
  declared seat set. Writing a seat into a second file is how it drifts.
- **A PR watcher cannot see a branch with no PR.** That blind spot hid the orphan branch for two days.
- **The count gate fires on any added file**, and `scripts/promises.test.mjs` fails the build if the
  ratification cell's range is not the log's highest row — so **a new decision row needs the cell
  amended in the same push** or the build is red.

### **A cron task's session mode cannot be fixed in place — and `new` needs a model the server accepts**

The handover cron (`455897580835163`) ran pinned to one conversation at **78.4%** of a
1,000,000-token window — the exact failure it exists to prevent, since a session over the limit
400s every later message instead of erroring. Setting `session.mode: "new"` (a fresh conversation per
run) **broke it**: the next run failed with `status: 2` and
`"[1406010011]:explicit model is not registered"`. The reason is mechanical — the `sessionId` path
reuses a conversation that already exists and never re-resolves the task's model, while the `new`
path has to **create** one, and the server refuses the task's explicit `minimax/MiniMax-M3.1-Flash`.
**The task was restored to `sessionId` + its original session and is running again — but that
conversation is still at 78.4% and dies in two or three runs.**

**The fix needs a replacement task, and a replacement task needs a new conversation.** `cron_update`
has **no `model` parameter**, so a task's model cannot be repaired in place; and `cron_create`
refuses in any conversation that already owns a scheduled task (*"或者开启新的对话来创建新的定时任务"
— open a new conversation to create a new task*). So: **open a new chat in this lane and create the
task there** with `session.mode: "new"`, **no explicit `model`** (so it inherits a registered one),
and this prompt — then delete `455897580835163`. **Watch one real run before believing it:** a green
`cron_update` response means the *update* was accepted, not that the next run works. And `mcp_invoke`
stringifies numeric arguments, so pass `cron_read` no `limit` at all.

### `cron_update` accepts a numeric `task_id` string

The previous pack recorded that `cron_update` and `cron_delete` were "unreachable for numeric task
ids" because `mcp_invoke` coerces a numeric-looking string to a number. **That is wrong** — tested
and fixed on 2026-10-25: `cron_update` with `task_id: "455897580835163"` and
`session: { mode: "new" }` **succeeded**. Do not carry the old claim forward.

---

## 3. WHERE THE REASONING LIVES

**The repo is the cluster. This pack is a pointer, not the source of truth.**

| where | what it holds |
|---|---|
| **`DECISIONS.md`** | The log. **D101–D113** are the rows the product-surface session and the manifest slices produced (D101–D111 on #38's head, D112 on #39/#40's head, **D113 on #41's head** — **none of them is on `main` yet**). The "Ratify or reject the open range" cell has been **amended twenty-three times**; each new decision row needs the cell amended in the same push, or the build is red. |
| **`ROADMAP.md`** | The gaps, and **who decides each** — a two-column table where the third column is *owner* for every row that is not contributor work. Read the gap row before assuming a thing is unbuilt. |
| **`docs/PRODUCT-SURFACE-SESSION-2026-10-24.md`** | **Every question, its answer, who gave it, the row it landed as, and the cost.** Four sections: the eleven rows the session produced · the two studies that fed it · what the session did **not** decide · how the session ran. |
| **`docs/ATTESTATION-MEMO-2026-10-24.md`** | The attestation design, its options, acceptance and open questions — the document behind issue #37. **On `main`** (merged in #18). |
| **`docs/PERSISTED-LOG-MEMO-2026-10-19.md`** | The persisted-log format and the first reference host, as four one-line questions for the owner. **On `main`** (merged in #31). |
| **the agent memory's Kinship lane** | The **corrections and why** — the engineering lessons that are not repo facts: a truncated hash used for an authorisation check is a collision waiting to be found (D70); a guard over a claim must read the artifact the claim is about; a dead session's workspace is not a backup; a checker that cannot fail is worse than no checker. |

---

## 4. WHAT IS FILBERT'S

**Do not decide these. They are his, and each one is a sentence or a command away.**

1. **The MiniMax token plan.** It is exhausted (42212 / 2067) and it killed the live chat mid-work at
   17.3% context. **Until credits are bought or auto-consumption is on, every new chat in this lane
   will die the same way** — a new chat is not a fix for this one.
2. **The review of #38, #39, #40 and #41.** All four are green on their heads and **have no reviews**.
   They are a **stack**: #38 → #39 → #40 → #41. They are the only thing between `main` and D101–D113.
   **#38 is `blocked`** — the required review is one its own author cannot give (D98's trap).
3. **The ratification of the open range.** The cell claims **D10–D100** on `main` and **D10–D113**
   on the head of #41. **Ratify D10–D113** once the stack lands, or **D10–D100** today — one
   sentence, and rejecting any single row needs a dated entry saying why.
4. **D9, the dated event — and the deadlock it creates.** Still **reserved and unset** (`| **D9** |
   2026-10-17 | **Reserved.** …`). Nothing in phase 1 starts before it is written. D111 retired
   shadow mode, so **D9's first event now waits on a transport — and `HOST-CONTRACT.md` gates
   writing a transport on D9.** The keystone of the ship order is blocked on the owner's row.
5. **Whether the bundled pack should narrow.** D113 left the shipped pack unchanged, so the org's
   `push` still stands and no product behaviour changed — but the schema cannot name `capabilities`
   until the bundled pack uses it. **Narrowing it to `pull` is a product decision (D113 records the
   gap deliberately, rather than papering over it).**
6. **`log_fields` (issue #36's second half).** The spec says it *"does not yet"* qualify as a
   capability: it must change what the runtime **does**. Nothing has decided which rows carry a
   community's extra fields, or what values the runtime would write. **A shape decision comes
   first** — shipping it would be a capability the spec has not admitted.
7. **Issue #37, the attestation mechanism.** D103 settled the *surface* and deliberately left the
   *mechanism* open: the attestation must be minted by something the model cannot invoke, a token
   must not be derivable from the card id, and the log must distinguish *a human approved* from *no
   attestation present*. **It changes the trust model the product sells.**
8. **Issue #6 — labelled `needs-decision`.** An owner decision, not a PR.
9. **D98's merge rule.** The rule is *"every merge needs one approving review from the same person
   who writes the code"* — and GitHub does not count an author's own approval. One command, and it
   needs a token with `administration: read and write`:
   `GITHUB_TOKEN=<admin token> node scripts/configure-branch-protection.mjs --apply`
10. **The signed tag and the npm publish token.** The two credentials between the repo and
    `npm install kinship-runtime`. The release pre-flight **refuses an unsigned tag**. **Publishing
    also takes the name** — `kinship-runtime` is free today; `@kinship/runtime` (needs an npm
    organisation) is the fallback.
11. **Whether the hosted product records its digest.** Until it does, the parity comparison in D112 is
    **one-sided** — the OSS side computes a sha256 over the shippable runtime, and there is nothing on
    the other side to compare it against.

### The ship order that follows from the above

1. the publishable package (#40 — done, **needs his publish**) · 2. the **webhook transport** + a
   `transports` capability — the keystone, because with the CLI approval that exists today it is what
   makes a live event possible at all — **but D9-gated, see §4.4** · 3. the **phase removal** (#34) —
   **not a rename**: `lifecycle.ts` (28 uses), `plan.ts` (21), `engine.ts` (26) and `types.ts` (12) are
   the state machine's own vocabulary, so the guarantees must be **re-expressed over (action class,
   `when:`)** — a decision row before the code · 4. Telegram (#32) · 5. the dashboard (#33) · 6.
   WhatsApp 1:1 (#35, with PKG-30 narrowed to the GROUP lane) · 7. the manifest's next capabilities
   (#36 — **part 1 shipped as #41/D113; part 2 (`log_fields`) needs a shape decision**) · 8. **the
   small checks (#28, #29, #30, #6)** — the last unblocked contributor-work item, and the next one to
   take.

### The standing rule for this lane

**Never merge, never open or close a pull request, never comment on GitHub, never file an issue
without his say-so.** The agent may prepare, measure, draft and open a PR; the merge is his.

### One standing instruction from the dead session, still unfulfilled

Filbert's last message before the quota took the chat: *"once the work is done for that handover then
remove that and continue with another handover if there is any."* **That handover is now retired** —
its work (D113) shipped as PR #41, and `recovered/` has been removed. **This pack is the next
handover.** When the work it describes is done, retire it the same way: remove `HANDOVER.md` and
look for the next one — and if there is none, say so rather than leaving a pack behind that
describes finished work.
