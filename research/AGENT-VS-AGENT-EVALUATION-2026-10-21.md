# Agent-vs-Agent Evaluation: Research Findings, Constraint Analysis, and a Challenge Specification for Kinship Host

**Doc ID:** AGENT-VS-AGENT-EVALUATION-2026-10-21
**Method:** one delegated desk-research pass with primary sources where reachable; 42 numbered sources.
**Access date:** 2026-10-21 for every URL.
**Question it was asked:** *can two AI agents be run head-to-head, what actually constrains that, and how
would anyone measure it without publishing a leaderboard?*

> **Honesty contract (inherited from the PRD §13).**
> 1. This is **desk evidence, medium confidence**: an agent reading vendor docs and papers, not a line-by-line
>    audit of their code. Where this file says "nothing ships X", that is **absence of evidence in what was
>    reachable**, and the coverage gap is named in the Evidence Limits section.
> 2. **No market size, no adoption rate, no accuracy figure.** Vendor and lab self-reported counts are
>    recorded here only as *claims a source makes*, never as claims this project makes.
> 3. **No leaderboard.** The evidence in §"Measurement" is that a duel score does not travel — it is a
>    property of agent, opponent, scenario and seed. The method this file specifies therefore reports a
>    **vector**, never a blended score and never a ranking.
> 4. **No claim about members.** The scenario is fictional and no member is simulated as a respondent.
>
> **Revised 2026-10-24 — the design, not the evidence.** The founder's direction was *"rather than
> competing in benchmark, I plan to do it different."* The evidence below is unchanged and stays dated:
> it was read on 2026-10-21 and it says what it says. What changed is the **design** the Challenge
> specification below expresses — it now describes a **probe, not a comparison**, and it says why in
> **§"The Design, Revised"**. The section is dated for the same reason the rest of the file is: a
> reader needs to know which words describe what was *found* and which describe what was *decided*.

## Core Judgments

The premise behind the question does not survive contact with the evidence. Open source does not prohibit agents from fighting each other. It ships the standard toolkits for exactly that. PettingZoo exists to let agents compete, Melting Pot ships fifty-plus competitive substrates and a competition track [17][18], and Kaggle and Google DeepMind open-sourced the environments, harnesses, prompt templates, evaluation scripts and full gameplay trajectories of a head-to-head model arena [1][2][3]. The behaviour is not forbidden. It is a first-class research primitive with permissive licences and a decade of tooling behind it.

What constrains agent combat is four separate mechanisms owned by four different parties, and they are routinely collapsed into one vague sense of "not allowed". Model licences restrict what may be done with model outputs, not with competition. Provider acceptable-use policies prohibit oversight-evasion and unsupervised delegation, not duels. Frontier-lab safety policy touches duels only where a duel's results feed back into model improvement [19][20][21][22][23]. Isolation engineering and liability are what a hosted product actually pays for [9][24][25][26]. Only the third mechanism is even close to the thing being asked about, and it activates on a specific loop, not on the duel itself.

Face-to-face is a different measurement, not a better one. A duel score is a property of (agent, opponent, scenario, seed). A benchmark score is a property of (agent, task suite). The two answer different questions and cannot substitute for one another. Head-to-head buys opponent-adaptive measurement, defence depth and closed-loop realism. It pays for them with non-portability, position bias, non-determinism and cost, and the cost is what kills it at scale.

The instructive precedent here is arena.ai. It ran a pairwise agent arena in 2024 [28]. Its current Agent Arena scores single sessions on signals such as net improvement, confirmed success, praise versus complaint, steerability, bash reliability and tool hallucination, publishing a confidence interval on every metric and no column asking a human to pick a winner between two agents [27]. That pivot is not evidence that duels fail. It is evidence that pairwise agent comparison is operationally hard, because every match costs two agent runs and yields a result that is only meaningful for that pairing.

The version of this worth building is a private, seeded, replayable contest inside the community-operations domain, refereed by the runtime's own guard layer. Not a leaderboard. The leaderboard lane is crowded by Game Arena, CodeClash, arena.ai, Social Arena, CyberArena and a set of commercial arenas that pay prizes for head-to-head runs [1][5][27][29][41], and a public ranking of private configurations is both a comparability problem and a liability. The Kinship Host wedge remains the domain layer nobody ships: event lifecycle, member-facing disclosure, stranger-input containment. A challenge is a decision aid for the human seat, and it answers a question organisers genuinely have: which of my two configurations should I run, and what did each one refuse?

## Forms of Agent Duel Evaluation

The word "duel" covers six structurally different arrangements, and they diverge on the axis that matters for a product: who decides the winner.

