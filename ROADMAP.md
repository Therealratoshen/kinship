# Kinship — what is not complete

Read this before opening a feature PR. It exists because the first question a stranger asks an
unfamiliar repo is *"what's missing?"*, and because a project that only publishes what it has built
invites exactly the PRs it has already refused.

**No dates.** This is one maintainer at four-to-five hours a week. A date nobody can keep is worse than
none, and every promise here would be a claim the code cannot check.

**What is already shipped is not listed** — see [README.md](README.md) §"What ships vs what is gated",
which is the single source for that, and `spec/GOVERNANCE-SPEC-OUTLINE.md` Part 6, which maps every spec
rule to the file and test that hold it. **What this project has decided not to build** is
`PLAN.md` §"Explicitly not doing this quarter" — read that before proposing a hub UI, a marketplace, or
any WhatsApp automation; those refusals are recorded, not forgotten, and several are enforced by the
validator rather than by taste.

This file lists only the gaps, and for each one says who decides.

## Not complete for an adopter

The honest one-line state of this repo today: **a governance library, a spec, and a demo — not yet a
self-hostable product.** Everything below follows from that sentence.

| Gap | What it means in practice | Who decides |
|---|---|---|
| **No host exists.** | `runtime/tour.ts` boots the real pack in memory and prints the guarantees. Nothing ticks a clock, nothing persists, nothing hands a card to a person. `spec/HOST-CONTRACT.md` names the four seams a host owns — credential, clock, store, transport — and `runtime/` refuses to fill any of them by design (D21, D33). Proposed fix worth a PR: a **reference host as a sibling package** — boot the pack, own a `setInterval`, append the log to a file, print cards to stdout through an `echo` transport. No channel, so it does not breach the no-transport rule or the shadow-mode gate. | contributor-able in shape; the owner decides whether it lands before D9 |
| **The audit trail has no file.** | The event log lives in a plain array (`runtime/src/store.ts`: `freshState()` returns `events: []`; the only `node:` import is `node:crypto` for the approval hash). Replay is provable inside one process, so "replayable" currently produces nothing you can hand a reviewer. Any on-disk format is the runtime's **first persisted format** — a design decision, not a convenience. | **owner** (phase-1 ruling) |
| **No install path.** | There is no root `package.json`, and `runtime/package.json` is `"private": true`. So `npm test` at the root does not exist, and adoption means copying a directory. Either publish it or state that vendoring-by-copy is intended — the gap is that neither is written down. | **owner**, then a doc or a publish |
| **No release to pin.** | Zero tags, no published release, while a manifest already says `0.1.0`. A fork cannot depend on a version. | **owner** |
| **No Indonesian-language on-ramp.** | Member-facing pack copy is bilingual `[id, en]`; the README, CONTRIBUTING, SECURITY and this file are English only. The community this was built for reads the pack, not the spec. | contributor-able (a translation PR is welcome; it takes the claim-honesty rules with it) |
| **No quickstart that ends in an artefact.** | "Try it now" ends in printed guarantees. An organiser wants: run this, and here is the log file you can now audit. Follows from the first two rows. | blocked on the two above |

## Not complete for a contributor

