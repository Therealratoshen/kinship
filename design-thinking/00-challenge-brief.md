# Stage 0 — Challenge Brief: AI Agent Community Platform

**Date:** 2026-10-17 · **Owner:** Filbert · **Working name in repo:** Kinship (unconfirmed as the platform's name — treated as the project folder, not a branding decision)

## The challenge (as stated)

> "Planning to create an AI agent community platform. This is the starting point — but before that, research whether it's worth my time, and whether it can attract new people to try to use it and contribute."

Two questions sit in front of the design question:

1. **Worth-it question:** given what already exists and what Filbert's assets are, should he spend time on this at all?
2. **Attraction question:** if built, would strangers come, use it, and contribute — not just his existing network?

Only after those is the **design question:** what should the platform actually be?

## Framing evolution (decision log — owner answers 2026-10-17)

Three clarifications landed after the initial brief; they are now the operative frame:

1. **Open source** — the platform ships as an OSS project (see section below).
2. **Autonomous ops layer** — beyond a hub, the platform includes AI agents that keep a community active: engagement, moderation, content, and managing online/offline events. Analogy the owner uses: "like Paperclip (multi-agent coordination/governance control plane) but community-focused."
3. **Bundle + dogfood** — core product = hub + ops agents launched together as one platform; **user #1 for the ops agents is Filbert himself as organiser** (his AI-agent community + his event business), not external strangers.
4. **Differentiation = fleet, not single bot** — owner's explicit positioning: many single-agent community bots already exist (WhatsApp groups etc.); the product is a *management layer for multiple specialized agents* (his analogy: "like Paperclip, but community-focused") covering online events, offline events, and meetups depending on need. The object being built is the coordination/governance plane for a community-ops agent squad — not one more bot.
5. **Beachhead target = aiclub.id** (owner, 2026-10-17) — the first community/event target is AIClub Indonesia ([aiclub.id](https://aiclub.id)): free "Komunitas AI se-Nusantara", **3,976 members / 34 provinces / 264 cities** (site data stamp 2026-10-17), chapter-run offline kopdars (Yogyakarta #1), job/poll/showcase features, general-AI focus (not agent-building). This satisfies the cold-start research's "dominate one dense existing niche" condition instead of building one. **Owner's relationship: PARTNER — can pitch them** (confirmed 2026-10-17). AIClub becomes Kinship's **named first-external-organiser trial** (PRD phase 3 moves from "find 3 organisers" to "pitch AIClub + 2 more"), and the dense-niche entry target for the hub's builder content. Filbert's own event/community work remains the earliest dogfood lane since partner consent precedes deployment. Note the governance nuance: pitching Kinship to a *partner community* means their organisers — not Filbert — become the approval authority; this is the real-world test of the multi-audience governance divergence (paperclip-lessons §2.3).

The evaluation therefore covers a two-sided object:
- **Side A — the hub** (attract builders to share/use/contribute agents) — judged by the original research questions.
- **Side B — the ops agents** (autonomous community/event management) — judged on: does the owner's own pain justify it, do organisers trust agents with their community, and does bundling A+B help or hurt adoption. Side B is validated first on Side A's community (dogfood loop).

## Users under study

| Segment | Who | Why they matter |
|---|---|---|
| Primary-hybrid A | Indonesian tech builders (developers, no-coders, AI-curious attendees of his events) | Cold-start asset: his event-organiser network, Clipper/KOL reach, n8n/voice-AI work |
| Primary-hybrid B | Global AI agent builders | Source of "new people"; also the segment where competition is fiercest |
| Secondary | Non-technical tinkerers who want to *use/fork* agents rather than build them | The contribution funnel's bottom — consumers who become contributors |
| Primary (Side B) | **Organisers** — Filbert first, then other community/event organisers who want agents to run engagement + events | The actual buyer-of-the-ops-layer; his own event business (Clipper, meetups) is the proving ground |

## Scope

**In scope:** demand validation, competitive landscape (global + Indonesia), community cold-start dynamics, contribution motivation, a first coherent product concept, and a go/no-go verdict with a test plan.

**Out of scope (for this process):** full technical architecture, brand/naming, legal entity, any build commitment beyond low-fidelity prototypes.

## Constraints

- **Time:** this is a side initiative competing with FINETIKS (day function) and ~10 active projects. Any concept requiring heavy ongoing ops must be judged against that. *(evidence: own profile — shortcutsistem, Clipper, Voice-AI-Android etc. all active through 2026-10)*
- **Skills:** product owner who delegates code; stack is Next.js/TypeScript/Supabase/Clerk/Vercel — a web community platform is feasible with agents, but ops/moderation is the real cost. *(assumption — not yet validated for community ops specifically)*
- **Assets he uniquely holds:** event organiser network in Indonesia, KOL/creator marketing tooling, hands-on AI agent building (n8n, voice AI, hackathon agents), bilingual EN+ID reach. Most competitors do NOT have the Indonesia events angle. *(evidence: project inventory)*

## Success bar for the verdict (user chose: all three, weighted)

| Lens | Bar |
|---|---|
| Worth-your-time (feasibility) | Runnable at sustainable effort alongside current projects; feeds at least one existing asset (events, Clipper, reputation) even in the worst case |
| Attract users & contributors (desirability) | Evidence-backed path to first ~500 active members and ~20+ external contributors within ~6 months, without paid ads |
| Sustain (viability) | A named model that covers costs (sponsorship, paid tier, events flywheel, or marketplace cut) with precedent somewhere in the market |

## Owner decision (2026-10-17): the platform will be open source

Update received mid-process: Filbert plans to build this as an **open-source project**. Consequences carried through every later stage:

- **Attraction mechanism changes:** open source adds a real, evidence-backed contributor channel (code contributors via GitHub) on top of the content/agent-contributor funnel. These are two different motivations and must be modeled separately in Define/Ideate.
- **Viability question sharpens:** "loved but bankrupt" is the standard OSS failure mode. The verdict must name a license + funding model with precedent (e.g., open-core, hosted SaaS tier, sponsor-funded, foundation).
- **Feasibility improves slightly:** his stack (Next.js/TS/Supabase/Clerk/Vercel) is standard and external contributors can run it locally; but moderation/ops cost is unchanged, and OSS adds maintainer burden (PR review, issue triage).
- **Still-open sub-decisions (not made yet):** license (MIT vs AGPL vs core+enterprise), and whether "the agents/templates" are also open or only the platform code.

## Research mode


**Simulated + real desk research.**

- **Desk research (real):** web research on global AI-agent communities/marketplaces, Indonesian community landscape, and community cold-start/churn evidence. Sources cited with dates; unverifiable numbers marked *unverified*.
- **Primary user research (simulated):** empathy-stage personas and quotes are **constructed examples, labeled (simulated)**, grounded in the desk-research evidence. No pretending these are real interviews.
- **Stage 5 (Test):** cannot fabricate real user tests. It will deliver (a) a written test plan with predictions, and (b) a clearly-labeled simulated dry-run against the personas — the real run is handed to Filbert with an interview guide.

## Open assumptions to revisit in Test

1. Indonesian builders want a dedicated AI-agent platform (vs. staying in WhatsApp/Discord/global forums).
2. Event attendees convert into online community members at a useful rate.
3. Builders are willing to publish agents/templates with attribution rather than keep them private.
4. A newcomer can get meaningful visibility faster here than in established communities.
5. Moderation/ops load stays tolerable alongside 10 other active projects.
6. *(new)* Open-sourcing the platform materially increases external adoption/contributions — and doesn't just add GitHub stars nobody uses (many OSS tools are starred, never run).
7. *(new)* A funding model exists that fits an OSS community platform without VC-scale ambition.
8. *(new)* Organisers (starting with Filbert) trust autonomous agents with real community touchpoints — or will accept agents-in-a-loop with human approval gates.
9. *(new)* Bundling hub + ops agents is an advantage (the hub demos the product) rather than a confusion risk (two value propositions in one).
