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
| C1 | No `CODE_OF_CONDUCT.md`, no doc references one | **Closed** | `CODE_OF_CONDUCT.md` exists (Contributor Covenant 3.0, with two project-specific substitutions), and it **is linked** — `README.md` (the pointer table) and `CONTRIBUTING.md` (the conduct-report paragraph) both name it. **This row was wrong when this file was first written**: the check looked for the *phrase* "code of conduct" and found nothing, when the link is by *filename* (`[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)`). The 10-19 pass made the same wrong check, so the finding it recorded was never true once the file landed. |
| C2 | The contribution queue is one issue, and it needs a paid API key | **Closed** | The `good first issue` label exists, and **the queue is now real**: issues **#28**, **#29** and **#30** carry it — the map's false "`threads` is untested" signal, the untested public surface (`runtime/src/index.ts`), and the map's verify list that omits the two adapter suites. **All three need no credentials and no provider key**, which is the whole point of the label: the 10-19 file's complaint was that the only issue a newcomer could take needed a paid API. The one remaining open issue, **#6** `unsourced_number`, is a design question and is labelled `needs-decision` — correctly. |
| C3 | No public roadmap | **Closed** | `ROADMAP.md` exists and is the public face of the refusals. |
| C4 | No changelog as an artefact | **Closed** | `CHANGELOG.md` exists; `git tag --list` → `v0.1.0 v0.2.0`; the API's `latestRelease` is **v0.2.0**. |
| C5 | The review rule binds newcomers and not the owner | **Decided, not applied** | The rule is decided and written down (`DECISIONS.md` D98: the gates are the review, `enforce_admins` on, no human review required). **The setting is still unreadable from here** — `GET /branches/main/protection` answers *403, "Resource not accessible by personal access token"* — so the rule is prose until one command runs. **His.** |
| C6 | No signing or DCO story | **Closed (the gate)** | `scripts/dco-check.mjs` exists and runs in CI — **4 cases** (`node --test scripts/dco-check.test.mjs`). The *signing* half (GPG on the tags) is still **his**. |
| C7 | No CI status badge in README | **Closed** | Three badges, including `badge.svg?branch=main`. |
| A1 | Nothing runs outside the tour | **Closed** | `adapters/reference/` is a working host (32 tests), `runtime/examples/one-complete-example.ts` exists, `scripts/quickstart.mjs` exists. The 10-19 file's "`ls` root: no `examples/`, no `bin`" no longer holds. |
| A2 | The audit trail has no file | **Closed** | The reference host writes `events.jsonl` + `manifest.json` and the MCP adapter reuses that store. **The 10-19 evidence was stale, not the code:** it said the runtime had no `node:fs` — `runtime/src/pack.ts` is now the *sanctioned* single reader (D35) and `runtime/test/boundary.test.ts` holds that line (6 cases, green). |
| A3 | No install path | **Open — his** | Still no root `package.json`; `runtime/package.json` is still `"private": true`. The npm name is D73 and it is **his** to claim. |
| A4 | No version policy or tag | **Closed** | `v0.1.0` and `v0.2.0` are tagged and v0.2.0 is the latest release. The tags are unsigned, which is **his**. |
| A5 | English-only docs for an Indonesian beachhead | **Open** | No ID-language document at the root. The pack copy is bilingual; the on-ramp is not. |
| A6 | No quickstart that ends in an artefact | **Closed** | `scripts/quickstart.mjs` **does** end in artefacts: it writes a verified event log (**15 rows**, dense in seq) and a redacted copy with the member identifiers replaced, and it prints *"what you can look at"* — the log path, the redacted copy, and the line that nothing was sent. **The 10-19 evidence was a grep for the wrong strings** (`writeFile`/`appendFile`/`.jsonl`), and the script writes through the reference host instead. |
| M1 | Prose counts and ranges are policed by a human | **Closed (counts)** | `scripts/sync-counts.mjs` regenerates the counts, and it is why the spec's test-case numbers move with the suites. **The range is still hand-amended** — 20 amendments to the ratification cell, one number left in human hands. |
| M2 | `rules/*.mdc` are advisory prose | **Open (narrowed)** | **Partly wrong now.** `scripts/gates.test.mjs` reads the rule ids out of both files and fails the build when one names a rule the validator does not enforce, or a rule no test exercises — with its own positive control. So the *ids* are checked against the code; the *prose* around them is not. `AGENTS.md` claimed "nothing here consumes the extension yet", which was true on 10-19 and is not true today — **corrected in the same PR as this file**. |
| M3 | One seat, one token, one reviewer | **Open — structural** | `stars 0 forks 0 watchers 0`. One maintainer, one seat (`DEFAULT_HUMAN_SEATS = ['organiser']`), one bus factor. Nothing in the code can fix this and nothing should pretend to. |
| M4 | A public SLA nobody is staffed to meet | **Open — his** | `SECURITY.md` still promises *"Acknowledged within 3 business days — best effort"* and names the one maintainer honestly. The promise is now labelled; it is still a promise. |
| M5 | GitHub's language bar hides what this repo mostly is | **Closed (our side)** | A `.gitattributes` now marks the prose as prose. At `76c7b4b`: `git ls-tree -r --name-only 76c7b4b \| grep '\.md$'` totals **1,387,104 B across 82 markdown files** against **1,126,238 B** across 100 TypeScript and JavaScript files — the tree is majority *prose*. The language bar reports TypeScript and JavaScript only (**a live reading of the tip, so it moves; the tree figures are the citable ones**). The bar and the tree disagreed today; **the file is the fix, and GitHub's linguist is what recalculates** — read the bar, not this row. |