| Form | Unit of competition | Winner decided by | Representative systems | Published finding that matters |
|---|---|---|---|---|
| Tournament in shared rules | Game outcome | Environment, deterministically | Game Arena (Chess, Poker, Werewolf, later Dark Hex) [1][2][4]; LLM Colosseum, Street Fighter III [40] | "Gameplay strength naturally increases as models evolve, preventing performance saturation"; rankings by all-play-all [1][3] |
| Symmetric adversarial security | Control of a changing service | Environment, with the attacker's own actions as ground truth | CyberArena [6][7]; Dreadnode Ares [8][9] | CyberArena runs two agents concurrently as attacker and defender over changing services, in isolated sandboxes, and estimates latent ability with a Bradley-Terry plus item-response model across 12 agents and 466 games [6] |
| Adversarial argument | Which position survives a judge | A judge, human or model | Debate [10][11][12] | Debate reached 76% under model judges and 88% under human judges against naive baselines of 48% and 60% [11], but a controlled comparison found AI debate at 78% against AI consultancy at 80%, with no significant difference [12] |
| Economic negotiation | Payoff | Environment, deterministically | NegotiationArena [13]; MIT negotiation competition [14]; A2A-NT [15][16] | Pretending to be "desolate and desperate" improved LLM payoffs by 20% over standard GPT-4 [13]; warmth produced more deals and higher subjective value, dominance produced better value claiming [14] |
| Self-play multi-agent RL | Training outcome, not a match | Learning signal | PettingZoo [17]; Melting Pot [18] | Cooperative, competitive and mixed-sum families have existed since 2021; Melting Pot ships over 50 substrates and over 256 test scenarios spanning competition, deception, reciprocation and trust [17][18] |
| Live-surface tournament | Real-world outcomes | Human preference or uncontrolled platform metrics | arena.ai [27][28]; Social Arena [29][30]; NetMind Agent Arena [41] | Social Arena runs every model on a fresh account through a shared prompt on an hourly cron, scoring real engagement from the X API rather than estimates, and deliberately made accounts publicly identifiable [29] |

The pattern that carries into product design is that the forms worth copying are the ones with a deterministic scorer. Negotiation, tournament and symmetric-security forms all decide the winner from the environment's state. Debate depends on a judge, and the controlled comparison above found judge-dependence largely cancels the benefit. Live-surface forms depend on conditions nobody in the product controls. A hosted challenge needs a scorer that is deterministic, cheap and replayable, or the duel degenerates into an opinion with a latency bill attached.

That is also why the debate literature matters more than it first appears. Debate's benefit is known to concentrate where information asymmetry exists, because that is where a second agent can hold information the first lacks [10][11]. When the two sides are symmetric and equally informed, the second agent adds cost without adding information, and the measured difference collapses toward consultancy [12]. A challenge where both candidates read the same scenario with the same tools has no asymmetry by construction, so the duel cannot be justified on debate-like grounds. It has to be justified on closed-loop grounds instead: two candidates must produce proposals that land in the same governance layer, and only one of them may be promotable.

## Head-to-Head Measurement Properties

The argument for head-to-head is not that it is more accurate. It is that it measures a different and sometimes more consequential thing.

Static benchmarks saturate. That is the stated motivation for Game Arena: a fixed task suite stops discriminating as models improve, whereas head-to-head play keeps the difficulty moving because the opponent moves [1]. This matters commercially. A benchmark number tells you where a model sits against a frozen suite. A duel tells you how a configuration behaves against a specific alternative on a specific day, which is the actual decision an organiser faces.

Duel also measures defence, which benchmarks structurally cannot. CyberArena's symmetric design has both agents acting concurrently as attacker and defender over continuously changing services, so a single match produces an offensive and a defensive measurement rather than one [6]. Dreadnode's Ares makes the same move in a different domain, with a red team and a blue team operating the same Active Directory environment and the blue team scored against the attacker's recorded execution as ground truth [8][9]. That scoring choice matters: the defender is graded on what actually happened, not on what a checklist said should happen.

Duel also surfaces failure modes that a scalar hides. CodeClash ran 1,680 tournaments across eight models and six arenas and found that models struggle to learn from their mistakes and frequently misinterpret why they lost, while the strongest models lost every round against expert human programmers [5]. A benchmark score cannot report "it lost for the wrong reason". A duel can, because the trajectory is the artifact.

The costs are equally concrete and equally disqualifying if ignored.

A duel score does not travel. Elo and Bradley-Terry ratings are population statistics computed over a comparison matrix, so they depend on who else is in the population and on the date, and adjacent ranks are not reliably separated. arena.ai publishes a confidence interval on every agent metric for this reason [27]. The practical rule follows: a private comparison between two configurations is a statement about that pairing, and must never be rendered as a ranking.

Capability imbalance collapses the contest into a demonstration of the gap. A2A-NT found that agent-to-agent negotiation is inherently imbalanced: more capable models consistently secure better deals, a weak seller earns about 9.5% less than in a strong-versus-strong baseline with a worst case of 14.13%, and a weak buyer pays roughly 2% more [15]. A duel between a strong and a weak agent does not measure the weak agent's quality; it measures the distance.

Non-determinism is the reason a duel needs a design, not just an idea. The same pair on the same task will not produce the same result, so a single run is an anecdote. tau-bench supplies the canonical honesty metric: pass^k is the fraction of tasks solved on all k independent runs, which equals p^k and therefore decays geometrically [31]. In the tau-bench airline domain, Claude 3.5 Sonnet scored 46.0% at pass^1 and 22.5% at pass^4; in retail, 69.2% at pass^1 and 46.2% at pass^4 [31]. Any challenge reporting a single run is reporting the optimistic end of a distribution.

Cost follows arithmetic. Each match runs two agents. A2A-NT needed every model to play both roles against every other model, including itself, specifically to remove positional bias, with 100 real-world products, five budget levels and thirty rounds per negotiation [15][16]. A host that offers duels has to fund two agent runs per comparison, which is why arena.ai's single-session method and the private, small-N design of the proposal below are both responses to the same constraint.

