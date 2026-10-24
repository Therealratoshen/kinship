# Stage 2 — Define: Problem Statement & How-Might-We

**Inputs:** `01-research-notes.md` (6 reports) · `01-empathy-maps.md` (3 maps) · `paperclip-lessons.md`. Research mode: real desk evidence + simulated personas (labeled there; no simulated quote is treated as evidence here).

## Problem Statement Pyramid

### 1 · Problem field (raw findings, unsorted)

- Organisers drown in repetitive event-lifecycle coordination; logistics (not marketing) is the industry's untouched lag — 72% say AI valuable, only marketing-side use is mainstream (EventsAir, n=380+). [E]
- Every delegation option an organiser can actually see is siloed (one bot, one channel), expensive (Circle $419/mo tier), or foreign (no Bahasa/WA-native fit). [E+pattern]
- Organisers *say* they want autonomous AI but withhold write authority; every shipping implementation gates agents behind human approval (Circle AI Inbox; "incumbents gate → buyers demand the same"). [E]
- When ungated AI touches members, it becomes a 6-month brand incident (Microsoft "Microslop") or the community bans AI wholesale (2,808 AI-restrictive subreddits, doubling 2023→2024). [E]
- Agent-only activity evaporates: Moltbook median account lifespan 2.48 minutes, self-spam clusters, leaked 1.5M tokens. Bots are not the retention mechanism. [E]
- Venue-first communities ghost-town (GPT Store retired; 90-9-1; every survivor was tool-first: HF/Obsidian/n8n/Supabase). [E]
- Indonesian agent-builder energy is real but scattered across WA/FB/IG fragments; people literally ask for a local AI community space; no agent-focused ID platform exists (AIClub = general-AI map, not builder venue). [E]
- Contributors aren't motivated by payouts (Gumroad median ~$72/yr; motivation surveys: reputation/learning/distribution dominate; n8n creator program pays $0 and still fills 13,490 templates). [E]
- Sharing is rationed by attribution risk: best workflows go to paying clients, screenshots go public; no venue solved proof-of-work. [E-pattern + simulated Rizky consistent]
- Plain automation (Zapier/n8n) already wins anything without judgment; "agents there = expensive Zapier." Fleet's defensible ground: dialogue state + cross-tool judgment + approvals. [E]
- Community platform OSS yields software users, not communities (Flarum stalled; decade-unmet "OSS Circle.so"); but OSS schemas/SDKs demonstrably attract the right builder audience (Dify/Comfy/LobeHub catalogs). [E]
- Platform-API dependency is existential-grade (Reddit/Apollo $20M→shutdown; FB Groups API killed; WhatsApp repriced twice in 12 months) → adapters must be swappable. [E]
- The owner himself exhibits the trust Say-vs-Do gap: preaches "autonomous," designed "fleet proposes, organiser approves" without prompting. [real, this session]

### 2 · Problem identification

**Themes:**
- **T1 — Delegation is blocked by governance, not capability.** (Siloed bots; approval-gated shipping patterns; trust Say-vs-Do on *all three* maps; Microslop/subreddit backlash.)
- **T2 — Community liveness is an unpaid, repetitive coordination job** (event logistics lag; organiser overwhelm; chapters die between events).
- **T3 — Venues without tools ghost-town; tools create venues.** (Cold-start corpus; GPT Store; n8n/AIClub fragments prove the supply of builders exists with no owned destination.)
- **T4 — Contribution runs on attributable proof-of-work, not revenue share.** (Motivation surveys; attribution rationing; catalog-success pattern.)
- **T5 — Anyone's agents live on someone else's API.** (Repricing record; adapter-swap necessity.)

**Chosen theme: T1, fused with T2** — most emotional weight (organiser exhaustion + fear on both organiser maps) and the clearest Say-vs-Do gap (autonomy praised, authority withheld — Filbert himself is the prime instance). T2 is the *what gets delegated*; T1 is *why nothing gets delegated today*. They are one problem: no supervised delegation layer exists for community work.

**5 Whys from "communities go quiet and events are chaos":**
1. Why? The organiser is the single point of coordination and runs out of time.
2. Why don't tools take the load? Each tool owns one silo; nobody owns the *between*.
3. Why can't an AI take the between-role? Every current option is either dumb-single-bot (no judgment across tools) or ungated (brand-incident risk).
4. Why does ungated fail so hard? Member-facing mistakes cost trust that organisers can't afford to lose — they own the community's name.
5. **Root cause:** agent capability for community work exists, but there is **no trustworthy management layer between what agents can do and what an organiser will let them do** — no approval grammar, no audit trail, no squad governance for community ops. (Paperclip proves this layer for engineering work; nobody has built it for communities. Matches E3 gap-confirmed + paperclip-lessons thesis.)

### 3 · Problem statement (POV)

