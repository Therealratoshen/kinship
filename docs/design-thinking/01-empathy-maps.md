# Stage 1 — Empathy Maps

**Research mode:** Simulated. Quotes marked *(simulated)* are constructed examples grounded in the six desk-research reports; quotes marked *(real)* are actual public statements or the owner's own words in this engagement. Plutchik primaries named for pains; gains are the wheel-opposite.

---

## Empathy Map 1 — Filbert, the dogfood organiser

**WHO:** Product owner running Indonesian tech events + an aspiring AI-agent builder community, simultaneously steering ~10 projects; builds with agent squads already (Paperclip, Vapi, n8n). *(profile evidence)*

| Box | Evidence |
|-----|----------|
| **Think & Feel** | Wants the community/event scene to grow *without it becoming a second full-time job*. Worry: one bad AI reply becomes *the* community meme (Microslop precedent makes this rational, not paranoid). Also quiet fear he'll be the only one posting in his own community. |
| **Hear** | Cold-start research: "venue-first communities die." VC money at "agent-employee" frame (Nectar $40.6M). Peers: WhatsApp bots are dumb/spammy. Circle ships agents *with* an approval inbox. |
| **See** | Status quo = a pile of single-purpose bots across WA/Discord/Luma, each owning one silo; lab-run Indonesian AI communities courting the same audience for free; AIClub's 3,976 members organised by province. |
| **Say & Do** | Says: "autonomous platform for community handling." Does: instantly endorsed "fleet proposes, organiser approves" and asked for a PRD before any code — his instincts are governance-first even when his framing says autonomy. **This Say-vs-Do gap is a core insight.** *(real, this session)* |
| **Pains** | **Overwhelm** (fear+anger blend): coordination work that never ends. **Apprehension** (fear, low-intensity): delegating member-facing voice. **Pensiveness** (sadness, low): scene energy going to vendor-run communities he didn't build. |
| **Gains** | **In control** (opposite of overwhelmed) + **pride/agency** (joy+trust): events run, community grows, *his* infrastructure visibly powering it. |

**Say-vs-Do gap:** autonomy rhetoric vs approval-gated practice → he is *himself* the E6 pattern. Design must serve the instinct, not the slogan.

---

## Empathy Map 2 — Dewi, volunteer chapter organiser (AIClub-type segment) *(simulated persona; constructed from reports 1, 5)*

**WHO:** Runs a regional AI chapter (~300–800 members), one city, WhatsApp-first, organises a kopdar meetup monthly alongside a day job. **This is the first *external* organiser proxy — Kinship's real ICP test.**

| Box | Evidence (grounds the simulation in) |
|-----|----------|
| **Think & Feel** | "The group dies between events and I can feel it" *(simulated)*. Wants members to see her chapter as the serious one. Terrified of an automated message that annoys people and gets the group muted/left. |
| **Hear** | Members complain the chat is quiet or spammy *(simulated; matches FB thread asking "Ada discord komunitas AI lokal Indonesia?" — real demand signal for spaces that stay alive)*. Sponsors expect booth-ready events. Global organisers seem to have "AI tools" she can't afford ($419/mo Circle tiers, [real pricing]). |
| **See** | Free options = single bots doing one thing each (Vibebot-style moderation, [real category]); paid = Western platforms with no Bahasa/WA fit; her actual toolkit = WhatsApp + Instagram + a spreadsheet + Luma if the city is Jakarta. |
| **Say & Do** | Says "I want AI to help manage this." Does: forwards the occasional announcement herself, never grants any bot write access, deletes two spam bots last month. **Say-vs-Do gap: appetite for delegation without any granted authority — trust is the bottleneck, not capability.** *(pattern grounded in Botender + subreddit-AI-ban evidence)* |
| **Pains** | **Exhaustion/overwhelm** (fear+anger): the T-7d/T-1d/no-show/recap grind is hers alone. **Invisibility** (sadness): chapters outside Jakarta feel off-map (she organises *because* being seen matters). **Distrust** (disgust-adjacent): anything that auto-posts in the group. |
| **Gains** | **Relief + confidence** (calm opposite of fear; joy opposite of invisibility): "my chapter looks world-class with half the hours." Status among peer organisers. |

**Tension that defines the problem:** Pains (exhaustion) vs Gains (relief) are *mirror images around delegation* — but the See box shows every delegation option she can see is either siloed, expensive, or foreign. Nobody offers her a *supervised team*.

---

## Empathy Map 3 — Rizky, Indonesian agent builder / community member *(simulated persona; constructed from reports 1, 2, 3)*

**WHO:** 26, freelance dev in Bandung; builds n8n/Flowise/LangChain agents; learns via YouTube + IG funnels; lurks two FB groups; forks Flowise templates (the 25k-fork culture, [real stat]).

| Box | Evidence |
|-----|----------|
| **Think & Feel** | Wants recognition and consulting leads, in that order (arXiv motivation survey: intrinsic + reputation > payment, [real finding]). Worries his best workflow gets cloned without credit — the exact fear that keeps supply private (Envato supplier-exodus pattern, [real]). |
| **Hear** | "Sell templates, make $3k/mo" content (self-reported, mostly fiction — Gumroad median ~$72/yr, [real analysis]); peers monetise via courses/consulting funnels, not listings (n8n creator program pays $0, [real]). |
| **See** | Global forums where Bahasa posts die unanswered; local FB groups with no artifacts, only vibes; GPT Store's dead-shelf effect — uploading ≠ being found. |
| **Say & Do** | Says "share your work, build in public." Does: posts screenshots on IG, ships the actual config to paying clients only. **Say-vs-Do gap: sharing appetite vs attribution risk — the venue never solved proof-of-work, so he rations it.** |
| **Pains** | **Stuck/invisibility** (anger/sadness blend): effort with no compounding credit. **Apprehension** (fear): scooped, or drowned in the generic-skeleton flood ("optimize for the screenshot" critique, [real]). |
| **Gains** | **Seen/pride** (joy+trust opposites): attributable proof-of-work that turns into inbound leads — the HF-profile→hiring loop, [real pattern]. |

---

## Cross-map synthesis (feeds Stage 2)

1. **Both organiser maps show the same Say-vs-Do gap in different words:** autonomy praised, authority withheld → the product's core feeling-delivery is *delegation-with-control*, not autonomy.
2. **Builder map matches cold-start + motivation research exactly:** what's missing in venues is attribution/proof-of-work, not audience (audience exists: 200k-star repos, 3,976-member local community).
3. **The three segments need each other in a specific order:** Dewi's events produce Rizky's demos; Rizky's squads become Filbert's/Dewi's fleet; nobody today connects the loop — that's the wedge, and it runs through *events*, matching Indonesia's event-cluster reality and the agent-ops evidence (wedge #1: event logistics first).