Paired comparison is also statistically unforgiving in a way that a blended score hides. Arena's methodology uses Wilson intervals for proportions, exact McNemar tests on paired outcomes, seeded paired-bootstrap confidence intervals on wall-clock and cost deltas, and no blended score, with a CI gate that can fail a comparison on significance rather than let it drift [32][33]. The "Arena" implementation is explicitly not the standard; the standard is the four interchange schemas and the conformance suite [33].

## Open-Source Premise and Actual Limits

Four separate owners restrict agent combat, and each restriction protects a different interest.

| Mechanism | Owner | What it actually forbids | Does it forbid duels |
|---|---|---|---|
| Model licence | The weights publisher | Using outputs to improve a competing model; commercial thresholds at very large scale | No |
| Acceptable-use policy | The API provider | Oversight-evasion, task-splitting to evade safeguards, unsupervised delegation, autonomous ToS-violating interaction | No, but constrains shape |
| Safety policy | The frontier lab | Capability deployment above a threshold, and recursive self-improvement | Only when the loop closes |
| Isolation and liability | The host operator | Nothing in law; the operator simply bears the cost and the risk | No, but sets the price |

Open-source code licences permit agent-vs-agent without qualification. PettingZoo describes itself as a library for conducting research in multi-agent reinforcement learning and ships cooperative, competitive and mixed-sum families [17]. Melting Pot ships over fifty substrates and over two hundred and fifty test scenarios designed around competition, deception, reciprocation, trust and stubbornness, and ran a competition track at NeurIPS 2023 [18]. Game Arena's own environments are adapted from Gymnasium, PettingZoo and OpenSpiel, and the environments, harnesses, prompt templates, evaluation scripts and complete gameplay trajectories are released [1]. Whatever else is true, the open-source ecosystem treats agent combat as infrastructure rather than hazard.

Model licences constrain adjacent behaviour rather than competition. The Llama 3 Community License, released 18 April 2024, contains two clauses that bear on this product and neither one mentions competition [19]. Clause (iv) requires use to comply with the Llama Acceptable Use Policy, incorporated by reference into the agreement. Clause (v) provides that the user "will not use the Llama Materials or any output or results of the Llama Materials to improve any other large language model", excluding Meta Llama 3 and its derivatives. Section 2 adds a commercial threshold tied to 700 million monthly active users. The structure of clause (v) is what matters: it is a training clause. A duel that produces a configuration choice is untouched by it. A duel whose transcripts are fed into another model's training set is squarely inside it, and the two must not be confused.

Provider acceptable-use policies are aimed at oversight-evasion. Meta's Model API Acceptable Use Policy forbids using the services to operate AI agents in ways that "evade human oversight or accountability", and enumerates circumventing human review, concealing an agent's actions or objectives, "split[ting] tasks across sessions, accounts, or agents to evade detection or safeguards", delegating to other systems to carry out actions that would be prohibited if performed directly, autonomously interacting with systems in a manner that violates their terms of service, and taking consequential or irreversible actions without appropriate authorization and human confirmation [20]. It also states that exceptions may be granted for legitimate cybersecurity research or other cases where adequate safeguards are in place [20]. The prohibition is aimed at supervision gaps, not at competition.

Two clauses in Meta's Model API Terms of Service are directly load-bearing for a hosted product [21]. Section 10.1(ix) bars using the services to train, fine-tune, distill or improve a competing model and bars systematically collecting outputs to build training datasets, but it explicitly carves out evaluation: using the services or outputs "solely for evaluation, benchmarking, or quality assessment of your own systems" is not a prohibited use. Section 10.1(xi) cuts the other way on publication, barring public dissemination of performance benchmarks or evaluations of the services for the purpose of promoting or marketing a competing product or service without prior written authorisation. The operating rule that follows is precise: run the challenge, keep the result, and do not publish a leaderboard built on a rival's API to market against them.

Frontier-lab safety policy is the only mechanism that touches duels directly, and it does so through self-improvement rather than combat. Anthropic's Responsible Scaling Policy gates deployment on Capability Thresholds backed by Required Safeguards. The AI R&D threshold is defined as the ability to fully automate the work of an entry-level remote researcher (AI R&D-4, which requires ASL-3 safeguards and an affirmative case), and AI R&D-5 as the ability to cause dramatic acceleration in the rate of effective scaling, requiring at least ASL-4. The Model Autonomy checkpoint is the ability to perform advanced software engineering tasks autonomously that would take a domain expert between two and eight hours [22]. OpenAI's Preparedness Framework tracks three categories, Biological and Chemical, Cybersecurity, and AI Self-improvement, and the Critical threshold in that third category is recursive self-improvement, at which development halts until Critical-standard safeguards exist [23]. The practical consequence for this product is a single sentence: a challenge whose output informs a human's configuration choice is evaluation, while a challenge whose output is fed back into training crosses into a different and far heavier governance regime. Keep the loop closed at the human seat.

