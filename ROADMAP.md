# Kinship — what is not complete

Read this before opening a feature PR. It exists because the first question a stranger asks an
unfamiliar repo is *"what's missing?"*, and because a project that only publishes what it has built
invites exactly the PRs it has already refused.

**No dates.** This is one maintainer at four-to-five hours a week. A date nobody can keep is worse than
none, and every promise here would be a claim the code cannot check.

**What is already shipped is not listed** — see [README.md](README.md) section "What ships",
which is the single source for that, and `spec/GOVERNANCE-SPEC-OUTLINE.md` Part 6, which maps every spec
rule to the file and test that hold it. **What this project has decided not to build** is
`PLAN.md` section "Explicitly not doing this quarter" — read that before proposing a hub UI, a marketplace, or
any WhatsApp automation; those refusals are recorded, not forgotten, and several are enforced by the
validator rather than by taste.

This file lists only the gaps, and for each one says who decides.

## Not complete for an adopter

The honest one-line state of this repo today: **a governance library, a spec, and a demo — not yet a
self-hostable product.** Everything below follows from that sentence.

| Gap | What it means in practice | Who decides |
|---|---|---|
| **The install path is stated: vendoring by copy.** | There is no root `package.json` and `runtime/package.json` is `private: true`, so there is no registry package and no `npm install` in the library. The README now says so — copy `runtime/` **and `scripts/` together** (the loader reads a pack's shape through the same validator the gates use, so they travel as one folder) and import the `.ts` files directly. The reference host's one `npm install` creates a local symlink and fetches nothing. **What is still open is publishing**, and that is a release decision: a tag to pin now exists, a registry package does not, and the repo has chosen not to need one. | **owner** (whether to also publish to a registry) |
| **A release to pin exists; a registry package does not — and the two credentials it needs are named.** | There are now **two** tags and **two** published GitHub releases — `v0.1.0` and `v0.2.0` — so a fork can pin a version. What does **not** exist is a package on npm: `npm view kinship-runtime` answers **404**, and the name is still free. **The artefact is now the thing D73 decided** (2026-10-24): the published entry point is compiled ESM plus `.d.ts`, and the package carries only the code the runtime reaches — no test files, no TypeScript sources. **What is missing is not code, it is two credentials:** a **signed git tag** (the pre-flight refuses an unsigned one) and an **npm publish token** — after which `node scripts/release.mjs --publish --version <x.y.z>` is the whole job. **One consequence worth knowing: publishing takes the name.** | **owner** (the npm token and the signed tag are the owner's; the artefact is built and proved) |
| **No quickstart that ends in an artefact.** | **Landed 2026-10-22** (`DECISIONS.md` D49): the README's "Get it" and "Use it" now end in the two files the reference host writes, and in a `verify` that re-reads them. What is still missing is the **install path** below. **`scripts/quickstart.mjs` now ends in an artefact with no `npm install` at all** (it links the runtime itself, because the adapter's one dependency is a local path), so the wart is gone from the quickstart and survives only in the reference host's own setup. | contributor-able, but it wants the install path first |
| **No transport ships, and the three that were decided have not been built.** | The runtime still refuses **every** member-facing commit at the transport gate (`no_transport`, D21) — that is still true and still structural. What changed on 2026-10-24 is that the transports are **decided**: WhatsApp, Telegram and Discord as opt-in adapter packages on the community's own credentials, with a generic webhook beside them as the escape hatch (D105, D107). The adapters do not exist. **The order the terms study implies:** Telegram first (a bot token, no terms to negotiate, and the group rate limit bites before any policy question does), then Discord (a bot, never the operator's account), then WhatsApp (a business number, approved templates, and an opt-in record per member). | **owner** (the build order is the owner's; the per-platform constraints are decided) |
| **The card still carries a phase.** | The `phase` field is retired by D101 — the lane is the action class, the schedule is a `when:` on the plan — and the runtime, the plan format and `packs/kopdar-ops/pack.local.plan.example.yaml` all still carry it. The removal is a **pack-format break** (a pack that says `phase:` stops parsing), so it is a scheduled slice rather than a rename, and D99's live-session proposal (PR #24) is withdrawn rather than merged. | **owner** (when the format break lands) |
| **The approval surface is decided and does not exist.** | D102 and D103 settle it: a human approves in the **dashboard**, or through the host's own CLI for a headless operator, and never through a model-reachable tool — `kinship_approve` leaves the MCP tool set *when the dashboard exists*, not before. **What is still missing is the artefact.** Until it exists, approval is a card in a terminal, which is the thing the owner's own product feedback called out as the reason approval does not get done. | **owner** (the surface is decided; the artefact is not) |
| **The capability manifest has exactly one capability.** | D104 ships the manifest — an operator's `capabilities:` block, each capability saying why it is on, the seat that answers resolved from the community's declared seat set rather than written into the manifest, and the human check's existence a floor with no off switch — and `human_check` is the only entry, because **the vocabulary grows only with enforcement** (`push` writes a `ReviewRequested` row, `pull` does not). **Not built:** the pack-level override (the pack format is policed by 62 validator rules), and `log_fields`, the community's own log fields (D108), which is the manifest's next capability and lands when the shape guard can check it. | **owner** (each capability is a decision) |
| **The hosted product runs a copy of this runtime that nothing here can see.** | The install path is vendoring by copy, so every host — including the hosted product at `shortcutsistem.com` — carries its own copy of `runtime/`. A copy can be old and still run, and this repository cannot see it: the product's source is private, so no test here can compare anything. **`scripts/runtime-digest.mjs` now makes the comparison possible** (D112) — one `sha256` over the shippable runtime, path-independent, so a host's copy and this tree are provably the same bytes or provably not. **What is not decided is who records it.** A host that writes the digest it was built from next to its own log turns *"is this copy current?"* into a comparison of two strings instead of a question about anyone's memory. Whether the hosted product adopts that, and whether the product's application source belongs in this repository at all, are separate questions and both are the owner's. | **owner** |
## Not complete for a contributor

| Gap | What it means | Who decides |
|---|---|---|
| **Contribution intake is seeded, and thin.** | The eval harness (#3) was built and merged — `node evals/harness.mjs` runs the five written cases through the real `Fleet` with a fake provider, so it needs **no paid API key** — and it closed the issue. That left this repo with **zero open issues**, so three were seeded on 2026-10-22: **one** from the machine-readable map (`node runtime/tour.ts --json` → `contributionMap.declaredDebt`, which names exactly one actionable item — its other entry says plainly *"Do not 'implement' it"*), and **two** from the contributor-able rows in this file. **Two of the three are now closed**, so the live queue is **one issue** (#6, the `unsourced_number` debt, labelled `needs-decision`) and **six** are closed. **The gap that remains is coverage, not count**: the map cannot seed a queue by itself, so the queue is the union of the map's gaps and this file's, and two lists that must not drift apart are exactly the thing this repo refuses to leave un-checked. | contributor-able; the union needs one list, not two |
| **One moderator, no independent arbiter.** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) is adopted (2026-10-19, D40) and its reporting channel is borrowed from `SECURITY.md`, because this repo has no other private path and no personal address has been published for reports. A conduct report about the maintainer therefore has no appeal route. | **owner** (same open question the product carries: PRD section 12-Q12) |
| **The merge rule is decided and not yet applied.** | The rule was *"every merge needs one approving review from the same person who writes the code"* — and **GitHub does not count an author's own approval**, so with one maintainer it could not be met by anybody, and **fourteen pull requests merged today with zero approving reviews — #10 through #23, every one verified against the reviews API — and nothing recorded that.** **The decided rule is that the gates are the review**: the CI jobs are required, no human review is required (there is no second human to require one from), and `enforce_admins` is on, so **the rules bind the owner too**. The list of required checks is **derived from the workflow**, not typed. **What is left is one click that this repository's agent cannot make** — the rule is a repository setting, and the token here gets *403, "Resource not accessible by personal access token"*, from the endpoint that reports it. `GITHUB_TOKEN=<a token with administration: read and write> node scripts/configure-branch-protection.mjs --apply` applies it and reads it back. | **owner** — one command, and the rule stops being prose |
| **Commits are unsigned, and the DCO is the only provenance there is.** | A **DCO sign-off check runs in CI** on every pull request (`scripts/dco-check.mjs`), and it is exempt for the maintainer's own commits — the ritual cannot inform the one person it cannot be about. So a contribution from a stranger carries a `Signed-off-by:` line and one from the maintainer does not. **What is still open is the signing asymmetry underneath it:** human commits read `unsigned` while a bot's merge commit reads `verified: true` with `signature: none` — the platform vouching for an identity with no key. On a repo selling a replayable trail, that asymmetry is the interesting defect (D39), and signing the tags is the cheapest half of it. | **owner** (the signing; the DCO is shipped) |
| **The counts in prose are checked against the tree.** | Test-case, rule and file figures were written into the docs and recomputed by hand on each pass, and `scripts/gates.test.mjs` checked the *gate list* rather than the numbers. **Now it recomputes the numbers too**: every count the live documents quote is listed with the way to recompute it (the commands the documents already print), the test fails if a quoted number no longer matches the tree, and a second test fails if a count appears in a live document that no check knows about. **Three were already stale** when this landed — `AGENTS.md` said "239 tests across 25 files" (it was 252 across 26), `README.md` and `CONTRIBUTING.md` said "51 cases" (it was 53), and `CONTRIBUTING.md` said "the newest eight of them the sanction-ladder cases" (there were eleven) — and **two of the three were stale because this agent changed the tree and did not notice**. That is the whole argument for the check. The un-reproducible *document* count ("six files state a figure, eleven tell the reader to recompute") is gone: a number whose value depends on the pattern you search with is not a claim, so the documents now quote numbers with the command that produced them. | **closed** (`DECISIONS.md` D52) |
| **`rules/*.mdc` are half consumed.** | They were conventions a human or an agent had to remember to read, so an invariant could be violated in good faith. Now `scripts/gates.test.mjs` **reads the rule ids these files name** and fails the build if one is not enforced by the validator, or is enforced but exercised by no test — so an invariant cannot be *named* here with nothing behind it (`DECISIONS.md` D51). **What is still not consumed is the prose**: a rule with no id behind it — the ladder's shape, the refusal vocabulary — can still drift from the code, and a drift check does not see prose. | contributor-able, but it wants the rules to carry ids |
| **A changelog exists, and it is now checked for completeness.** | `CHANGELOG.md` ships, in Keep a Changelog shape, with both published releases and an `[Unreleased]` section — and it had a false claim in its header (*"All notable changes to this project are recorded here"*) because **13 decision rows that shipped after `v0.2.0` appeared in no release note**, including a whole new adapter package and a security fix. The missing entries are written, and `scripts/changelog.test.mjs` now holds the changelog against the **release tag**: every decision row that shipped in a release must be cited in that release's section, and every row after the newest tag must be cited in `[Unreleased]`. | **owner** (the entries are the owner's to judge; the check is shipped) |
| **A published response time with no review point.** | `SECURITY.md` promises an **acknowledgement within 3 business days — best effort** — not a triage, not a fix — and it names the capacity the promise is made with: *one maintainer with a few hours a week*. **That wording landed on 2026-10-24 (D76), and this row was the thing left behind**: it still described the old promise ("promises triage") as if the file still said it, so for a while this file was asking the owner to decide something the security policy had already decided. The gap that remains is smaller and real — **the number has no review point.** A published response time nobody re-reads is a claim that rots the way this repository's other claims have rotted, and `scripts/promises.test.mjs` now holds this file's description of `SECURITY.md` against `SECURITY.md` itself, so the two cannot drift apart again. | **owner** (the number, and when it is next re-read) |

