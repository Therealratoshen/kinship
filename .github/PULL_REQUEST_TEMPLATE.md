<!-- Delete nothing in this template. An empty section is a failed check, not a skipped one. -->

## Thinking path

<!-- ≥3 traced steps, top of project → subsystem → problem → this change. Kills drive-by PRs. -->

1.
2.
3.

## Model Used

<!-- Required. Provider, exact model id, context window, reasoning mode, tool use.
     "None — human-authored" is a valid answer; a blank one is not. -->

-

## What this changes, and which artifact owns it

- [ ] `DECISIONS.md` row added (if any decision is made, reversed, or narrowed)
- [ ] PRD section 14 changelog row (if a requirement, claim, or scope line moved)
- [ ] `spec/GOVERNANCE-SPEC-OUTLINE.md` (if a semantic changed)
- [ ] `research/` snapshot (dated, primary-sourced, or it does not merge)

## Invariant check

Run all four gates. `node` only, no install step. One command does the list:

```
node scripts/gates.mjs
```

**CI runs the same four gates on the same commit, so link the run rather than pasting its output** —
a paste is a copy nobody re-reads, and a copy of a gate result is a claim. If a gate fails, the run
says so and the failing line is the first thing to fix.

Or gate by gate — the list is defined in `scripts/gates.mjs`, and a test in gate 2 fails if this file
stops matching it:

```
node scripts/validate-pack.mjs packs/kopdar-ops
node --test scripts/*.test.mjs
node --test runtime/test/*.test.ts
node runtime/tour.ts
```

The last is not a demo. CI runs the tour and fails on its exit code, because the tour self-checks
every governance guarantee the README claims. Passing the tests while breaking the tour is a broken
promise, not a green build.

- [ ] Neither tool list contains a mutating moderation action or `whatsapp | send`
- [ ] No new member-facing claim outruns the evidence ledger (no hours-saved, TAM, size, price
      without a same-day primary read, or "runs itself")
- [ ] Any corrected external claim keeps its wrong version visible in a dated row

## Human review

<!-- The AI-assisted disclosure above records what wrote the code. This records who is accountable
     for it. AI-assisted work is welcome and expected in this repository — `AGENTS.md` is written
     for it — but the human who merges it owns it. -->

- [ ] A human read this diff and takes responsibility for it
- [ ] If any part was AI-generated, it was reviewed line by line, not skimmed
- [ ] Nothing here was copied from a source without recording the source and its licence
      (`DECISIONS.md` rows, or a dated note in the PR)

## Remaining risk, stated

<!-- What this PR does not prove. Required even for a docs-only change. -->
