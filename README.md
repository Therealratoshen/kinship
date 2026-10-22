# Kinship

[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Governance Gates](https://github.com/Therealratoshen/kinship/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Therealratoshen/kinship/actions/workflows/test.yml?query=branch%3Amain)

> **The fleet proposes. The organiser approves. Every action is logged and replayable.**

Kinship is an open-source **supervised AI-agent fleet** for community operations — event lifecycle, reminders, RSVP, recaps, and moderation — with a governance control plane that enforces what an agent is allowed to do to a person.

```
The fleet cannot send anything until a human approves.
No channel transport ships in this repo — that is by design.
```

## What makes this different from a workflow canvas

n8n, CrewAI, LangGraph, and every other AI workflow tool compose *actions*. None of them has an opinion about which action may reach a stranger without a human signing for it first.

Kinship is a **control plane**, not a runtime. It owns:

- **Autonomy ladder** — every action class starts at `draft`, never at `auto`
- **Grant taxonomy** — `allow_once` / `allow_always` (named scope required) / instant revocation
- **Revision-bound approvals** — an edited draft invalidates the previous approval
- **Member protections** — suppression beats any grant, quiet hours are the member's clock, 2/24h cap
- **Identity disclosure** — bilingual canonical line, mandatory, not a setting
- **Stranger-input containment** — member text never enters the audit log
- **Replayable audit trail** — replay reproduces state exactly

These rules are enforced by tested code, not by prose.

## Try it now

```bash
# Clone and run — zero install step
git clone https://github.com/Therealratoshen/kinship.git
cd kinship

# All four gates, in one command. CI runs exactly this line.
node scripts/gates.mjs

# Or one at a time, from the repo root — the list lives in scripts/gates.mjs, and
# scripts/gates.test.mjs fails the build if a doc below drifts from it:
node scripts/validate-pack.mjs packs/kopdar-ops   # shape: does the pack obey the invariants?
node --test scripts/*.test.mjs                    # contracts: can the pack — or these docs — drift silently?
node --test runtime/test/*.test.ts                # semantics: do the rules actually work? (recount: runtime/tour.ts --json)
node runtime/tour.ts                              # the pack, driven live: drafts, approves, then refuses to send (D21)
# → the audit trail, live. Add --json for the machine-readable contribution map.
```

Node ≥ 23. No npm. No build step.

### …and end in a file you can hand a reviewer

The gates above end in printed guarantees. The **reference host** ends in an artefact:

```bash
# The host is its own package, and its one dependency is a local path — this creates a symlink
# and fetches nothing (`--offline` works too).
cd adapters/reference && npm install --no-audit --no-fund && cd ../..

# Copy the answers template and fill in your community's eight answers. The file is gitignored.
cp packs/kopdar-ops/pack.local.example.yaml packs/kopdar-ops/pack.local.yaml
$EDITOR packs/kopdar-ops/pack.local.yaml

# Boot, draft something, and read back what was written.
node adapters/reference/src/host.ts run    --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
node adapters/reference/src/host.ts draft  --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs \
  --class draft.reminder --agent event-ops \
  --text-id "Reminder: tomorrow 19:00" --text-en "Reminder: tomorrow 19:00"
node adapters/reference/src/host.ts verify --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
```

Two files appear under `logs/<pack-key>/`:

```
logs/kinshipai/bundled/event-ops/kopdar/events.jsonl     # one LoggedEvent per line — replay's exact input
logs/kinshipai/bundled/event-ops/kopdar/manifest.json    # the cover: what a reader needs to know first
```

The host **sends nothing** — every member-facing commit still refuses `no_transport` (D21). What you
get is the artefact phase 1 is for: *"here is what the fleet drafted and what it refused, in a file you
can hand a reviewer."* The cover states the privacy posture in the file itself — member identifiers
are in it, member **message text** is not, and the draft copy is — and carries a digest of the
answers rather than their values, so a log that travels carries no second person's name.

## What ships vs what is gated

**Ships now** (tested, in this repo):
- The governance spec (`spec/GOVERNANCE-SPEC-OUTLINE.md`)
- The seed pack (`packs/kopdar-ops/`) — start at [its README](packs/kopdar-ops/README.md), fork it and adapt it
- The validator and its 51-case tamper-resistant contract test (60 distinct `PKG-*` rules; recount: `grep -o "'PKG-[0-9N]*'" scripts/validate-pack.mjs | sort -u | wc -l`), plus `scripts/gates.mjs` — one
  command for the four CI gates, and a test that fails if the documented list drifts from what CI runs,
  or if any markdown table in the repository loses the header that gives its rows meaning
- The runtime library (`runtime/`) — refusing, logging, replaying, metering a run, no sending
- The sanction ladder (`sanction_ladder:` in a pack, spec §2.12 / PRD FR-5.11, `DECISIONS.md` D37) — a community
  may write down the graduated consequences it applies, each rung naming a human seat and what the member is
  told, and the fleet still cannot carry one out: no `moderation.sanction` class, no tool, and `PKG-63` refuses
  any rung whose `via:` matches a declared tool. Deleting the key is legal; a default ladder is never supplied
- The tier above the pack (`orgs/kinshipai.yaml`) — org **floors** and an **autonomy ceiling** resolved org →
  pack with **refuse, never clamp**: an operator can reject a pack that goes below a floor or fill a blank the
  pack left, and cannot rewrite a number a community declared (spec §1.10 / PRD FR-1.18)
- **A reference host** (`adapters/reference/`) — it owns the clock, the store and the printing, and it **sends
  nothing**: no transport, so every member-facing commit still refuses `no_transport` (D21). It boots the pack
  (or continues its own log on restart), writes `events.jsonl` + `manifest.json`, and verifies what it wrote
- **An Indonesian on-ramp** — `packs/kopdar-ops/README.id.md` is the pack's own onboarding doc in Indonesian,
  and `packs/kopdar-ops/pack.local.example.yaml` explains the eight answers in Indonesian. The English file
  stays the source of truth and carries the pointer; a translation is a copy, and a copy needs a pointer and a date
- **A persisted log that can be verified** — `Fleet.verifyLog` (pure read, in `runtime/`): the rows must be dense
  in `seq`, they must fold, and the state they fold to must be the state the fleet holds. The file carries a
  **digest** of the `needs:` answers, never their values — one of them is a named human (spec/HOST-CONTRACT.md
  seam 3; PRD FR-4.4, `DECISIONS.md` D48)
- The claim ceiling (PRD §2.3, FR-4.4) — the banned strings are code (`scripts/claim-scan.mjs`) rather than a
  comment, the sweep reaches the copy that actually ships (the root `README.md` and a pack's own `README.md`
  included), and `scripts/claims.test.mjs` fails if a forbidden cell in the PRD is neither enforced nor named as
  a rule no sweep can enforce

**Gated behind shadow-mode measurement:**
- Any channel transport (WhatsApp, Telegram, email, Discord)
- Any claim that the fleet "reduces organiser load"

The gating mechanism is real: every member-facing commit refuses with `no_transport` and leaves its one-send authorization intact for manual hand-off.

## The governance spec

`spec/GOVERNANCE-SPEC-OUTLINE.md` is the publishable artifact. It covers the autonomy ladder, grant taxonomy, audit replay, event-lifecycle state machine, member protections, disclosure, stranger-input containment, shatter-guard, cross-community promotion, settings resolution across the org/pack tiers, and the human seat set. Part 6 maps every spec rule to its runtime file and test.

## For community operators

The [PRD](PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md) and [execution plan](PLAN.md) cover the full product case. The [design-thinking folder](design-thinking/) documents the research that produced the spec. The [CONTRIBUTING.md](CONTRIBUTING.md) explains the append-only decision rule and how to contribute.

Read **[ROADMAP.md](ROADMAP.md) before opening a feature PR**: it lists what is *not* complete, and for each
gap says whether a contributor can close it or it is an owner decision. Contributor behaviour is governed by
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (Contributor Covenant 3.0, adopted 2026-10-19); its reporting channel
is the private security-advisory form, because this repo has one maintainer and no other private path yet —
that limitation is written into the file rather than papered over.

## Product surface

This repository is the whole product today: an open-source, self-hosted control plane under MIT, with no
paid tier, no hosted instance and no feature held back.

The plan is for the hosted surface to live under **ShortcutSistem** at
[shortcutsistem.com](https://shortcutsistem.com), Kinship's parent product. Stated plainly so the sentence
can't be read as a promise it doesn't keep: **that domain does not describe Kinship today, and nothing is
hosted there.** What exists is the code in this repo.

Three commitments make the OSS/hosted boundary survivable (`DECISIONS.md` **D19**, written before the
product existed because that is the only cheap time to make them):

1. **Self-hosted parity** — nothing in this repo may become a crippled demo of the hosted product. The
   governance layer stays here, in full, because it is the product.
2. **No silent flip** — any change to the license or the OSS/hosted boundary goes through a dated
   `DECISIONS.md` row *before* this repository changes. If you ever see a boundary move without one, that
   is the repo breaking its own rule, and it is a bug worth reporting.
3. **No funnel** — this repo is the product's control plane, not its advertisement. It will not be
   restructured to push readers toward a hosted sign-up.

The reason those three are here rather than in a footnote: the failure mode is documented, not
speculated. HashiCorp→OpenTofu and Redis→Valkey are the license flip and its fork; MinIO's 2025
community-edition UI removal drew the reply *"It's not a feature issue, it's a trust one."* A governance
pitch that rests on honesty is the one asset a silent flip destroys in a single news cycle
(`research/OSS-AUTONOMY-FAILURES-2026-10-17.md` patterns 5–7).

## License

MIT. See [LICENSE](LICENSE).

One honest caveat while PRD §12-**Q4** stays the owner's open decision: MIT is what these files and this
README already state, and Q4 is where it becomes a ratified commitment rather than a working default. The
reasoning is written up as a question with a recommendation in
[LICENSE-MEMO-2026-10-18.md](LICENSE-MEMO-2026-10-18.md), not as a decision.
