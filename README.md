# Kinship

[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

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

# Drive the real pack: it drafts, you approve, then it refuses to send (D21).
node runtime/tour.ts
# → the audit trail, live. Add --json for the machine-readable contribution map.

# Shape gate: does the pack obey the invariants?
node scripts/validate-pack.mjs packs/kopdar-ops

# Contract tests: can the pack be tampered with?
node --test scripts/validate-pack.test.mjs

# Governance semantics: do the rules actually work? (zero deps; recount with `node runtime/tour.ts --json`)
cd runtime && node --test test/*.test.ts
```

Node ≥ 23. No npm. No build step.

## What ships vs what is gated

**Ships now** (tested, in this repo):
- The governance spec (`spec/GOVERNANCE-SPEC-OUTLINE.md`)
- The seed pack (`packs/kopdar-ops/`) — start at [its README](packs/kopdar-ops/README.md), fork it and adapt it
- The validator and its 29-case tamper-resistant contract test
- The runtime library (`runtime/`) — refusing, logging, replaying, metering a run, no sending

**Gated behind shadow-mode measurement:**
- Any channel transport (WhatsApp, Telegram, email, Discord)
- Any claim that the fleet "reduces organiser load"

The gating mechanism is real: every member-facing commit refuses with `no_transport` and leaves its one-send authorization intact for manual hand-off.

## The governance spec

`spec/GOVERNANCE-SPEC-OUTLINE.md` is the publishable artifact. It covers the autonomy ladder, grant taxonomy, audit replay, event-lifecycle state machine, member protections, disclosure, stranger-input containment, shatter-guard, and cross-community promotion. Part 6 maps every spec rule to its runtime file and test.

## For community operators

The [PRD](PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md) and [execution plan](PLAN.md) cover the full product case. The [design-thinking folder](design-thinking/) documents the research that produced the spec. The [CONTRIBUTING.md](CONTRIBUTING.md) explains the append-only decision rule and how to contribute.

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
