# The community-agent landscape, read from primary sources

**Read on 2026-10-22.** Every claim below carries the URL it came from and the date it was read.
Anything I could not verify from a primary source is in the last section, not in the body.

This is an evidence-layer file: it is dated and frozen. A later correction is a new dated row in
`DECISIONS.md`, never an edit here.

---

## A. What exists

The category is crowded, and the crowded part is not the agent — it is the **approval path**.

| Project | URL | What it actually is | Autonomous? | Approval gate | Audit trail |
|---|---|---|---|---|---|
| OpenClaw | `github.com/openclaw/openclaw` | Personal agent runtime; 20+ messaging platforms; community-manager use case is FAQ answers, welcomes, thread summaries, weekly admin reports | Yes | Per skill | Not found in what I read |
| YokeBot | `github.com/yokebots/yokebot` | 40 pre-built agents incl. `CommunityBot` (Discord/forum management, moderation, onboarding, events) | Yes | Not found in what I read | Not found in what I read |
| Chat SDK Community Agent | `github.com/vercel-labs/community-agent-template` | Slack community bot: routes questions, welcomes members, surfaces unanswered threads, flags to a lead; admin panel with activity feed | Yes | "flags issues to a lead" | Activity feed in the admin panel |
| OnBuzz Community | `github.com/Loxia-ai/onbuzz-community` | Persistent multi-agent Discord team: support, community manager (tracks unanswered discussions, engagement drops, recurring friction), event/challenge, manager (delegates, validates outputs, follows up on unfinished work) | Yes | Manager agent validates | Not found in what I read |
| Hermes Agent | `hermes-agent.nousresearch.com/docs/user-stories` | OSS agent; connectors to Telegram/Discord/Slack/WhatsApp/Signal/email | Yes | Documented case: DM approval gate for kid-facing Discord bots | Not found in what I read |
| Zealy MCP server | described in `zealy.io/blog/can-an-ai-agent-run-your-community` | Reads freely; **cannot change anything without a person approving that exact change** | No | Yes — approve the exact change | Not found in what I read |
| CopilotKit Channels SDK | `aideveloper44.com/product/channels-sdk-...` (SDK; upstream `github.com/copilotkit`) | MIT library for deploying agents into Slack/Teams/Discord/Telegram | Yes | Supports human-in-the-loop approval gates | Not found in what I read |
| LobeHub "Community Manager" | `lobehub.com/agent/h0yzny3d/` | A **prompt template**, not code: triage Reply/Watch/Escalate, weekly digests, AMAs, release rituals | Prompt | Prompt-shaped | None — it is prose |
| KAI (AmaZix) | listed at `aiagentstore.ai/ai-agent/kai` | Web3 community manager for Telegram + Discord | Yes | Not found | **Closed source** per the listing |
| ProductiveBot | `productivebot.ai/blogs/resources/telegram-discord-ai-community-manager` | Commercial product built on OpenClaw; FAQ answers, welcomes, broadcasts; phone approval | Yes | Yes — approve from phone | Not found in what I read |
| awesome-openclaw-agents | `github.com/mergisi/awesome-openclaw-agents` | 205 prompt templates incl. a Community Manager for the agent social layer | Prompt | Prompt-shaped | None |
| x402-community-agent | `github.com/Wintyx57/x402-community-agent` | JS, 1 star, AI community manager for the x402 Bazaar | Yes | Not found | Not found |

Stars, where a number was visible in the source I read: OpenClaw "over 300,000 in less than 60 days", and
"more than 374k stars and more than 77k forks as of May 21, 2026" (`tryopenclaw.io/blog/what-is-openclaw`,
read 2026-10-22). `x402-community-agent` showed 1 star and an update date of Mar 11, 2026.

**The honest read.** Most of this list is a *framework plus a prompt*, not a governance model. Three of the
twelve entries are prompt templates with no code at all. Two are closed source. The two entries that make
governance their subject — Zealy and OnBuzz — are the smallest and newest.

---

## B. The seven hard problems, with evidence

**1. The human in the loop is a code path, and code paths fail like software.**
Discord states in the present tense that a member of its Trust & Safety team always reviews flagged content
before any action is taken. TechCrunch reported on 7 July 2026 that a bug in Discord's AI image moderation
"mistakenly banned more than 8,000 users over the past two months" over harmless images including
spreadsheets and chessboards. Both are true at once. (`zealy.io/blog/can-an-ai-agent-run-your-community`,
read 2026-10-22.)

**2. The Digital Trust & Safety Partnership's answer is confidence tiers, not a binary.**
Its September 2024 report states it is common for trust-and-safety teams to enable automated enforcement
without human review when confidence is high, and that human review is not infallible. The design it
describes: at lower confidence the system takes the smallest reversible action and *then* asks a person.
(`zealy.io/blog/can-an-ai-agent-run-your-community`, read 2026-10-22.)

**3. Wrong information needs provenance, not a disclaimer.**
Zep: "Provenance. Every fact traces back to the source it came from, so a grounded answer can cite where it
learned something and a wrong fact can be audited rather than guessed at." (`getzep.com/ai-agents/reducing-llm-hallucinations/`,
read 2026-10-22.) Statsig adds the mechanism: route every response through context guards that require
evidence, block or route to review what is not grounded, and keep a claim-to-evidence map per session
(`statsig.com/perspectives/agenthallucinationsdetect`, read 2026-10-22).

