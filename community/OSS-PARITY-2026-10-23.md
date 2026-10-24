# OSS parity — what the hosted product runs, and what this repository can prove about it

**2026-10-23.** Written on the day the boundary changed, because `DECISIONS.md` **D19** requires the
OSS/hosted boundary to be **disclosed on the day it changes, forever**, and requires a dated row
**before** this repository changes.

> **Corrected 2026-10-24, and this file now ships.** Two things changed while it was off the branch.
>
> **1. The disclosure row is D81, not D54.** The branch this file was written on claimed **D54** for
> the disclosure — and `main` had already used **D54** for something else entirely (the community's
> coverage window). The disclosure that actually landed is **D81**, on 2026-10-24, and it is the row
> D19 asked for. **So the correction is the collision, not the row:** had the branch merged as
> written, this repository would have carried **two D54 rows** — which is the same defect class as a
> decision log that can lose a row, in the opposite direction. The branch never landed; the numbers
> never collided; the file below says so rather than being quietly renumbered.
> **2. The script in §4 now ships here** (`scripts/runtime-digest.mjs`, `DECISIONS.md` **D112**), so
> the comparison §4 describes is runnable from a checkout. **What is still undecided is unchanged:**
> whether the hosted product records its digest is the owner's (§5.2), and until it does, this
> repository can print *its* digest and compare, but it cannot compare the product's.

**How to read the evidence here.** Everything in §1 and §2 comes from a **dated external read** — the
hosted product's own deployment metadata and build log, read on 2026-10-23 — and **not** from a command
a reader can run in this repository. That is the point of §3: this repository cannot re-derive those
facts, because the product's source is private. Where a number appears, the source is named so it can
be re-read; where a number cannot be re-read, it is not stated.

---

## 1. What is hosted, and since when

| Fact | How it was established |
|---|---|
| `shortcutsistem.com` serves a Kinship product | the live page's title is *"ShortcutSistem — Kinship Host: a supervised agent fleet for community operations"*, and its nav reads `Beranda`, `Kinship Host`, `Coba kursi manusia →` |
| It went live on 2026-10-22 at 17:17 UTC | the Vercel deployment `dpl_7LBm7PyeNovmMoa8f9GEjiQLgWJo`, `readySubstate: PROMOTED`, `source: git` |
| It was built from `Therealratoshen/shortcutsistem` at `da9a62b` | the deployment's `gitSource.sha`, and the build log's own first line: `Cloning github.com/Therealratoshen/shortcutsistem (Branch: main, Commit: da9a62b)` |
| The commit is *"Remove legacy Omni Audit & SS Video assets and docs"* | the deployment's `meta.githubCommitMessage` |
| The product is a Next.js application in a **private** repository | the clone line names a repository this repository's deploy key cannot read; the anonymous GitHub API answers 404 for it, which is what a private repository answers |
| It **vendors this repository's `runtime/` by copy** | its build command is `npm run gate -- --only=typecheck,marketing,drift && npm run build --prefix shortcutsistem/app`, and its types step is `tsc -b lib/kinship/runtime` — a vendored copy of the runtime, built in place |

Two of those lines are the ones that matter for this repository. The product is **live**, and it runs
**a copy** of the governance semantics that this repository is the source of.

## 2. The shape of the product's repository

Read out of the same build log, because that is what the log is for — it is a transcript of the build,
not a description of it.

| In the product's repository | What it is |
|---|---|
| `lib/kinship/runtime/` | the vendored copy of this repository's runtime, built in place by `tsc -b` |
| `shortcutsistem/app/` | the Next.js application, its own manifest, built by `next build` |
| `scripts/gate.sh` | a gate with three selected checks — `typecheck`, `marketing`, `drift` — and a scorecard |
| `scripts/vercel-ignore-build.mjs` | skips pull-request builds |