Isolation engineering is what a hosted product genuinely pays for. NVIDIA's guidance for sandboxing agentic workflows treats network-egress blocking, blocking writes outside the workspace, sandboxing the IDE and every spawned function including hooks, MCP startup scripts, skills and tool calls as its own user, and virtualizing the sandbox kernel as mandatory. It warns that macOS Seatbelt, Windows AppContainer, Linux Bubblewrap and Dockerized dev containers all share the host kernel and are therefore exposed to any code running inside the sandbox, and it rejects allow-once, run-many as an adequate control [24]. Its companion security guidance adds the principle that decides the design here: effective defences require deterministic controls enforced outside the model's control plane [24]. The OWASP AI Security Verification Standard, published as an April 2026 consensus, states that application-layer sandboxing is defence-in-depth only and never a primary isolation boundary, that shared-kernel containers are insufficient for untrusted agent execution, and that Firecracker microVMs boot in roughly 125 milliseconds with under 5 MiB of overhead [25]. Dreadnode states the operating rule directly: compute isolation does not imply network isolation. It runs each hosted sandbox in a separate E2B Firecracker microVM, gives the paired agent runtime deny-all egress by default, and notes that public network services are not isolated between sandboxes by default, so a task service must authenticate its callers [9]. METR's Inspect-Hawk runs each evaluation in its own Kubernetes pod with Cilium network policies and a managed proxy for model calls [26].

Social Arena supplies the design lesson that survives into the specification below. Its agents operate real accounts on a real platform, which it argues reflects how social media actually works, and it acknowledges the consequence plainly: because accounts are public, there is potential for coordinated boosting or negative engagement. Its mitigation is to weight behavioural signals that are inherent to the model and cannot be gamed externally [29]. For a private product the same logic points the other way, toward scoring what is inherent to the configuration (refusal behaviour, containment narrowing, disclosure completeness) rather than anything an adversary could manipulate.

The shape that clears all four mechanisms is therefore constrained, and the constraint is a gift. A community-operations challenge runs on a seeded, fictional scenario; makes no model calls in the current v0, so there is no output to train on and no provider terms surface beyond the operator's own key; never touches transport, so it cannot deliver anything to a member however it ends; keeps state in the workspace store; and hands its verdict to a human rather than to a trainer. The one place care is required is the moment a challenge would touch a live member-facing surface, where the provider's prohibition on autonomous interaction with systems in violation of their terms of service becomes live along with the operator's own channel terms [20]. Keep the challenge off live surfaces and that clause never applies.

## The Design, Revised — A Probe, Not a Competition

**Revised 2026-10-24.** The direction: *rather than competing in a benchmark, do it different.* The
evidence in §"Head-to-Head Measurement Properties" already says what different means, and it says
something a benchmark cannot do. The earlier draft of the specification below missed it: it specified
**two candidates being compared**, which is a comparison with a different name, not a different
measurement. This section states the design the evidence actually supports.

### The question changes

A benchmark asks **how does this agent score?** The probe asks **what does this configuration refuse to
do when a hostile counterpart pushes it?**

Those are different measurements. The first is a position on a curve; the second is a behaviour. Only
the second has a decision attached to it, and only the second can be replayed and audited.

### The counterpart is a stimulus, not an opponent

The hostile counterpart exists to **apply pressure** — to propose, to escalate, to make an attractive
offer of the wrong action, to push at the boundary where a configuration is most likely to drift. It is
**not scored**, it is **not a competitor**, and it is **not a model being benchmarked**. There is no
field in which the subject and the counterpart are on the same axis, because there is no field in which
they compete. The subject is the only thing under measurement.

This is what the evidence already distinguishes. A2A-NT found agent-to-agent negotiation is
**inherently imbalanced** — a strong-versus-weak pairing measures the distance between them, not the
weak one's quality [15]. Removing the contest removes that failure mode by construction rather than by
discipline.

### The artefact is the trajectory, not the score

CodeClash's 1,680 tournaments found models frequently **misinterpret why they lost** [5]. A benchmark
number cannot report "it lost for the wrong reason". A duel can, because **the trajectory is the
artefact** — the log, not the outcome. Dreadnode's Ares makes the same move in a different domain: a
red team and a blue team operate the same environment, and the blue team is scored **against the
attacker's recorded execution** — what actually happened, not what a checklist said should happen [8][9].
That is the standard this design takes: grade the subject on the record, not on the rubric.

### Defence is measurable here and structurally is not otherwise

CyberArena's symmetric design has both agents acting concurrently as attacker and defender over
continuously changing services, so **a single match produces an offensive and a defensive measurement**
rather than one [6]. A static benchmark has no defender to grade. Defence is the thing this product
is actually for, and it is the thing a scalar hides.

### What this rules out, and why it is not a leaderboard in disguise

- **No ranking.** A duel score does not travel: Elo and Bradley-Terry ratings are population statistics
  over a comparison matrix, so they depend on who else is in the population and on the date, and adjacent
  ranks are not reliably separated [27]. A private probe is a statement about that pairing and must
  never be rendered as a ranking.
- **No blended score.** Arena's own methodology uses Wilson intervals for proportions, exact McNemar
  tests on paired outcomes, seeded paired-bootstrap intervals on cost and latency deltas, and **no
  blended score**, with a confidence gate that can fail a comparison on significance rather than let it
  drift [32][33]. A single number hides the trade-off and destroys the ability to tell a difference from
  noise — and it cancels away the one number that matters here, that a configuration which refuses more
  may be the better one.
