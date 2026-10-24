# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**The versions here are the *code's* versions. The product's phase is separate and is stated in
`PLAN.md`: phase 1 is shadow mode, and nothing member-facing sends (D21).**

## [Unreleased]

The next increment. See `DECISIONS.md` for what is decided and what is not.

### Added
- **The fork-claims scenario, answered, and the discipline layer that answers it** (`DECISIONS.md` D67) — a
  self-checking `AGENTS.md`, a DCO sign-off check, `CODEOWNERS`, and a redaction command, so a log can
  be shared without naming anybody.
- **Any assistant in any platform can now ASK KINSHIP FOR PERMISSION** (`DECISIONS.md` D69) — a second
  host, `adapters/mcp/`, speaks MCP over stdio and answers with a card or a refusal. **The answer
  comes from the runtime, not from the model's confidence**, and no tool delivers anything to a member.
- **The P0 security properties, written** (`DECISIONS.md` D68) — the one-send property, the
  decision-time grant check, the log's edges and the privacy boundary are now *tested* properties
  rather than intentions. The eval harness that runs them had been **broken for a day** and nobody
  knew, because it was in no CI job: a test suite nobody runs is a file.
- **The mark is filed** (`DECISIONS.md` D75) — and the filing material is prepared, so the
  application is a form-filling away.
- **The build's own third-party code is pinned to a commit** (`DECISIONS.md` D76) — the token may read
  the checkout and nothing else, because a tag is a name somebody else can move.
- **Redaction fails closed** (`DECISIONS.md` D90) — the scan is over values, not over key names, and it
  asks the runtime's own rule instead of inventing a weaker one. An identifier under a key the tool
  had never heard of used to survive a redaction byte for byte.
- **`verify` compares the log with its own cover** (`DECISIONS.md` D91) — five corrupted manifest fields
  used to produce "log verified", because the fold never looked at the cover. Each field is compared
  now, a mismatch names itself, and a missing cover is a refusal.
- **The vendoring claim is either backed or gone** (`DECISIONS.md` D92) — the README called the vendoring
  check a CI gate and there was none. `scripts/vendoring.test.mjs` now copies `runtime/` and `scripts/`
  out of the repository and runs the tour on the copy, and the phrase no check here could back is gone.
- **A decision's reason is now checked by the shape guard** (`DECISIONS.md` D93) — the fold reads the
  `why`, so a row that had it removed folded to a different state and still verified clean. The reason a
  human gave is the record; a log that can lose it and still verify is not a log of decisions.
- **The DCO sign-off check has a test** (`DECISIONS.md` D88) — `scripts/dco-check.test.mjs` builds real
  git repositories in temp directories, makes real commits, and runs the real check: an unsigned
  outside contribution is refused, the same commit signed off passes, and the maintainer's own commit
  needs no sign-off. **A DCO gate never seen to refuse a contribution is a gate nobody can trust.**
- **The changelog is checked for completeness** (`DECISIONS.md` D87) — `scripts/changelog.test.mjs`
  holds it against the release tags: every decision row a release's commits name must be cited in that
  release's section, and every row after the newest tag must be cited in `[Unreleased]`.

### Changed
- **The timer is local wall clock** (`DECISIONS.md` D71) — a pack names an IANA zone and the shift is
  computed in it, with no I/O and no clock. The ladder's two rules are written down instead of inferred
  from an order of checks.
- **The ladder is composed, the README shows the tour's real output, and the derived counts are
  generated** (`DECISIONS.md` D79) — the numbers in the documents are written by a generator and proved
  by a gate, so the second layer cannot drift because it *is* the first layer.
- **The runtime ships to npm as `kinship-runtime`** (`DECISIONS.md` D73) — the name is checked and
  free, and vendoring by copy stays a documented path.
- **The licence became a fact the build checks** (`DECISIONS.md` D83) — D72 changed the licence and
  named the files that would follow it; four did not, and one of them was the validator itself,
  printing *"Q4 is still the owner's call"* on every run. Every licence claim is now held against
  the `LICENSE` file, and the expected value is read rather than typed.
