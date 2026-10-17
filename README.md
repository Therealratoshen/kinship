# Kinship

**Status: the control-plane core is built and tested (2026-10-17, `DECISIONS.md` D21) — and it cannot send anything: no channel transport ships. Phase 1 (shadow mode) still starts when the next real event date is picked.**

Kinship is an open-source platform where a managed fleet of specialised AI agents runs the
operational work of a community — engagement, moderation, onboarding, and online/offline
events — while the organiser keeps approval and veto over anything member-facing.

It began as a **research and specification repository**, and the ordering stayed deliberate:
the design-thinking gate (`design-thinking/06-final-gate.md`) returned a *conditional* GO, and
the condition is a measurement, not a build. The code that now exists (2026-10-17) is the
governance core the spec describes — `runtime/`, which can refuse, log, and replay, but not
deliver. "Phase 1 sends nothing" is structural in the code, not only in the plan.

> **The fleet proposes. The organiser approves. Every action is logged and replayable.**

## The architecture sentence

**Kinship is a control plane, not a runtime.** It owns the decisions about *what an agent is
allowed to do to a person*: the autonomy ladder per action class, the event-lifecycle state
machine, the grant taxonomy (once / always-with-named-scope / deny), identity disclosure,
stranger-input containment, and a replayable audit trail. It does not own model routing, memory
storage, trace storage, an eval harness, or an orchestration framework — those are wrapped or
adopted, and `DECISIONS.md` D12 names the products rather than a category.

That split is the answer to **"why not n8n"** (and CrewAI, and LangGraph, and any workflow
canvas): those tools compose *actions*, and none of them has an opinion about which action may
reach a stranger without a human signing for it. n8n's canvas is already good, already free, and
already in the owner's stack — competing with it on canvas terms loses. A governance plane
composes *on top of* it, which is why the pack format is declarative, why the autonomy level is
a property of the action class rather than the node, and why the executable code in this repo is
exactly two things: a validator that refuses a pack whose tool list contains a mutating
moderation action, and a `runtime/` that makes the spec's refusals testable — and ships no
transport.

## Product surface — what is open source, and where the product lives