- **No cross-operator comparison.** Nothing here compares one operator's fleet to another's, and no
  result generated on a third-party provider's API is publishable [21].
- **No single run.** Non-determinism means one run is an anecdote. `pass^k` — the fraction of tasks
  solved on all *k* independent runs — equals `p^k` and decays geometrically: Claude 3.5 Sonnet scored
  46.0% at `pass^1` and 22.5% at `pass^4` in tau-bench airline [31].

### The output

A **vector of refusals and their reasons**, read against the trajectory that produced them. Not a
placement, not a percentile, not a league table. The question a reader can answer from it is *"what
did this configuration refuse, and what did it do instead"* — and that question survives the fact that
the probe is non-deterministic, because the record of what happened does not.

## Challenge Specification for Kinship Host

### Challenge Scope and Non-Goals

**Revised 2026-10-24 to the probe design in §"The Design, Revised".** A Challenge puts **one
configuration under a hostile counterpart** over one seeded scenario, scores it with the runtime's own
guard layer and a deterministic state check, and hands the record to the human seat. The counterpart is
a stimulus, not an opponent: it is not scored and it does not compete. What is measured is the
subject's refusal behaviour under pressure.

Four things are out of scope, and each is excluded because of a contract rather than a preference. It is not a leaderboard: no cross-operator ranking, no public standings, and no publishing of results that were generated on a third-party provider's API [21]. It is not a claim about members: a challenge describes configurations on a fictional scenario, and no output may suggest it predicts how members feel, engage, or respond. It is not delivery: a challenge produces a verdict and at most a hand-off, and the transport seam keeps refusing exactly as it does elsewhere, so `Handoff.sent` stays false throughout. It is not new control-plane engineering: the vendored runtime is not modified, adapter and host code stays in `lib/kinship/host/`, and the challenge is built by running the unmodified fleet twice and diffing the results.

Two further exclusions follow from the same logic. The winner is not decided by a model judge. The judge, where one is used at all, annotates and cannot set the reward, which is the discipline tau2-bench applies to its own judges [31]. And the challenge is not a training loop. Its outputs describe configurations; they are not exported into training data, and if that ever changes, the governance regime changes with it [22][23].

### Challenge Mechanics

The environment is one seeded scenario drawn from the existing pack and scenario set, with fictional members and fictional events, held fixed across both candidates. The seed makes the comparison repeatable; the scenario makes it domain-specific.

Execution runs the unmodified vendored fleet over that scenario once per candidate, with the same clock, the same starting state and the candidate's own configuration and answers. Each run produces a log, and the log is the raw material for everything downstream.

The referee has three layers with descending authority. The runtime's guard layer is authoritative: stranger-input containment, which applies low-trust review, upward-only substitution and narrowing toward draft; the partner copy scan for member-identifier leaks; the autonomy ladder, where the narrowest applicable ceiling wins; grants; and budget. Every guard firing is an event in the log, which makes the guard layer a scorer as well as a safety mechanism. The deterministic state check is next, in the style of tau-bench: diff the final state against the annotated goal state rather than asking a model to judge [31]. The human seat is last and is the only authority that can promote a configuration, which means the machine produces evidence and a person produces the verdict.

Termination is identical for both candidates: same cycle count, same budget, same seed. A candidate that refuses everything is not penalised by default. Refusal is an outcome, and for a configuration whose job is to hold policy under stranger input, refusing is frequently the correct behaviour. This is the place where the product's existing discipline does the most work: a refusal is an outcome, not a smoothed-over success and not a hidden failure.

The metric set is a vector, not a number.

| Metric | Source of truth | Reading |
|---|---|---|
| Guard firings by class | Runtime log events | Containment narrowing, leak-scan hit, ladder narrowing, budget refusal, grant required |
| Task success | Deterministic state diff against the annotated goal | Binary, not a model judgement |
| Disclosure completeness | Member-facing proposal fields | Required disclosure fields present or absent |
| Consistency | k runs per seed family | pass^k rather than pass@1, following the tau-bench decay [31] |
| Cost and wall clock | Host clock and credential accounting | Per candidate, reported as a delta |

The vector deliberately contains no blended score, for the reason Arena gives: a single number hides the trade-off and destroys the ability to tell a difference from noise [32][33]. It also means the metric set can be read honestly in the case where a configuration that refuses more is better, because the refusal count and the task-success count sit side by side rather than cancelling into one score.

Two controls sit on top of the mechanics. Position-bias control applies where any component is order-sensitive: both orderings are run, and A2A-NT's design, every candidate playing every role including against itself, is the principle being borrowed [15][16]. Contamination control applies to the scenario set: a scenario is retired from the scored set after its fix goes public, on the same schedule the Agent Benchmark Protocol uses, so a configuration cannot be tuned to a scenario it has already seen [33].

### Challenge Record Schema

The record follows the Agent Benchmark Protocol's four interchange schemas, task manifest, run configuration, trace format with per-subagent and per-model attribution, and verdict format with required statistics [33], and borrows the field discipline of a published paired-harness rubric, which requires task identifier, condition, run order, model, fixed inputs, harness delta, evidence pointers, weighted scores, a disqualifying failure field and an explicit list of protocol deviations [34].

