# License memo — PRD section 12-Q4 (a question, with a recommendation)

**Date:** 2026-10-18 · **Owner of the decision:** Filbert (`DECISIONS.md` D1 assigns the license question to
him; PRD section 12-Q4 is where the ruling lands) · **Status:** **open.** This file recommends. It does not decide,
and no row here belongs in `DECISIONS.md` until he takes the call.

Written because `PLAN.md` W9 names it as one of two remaining hygiene deliverables, and because the repo
already says "MIT" in four places while Q4 is still listed as undecided. That gap is the memo's subject.

## 1 · What is already true in the repo, verified 2026-10-18

| Surface | State |
|---|---|
| `LICENSE` | MIT, `Copyright (c) 2026 Filbert Henrico`, 21 lines |
| `runtime/package.json` | `"license": "MIT"` (aligned to the file 2026-10-17; it previously read `SEE LICENSE IN ../DECISIONS.md Q4`) |
| `packs/kopdar-ops/PACK.md` frontmatter | `license: MIT`, with its own note 6 calling it a *proposal* |
| `README.md` | MIT badge + "MIT. See LICENSE" |
| GitHub | detects and displays MIT; Discussions on, 5 topics, no `CODE_OF_CONDUCT.md`, no release yet |

So the practical answer to Q4 is already the default everyone sees. That is not a problem by itself — it is
normal for a repo to carry its intended license before the owner formalises it — but it *is* a claim running
ahead of its decision record, which is invariant #3 applied to ourselves. The fix is one line from him in
PRD section 12, not a rewrite of anything.

## 2 · The question, stated honestly

**MIT vs AGPL-3.0 vs open-core (MIT core + a paid/licensed layer).** What the license has to survive is:
somebody forks this, hosts it, and either competes with the hosted surface at `shortcutsistem.com` (**D19**)
or closes the governance layer that makes it Kinship.

## 3 · Evidence on the table

- **MIT is the shape the adjacent category actually won in.** The highest-traction OSS agent plane near this
  category is Paperclip, MIT (`research/PAPERCLIP-OSS-STUDY-2026-10-17.md` section 1) — as are the teams/skills
  catalog packages whose format we deliberately copied (**D17**), and as is **Discourse AI**, the closest OSS
  moderation precedent and the one that already ships our flag-only posture.
- **Paperclip also shows the open-core pattern working without AGPL:** MIT core that keeps enforcement in the
  free layer, with an enterprise tier for policy *editing*. The gate is not paywalled; the convenience is.
- **A one-file YAML cannot carry per-agent instructions** — the pack is a directory (**D17**), which is what
  makes the pack layer, not the runtime, the thing a hosting competitor would have to replicate.
- **License choice is not what saved the projects that flipped.** In every observed case —
  HashiCorp→OpenTofu, Redis→Valkey, and MinIO's 2025 community-edition UI removal (its own discussion
  #21326: *"It's not a feature issue, it's a trust one"*) — the load-bearing trust asset was
  **disclosure discipline**, and the community's remedy was the fork that a MIT-style license *permits*
  (`research/OSS-AUTONOMY-FAILURES-2026-10-17.md` patterns 5–7).
