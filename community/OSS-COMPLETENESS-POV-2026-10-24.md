# OSS completeness POV — what is *not* complete yet (2026-10-24)

A re-read of this repository **as an open-source project**, five days after
`community/OSS-COMPLETENESS-POV-2026-10-19.md` (which was written against `main` at `02f80d1` and is
left where it is: it is a dated snapshot, not a live document). This one is read against **`main` at
`76c7b4b`** — one citable commit, so every number here is reproducible rather than drifting with the
branch it was measured on. PR #25 is described in §2 as a change, not counted in the baseline.

Same three casts, same question: *if a stranger cloned this today, what would stop them — from
contributing, and from running it?* **Every number below is a command output from 2026-10-24**, and
the command is named, because the 10-19 pass's own instruction was: *recount before repeating any
number.*

| Persona | Question it owns | Threshold it accepts | Refuses |
|---|---|---|---|
| **Contributor** (first PR) | Can I get a PR merged without knowing the maintainer? | a documented run path, a real issue to take, a rule that binds the owner too | "open an issue and wait" |
| **Adopter** (organiser/fork) | Can I run what the README describes on my own machine? | something executes and produces an artefact I can inspect | prose that outruns a command |
| **Maintainer** (solo) | Does this survive my own absence? | every recurring manual act is either automated or named as load | a check I am the only implementation of |

## 1. The verdict, finding by finding

**Closed** means the evidence in the 10-19 file no longer holds. **Open** means it still holds. **His**
means the finding is a decision the owner reserves and a doc pass may not make sideways.

| # | 10-19 finding | Verdict now | The evidence, 2026-10-24 |
|---|---|---|---|
| C1 | No `CODE_OF_CONDUCT.md`, no doc references one | **Open (changed shape)** | The file **exists** (`ls CODE_OF_CONDUCT.md`) but **nothing links to it** — `grep -ril "code of conduct"` over README, CONTRIBUTING, AGENTS, SECURITY, CLAUDE and `.github/` returns nothing. The only hit in the whole repo is the 10-19 POV itself. A CoC nobody links to is a CoC nobody reads. |
| C2 | The contribution queue is one issue, and it needs a paid API key | **Open** | One open issue: **#6** `unsourced_number` (labels `spec`, `needs-decision`). **No `good first issue` label exists in the repo.** The 10-19 file's issue #3 is closed. Nothing a newcomer can take without reading the spec. |
| C3 | No public roadmap | **Closed** | `ROADMAP.md` exists and is the public face of the refusals. |
| C4 | No changelog as an artefact | **Closed** | `CHANGELOG.md` exists; `git tag --list` → `v0.1.0 v0.2.0`; the API's `latestRelease` is **v0.2.0**. |
| C5 | The review rule binds newcomers and not the owner | **Decided, not applied** | The rule is decided and written down (`DECISIONS.md` D98: the gates are the review, `enforce_admins` on, no human review required). **The setting is still unreadable from here** — `GET /branches/main/protection` answers *403, "Resource not accessible by personal access token"* — so the rule is prose until one command runs. **His.** |
| C6 | No signing or DCO story | **Closed (the gate)** | `scripts/dco-check.mjs` exists and runs in CI (8 cases). The *signing* half (GPG on the tags) is still **his**. |
| C7 | No CI status badge in README | **Closed** | Three badges, including `badge.svg?branch=main`. |
| A1 | Nothing runs outside the tour | **Closed** | `adapters/reference/` is a working host (32 tests), `runtime/examples/one-complete-example.ts` exists, `scripts/quickstart.mjs` exists. The 10-19 file's "`ls` root: no `examples/`, no `bin`" no longer holds. |
| A2 | The audit trail has no file | **Closed** | The reference host writes `events.jsonl` + `manifest.json` and the MCP adapter reuses that store. **The 10-19 evidence was stale, not the code:** it said the runtime had no `node:fs` — `runtime/src/pack.ts` is now the *sanctioned* single reader (D35) and `runtime/test/boundary.test.ts` holds that line (6 cases, green). |
| A3 | No install path | **Open — his** | Still no root `package.json`; `runtime/package.json` is still `"private": true`. The npm name is D73 and it is **his** to claim. |
| A4 | No version policy or tag | **Closed** | `v0.1.0` and `v0.2.0` are tagged and v0.2.0 is the latest release. The tags are unsigned, which is **his**. |
| A5 | English-only docs for an Indonesian beachhead | **Open** | No ID-language document at the root. The pack copy is bilingual; the on-ramp is not. |
| A6 | No quickstart that ends in an artefact | **Open (partly)** | `scripts/quickstart.mjs` exists, and it ends in printed output: no `writeFile`, no `appendFile`, no `.jsonl` anywhere in it. The screen still shows guarantees, not a file you can audit. |
| M1 | Prose counts and ranges are policed by a human | **Closed (counts)** | `scripts/sync-counts.mjs` regenerates the counts, and it is why the spec's test-case numbers move with the suites. **The range is still hand-amended** — 20 amendments to the ratification cell, one number left in human hands. |
| M2 | `rules/*.mdc` are advisory prose | **Open (narrowed)** | **Partly wrong now.** `scripts/gates.test.mjs` reads the rule ids out of both files and fails the build when one names a rule the validator does not enforce, or a rule no test exercises — with its own positive control. So the *ids* are checked against the code; the *prose* around them is not. `AGENTS.md` claimed "nothing here consumes the extension yet", which was true on 10-19 and is not true today — **corrected in the same PR as this file**. |
| M3 | One seat, one token, one reviewer | **Open — structural** | `stars 0 forks 0 watchers 0`. One maintainer, one seat (`DEFAULT_HUMAN_SEATS = ['organiser']`), one bus factor. Nothing in the code can fix this and nothing should pretend to. |
| M4 | A public SLA nobody is staffed to meet | **Open — his** | `SECURITY.md` still promises *"Acknowledged within 3 business days — best effort"* and names the one maintainer honestly. The promise is now labelled; it is still a promise. |
| M5 | GitHub's language bar hides what this repo mostly is | **Open** | No `.gitattributes`. The API reports TypeScript 834,213 B and JavaScript 281,357 B; `git ls-tree -r --name-only 76c7b4b \| grep '\.md$'` totals **1,387,104 B across 82 markdown files** against **1,126,238 B** across 100 TypeScript and JavaScript files. The tree is now majority *prose* by a wider margin than on 10-19, and the bar still says otherwise. |

