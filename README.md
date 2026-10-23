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

You need Node 23 or newer. There is nothing to install and nothing to build.

```bash
git clone https://github.com/Therealratoshen/kinship.git
cd kinship

node scripts/gates.mjs
```

That runs the four checks CI runs, in the order CI runs them:

```bash
node scripts/validate-pack.mjs packs/kopdar-ops   # does the pack obey the invariants?
node --test scripts/*.test.mjs                    # can the pack, or the docs, drift without anyone noticing?
node --test runtime/test/*.test.ts                # do the rules actually hold?
node runtime/tour.ts                              # drive the pack live: it drafts, a human approves, it refuses to send
```

The list lives in `scripts/gates.mjs`. A test in `scripts/gates.test.mjs` fails the build if this
README stops printing the same four commands, so the copy here cannot go stale.

`node runtime/tour.ts --json` prints the same tour plus a machine-readable map of which test file
covers which source file.

There is one more check CI runs, and it is the only one that needs an install. The runtime is written
in TypeScript, and node runs the `.ts` files directly by stripping the types, which means the types are
never checked unless something checks them:

```bash
npm install --no-save typescript@5 @types/node@22
npx tsc -p runtime/tsconfig.json --noEmit
```

CI runs that in a job of its own, so the runtime still installs nothing for whoever forks it.

### Run it on your own community

The checks above print results. The reference host runs the fleet and writes a file.

```bash
cd adapters/reference && npm install --no-audit --no-fund && cd ../..
```

That is the only `npm install` in the repository. The host's one dependency is a path to
`runtime/`, so npm creates a symlink and downloads nothing. `--offline` works too.

**Two files, both gitignored, because both hold your community's own data.** The first is who you are;
the second is what you are doing next.

```bash
cp packs/kopdar-ops/pack.local.example.yaml     packs/kopdar-ops/pack.local.yaml
cp packs/kopdar-ops/pack.local.plan.example.yaml packs/kopdar-ops/pack.local.plan.yaml
$EDITOR packs/kopdar-ops/pack.local.yaml         # eight answers: your name, your channels, your contacts
$EDITOR packs/kopdar-ops/pack.local.plan.yaml    # your copy, your next event, your members
```

`pack.local.yaml` is the eight answers the pack needs before it will boot. `pack.local.plan.yaml` is
your working file: **the copy you wrote** for each lane and phase, **the next event** with the facts
your copy may use, and **your members** with the timezone that decides their own quiet hours.

**Your copy is your copy.** There is no model in this repository. The runtime writes no member-facing
text of its own and invents no fact. A `{slot}` with no value refuses the whole template rather than
leaving a hole in a message, and a copy written for a lane your pack does not declare is refused too.

Now run the fleet. `--now` is the moment the host acts as if it were, which is how you rehearse a
week's worth of reminders without waiting a week.

`plan` is a read. It writes nothing. It tells you what the fleet would do, and what is broken in your
copy before the event rather than during it.

```bash
node adapters/reference/src/host.ts plan --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --plan packs/kopdar-ops/pack.local.plan.yaml --log logs
```

`run` schedules the timers, fires the ones that are due, and drafts the cards. The copy in them is
yours, with your facts filled in and the disclosure line in the place you put it.

```bash
node adapters/reference/src/host.ts run --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --plan packs/kopdar-ops/pack.local.plan.yaml --log logs --now "2026-11-07T19:00:00+07:00"
```

Now you are the human in the loop, and you can say no:

```bash
node adapters/reference/src/host.ts approve --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs --card card-2 --why "tanggal dan tempat sudah benar"

node adapters/reference/src/host.ts approve --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs --card card-1 --verdict reject --why "terlalu awal, kita umumkan besok"
```

And then you try to publish, and the gate stops you:

```bash
node adapters/reference/src/host.ts publish --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs --card card-2 --recipient wa:62811
```

```
refused: no_transport
  [no_transport] (D21 / D11) phase 1 ships no channel transport — delivery is the organiser's hand;
  the authorization is left intact and the refusal is logged
```