**This repository is open source now. The hosted product will live at [shortcutsistem.com](https://shortcutsistem.com).**
Both statements are part of one commitment, written here on 2026-10-17 while nothing exists to break yet
(`DECISIONS.md` D19):

- **This repo** — the spec, the pack format, the validator, the evals, the pilot kit — is the product's
  control plane. Fork it, self-host it, run a community with it. No account, no managed dependency, and
  the validator runs offline with zero install steps.
- **shortcutsistem.com** — the hosted product. It will run packs from this repo and is a way to use it,
  not a requirement to use it. It is *part of the product*, and it is not this repository.
- **Self-hosted parity:** nothing in the OSS repo may be a crippled demo of the hosted product. If any
  capability ever exists only in the hosted product, that boundary is named **in this section on the day
  it changes**, with a dated `DECISIONS.md` row — never discovered by the community later.

That last bullet is not boilerplate; it is the three named ways this posture dies, all documented in
`research/OSS-AUTONOMY-FAILURES-2026-10-17.md`: the license flip the community funds and then loses
(HashiCorp→OpenTofu, Redis→Valkey), the free tier strangled to push the paid one (MinIO's 2025 UI removal —
their own issue tracker said *"It's not a feature issue, it's a trust one"*), and the OSS repo that quietly
becomes a funnel for a rebranded closed product (GPT-Engineer→Lovable). The license itself (Q4) is still
the owner's call, which is exactly why the disclosure discipline above matters more than the license text.

## Repository map

| Path | What it is | Live or frozen |
|---|---|---|
| `PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md` | Living PRD. Requirements, evidence ledger, rollout phases. | **Live** — edit + changelog row |
| `DECISIONS.md` | Dated decision log. Contradicting an entry requires a new dated entry, never an edit. | **Live** — append only |
| `PLAN.md` | 90-day execution plan, weekly, sized to ~4–5 h/week. | Live — re-plan on evidence |
| `spec/GOVERNANCE-SPEC-OUTLINE.md` | The autonomy ladder + grant taxonomy + audit-replay spec. The publishable OSS artifact. | Live — green-lit now |
| `packs/kopdar-ops/` | Seed squad-pack as a forkable directory: `PACK.md`, `.kinship.yaml`, `agents/*/AGENTS.md`, `skills/*/SKILL.md` (16 skills, 22 action classes, 30 guardrails). | Live |
| `scripts/validate-pack.mjs` + `.test.mjs` | The pack gate and its contract test — the repo's shape gate. | Live |
| `runtime/` | The control-plane core as a tested library (**D21**, 2026-10-17): autonomy ladder, grant taxonomy, revision-bound cards, event lifecycle, budgets, member protections, disclosure, stranger-input containment, shatter-guard, replayable audit, the Fleet engine, and the pack boot gate (a tampered fork refuses to boot). 73 tests across 11 suites, ~2,900 lines, zero dependencies, node ≥ 23, **no channel transport** — every member-facing commit refuses `no_transport` with its one-send authorization intact. Spec section → file map: `spec/GOVERNANCE-SPEC-OUTLINE.md` Part 6. | Live — TDD, spec-traced |
| `evals/promptfoo/` | Five behaviour cases against the draft-only invariant. **Written, not run**: no promptfoo install and no runtime to point at. | Live |
| `research/` | Five dated evidence snapshots: Paperclip OSS study, competitor analysis, agent-governance landscape, community SaaS + bot landscape, and the open-source autonomy failure patterns. Primary-sourced, reversal-visible. | **Dated** — correct by re-read + new row |
| `AGENTS.md`, `rules/`, `SECURITY.md`, `.github/` | Contributor machinery, landed early because it costs nothing pre-code. `rules/*.mdc` is a convention, not auto-loaded — said out loud in `rules/README.md`. | Live |
| `community/` | The member's side of the design: one simulated-lens review, dated, with the four findings that bind in v0 and the one contradiction left open as PRD §12-Q10. **No member has been asked anything.** | **Dated** — replaced by real interviews, not edited |
| `design-thinking/` | Stages 0–5 + final gate + Paperclip lessons. **Evidence base of record.** | **Frozen** — read-only |

## Running what exists

```bash
node scripts/validate-pack.mjs packs/kopdar-ops   # shape gate, node >= 20, no install step
node --test scripts/validate-pack.test.mjs        # 29 cases, incl. tamper cases
cd runtime && node --test test/*.test.ts          # 73 cases — the governance semantics as tests
```

The validator proves **structure**: that a moderator declares no mutating tool,
that `whatsapp | send` is absent rather than denied, that every skill carries a falsifiable
assertion, that a community fork cannot claim `bundled: true`. The `runtime/` proves
**semantics**: a fork's tampered pack refuses to boot, a member's stop beats an `allow always`
grant, an edited approval goes stale, replay reproduces state exactly. What neither proves is
that a *deployed* system running a real transport honours any of it — no transport ships (D21),
so that last mile is still phase 2's, and it is still gated by the shadow-mode measurement.

`design-thinking/` is frozen because it is the citation source for everything above. If a
finding there needs correcting, correct it in a new dated row of `DECISIONS.md` and say so —
do not rewrite history, per the falsified-rows-stay discipline in the PRD.

## What is true, and what is not yet

**Evidenced** (six desk-research passes in `design-thinking/01-research-notes.md`, then four
first-hand/desk snapshots in `research/`): the gap is real — no open-source, event-lifecycle-native,
approval-gated community fleet exists; tool-first cold starts survive and venue-first ones
ghost-town; human-gated delegation is the posture the market has actually paid for.

**Evidenced *against* us, which is the more useful half.** Four claims this repo made were
falsified by its own later research passes, on primary sources, and each one narrowed the wedge
rather than closing it: a WhatsApp *group* automation route does exist (Meta's Groups API — capped
at 8 participants and opt-in gated, so `DECISIONS.md` D11/D13 hold on a re-derived basis, not the
original one); a free Discord bot does run a whole event loop (Apollo, $0–25/mo, so the wedge moves
to the cross-channel chain plus governance plus the bilingual rule); open-source moderation is not
differentiating (Discourse AI ships flag-and-review in GPL core); and budget hard stops, memory,
traces and evals are all commodity (so they are wrapped, not built). What survives all four
corrections is the thing nobody in the scan ships: **per-action-class autonomy with an enumerable,
one-tap-revocable grant, replayable audit, and a disclosure duty that is not a setting.**

**Not evidenced, and the reason phase 1 exists:** zero primary user research. Every empathy
map, quote, and feeling-shift prediction in this repo is **labelled simulated**. Whether an
organiser's felt sense of control actually moves when a supervised fleet runs their event is
unmeasured. The kill condition is pre-committed: no second-event behaviour after four weeks
of real events → return to Define.

## Copy rules (apply to README, landing page, decks, pitches)

From the PRD's claim ceiling — these are not style preferences, they are the difference
between an honest repo and one that gets quoted back at you:

| Allowed | Forbidden |
|---|---|
| "Manage your community agents in one place, with an audit trail" | "Replace your community manager" |
| "You approve, agents do the work" | "Fully autonomous 24/7 management" / "runs itself" |
| "Open source, self-hostable" | Any "saves X hours/week", any TAM, any community-size number |
| "Free, self-hosted, supervised" | "Cheaper than X" — no price of ours exists yet, and theirs moves |
| "The governance layer a single bot or a canvas doesn't give you" | "We run your events / we send your reminders" — free incumbents already do the loop (D16) |
| "Built on patterns proven in engineering fleets" | "We invented approvals / budgets / heartbeats" |

## First commands, in order

1. Pick the target event and date → write it as `D9` in `DECISIONS.md`.
2. Fill `pilots/shadow-mode/EVENT-TEMPLATE.md` for that event, in draft-only mode.
3. Rate the semantic pair in `pilots/shadow-mode/FEELING-DIARY.md` the day before.
4. Nothing else until step 3 has a real number in it.
