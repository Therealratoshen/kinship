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
- [ ] PRD §14 changelog row (if a requirement, claim, or scope line moved)
- [ ] `spec/GOVERNANCE-SPEC-OUTLINE.md` (if a semantic changed)
- [ ] `research/` snapshot (dated, primary-sourced, or it does not merge)

## Invariant check

Run both and paste the output. `node` only, no install step.

```
node scripts/validate-pack.mjs packs/kopdar-ops
node --test scripts/validate-pack.test.mjs
```

- [ ] Neither tool list contains a mutating moderation action or `whatsapp | send`
- [ ] No new member-facing claim outruns the evidence ledger (no hours-saved, TAM, size, price
      without a same-day primary read, or "runs itself")
- [ ] Any corrected external claim keeps its wrong version visible in a dated row

## Remaining risk, stated

<!-- What this PR does not prove. Required even for a docs-only change. -->