**Nine closed, eight open, one decided and waiting on one command.** The 10-19 pass closed in five
days because five days of shipping landed on its shortlist; what is left is the part that needed a
decision or a second person.

## 2. What changed the most since 10-19

Not a finding list — the two things that changed the *shape* of the open-source story:

1. **The repository now has a rule that binds its owner.** D98: the gates are the review, and
   `enforce_admins` is on. For five days the repo's own merge rule was a sentence that its only
   reviewer could not satisfy — fourteen pull requests merged with zero approving reviews. The rule
   is decided; **one command** applies it, and that command is his.
2. **The runtime was right and the adapters were wrong.** PR #25: the deciding actor in the MCP
   adapter and the reference host was a string the caller typed, which made the runtime's seat check
   unable to fail — and made a community whose seat is `ketua` impossible to approve at all. The
   seat is now resolved from the community's own declaration, as spec section 1.11 already said.

## 3. The shortlist, re-ranked (cheap-in-cheap-out)

1. **Link the CoC** (C1). Two lines in `README.md` and `CONTRIBUTING.md`. The file already exists and
   is already written; nothing points at it. ~10 min, pure docs.
2. **`.gitattributes`** (M5). One file: the repository is majority prose and the bar says otherwise.
   ~5 min.
3. **Seed the contribution queue** (C2). Labels `good first issue` do not exist; there are no
   issues a newcomer can take. The 10-19 file's suggestion still holds: generate them from the
   tour's own map so they cannot drift from it. ~40 min, and it is the one item that makes the
   contributor cast real rather than nominal.
4. **A quickstart that ends in a file** (A6). One command that writes an event log the adopter can
   open. It follows from A1/A2 — the host writes the log; the quickstart just does not show it.
5. **Generate the ratification range** (M1's remaining half). 20 hand-amendments to one cell; the
   cell says the range by hand while every other number in the repo is generated. **His call** —
   the two honest shapes are generated vs asserted, and choosing one changes what the cell means on
   the day he first ratifies something.

## 4. What this pass did not do

Nothing in `runtime/` was touched, no GitHub setting was changed, and no file outside this one and
`AGENTS.md` was edited. C5, A3, A4, M3 and M4 are the owner's, and a doc pass does not make them
sideways. The numbers above are command outputs from 2026-10-24; where the 10-19 pass's *evidence*
was stale (A1, A2, M2) this file says so rather than repeating the claim, because a stale finding is
worse than no finding.
