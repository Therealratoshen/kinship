# Paired evaluation for agent governance — the programme

**Doc ID:** PAIRED-EVALUATION-PROGRAMME-2026-10-23
**Method:** the decisions this document records are decisions, not findings; each names the evidence it
rests on.
**Access date:** 2026-10-23.
**Question it was asked:** *what should this project publish about agent governance, and what must it
never publish?*

> **Status:** ratified. The decision itself is [`DECISIONS.md`](../DECISIONS.md) **D54**; the research it
> rests on is [`AGENT-VS-AGENT-EVALUATION-2026-10-21.md`](./AGENT-VS-AGENT-EVALUATION-2026-10-21.md).
> This document is the programme's spine: the question, the refusals, the method, the naming, and the
> claim ceiling it inherits.

## The question this programme answers

> **How do you measure what an agent refuses to do — and does that measurement survive a human seat?**

Not "which agent is better." That question is answered badly by every public arena in the lane, and the
reason is structural rather than accidental: a duel score is a property of
*(agent, opponent, scenario, seed)*, so it is a statement about a pairing and a day, not a ranking. Elo
and Bradley-Terry ratings are population statistics over a comparison matrix — adjacent ranks are not
reliably separated, and a single run is an anecdote rather than a result.

This programme instead measures a **property of a configuration under a fixed scenario**: which action
classes it refuses, which guards narrow it, whether those refusals reproduce across runs, and whether the
whole record can be replayed and audited afterwards.

## What this is, positively

**A duel here is a probe, not a competition.** The benchmark asks *how does this agent score?* The
probe asks **what does this configuration refuse to do when a hostile counterpart pushes it?** That is
a different measurement, not a different leaderboard:

- **The counterpart is a stimulus, not an opponent.** It applies pressure — proposes, escalates, makes
  an attractive offer of the wrong action. It is not scored and it does not compete. The subject is the
  only thing under measurement.
- **The artefact is the trajectory, not the score.** A benchmark number cannot report "it lost for the
  wrong reason". A duel can, because the log is the record. The subject is graded against what actually
  happened, not against a checklist of what should have.
- **Defence is measurable this way and structurally is not otherwise.** One match yields an offensive
  and a defensive measurement. A static benchmark has no defender to grade.

The output is a **vector of refusals and their reasons**, read against the trajectory that produced
them. Not a placement, not a percentile, not a league table.

The evidence for why the score cannot be the artefact — and why the trajectory has to be — is in
[`AGENT-VS-AGENT-EVALUATION-2026-10-21.md`](./AGENT-VS-AGENT-EVALUATION-2026-10-21.md) §"Head-to-Head
Measurement Properties" and §"The Design, Revised".

## What the programme refuses

Each refusal below is a contract, not a preference.

| Refused | Why |
|---|---|
| **A public ranking or leaderboard** | The lane is occupied (Game Arena, CodeClash, arena.ai, Social Arena, CyberArena, prize-paying arenas), and the evidence says a pairwise score does not travel. A leaderboard would also publish configurations rather than methods. |
| **Any claim about member outcomes** | No member is asked, and none is simulated as a respondent. Nothing may imply a configuration "engages members better" or any equivalent. |
| **Any delivery** | The transport seam refuses exactly as it does everywhere else. `Handoff.sent` stays `false` throughout. |
| **Modifying the vendored control plane** | The Challenge runs the **unmodified** fleet twice and diffs the results. Adapter and host code stays outside `runtime/`. |
| **A model judge setting the reward** | Where a judge is used at all it annotates; it cannot set the reward. |
| **A training loop** | Outputs describe configurations. They are not exported into training data. If that changes, the governance regime changes with it. |

## The method, borrowed rather than invented

The paired-comparison literature already contains the failure modes and the fixes, so the programme borrows
them and does not re-derive them.

- **Agent Benchmark Protocol** — the four interchange schemas (task manifest, run configuration, trace
  format, verdict format) and the contamination schedule: scenarios retire from the scored set after their
  fix goes public.
- **tau-bench** — `pass^k` rather than `pass@1`. The fraction of tasks solved on all *k* independent runs.
  It equals `p^k` and therefore decays geometrically, which is what stops a single lucky run from being
  reported as a result.
- **Arena** — grading order: resolve the task first, then compare efficiency in strict order. Wilson
  intervals for proportions, exact McNemar tests on paired outcomes, seeded paired-bootstrap intervals on
  cost and latency deltas, **no blended score**, and a gate that can fail a comparison on significance.
- **nimbalyst rubric** — the shape of an honestly written paired-comparison record: task identifier,
  condition, run order, fixed inputs, harness delta, evidence pointers, a disqualifying-failure field, and
  an explicit list of protocol deviations.

**The metric set is a vector, never a number.** Guard firings by class, task success (a deterministic state
diff, not a model judgement), disclosure completeness, consistency across *k* runs, and cost/wall-clock
deltas. A single blended score hides the trade-off and destroys the ability to tell a difference from
noise — and it would also cancel the one number that matters most, which is that a configuration which
refuses more may be the better one.

## Naming

**Public name: _Paired Evaluation for Agent Governance_.** It lives in this repository's `research/`
folder — a repository of its own was created and then removed, before it had a remote.

The programme name is deliberately **not** "duel", "fight", or "arena":

- **"fight"** reads as spectacle and invites the reading the constraint analysis rules out — brawling
  agents, prize money, a leaderboard. It lands the programme in the occupied lane rather than the open one.
- **"arena"** is the name of the crowded lane.
- **"duel"** stays as the *internal* term for one comparison. It is accurate, and it matches the literature.

Naming the programme for the **property being measured** rather than the spectacle is also the honest
description: refusal, containment, containment-narrowing, disclosure completeness, replayability.

## What the programme is not allowed to claim

It inherits the claim ceiling of the upstream control plane (PRD §2.3) and adds its own:

- No claim that any agent "replaces a community manager".
- No claim that members will feel more valued, more engaged, or better served — no member has been asked.
- No competitor size or adoption number.
- No "first", no "only", no "nobody else".
- The scoped finding, kept in exactly this form: *nothing in the sources searched covers community
  operations as a domain. That is a finding about what was searched, not a claim that nobody ships it.*

## How it relates to Kinship

Kinship ([MIT, open source](https://github.com/Therealratoshen/kinship)) is the control plane. This
programme is **research about measuring agent governance**, and Kinship is its first reference
implementation — not its subject.

The relationship is deliberately one-directional:

- The programme **uses** Kinship unmodified. A Challenge runs the fleet twice and diffs the logs.
- The programme **publishes** methods and results. Kinship does not publish a ranking.
- The reference implementation of the Challenge — the feature a organiser uses to compare two of their
  own configurations — lives in the hosted surface, not here, and is described in
  [`AGENT-VS-AGENT-EVALUATION-2026-10-21.md`](./AGENT-VS-AGENT-EVALUATION-2026-10-21.md)
  §"Challenge Specification for Kinship Host".

## The open question that decides the next step

Not *whether* to build this. Whether one organiser on one community would change a configuration because
of a challenge verdict.

The honest way to find out is to build stage 1 — the deterministic seeded replay — and then watch whether
anybody looks at the output twice. If nobody does, the feature is correctly scoped as a decision aid and
should be described that way, and the programme continues as a methods contribution rather than a
product.

---

**Sources.** Every claim in this document traces to a numbered citation in
[`AGENT-VS-AGENT-EVALUATION-2026-10-21.md`](./AGENT-VS-AGENT-EVALUATION-2026-10-21.md)
§References (42 sources, retrieved 2026-10-21). Nothing here is asserted without one.
