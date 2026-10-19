# `packs/kopdar-ops/` — the seed pack

A **forkable example**, not a product. It is the reference shape for `kinship/v1`: three agents over one
event lifecycle, one approval queue, and a set of invariants a fork is not allowed to delete. Read
[`PACK.md`](PACK.md) for what the squad does and why each refusal exists; this file is only the on-ramp.

Everything below was run against this directory on 2026-10-19.

## Try it without writing anything

From the **repo root**:

```bash
node scripts/validate-pack.mjs packs/kopdar-ops   # shape gate: every PKG-* rule (recount: grep -o "'PKG-[0-9N]*'" scripts/validate-pack.mjs | sort -u | wc -l)
node runtime/tour.ts                              # drives THIS pack: drafts, you approve, it refuses to send
node runtime/tour.ts --json                       # same, as a machine-readable contribution map
cd runtime && node --test test/*.test.ts          # the semantics suite, incl. five tamper cases against this pack (count: `node runtime/tour.ts --json`)
```

The tour is the fastest way to see what the pack *is*: it boots this directory, produces a real approval card,
and then refuses the commit with `no_transport` — because no channel transport ships here by design
(`DECISIONS.md` **D21**). That refusal is the product, not a missing feature.

## Layout

```
PACK.md              frontmatter (key, bundled, agents[], requiredSkills) + the prose a forker needs
.kinship.yaml        schema kinship/v1 — autonomy_by_class, tools, guardrails, budgets, needs
agents/<role>/AGENTS.md   per-agent instructions — event-ops · engagement · moderator
skills/<name>/SKILL.md    16 procedures, each with an assertion that fails the pack
pack.example.yaml    superseded single-file shape; kept as a pointer (D17), read by nothing
```

The directory *is* the forkable unit. A one-file YAML cannot carry per-agent instructions, per-skill
assertions, or a namespaced key, which is why the flat example was retired the same day (**D17**).

## Before you edit: the five things that are not yours to change

1. **`bundled: true` is ours.** It is the claim that the invariants in this directory are held by us. A
   community pack must not assert it, and a fork that keeps it while deleting what it guarantees is the exact
   forgery `SECURITY.md` asks to be reported privately (**D15**).
2. **The `guardrails:` block is a floor, not a menu.** The validator fails on *deleting* a key or *flipping* a
   value, and fails on a bounded value moved out of range. Tested against this directory: removing
   `member_opt_out_persists_across_lanes`, setting `member_message_cap_per_24h: 50`, or adding
   `whatsapp | send` each produce a pack that refuses to boot (`runtime/test/pack.test.ts`).
3. **`whatsapp | send` is absent, not denied.** Absent is the point: a reviewer can grep the tool list and find
   nothing. The reason is a re-derived one — Meta's Groups API is live but OBA-gated and capped at 8
   participants, so the official route cannot serve a 100–500-person kopdar, and the unofficial route risks the
   organiser's own number (**D11** → corrected basis **D13**).
4. **`needs:` is an anti-spam gate, not a checklist.** Boot requires all eight answered; one unset and the
   runtime raises `need_unanswered` rather than inventing content. That invention is the failure mode that makes
   AI community tools feel like spam, so it is refused at boot instead of being logged as a warning.
5. **This pack names an org, and the org sits above it** (`organisation: kinshipai` → `orgs/kinshipai.yaml`,
   spec §1.10 / PRD **FR-1.18**, **D35**). Two consequences for a fork, in the order they bite:
   **you may not go below its floors** — `member_message_cap_per_24h: 5` under a floor of `4` fails the boot
   naming the key, both numbers, and the org, and it is *refused, not clamped*, because a system that quietly
   sends 4 after you wrote 5 leaves your file disagreeing with the world (**PKG-60** in CI, `settings.ts` at
   boot); and **the org file must exist** — pointing `organisation:` at a manifest that isn't there refuses too,
   since booting floorless would drop every floor the operator thought they held (**PKG-58**). If you fork out
   from under `kinshipai`, you do not inherit floors *and* lose the floor: write your own `orgs/<key>.yaml`
   (orgs are separate namespaces from packs; a bare org key is never a pack key) or declare no `organisation:`
   at all and become your own top tier. The seat set is the other half of that file: `decideCard`, `issueGrant`,
   `revokeGrant` and `releaseShatter` accept only a declared human seat, an org with a second seat is refused
   naming **PRD §12-Q12** (delegation is not built, and a fork must not build it sideways), and an *agent*
   named `organiser` is refused as a seat collision — that is how an agent would otherwise acquire the human
   veto over its own output (**FR-1.19**, **D36**).

   One contributor hazard while testing any of this: a temp copy of this directory must stay inside a folder
   named `kopdar-ops`, because **PKG-06** compares the directory name to the slug. Copy it into a bare
   `mkdtempSync()` path and every tamper case fails on the rename, not the rule — which is how three shipped
   tests were passing for the wrong reason until 2026-10-19; they assert the `PKG-*` id now.