- **The `LICENSE` file is the licence and nothing else** (`DECISIONS.md` D84) — GitHub's own detector
  was publishing this repository as `NOASSERTION` / "Other", because a copyright block and a separator
  stood in front of the Apache-2.0 text. It is now byte-identical to apache.org's `LICENSE-2.0.txt`
  except the appendix's copyright slot, which is filled.
- **The gap list stopped describing the security policy in the past tense** (`DECISIONS.md` D85) — and a
  document's description of another document is now checked against that document.
- **Six live documents described this repository inaccurately, and are now accurate** (`DECISIONS.md`
  D86) — the manifests carry the release's version instead of the first one's, the link checker checks
  **anchors** and not only file paths, the compatibility matrix names the majors CI actually gates
  instead of every major of an open-ended promise, and the MCP adapter's test count is generated.
- **The intake is lighter where the governance did not need it to be** (`DECISIONS.md` D88) — the DCO
  requirement is documented where a contributor will meet it, the PR template no longer asks for the
  full gate output pasted into the description, and the feature-request template no longer asks a
  stranger to read a 279 KB decision register before filing a bug.
- **The decision log's own ratification range is checked against the log** (`DECISIONS.md` D89) — the
  cell that was hand-amended ten times, and forty rows stale, is now read by a gate.

### Fixed
- **Two hardening findings from an external review, both real** (`DECISIONS.md` D70) — the revision
  hash was 64 bits, which a GPU collides in minutes, and the reducer folded a malformed row silently,
  which switched off a member protection. The log format version moved to 2, because the hash width is
  part of the format.

### Decided

- **The pilot's acceptance criteria are written down BEFORE the run** (`DECISIONS.md` D74) — so the
  protocol can still say *return to Define*. No behaviour changes here; the point is that a
  pre-committed KILL is what makes a good result mean something.


- **The licence is Apache-2.0, and PRD section 12-Q4 is closed** (`DECISIONS.md` D72). The MIT default is
  replaced by Apache-2.0 for one clause: an explicit patent grant from every contributor, plus the
  patent-termination clause that stops a patent claim being used to shut the project down. It costs an
  adopter nothing — no copyleft, no source-disclosure, no field-of-use restriction — so a hosted service
  and a vendored copy are both allowed, and **nothing about the open-source/hosted boundary in D19
  changes.** The `LICENSE`, `NOTICE`, `runtime/package.json` and the pack frontmatter already carried it;
  the PRD and the licence memo did not, and now do.

### Added

- **The paired-evaluation research programme** (`DECISIONS.md` D80) — `research/AGENT-VS-AGENT-EVALUATION-2026-10-21.md`
  (the survey, 42 cited sources) and `research/PAIRED-EVALUATION-PROGRAMME-2026-10-23.md` (the programme's
  question, refusals, method, naming and claim ceiling). It publishes methods and results and **never a
  ranking**, and it adds no sign-up path to this repository.

### Fixed

- **The Product-surface disclosure was false for three days.** This repository's README said
  *"shortcutsistem.com does not describe Kinship today, and nothing is hosted there"* while a hosted
  Kinship Host had been serving its landing, its product page, the hosted human seat and the pilot request
  form since 2026-10-21. That is D19's own no-silent-flip rule broken by omission, repaired in **D81**,
  which owns the lateness in its own row. The README and `SUPPORT.md` now say what is true: there is a
  hosted surface, it is a separate product running this control plane byte for byte, and this repository
  still has no sign-up path, no pricing and no funnel.

## [0.2.0] — 2026-10-23

The community surface, the planner, the daily digest, and the protection layer.

### Added

- **The planner** (D60) — a community's own copy, next event and members become the actions the
  fleet takes, at the times it takes them. A wake now carries the action it will attempt, and the
  run cap covers the path the fleet actually uses.
- **The daily digest** (D65) — what the fleet did, per channel, over a window it states, for the
  community manager who has to answer for it. A read; it appends nothing and names nobody.
- **The community surface** (D54–D58) — the coverage window and the community-lead lane, the open
  thread, the operating posture, a split working week, and a language pair that is the community's
  rather than Indonesia's.
- **The protection layer** (D66) — a trademark statement, a `CITATION.cff`, this changelog, a real
  security reporting route, and a pack attribution block that credits a real author and stops
  claiming a usage trail that does not exist.