The gate's own output, read from the same log: typecheck clean, marketing guards clean, and **"no
drift — marketing claims match code reality"**, then `GATE PASSED`. The third check is the one that
matters for this file: it compares what the product *says* against what the product *does*. It has
nothing to compare against a private copy of the runtime, because the copy is not visible to it.

## 3. The hazard, stated exactly

**The install path for this repository is vendoring by copy** (`DECISIONS.md` D52). That is the
sanctioned way to consume a control plane, and it is why a copy can be **old** without anything
looking wrong:

- a vendored copy still boots, still passes its own tests, and still behaves — just not the behaviour
  this repository currently claims;
- no test in this repository can see it, because the copy is not in this repository;
- the product's own "marketing drift" gate compares its marketing against **its** copy, so a copy that
  has drifted from the source would still pass it — the gate would be comparing a claim against the
  thing the claim was made from.

The consequence, stated as a sentence this repository can now use: **the open-source project cannot
vouch for what the hosted product runs.** Not "might not" — cannot, because the comparison requires
both trees and only one of them is visible from here.

## 4. What this repository added instead of a promise

`scripts/runtime-digest.mjs` prints one deterministic `sha256` over the shippable runtime —
`runtime/src/**` and `runtime/package.json`, the part a host vendors and the part whose behaviour a
member can feel. It is **path-independent**, which is the property that makes it usable at all: a
vendored copy always lives somewhere else, so a digest that moved with the path could never be
compared to anything.

```
node scripts/runtime-digest.mjs
```

Two digests are either the same string or they are not. That is the whole claim, and the claim is
small on purpose.

**What it is not.** Not a signature, not an attestation, not a supply-chain guarantee. It says *these
two trees are byte-identical*; it says nothing about who put them there, when, or why. A tree that was
tampered with **and whose digest was recomputed** is still a tree with a digest. Provenance is a
different problem and this is not it.

**How a host uses it.** Record the digest it was built from, next to the log it writes
(`spec/HOST-CONTRACT.md` seam 3, v0.2), and re-compute it on start. Then *"is this copy current?"* is
a comparison of two strings rather than a question about anyone's memory.

## 5. What is still the owner's call

Nothing below was decided by this repository, and each is written here so the next decision has the
evidence in front of it.

1. **Does the product's application source belong in this repository?** This is the open question
   under the instruction this work came from, and it is genuinely open. Moving it would make the
   product's own code reviewable and gate-covered — which is the strongest version of D19's
   "self-hosted parity" — and would cost the product a private boundary it may want. Keeping it
   private and disclosing it, as this repository now does, is a defensible answer too. What is *not*
   defensible is what the repository had before this row: a sentence saying nothing was hosted, which
   was false.
2. **Does the product's build record the digest?** One line in its build, and its own logs carry the
   answer. It cannot be done from here — the product's repository is private and unreachable from this
   sandbox.
3. **Which runtime version does the product pin?** There is no version pin today, only a copy. A
   `v0.1.0` tag exists and a release is published, so a pin is available; the product's build currently
   takes whatever `main` held.
4. **Should the count check reach the decision log?** `scripts/gates.test.mjs` recomputes every number
   the **live** documents quote, and excludes the history files on purpose. The cost of that choice is
   visible in the newest row: **D53 printed *"scripts suite 83"*, and the suite was 85 at that commit's
   own parent** — counted the way the check counts it. The number was already wrong when it was
   written. History is not rewritten, so the correction lives in a **dated row of its own**, and the
   question of whether a decision row's numbers are claims is still open.
5. **Shadow mode is still unset.** D9 has no dated event, so nothing member-facing sends in any case,
   and none of the above changes that.

## 6. The commands, so a reader can re-run what is re-runnable

```bash
node scripts/gates.mjs          # the four gates CI runs
node scripts/runtime-digest.mjs # the digest of this tree
node runtime/tour.ts --json     # the contribution map, and the runtime's own counts
```

The product's deployment metadata and build log are readable from the Vercel API with the project's
own token, and are not reproduced here: this file is a record of a dated read, and the deployment id
in §1 is the handle for re-reading it.