## Not complete for the community it governs

These are gaps the product's own claims run into, not packaging problems.

- **No real event has ever run the fleet.** Phase 1 starts when the owner writes a dated shadow-mode
  event as `D9` in `DECISIONS.md`. It is still unset, so every "this reduces organiser load" statement
  is an assumption under test, not a finding. Nothing member-facing sends in any case (D21).
- **A sanction cannot be recorded after the fact.** A community may *declare* its ladder
  (`sanction_ladder:`, spec section 2.12 / FR-5.11, D37), but there is no `moderation.outcome` row for what a
  human actually did, so enforcement history is unreplayable. Proposal and its reason for waiting:
  `research/COMMUNITY-GOVERNANCE-PATTERNS-2026-10-19.md` section 5(a).
- **The arrival question is unasked.** A newcomer's route in, and who vouches, is not a `needs:` entry
  any pack answers yet — section 5(c) of the same file.
- **Member-sentiment signals stay unmeasured by design** (D30, PRD section 12-Q13). That is a decision, listed
  here so a reader does not mistake it for an oversight.
- **The audit timeline's visibility is unresolved.** Spec section 2.3 both asks "who can see the audit log?" and
  calls the timeline member-readable; `DECISIONS.md`'s "Not yet decided" table names which artefact may
  print a person's identifier.
