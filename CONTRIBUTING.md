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
[`packs/kopdar-ops/README.md`](packs/kopdar-ops/README.md) — it lists the four things a fork may not change and
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
3. Run the gates:

```bash
# shape gate
node scripts/validate-pack.mjs packs/kopdar-ops

# validator contract tests
node --test scripts/validate-pack.test.mjs

# runtime semantics tests
cd runtime && node --test test/*.test.ts
```

4. Open a PR. The PR template asks for:
   - What rule this changes and why
   - The `DECISIONS.md` row if this is a decision change
   - The failing test first

## Reporting issues

Please report security issues via `SECURITY.md` — do not open a public issue. For bugs and feature requests, open an issue describing what the code *does* vs what the spec *requires*.

## What is not open for contribution (yet)

- The `design-thinking/`, `research/`, and `community/` directories are evidence layers. They are corrected by new rows in `DECISIONS.md`, not by edits.
- The `pilots/shadow-mode/` kit is for the owner's own use until the phase-2 gate opens.
- The `evals/promptfoo/` cases are written and unrun. They belong to the eval harness that does not exist yet.
