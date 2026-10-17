# Agent-framework and governance-infrastructure landscape

**Doc ID:** AGENT-GOVERNANCE-LANDSCAPE-2026-10-17
**Method:** one delegated desk-research pass, 122 web fetches/searches, primary sources where reachable.
**Access date:** 2026-10-17 for every URL. Where a page 403'd, 404'd or rendered prices client-side, the cell says
so instead of guessing.
**Question it was asked:** *does anyone already ship the governance layer Kinship plans to build — and if so, at
what price, under what license, and can we run it ourselves?*

> **Honesty contract (inherited from the PRD §13).**
> 1. This is **desk evidence, medium confidence**: an agent reading vendor docs, not a line-by-line audit of their
>    code. Where this file says "no product ships X", that is **absence of evidence in what was reachable**, and
>    §6 names the largest coverage gap.
> 2. **No market size, no adoption rate, no hours-saved figure.** Vendor self-reported counts
>    ("300,000+ servers", "97M+ monthly SDK downloads", "10,000+ MCP servers") are marketing and are recorded here
>    only as *claims a vendor makes*, never as Kinship claims.
> 3. Third-party price aggregators are labelled `secondary`. Two `secondary` readings of one vendor page four
>    weeks apart disagreed by ~30% elsewhere in this repo's research — that is why nothing here may be printed
>    externally without a same-day re-read.
> 4. Anything that contradicts an earlier Kinship document is recorded as a **correction**, in
>    `research/COMPETITOR-ANALYSIS-2026-10-17.md` §10 and PRD §13, not absorbed silently.

## 1. Capability presence matrix

✅ ships it · 🟡 partial · ❌ does not. Groups collapse many products; named exceptions carry the source.