- **The coverage window records a promise; it does not yet enforce one.** A pack can declare the hours a
  human is on duty (`coverage:`, spec section 2.13 / FR-5.12, D54) and the health read reports whether an
  obligation outlived a staffed shift. What it cannot yet do is *stop* the standing-engagement lane from
  answering outside those hours, because that refusal needs a transport to refuse against and phase 1
  sends nothing (D21). The window is a **record and a measurement** today; making it a gate is phase-2
  work, and until then the lane honours it in its own instructions only.

- **WhatsApp reaches individuals, and groups stay human — and neither is built yet.** D106 splits the
  owner's "work in WhatsApp like a community manager" in two, against the platform's own terms: a
  send to an **individual** is permitted (free-form inside the 24-hour window, an approved template
  outside it, opt-in recorded per member), while a **group** send is not — the Groups API is capped
  at 8 participants and the operator's own account may not be automated. The group lane therefore
  stays a human's paste (D11, D13, unchanged), and the community-manager *behaviour* lands where a
  bot is permitted — Telegram, Discord — and member-directed on WhatsApp. **What is not built is the
  adapter**, so today a WhatsApp message is still a human's paste for everybody, on every lane.
- **The community's own log fields do not exist.** D108 splits the log in two: the **format** is the
  community's (the host owns the file; the manifest names what it records), the **event vocabulary**
  is the project's (the log is the audit trail, and two communities with different vocabularies would
  have logs no tool could read together). The community's extra fields are the manifest's next
  capability and land when the shape guard can enforce them — until then a community's manifest can
  say nothing about what its log carries.

## How to pick something

1. `node runtime/tour.ts --json` — the contribution map, generated from the code's own guarantees.
2. `node scripts/gates.mjs` — the four gates CI runs, from the repo root, no install step (Node ≥ 23).
3. Read the invariant that gates your change: `rules/governance-invariants.mdc`, then
   `spec/GOVERNANCE-SPEC-OUTLINE.md` for the semantics. If the change touches anything the host owns,
   `spec/HOST-CONTRACT.md` decides where the code may live — adapter code is a sibling package, never
   inside `runtime/`.
4. `CONTRIBUTING.md` section "What is not open for contribution (yet)" — three directories are evidence layers
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