**Eleven closed, six open, one decided and waiting on one command.** The 10-19 pass closed in five
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

1. **`.gitattributes`** (M5). One file: the repository is majority prose and the bar says otherwise.
   ~5 min.
2. **Seed the contribution queue** (C2). **Done the same day** — issues #28, #29 and #30, all
   `good first issue`, all zero-credential, all generated from the tour's own map so they cannot
   drift from it. This was the one item that could change M3, and M3 is the only lever on the
   review count coming back. **It does not change the bus factor by itself** — it changes the
   *odds* of a second human, which is the only honest version of that claim.
3. **Generate the ratification range** (M1's remaining half). 20 hand-amendments to one cell; the
   cell says the range by hand while every other number in the repo is generated. **His call** —
   the two honest shapes are generated vs asserted, and choosing one changes what the cell means on
   the day he first ratifies something.

**THREE CORRECTIONS TO THIS FILE, MADE THE SAME DAY, AND THEY SHARE A CAUSE.**

**One:** it first said *"no `good first issue` label exists in the repo"*. **That is false and was
false before this file was written** — the label is in the repo's label set. The check that produced
the claim **errored instead of running** (an API response that was not a label list), and the failure
was read as an answer. The row now says what is true: the label exists, and **no open issue carries
it** — the queue is empty.

**Two:** it first said the quickstart *"ends in printed output"*. **It does not** — it writes a
verified 15-row event log and a redacted copy and prints *what you can look at*. The evidence was a
grep for `writeFile`, `appendFile` and `.jsonl`, and the script writes through the reference host
instead, so the grep found nothing and the absence was reported as the fact.

**Three:** it first said the Code of Conduct was **not linked** from anywhere. **It is** — `README.md`
and `CONTRIBUTING.md` both name it — and the check asked for the *phrase* "code of conduct" when the
link is by *filename*. The 10-19 pass made the same wrong check, so that finding was never true once
the file landed.

**All three are the same failure: a check whose QUESTION was wrong, and its silence read as an
answer.** This file's entire value is that its claims can be re-run; a claim that came from a check
that never ran — or that ran the wrong question — is worse than no claim, because it looks verified.
**A check that cannot run is not a check** — and neither is a check that asks the wrong question.
**The fix for this file is the same fix the repository asks of everything else: every number and
every state in it has to be re-checkable by a command, and a re-check that fails has to change the
row.** Every row here was re-run against one commit with a question-appropriate command; three came
back false, and all three are corrected above.

## 4. What this pass did not do

Nothing in `runtime/` was touched, no GitHub setting was changed, and no file outside this one and
`AGENTS.md` was edited. C5, A3, A4, M3 and M4 are the owner's, and a doc pass does not make them
sideways. The numbers above are command outputs from 2026-10-24; where the 10-19 pass's *evidence* was stale
(A1, A2, M2) this file says so rather than repeating the claim, because a stale finding is worse than
no finding — and two of this file's own claims were wrong when it was first written, which is
recorded above rather than quietly repaired.