| Capability | OSS frameworks (CrewAI, LangGraph, MS Agent Framework, OpenAI Agents SDK, Claude Agent SDK, ADK, Agno, Mastra, Pydantic AI) | Low/no-code (n8n, Dify, Flowise, Langflow) | Workforce SaaS (Lindy, Relevance, Artisan, 11x, Zapier Agents, Gumloop, StackAI) | Support-agent SaaS (Sierra, Decagon, Pylon) | Agent-ops (Langfuse, LangSmith, AgentOps, Helicone, PostHog) | Memory (Mem0, Zep, Letta, Honcho, Cognee, Supermemory) | Enterprise control planes (Agent 365, HumanLayer, Agno AgentOS) |
|---|---|---|---|---|---|---|---|
| Persistent org chart / reporting lines | ❌ roles are prompt-level, per run | ❌ | 🟡 Relevance "Workforces" (unlimited agents on Enterprise) | ❌ | ❌ | 🟡 Letta has channels + server | ✅ Agent 365 registry + map — **inventory, not hierarchy** |
| Scheduled wake / heartbeat | ❌ build it | ✅ n8n schedule triggers | ✅ | ✅ | ❌ | 🟡 Letta sleep-time | ❌ |
| Cross-agent handoff protocol | 🟡 SDK-native (OpenAI handoffs, CrewAI crews) | 🟡 sub-workflow-as-tool | 🟡 | 🟡 | ❌ | ❌ | ✅ A2A v1.0 (LF, 150+ orgs) |
| **Approval gate as a first-class object** | 🟡→✅ CrewAI `humanInputWebhook` + `/kickoff` `/resume` + "Pending Human Input"; LangGraph `interrupt()` is a **primitive, not an object** — you build the reviewer UI; **open feature request for an ApprovalNode (langchain-ai/langgraph#8026)**; Agno "pause runs for user confirmation"; Mastra "await approval before resuming" | ✅ n8n: "sensitive tools pause for human approval before they run" | 🟡 Lindy/Zapier toggles `[UNVERIFIED — docs unreachable]` | ✅ human-handoff + QA gates | ❌ | ❌ | 🟡 Claude Code `permissionMode`/hooks `allow\|deny\|ask`; AgentOS UI |
| Per-action autonomy levels | ✅/🟡 **coding agents only** (plan / acceptEdits / bypass, per-subagent override) | 🟡 node-level | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Budget with a **hard stop** | ❌ none ship one | ❌ | 🟡 credit caps, not per-agent | ❌ | ❌ report only | ❌ | ✅ **LiteLLM**: `max_budget`, `ExceededBudget` blocks, `max_iterations`, `max_budget_per_session` → 429 |
| Cost tracking per run | 🟡 via tracing | 🟡 | 🟡 opaque credits | ✅ | ✅ traces/observations/scores | ❌ | ✅ |
| Audit log **+ replay of actions** | 🟡 traces ≠ replay | 🟡 execution history | 🟡 audit logs Enterprise-gated (n8n audit logs are Enterprise-only) | 🟡 | 🟡 AgentOps "rewind and replay runs with point-in-time precision"; **Langfuse audit logs are an Enterprise tier**; no surveyed SaaS grants replay on a free/self-hosted tier | ❌ | 🟡 Agent 365 logs everything, "does not hard-block them yet" |
| Work products / artifacts | 🟡 | 🟡 | 🟡 | ❌ | 🟡 datasets | ✅ Letta agent files | ❌ |
| Secrets scoping | ❌ env-var leakage is the norm | 🟡 Business tier+ | ❌ | ❌ | ❌ | ❌ | ✅ separate products: Infisical agent-vault, OneCLI |
| Multi-tenancy | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ AgentOS JWT RBAC |
| Channel presence (WA/TG/Discord/Slack) | ❌ | 🟡 via nodes | 🟡 Relevance community agents: Slack/Discord only, **no WA/TG** | ✅ | ❌ | 🟡 Letta | ✅ OpenClaw: Discord, Google Chat, iMessage, Matrix, Teams, Signal, Slack, Telegram, WhatsApp, Zalo |
| Fork/shareable packs | 🟡 templates | ✅ n8n/Flowise template export | 🟡 | ❌ | ❌ | ✅ **ClawHub** — "open by default: anyone can upload", automated checks only |
| Memory scoping | 🟡 | 🟡 memory node | 🟡 | ✅ KB | ❌ | ✅ per `user_id`/session (Mem0 Apache-2.0; Zep bi-temporal Graphiti; Cognee ~$5/workspace/mo) | 🟡 **none scope per-channel or per-audience** |
| Eval/quality harness | 🟡 Mastra built-in evals; OpenAI Evals | ❌ | ❌ | ✅ | ✅ | ❌ | 🟡 |

**Licenses, exact as read:** CrewAI MIT · LangGraph MIT runtime, but "full self-hosting of production workloads
currently requires an enterprise license" (LangChain forum) · Dify "Dify Open Source License … based on Apache 2.0
with additional conditions" · Flowise Apache-2.0 · Langflow MIT · Agno Apache-2.0 · Mastra dual (Apache-2.0 +
Mastra Enterprise License) · Letta Apache-2.0 · Mem0 Apache-2.0 · Zep Graphiti Apache-2.0 · Cognee Apache-2.0 ·
Supermemory self-host binary from a **non-public** codebase · LiteLLM MIT · n8n fair-code · MS Agent Framework /
ADK / Pydantic AI / OpenAI Agents SDK: MIT-or-Apache `[UNVERIFIED per repo]`.

## 2. Commoditised — do not build

Interrupt-and-resume HITL primitives; graph orchestration; trace/span observability and cost-per-run; tool calling
via MCP; **budget hard stops (LiteLLM)**; vector/graph memory with per-user scoping; scheduled triggers; model
routing; secrets brokering; registry publish/install. Kinship **wraps** these. Building another trace viewer is
pure waste; building a token meter when LiteLLM ships `ExceededBudget` is worse than waste, it is a maintenance
liability at 4–5 h/week.

## 3. Real whitespace — absent from everything surveyed

1. **Per-audience governance.** No product treats *stranger messages* as a distinct trust tier with tool
   privileges downgraded. The concept exists in research framing (prompt injection vs jailbreak; indirect
   injection papers), not in a shipped gate. → Kinship spec §1.7 / §2.7.
2. **Event-lifecycle-native state machine** (proposal → scheduled → live → recap → dead) for an *agent fleet*.
   Closest: generic event SaaS, and Apollo inside one Discord container. → spec Part 5 / `event-lifecycle` skill.