| Gap | What it means | Who decides |
|---|---|---|
| **Contribution intake is one issue, and it needs a paid API key.** | The only open issue is the eval harness (#3), labelled `good first issue` while requiring a provider credential a newcomer does not have. The machine-readable list of real gaps already exists: `node runtime/tour.ts --json`. Seeding issues from it — so the queue and the map cannot drift apart — is the cheapest fix in this file. | contributor-able, with the owner's labels |
| **One moderator, no independent arbiter.** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) is adopted (2026-10-19, D40) and its reporting channel is borrowed from `SECURITY.md`, because this repo has no other private path and no personal address has been published for reports. A conduct report about the maintainer therefore has no appeal route. | **owner** (same open question the product carries: PRD §12-Q12) |
| **The review rule binds contributors and not the owner.** | `enforce_admins` is `false` and `required_status_checks` is `null`, so CI is advisory for him and blocking for everyone else, and every merge needs one approving review from the same person who writes the code. Dependabot PR #4 sat blocked on exactly this until it was approved under his token (D26, D39). Whether the rule should bind him is undecided. | **owner** |
| **Commits are unsigned; no DCO.** | Human commits read `unsigned` while a bot's merge commit reads `verified: true` with `signature: none` — the platform vouching for an identity with no key. On a repo selling a replayable trail, that asymmetry is the interesting defect (D39). | **owner** |
| **Counts in prose are policed by a human.** | Test-case, rule, guarantee and range figures are written into the docs and recomputed by hand on each pass, and `scripts/gates.test.mjs` correctly checks the *gate list* rather than the numbers. The count of documents is itself the hard part: six files state a suite or guarantee figure, eleven tell the reader to recompute something, and which number you get depends on the pattern you search with — so a count quoted without the command that produced it is not a checkable claim. Four instances in four days are recorded in D34, D37b, D39, and D40's own row, which shipped this row's first wording with an unmeasured "six documents" in it. The two honest fixes are a generated count surface that docs quote, or a test that recomputes each claim from the tree. | **owner** (it touches every doc) |
| **`rules/*.mdc` are not loaded by anything.** | They are conventions a human or an agent must remember to read; `AGENTS.md` says so. Until something consumes them, an invariant can be violated in good faith. | contributor-able |
| **No changelog as an artefact.** | History lives in `DECISIONS.md` (dated rows, append-only) and PRD §14 (a document's changelog, not a product's). Neither reads as a release note. | **owner**, once releases exist |
| **A published SLA nobody is staffed to keep.** | `SECURITY.md` promises triage "within 3 business days". One maintainer at four-to-five hours a week is the whole security team, so the number is either a commitment he renews deliberately or it goes. | **owner** |

## Not complete for the community it governs

These are gaps the product's own claims run into, not packaging problems.

- **No real event has ever run the fleet.** Phase 1 starts when the owner writes a dated shadow-mode
  event as `D9` in `DECISIONS.md`. It is still unset, so every "this reduces organiser load" statement
  is an assumption under test, not a finding. Nothing member-facing sends in any case (D21).
- **A sanction cannot be recorded after the fact.** A community may *declare* its ladder
  (`sanction_ladder:`, spec §2.12 / FR-5.11, D37), but there is no `moderation.outcome` row for what a
  human actually did, so enforcement history is unreplayable. Proposal and its reason for waiting:
  `research/COMMUNITY-GOVERNANCE-PATTERNS-2026-10-19.md` §5(a).
- **The arrival question is unasked.** A newcomer's route in, and who vouches, is not a `needs:` entry
  any pack answers yet — §5(c) of the same file.
- **Member-sentiment signals stay unmeasured by design** (D30, PRD §12-Q13). That is a decision, listed
  here so a reader does not mistake it for an oversight.
- **The audit timeline's visibility is unresolved.** Spec §2.3 both asks "who can see the audit log?" and
  calls the timeline member-readable; `DECISIONS.md`'s "Not yet decided" table names which artefact may
  print a person's identifier.

## How to pick something

1. `node runtime/tour.ts --json` — the contribution map, generated from the code's own guarantees.
2. `node scripts/gates.mjs` — the four gates CI runs, from the repo root, no install step (Node ≥ 23).
3. Read the invariant that gates your change: `rules/governance-invariants.mdc`, then
   `spec/GOVERNANCE-SPEC-OUTLINE.md` for the semantics. If the change touches anything the host owns,
   `spec/HOST-CONTRACT.md` decides where the code may live — adapter code is a sibling package, never
   inside `runtime/`.
4. `CONTRIBUTING.md` §"What is not open for contribution (yet)" — three directories are evidence layers
   and the eval cases are written but unrun.

A PR that closes a row above is welcome. A PR that adds a capability the spec has not decided — a
moderation tool, a transport, a second human seat, a per-agent cap — will be refused by a gate, not by
taste, and the refusal will name the rule.

## What would change this file

The shadow-mode measurement (D9 + `pilots/shadow-mode/TEST-PROTOCOL.md`). If it says the fleet did not
reduce load, the honest response is a new PRD, not a longer roadmap. This file is a claim too, so it
carries the same ceiling as the rest of the repo (invariant #3): no adoption figures, no hours-saved, no
community sizes, and every gap above is a command output or a decision row, re-verifiable from a clone.

*Written 2026-10-19 against `main`, from the read-only audit in
[community/OSS-COMPLETENESS-POV-2026-10-19.md](community/OSS-COMPLETENESS-POV-2026-10-19.md), which carries
the evidence for each row. Corrections here are dated rows in `DECISIONS.md`, not edits.*