**That refusal is the product.** Phase 1 ships no channel transport, so every member-facing commit
stops at `no_transport` and the log records that it stopped. A member who has said stop is stopped
earlier still, at `member_suppressed`.

Two files appear under `logs/kinshipai/bundled/event-ops/kopdar/`:

```
events.jsonl     one row per action, in order — this is exactly what replay reads
manifest.json    what a reader needs to know before opening the log
```

Check the log is honest:

```bash
node adapters/reference/src/host.ts verify --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
```

**And if you want to share it** — with a maintainer, in an issue, anywhere public — redact it first.
The log carries member *identifiers*; the redacted copy carries none, and the governance evidence
(event types, order, refusal codes, reason strings) survives intact, so a reader can still check that
the rules held. The original is never touched.

```bash
node adapters/reference/src/host.ts redact --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
# → logs/events.redacted.jsonl and logs/manifest.redacted.json
```

**And the honest limit of redaction:** it removes the *identifiers*, not the *shape*. A redacted log
of a three-person community is still a small log, and a reader still learns that three people exist.

The manifest states the privacy position inside the file: member identifiers are in the log, member
message text is not, and the draft copy is. It carries a digest of your eight answers rather than
their values, so the log can travel without carrying a second person's name.

## Adopting it

**Vendoring by copy is the intended path, and nothing is published to a registry.** There is no root
`package.json` and `runtime/package.json` is `private: true` — so there is no registry package and
no `npm install` in the library itself. That is a decision, not an omission:

- copy **`runtime/` and `scripts/` together** into your project — the loader reads a pack's shape
  through the same validator the gates use, so the two travel as one folder;
- import the `.ts` files directly (`import { Fleet } from './kinship/runtime/src/engine.ts'`) — node
  runs them as they are, with no build step and no dependencies;
- copy `adapters/reference/` alongside if you want a host to start from — it is a sibling package,
  and its one dependency is the runtime beside it.

The reference host's `npm install` creates a **local symlink** and fetches nothing (`--offline`
works). That is the only install step anywhere in this repository, and it belongs to the example,
not to the library.

## What ships vs what is gated

**Ships now** (tested, in this repo):
- The governance spec (`spec/GOVERNANCE-SPEC-OUTLINE.md`)
- The seed pack (`packs/kopdar-ops/`) — start at [its README](packs/kopdar-ops/README.md), fork it and adapt it
- The validator and its 67-case tamper-resistant contract test (61 distinct `PKG-*` rules; recount: `grep -o "'PKG-[0-9N]*'" scripts/validate-pack.mjs | sort -u | wc -l`), plus `scripts/gates.mjs` — one
  command for the four CI gates, and a test that fails if the documented list drifts from what CI runs,
  or if any markdown table in the repository loses the header that gives its rows meaning
- The runtime library (`runtime/`) — refusing, logging, replaying, metering a run, no sending
- The sanction ladder (`sanction_ladder:` in a pack, spec section 2.12 / PRD FR-5.11, `DECISIONS.md` D37) — a community
  may write down the graduated consequences it applies, each rung naming a human seat and what the member is
  told, and the fleet still cannot carry one out: no `moderation.sanction` class, no tool, and `PKG-63` refuses
  any rung whose `via:` matches a declared tool. Deleting the key is legal; a default ladder is never supplied
- The tier above the pack (`orgs/kinshipai.yaml`) — org **floors** and an **autonomy ceiling** resolved org →
  pack with **refuse, never clamp**: an operator can reject a pack that goes below a floor or fill a blank the
  pack left, and cannot rewrite a number a community declared (spec section 1.10 / PRD FR-1.18)
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
- The claim ceiling (PRD section 2.3, FR-4.4) — the banned strings are code (`scripts/claim-scan.mjs`) rather than a
  comment, the sweep reaches the copy that actually ships (the root `README.md` and a pack's own `README.md`
  included), and `scripts/claims.test.mjs` fails if a forbidden cell in the PRD is neither enforced nor named as
  a rule no sweep can enforce
