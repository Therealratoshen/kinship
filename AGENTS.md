# Kinship — agent instructions

**Read this first, in this order:** goal → spec → the pack you are touching → the invariant that gates your change.

## Goal

An open-source, self-hosted **supervised** fleet that runs the operational work of a
community — event lifecycle, reminders, recaps — while a named human holds approval and veto
over anything member-facing. The fleet proposes. The organiser approves. Every action is
logged and replayable.

Kinship's home is the spec and the pack format; the executable code is the pack validator + its
contract test, and `runtime/` — the governance core built 2026-10-17 per `DECISIONS.md` D21
(165 tests across 20 files as of 2026-10-18 — recount with `node runtime/tour.ts --json`; zero
dependencies, **no channel transport**: every member-facing commit refuses `no_transport`). Phase 1 (shadow mode) still starts when the owner writes a dated event as `D9`
in `DECISIONS.md`; the runtime does not change that — it sends nothing by construction.

## The three invariants

1. **Draft-only is the default, and `never` means absent.** Every member-facing action class
   starts at `draft`. An action class set to `never` must have no implementing tool to call —
   a reviewer must be able to grep the tool list and find nothing, not find a denied call.
   Escalation is per **action class**, never per agent, and only ever as far as the evidence
   in the governance spec licenses.
2. **The control plane is the product; the runtime is a commodity.** Kinship owns the autonomy
   ladder, the event-lifecycle state machine, the grant taxonomy, identity disclosure,
   stranger-input containment, and the replayable audit trail. It does not own model routing,
   memory storage, trace storage, evals, or an orchestration framework — those are wrapped or
   bought (`DECISIONS.md` D12, `research/AGENT-GOVERNANCE-LANDSCAPE-2026-10-17.md` §4).
3. **A claim may not outrun its evidence.** External products are described only from a primary
   source, dated, in the evidence ledger (`PRD … §2.2`) or the `research/` files. Forbidden in
   any copy: hours-saved figures, TAM, community sizes, "runs itself", "fully autonomous",
   "we invented approvals", and any price that was not read from the vendor on the day it was
   printed. Where a claim is corrected, the correction is a new dated row — history is not
   rewritten.

## Where the durable rules live

| File | What it governs |
|---|---|
| `rules/governance-invariants.mdc` | The autonomy ladder, grants, budgets, disclosure — read before touching `spec/` or a pack's `autonomy_by_class` |
| `rules/pack-format.mdc` | The directory shape, namespaced keys, and what the validator enforces — read before touching `packs/` or `scripts/` |
| `spec/GOVERNANCE-SPEC-OUTLINE.md` | The semantics an implementer builds to |
| `packs/kopdar-ops/README.md` | The fork on-ramp: what a fork may not change, and the eight `needs` boot refuses without |
| `DECISIONS.md` | Who decided what, when, and how reversible it is. Append-only. |
| `SECURITY.md` | How to report a vulnerability. Not a public issue. |

`rules/*.mdc` is a **convention, not an auto-loaded mechanism** — nothing here consumes the extension yet.

## Running what exists

```bash
node scripts/gates.mjs                              # all four gates below, in order; CI runs exactly this line

node scripts/validate-pack.mjs packs/kopdar-ops     # shape gate (54 PKG-* rules), no install step
node --test scripts/*.test.mjs                      # validator contracts (29 cases incl. tamper) + the gate-list drift check
node --test runtime/test/*.test.ts                  # the governance semantics as tests (count: tour --json)
node runtime/tour.ts                                # drive the real pack; self-checks every guarantee, exits non-zero if one breaks
node runtime/tour.ts --json                         # machine-readable contribution map (for agents / first PRs)
```

`scripts/gates.mjs` is the list; `scripts/gates.test.mjs` fails if a doc drifts from it — so if you
add a gate, add it there and the test tells you which files then have to say so.

The validator proves **structure**: it can show a moderator declares no mutating tool and
that `whatsapp | send` is absent. The `runtime/` proves **semantics**: suppression beats a live
grant, an edited approval goes stale, a tampered fork-pack refuses to boot, replay reproduces
state exactly. Neither proves a *deployed* system honours any of it — no transport ships (D21),
so that proof waits for phase 2, behind the shadow-mode gate.

## Changing something

`design-thinking/` is frozen (it is the citation source) — correct it with a dated `DECISIONS.md` row, never an
edit; `PRD … §14` takes a changelog row for any substantive edit. If a check cannot run here, say which one.
