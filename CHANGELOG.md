# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**The versions here are the *code's* versions. The product's phase is separate and is stated in
`PLAN.md`: phase 1 is shadow mode, and nothing member-facing sends (D21).**

## [Unreleased]

The next increment. See `DECISIONS.md` for what is decided and what is not.

### Fixed
- **The contribution map no longer reports a tested module as untested, and the list a newcomer is
  handed names every suite that exists** (`DECISIONS.md` D114) — `runtime/test/thread.test.ts` is
  renamed to `runtime/test/threads.test.ts`, so the map's exact-name convention finds it, and
  `howToVerify` now carries the type contract, the eval harness and each adapter suite, the
  adapter ones **computed from the directories on disk** so a new host cannot be left out. The
  reason those suites are not in `scripts/gates.mjs` travels with them in `howToVerifyNote`, and
  `runtime/test/tour.test.ts` holds both seams with expectations derived independently of the map's
  own computation, so the two have to agree.

### Added
- **A community's own pack may narrow a capability its org enables, and never widen one**
  (`DECISIONS.md` D113) — the slice D104 recorded as *not shipped with this row*. The org tier is
  where a capability is **enabled**; a pack's `capabilities:` block is an **override**, and the only
  legal override is a narrowing one: narrower is in force and the provenance says `pack`, **equal
  is refused** (it narrows nothing, and an override that does not narrow is a second copy of a
  decision), and wider is refused. Narrowing means **the runtime does less** — under `pull` it
  writes no `ReviewRequested` row and interrupts nobody — and the check's *existence* is a floor no
  shape removes, so a community that narrows accepts only that its cards wait for a human to come
  and look. A pack with no `organisation:` line is its own top tier, and there its own declaration
  is the enabling one. The rule is enforced at **two doors**: the validator (`PKG-66` the shape,
  `PKG-67` the direction), which is the gate a fork's CI runs, and the runtime, which refuses a
  pack someone booted without CI.
- **The hosted product's copy of this runtime becomes checkable** (`DECISIONS.md` D112) —
  `scripts/runtime-digest.mjs` prints one deterministic, **path-independent** `sha256` over the
  shippable runtime, so a host that vendors this runtime by copy can *prove* which copy it runs:
  two digests are either the same string or they are not. The hazard it closes is written up in
  `community/OSS-PARITY-2026-10-23.md`: the open-source project **cannot vouch for what the hosted
  product runs**, because the comparison needs both trees and only one is visible from here. A
  digest proves equality, never provenance — and the comparison stays one-sided until the hosted
  product records its own digest, which is the owner's call.
- **The community can now say what the fleet may do** (`DECISIONS.md` D104) — an operator's manifest gains
  a `capabilities:` block: each capability says **why** it is on, and the human check's **existence** is a
  floor with no off switch — writing one is refused with that reason. The seat that answers is **resolved**
  from the community's declared seat set, never written into the manifest: a seat written twice is a seat
  that drifts, and the MCP adapter's own test caught exactly that. Its *shape* is configurable, and it is not decoration: under `push` a card that needs a human
  also writes a `ReviewRequested` row for a host to notify, and under `pull` it does not. The vocabulary
  grows only with enforcement, so a capability the runtime could merely read back is not a capability.
- **The phase field leaves the runtime** (`DECISIONS.md` D101) — the lane is the action class and the
  schedule is a `when:` on the plan, so a card that is drafted and waiting is no longer filed under a
  phase called `live`. The refusal that mattered — a human-gated action may not be scheduled on a clock —
  moves to the action class, where it belongs.