> **An Indonesian community organiser (Filbert today; chapter organisers like Dewi next) needs to hand the repetitive coordination of community activity and events to a supervised team of AI agents — keeping approval and veto over anything member-facing — because the appetite to delegate is already proven, and what has been missing is governance an organiser can trust, not agent capability.**

- **User:** the organiser segment from the empathy maps (one person owning a community's liveness and its events).
- **Need:** delegation *with retained control* — the feeling shift overwhelmed → in control, without trading it for dread-of-mistakes.
- **Insight (non-obvious, evidence-backed):** organisers' stated desire (autonomy) and revealed behaviour (withheld authority) diverge — and the market's own shipping leader converged on human-gated agents. Trust is the product; autonomy is the marketing of a competitor nobody should imitate literally.

## How Might We... (full format — each with its "so that")

1. **How might we enable** a community organiser **to** approve an agent squad's week of community-ops work in minutes — drafts, queues, veto — **so that she** runs her events and keeps her group alive while feeling **in control instead of overwhelmed**, never exposed to an agent move she didn't sanction?
2. **How might we help** an organiser who fears a member-facing AI mistake **to** grant agents *graduated* authority (flag-only → opt-in auto → full) per channel and action class, visible in one replayable audit trail, **so that he** can delegate more over time with **confidence instead of dread**?
3. **How might we enable** an Indonesian agent builder **to** publish runnable squad packs and event playbooks with unforgeable attribution and usage trails, **so that he** converts "I built this" into **recognition and inbound leads** — the payoff the research says actually motivates him?
4. **How might we help** a scattered network of WhatsApp/Facebook/IG fragments (Rizky's world, AIClub's 264 cities) **to** experience Kinship's value solo — one organiser, one community, zero network required — **so that** the community forms **around a tool already working**, instead of around an empty venue that ghost-towns?
5. **How might we turn** the event itself — kopdar, webinar, hackathon — **into** the fleet's recurring demo and the builders' recurring stage, **so that** organisers get better events, members get status, and growth seeds itself offline-first, the only traction channel the research shows working in Indonesia?

*(HMW 5 deliberately encodes the owner's own constraint-as-asset: he's an event organiser. Half the competitors can't say that.)*

## Feeling-centered value analysis — core use case (event-lifecycle delegation)

**Context:** Organiser runs a meetup in 3 weeks while holding a day job / other projects. Today: manual promo posts, reminder lists, RSVP chasing, sponsor mentions, day-of updates, post-event recap — spread across WhatsApp, Luma/Instagram, spreadsheets.

| | |
|---|---|
| **Pain (verbatim-feeling, simulated-but-grounded)** | "The group dies between events and I can feel it" / "I'm the single point of coordination" → **overwhelm** (fear+anger blend, mid-intensity) layered with **apprehension** (fear): *what if an AI posts something that ruins my group?* |
| **Issue** | Coordination labour is unrelenting and unshareable — every existing delegation option is siloed, priced in USD, or ungated-and-scary. |
| **Gain (mirrored feeling)** | **In control / relieved** (opposite of overwhelmed on the fear axis) *and* **proud** (opposite of the sadness of watching the group decay) — with zero exposure to unsanctioned member-facing action. |
| **Objective — feeling transformation** | overwhelmed + apprehensive → **in control + confident** (supervising a team, not being the team) |

**Worth / price anchors** *(simulated-grade; PRD §2.4 test converts to measured)*:
- Pain intensity: **4/5** (recurring weekly, public-facing stakes; grounded in EventsAir logistics-lag + organiser maps — no primary interviews yet)
- Importance of the feeling: **5/5** (community trust = the organiser's personal brand and, for chapters, sponsor money)
- Before→after gap: **4/5** (removes the job's grind while *protecting* the fear — the gate is what makes the delta safe to feel)

**Implied tier: mid-to-premium for hosted; sponsorship-viable for OSS** — matches the only two monetization shapes with evidence (Circle's $419/mo anchor; Indonesian sponsor-funded community model). Free-tier event-ops agents (CellCog's $5–25/task) prove willingness-to-pay exists at task granularity — an OSS fleet can undercut all of it while keeping the approval gate as the paid-critical feature.

**What would raise the price / prove the worth:** measured before/after delta from PRD phases 1–2 (semantic pair "overwhelmed▁▂▃▄▅▆▇█in control" before vs after the fleet-managed event), plus behavioral signs — re-running the fleet at event #2 unprompted, telling peer organisers, abandoning the spreadsheet workaround. Until then this section is *framing, not pricing*.

## Consistency notes for downstream stages

- POV names **governance as the product** — this must survive Ideate; any shortlisted idea that delivers capability but not control misses the POV.
- "Bundle hub+fleet" decision is compatible: HMW 3/4/5 *are* the hub side, re-sequenced tool-first per E1/E3.
- Watch for drift back toward "another agent marketplace" — T4 says attribution trails, not storefront cuts.