3. **Community-specific action taxonomy.** Approvals today are per-*tool*, not per-*speech act*. Nobody surveyed
   distinguishes "a promo post" from "a reminder" from "a no-show nudge" as governance objects. → A-1 / FR-1.3.
4. **A criticism / shatter guard.** Nothing resembling it. → spec §2.6 (still `[INFERENCE]`, still untested).
5. **Bilingual ID+EN content rules as governance.** Absent everywhere.
6. **Fork attribution and usage trail downstream of a registry.** Registries publish and fork; none attributes
   what a fork went on to do. → S2, and the reason `bundled:` must be ours alone.
7. **Identity disclosure as a non-overridable action class.** Legally *expected* in the EU since 2026-08-02
   (Art. 50 transparency: people must be informed they are interacting with AI; machine-readable marking of
   outputs) and shipped **only** in support widgets (Intercom AI labels). The CSA reports that "a significant
   majority of surveyed enterprises … cannot reliably distinguish AI agent activity from human activity."
   **Which regimes bind a self-hosted Indonesian deployment is PRD §12-Q3, an open question — this file does not
   assert one.** What is safe to assert is regime-independent: disclosure is both the industry's unsolved problem
   and a one-line product rule.
8. **The combination.** Org chart + heartbeat + budget hard stop + approval queue in **one OSS control plane
   priced for volunteers**: Agent 365 has registry and audit but no approval and no budget and cannot yet block
   shadow agents; frameworks have approval but no budget; gateways have budget but no approval.

## 4. Buy / integrate, do not build — with names

| Need | Adopt | Why, and the caveat |
|---|---|---|
| Budget enforcement + model routing | **LiteLLM** (MIT) | `max_budget`, `ExceededBudget` blocks, iteration budgets, per-session caps → 429. Free, self-hostable, already solves FR-1.12's hard stop. Caveat: it meters **tokens/requests**, so Kinship still owns the *event-scoped IDR* denomination. |
| Tracing + replay | **Langfuse** (self-host: Docker Compose/K8s; Hobby free → Core $29 → Pro $199 → Enterprise $2,499) or **AgentOps** (point-in-time replay) | ⚠ **Audit logs are an Enterprise-tier feature in both** — and the audit trail *is* Kinship's product. Self-hosting is therefore not a cost optimisation, it is a requirement. Read this as the strongest argument in the file for the open-schema posture in Q4. |
| Memory | **Mem0** (Apache-2.0) or **Letta** (Apache-2.0) | Both self-hostable and Postgres-friendly, which fits the Supabase stack. Neither scopes memory **per audience**, so Kinship keeps the trust tier and buys the store. |
| Secrets | **Infisical agent-vault** / **OneCLI** | Keep tokens out of agent context entirely. The OpenClaw incident (§6) is what happens when this is skipped. |
| Evals | LangSmith / Mastra evals | Do not write a harness. promptfoo is enough for the draft-only invariant and is already proposed in PLAN W9. |
| Channel bridges | per-channel SDKs (grammY, discord.js, WA Cloud API) behind **one bridge interface** | OpenClaw's channel set is the reference architecture, but it is a single-user personal-assistant by design. Do not adopt it wholesale. |

## 5. Standards to adopt, with evidence

- **MCP** — donated to the Agentic AI Foundation 2025-12-09 (Anthropic/Block/OpenAI co-founders); >10,000 active
  public servers; official community registry. Adopt as the tool boundary; do not depend on any single server.
- **A2A** — Linux Foundation, 150+ organisations, stable v1.0. Adopt the *handoff vocabulary*; skip the wire
  protocol until a second runtime exists.
- **AGENTS.md** — the open convention for agent instruction files (AAIF-governed; "60k+ OSS projects").
  **Applied immediately:** `packs/kopdar-ops/agents/*/AGENTS.md` was renamed from `AGENT.md` on this evidence.
