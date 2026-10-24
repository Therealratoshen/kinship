# Repo audit — 2026-10-24

**What this is.** A harsh self-audit of this repository against its own concept: the claim ceiling
(invariant 3), the append-only decision log, the pairing between a decision row and a PRD row, and
the branch development that produced both.

**Verified at:** `1fc79b4` on `main`, Node 24, Linux. Every finding below is re-verifiable by the
command printed with it — a finding nobody can re-run is a claim, and this repository does not
ship claims.

**Nothing here changes the runtime's behaviour.** The runtime is the strongest part of this project
and this audit found no defect in it.

---

## 1. How the branch development went

### What was done

| | |
|---|---|
| PRs merged today | **8** (#16, #18, #19, #20, #21, #22, #23, and the earlier chain) |
| Merge style | **merge commits, never squash** — `git log --oneline --graph main` shows every PR's own commits in the history, so a reviewer can read what a PR actually contained |
| One concern per PR | the licence claims, the memo, the DX milestone, the glossary, the release pre-flight, the README rewrite, the QA pass |
| Merge order | chosen so the D-rows land in order (D83–D89 → D94–D97) and the range cell never skips a number |
| Branches deleted after merge | **8**, done today after the audit found them still on origin |

### What was wrong with it

**1.1 — Seven pull requests merged with zero reviews, on the admin bypass, and nothing in the log
says so.** `enforce_admins: false`, so an admin merge skips the required review. GitHub does not
count an author's own approval, so **the rule cannot be met by the only reviewer this repository
has** — and the ROADMAP describes it as *"every merge needs one approving review from the same
person who writes the code"*, which is not a rule, it is an impossibility described as a rule.

> **This is the audit's sharpest finding, and it is the repository's own thesis failing.** A project
> whose pitch is *"the record names the human seat that owns every decision"* merged seven pull
> requests today with no review recorded, and the merge commits do not say why.

*Check:* `gh pr view 16 --json reviews` → `[]`; `GET /repos/Therealratoshen/kinship/pulls/16` →
`mergeable_state: blocked` at the time of the merge.

**1.2 — One branch was never merged, and it holds 474 lines of work nobody will read.**
`feat/kinship-product-surface` is on origin and is **not an ancestor of main** (`git cherry` says
`+ b1049d9`). It carries `community/OSS-PARITY-2026-10-23.md` (124 lines),
`scripts/runtime-digest.mjs` (169) and its test (141), a README/ROADMAP/HOST-CONTRACT change, and
**a D54 row that means the boundary disclosure — while `main`'s D54 is the coverage window.** Its
subject says *"a vendored copy can now be proven"*, and today this repository shipped a **different**
implementation of exactly that promise (`scripts/vendoring.test.mjs`, D92). **Two implementations of
one promise; one merged, one orphaned.**

*Check:* `git cherry main origin/feat/kinship-product-surface` → `+ b1049d9`.

**1.3 — Stacked pull requests got no CI at all.** The workflow triggered on `pull_request: [main]`
only, so a PR whose base was another branch produced **zero runs** — and a stacked PR is exactly how
a second concern gets reviewed while the first is open. Fixed today: the trigger is now every pull
request, and the first stacked PR to prove it is #19.

**1.4 — Six of the eight branch names diverged from the repository's own `feature/` convention**
(`fix/`, `feat/`, `docs/`). No document states the rule, so this is a convention drift rather than a
violation — and the cheapest fix is to write the convention down.

---

## 2. The claim ceiling — three live holes

### 2.1 The merge rule is described in a way that is false (see 1.1)

### 2.2 The decision-row ↔ PRD-row pairing is claimed and unmeasured

The review brief's ground rule is that *every behaviour change takes a dated `DECISIONS.md` row **and**
a matching PRD §14 row*. **45 of this log's 98 rows are cited in the PRD; 53 are not**, and nothing
measured the difference — which is how D83, D84 and D93 (three of this agent's own behaviour-changing
rows) shipped without one. Fixed today: they have PRD rows now, and the ratio is a number in a row
rather than a claim in a file nobody checks.

*Check:* `grep -c '^\| \*\*D' DECISIONS.md` against the D-numbers cited in PRD §14.

### 2.3 The open-decisions table carries rows that later rows already answered

- **"Target event + date for shadow mode"** — D9 says *"the next row is the shadow-mode target event
  + date"* and *"nothing in phase 1 starts before it is written."* The owner has since decided
  there is no shadow mode, so **the repository's own stated blocker now blocks nothing** and names a
  phase that no longer exists. It is the visible symptom of the open question about what the phases
  are called and whether the pilot kit stays.
- **"Does the runtime's type contract become a checked claim?"** — still open, but CI runs `tsc` in
  its own job, and the answer to *"may the repo have a dev dependency, and where"* is in practice
  **no**: CI installs the compiler in a job, not in a manifest. The row's question has been answered
  by the practice and nobody closed it.
- **The ratification cell's title** said *"D10–D21"* while its body had moved to D10–D98 — a
  reader-visible error, 77 rows stale. Fixed today: the title states the question, not a number.

---

## 3. The decision log's own weight

**322 KB · 99 rows · median row 2,810 characters · longest 15,000.**

The same critique the owner applied to the README — *"the wording is too much, not as direct as the
other popular opensource"* — applies here with more force, because the log is now **the largest
artefact in the repository and the least-read**. The rows are not wrong and the discipline of
append-only history is right; the *shape* is the problem. A row that is 2,800 characters long is a
document wearing a table cell, and the reason column has to carry the reasoning that does not fit
is the table's shape, not the content's weight.

**What I would not do:** rewrite the old rows. They are history, and this repository does not edit
history. **What I would do:** change the *shape* for new rows — the decision cell stays one
sentence, the reasoning moves to a linked memo — and say so in the first row that does it.

---

## 4. What is genuinely good, and should not be touched

- **The counts are generated, not checked.** A sweep of every number in every live document found
  **no prose count that no gate computes** — the M1 class is closed for the live docs.
- **The spec's implementation map is accurate.** Part 6 names **73 files and 33 test files; every one
  of them exists.** (Three are named without their `runtime/src/` prefix, which is a nit, not a
  broken reference.)
- **The refusals teach.** A typo'd answer key lists the eight needs the pack asks for; an empty
  value names the line; a copy asking for a slot the event does not supply names the template, the
  slot and the languages; a second run says *already scheduled* rather than double-posting.
- **The runtime found no defect in this audit** — and that is the finding that matters most, because
  the runtime is the product.

---

## 5. What I would fix, in order

| # | Fix | Effort | Whose call |
|---|---|---|---|
| 1 | **Correct the merge-rule description**, and record a dated row saying that seven PRs merged today on the admin bypass with no review — because the repository's thesis is that the record names who owned each decision | S | the wording is his; the row is mine |
| 2 | **Decide the fate of `feat/kinship-product-surface`** — merge the parity document and the runtime digest, or close the branch with a dated note. It holds 474 lines and a D-number that collides with `main`'s | S | his |
| 3 | **Answer Q6(b)**: the gates are the review for the maintainer's own pull requests, and the branch protection stops being a rule that cannot be met by its only subject | S | his |
| 4 | **Close the two stale rows** in the open-decisions table (the type contract, and the target event once the phase question is answered) | S | his |
| 5 | **Generate the ratification range** instead of amending it by hand — eighteen amendments so far, one per decision row, and the title still drifts | S | his, because it changes the cell's meaning on the day he first ratifies something |
| 6 | **Change the decision row's shape** for new rows: one sentence in the cell, the reasoning in a linked memo | M | his |
| 7 | **Write the branch-naming convention down** | XS | his |

---

## 6. The one sentence

The repository's claims about its *code* are now checked by gates, generated, and verified. The
repository's claims about its *documents* — the merge rule, the ratification range, the open-decisions
table, the PRD pairing — are prose that drifted, and three of the four defects this audit found are
in that category, including one this agent shipped the same afternoon.