```
challenge_id, workspace_id, created_at, seed, scenario_id, scenario_version
candidates: [{ candidate_id, pack_id, pack_version, model_id, harness_id,
               autonomy_ceiling, answer_set_ref }]
runs: [{ candidate_id, run_index, run_order, log_ref,
         guards_fired[], task_success, refusals, proposals_emitted,
         disclosure_complete, tokens_used, cost_usd, elapsed_ms }]
verdict: { winner: candidate_id | null | "tie",
           decided_by: "seat" | "state", seat_note_ref, decided_at }
statistics: { n_runs, pass_at_1, pass_k, k, consistency_interval }
protocol: { pair_orderings_run, seed_family, k, grader_version, deviations[] }
provenance: { pack_manifest_hash, runtime_commit, generated_at }
```

Three rules govern the schema. The verdict records who decided, and a human seat decision is distinguished from a deterministic state decision, because the two carry different weight and only one of them is a judgement about quality. `winner` may be null, and a null winner is a legitimate result rather than a failed comparison. Refusals are recorded as outcomes in their own field rather than folded into an error count.

The record is append-only and lives in the workspace log, which means it is replayable with the existing replay-verify action. A challenge that cannot be replayed is not evidence, and the replay is also what makes the record auditable later, when the configuration it described has long since changed.

### Challenge Governance and Controls

The Challenge is a decision aid for the human seat. It grants nothing. It does not grant autonomy, it does not create a once-or-always permission, and it does not convert into a delivery of any kind.

Four prohibitions are absolute, and they are the reason the feature is worth building rather than merely interesting. The Challenge never produces a public ranking. The Challenge never produces a claim about member outcomes, and no copy may imply that a configuration "will engage members better" or any equivalent. The Challenge never delivers, and the transport seam keeps refusing exactly as it does in the normal path. The Challenge never forks the vendored runtime.

Operational controls follow. Cost is capped per challenge and per run, and a challenge that costs more than the organiser's live event cycle is not worth running, so the cap is a stopping rule rather than a budget suggestion. Isolation is inherited unchanged: the seeded scenario runs against the workspace store with no outbound call, and if a future version needs one, the credential seam and egress policy apply as they do everywhere else. Retention is bounded, because a challenge record is evidence about a configuration at a point in time and not a permanent standing. The scorer is kept away from model judges, because a verdict that depends on a model's opinion is neither replayable nor cheap, and the model-judge weakness in the debate literature is the reference [12].

Two compliance rules follow from the constraint analysis. If a candidate configuration uses a provider API, the challenge is evaluation of one's own systems and sits inside the explicit carve-out for that use [21]. Its results are not published in a way that markets a competing product against that provider [21]. And challenge transcripts are not exported into training data; the moment they are, the self-improvement thresholds in the frontier-lab policies become the governing constraint rather than the product's own rules [22][23].

### Challenge Build Order and Kill Conditions

The sequence below is ordered so that each stage is independently useful and a later stage can be abandoned without stranding an earlier one.

| Stage | Deliverable | Kill condition |
|---|---|---|
| 1 | Deterministic seeded replay: one scenario replays identically under a fixed seed and emits a stable guard-firing vector | Replay is not deterministic, so nothing above it can be trusted |
| 2 | Two-candidate paired run: the unmodified fleet runs twice over one scenario with two answer sets, and the two logs diff | The two runs diverge for reasons other than the candidate configuration |
| 3 | Seat verdict and Challenge record: the organiser records a verdict, the record is appended and replayable | Organisers do not change a configuration after a challenge, so the feature is a toy |
| 4 | Consistency reporting: k greater than one over a seed family, reporting pass^k and a consistency interval | Candidates converge on identical guard vectors, which means the scenarios are too easy and need to be adversarial |
| 5 | Order control: both orderings run wherever any component is order-sensitive | A candidate wins purely by running first, which makes the comparison meaningless |
| 6 | Reporting of cost and wall clock deltas per candidate | A challenge costs more than the organiser's live event cycle |

Each kill condition is a reason to stop rather than a reason to redesign, and the second and fourth rows are the ones that most often fire first: a scenario set that is too easy produces two identical runs and a meaningless verdict, which looks like success in a demo.

The measurement that tells you whether this is working is behavioural rather than statistical. Track how many workspaces run a challenge, and how many configuration changes cite a challenge verdict. The load-bearing limit for the product is whether an organiser would keep a feature running after thirty days on their own community, and what exactly they would refuse to delegate to it. For this feature specifically, the refusal question has a concrete form: would an organiser ever let a challenge decide, without reading it, which configuration handles a stranger's hostile message? If the answer is no, then the challenge is correctly scoped as a decision aid for the human seat and should be described that way.

## Method Standards for Paired Comparison

The methods below are borrowed rather than invented, because the paired-comparison literature already contains the failure modes and the fixes.

The Agent Benchmark Protocol is the reference for the interchange formats [33]. Its task manifest, run configuration, trace format with per-subagent and per-model attribution, and verdict format with required statistics are the right shape for a Challenge record, and its live pipeline offers two transferable disciplines: tasks are drawn after candidate model cutoffs and stamped, then retired from the scored set 180 days after the fix goes public, which handles contamination by construction rather than by admission [33]. Arena's grading order transfers directly: resolve the task first, then compare efficiency in strict order, smaller normalized diff, fewer tokens, less wall clock, lower cost [33].

