# Kinship

<img src="assets/kinship-mark.svg" width="72" height="72" align="right" alt="Kinship — two interlocking rings">

[![Apache-2.0 License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Governance Gates](https://github.com/Therealratoshen/kinship/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Therealratoshen/kinship/actions/workflows/test.yml?query=branch%3Amain)

> **The fleet proposes. The organiser approves. Nothing sends.**

An open-source **supervised AI-agent fleet** for community operations — event lifecycle, reminders,
RSVP, recaps, moderation — with a governance control plane that decides what an agent is allowed to
do to a person, and proves it was decided. **No channel transport ships here**: every member-facing
action stops at `no_transport` until a named human approves it.

n8n, CrewAI and LangGraph compose *actions*. None of them has an opinion about which action may
reach a stranger without a human signing for it first.

## Get it

```bash
git clone https://github.com/Therealratoshen/kinship.git && cd kinship
node runtime/tour.ts
```

One command, no install, no dependencies, no API key. It drives the real pack: the fleet drafts, a
human approves, and the send is refused. It prints four sections; here are the two that matter.

```
Kinship tour — the fleet proposes, the organiser approves, nothing sends.
pack kinshipai/bundled/event-ops/kopdar · zero dependencies

── 2. Draft-only — an attempt is a card, never a message ─────
  event-ops tried class 'draft.reminder' → disposition: card (card card-1)
  member-facing classes start at draft, not auto — a human must decide

── 3. Approval, then the transport gate (D21) ───────────────
  organiser approved the card. the fleet then tried to COMMIT to wa:62811 →
  refused: no_transport
```

**That refusal is the product.** The fleet got permission, and the send still stopped.

## Use it

| You want to… | Do this |
|---|---|
| **see the guarantee** | `node runtime/tour.ts` |
| **produce something you can inspect** | `node scripts/quickstart.mjs` — a card, a human's decision, a refused publish, a verified log, and a redacted copy (identifiers out; **the copy stays**, so check it for secrets before you share it) |
| **put it in an agent you already use** | [`adapters/mcp/README.md`](adapters/mcp/README.md) — the client configuration and a captured exchange |
| **write code against it** | [`runtime/src/index.ts`](runtime/src/index.ts) is the public surface; [`runtime/examples/one-complete-example.ts`](runtime/examples/one-complete-example.ts) is a worked example that uses only that surface |
| **run it on your own community** | [`adapters/reference/README.md`](adapters/reference/README.md) — the reference host, end to end |
| **check it** | `node scripts/gates.mjs` — the four gates CI runs |

## What it enforces

- **Autonomy ladder** — every action class starts at `draft`, never at `auto`
- **Grant taxonomy** — `allow_once` / `allow_always` (named scope required) / instant revocation
- **Revision-bound approvals** — an edited draft invalidates the previous approval
- **Member protections** — suppression beats any grant, quiet hours are the member's clock, 2/24h cap
- **Identity disclosure** — a bilingual canonical line, mandatory, not a setting
- **Stranger-input containment** — member text never enters the audit log
- **Replayable audit trail** — replay reproduces the state exactly

Enforced by tested code, not by prose.
[The spec](spec/GOVERNANCE-SPEC-OUTLINE.md) is the authority, and Part 6 of it maps every rule to
the file and the test that holds it.

## What it does not do

- **No transport.** Nothing reaches a member; delivery is the organiser's hand (D21).
- **No model.** The runtime writes no member-facing text of its own and invents no fact.
- **No funnel.** The hosted surface is a separate product; this repository is its control plane, not
  its advertisement. See **Product surface** below.

## Adopt it

**Vendoring by copy is the intended path.** Copy `runtime/` **and** `scripts/` together — the loader
reads a pack's shape through the same validator the gates use, so the two travel as one folder —
and import the `.ts` files directly. No build step, no dependencies.

**The public surface is one file:**

```ts
import { Fleet, loadPack, runActions, createRun, KinshipError } from './kinship/runtime/src/index.ts';
```

Everything not re-exported there is an implementation detail.

**And the copy path is proved, not asserted:** `scripts/vendoring.test.mjs` copies those two folders
out of this repository — and out of the newest **release tag** — and runs the tour and the worked
example on the copy, with nothing else present. A promise that only holds in the place the promise
was written is not a promise.

## Product surface

**As of 2026-10-24 there IS a hosted surface.** ShortcutSistem — Kinship's parent product — runs
**Kinship Host** at `shortcutsistem.com`: the same control plane, with a hosted human seat,
persistence and a channel connection around it, in a **separate repository and a separate product**.
It adds the host's half of the four seams and nothing to the control plane.

**This repository is not a service and not an advertisement for one.** No sign-up path, no pricing,
no call to action. **Self-hosted parity** — nothing here is held back; **no silent flip** — a change
to the licence or the boundary goes through a dated `DECISIONS.md` row *before* this repository
changes; **no funnel** — the hosted surface links here, and this repository does not link there.

**And the "same control plane" sentence is checkable rather than asserted.** The hosted product
vendors a copy of this runtime, so `node scripts/runtime-digest.mjs` prints the digest of *this* tree
and a host prints the digest of *its* copy — the same string or not. What is not decided yet is
whether the hosted product records its digest, which is its own build's business; until it does, this
repository can print its own and compare, and the hazard is written up in
[`community/OSS-PARITY-2026-10-23.md`](community/OSS-PARITY-2026-10-23.md).

## What ships

- **The governance spec** — [`spec/GOVERNANCE-SPEC-OUTLINE.md`](spec/GOVERNANCE-SPEC-OUTLINE.md)
- **The seed pack** — [`packs/kopdar-ops/`](packs/kopdar-ops/README.md), forkable, with an
  Indonesian on-ramp
- **The runtime** — [`runtime/`](runtime/src/index.ts): refusing, logging, replaying, metering a run,
  sending nothing
- **A reference host** — [`adapters/reference/`](adapters/reference/README.md): owns the clock, the
  store and the printing
- **An MCP adapter** — [`adapters/mcp/`](adapters/mcp/README.md): any assistant can *ask* Kinship for
  permission, and the runtime decides
- **The shape gate** — [`scripts/validate-pack.mjs`](scripts/validate-pack.mjs) and
  [`scripts/gates.mjs`](scripts/gates.mjs), with its 72-case tamper-resistant contract test
  (64 distinct `PKG-*` rules; recount:
  `grep -o "'PKG-[0-9N]*'" scripts/validate-pack.mjs | sort -u | wc -l`)
- **A persisted log that verifies** — the rows must be dense in `seq`, they must fold, and the state
  they fold to must be the state the fleet holds
- **A runtime digest** — [`scripts/runtime-digest.mjs`](scripts/runtime-digest.mjs): one deterministic
  `sha256` over the shippable runtime. A host that vendors this runtime by copy can **prove** which
  copy it runs: two digests are either the same string or they are not

**Gated behind measurement:** any channel transport, and any claim that the fleet "reduces organiser
load". Every member-facing commit refuses with `no_transport` and leaves its one-send authorisation
intact for manual hand-off.

## The gates

```bash
node scripts/validate-pack.mjs packs/kopdar-ops   # does the pack obey the invariants?
node --test scripts/*.test.mjs                    # can the pack, or the docs, drift without anyone noticing?
node --test runtime/test/*.test.ts                # do the rules actually hold?
node runtime/tour.ts                              # drive the pack live: it drafts, a human approves, it refuses to send
```

`node scripts/gates.mjs` runs all four, in the order CI runs them. A test fails the build if this
README stops printing the same four commands, so the copy here cannot go stale.

## The rest of it

| | |
|---|---|
| [ROADMAP.md](ROADMAP.md) | what is **not** complete, and whether a contributor or the owner owns each gap |
| [CONTEXT.md](CONTEXT.md) | the vocabulary |
| [CHANGELOG.md](CHANGELOG.md) | every release |
| [DECISIONS.md](DECISIONS.md) | the decision log — dated, append-only |
| [docs/ATTESTATION-MEMO-2026-10-24.md](docs/ATTESTATION-MEMO-2026-10-24.md) | the design for proving a human made a decision |
| [llms.txt](llms.txt) | an index for a tool rather than a reader |
| [PLAN.md](PLAN.md) · [the PRD](docs/PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md) | the product case, for community operators |
| [CONTRIBUTING.md](CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md) | how to contribute, and where to report a problem |

**Before you open a feature PR, read [ROADMAP.md](ROADMAP.md)** — it lists the gaps and says who owns
each one.

---

Apache-2.0 — [LICENSE](LICENSE) and [NOTICE](NOTICE). The mark is not registered; see
[TRADEMARKS.md](TRADEMARKS.md).
