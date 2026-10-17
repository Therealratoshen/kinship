# Competitor analysis — what to add, what to buy, what to refuse

**Doc ID:** COMPETITOR-ANALYSIS-2026-10-17
**Status:** evidence + decision document. Answers the owner's question — *"what feature to add or tool or skill or what else"* — as an add/borrow/skip table, not a market survey.
**Companion:** `research/PAPERCLIP-OSS-STUDY-2026-10-17.md` (the reference implementation). This file covers every lane Paperclip is *not* in.
**Method:** two parallel web-research passes over primary vendor pricing pages, API docs, and ToS; plus one read-only study of the owner's own local Paperclip skill files. Nothing here is a memory recall — every pricing row carries the URL and the access date, and rows that could not be loaded are marked.
**Access date for all URLs:** 2026-10-17.

> **Honesty contract, inherited from the PRD and unchanged.**
> 1. Pricing is a **date-stamped observation, not a quote.** WhatsApp/Meta prices are country-specific, change without notice, and are not published in IDR by Meta. Anything converted to rupiah is arithmetic on a live FX rate and is labelled `[INFERENCE — arithmetic]`.
> 2. **No market size, no adoption rate, no hours-saved figure appears in this document.** None of the sources license one. The banned "21,500 AI-talent gap" figure does not appear here either (E7).
> 3. Where a competitor page would not load, this file says so instead of guessing its price.
> 4. The **governance-primitives claim** ("CrewAI/LangGraph ship none") is an agent's reading of framework docs, graded ⚠️ below — it is a strong signal, not a line-by-line source audit. It changes nothing about *our* obligations, only about how much we can claim as novel.
> 5. Claims about our own codebase are `[VERIFIED — path]` only where the path was actually read.

---

## 1. The finding that reorders everything

**The venue is not automatable at kopdar scale, and almost nobody says so out loud.**

> **⚠ CORRECTED 2026-10-17 — third reversal in this document, and the sharpest one.** The first version of this
> section asserted that WhatsApp groups "cannot be automated by anyone" and that the Business Platform API has
> *Message* and nothing else. **That is no longer true, and the replacement fact is more useful than the old one.**
> Meta publishes a **WhatsApp Groups API** at
> <https://developers.facebook.com/documentation/business-messaging/whatsapp/groups> (read 2026-10-17): it is
> "now open to all businesses with an **Official Business Account (OBA)**," supports **send and receive in groups**
> and removing participants, up to 10,000 groups per business number. The conclusion of this section survives —
> the *reason* in it does not, and D11's basis is amended by a new dated entry rather than edited
> (`DECISIONS.md` D13).

What the primary doc actually says, and why the decision stands anyway:

- **`Max group participants: 8`.** A kopdar WhatsApp group is 100–500 people. The official group-send capability
  therefore cannot reach the venue it would need to serve. This is a *product* limit, not a policy choice of ours.
- **"Groups are not available for WhatsApp Business app phone numbers."** The group lane needs a Cloud API number
  under an OBA — not the number the organiser actually hosts the group on, which is usually their WhatsApp
  Business **app** number or a personal one.
- **No edit or delete in groups, and "performance metrics are not available for message templates used in
  Groups."** So even inside the eight-person envelope, an agent could post and could not withdraw or measure.
- Older surfaces still read as "not supported": WhatsApp's business-platform page splits group management as
  Business App only, and the BSPs say it plainly — **Twilio:** "WhatsApp does not currently support group chats"
  <https://www.twilio.com/docs/whatsapp/guidelines-whatsapp-cloud-api> · **Gupshup:** group management is
  "available only on WhatsApp Business App … not supported via the WhatsApp API"
  <https://docs.gupshup.io/docs/wa-business-app-and-business-platform>, both 2026-10-17. **The most likely reading
  of the disagreement is that Meta opened the API after those pages were last revised — which is precisely the
  drift risk the access-date note in §2 warns about.** Anyone quoting this section re-reads the Meta group doc on
  the day they quote it. **If Meta raises the 8-participant cap, §7 item 9 and `DECISIONS.md` D11 both change and
  this section stops being true** — that is the falsifier, named in advance.
- Meta's Commerce Policy still prohibits automated account creation, scraping, and bulk group-joining.
  <https://www.facebook.com/legal/commerce-policies>, 2026-10-17.