- **Attribution is the mechanism AGPL would otherwise be asked to do here.** The namespaced pack key plus
  `fork_chain` (**D5**, `.kinship.yaml`) makes a forked community's lineage addressable and public. It is a
  status payoff, not a payout — which is the motivation the contributor research actually found (reputation /
  learning / distribution, not revenue share; n8n's creator program pays $0 and still filled 13,490 templates).

## 4 · The tension this memo has to name, because Q4's original argument did not

PRD section 12-Q4's reasoning includes: *"AGPL protects against a hosting competitor; there is no hosted product
planned (section 5.2), so at 4–5 h/wk the protection buys nothing."*

**That premise has moved since it was written.** **D19**, recorded the same day, says the hosted product will
live under ShortcutSistem at `shortcutsistem.com`. So "no hosted product planned" is no longer exactly true,
and a recommendation resting on it should be re-derived rather than repeated. Two clarifications keep it
accurate:

1. What PRD section 5.2 actually rules out is **multi-tenant SaaS hosting of other people's communities** — the ops
   burden, not the existence of a hosted surface. A hosted *single-tenant* Kinship on the owner's own terms is
   compatible with both section 5.2 and D19.
2. The AGPL case is therefore not "AGPL is worthless," it is **"AGPL would forbid the owner himself from doing
   the thing D19 announces, and forbid the exact self-hosted parity D19 promises."** If the governance core is
   AGPL, every downstream modifier owes source disclosure — including communities that fork a pack to run it
   privately. At 4–5 h/week, that is a legal obligation imposed on the small user base to protect against a
   competitor who has not appeared, against a hosted surface that did not yet exist when this was written and
   that D19 binds to *parity* rather than exclusivity. **That surface now exists** (`DECISIONS.md` **D81**), and it
   runs this control plane byte for byte — which is the arrangement AGPL would forbid, so the clause this
   memo identified is now the operative reason rather than a hypothetical one.

Recommendation as it stood: **MIT.** (It was ratified as **Apache-2.0** instead, on the patent clause — see the
status note at the top of this file. The reasoning below is kept as the record of how the argument was built.)
not because the old sentence still reads well.

## 5 · What MIT explicitly does not protect, and what protects it instead

| Not protected by MIT | What actually holds the line |
|---|---|
| A competitor hosting Kinship and closing the governance layer | The layer is the whole repo (`runtime/` + `spec/` + `packs/`). There is no hidden server-side gate to withhold, so a closed fork is a worse product, not a better one. D19's self-hosted parity is the promise that keeps this true. |
| Someone stripping the member invariants from a fork and shipping it as "Kinship" | The validator + boot gate (**D15**, FR-1.14): a fork that deletes a member invariant, adds `whatsapp \| send`, or moves a bound out of range refuses to boot. Enforcement in code, not in a license clause. |
| A community pack claiming `bundled: true` | **D15**: the `bundled` claim is ours alone; community packs resolve to low trust at read time and may not assert our invariants. |
| The trust asset if the boundary ever moves | **D19**'s no-silent-flip rule: a dated `DECISIONS.md` row *before* the repo changes. MIT makes the flip survivable precisely because a fork is legal — the disclosure rule is what makes it unnecessary. |
| Pack-content licensing (Q5) | **Still open.** Q5 asks whether packs/agents are open or organiser-private on the hub; MIT on the code does not answer it. `PLAN.md` W9 revisits; owned by the hub decision (D2/D6). |

## 6 · Secondary decisions this memo touches but does not make

- **Copyright holder.** `LICENSE` names Filbert Henrico personally. If Kinship later sits under a ShortcutSistem
  entity (**D19**), the holder and any CLA are his call, not a repo edit.
- **DCO vs CLA.** Nothing here requires either. A `Signed-off-by` DCO line in `CONTRIBUTING.md` is cheap and
  unblocks contributor license disputes later; it is not added on my authority because it changes what a
  contributor agrees to.
- **SPDX in the pack.** `PACK.md` carries `license: MIT` as a proposal; if Q4 is ratified, note 6's wording
  ("must not be copied into a repo README until he takes it") retires.

## 7 · The ask, sized

One PRD section 12 line — **Q4: MIT, ratified 2026-MM-DD** — plus a dated `DECISIONS.md` row so the ratification is
auditable the way D1–D21 are meant to be. Everything else in this file can then be read as background rather
than as a live inconsistency.

## Changelog

| Date | Change |
|---|---|
| 2026-10-18 | Written from the repo's verified state; section 4 records that D19 moved Q4's "no hosted product planned" premise and re-derives the recommendation on the new facts. |