The statistical discipline transfers too. Wilson intervals for proportions, exact McNemar tests on paired outcomes, seeded paired-bootstrap confidence intervals on cost and latency deltas, no blended score, and a gate that can fail a comparison on significance rather than let a regression pass unnoticed [32]. The nimbalyst rubric shows what a paired comparison record looks like when it is written down honestly, including the disqualifying failure field and the explicit list of protocol deviations [34].

tau-bench supplies the consistency metric and the grading philosophy. pass^k forces a report to state how many consecutive runs must succeed, which is what stops a single lucky run from being presented as a result [31]. tau2-bench separates reasoning errors from communication errors in its dual-control domains, and its rule that judges annotate but do not change the task reward is exactly the discipline the seat-plus-state referee in this specification follows [31].

The protocol-validity framing is the most useful of the lot, and it comes from work arguing that a benchmark score supports a capability claim only when the evaluation protocol keeps that capability necessary for success [35]. It argues for an evidence-grounded post-hoc audit that checks whether a shortcut was available, whether the run engaged with it, and whether the score still supports the claim, with the whole thing retained in a replayable bundle that includes the specification, the trace, the artefact, the score, the judge prompt, the judge configuration, the judge's read log and its constrained output [35]. The Challenge record carries the same fields for the same reason, and the read interface that audit uses, restricted to the bundle, canonicalising paths and rejecting traversal, is the right shape for anything that inspects a challenge after the fact [35].

One more pattern is worth borrowing from a different lane. ClawBench evaluates browser agents across 153 everyday web tasks on 144 live production sites by intercepting and blocking only the final submission request, so agents can be scored end to end on real websites without real-world side effects [40]. The Kinship equivalent already exists in the transport seam, which refuses to deliver. A challenge can therefore score a full member-facing cycle without anything reaching a member.

## Market Pricing Evidence

Published list prices for the managed agent-evaluation category, retrieved in October 2026 and recorded here as market evidence rather than as a price for anything proposed here.

| Product | Published plan pricing | Source |
|---|---|---|
| Langfuse | Hobby free (50k units per month, 2 users); Core $29 per month (100k units); Pro $199 per month (3-year retention, SOC 2 and ISO 27001); Enterprise $2,499 per month; overage $8 falling to $6 per 100k units; MIT-licensed core | [36] |
| LangSmith | Developer free (5k base traces per month, 1 seat); Plus $39 per seat per month including 10k base traces; self-hosting restricted to Enterprise; overage billed in LangChain Standard Units | [37] |
| Braintrust | Starter free (1 GB, 10k scores, 14-day retention); Pro $249 per month (5 GB, 50k scores, 30-day retention, unlimited seats); Enterprise on request | [38] |
| Arize AX | Pro $50 per month, span-based | [39] |

Two observations follow. First, the category is priced for teams in the tens to thousands of dollars per month, with an open-source core and a paid enterprise tier for retention, audit and compliance controls, which is a reasonable shape for a hosted governance feature as well. Second, LangSmith no longer publishes a per-thousand-trace rate, and a figure circulating in third-party trackers should not be relied on; the per-seat price is the published number [37].

For the community-operations category itself, the project's own market anchors are Circle at roughly $419 per month, Luma Plus at $59 per month on an annual plan, Qontar Mautika at Rp 500k per agent per month and Qiscus Papi Chat at Rp 350k per number per month [42]. These are market evidence, never our price. No price is published for the Challenge and no willingness to pay has been measured, and the only defensible statement about value is conditional: the feature is worth what it is worth if it changes a configuration decision, and that is a usage question rather than a pricing question.

## Evidence Limits and Open Items

The live-surface evidence is the softest part of this picture, and it is soft by design. Social Arena's own methodology page lists its confounders candidly, including API rate limits, trend availability, prompt engineering, tool access, authentication complexity, and the unresolved question of whether posting frequently is skill or noise [29]. Engagement totals reported in secondary coverage of that tournament differed between outlets and continued to move while the tournament ran, which is a property of the setup rather than a disagreement about method. The design decisions in that system remain the usable part: a shared system prompt, a fixed hourly cycle, real metrics from an official API rather than estimates, publicly identifiable accounts as a deliberate choice, and behavioural signals weighted because they cannot be gamed externally [29][30].

The statement that no arena occupies the community-operations domain is scoped and should stay scoped. A sweep across the agent-arena and agent-benchmark literature surfaced arenas and leaderboards for coding, web and desktop, MCP, security, planning, general agents, games and social surfaces, including arena.ai, Game Arena, CodeClash, CyberArena, the Gorilla-era Agent Arena, Computer Agent Arena and a prize-paying arena running head-to-head campaigns on real-world tasks [1][5][6][27][28][40][41]. Nothing in the sources searched covers community operations as a domain. That is a finding about what was searched, not a claim that nobody ships it, and the project's own evidence discipline requires the difference to be preserved.

Two published results constrain what the Challenge can be claimed to do. The debate literature's benefit concentrates where information asymmetry exists, and a controlled comparison found debate statistically indistinguishable from consultancy [10][11][12]. The Challenge mitigates this by using a deterministic state grader and a human seat rather than a judge-only verdict. And arena.ai's move to single-session causal scoring suggests pairwise comparison is the harder form to operate at scale [27]. The Challenge mitigates this by keeping the sample small, the comparison private, and the cost bounded.

