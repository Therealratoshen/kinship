# Contributing to Kinship

Kinship is open source. Contributions are welcome.

## How changes flow

The governance rules in this repo are **append-only for decisions, frozen for evidence**. That means:

- **A decision is a row in `DECISIONS.md`**, not an edit. To change a decision, add a new dated row — do not rewrite the existing one.
- **Research is frozen once written.** Evidence lives in `design-thinking/`, `research/`, and `community/`. Corrections go into a new dated row in `DECISIONS.md`.
- **Spec changes** follow the same rule: the spec lives at `spec/GOVERNANCE-SPEC-OUTLINE.md`. A material change requires a `DECISIONS.md` row explaining why.

This is intentional. The changelog is the audit trail.

## What to contribute

The `runtime/` is built test-first (TDD). See `runtime/test/` for the test suite. A new spec rule without a failing test first is a draft — not merged.

The `scripts/validate-pack.mjs` and its contract test (`scripts/validate-pack.test.mjs`) gate the pack format. A validator rule needs both a failing case and a passing case.

The pack at `packs/kopdar-ops/` is the seed forkable example. It is not the product. Start with
[`packs/kopdar-ops/README.md`](packs/kopdar-ops/README.md) — it lists the five things a fork may not change and
the three tamper cases already testing that.

## Find what to contribute (including with an AI agent)

Run the on-ramp. It computes, from the repo itself — not from prose that can go stale — which
governance guarantees hold right now, the runtime test files and counts, the `src` modules that have
no dedicated test yet, the intentional seam, and what is gated by design:

```bash
node runtime/tour.ts --json
```

The honest move: pick an item, **write the failing test first**, implement, open a PR. Do **not** open
a PR for anything listed under `gatedByDesign` — those refusals are the product.

## Pull requests

1. Fork the repo.
2. Make your change.
3. Run the gates — all four, or one at a time:

```bash
node scripts/gates.mjs

# shape gate
node scripts/validate-pack.mjs packs/kopdar-ops

# validator contract tests + the check that these instructions match CI
node --test scripts/*.test.mjs

# runtime semantics tests
node --test runtime/test/*.test.ts

# the tour — CI runs it, so it is a gate, not a demo
node runtime/tour.ts
```

Four gates, not a smaller number. The list lives in `scripts/gates.mjs`; `scripts/gates.test.mjs`
(which gate 2 runs) fails if a contributor-facing doc stops printing it, so a new gate is added in
one place and the test tells you which files then have to change.

The tour drives the real `kopdar-ops` pack and self-checks every governance
guarantee it demonstrates; it exits non-zero if one stops holding, and CI fails on that exit code. A
change that passes the tests and breaks the tour is a change that broke a promise the README makes.

Three `scripts/` files do the same job one level up — over the repo's claims about itself rather than
over the runtime's behaviour: `validate-pack.test.mjs` proves the validator can actually reject a
tampered pack (67 cases, the newest of them the sanction-ladder cases — each with a passing *and* a
failing control), `gates.test.mjs` proves the four
commands above are the commands CI runs *and* the commands these docs, `README.md`, `AGENTS.md`, and
the tour's own `--json` map print — and, since the decision log was found rendering as literal text
after its eighteenth row, also proves that every markdown table in the repository has its header
attached to its rows, and `claims.test.mjs` proves the claim ceiling (PRD §2.3, FR-4.4)
is enforced where the copy actually is — the root `README.md` and a pack's own `README.md` included —
and that the banned list still matches the documents it claims to enforce.

Inside the runtime suite, three files are gates over the repo's own claims rather than over
behaviour: `imports.test.ts` (every `src` module imports the `types.ts` names it actually uses — the
hole that let `shatter.ts` ship an unimported `Ctx` past a green suite), `types.test.ts` (the phase
sequence, the erasable-syntax rule that lets the runtime run without a compiler, and the import
specifier gate — node's type stripping never *checks* types, so this is the stand-in for `tsc`), and
`errors.test.ts` (every refusal code is either raised in `src/` or declared as debt in
`UNIMPLEMENTED_REFUSAL_CODES`, nothing listed is silently enforced, and that list cannot contain a
duplicated key). If you add a refusal code or a `types.ts` name, one of those three will make you say
what it is. Each carries a positive control — a scanner that cannot fail is decoration.

4. Open a PR. The PR template asks for:
   - What rule this changes and why
   - The `DECISIONS.md` row if this is a decision change
   - The failing test first

## Reporting issues

Please report security issues via `SECURITY.md` — do not open a public issue. For bugs and feature requests, open an issue describing what the code *does* vs what the spec *requires*. For a conduct report, use [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — and note what it says plainly: this repo has one maintainer, so a report about the maintainer has no independent arbiter here.

Before proposing a capability, check [ROADMAP.md](ROADMAP.md). It lists what is not complete *and* who is allowed to decide it; several refusals are enforced by the validator, so a PR against an undecided spec question fails a gate rather than a preference.

## What is not open for contribution (yet)

- The `design-thinking/`, `research/`, and `community/` directories are evidence layers. They are corrected by new rows in `DECISIONS.md`, not by edits.
- The `pilots/shadow-mode/` kit is for the owner's own use until the phase-2 gate opens.
- The `evals/promptfoo/` cases are written and unrun **by promptfoo** — no provider is wired to it. The
  harness that runs them now is `node evals/harness.mjs`: node-only, install-free, and deliberately
  not one of the four gates (a gate list that grows is a doc that drifts — D24).