**Consequence for the competitive set.** "Cannot be automated" needs precision, because it is not literally true
that *nothing* can post into a WhatsApp group. Unofficial WhatsApp-Web automation exists and is free — **WAHA**
(WhatsApp HTTP API, self-described as 100% FOSS, webhook delivery, group-capable sending;
<https://waha.devlike.pro/support-us/>, access date unreliable — see §2 coverage note) is the clearest product
form, **Baileys** (MIT, 11,355★, pushed 2026-10-17 — actively maintained, so this is not a dead experiment;
<https://github.com/whiskeysockets/Baileys>) is its library form, and India-market tools like **Thikaa** (from
$9.99/mo; <https://thikaa.com/pricing>) package it. What is true, stated precisely: **the official route is capped
at 8 participants and gated on an OBA Cloud API number; everything beyond that runs through unofficial libraries
against Meta's commerce policy.** So a product advertising "AI community manager for your WhatsApp group" in the
Indonesian market is doing one of six things: (a) unofficial web automation à la WAHA/Baileys, carrying the ban
risk on the *organiser's own number*; (b) human-in-the-loop assist where a person copy-pastes; (c) a
**Community API** broadcast product — a different venue, channels rather than groups; (d) a **customer-service /
broadcast** product mislabelled as community management; (e) the official Groups API inside its eight-person
envelope, which is a small-team chat, not a community; or (f) simply ignoring WhatsApp, which is what every
Western community SaaS does (§2). Qontar Mautika's "broadcast to multiple WA groups" and Qiscus Papi Chat's "blast
message to WhatsApp groups" sit in (b)/(d) — the *sender* is a human operator inside the app, and neither product
is an agent fleet. **Luma Plus is the case that stings: its own pricing page sells "Blasts and automated reminders
via email, SMS, push notification and WhatsApp"** <https://luma.com/pricing>, 2026-10-17 — a paid event venue is
already running the reminder lane we intended to claim, which is why §5's sequence keeps the fleet's value in the
*lifecycle and the governance*, not in the act of reminding.

**Why (a) is a real decision and not a free feature.** WAHA-class automation would let us demo exactly what
organisers ask for. It would also put the organiser's phone number — which for a kopdar host is frequently their
personal number — one ToS enforcement action away from a ban, on a tool we do not control, at a price of $0 with
no support and no bus-factor cover. The posture this document recommends keeps the capability off the product
surface and leaves the choice, if the owner ever wants it, as an explicitly-labelled third-party integration with
the risk stated on the page that offers it. **`[INFERENCE — judgement, not a source]`**

**Consequence for Kinship, stated as a design rule.** We do not claim WhatsApp group automation for communities.
We ship: (i) full agent-driven operation on **Discord, Telegram, and email**, where the APIs are open and free;
(ii) **WhatsApp as a read-and-draft lane** with a human pasting, plus approved *template broadcasts* to
individuals where the organiser legitimately holds a WhatsApp Business number; and (iii) the official Groups API
is a legitimate, disclosed integration **for what it actually is** — a ≤8-participant working group on an OBA
number — which is worth naming because it is the accurate answer to the question a competitor will try to ask.
That is a **limitation we disclose**, and disclosing it is a competitive asset: it is the only accurate claim in
the Indonesian field, and it is what the "flags / the human acts" boundary in `packs/kopdar-ops/` was already
reaching for. The pack's `❌ no WhatsApp auto-send` rule now has a citation behind it — and the citation states a
**number**, not a prohibition.

---

## 2. Lane map, priced

Prices verified 2026-10-17 from the named URL. `—` = could not verify.

| Lane | Representative products | Verified pricing anchor | What they actually ship | Kinship's relation |
|---|---|---|---|---|
| **Community-platform SaaS with shipped AI** | Circle, Bettermode, Skool, Common Room, Slack AI | Circle **$89 / $199 / $419** per month + Email Hub +$99, AI Agents "included for Circle Plus … at no additional cost in 2025" <https://circle.so/pricing> · Bettermode **$149** (AI Spam Detector) / **$1,500** (Ask AI), Premium custom <https://bettermode.com/pricing> · Skool **$9** Hobby (10% tx fee) / **$99** Pro (2.9%) <https://www.skool.com/pricing> · Slack Business+ **$18/user/mo** with Advanced AI, Enterprise+ $45 <https://slack.com/pricing> · Common Room Essential **$2,500/mo billed annually — 5 seats, 100k contacts, 5k RoomieAI credits — now read off the vendor page itself** <https://www.commonroom.io/pricing/>, which **resolves this file's earlier $375-vs-$2,500 disagreement in favour of the higher figure** (Advanced/Enterprise custom, 15/30 seats). **Acquired by Zoom 2026-07-02** (terms undisclosed), repositioned as **buyer-intelligence/GTM**: Person360, Enrichment, Prospector, AI Scoring, RoomieAI, MCP & CLI, Auto Dialer <https://news.zoom.com/zoom-to-acquire-common-room-bringing-buyer-intelligence-to-its-ai-revenue-platform/> | Digest + answer-bot + auto-moderation, mostly **autonomous and read-side**. True "agents" sit behind the $419 tier; member intelligence behind $2,500. **Zero WhatsApp coverage, zero self-host, zero event lifecycle.** Circle's "AI Agents" is one persona with a global pause, not a fleet with per-action autonomy | **The undercut target and the proof of appetite, not the model to copy.** Their global-pause-vs-per-action-autonomy gap is exactly add-list item A-1. **Second-order finding: Common Room has left the community-ops lane** for revenue intelligence at $2,500/mo, which removes the "nearest competitor" reading of Milestones/Rallies for *volunteer* communities and empties the member-intelligence slot for meetups — where churn/re-invite work belongs to an agent with a budget, not a dashboard a kopdar cannot afford. **Orbit is unreachable** (orbit.co 301-redirects to an unrelated site; no sunset notice found — absence of evidence, not proof of shutdown). ⚠️ Circle/Skool/Slack tier pages render prices via JS; some tier-to-capability mappings came back `[UNVERIFIED]`. Access date unreliable (§2 coverage note) |
| **The free volunteer-bot layer (the actual incumbent)** | Discord: MEE6, Carl-bot, Dyno, Arcane, Ticket Tool, Wick, Session Replay, Apollo, **Discord AutoMod** · Telegram: GroupHelp, Rose/MissRose, Combot, Shieldy | Discord AutoMod **free, built in** <https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ> · MEE6 free tier + Premium **$11.99/mo / $49.99/yr / $89.99 lifetime**, AI as a separate subscription (figures via a **competitor-written** page, not verified against vendor <https://www.vibebot.gg/blog/mee6-pricing-explained>) | Levelling, welcome messages, reaction roles, keyword automod, timed posts, ticket queues, anti-raid — **and, in Apollo's case, the whole Discord event loop: recurring events, button signups with per-option capacity and auto-waitlists, up to 5 custom reminders, upcoming-event digests, gcal sync, cross-server posting, auto-archive. Combot adds scheduled posts (30/chat) and AI at "$1 for 1,000 tokens".** Apollo free ≤5 recurring events/1 reminder; Premium $8/mo ($6/mo at $72 annually); Pro $25/mo ($20/mo at $240) <https://apollo.fyi/premium> · Combot Pro $9.99/mo, Business $100/mo <https://combot.org/> · MissRose free but **"Rose is not open source"** <https://missrose.org/FAQ/> · Shieldy MIT 957★, last push 2026-02-09 <https://api.github.com/repos/1inch/shieldy> · GroupHelp's OSS repo 38★, last push 2024-11-08 (≈dead) and its site would not load — GPL-3.0 re-creation only — all free or near-free, already inside the venue | **Not competitors — substitutes for features we might waste months building.** §5 "do not build" list is written against this row. **⚠ CORRECTED 2026-10-17: this row's earlier claim that bots cannot do "event lifecycle" was too generous to us — Apollo ships create→remind→signup→waitlist→digest inside Discord for $0–25/mo.** What is still absent from every bot in this row: **cross-channel** operation under one state machine, RSVP→no-show→re-engagement sequencing, sponsor reporting, per-action approval governance with once/always grants, replayable audit a member or sponsor can be shown, bilingual ID+EN drafting rules, and cost-per-event in the organiser's currency. The wedge is the lifecycle *chain* and the governance, not "events". Also: the AutoMod citation above could **not be re-read** — support.discord.com returned **403 (Cloudflare)** in the second pass, so "AutoMod ships built-in and free" now rests on absence of contradiction in blog/patch notes, i.e. **negative evidence, not a verified quote**. Vendor self-reported counts ("300,000+ servers, 29M events, 102M signups") are marketing, not adoption data, and are not used anywhere in this repo |
| **WA community/broadcast SaaS (ID)** | Qontar Mautika | Rp 500.000/agent/mo, 2 concurrent devices, 1,000 broadcasts/mo, 1,000 contacts <https://qontar.com/id/whatsapp-community-management-pricing/> | Human-operated multi-device WA + broadcast + CRM pipeline | **Not a fleet.** A seat-priced inbox. Undercut is not the point; it is a different job |
| | Qiscus Papi Chat | Rp 350.000/number/mo, unlimited users, 14 days <https://qiscus.id/pricing> | Broadcast + CS helpdesk, group blast, auto-reply, drip | Same. No event lifecycle, no agents |
| | SleekFlow (SEA) | "Free" tier + "price on quote" — no figures published <https://www.sleekflow.io/en/pricing-1> | Omnichannel commerce conversations | Opaque pricing is the opening, but it is CS, not community ops |
| **WA API BSP (the honest path)** | Meta direct | **Meta publishes no rupiah or dollar figure for Indonesia** — the country sits under "Rest of Asia Pacific," so every rate is a reseller's. Reseller rates disagree by ~30%: SleekFlow marketing **$0.04727** / utility $0.02875 (2026-09-04) <https://help.sleekflow.io/en_US/whatsapp/pricing> · flowcall marketing **$0.0411** from 2026-10-01, utility/auth $0.025 <https://www.flowcall.co/blog/whatsapp-business-api-pricing> · ChatMaxima **Rp 586.33** marketing / Rp 356.65 others +11% VAT <https://chatmaxima.com/whatsapp-api-pricing/indonesia/>. Structural facts that *are* Meta-sourced: per-message billing since 2025-07-01, service conversations free since 2024-11-01, utility templates free inside an open window, 72 h free entry-point from click-to-WhatsApp ads, and **in-window service replies become billable from 2026-10-01** <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing> | Per-message, per-country, template-gated, 24 h policy window, template review, **recurring UTILITY→MARKETING reclassification**, 3-day quality pause | **The only compliant automated member touch.** See §6 for the full pricing correction and the classification trap |
| | Twilio / Gupshup / Infobip / 360dialog / MessageBird | No public IDR rate card found — sign-up or sales quote required | Same capability + CS/CRM layers, markup unknown | Cost multiplier unknown → **do not price-model on these** until a BSP account exists |
| **Event platforms** | Luma | **⚠ CORRECTED 2026-10-17 — an earlier read of this document said Luma is read-only. That was wrong and the correction matters.** The public **agent/MCP** surface is read-only (discovery + lookups), but the **calendar API behind an active Plus subscription** ($59/mo annual) exposes event create/manage, guest lists, registration approval, waitlists, and scheduled blasts at 200 req/min/calendar <https://help.luma.com/p/luma-api> · <https://luma.com/pricing> | Event records + discovery + registration + gated write, **and Plus itself bundles "Blasts and automated reminders via email, SMS, push notification and WhatsApp", Zoom attendance tracking, and up to 5,000 invites/newsletters per week** <https://luma.com/pricing>, 2026-10-17 | **This is the strongest integrable venue we have, not a read-only dead end** — it moves from last place to near-first in §5's sequence. **It is also a direct competitor to one of our own named lanes:** Plus already sells automated reminders over email/SMS/push/WhatsApp, so Kinship's reminder value must be *sequencing + approval + cost governance across a fleet*, never the act of reminding — any copy implying otherwise is falsifiable by opening Luma's pricing page. **New risk named by the correction:** the write path is gated on someone's paid Plus subscription, so if Plus reprices or re-gates the API, our core write path dies with no read-only fallback. That is a dependency on a vendor's pricing page, and it belongs in `PLAN.md`'s HOLD list, not in a footnote |
| | Eventbrite | Buyer service fee 3.7% + $1.79; payment processing 2.9%; Pro $15/mo <https://www.eventbrite.com/organizer/pricing/> | Event CRUD, org-scoped | Write exists but "automated event reminders" and AI-assisted setup are in-product features, and v3 writes are scoped to a privileged organisation's public events → excludes private meetup groups |
| | **Humanitix** | Free events **$0 fee**; paid 4% + $0.99; NFP 2.5% + $0.50 <https://www.humanitix.com/pricing> | Ticketing with a give-back model | **Missed in the first pass.** Fee-free for free events makes it the natural fit for volunteer kopdar — and it has **no** reminder, RSVP-chase, or recap capability at all in the matrix, which is the gap stated plainly |
| | **Mayar** (ID) | `[UNVERIFIED]` — IDR price card not readable server-side <https://mayar.id/event-organizer> | Indonesian ticketing with **a new API, Zapier, Event Reminder, Blast Email, Export Data** | **Missed in the first pass, and it is the closest integrable local vendor.** Local, API-bearing, organiser-facing. Belongs in the §5 sequence evaluation before any Western ticketing tool |
| | Meetup PRO | ~$55/group/mo, $47 annual — **third-party directory figure, `[UNVERIFIED]`; the official Meetup help page returned HTTP 403 and no primary price URL could be cited** | Group/event management | API/MCP read-mostly. Low priority; the venue is leaving this segment |
| | Google Calendar | Free REST API, full create/update/delete on calendars you control <https://developers.google.com/workspace/calendar/api> | The actual canonical schedule for most kopdar | Still the cheapest *open* write path — no subscription gates it |
| | Brella / Grip / Cvent / EventsAir | Brella/Grip: no public price card found (only 2024-dated third-party review figures — `[UNVERIFIED]`). Cvent ~$20k licence + $7/registrant, third-party figure `[UNVERIFIED]` | B2B conference matchmaking, badges, sponsor reports | **Not competitors** — different buyer, different venue size. Sponsor *reports* are their core sell, and that is the one feature worth copying (FR-2.5). Grip's "Remote Organiser MCP" is **beta and cannot edit** |
| **Agent orchestration frameworks** | CrewAI, LangGraph, AG2/AutoGen, OpenAI Agents SDK, Dify, Flowise, n8n | CrewAI Enterprise "Custom Pricing" <https://www.crewai.com/pricing>; n8n self-host ≈ server cost, cloud plan "not published as a fixed number" | Roles, handoffs, HITL interrupts, memory, tracing — **as primitives, not policy** | The substrate. We compose on top; we do not compete with it (§3) |
| **Agent-ops / observability** | AgentOps, Helicone, Langfuse, LangSmith, PromptLayer, TrueFoundry, Vantage | AgentOps: free tier + per-seat/retention tiers, "not published as a fixed number" <https://docs.agentops.mintlify.app> · Helicone **$79/mo Team** · Langfuse free/200 credits, **Pro $59/mo**, +$10/1k invoice credits · LangSmith **Developer free, Plus $39/seat/mo**, Traces "up to 100% base" and **"No Policy Enforcement at Runtime"** <https://www.helicone.ai/pricing> · <https://langfuse.com/pricing> · <https://www.langchain.com/pricing> | Traces, evals, cost dashboards, human review queues | **Observation, not governance.** Not one page claims runtime policy enforcement. Our approval gate is the difference; our trace store is theirs to buy |
| **Indonesian scene — who teaches agents vs who runs them** | **AIBOS × AICLUB "OPREK AI AGENT" workshop** · Mekari Qontak · Qiscus · respond.io · Wati · SleekFlow · Mayar · ETIX · digitalevent.co.id · Juara Tiket | AIBOS workshop: "bangun 4 AI Agent sendiri buat bisnismu", delivered over WhatsApp + Telegram, claims **2,259+ builder AICLUB mulai terdata** <https://aibos.id/ws-aibos-2/> · respond.io **$79–$279/mo** (the only local-relevant inbox vendor with a public ladder) <https://respond.io/pricing> · Qontak/Qiscus/Wati/SleekFlow: IDR prices JS-hidden or not server-readable `[UNVERIFIED]` · Meetup official help page **403** | **AIBOS teaches people to build their own agents; the CRM set sells inboxes; the ticketing set sells checkout.** AIClub's own site exposes no ticketing or automation stack and is "Komunitas AI gratis se-Nusantara" <https://aiclub.id> | **This is the strongest beachhead evidence in the analysis, and it is behavioural rather than attitudinal.** The workshop's own logistics are the gap stated as fact: *"Lokasi TBA di group peserta"* — the venue detail is still being sorted out by hand in a participant WhatsApp group, **by the organisation that teaches AI agents.** AIClub is already sold on agents (2,259 builders counted); nobody has pointed them at their own operations. Bahasa queries run — "bot AI komunitas", "kelola meetup AI", "asisten virtual komunitas WhatsApp", "agen AI kelola komunitas/acara/kopdar/reminder peserta", "Indonesia AI agents kelola acara" — returned UMKM chatbots and workshops, **zero agent-run community-ops products** |
| **Indonesian language infrastructure** | Google Cloud Translation | Pricing page **failed to load (HTTP 404)** during both passes — could not confirm 2026 per-character rates. Secondary: free tier cut 2025-04-11, 500k chars → $20/1M <https://cloud.google.com/translate/pricing> (NOT LOADED) | Machine translation | Fallback only. `❓` |
| | OpenAI / DeepL / LibreTranslate | **No public ID⇄EN quality benchmark with a documented methodology found.** Only vendor marketing (DeepL claims "50% fewer errors" for German, not Indonesian) | LLM-as-translator dominates | **We ship a paired ID+EN draft and measure acceptance ourselves** — see §5, skill `bilingual-copy` |
| **Open-source community platform + AI** | Discourse AI, Chatwoot Captain, Mastodon | **⚠ CORRECTED 2026-10-17 — this row previously read "`discourse/discourse-ai`, MIT, flag-and-review only." It is neither, and the error flattered us.** "Discourse AI is now shipped with Discourse core", **GPL-2.0**, ~47,987★, pushed 2026-10-16 <https://github.com/discourse/discourse>; the AI repo itself is 96★ with a null license field <https://github.com/discourse/discourse-ai>. Shipped modules: AI Bot, semantic search, **one-click AI spam detection**, AI triage automation, Helper, Related Topics, Sentiment, **Summarize for topics and chat**, and **LLM Usage Quotas** (token-cost caps) <https://meta.discourse.org/t/discourse-ai/259214>. Chatwoot Captain AI: reply suggestions, summarisation, KB answers; 300/500/800 credits by plan then **$20 per 1,000**; cloud $0/$19/$39/$99 per agent/mo; license NOASSERTION (open-core), ~37,872★ <https://www.chatwoot.com/pricing>. Mastodon/PeerTube: **no shipped AI moderator found** (academic work only, arXiv 2501.05871) | Mature, free, forum-scoped LLM moderation **with cost quotas and recaps** | **The strategic correction: open source is not a differentiator for moderation.** Discourse ships it in core, GPL-2.0, with LLM quotas — so `moderate-flag-only` is a *posture shared with shipped software* (which validates it) and a thing we must **not** build (the OSS AI-moderation shelf outside Discourse is negligible: topics/ai-moderation top repos are 6★/5★/3★/3★). Kinship's claim is the orchestration and event lifecycle **on top of** whatever moderation the venue already has, never the moderation itself |

**Coverage.** Three passes completed. One earlier attempt at the community-SaaS/bot-ecosystem pass
failed on a provider stream timeout and was **re-run successfully**; this file reflects the re-run.
Remaining known gap: Discord/Telegram volunteer bots were surveyed for *capability and price*, not
for adoption counts inside real Indonesian communities — nobody has counted how many kopdar groups
run MEE6, and no source licenses an estimate.

**Access-date provenance, unresolved and flagged.** The passes stamped their fetches inconsistently:
one reported **2026-10-30** and another **2026-10-18**, both relative to a document dated
2026-10-17 — one is thirteen days in the future, the other one day in it. The fetches are reported as
having succeeded, so the likely explanation is a clock or stamping error in the research harness
rather than fabricated data. **Treatment: contents used, dates not trusted.** Consequence that
matters: any price in this file could be one to two weeks older or newer than it claims, which is
immaterial for a phase-1 gate decision (nothing here gates one) and **material for anything printed
externally.** Therefore: **every price in this document must be re-read off the vendor page on the
day it is quoted**, and the `PLAN.md` W11 AIClub one-pager carries a re-verification step, not a
copy-paste. Rows the two runs disagree on are marked `[UNVERIFIED]` inline and listed in the PRD §13
correction block.

---

## 3. Commoditised vs. whitespace

The verdict that decides the add/skip list. Graded: **C** = commoditised, buy or compose, do not build · **G** = gap, nobody in any lane ships it · **P** = partial, tooling exists but not shaped for our use.

| Capability | Grade | Evidence | Decision |
|---|---|---|---|
| Agent roles / handoffs / task graph | **C** | CrewAI agents-tasks-crews-team-process; LangGraph supervisor + Command handoff; AG2 `ReflectionResult`; OpenAI `as_tool()` | **Compose.** Do not build an orchestrator |
| Human-in-the-loop approval at a tool call | **C** | LangGraph interrupts; CrewAI `HumanAgent` with three approval behaviours; n8n "Wait for Webhook"; Dify/Flowise loop nodes | **Build our taxonomy on top** (see §4 add-list item 1) — the mechanism is free, the *policy model* is ours |
| Memory across runs / users / channels | **C** | Mem0 add-infer-update, 28 MCP tools, multi-level store; Zep `thread`/`graph`/`cross-session`; Letta `memory_blocks`+`memory_insert`; Supermemory profile+session+document; LangGraph checkpointer+store; Cognee graph-query "find related entities across user, session" | **Buy.** Adopt one Mem0/Zep/Supermemory-class backend as an *optional* pack dependency. Building memory is out of scope (PRD §5.2 already says so; this confirms the market does it) |
| Trace storage + replay + cost dashboards | **C** | AgentOps (cost "only for OpenAI models"), LangSmith, Langfuse, Helicone $79/mo | **Buy or self-host Langfuse.** Do not write a trace store |
| Eval harness / LLM-as-judge | **C** | LangSmith evals, Langfuse datasets/scores, AgentOps evals | **Borrow the pattern**; Paperclip already runs promptfoo evals (`research/PAPERCLIP-OSS-STUDY` §7) |
| Interop / tool gateway | **C** | MCP is "the de-facto standard, used by all these frameworks and ChatGPT/Claude/Gemini"; CrewAI `MCPServerAdapter`; Dify plugin/marketplace | **Use MCP for tool access.** Skip A2A — the frameworks themselves handoff via native graph/tool mechanisms, not a standard protocol, and a cross-vendor agent-to-agent protocol is **❓ not used** by CrewAI/LangGraph/AG2 |
| Governance primitives: role hierarchy, action permissions, approval **policy**, budget **hard-stop** | **P** | CrewAI's `@inject` is dependency injection, **not** permission enforcement; LangGraph guardrails are a blog topic, not a runtime product; AG2's only permission-ish surface is the human proxy; Dify/Flowise gate *workflow* steps; **no framework page claims runtime policy enforcement** | **This is our layer.** It ships as `spec/GOVERNANCE-SPEC-OUTLINE.md`, not as code we pretend someone else built |
| Event-lifecycle state machine (create → promote → remind → run-down → recap → report), resumable, timer-driven, cross-run | **G** | Framework memory "isn't explicitly designed for long-running workflows"; temporal `WorkflowState` is a generic engine, not an event domain model; n8n has no event identity; no framework page models scheduled T-7d / T-1d phases with per-phase approvals | **Build.** This is the product |
| Community-action taxonomy (promo / reminder / RSVP chase / no-show nudge / recap / sponsor report) | **Split, and the split is the product.** Promo ⚠️ shipped (Eventbrite AI-written social ads, Wati "AI Co-pilot credits"). Reminders ✅ shipped (Luma blasts to registrants, Eventbrite "automated event reminders", Meetup in-product). RSVP chase / waitlist ⚠️ shipped as a *toggle* (Luma "approve registrations, handle waitlists"). **No-show 1:1 nudge ❌ found nowhere in the matrix** — the closest is broadcast messaging "not per-person judgement". **Recap ❌ across all seven lanes.** Sponsor report ✅ but only as the enterprise core sell (Grip/Brella) and ⚠️ "data insights" (Eventbrite) | **The event platforms automate the calendar, not the people.** Reminders fire on a schedule; nobody makes a per-person judgement about someone who did not show up, and nobody writes the recap. Kinship's taxonomy is therefore *not* a list of six new capabilities — it is **two genuinely new ones (no-show judgement, recap) plus one repositioned one (sponsor report as a dated, reproducible deliverable rather than a dashboard)** |
| **Per-action autonomy gate as a product** | **G — and this is now the sharpest finding in the analysis.** ❌ in every lane: Luma, Eventbrite, Humanitix, Meetup, enterprise matchmaking, the Indonesian inbox SaaS, and the free bot layer. The *only* shipped approval gate found anywhere is **Zapier's Human-in-the-Loop**, and its documented ceiling is precise: a **premium app** requiring **Pro/Team/Enterprise** tier, it **pauses the run**, allows **one reviewer**, logs into Zapier, and **bills the pause as a task**. n8n's answer is "build it yourself" | **This is the moat, and Zapier has now measured it for us.** One reviewer, no per-action taxonomy, no revision binding, no audit replay, and the gate itself consumes billable tasks. Kinship's ladder (`Allowed` / `Ask first` once-vs-always / `Off`, per action class, with a replayable log) is not a nicer version of their feature — it is a different object, and the nearest shipped comparison is a documented limitation list |
| Identity disclosure on member-facing utterances | **G** | **Zero hits** across all three research passes as a *shipped product feature* — not in framework docs, not in WA/Telegram/Discord policy, not in any community SaaS page. Circle markets "guide, support, coach your members **24/7**" and Discourse AI "detects… applies tags" **autonomously**: the category norm is anonymity-by-default automation, the opposite of ours | **Build.** Highest leverage per unit of effort, and the pass that failed and was re-run turned it from a nice-to-have into a **defensive requirement**: there is recorded community backlash against AI that wears a member costume — Discourse's own forums host "Forums that forbid AI content" and AI-spam threads, and Python.org's AI-answer-policy fight is the same argument. A kopdar group's tolerance for an undisclosed agent is not unknown, it is *documented in the negative*. Also the only answer to the "is the whole group bots now?" reactance predicted in `design-thinking/05-test-results.md` frame 3 |
| Member input as data, never instruction (stranger containment for a live group) | **G** | Frameworks trust their own inputs; n8n webhooks authenticate or don't; Discourse AI has no such concept; Paperclip ships the mechanism (`sourceTrust` + fail-closed quarantine, study §6.1) but frames it as containment "for hostile automated work", not for strangers in a group chat | **Adopt the mechanism, build the community semantics** — spec §2.1 |
| Indonesian-first, USD-free operation | **G** | Every SaaS row is USD-priced or "on quote"; no Indonesian-native LLM (Grammar/Logika are general-purpose); no Indonesian NLP OSS library found; no ID⇄EN quality benchmark | **Build the pack, not the model.** `needs.member_notice_text` in ID + EN; disclose the WA limit in ID copy |
| Cost metering per squad / per event / per agent for **non-OpenAI** models | **G** | AgentOps explicitly limits cost to OpenAI models; framework memory has no cost governor; LangSmith cost tracking exists but is per-trace, not per-organisational-unit | **Build thin.** Money-denominated budgets scoped to *event* (Paperclip uses `billed_cents`; we use IDR per event — pack `budgets.llm_per_event_idr` becomes real, not a placeholder) |
| Governed agent ops **below the enterprise price floor** | **G** | The shipped agents that exist are gated at Circle **$419/mo** and above, or Common Room **$2,500/mo** and above; none offers self-host; none covers WhatsApp. The free bot layer beneath them has no governance and no lifecycle | **This is the price position, and it is now a sourced claim rather than a hunch** — "open source, so it's free" is the only route to a governed community fleet for a volunteer-run kopdar. Caveat: several of those tier↔capability mappings came back `[UNVERIFIED]` because the pricing pages render via JS, and the pass's access-date stamp is unreliable (see §2). Re-verify before any of it appears in the aiclub.id one-pager |

**Read:** the moat is not the fleet mechanics (commoditised to exhaustion) and not governance-in-general (an approval button is table stakes on every framework page). The moat is **governance applied to a community's event lifecycle in a market where the venue is legally not automatable** — plus the honesty of saying so. Consistent with the study §4 re-word: the wedge is *domain + trust*, not control-plane engineering.

---

## 4. The add list (features)

Each maps to an existing requirement or is named as new. Ordered by evidence strength, not enthusiasm.

| # | Feature to add | Grade it fills | Maps to | Cost | Verdict |
|---|---|---|---|---|---|
| A-1 | **Three-behaviour approval taxonomy at the action level**: `Allowed` / `Ask first` (with **Allow Once** vs **Allow Always** as separate outcomes) / `Off`. The "Always" answer becomes a revocable stored rule, not a silent autonomy grant | P→ours | extends **FR-1.3**; spec §1 ladder; pack `autonomy` | ~s (a state machine + one table) | **ADD, first.** Every framework has "interrupt"; almost none distinguishes *once* from *always*, and that distinction is the whole trust story in `05-test-results.md` (P-4: near-total refusal of full autonomy) |
| A-2 | **Event-lifecycle state machine as a first-class object** — event ID, current phase, per-phase approvals, persisted timers (T-7d / T-1d / T+1d), resumable across runs | G | new **FR-2.0**, before FR-2.1 | M | **ADD.** This is the product. Nothing we compete with has it, and it is what makes "fleet, not single bot" observable rather than rhetorical |
| A-3 | **Channel capability table shipped in the UI** — per channel: can the fleet *read*, *draft*, or *send*, and at what price. Surfaced before the organiser connects anything | G | new **FR-4.x** (Integrations), §5.1 item 3 | s | **ADD.** Kills the #1 onboarding lie by construction. WA = draft + human-paste; individual broadcast = paid template; Discord/Telegram = full |
| A-4 | **Escalate-to-a-person, not to-a-queue.** Approval lands as a message to a named human on a channel they actually read; the "who is on call for this event" field is required config | G | pack `needs.escalation_contact` → becomes real; spec §2.3 multi-audience | s | **ADD.** Brella/Grip's "on-site help desk + staff console" is the paid version of this idea; nobody has it for a volunteer meetup |
| A-5 | **IDR-denominated, per-event LLM budget with a real hard stop and a warning threshold** | G | **FR-1.4** extended; pack `budgets.llm_per_event_idr` | s | **ADD.** Frameworks meter tokens; observability tools meter OpenAI cost; nobody meters "this kopdar's agent spend in rupiah" |
| A-6 | **Per-origin single-active enforcement for reminders and recaps** (DB partial-unique, not an app check) | P | **FR-2.2**; study §6.3 | s | **ADD.** "Duplicate emails collapse to one queue entry" becomes impossible rather than tested |
| A-7 | **No-shadow-agent rule**: an agent that takes no recorded action within N runs is surfaced and retired | G | spec §2.6 shatter-guard; FR-1.x new | s | **ADD.** Directly counters the P-5 falsifier (≥60% of value from one agent ⇒ fleet is overkill). Gives the fleet claim a measurable defender |
| A-8 | **Near-miss as a first-class, shareable record** — an approval rejection or a caught error is a logged artifact with a "why", exportable | G | **FR-1.2**; `EVENT-TEMPLATE.md` ⚠️ table; spec §1 | s | **ADD.** P-1 says trust lands only on a *visible* caught near-miss. Make it a thing you can screenshot, because that is the aiclub.id pitch asset |
| A-9 | **Redaction + masked-preview discipline on attendee PII**, with a test that asserts the rule | P | **FR-1.2** extended; study §6.6 | s | **ADD, day one.** We hold attendee emails; this is not v1 polish |
| A-10 | **`sourceTrust` / fail-closed trust presets** for member-sourced content | G→mechanism exists | spec §2.1; study §6.1 | M | **ADD.** Turns "member input is data, never instruction" from a slogan into an enforced read path |
| A-11 | **404-not-403 + audited break-glass reads** on restricted member data | G | spec §2.3; study §6.2 | s | **ADD.** Answers "who can see the audit log" and the UU PDP posture question (Q3) with a mechanism instead of a policy paragraph |
| A-12 | **Agent self-reported fleet health** (`complain` + bounded `suggestion-box` pattern) | G | new skill, §5 | s | **ADD.** Cheapest signal that the reminder lane is broken before an organiser notices on the night |

**Explicitly not added** (and why, so they do not return):

- ❌ **Levelling/XP, welcome messages, reaction roles, keyword auto-mod filters, timed posts, ticket queues, anti-raid — and the pre-event Discord loop (Apollo: recurring events, signups, waitlists, up to 5 reminders, digests, $0–25/mo)** — **free or cheap and already inside the venue.** Discord AutoMod is *assumed* built-in and free (⚠ its FAQ 403'd on re-read; negative evidence only); MEE6/Carl-bot/Dyno free tiers cover the rest, and MEE6's paywalling of formerly-free basics produced sustained community hostility ("the countdown timer is theater") and an entire "use THIS instead of MEE6" content economy. Building these into Kinship adds nothing on Discord and picks a fight with a $0 incumbent everywhere else. Kinship's job starts where those bots stop: cross-channel, event lifecycle, shared memory, approval governance, audit replay.
- ❌ **A forum-corpus Q&A bot** — Discourse AI's Answer Bot is OSS and shipped. Integrate or ignore; don't rebuild.
- ❌ **Slack-side recaps** — Slack AI does recents/digests natively at $18/user/mo.
- ❌ **WhatsApp send/broadcast transport** — WAHA is FOSS and Thikaa/WATI sell it; if a WA write path is ever wanted, it is a third-party integration, not a Kinship component (§1).
- ❌ **A memory engine** — C. Six shipped options; adopting one is a config line.
- ❌ **A trace store or eval dashboard** — C. Self-hosted Langfuse or an AgentOps-class tool covers it; ours is an adapter, not a product.
- ❌ **An orchestration framework** — C. Compose CrewAI/LangGraph-class primitives; the contribution is the policy + the domain.
- ❌ **A workflow canvas** — that is n8n, and it is the substitution threat we answer with A-2/A-7/A-8, not by rebuilding it.
- ❌ **A translation engine or an Indonesian model** — no benchmark exists to evaluate either; ship paired drafts and measure acceptance.
- ❌ **Conference matchmaking (badges, 1:1 scheduling, booth analytics)** — different buyer, different venue size, Brella/Grip own it.
- ❌ **Member-intelligence / churn scoring** — Common Room ships it at $2,500/mo to revenue teams, and it is the feature most likely to make an organiser feel surveilled. Not v0, and if ever, opt-in only.
- ❌ **Autonomy marketing language** — the category sells "24/7 agents that coach your members." Kinship's flag-only, approval-gated posture is the differentiation; copying their phrasing would spend it. Say what the fleet does *not* do.
- ❌ **WhatsApp group automation, by any route** — §1. No official API capability; the unofficial route risks the organiser's own number. Hard boundary, documented in the UI (A-3).
- ❌ **Meetup/Facebook-groups integration** — read-degraded at best, and the venue choice isn't ours to force.
- ❌ **Multi-tenant hosted SaaS** — PRD §5.2, unchanged.

---

## 5. Tools and skills to add

### Integration tools, sequenced by API openness × cost × risk (not by desire)

| Order | Tool | Path | Why this position (**re-ordered 2026-10-17 after the event-ops correction — Luma is not read-only on the paid API**) |
|---|---|---|---|
| **1** | **Google Calendar** | API write, free via OAuth | The canonical schedule for most kopdar, and **the only write path with no subscription gate**. It holds #1 on independence grounds even though Luma is richer |
| **2** | **Luma** | API write **behind Plus ($59/mo annual)**; read free | Event create/manage, guest lists, registration approval, waitlists, scheduled blasts, 200 req/min/calendar. The richest venue object we can reach — **and the one with a vendor-pricing dependency** (§2, §8) |
| **3** | **Gmail / email** | API write + send, effectively free | Cheapest legitimate individual member touch. No template review, no 24 h window, no reclassification risk |
| **4** | **Discord** | Bot API, free, full read+send | The venue where an agent fleet genuinely works. Also where the "is the whole group bots now?" reaction is survivable because bots are native furniture — *provided* AutoMod/MEE6 stay in place and Kinship is additive (FR-4.2) |
| **5** | **Telegram** | Bot API, free, full read+send | Same, and the dominant Indonesian broadcast-group substrate after WA. Note the beachhead already runs workshops **through** Telegram (AIBOS) |
| **6** | **Mayar** (ID ticketing) | API + Zapier, Event Reminder, Blast Email, Export Data; API depth `[UNVERIFIED]` | Closest local ticketing vendor. Evaluate its API before any Western ticketing tool, because it is where the beachhead's events actually sell |
| **7** | **WhatsApp — draft + human-paste** | none | The venue we serve by assisting, not automating. Ships with the disclosure (A-3) |
| **8** | **WhatsApp — approved template to individuals** | Meta direct + a BSP later | Priced in §6 (contested, ~30% band), **classification-risked** (invites default to marketing; Meta re-classifies), and **never the default**. Opt-in, budget-gated (A-5), priced-in-the-card (FR-4.3) |
| — | **Notion / Google Sheets** | API write | The realistic attendee source of truth where no ticketing vendor is in play; feeds FR-2.2 |
| — | **Humanitix** | fee-free for free events ($0; paid 4%+$0.99; NFP 2.5%+$0.50) | Right model for volunteer events, **zero reminder/chase/recap capability in the matrix** → a checkout source at best, not an ops surface |
| — | **Eventbrite write** | conditional | Only for public privileged-org events; low value for this segment → **skip for now** |
| — | **Meetup / Brella / Grip / Cvent / Qiscus / Qontar / SleekFlow / Wati / respond.io** | — | **Skip.** Wrong venue, wrong buyer, closed pricing, or human inbox rather than fleet |

### Skills for the pack (`packs/kopdar-ops/`)

Skills, not features — reusable procedures an agent loads, which is how Paperclip's skills-catalog works (study §5).

| Skill | Agent | What it encodes | Source of the idea |
|---|---|---|---|
| `event-lifecycle` | event-ops | Phase machine, per-phase approval, timers, what "done" means for each phase | A-2 · the G row |
| `promo-copy` | engagement | Paired ID+EN draft, primary language labelled, no invented attendee numbers, disclosure line attached | PRD copy rules + `bilingual-copy` gap (§2: no benchmark ⇒ measure ourselves) |
| `reminder-schedule` | event-ops | T-7d/T-1d cadence, per-origin single-active, cost check before any WA template send | FR-2.2 + A-6 + §6 |
| `rsvp-chase` | engagement | Source-of-truth reconciliation against a guest-list export, chase cadence, never a invented headcount | G "no-show nudges" — named in PRD §1, absent from every competitor |
| `no-show-nudge` | engagement | Post-event, cheapest channel first (email→TG/Discord), never paid WA template | §6 cost ladder |
| `recap` | engagement | Transcript/notes/turnout → recap draft; no hallucinated attendance figure; cites only real links | FR-3.1 shape, extended |
| `sponsor-report` | event-ops | Deliverable-shaped report with dated window, reproducible regeneration, no invented metrics | `brd-prd-authoring` §6 audit discipline; PRD §1 lane "sponsor report" |
| `moderate-flag-only` | moderator | Flag → human queue with reason + confidence; delete/ban **absent from the toolset** | FR-3.2 · **Discourse AutoMod ships the same posture**, which is the best external validation we have |
| `identity-disclosure` | all member-facing | Every member-facing utterance carries the disclosure; an agent may not answer "are you a bot" with a denial | A-8 · the G row with zero hits · `05-test-results.md` frame 3 |
| `near-miss-log` | all | Record a caught error/rejection with the "why", exportable | A-8 |
| `escalate-to-human` | all | When to hand off, to whom, over which channel, with what context | A-4 |
| `fleet-health` | all | Bounded `complain` + ≤3-per-run constructive suggestions, no double-firing | A-12 · Paperclip `skills/complain` + `skills/suggestion-box` (study §6.8) |

**Not built:** a workflow-canvas skill, a memory-engine skill, an eval-harness skill — all C.

---

## 6. The WhatsApp cost ladder — **corrected: the rates are contested, the trap is not**

**Retraction first.** An earlier version of this section printed a single set of Meta Indonesia rates
(marketing $0.02625 / utility $0.004133 / auth $0.061755) attributed to
`developers.meta.com/harness/pricing-structure`. **A second pass could not reproduce that, and the
sources disagree.** Meta's own pricing page **publishes no rupiah or dollar figure for Indonesia** —
Indonesia falls under "Rest of Asia Pacific" — so every rate below is a **reseller's** published
rate, not Meta's. They do not reconcile:

| Source (access date) | Marketing | Utility | Notes |
|---|---|---|---|
| **SleekFlow help centre, 2026-10-01** <https://help.sleekflow.io/whatsapp/pricing> | **$0.0104** | **$0.0077** | 1,000 free service conversations/mo; per-message billing since 2025-07-01; **from 2026-10-01 in-window service replies become billable** |
| **SleekFlow help centre, 2026-09-04** — *the same vendor page, four weeks earlier* | **$0.04727** | $0.02875 (listed through 2026-09-30) | ⚠️ **This is a 4.5× disagreement inside one source.** Most likely a BSP-markup tier vs the pass-through rate, or a re-pricing on 2026-10-01 — **but it is not resolved, and neither number may be quoted as "SleekFlow's price."** The two passes each read a different variant of this page, which is why the earlier draft of this section was wrong |
| flowcall, 2026-10-02 <https://www.flowcall.co/blog/whatsapp-business-api-pricing> | **$0.0411** from 2026-10-01 | utility/auth $0.025 | first 1,000 **service** messages/mo free |
| ChatMaxima, 2026-10-01 <https://chatmaxima.com/whatsapp-api-pricing/indonesia/> | **Rp 586.33** | Rp 356.65 | +11% VAT. ≈ $0.036 at ~Rp 16,300/USD — sits between the two SleekFlow readings and reconciles to neither |
| Meta's own pricing page <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing> | **no figure published for Indonesia** | — | Indonesia is grouped under **"Rest of Asia Pacific."** **This is why every rate above is a reseller's number**: there is no primary source on the open web to arbitrate the four |

**The honest summary of the spread: $0.0104 → $0.04727 for one message in one country.** A 4.5× band
is not a pricing detail, it is the whole unit economics of a member-facing channel. So the rule that
comes out of §6 is not "use the average" — it is **do not compute, do the read**: any per-message cost
shown in Kinship's UI (FR-4.3) must come from the rate card the *organiser's own* Business Manager
shows, fetched at that moment, stamped with an `as_of` date, and refused when stale. A rate compiled
from a research pass is structurally unable to be correct, and this document is the proof.
**No per-message rupiah figure may be printed in any Kinship copy, deck, or pack** until it is read
off the organiser's own Business Manager rate card.

What *is* corroborated across every source, and is what the product actually needs:

1. **Billing went per-message on 2025-07-01**; conversation-based pricing is deprecated; service
   conversations became free on 2024-11-01; **utility templates are free inside an open
   customer-service window**; free-form messages are free in-window; a 72-hour free entry-point
   window applies to click-to-WhatsApp ads. <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing>
2. **The category trap is the real product constraint, and it is worse than the pricing.** Meta
   defines *utility* as "typically triggered by a user action or request" and treats **event
   invitations as marketing**. So a T-7d "see you Saturday!" blast to people who have *not*
   registered is **marketing-priced**, and reminders to *confirmed registrants* are defensibly
   utility. Meta runs a **recurring reclassification process** and can re-label an approved
   UTILITY template as MARKETING after the fact
   <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization>.
   Consequence for the design: **the same reminder can change price and opt-out burden without any
   code change on our side.** That is why FR-4.3 requires the price to be rendered *in the approval
   card* from a dated rate table with a stale flag, and why `reminder-schedule` must branch on
   registration status rather than on the calendar.
3. **Three repricings in 24 months** (Nov 2024 service free → Jul 2025 per-message → Oct 2026
   billable in-window replies) means a unit-economics claim written today is stale by construction.
   The rate table is a **versioned, dated artifact with a staleness gate**, not a config constant.
4. **The unofficial route's downside is asymmetric and now sourced.** WAHA/Baileys/Evolution-class
   automation is detected via protocol fingerprinting and behavioural anomalies (instant replies);
   bans are reported as **permanent, with no notice and no appeal**, and using a modified client
   breaches ToS <https://www.pipes.bot/blog/baileys-vs-whatsapp-cloud-api-ban> ·
   <https://github.com/evolution-foundation/evolution-api/issues/2228>. That converts D11 from a
   preference into a risk decision: the failure mode is not "our message fails," it is "the
   organiser loses their number, silently, and cannot recover it."

**The compliant ladder stays the same and is now better-founded:** email → Telegram/Discord (free,
open) → WhatsApp **utility template to confirmed registrants only** → WhatsApp **marketing template
to non-registrants, priced and disclosed as marketing, opted-in**. Ordering by cost *and* by
classification risk, not by channel preference.

**BSP markup is still unpriceable.** Mekari Qontak, Qiscus, respond.io, Wati and SleekFlow all gate
Indonesia pricing behind sign-up, JS-render, or return a 404 — respond.io is the one exception with
a public **$79–$279/mo** ladder <https://respond.io/pricing>. **No total member-acquisition cost
goes anywhere until a BSP account exists.**

**Sponsor pricing benchmark, same warning:** no published price card was found for Brella/Grip/
Swapcard; Cvent's ~$20k licence + $7/registrant is a third-party review figure and `[UNVERIFIED]`.
**No sponsor-revenue comparison goes in the deck.** What transfers is the *feature* — the on-site
help desk / staff console pattern (A-4) and the sponsor report (FR-2.5) — not their price.

---

## 7. What this changes in the repo

Actionable, in the order a stranger would feel them:

1. **PRD §4 (Competitive position)** — replace the "Event platforms' own AI" row's claim that Kinship "operates them via API where open" with the Luma read-only fact, and add an **"Automation rails — WA-automating vendors"** row naming Qontar/Qiscus/SleekFlow/Wati as *human-operated inbox* products, not fleets. Add the §1 finding as a footnote to the positioning bet.
2. **PRD §5.1 item 3** — reorder the integration candidate list to the §5 sequence and annotate each with read/draft/send + price. State the WhatsApp boundary as a shipped product decision, not an E5 gate.
3. **PRD FR-1.3** — extend with the A-1 taxonomy (once vs always, stored revocable rule). Add **FR-2.0** (A-2), **FR-4.1** (A-3), **FR-4.2** (A-6), **FR-1.8** (A-9/A-10), **FR-1.9** (A-11), **FR-1.10** (A-7) with Given→assert criteria.
4. **PRD §5.2** — add two ❌ rows with named homes: "❌ WhatsApp group automation — capability absent from the WhatsApp Business Platform; see `research/COMPETITOR-ANALYSIS-2026-10-17.md` §1" and "❌ Memory engine / trace store — adopt Mem0/Langfuse-class tool; owned by the eventual integrations doc."
5. **PRD §9 (Success metrics)** — the `—` cells in §2 for SleekFlow/BSP pricing are the reason a paid-tier comparison cannot be a metric. Keep installs/downloads (study §1) as the adoption proxy; add **approval-acceptance rate for ID⇄EN drafts** as the language-quality metric, because no external benchmark exists.
6. **PRD §12** — Q2 (integration API evidence) is now **answered for WA, Luma, Eventbrite, Google Calendar, Discord, Telegram** and needs no further research; the remaining unknowns are BSP markup and Google Translation pricing (page 404'd).
7. **`spec/GOVERNANCE-SPEC-OUTLINE.md`** — add §1.8 (A-1 taxonomy), §2.7 (member-input containment via trust presets, A-10), §2.8 (disclosure as a non-overridable action class), and fill open item "action-class taxonomy" from §5's skill list.
8. **`packs/kopdar-ops/`** — the twelve skills in §5; `needs.escalation_contact` becomes load-bearing (A-4); `budgets.llm_per_event_idr` becomes real (A-5); the `❌ no WhatsApp auto-send` note gains its citation.
9. **`PLAN.md`** — W7 (build-vs-reuse spike) now has its answer pre-researched: compose framework primitives + buy memory/observability + build A-1/A-2/A-3/A-5/A-7/A-8. W1–W5 shadow mode is unaffected; **integration sequencing means shadow mode's reminder lane is email/Telegram, not WA.** Add a HOLD row: "BSP markup unknown ⇒ no per-member cost claim until a BSP account exists."
10. **`DECISIONS.md`** — **done:** **D9 reserved** for the shadow-mode target event (owner-only), **D10** records the Q8 answer (thin plane + phase 1 on the existing Paperclip instance), **D11** records the WhatsApp boundary with its API citation, **D12** records buy-don't-build for memory/observability/orchestration/translation. D11 and D12 are marked *owner ratification pending* — they are drafted on evidence, not yet ratified the way D1–D8 were.
11. **New, from the third pass** — `packs/kopdar-ops/` should open with a **"already covered by free bots" section** naming MEE6/Carl-bot/Dyno/Discord AutoMod/GroupHelp/Rose for levelling, welcomes, reaction roles, keyword automod and timed posts, and stating plainly that Kinship does not replace them. A pack that claims to do everything will be judged against a $0 incumbent on its own turf; a pack that says *"keep AutoMod, we run the event"* is a harder claim to refute. Add **RSVP chasing**, **no-show nudges** and **sponsor reports** to the pitch deck's whitespace slide as *named absent features* — the third pass searched for them across Circle, Bettermode, Skool, Common Room, Slack AI and the volunteer bot layer and found no agent doing them.

**Nothing in the phase-1 gate moves.** Shadow mode still needs one dated event (D9), still sends nothing, and is still the cheapest conversion of assumption to evidence. What changes is that the pitch to aiclub.id can now survive the first technical question — *"so can it post to our WhatsApp group automatically?"* — with a true answer and a citation instead of a hope.

---

## 8. Competitive risks, paired with the observation that would retire each

| Risk | Why it is real | What would falsify it |
|---|---|---|
| **n8n + a good prompt** ships 60% of the value at 1/10 the surface | Already in the owner's stack; 13k+ template catalog; has HITL-wait and AI nodes; our own P-5 predicts the failure mode. **The substitution test now has a concrete answer, and it is honest:** one workflow plus one LLM node genuinely covers sheet/webhook → draft promo → Gmail/WhatsApp blast → scheduled T-3d/day-of reminder → thank-you. There are real published templates doing it (n8n wf **11944** event registration + reminders <https://n8n.io/workflows/11944-automate-event-registration-and-reminders-with-forms-sheets-and-gmail/>; wf **10270** gcal + Gemini follow-ups over WhatsApp and email <https://n8n.io/workflows/10270-google-calendar-events-with-gemini-ai-follow-up-suggestions-via-whatsapp-and-email/>). n8n Community Edition is free to self-host | **Where it structurally fails, named so the claim is falsifiable rather than rhetorical:** (1) no per-event state machine — phases live in ad-hoc spreadsheet columns, so "did this event's nudge already fire" is a filter, not a fact; (2) no cross-channel memory — the WhatsApp thread, the Discord post and the Luma guest list are three unrelated datastores; (3) no autonomy ladder — Zapier's gate is one reviewer, premium tier, task-billed; (4) no durable audit trail — n8n execution logs are ephemeral and SSO/env/Git versioning are paid; (5) no handoffs between promo / chase / recap roles; (6) no recovery semantics — a no-show nudge needs judgement about a person, not a status flag. **The honest "you don't need a fleet" line, stated as the test states it:** single event, single channel, no bilingual drafting, no sponsor or pulse artefacts, and the organiser accepts a sheet as the source of truth. One real event breaks it the moment a reminder has to know what was already sent on WhatsApp *and* Discord. Shadow mode's P-5 (≥60% of value from one agent) is still the kill switch and is still unrun |
| A community SaaS adds a fleet behind its existing venue | Circle already ships "AI Agents" (one persona, global pause) at its Plus tier, and acquired **Zoom-scale distribution is now proven reachable** in this category — Common Room, at a $2,500/mo entry price, was **acquired by Zoom in Jul 2026**, which means buyer intelligence is being folded into a platform that already ships in every meeting room | One of them ships **event-lifecycle timers + per-action autonomy + audit replay**, or drops below the $419/mo floor, or self-hosts. None does as of 2026-10-17; the acquisition is a distribution threat, not a feature threat |
| **A $0 bot already does the job in the member's eyes** | MEE6/Carl-bot/Dyno/AutoMod/GroupHelp/Rose are installed, free, and native to the venue. Organiser satisfaction is measured against them, not against Circle. The MEE6 paywall backlash also shows this audience is unusually allergic to paying for what was free | An organiser in `OBSERVER-NOTES.md` (W10) names a bot-comfort moment that Kinship's event loop did not visibly beat — i.e. "AutoMod already handles my group." Mitigation is §7 item 11: position as *additive to* the bot layer, never a replacement |
| Meta opens group automation | Would remove our §1 boundary and our honesty advantage at once | A published Cloud API group-send capability. Watch `developers.facebook.com` release notes; nothing found 2026-10-17 |
| Frameworks add governance and eat the layer | CrewAI Enterprise is a "secure, scalable platform" pitch with custom pricing; the primitives are one enterprise feature away | A framework page shipping runtime policy enforcement + revision-bound approvals. LangSmith explicitly states **"No Policy Enforcement at Runtime"** as of 2026-10-17, which is the strongest current evidence this is *not* their roadmap |
| The gap is a gap because there is no demand | E3 is absence-of-evidence grade; nobody has built it, and "nobody built it" is also consistent with "nobody wants it" | `pilots/shadow-mode/` §4 verdict of KILL, or no second-event behaviour after 4 weeks (`05-test-results.md` §B). That is the instrument, and it is still unrun |
| Volunteer organisers won't pay for anything and the WA limit makes the useful part feel incomplete | Every ID competitor prices per seat/per number because they sell to businesses; a kopdar has no budget line | The organiser conversations in `OBSERVER-NOTES.md` (W10) naming a paid plan they'd actually buy. Zero primary research as of today |

---

## 9. Verdict, in one paragraph

Three passes, one consistent answer: **nobody runs the event.** The paid community SaaS ship a
digest, an answer bot and auto-moderation — mostly autonomous, mostly read-side — with true agents
gated at $419/mo and member intelligence at $2,500/mo, no self-host, and **zero WhatsApp coverage**
in a market where the venue *is* WhatsApp. The Indonesian tools that do cover WhatsApp are
seat-priced human inboxes with a broadcast button, not fleets. The event platforms are read-only or
scoped to public organisations. The frameworks ship roles, handoffs, HITL interrupts and memory as
primitives with no policy layer. The observability vendors watch and, in LangSmith's own words,
offer **"No Policy Enforcement at Runtime."** The free bot layer already owns levelling, welcomes,
reaction roles and keyword automod at $0, so any Kinship feature that overlaps it is dead on
arrival. And across all of it, three things came back absent every single time: RSVP chasing and
no-show nudges as an agent's job, sponsor/event reports as a generated deliverable, and
**per-action graded autonomy with an approval queue and audit replay** — which is not a feature gap,
it is the product.

The one sentence a competitor will attack is *"can it post to our WhatsApp group automatically?"*
The honest answer is now sourced: **no official API allows it, and the unofficial tools that do
(WAHA-class WhatsApp-Web automation) risk the organiser's own number.** Kinship runs the event on
Discord, Telegram, calendar and email where the doors are open, drafts for WhatsApp where they
aren't, and says so up front — while the entire category quietly oversells what it cannot do. That
disclosure, plus identity-labelled agents in a market already documenting its resentment of AI that
wears a member costume, is the wedge. **Domain plus trust — not control-plane engineering.**

---

## 10. Two more passes landed the same day — what they changed, and what they broke

Two further desk passes completed after this file was written: **`research/AGENT-GOVERNANCE-LANDSCAPE-2026-10-17.md`**
(agent frameworks, governance infrastructure, buy-vs-build, standards) and
**`research/COMMUNITY-SAAS-AND-BOT-LANDSCAPE-2026-10-17.md`** (community SaaS, the free-bot incumbent, OSS
community AI, event/ticketing venues, the Indonesian scene). Full matrices live there. This section records only
what moved in *this* document and in the repo, because a correction that stays in a footnote does not function as
a correction.

**Reversals forced by the new evidence (all disclosed, none quietly patched):**

| # | What this file said | What the primary source says | Consequence |
|---|---|---|---|
| 1 | "WhatsApp groups cannot be automated by anyone; the Business Platform API has Message and nothing else" | Meta publishes a **Groups API** — send/receive in groups, remove participants, OBA-gated, **max 8 participants**, unavailable on Business App numbers, no edit/delete, no template metrics in groups | §1 rewritten. **D11's decision stands on a new basis** (8-person cap + wrong number type + unofficial routes = ban risk), amended as **D13** rather than edited. New falsifier named: a raised participant cap retires D11. |
| 2 | "Free bots cannot do event lifecycle" | **Apollo** ships recurring events, button signups, per-option capacity, auto-waitlists, up to 5 custom reminders, digests, gcal sync, cross-server posting — $0/$8/$25 per month | §2's incumbent row rewritten and §4's ❌ list extended. **Kinship cannot sell \"we do events\"**; it sells the cross-channel chain, the approval governance, and the sponsor report. |
| 3 | "Luma Plus is our strongest integrable venue" (as if that were purely good news) | Plus **already bundles automated reminders via email/SMS/push/WhatsApp**, 5,000 invites/newsletters per week, Zoom attendance tracking | Our reminder lane is **partly commoditised by the venue itself**. Reminder value = sequencing + cost governance + approval, not the reminder. Named as a copy-honesty constraint. |
| 4 | Common Room's price ladder unresolved ($375 Core vs $2,500 entry) | Vendor page: **Essential $2,500/mo billed annually**, 5 seats, 100k contacts; repositioned to buyer-intelligence under Zoom | The §3 \"enterprise price floor\" claim now rests on a **primary** source. PRD §13's unreconciled list loses this item. Common Room **left** community ops — the Milestones/Rallies "nearest competitor" reading is weakened for volunteer communities. |
| 5 | "Discourse AI: MIT, flag-and-review only" | **Discourse AI is in core**, GPL-2.0, ~48k★, with one-click AI spam detection, AI triage, Summarize for topics **and chat**, and **LLM Usage Quotas** | **Open source is not a differentiator for moderation.** Confirms `moderate-flag-only` as the right posture and the wrong thing to build. Also corrects our own license read of the donor ecosystem. |
| 6 | Bettermode = "$149 add-on / $1,500 Ask AI" | Vendor page: Starter **$1,788/yr**, Growth **$18,000/yr**, Premium contact; **Toggy — \"the AI team that runs your community\" — from $750/mo**, launched 2026-10-05; `bettermode.com/toggy` **404** | **The lane's first true \"agent team\" packaging, and the price anchor for an organisation-tier Kinship.** Unverifiable gating ⇒ cannot be quoted externally. Add-list check: does Toggy do per-action autonomy? Unknown — and unknown is the honest answer until its page loads. |
| 7 | "frameworks ship primitives without policy" (graded ⚠ as an agent's reading) | Verified per-framework: CrewAI ships `humanInputWebhook` + `/kickoff` `/resume` + a \"Pending Human Input\" state; LangGraph's `interrupt()` is a primitive with an **open feature request for an ApprovalNode** (#8026); LangSmith states **\"No Policy Enforcement at Runtime\"**; **LiteLLM ships `max_budget` + `ExceededBudget` blocks** | The ⚠ grading was right to be humble: **CrewAI's HITL is closer to an approval object than this file allowed**, and **budget hard stops are commoditised** (LiteLLM, MIT). FR-1.12 must say "wrap LiteLLM" rather than implying we build a meter. D12's buy-list gains a named product. |
| 8 | (nothing in this file about the pack marketplace's safety) | Registry poisoning is measured, not theorised: **341 malicious skills in ~48 h ≈ 12% of a registry**; Snyk's ToxicSkills found malicious payloads in scanned skills, majority combining prompt injection | **Direct hit on our S2 pack-sharing plan.** New requirement proposed (FR-1.14): a forked/community pack is **low-trust input**, install requires review, `bundled:` may not be claimed by a community pack, validator + provenance are the gate. This is the one finding that could make Kinship itself the supply-chain vector. |
| 9 | (§2's Discord AutoMod row cited a live help page) | `support.discord.com` returned **403 (Cloudflare)** on re-read; Ticket Tool pricing, MEE6 premium price, Qiscus/Wati IDR cards, `bettermode.com/toggy` all unfetchable | **Verification debt, listed rather than hidden.** Anything in this file whose only citation 403'd must be re-read in a browser before it appears in the AIClub one-pager (PLAN W11 carries the step). |

**Confirmed whitespace, with the named near-miss for each** (the §3 method: a gap is only real once you can say
what came closest): per-audience/stranger trust tiers → nothing surveyed (closest: research framing of
indirect prompt injection, not a shipped gate); event-lifecycle-native machine across channels → Apollo in one
container; **per-speech-act approvals** → CrewAI gates per *tool*, not per *speech act*; shatter/criticism guard →
nothing; **bilingual ID+EN as a governed content rule** → nothing; sponsor-report generation for a *volunteer*
event → Brella/Grip at a different buyer's price; **fork attribution + usage trail downstream of a registry** →
registries publish and fork, none attributes; **identity disclosure as a non-overridable action class** → legally
expected in the EU (Art. 50 transparency, applicable since 2026-08-02) and shipped only in support widgets
(Intercom labels); **the whole combination** (org chart + heartbeat + budget hard stop + approval queue, in one
OSS, priced for volunteers) → Agent 365 has registry and audit but no approval and no budget and "does not
hard-block [shadow agents] yet".

**Buy list, now with names** (this replaces the vague "adopt a memory/trace tool" in §4): **LiteLLM** (MIT) for
budget hard stops and model routing; **Langfuse** (self-hostable, Hobby free → Core $29 → Pro $199 → Enterprise
$2,499; ⚠ **audit logs are an Enterprise-tier feature**, so self-host if the audit trail is the product) or
**AgentOps** for trace/replay; **Mem0** (Apache-2.0) or **Letta** (Apache-2.0) for memory, both Postgres-friendly
and therefore Supabase-compatible; **Infisical agent-vault** or **OneCLI** for secret brokering — *not* agent-held
tokens, which is the documented failure in the OpenClaw exposure incident; LangSmith/Mastra for evals. Standards to
adopt: **MCP** (donated to the Agentic AI Foundation 2025-12-09; >10k public servers), **A2A** (Linux Foundation,
150+ orgs), **AGENTS.md** as the instruction-file convention, **SKILL.md** as the pack format. Not adopted yet:
AG-UI (only if a web chat surface ships) and OTel GenAI semconv (emit, but pin — the spec is still moving).

**One warning worth its own line, because it is about us and not about a competitor:** the donor's registry model
(ClipHub) and our S2 attribution plan both assume a marketplace of instruction files. That assumption now has a
measured base rate against it — 12% of one registry's skills were malicious within two days. **The pack format is
the attack surface.** `bundled:` must be a claim only we can make, the validator must be the install gate, and a
community pack must resolve to low trust at read time. Recorded as proposed FR-1.14 and as a spec §2.7 addition.
