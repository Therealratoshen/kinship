# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**The versions here are the *code's* versions. The product's phase is separate and is stated in
`PLAN.md`: phase 1 is shadow mode, and nothing member-facing sends (D21).**

## [Unreleased]

The next increment. See `DECISIONS.md` for what is decided and what is not.

### Changed

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

### Changed

- **The folder structure** (D65) — the PRD and the two dated memos move into `docs/`, with
  `design-thinking/` beside them. A new gate test checks that every relative link in the live
  documents resolves, so the structure is a claim the build checks.
- **The credential seam is named correctly** — it is **BYOK** (bring your own key), and BYOD (the
  community's own data) is a different question the seam answers differently.

### Fixed

- The run cap did not cover the path the fleet actually uses.
- A refused phase-origin claim left no trace in the log.
- An empty fact and a typo'd slot both shipped a hole in a member-facing message.
- The test suite's result depended on the working directory.
- The tour exercised none of D60 — it now carries 36 guarantees.

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
