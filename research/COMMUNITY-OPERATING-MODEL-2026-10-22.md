# The community operating model: hours, liveness, and the metrics that lie

**Read on 2026-10-22.** Every claim carries the URL it came from and the date it was read.
Anything I could not verify is in the last section, not in the body.

This is an evidence-layer file: dated and frozen. A later correction is a new dated row in
`DECISIONS.md`, never an edit here.

---

## A. Two clocks, and the reason they are not the same thing

A community has two distinct notions of "now":

- **The member's clock.** When *this recipient* is asleep. Already in Kinship's spec as FR-5.5 —
  quiet hours are the member's local time, and `runtime/src/members.ts` refuses a send outside
  21:00–07:59 in the member's own timezone.
- **The community's clock.** When *a human is on duty to answer*. This is the clock that decides whether
  an unanswered question is a fault, and it is **not** in the spec.

The gap between them is the whole operational question. A community staffed 09:00–18:00 in one timezone,
with members spread across seven, has a third problem: the overlap between them. The SLA literature has
a name for that overlap and a convention for stating it.

### What the SLA literature actually says

An SLA template states three things that bear directly on this:

1. **Service hours name a timezone and a holiday calendar**, and any 24/7 coverage is scoped to specific
   severities. *"Service hours and coverage — The window during which the clocks run. Business hours in a
   named time zone, the holiday calendar you observe, and any severity that gets round-the-clock coverage
   regardless."*
2. **"'Business hours' without a time zone is not a commitment."**
3. **The clock runs only inside the coverage window.** ArcadeDB's SLA is explicit: *"Coverage hours define
   when the response-time clock is running. Requests submitted outside coverage hours will have their
   response-time clock start at the beginning of the next coverage window."*

(`issuelinker.com/blog/sla-template` and `arcadedb.com/sla.html`, both read 2026-10-22. Also
`leadmagic.io/gtm-skills/sla-management` for the multi-region variant: *"FRT clock PAUSES outside business
hours for P2-P4. FRT clock NEVER pauses for P1."* Their worked example: *"Ticket submitted Friday 5:30pm P3
→ clock starts Monday 9am."* Read 2026-10-22.)

### What "quiet hours" means when the audience is a member

Community's own Quiet Hour Protection holds automated messages rather than dropping them, and resends them
after the window ends (`help.community.com/hc/en-us/articles/6029475630227-Quiet-Hours`, read 2026-10-22).
The window is expressed in ET and shifts with daylight saving.

### The design consequence

A community's operating window is a **first-class, declared setting** — not a derived one — because two
communities with identical members must be able to make different promises. And it must be a window with a
timezone, because a window without a timezone is not a commitment.

---

## B. Liveness: what "running but doing nothing" means

This is the failure the community-lead case actually hits. The fleet is up. The process is fine. The
infrastructure is green. Nobody has said anything for eleven days, and nobody noticed, because the
community has no events and no scheduled traffic.

### The failure taxonomy

| Failure | Detection signal | Source |
|---|---|---|
| Dead / crashed | Missed heartbeat | ASP §7; Kaxo |
| Hung / frozen | Heartbeat continues but progress counter does not advance | ASP §7.2.1; GlassFlow |
| Running but doing nothing | *No positive evidence of expected work* | Zylos; ASP |

### The three ideas that matter

**Positive evidence, not absence.** Zylos Research's rule: *"require positive evidence of failure (a closed
connection, a failed probe), never the mere absence of success signals."* And the reason it matters for
agents specifically: *"a healthy agent may sit idle for hours between scheduled tasks, waiting on a human, or
blocked on a long tool call"* — so a silence timer alone will fire constantly on a healthy fleet
(`zylos.ai/zh/research/2026-06-failure-detection-liveness-ai-agent-fleets/`, read 2026-10-22).

**Separate liveness, freshness, and state.** Zylos: they are three independent properties, and collapsing
them into one traffic light is what produces false-offline flapping. Kubernetes encodes this as
liveness/readiness/startup probes.

**Progress, separately from liveness.** The Agent Status Protocol requires a `progressSeq` in every
heartbeat, incremented whenever a step of work completes. A missed heartbeat means *unreachable*; an
unchanged `progressSeq` while work is in `working` means *stalled*. Crucially: *"Tasks that are waiting by
design, such as input-required, awaiting-approval, delegated or queued, do not trigger stalled."*
(`arxiv.org/html/2610.21538v1`, read 2026-10-22.)

That last clause is the one that matters most for Kinship, and it is the one this repo's §1.3 already
encodes from the other direction: a promise to follow up requires a persisted wake row, because **prose is
not a waiting path**. A card sitting in the approval queue is awaiting-approval — alive, not stalled. A
scheduled wake that never fires is stalled.

### The interval

Kaxo's practical threshold: alert when a heartbeat is missed for **1.5x** the expected interval; treat
3x as a runaway loop on the cost-rate axis. ASP's rule is stricter — no event within **2.5x** the declared
interval means *unreachable*.