- **The community's open threads** (D55) — a member's question, tracked from raised to answered, and
  the coverage window's clock finally measures something a member would recognise.
- **The community's operating posture** (D56) — a community declares how it is run and the fleet is
  held to it. There is no country table, and that refusal is the point.
- **A staffed window that can be a list** (D57) — a community's week may be split. The first country
  to cover is Dubai, for a reason that is a fact and not a stereotype.
- **The type contract as a CI job, the sign out of the repository, and the quickstart in plain prose**
  (D59) — the runtime is type-checked in CI without gaining a dependency, and the sign leaves the
  repository it was borrowing.

### Changed

- **The folder structure** (D65) — the PRD and the two dated memos move into `docs/`, with
  `design-thinking/` beside them. A new gate test checks that every relative link in the live
  documents resolves, so the structure is a claim the build checks.
- **The credential seam is named correctly** — it is **BYOK** (bring your own key), and BYOD (the
  community's own data) is a different question the seam answers differently.
- **The strict `tsconfig` compiles** (D53) — 27 type errors fixed, and the runtime is clean under
  `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- **The three agent names are prompt-level** (D64) — a group chat of four agents converged on a finding
  no single pass had made: `event-ops`, `engagement` and `moderator` are three names for three class
  maps, and `moderator` is currently paperwork.

### Fixed

- The run cap did not cover the path the fleet actually uses.
- A refused phase-origin claim left no trace in the log.
- An empty fact and a typo'd slot both shipped a hole in a member-facing message.
- The test suite's result depended on the working directory.
- The tour exercised none of D60 — it now carries 36 guarantees.
- **Two defects in the D60 path** (D61) — found by asking the wrong question of the code; the second
  was found by an agent in a group chat.
- **The audit pass** (D62) — a refusal that left no trace, a tour that did not show the product, and
  four branches of clutter closed.
- **An independent verifier said DO NOT SHIP** (D63) — and it was right about the three that mattered.

## [0.1.0] — 2026-10-22

The first public, dated, citable artefact of the project. Everything below shipped before it and
is now attributed to it.

### Added

- **The control-plane core** (`runtime/`) — a dependency-free TypeScript library: the autonomy
  ladder, grants, approval cards, event lifecycle, budgets, member protections, identity disclosure,
  the sanction ladder, the shatter-guard, the append-only replayable audit log, the engine, and the
  pack boot gate. **Zero dependencies, node ≥ 23, erasable syntax only.**
- **The shape gate** (`scripts/validate-pack.mjs`) and its tamper-resistant contract test.
- **The reference host** (`adapters/reference/`) — a working host that fills the four seams
  (credential, clock, store, transport) and **sends nothing**.
- **The planner** (D60) — a community's own copy, next event and members become the actions the
  fleet takes, at the times it takes them. A wake now carries the action it will attempt.
- **The daily digest** (D65) — what the fleet did, per channel, over a window it states, for the
  community manager who has to answer for it. A read; it appends nothing and names nobody.
- **The community surface** (D54–D58) — the coverage window and the community-lead lane, the open
  thread, the operating posture, a split working week, and a language pair that is the community's
  rather than Indonesia's.
- **The four gates**, the tour's 36 guarantees, and a CI job for the type contract.

### Security

- Every member-facing commit refuses at `no_transport` (D21), with the one-send authorization left
  intact and the refusal recorded.
- `PKG-57` refuses any pack file whose lines carry the shape of a provider credential.
- The boundary gate proves no file under `runtime/src` can reach the network, and that
  `runtime/package.json` declares no dependencies at all.

### Known limitations

Stated here rather than in a README paragraph, because a first release's limitations belong next to
its features: **no transport ships**, so nothing has reached a member; **no dated shadow-mode event
has run**, so there is no evidence of impact; and the pack's three agent names are **prompt-level** —
`moderator` in particular is a prompt and a YAML string, not a wired capability.

[Unreleased]: https://github.com/Therealratoshen/kinship/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Therealratoshen/kinship/releases/tag/v0.2.0
[0.1.0]: https://github.com/Therealratoshen/kinship/releases/tag/v0.1.0