- **One public surface, and one approval surface** (`DECISIONS.md` D102, D103) — MCP is what a user and a
  contributor depend on, the reference CLI is the operator's plumbing, and a human approves in the
  dashboard (or the host's CLI for a headless operator) and never through a model-reachable tool. The
  attestation mechanism that proves a human was there is still the owner's open question, and this does
  not pretend otherwise.
- **The transports are decided, and the WhatsApp lane is split** (`DECISIONS.md` D105, D106, D107) —
  WhatsApp, Telegram and Discord ship as opt-in adapter packages on the community's own credentials,
  with a generic webhook beside them as the escape hatch, and the agent's role is the community
  manager's on every one of them: read, draft, escalate, send only after a human approves. WhatsApp
  sends to **individuals** — free-form inside the 24-hour window, an approved template outside it — and
  **group posting stays a human's paste**, so D11's public claim is narrowed rather than reversed.
- **Shadow mode is retired** (`DECISIONS.md` D111) — the first event runs in production, with a named
  human approving every send. The approval floor did not move; what ended is the posture in which the
  fleet only drafted and a human pasted. D9 — the dated event — is still the only thing that starts it.
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
- **The community walkthrough lives with the host that runs it, and the host's README is now checked
  against the CLI it ships** (`DECISIONS.md` D97) — the README rewrite moved the walkthrough to
  `adapters/reference/README.md` and the move did not happen, and nothing caught it. The check reads the
  commands out of the CLI and requires every one of them to be shown in a code block; it found three
  (`tick`, `draft`, `digest`) that had never been shown. The same pass found that **a redacted log
  carries every drafted message** — for a live session, the join link and its passcode — so the
  sharing promise now says so.
- **The deciding actor is resolved, not typed** (`DECISIONS.md` D100) — `kinship_approve` took the
  actor from a `by` argument and defaulted it to the literal `organiser`, so the runtime's seat check
  could not act as a gate on who decided; the reference host hardcoded the same name at both
  deciding-actor call sites. The seat now comes from the community's
  own declaration (spec section 1.11), the `by` parameter is out of the tool schema, and a call that
  still carries a mismatched seat is refused loudly. A community whose seat is named differently could
  not be approved at all before this — the seat is a role, not a password. Three tests fail when the fix
  is reverted, and an adversarial pass over the diff is what found three sentences of mine that
  did not survive being checked.
- **The merge rule is decided, and the record now says what happened** (`DECISIONS.md` D98) — the
  **gates are the review**: the CI jobs are required, no human review is required (there is no second
  human to require one from), and `enforce_admins` is on, so the rules bind the owner as well. The list
  of required checks is **derived from the workflow**, not typed. Fourteen pull requests merged today with
  zero approving reviews; that is now a dated row rather than a reflog entry.
- **The README is a front door again** (`DECISIONS.md` D96) — 444 lines and 3,959 words became 160
  and 1,131: what it is, one command to run it, a table of routes, what it enforces, what it does
  not do, and a table of pointers to everything else. The long walkthrough moved to the reference
  host's own README.
- **The release is a pre-flight that refuses** (`DECISIONS.md` D95) — `scripts/release.mjs` stands
  between a working tree and a published package, and refuses on a dirty tree, an **unsigned tag**, a
  changelog without the version, a manifest that disagrees with the release, a stale count, or a
  failing gate. The package it builds is the **vendoring promise made mechanical**: the two folders
  an adopter copies, side by side, because the runtime reaches the validator by a relative path.
  The package refuses to be built without its licence.
- **A developer-experience milestone** (`DECISIONS.md` D94) — **`runtime/src/index.ts` is the public
  surface** (one file, and the tour goes through it), **`runtime/examples/one-complete-example.ts` is
  the example an adopter copies** (it imports only that surface, and the vendoring check runs it from
  outside this repository), **`scripts/quickstart.mjs` is one command** that ends in a card, a human's
  decision, a refused publish, a verified log and a redacted copy, and **`adapters/mcp/README.md` now
  carries the client configuration and a captured exchange** from a real server. The vendoring check
  also grew a second half: the same folders, taken from the newest **release tag**, run standalone.
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
- **The runtime has a publishable package, and the artefact is now what D73 said it should be**
  (`DECISIONS.md` D73) — the published entry point is **compiled ESM plus `.d.ts`**, and the package
  carries the code the runtime actually reaches and nothing else: no test files, no TypeScript
  sources, no gates. **THE EARLIER ENTRY IN THIS SECTION SAID THE RUNTIME "SHIPS TO NPM", AND IT
  DOES NOT: `npm view kinship-runtime` answers 404.** The package was never published, and it was
  never built — the artefact was the raw `runtime/` folder, whose entry point was a `.ts` file and
  which carried 36 test files with it. **Publishing needs two credentials this repository does not
  have: a signed tag and an npm publish token** — the pre-flight now refuses without the compiler
  and names the exact command, and the publish itself is one command once those two exist.
  Vendoring by copy stays a documented path, and D73's *"the name is checked and free"* is still true
  today — **until it is published, at which point the name is taken**.
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
- **What "production-ready" promises, and what it does not** (`DECISIONS.md` D109) — the project promises
  the software (releases, migrations, the log format, the gate); the operator staffs their own community.
  `SECURITY.md` promised a little of both at once, which is the worst of the two.
- **The event template's required fields are the runtime's refusals** (`DECISIONS.md` D110) — a template is
  the plan file in a form a human fills in, and every field it asks for is a refusal the runtime would
  otherwise raise, so filling it in makes the refusals impossible to hit by accident.
- **The log's format is the community's; the log's vocabulary is not** (`DECISIONS.md` D108) — a community
  chooses the fields and the store; the event vocabulary stays the project's, because the log is the
  audit trail and two communities with different vocabularies would have logs no tool could read together.

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
