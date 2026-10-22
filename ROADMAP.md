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
| **The install path is stated: vendoring by copy.** | There is no root `package.json` and `runtime/package.json` is `private: true`, so there is no registry package and no `npm install` in the library. The README now says so — copy `runtime/` **and `scripts/` together** (the loader reads a pack's shape through the same validator the gates use, so they travel as one folder) and import the `.ts` files directly. The reference host's one `npm install` creates a local symlink and fetches nothing. **What is still open is publishing**, and that is a release decision: a tag to pin now exists, a registry package does not, and the repo has chosen not to need one. | **owner** (whether to also publish to a registry) |
| **A release to pin exists; a registry package does not.** | There is now a `v0.1.0` tag and a published GitHub release, so a fork can pin a version. What does **not** exist is a package on npm — deliberately, per the install path above: the runtime is vendored, and the repo states that rather than leaving it as a gap. | **owner** (publishing is a release decision) |
| **No quickstart that ends in an artefact.** | **Landed 2026-10-22** (`DECISIONS.md` D49): the README's "Try it now" now ends in the two files the reference host writes, and ends in a `verify` that re-reads them. What is still missing is the **install path** below — the quickstart's one `npm install` is a wart on a repo whose gates need none. | contributor-able, but it wants the install path first |

## Not complete for a contributor

| Gap | What it means | Who decides |
|---|---|---|
| **Contribution intake is seeded, and thin.** | The eval harness (#3) was built and merged — `node evals/harness.mjs` runs the five written cases through the real `Fleet` with a fake provider, so it needs **no paid API key** — and it closed the issue. That left this repo with **zero open issues**, so the three that exist now were seeded on 2026-10-22: **one** from the machine-readable map (`node runtime/tour.ts --json` → `contributionMap.declaredDebt`, which names exactly one actionable item — its other entry says plainly *"Do not 'implement' it"*), and **two** from the contributor-able rows in this file. **The gap that remains is coverage, not count**: the map cannot seed a queue by itself, so the queue is the union of the map's gaps and this file's, and two lists that must not drift apart are exactly the thing this repo refuses to leave un-checked. | contributor-able; the union needs one list, not two |
| **One moderator, no independent arbiter.** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) is adopted (2026-10-19, D40) and its reporting channel is borrowed from `SECURITY.md`, because this repo has no other private path and no personal address has been published for reports. A conduct report about the maintainer therefore has no appeal route. | **owner** (same open question the product carries: PRD §12-Q12) |
| **The review rule binds contributors and not the owner.** | `enforce_admins` is `false` and `required_status_checks` is `null`, so CI is advisory for him and blocking for everyone else, and every merge needs one approving review from the same person who writes the code. Dependabot PR #4 sat blocked on exactly this until it was approved under his token (D26, D39). Whether the rule should bind him is undecided. | **owner** |
| **Commits are unsigned; no DCO.** | Human commits read `unsigned` while a bot's merge commit reads `verified: true` with `signature: none` — the platform vouching for an identity with no key. On a repo selling a replayable trail, that asymmetry is the interesting defect (D39). | **owner** |
| **The counts in prose are checked against the tree.** | Test-case, rule and file figures were written into the docs and recomputed by hand on each pass, and `scripts/gates.test.mjs` checked the *gate list* rather than the numbers. **Now it recomputes the numbers too**: every count the live documents quote is listed with the way to recompute it (the commands the documents already print), the test fails if a quoted number no longer matches the tree, and a second test fails if a count appears in a live document that no check knows about. **Three were already stale** when this landed — `AGENTS.md` said "239 tests across 25 files" (it was 252 across 26), `README.md` and `CONTRIBUTING.md` said "51 cases" (it was 53), and `CONTRIBUTING.md` said "the newest eight of them the sanction-ladder cases" (there were eleven) — and **two of the three were stale because this agent changed the tree and did not notice**. That is the whole argument for the check. The un-reproducible *document* count ("six files state a figure, eleven tell the reader to recompute") is gone: a number whose value depends on the pattern you search with is not a claim, so the documents now quote numbers with the command that produced them. | **closed** (`DECISIONS.md` D52) |
| **`rules/*.mdc` are half consumed.** | They were conventions a human or an agent had to remember to read, so an invariant could be violated in good faith. Now `scripts/gates.test.mjs` **reads the rule ids these files name** and fails the build if one is not enforced by the validator, or is enforced but exercised by no test — so an invariant cannot be *named* here with nothing behind it (`DECISIONS.md` D51). **What is still not consumed is the prose**: a rule with no id behind it — the ladder's shape, the refusal vocabulary — can still drift from the code, and a drift check does not see prose. | contributor-able, but it wants the rules to carry ids |
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
   and the `evals/promptfoo/` cases are still unrun *by promptfoo* (no provider is wired to it; the
   harness that runs them is `node evals/harness.mjs`).

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
