# HANDOVER — Kinship (lane 13256)

> **What this file is:** the handover pack for the Kinship workstream. A new chat in project
> **13256** that says `continue kinship` should be able to read this file and the documents it
> points at, and carry on — without Filbert copying chat IDs and re-briefing anyone.
>
> **Who wrote it:** Mavis. **When:** 2026-10-24, and refreshed by the `kinship context guard`
> (cron `455897580835163`, every 30 minutes) with the live state below.
>
> **How to read it:** section 1 is measured (it goes stale — the guard rewrites it); sections 2–4
> are the parts a new session cannot derive from the tree.

## 1. THE MEASURED STATE (refreshed by the guard)

| PR | head | branch | merge state | CI |
|---|---|---|---|---|
| #40 | `a603183b` | feat/publishable-package | None | Type contract (24) success; gates (24) success; Type contract (23) success; Reference host (24) success; MCP adapter (24) success; gates (23) success; Contribution provenance success; Reference host (23) success; MCP adapter (23) success |
| #39 | `2bbcb30d` | feat/runtime-digest-and-oss-parity | None | Type contract (24) success; Contribution provenance success; Type contract (23) success; MCP adapter (23) success; Reference host (23) success; MCP adapter (24) success; gates (23) success; Reference host (24) success; gates (24) success |
| #38 | `89376bf0` | feat/capability-manifest-and-product-surface | None | Type contract (23) success; gates (23) success; Type contract (24) success; Reference host (24) success; MCP adapter (23) success; MCP adapter (24) success; Contribution provenance success; gates (24) success; Reference host (23) success |

- **`main`** is `c02bacb6` · CI on it: green.
- **The decision log's highest row on `main` is D100**; the ratification cell claims **D10–D100** (the gate `scripts/promises.test.mjs` fails the build if those two disagree). Rows **D101–D112 are not on `main` yet** — they ride in the three open PRs.
- **`npm view kinship-runtime` → 404 (not published).** The package is *publishable* now (PR #40) but **not published** — that needs a signed tag and an npm token.
- **Open issues:**

- **#37** How a human's presence is attested — the decision that is still the owner's (D103, the memo)
- **#36** The manifest's next capabilities: the pack-level override and the community's log fields (D104, D108)
- **#35** The WhatsApp 1:1 lane: templates, the 24-hour window, and a per-member opt-in record (D106)
- **#34** The `phase` field leaves the runtime — a pack-format break (D101)
- **#33** The approval surface: the dashboard, and then `kinship_approve` leaves the MCP tool set (D102, D103)
- **#32** The Telegram adapter — the first transport (D105, D107)
- **#30** The contribution map's `howToVerify` omits the two adapter suites — a newcomer runs the map and skips them
- **#29** The public surface (`runtime/src/index.ts`) has no test — nothing checks that changing it is deliberate
- **#28** The contribution map names `threads` as having no test file — it has one, with 14 cases
- **#6** An unsourced number in partner copy can still draft — the pack has nowhere to name a source

- **Branches with no merged PR** (a PR watcher cannot see these, and an unlanded branch's D-numbers are from the day it was written):

- `origin/feat/capability-manifest-and-product-surface`
- `origin/feat/kinship-product-surface`
- `origin/feat/publishable-package`
- `origin/feat/runtime-digest-and-oss-parity`
- `origin/feature/timer-backed-running-phase`

## 2. WHAT A NEW SESSION MUST NOT REDO

- **The four local gates are NOT CI.** CI also runs the **typecheck** and **both adapter suites**:
  `node scripts/sync-counts.mjs && node scripts/gates.mjs && npx tsc -p runtime/tsconfig.json --noEmit && (cd adapters/mcp && npm test) && (cd adapters/reference && npm test)`.
  `npx tsc` needs `npm install --no-save --no-package-lock typescript@5 @types/node@22` once. **The last three defects in this repo were found by exactly the jobs the gates do not cover.**
- **Run `node scripts/sync-counts.mjs` after any file change** — the count gate fires on any added file, and never hand-edit a count.
- **The table-shape gate fails when a blank line separates a table header from its rows.** It caught me twice in one session after mechanical inserts.
- **The sandbox runs Node 22; the package declares `>=23` and CI runs 23 and 24.** A local green run says nothing about the supported versions.
- **PR #24 is closed, not merged** — D99 was withdrawn by D101 (the phase field leaves the runtime).
- **`feat/kinship-product-surface` would land a DUPLICATE D-number**: it claimed D54 for the hosted-surface disclosure, and `main` had already used D54 for the coverage window. The disclosure that actually landed is **D81**. Do not merge that branch as written.
- **A seat is resolved, never typed.** D100's lesson: the deciding actor comes from the community's declared seat set. Writing a seat into a second file is how it drifts.

## 3. WHERE THE REASONING LIVES

- **`DECISIONS.md`** — the log. **D101–D112** are this session's decisions, each with its basis and its cost.
- **`ROADMAP.md`** — the gaps, and **who decides each one**.
- **`docs/PRODUCT-SURFACE-SESSION-2026-10-24.md`** — the index: every question Filbert was asked, the answer, who gave it, the row it became, and what it costs.
- **The agent memory's Kinship lane** — the corrections, the traps, and why each fix went the way it did (this file cannot hold them all, and memory is what a new session reads first).
- **`research/TRANSPORT-TERMS-STUDY-2026-10-24.md`** and **`research/EVENT-TEMPLATE-STUDY-2026-10-24.md`** — the two studies that fed D105–D107 and D110.

## 4. WHAT IS FILBERT'S TO DECIDE

- **The review of #38, #39 and #40** — all green, no reviews yet.
- **The ratification of D10–D112** — one sentence.
- **D9, the dated event** — still unset, and still the only thing that starts phase 1.
- **Issue #37, the attestation mechanism** — D103 settled the *surface* and deliberately left the *mechanism* open.
- **D98's merge rule** — one command, and it needs a token with `administration: read and write`:
  `GITHUB_TOKEN=<admin token> node scripts/configure-branch-protection.mjs --apply`. Until it runs, the rule on the repository is not the decided one.
- **The signed tag + the npm publish token** — the two credentials between here and `npm install kinship-runtime`.
- **Whether the hosted product records its digest** — until it does, the parity comparison is one-sided.

## 5. THE NEXT SLICE (in order)

1. **The webhook transport + a `transports` capability** — the keystone: with the CLI approval that already exists, this is what makes a live event possible at all (D111 retired shadow mode, so D9 waits on a transport).
2. **The phase-removal design note** (#34) — a decision row first, because it is a design and not a rename: the guarantees (single-active-per-origin, per-phase approval, the wake rows) must be re-expressed over (action class, `when:`).
3. Telegram (#32) → the dashboard (#33) → WhatsApp 1:1 (#35, with PKG-30 narrowed to the GROUP lane) → the manifest's next capabilities (#36) → the small checks (#28, #29, #30, #6).