- **The community's coverage window** (`coverage:` in a pack, spec section 2.13 / PRD FR-5.12, `DECISIONS.md` D54) — a
  community can write down the hours a human is **on duty** for it, in its own timezone, and the health read reports
  the window, whether anyone was on duty at the moment of the read, and how many obligations outlived a staffed
  shift. This is **not** the member's quiet hours: that clock is the member's and answers "may I contact this
  person", while this one answers "was anyone watching when this community was left waiting". Three rules make it
  a promise rather than a score — the window is a **local wall clock** (never a stored UTC offset, so 09:00 stays
  09:00 across a daylight-saving change), **only a shift whose end has passed counts as missed** (the clock pauses
  outside coverage), and a **pack that declares no window reads `null`, never `0`** (an unstated staffing promise is
  an unknown duty state; zero would claim the community was never on duty)
- **A community-lead lane** — three skills on the existing `engagement` agent, not a fourth agent: `standing-engagement`
  (the community's presence *between* events — read the room before speaking, hold the thread, and never answer
  outside the staffed window), `community-minutes` (decisions with the people who made them, obligations with owners,
  quotes with sources), and `community-health` (the health check as a **recommended** metric, because a health number
  that becomes a target is a number a volunteer community optimises for instead of the community)

**Gated behind shadow-mode measurement:**
- Any channel transport (WhatsApp, Telegram, email, Discord)
- Any claim that the fleet "reduces organiser load"

The gating mechanism is real: every member-facing commit refuses with `no_transport` and leaves its one-send authorization intact for manual hand-off.

## The governance spec

`spec/GOVERNANCE-SPEC-OUTLINE.md` is the publishable artifact. It covers the autonomy ladder, grant taxonomy, audit replay, event-lifecycle state machine, member protections, disclosure, stranger-input containment, shatter-guard, cross-community promotion, settings resolution across the org/pack tiers, the human seat set, and the community's coverage window. Part 6 maps every spec rule to its runtime file and test.

## For community operators

The [PRD](docs/PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md) and [execution plan](PLAN.md) cover the full product case. The [design-thinking folder](docs/design-thinking/) documents the research that produced the spec. The [CONTRIBUTING.md](CONTRIBUTING.md) explains the append-only decision rule and how to contribute.

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

## What this is, and what it is not

**Kinship reduces risk. It does not guarantee compliance, safe behaviour, or a good outcome.** It is
a governance layer with a reference host, not a service, and it ships **no transport** — nothing
member-facing can send. Where a claim in this README would outrun its evidence, the claim is not
made: see [the evidence rule](#the-three-invariants) and the closed set of refusals in
[the spec](spec/GOVERNANCE-SPEC-OUTLINE.md). What you get is a runtime that **refuses** the things
it should refuse, and a log you can check afterwards.

## License, marks, and citation

**MIT** — see [LICENSE](LICENSE). One honest caveat while PRD section 12-**Q4** stays the owner's open
decision: MIT is what these files and this README already state, and Q4 is where it becomes a ratified
commitment rather than a working default. The reasoning is written up as a question with a
recommendation in [LICENSE-MEMO-2026-10-18.md](docs/LICENSE-MEMO-2026-10-18.md), not as a decision.

**The name is not covered by the licence, and that is on purpose.** A licence grants rights in the
*code*; it says nothing about the *name*. So the mark is stated separately, in
[TRADEMARKS.md](TRADEMARKS.md): **fork this project freely, under your own name** — and do not publish
something under the Kinship name or the `kinshipai/…` namespace in a way that suggests it is this
project. A fork that says it is a fork is good for everyone; a fork that pretends to be the project is
the thing the mark exists to stop.

**Citing it.** [`CITATION.cff`](CITATION.cff) gives GitHub a *Cite this repository* button, and
[CHANGELOG.md](CHANGELOG.md) is the dated record of what shipped. If you use Kinship in something
written down, please cite it — it is the difference between a project with a history and a project
somebody found.

**Reporting a vulnerability** is not a public issue: see [SECURITY.md](SECURITY.md).