- **SKILL.md** — the pack/skill format, already the shape of `packs/kopdar-ops/skills/*/SKILL.md`.
- **AG-UI 1.0** (stable 2026-09-30, has HITL interrupt events; implemented by LangChain/Mastra/ADK/OpenAI SDK/
  Pydantic AI) — **adopt only if** Kinship exposes a web chat surface. Not this quarter.
- **OTel GenAI semantic conventions** — emit them, but **pin versions**: the spec is explicitly under active
  development and lives in a separate repo.

## 6. Complaint-driven → prevention (the risk table this pass produced)

| Sourced failure | Kinship prevention, and where it already lives |
|---|---|
| **11x**: "$60K annual commitment", 12-month minimum, reported "75% churn within 3 months", **fabricated customer testimonials** | Human approves anything member-facing; per-action autonomy; artifacts keep originals; FR-4.4 forbids autonomy-flavoured copy |
| "A dashboard can make a weak campaign look busy" — unverifiable agent claims | Audit replay bound to **real sent payloads**, not agent self-report (spec §1.2, FR-1.2 verified actor) |
| **OpenClaw exposure**: 21,639 internet-exposed instances leaking credentials; 1.5M agent tokens + 35k emails via Moltbook; one-click RCE "in milliseconds" from visiting a page | Secrets never in agent context (§4 above); strangers-as-input trust tier denies tool execution on untrusted text (spec §2.7); redaction + masked-preview rule (spec §1.9.3, FR-1.9) |
| **Registry poisoning**: 341 malicious skills in ~48 h ≈ **12% of one registry**; Snyk ToxicSkills found malicious payloads across scanned skills, majority combining prompt injection | **New requirement (proposed FR-1.14):** a community pack is low-trust input; `bundled:` is claimable only by us; install runs the validator; provenance + review-before-install. The pack format is the attack surface, and we are shipping one. |
| Employees grant agent SaaS access without approval — "shadow AI with elevated privileges" | No-shadow-agents signal (FR-1.11); org-level approval before any connector is granted to a squad |
| Cannot tell agent activity from human (CSA); Art. 50 duty live for EU-facing audiences | Disclosure stamped per utterance, in-payload, non-overridable (spec §2.8, FR-3.4) |
| Runaway token spend / opaque credits | Event-scoped money budget with warn-then-hard-stop (FR-1.12), wrapped on LiteLLM |
| Agents that "just work" get trusted, then fail silently | Flag-only moderation; autonomy granted per action and revocable in one tap (§1.8) |
| **n8n audit logs and LangSmith policy features are Enterprise-gated; OpenAI Agent Builder is being shut down ~2026-11-30** | Vendor lock-in on a governance feature is the failure mode Kinship's OSS posture exists to avoid; the Agent Builder shutdown is a live, dated example and is why we standardise on MCP/AGENTS.md rather than a vendor canvas |

**Net verdict of this pass:** governance primitives are already commoditised **inside codebases and enterprise IT**,
and sold at the enterprise tier precisely where a community organiser would need them. Nobody ships them for an
audience of **strangers**, across **WhatsApp/Telegram/Discord/email**, attached to an **event lifecycle**, at a
price or license a volunteer community can hold. That is the lane, and it is narrower than "AI agents for
communities" — which is good, because narrow is what a 4–5 h/week project can defend.

## 7. Largest gaps in this pass's coverage (read before quoting any of it)

1. **Vendor gating could not be tested from outside.** Lindy/Zapier approval behaviour, Toggy's per-agent gating,
   Ticket Tool pricing, Discord AutoMod/Insights — all either 403/404 or render client-side. Recorded as
   `[UNVERIFIED]`, not as findings.
2. **No hands-on trial.** Nothing here was installed and run. "No framework ships a budget hard stop" is a docs
   reading; a code audit of CrewAI/Agno could falsify it, and the PRD's standing rule (primary source wins, and a
   changelog row records the reversal) applies.
3. **The Indonesian on-the-ground side stayed unreachable** — see the companion file §5. Nobody has counted how
   many kopdar groups run MEE6, Rose, or Apollo; no source licenses an estimate, so no estimate appears here.
4. **Self-reported vendor counts were excluded by policy**, which means this file contains **no adoption numbers
   at all** — including for our own competitive claims. That is the honesty contract working, not a gap.