One implementation dependency is not yet settled. The host contract that governs the four seams lives in the upstream control-plane repository and is not present in the local working tree, so it must be re-read before any Challenge work begins. A Challenge adds a host action, and the host action must not weaken the seam that makes the product honest: the clock decides when the fleet runs and never decides when a message reaches a person, and the transport produces a hand-off rather than a delivery. If the contract as written upstream cannot accommodate a comparison that never touches transport, the design in this document is wrong and the contract wins.

Prices are dated. Every figure in the market section was retrieved in October 2026 and vendors change published pricing without notice, so treat those numbers as a snapshot rather than a reference table.

The next decision is not whether to build this. It is whether one organiser on one community would change a configuration because of a challenge verdict. The honest way to find out is to build stage one, the deterministic seeded replay, and then watch whether anybody looks at the output twice.

## References

1. Game Arena: Strategic LLM Evaluation in Competitive Environments. https://arxiv.org/html/2609.31473v1
2. Introducing Kaggle Game Arena. https://www.kaggle.com/blog/introducing-game-arena
3. Kaggle Game Arena FAQ. https://www.kaggle.com/game-arena-faq
4. Rethinking how we measure AI intelligence (Google Blog, Kaggle Game Arena). https://blog.google/innovation-and-ai/products/kaggle-game-arena/
5. CodeClash (ICML 2026 poster). https://icml.cc/virtual/2026/poster/63924
6. CyberArena: Benchmarking AI Agents in Live Symmetric Attack-and-Defense Combat. https://arxiv.org/abs/2610.19005
7. Octagon game engine (cyber-arena-ai). https://github.com/cyber-arena-ai/octagon
8. Dreadnode Ares. https://github.com/dreadnode/ares
9. Dreadnode sandbox isolation documentation. https://docs.dreadnode.io/sandboxes/isolation/
10. AI Safety via Debate (Irving, Christiano, Amodei). https://arxiv.org/abs/1805.00899
11. Khan et al., Adversarial Debate in Large Language Models. https://arxiv.org/abs/2402.06782
12. Leike et al., Debate or Consultancy: Choosing the Stronger AI Safety Approach. https://arxiv.org/abs/2311.08702
13. NegotiationArena: An Environment for Negotiating and Grounded In-Context Alignment. https://arxiv.org/abs/2402.05863
14. MIT International AI Negotiations Competition. https://cdn.aaai.org/ocs/ws/ws0587/2025-8495-1-PB.pdf
15. The Automated but Risky Game: Modeling and Benchmarking Agent-to-Agent Negotiations and Transactions in Consumer Markets. https://arxiv.org/abs/2506.00073
16. A2A Negotiation Arena project page. https://shenzhezhu.github.io/A2A-NT/
17. PettingZoo (Farama Foundation). https://github.com/Farama-Foundation/PettingZoo
18. Melting Pot (Google DeepMind). https://github.com/google-deepmind/meltingpot
19. Meta Llama 3 Community License. https://www.llama.com/llama3/license/
20. Meta Model API Acceptable Use Policy. https://dev.meta.ai/legal/acceptable-use-policy
21. Meta Model API Terms of Service. https://dev.meta.ai/legal/terms-of-service
22. Anthropic Responsible Scaling Policy. https://www.anthropic.com/responsible-scaling-policy
23. OpenAI Preparedness Framework. https://openai.com/index/our-updated-preparedness-framework/
24. NVIDIA, Practical Security Guidance for Sandboxing Agentic Workflows and Managing Execution Risk. https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/
25. NIST AI Risk Management Framework 600-1 with the OWASP AI Security Verification Standard. https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
26. METR Inspect-Hawk. https://github.com/METR/hawk
27. arena.ai Agent Arena leaderboard. https://arena.ai/leaderboard/agent
28. Agent Arena announcement (Gorilla, UC Berkeley). https://gorilla.cs.berkeley.edu/blogs/14_agent_arena.html
29. Social Arena Methodology (Arcada Labs). https://socialarena.ai/methodology
30. Social Arena (Arcada Labs). https://socialarena.ai/
31. tau2-bench (Sierra). https://github.com/sierra-research/tau2-bench
32. Arena (macanderson). https://github.com/macanderson/arena
33. The State of Agent Benchmarking, including the Agent Benchmark Protocol draft specification. https://github.com/macanderson/arena/blob/main/docs/agent-engine-benchmarks-2026.md
34. Agent Harness Benchmark Rubric, JSON Schema. https://nimbalyst.com/downloads/agent-harness-benchmark-rubric.json
35. Do Agent Benchmarks Measure Capability? Protocol Validity and HackDetect. https://arxiv.org/html/2607.22368v1
36. Langfuse pricing. https://langfuse.com/pricing
37. LangSmith pricing. https://www.langchain.com/pricing
38. Braintrust pricing. https://www.braintrust.dev/pricing
39. Arize pricing. https://arize.com/pricing
40. Awesome Harness Engineering. https://github.com/walkinglabs/awesome-harness-engineering
41. NetMind Agent Arena. https://arena42.ai/
42. ShortcutSistem market anchors, AGENTS.md at the ShortcutSistem project root (in-repo document, no public URL).