## Forking it

1. Copy the directory, then change `key:` in `.kinship.yaml` to your own namespaced key
   (`<you>/<lane>/<slug>`) and set `bundled: false`. The key is what makes the attribution trail
   (`attribution.fork_chain`) addressable — reputation, not revenue (**D5**).
2. Keep the guardrail keys and the `defaults: deny` line. Change *values* only inside their bounds **and at or
   above your org's floors** — a bound is the validator's, a floor is the org's, and breaching either is a pack
   that refuses to boot rather than a warning. If you think a bound is wrong, open an issue arguing for it rather
   than editing the floor.
3. Answer the eight `needs` with your community's real names, channels, and escalation contact.
   `escalation_contact` is load-bearing: `escalate.to_human` has no target without it, and
   `member_notice_text` is the disclosure line members are told, in both languages.
4. Set `needs.partner_policy` **only** if you actually intend to promote partner content. The class
   `promote.cross-community` is unreachable until that answer names the allowed partners and the required
   disclosure line — partner content is copy *out*, never member data *out* (**D20**, spec §2.11).
5. Delete skills you do not run. An unused skill is a claim the pack cannot honour.
6. Run the shape gate, then add a failing case to `scripts/validate-pack.test.mjs` for anything your fork loosens
   — a validator rule needs both a passing and a failing case (`CONTRIBUTING.md`).

Real names, channels, and any member data go in `packs/kopdar-ops/pack.local.yaml`, which is gitignored
(`.gitignore:4`). A pack that carries state is a pack that leaks someone's attendee list into the next deploy
(**PACK.md** note 3).

**Provider keys go nowhere in this folder — not even in `pack.local.yaml`.** The model key is yours, held by
the host that runs the model (`spec/HOST-CONTRACT.md` seam 1, **D33**); Kinship meters cost through
`recordSpend` and never sees the credential. `PKG-57` makes that a build failure rather than advice: any
`sk-…`, `ghp_…`, `xox…-…`, `AKIA…`, `AIza…`, `glpat-…`, `npm_…`, or PEM private-key line in a pack file — in a
comment or a markdown instruction too — fails the shape gate, and the message names the file, the line, and the
*shape*, never the value, because a scanner that prints what it found is how a key reaches a public build log
(**D34**).

## What this pack does *not* prove

- **It does not send anything.** No transport ships in phase 1; every member-facing commit refuses
  `no_transport` and leaves its one-send authorization intact for the organiser's manual hand-off (**D21**).
- **It does not prove organiser relief.** Any claim that this reduces load waits on shadow-mode measurement,
  and shadow mode starts only when the owner writes a dated event as **D9**. That row is still empty.
- **It is not validated by any member.** The member-facing skills (`member-rights`, `flag-notice`,
  `publishable-sourcing`) encode what a *simulated* member lens said it would refuse
  (`community/MEMBER-LENS-2026-10-17.md`). A simulated lens is a constraint the build can honour or fail; it is
  not evidence of demand, and it must not be cited as one.
- **It models one organiser's workflow** — the one who wrote it. Zero primary research backs any lane.

## Where the durable rules live

| File | Read it before you |
|---|---|
| `rules/pack-format.mdc` | touch this directory or `scripts/` |
| `rules/governance-invariants.mdc` | change any `autonomy_by_class` value |
| `spec/GOVERNANCE-SPEC-OUTLINE.md` | implement semantics (Part 6 maps each rule to its runtime file + test) |
| `DECISIONS.md` | argue with a boundary — append-only, dated rows only |
| `AGENTS.md` | anything at all; it is the short version of this table |
