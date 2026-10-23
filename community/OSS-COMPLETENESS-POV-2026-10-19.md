# OSS completeness POV — what is *not* complete yet (2026-10-19)

A point-of-view pass on this repo **as an open-source project**, separate from whether the
governance model is right. Question: *if a stranger cloned this today, what would stop them —
from contributing, and from running it?* Every finding below is a live read from 2026-10-19 on
`main` at `02f80d1`, with the command that re-runs it. Recount before repeating any number.

Three casts, each with its own evidence threshold and refusal. Findings stay attributable.

| Persona | Question it owns | Threshold it accepts | Refuses |
|---|---|---|---|
| **Contributor** (first PR) | Can I get a PR merged without knowing the maintainer? | a documented run path, a real issue to take, a rule that binds the owner too | "open an issue and wait" |
| **Adopter** (organiser/fork) | Can I run what the README describes on my own machine? | something executes and produces an artefact I can inspect | prose that outruns a command |
| **Maintainer** (solo, 4–5 h/wk) | Does this survive my own absence? | every recurring manual act is either automated or named as load | a check I am the only implementation of |

## 0. What already passes, so this is not a hit list

- `DECISIONS.md` (39 dated rows, append-only, reversibility key, and a "what this row does NOT
  decide" column) is better than most funded OSS projects' governance docs.
- Four gates, single-sourced in `scripts/gates.mjs`, with `scripts/gates.test.mjs` failing the
  build when a doc stops matching CI. `node scripts/gates.mjs` is one command and needs no install.
- `.github/PULL_REQUEST_TEMPLATE.md` demands a traced thinking path — a real drive-by-PR filter.
- `CONTRIBUTING.md` section "What is not open for contribution (yet)" says plainly that `evals/promptfoo/`
  is written and unrun, and that three directories are evidence layers. Most projects hide that.
- `SECURITY.md` exists and GitHub reports `isSecurityPolicyEnabled: true`; issue templates
  (`bug_report.yml`, `feature_request.yml`) and `dependabot.yml` are wired; Dependabot alerting on,
  auto-merge off by deliberate choice.
- The runtime is genuinely zero-dependency with no build step, and the boundary gate
  (`runtime/test/boundary.test.ts`) proves "no transport" structurally rather than promising it.

## 1. Contributor POV — intake exists on paper and almost nowhere else

| # | Not complete | Live evidence | Cost to close |
|---|---|---|---|
| C1 | **No `CODE_OF_CONDUCT.md`, and no contributor doc references one.** A product whose entire pitch is "a named human seat governs" has no stated norm for its own contributors. | `ls` at root shows no CoC; `grep -i "code of conduct"` across README/CONTRIBUTING/AGENTS/SECURITY/PR template/issue templates returns nothing. | ~10 min (contributor-covenant text + a link in README and CONTRIBUTING) |
| C2 | **The contribution queue is one issue, and it needs a paid API key.** | `gh api repos/…/kinship` → `open_issues: 1`; the only open issue is **#3** (eval harness), labelled `good first issue` + `evals`, and it requires a provider + key — which is why it is mislabelled for a newcomer. | deciding, not doing: relabel #3 and seed 3–5 issues from the tour's own `--json` map |
| C3 | **No public roadmap.** `DECISIONS.md` is history; PRD section 14 is a changelog of a document, not of the software. A stranger cannot tell what is *deliberately not built* versus forgotten — so they build the thing you refused. | `ls` root: no `ROADMAP.md`; the "not yet decided" table lives inside `DECISIONS.md`, which reads as an internal log. | ~30 min, and it is the public face of this file's shortlist |
| C4 | **No changelog as an artefact.** Version-to-version deltas exist only as prose inside a 400-line PRD changelog and 39 decision rows. | no `CHANGELOG.md`; `git tag --list` → empty; `latestRelease: null` while `runtime/package.json` claims `version: 0.1.0` | a keep-a-changelog file generated from decision rows |
| C5 | **The review rule binds newcomers and not the owner, and CI blocks neither for him.** This is what PR #4 measured this week: it sat `REVIEW_REQUIRED`/`BLOCKED` until an approval was typed under his token. | `enforce_admins: false`, `required_status_checks: null` (`DECISIONS.md` D26, D39) | his governance call, not a doc fix |
| C6 | **No signing or DCO story.** Human commits are `unsigned`; the bot's merge is `verified: true` with `signature: none` — so the trail's own "verified" badge currently means "GitHub trusts the bot". The bot commit carries a `Signed-off-by` trailer while no DCO check is configured. | `gh api …/commits/<sha>` across the last 7 commits (D39) | owner decision on `required_signatures`; a DCO gate is a policy choice, not a key on his laptop |
| C7 | **No CI status badge in README.** The one glance that says *main is green today* is absent, on a repo whose claim is that gates are the product. | README badges are MIT + TypeScript only (`grep img.shields` → 2 hits) | one line |

## 2. Adopter POV — the honest sentence is "library + spec + demo", not "self-hostable"

| # | Not complete | Live evidence | What would close it |
|---|---|---|---|
| A1 | **Nothing runs outside the tour.** `runtime/tour.ts` drives the real pack in memory and prints guarantees; there is no host, no CLI, no server, no example integration. `spec/HOST-CONTRACT.md` documents four seams (credential, clock, store, transport) and `runtime/` refuses to fill any of them — by design (D21, D33). | `ls` root: no `examples/`, no `bin`; README "Try it now" runs gates and the tour, and says so | a **reference host as a sibling package** — boot the pack, own a `setInterval`, write the log to disk, print cards to stdout with an `echo` transport. No channel, so it does not breach D21 or the shadow-mode gate. This is the single highest-value completeness item in this file. |
| A2 | **The audit trail has no file.** The log lives in a plain array inside the state object, so "replayable" is provable inside one process and produces no artefact anyone can hand to a reviewer. | `runtime/src/store.ts`: `freshState()` returns `events: []`, and the only `node:` import is `node:crypto` for the approval hash — no `node:fs`, by design. `spec/HOST-CONTRACT.md` seam 3 assigns persisting, pruning, backup and access control to the host, and names `Fleet.events` "to write down" and `Fleet.replay(events)` "to prove the write". So the artefact gap is the host gap (A1), not a bug | his ruling on the first persisted format — it is a phase-1 decision, not a convenience |
| A3 | **No install path.** `runtime/package.json` is `private: true`, and there is **no root `package.json` at all**, so `npm test` at the repo root does not exist; adoption means vendoring a directory by copy. | `cat package.json` → No such file; `runtime/package.json` → `"private": true` | either publish `kinship-runtime` (needs a version policy + the private flag off) or state in README/CONTRIBUTING that vendoring-by-copy is the *intended* install, and why |
| A4 | **No version policy or tag.** `0.1.0` appears in a `private` manifest while the repo has zero tags and a draft release nobody has published. A fork cannot pin anything. | `git tag --list` empty; `latestRelease: null`; `v0.1.0` draft (D23) | one tag + a semver sentence, when he chooses to release |
| A5 | **English-only docs for an Indonesian beachhead.** Member-facing pack copy is bilingual `[id, en]`; the README, CONTRIBUTING, SECURITY, spec and this repo's whole on-ramp are English. The audience he named (kopdar, aiclub.id) reads the pack, not the product. | `packs/kopdar-ops/.kinship.yaml` carries ID+EN pairs; no ID-language doc exists at root | a translated README + quickstart, or an explicit statement that docs are EN-first and where the ID surface lives |
| A6 | **No quickstart that ends in an artefact.** "Try it now" ends in printed guarantees. An adopter wants one screen: run this, here is the file you can now audit. | README section "Try it now" | follows from A1/A2 |

## 3. Maintainer POV — three load-bearing things are implemented by the maintainer's attention

| # | Not complete | Live evidence |
|---|---|---|
| M1 | **Prose counts and ranges are policed by a human.** Three instances in four days: `PKG-*` count (D34), test-case and guarantee counts (D37b), and this week a *range* claim — the ratification cell in `DECISIONS.md` had stopped at D30 while nine rows piled above it. `gates.test.mjs` checks the gate list, not the numbers, correctly. | `grep -o "'PKG-[0-9N]*'" scripts/validate-pack.mjs \| sort -u \| wc -l` vs the prose; D39's fifth additive amendment |
| M2 | **`rules/*.mdc` are advisory prose.** AGENTS.md states it: "a convention, not an auto-loaded mechanism — nothing here consumes the extension yet." So the invariants that gate every change are enforced by whoever remembered to read them. | `AGENTS.md` section "Where the durable rules live" footnote |
| M3 | **One seat, one token, one reviewer — including for this pass.** `DEFAULT_HUMAN_SEATS = ['organiser']` mirrors reality exactly: 0 forks, 0 watchers, 0 stars, and every merge routed through one admin bypass. The bus factor is one, and the repo's own model says so. | `gh api …/kinship` → `forks: 0, stars: 0, watchers: 0`; D36; D39's attribution note |
| M4 | **A public SLA nobody is staffed to meet.** SECURITY.md promises triage "within 3 business days" at 4–5 h/wk with a solo maintainer. That is a claim in the class invariant #3 bans until he chooses to stand behind it. | `SECURITY.md` line 5 |
| M5 | **GitHub's language bar hides what this repo mostly is.** The languages API reports only TypeScript (411,296 B) and JavaScript (79,894 B) while `git ls-files '*.md' \| xargs wc -c` totals **771,604 B across 55 markdown files** — i.e. the project reads as code-first when it is majority spec. No `.gitattributes` is set, so this is either a linguist cache lag or an accident of how the repo is presented; the verified part is that the visible bar disagrees with the tree today. | `gh repo view --json languages` vs `git ls-files` |

## 4. Shortlist, ranked cheap-in-cheap-out

Screened so each item states the one assumption it tests, and none of them needs a transport.

1. **Commit this POV as a public `ROADMAP.md`-shaped "what is not complete" file** (C3). Tests:
   *a stranger reads the refusals, not just the features.* ~30 min, pure docs, 🟢.
2. **CoC + CI badge + relabel/seed issues** (C1, C7, C2). Tests: *intake is real, and the green
   state is visible.* ~40 min, 🟢. The issue-seeding should be generated from `tour.ts --json` so
   it does not drift from the map that already exists.
3. **State the install story, whichever way he chooses** (A3). Tests: *vendoring is a decision, not
   an omission.* Either one README paragraph or one published package — the paragraph first, 🟢.
4. **A reference host sibling package** (A1 + A2 + A6). Tests the load-bearing one: *can someone who
   is not me run a governed fleet without a channel?* It is a build, not a doc, and it needs a
   persisted log format — which is **his** phase-1 ruling (A2). Not started, deliberately.
5. **One generated count surface that prose quotes** (M1). Ends the drift class rather than
   papering over its third instance. `DECISIONS.md` already frames the two honest shapes
   (generated vs asserted); snapshot-banning stale literals is the wrong one. His call.

## 5. What this pass did not do

Nothing in `runtime/`, `packs/`, `spec/`, `orgs/`, `rules/`, SECURITY.md, or any GitHub setting was
touched, and no file in the repo was edited: this is a review, and C5, C6, A2, A4, M1, M4 are owner
decisions that a doc pass may not make sideways. The file is committed on his word, not mine —
until then it is untracked, and `git status` showing it is expected, not drift.

Invariant #3 applies to this document itself: every number here is a command output from
2026-10-19 (`gh api`, `gh repo view`, `git ls-files`, `grep`), `stargazerCount: 0` is reported
because it is *bad* news and therefore not a marketing claim, and no adoption, contributor-count or
hours figure is asserted anywhere. The claims about GitHub's language bar and about linguist are
written as "the tree and the API disagree today", which is the strongest form the evidence licenses.
