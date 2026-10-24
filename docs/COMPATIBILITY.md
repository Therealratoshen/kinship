# Compatibility — what this repository promises, and where the promise is checked

Read against the tree on **2026-10-24**. Every number below is checked by
`scripts/onramp.test.mjs`, which reads this file *and* the code and fails the build if the two
disagree. A version in a table is a claim; the code settles it.

| Thing | What the repository states today | Where it is checked |
|---|---|---|
| **Node** | support promise `>=23`; CI gates Node 23 and 24; technical floor **22.18** | `runtime/package.json` (`engines.node`) · `.github/workflows/test.yml` (the matrix) · `scripts/gates.mjs` (`NODE_FLOOR`) |
| **Pack schema** | `kinship/v1` | `packs/kopdar-ops/.kinship.yaml` (`schema:`) · `scripts/validate-pack.mjs` (`SCHEMA`) · `runtime/src/pack.ts` (the boot check) |
| **Log format** | version **2** | `adapters/reference/src/store.ts` (`FORMAT_VERSION`) |
| **Refusal codes** | a closed set of **34** codes, grown only by a dated row | `runtime/src/errors.ts` (`REFUSAL_CODES`) |

## The node row is three numbers, because it answers three questions

- **The support promise** is `>=23`. `runtime/package.json` declares it, and CI gates every major
  in it — a claim CI does not test is a claim that rots.
- **The technical floor** is **22.18**, and it is lower. The runtime is TypeScript that node runs
  by *stripping the types*, and node turned that on by default in 22.18; below it the repository
  genuinely cannot run. `scripts/gates.mjs` checks this before any gate runs, and prints a plain
  sentence rather than letting a contributor meet a `SyntaxError` pointed at a type annotation.
- **The gap between them, stated rather than smoothed over:** a node from 22.18 up to 23 runs this
  repository fine, and the gate says so out loud — *"the declared range is a support promise, not a
  technical floor"* — and carries on. The promise is narrower than the floor, and that is a
  choice, not a contradiction: the floor is where the code stops working, and the promise is what
  the maintainer will answer questions about. A reader who wants to know *will it run* wants 22.18;
  a reader who wants to know *will I get help* wants 23.

## What happens on a mismatch

- **Pack schema.** A pack whose `.kinship.yaml` declares any other schema is refused with
  `pack_invalid` — first by `scripts/validate-pack.mjs`, and again by `runtime/src/pack.ts` at
  boot, so no reading path can parse a pack that has not passed the gate.
- **Log format.** A manifest whose `formatVersion` is *higher* than the host's `FORMAT_VERSION` is
  **refused, never clamped** — the D35 rule, applied to a file format. A lower version is read as
  it is, and the rows that no longer replay against this build are a migration, not a guess.
- **Refusal codes.** The set is closed: a code that is neither raised in `runtime/src/` nor
  declared as debt in `UNIMPLEMENTED_REFUSAL_CODES` fails `runtime/test/errors.test.ts`. It grows
  only by a **dated row in `DECISIONS.md`** — a code is part of the audit vocabulary, and renaming
  one is a versioned event, not an edit. The size is stated above because a closed set's size is a
  fact a reader can check.

## What this file does not promise

It says what the repository *states*. It does not say that a deployed system honours any of it:
no transport ships (D21), so the proof that a governance layer holds in the field waits for
phase 2. `spec/HOST-CONTRACT.md` names the four seams a host owns, and what Kinship checks
afterwards.