Kaxo also insists the heartbeat must come from outside the agent's main execution context: *"heartbeats
must be emitted by the agent process itself, not by a watchdog thread in the same process. A deadlocked agent
can hold its own watchdog thread."* And the payload must carry at minimum: agent ID, task ID, current step
or progress indicator, timestamp, and a hash of the last completed action
(`kaxo.io/insights/ai-agent-observability-practitioner-guide/` and `openlegion.ai/en/learn/ai-agent-monitoring`,
both read 2026-10-22).

---

## C. Metrics: which ones lie, and what is unmeasurable by design

### The vanity list, and the reason it is not merely "vanity"

The Mobilisation Lab's *Beyond Vanity Metrics* (2015) defines them as metrics that "are easily manipulated,
are biased toward the short-term, often paint a rosy picture of program success, or do not help campaigners
make wise strategic decisions", and lists list size, petition signature counts, open rates and website
traffic as the common ones. Its proposed substitutes:

- **Rates over aggregates.** *"A rate — such as the number of actions per 10,000 members — can help you
  understand how active and engaged those supporters are."* And the reason is structural: *"Rates are also
  more difficult to manipulate compared to aggregate numbers."* Sending many more emails to increase total
  actions *decreases* actions per mailing — a rate metric reveals that, an aggregate hides it.
- **Cohort analysis**, tracking how the composition of members changes over time.
- **No silver bullet.** *"We didn't find a 'silver bullet' metric that will work for every organization."*
- **A metric tied to your theory of change.** *"The best metric comes from a deep, shared understanding of the
  organization's theory of change."*

(`mobilisationlab.org/resources/beyond-vanity-metrics/` and
`mobilisationlab.org/wp-content/uploads/2019/03/Beyond-Vanity-Metrics.pdf`, read 2026-10-22; companion piece
`ssir.org/articles/entry/moving_beyond_vanity_metrics`.)

The 2025 ASAE piece agrees on the categories — engagement, growth, retention, contribution — and warns that
a spike "might be positive, or it might indicate a problem that stirred controversy"
(`asaecenter.org/resources/articles/an_plus/2025/08-august/measuring-community-success-what-metrics-matter-and-why`,
read 2026-10-22).

### What is unmeasurable here, and how to say it

Kinship's `runtime/src/health.ts` already carries the discipline this needs: an `unmeasured` array naming
what the report *will not say*, with reasons. It states member sentiment is not measured, that member
dormancy is not a signal this runtime may draw, that delivery and reach are not observable without an
adapter, and that why a member suppressed is not the report's to guess.

This is the correct posture and it is unusual — a health read that admits its own blind spots is rarer than
one that invents a composite score. The ARAL/ASAE framing supports it: the answer to a bad metric is not
a better metric but a metric tied to your theory of change. Kinship's theory of change is "the fleet
proposes, a human approves, every action is logged and replayable". The metric that matches it is
**replayability**, not engagement.

---

## D. The parameterisation that follows from the evidence

Everything above reduces to a small set of named parameters. This is a proposal grounded in the sources
cited, not an invention:

| Parameter | Precedent | Notes |
|---|---|---|
| `coverage_mode` | SLA "coverage window" | `always` (24/7) or `staffed` |
| `coverage_timezone` | SLA service hours | Required when `staffed` — a window without a timezone is not a commitment |
| `coverage_days` | SLA standard hours | Named days, not "weekdays" |
| `coverage_hours` | SLA service hours | Local times in `coverage_timezone` |
| `clock_pauses_outside_coverage` | SLA clock-pause; leadmagic's P1 exception | The response clock starts at the next coverage window. Whether a class pauses or not is per-class, exactly as SLA severities differ |
| `heartbeat_interval_ms` | Kaxo, ASP | The agent's declared liveness cadence |
| `progress_seq` | ASP §7.2.1 | Monotonic step counter; distinguishes frozen from slow |
| `stall_after_ms` | ASP `stallAfterSec` | Only counts while work is in `working` — awaiting-approval does not stall |
| `unreachable_after_ms` | ASP 2.5x; Kaxo 1.5x | Missing-signal detection |

The two clocks stay separate, and that is the point: the member's clock is a **refusal** (no send), the
community's clock is a **measurement** (is a human on duty to answer?). Kinship already has the first. It
does not have the second.

---

## E. Could not verify

- **The claim that "90% of members in large communities never contribute"** appears in
  `1827marketing.com/smart-thinking/the-micro-community-advantage-...` (read 2026-10-22), but it is a
  marketing agency's page with no methodology shown. I have deliberately **not** used it above, and it
  should not enter the repo's evidence layer: a number whose method you cannot see is not evidence.
- **Whether any surveyed agent platform implements a community operating window.** I found no project that
  does. Absence in the sources I read, not proof of absence.
- **Kaxo's and ASP's interval multipliers (1.5x, 2.5x, 3x)** are practitioner starting points presented
  as defaults, not measured optima. They are not evidence that those values are correct for any particular
  community.
- **SLA templates are commercial content**, often generated. I used them for the *shape* of the concepts
  (coverage window, timezone, clock pause), which is corroborated by ArcadeDB's own SLA and leadmagic's
  independent skill file — not for any SLA figure.
- **Kubernetes liveness/readiness/startup probes** are referenced by Zylos as the encoding of the
  three-property split. I did not read the Kubernetes documentation itself.