**4. Multi-agent systems make the wrong answer compound.**
Armalo: an agent that writes incorrect information to shared memory infects every agent that reads it, and an
agent citing another agent's output creates a feedback loop reinforcing false beliefs. It maps this to EU AI
Act Article 12 (record-keeping — outputs of high-risk systems must be loggable) and Article 14 (human
oversight throughout the period of use). (`armalo.ai/learn/multi-agent-swarm-knowledge-drift`, read 2026-10-22.)
arXiv 2606.04990 separates *execution provenance* from *evidence tracing* and notes neither is satisfied by
ordinary logs (`arxiv.org/html/2606.04990v4`, read 2026-10-22).

**5. Silence is ambiguous.**
Zylos Research (2026-06-10): "A quiet producer may be healthy-but-idle or dead, and no staleness timer can
tell the difference." Its core rule: require positive evidence of failure, never the mere absence of success
signals; separate liveness, freshness, and state; a byte-level watchdog at roughly 3x the keepalive interval
catches half-open connections. It also states what makes agents different: a healthy agent may sit idle for
hours between scheduled tasks, waiting on a human, or blocked on a long tool call — so connection monitoring
answers the first two layers and only behavioural monitoring answers the third
(`zylos.ai/zh/research/2026-06-10-failure-detection-liveness-ai-agent-fleets/`, read 2026-10-22).

**6. Most agent failures are silent, and a frozen agent is indistinguishable from a slow one.**
GlassFlow: most agent failures produce no error code, no alert, no failed status; a frozen agent "has stopped
making progress without crashing, erroring, or completing," and in any system reporting only completed runs it
is indistinguishable from a slow healthy one indefinitely. A progress heartbeat is the only reliable detection,
and only while the run is live (`glassflow.ai/blog/ai-agent-failure-modes`, read 2026-10-22).

**7. The standard monitoring triad misses the interesting failures.**
Kaxo: alert on heartbeat absence, cost-rate anomaly, and tool failure rate — and the cost-rate anomaly needs
*both* bounds. The lower bound "catches silent death: the agent stopped processing entirely but no error
fired"; the upper bound catches runaway loops. It also names the failure everyone skips: thread-ID propagation
from the first agent to every tool call, without which a multi-agent failure is an isolated event rather than a
traceable chain (`kaxo.io/insights/ai-agent-observability-practitioner-guide/`, read 2026-10-22).

---

## C. Governance patterns in use

| Pattern | Where it appears | What it does not do |
|---|---|---|
| Human approval queue | Zealy; ProductiveBot; Hermes DM gate; Chat SDK template | Does not make the human's judgement auditable, and per problem 1 the gate is itself software |
| Confidence-tiered action | DTSP via Zealy write-up | Does not give a *replay* of what was decided |
| Reversible middle action | DTSP: temporarily downrank rather than ban | Does not scope by action class |
| Named, revocable grants | Zealy ("cannot change anything without a person approving that exact change") | Per-org, not a taxonomy |
| Flag-only moderation | Kinship's own bundled pack (D35/D37) | — |
| Replayable audit log | Found in **no** surveyed project | — |
| Per-action-class autonomy | Found in **no** surveyed project | — |

The last two rows are the finding. Every surveyed project treats governance as *a gate* or *a tier*. None
treats it as *a vocabulary* — a closed list of what may be done, each entry with its own rules, and a log
that replays.

---

## D. The gaps no surveyed project closes

1. **A closed action-class vocabulary with a per-class autonomy level.** A class absent from the toolset is
   *absent*, not denied — so a reviewer greps the tool list and finds nothing, rather than finding a refusal.
2. **An audit trail that replays.** A log you can re-run and get state back exactly. No surveyed project
   offers one; they offer activity feeds and approval queues.
3. **Approval bound to a content revision.** Editing a draft after approval should void the approval, not
   silently ride on it.
4. **No ghost watchers.** A promise to follow up requires a persisted monitor row; prose is not a waiting path.
   §1.3 of Kinship's spec is the only statement of this I found.
5. **A place for a human's attention.** A community's queue is a human's attention, not an agent's worklist —
   the inbox of the person who opens the thing on a Tuesday morning, not a per-agent todo list.
6. **Distinguishing the member's hours from the community's hours.** Quiet hours are the recipient's clock
   (FR-5.5). The *community's* operating window — when a human is actually on duty — is a different clock,
   and it is the one that decides whether an unanswered question is a fault.

---

## E. Could not verify

- **Star counts and commit dates** for OpenClaw, YokeBot, Hermes, OnBuzz, Chat SDK template, CopilotKit,
  Zealy, LobeHub, ProductiveBot, awesome-openclaw-agents: I read the pages surfaced by search and the
  figures quoted above; I did not fetch each repository's own API or commits page. Treat the numbers as
  "as reported by the page I read on 2026-10-22", not as a live count.
- **Whether any surveyed project has an audit trail.** Absence of evidence in the sources I read. I did not
  read the source code of any of them.
- **Zep, Statsig, Armalo, Kaxo, Zylos, GlassFlow** are vendor or research-adjacent sources, not
  independent audits. They are cited for what they *state*, not as neutral verification.
- **The Agent Status Protocol (arXiv 2610.21538)** is a specification, not a deployed implementation. Read
  `arxiv.org/html/2610.21538v1` on 2026-10-22.
- **No project I found publishes a community-agent benchmark**, so "best" in the award sense is not measurable
  from public evidence.
