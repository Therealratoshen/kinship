# Community SaaS, bot ecosystems, and event venues — capability and price scan

**Doc ID:** COMMUNITY-SAAS-AND-BOT-LANDSCAPE-2026-10-17
**Method:** one delegated desk-research pass, 111 fetches/searches over vendor pricing pages, API docs, GitHub API,
and help centres. **Access date for every URL: 2026-10-17.**
**Question it was asked:** *who already sells community operations with AI in it, what does it cost, what do they
actually ship — and what do the free bots in the venue already cover?*
**Companion:** `COMPETITOR-ANALYSIS-2026-10-17.md` holds the strategy layer and its §10 records what this pass
corrected there. This file is the raw lane evidence, priced.

> **Honesty contract.** Pricing is a **date-stamped observation, not a quote** — re-read the vendor page on the day
> you print a number. Cells marked `—` or `[UNVERIFIED]` could not be read; the reason is named in §6. No market
> size, no adoption count, no hours-saved figure appears anywhere in this file. Vendor self-reported usage counts
> are recorded only as *claims a vendor makes* and are excluded from every Kinship artifact.

## 1. Lane 1 — community SaaS with AI

| Product | Shipped AI (their labels) | Human-in-the-loop? | Price, as read 2026-10-17 | Event lifecycle / cross-channel |
|---|---|---|---|---|
| **Circle** | "Circle AI" credit system; AI-agents blog lists 6 roles incl. Academy Support; Member Finder **"still in testing"**; Moderation **"experimenting with"** <https://circle.so/blog/ai-agents-for-communities> | **Soft** — admins "jump in wherever needed". No pre-action approval object found | Professional **$89/mo\***, Business **$199/mo\***, Scale **$419/mo\*** (annual, USD); "Circle AI — 2,500 credits/mo" at entry, 5,000 on growth, "maximum" at top; credits "combine Circle AI, workflow tasks, API calls, and **agent tokens**"; AI moderation/knowledge engines start at Scale <https://circle.so/pricing> | Agent-run events **not confirmed** ("planning events" reads as generative tools). Single platform, no cross-channel |
| **Bettermode** | "Ask AI and Federated search" (Growth). **Toggy — "the AI team that runs your community"** — add-on, launched **2026-10-05** | **Not documented.** `bettermode.com/toggy` returned **404**, so per-agent roles and gating are `[UNVERIFIED]` | Starter **$1,788/yr**; Growth **$18,000/yr**; Premium contact; **Toggy "From $750 a month"** <https://bettermode.com/pricing> (plan ladder corroborated by a secondary diff log: <https://pricingsaas.com/companies/bettermode/diffs/2026W41>) | Forum-scoped. **The lane's first true "AI team" packaging, and the closest thing to Kinship's fleet framing that anyone is selling** |
| **Common Room** | Now **buyer-intelligence/GTM**: Person360, Enrichment, Prospector, **AI Scoring**, Ads, RoomieAI, **MCP & CLI**, Auto Dialer, Engage AI Coaching | n/a — sales workflows | Essential **$2,500/mo billed annually**, 5 seats, 100k contacts, 5k RoomieAI credits; Advanced/Enterprise custom (15/30 seats) <https://www.commonroom.io/pricing/> | **Acquired by Zoom 2026-07-02**, terms undisclosed: "activates it with AI agents revenue teams can actually trust" <https://news.zoom.com/zoom-to-acquire-common-room-bringing-buyer-intelligence-to-its-ai-revenue-platform/>. **Has left community operations.** Milestones/Rallies remain the nearest shipped thing to event cadence |
| **Skool** | No shipped AI agent found | n/a | Hobby **$9/mo** (10% txn) / Pro **$99/mo** (2.9%) <https://www.skool.com/pricing> | No events, no reminders, no automation |
| **Mighty Networks** | "Mighty Co-Host™" — assists setup; secondary read (2026-07-19): Co-Host "advisory rather than autonomous"; "People Magic" surfaces relevant members | One assistant, advisory | Growth/Scale tiers; **Admin API requires the $179/mo Scale tier**; course-progress webhooks "delayed by roughly an hour" <https://www.mightynetworks.com/pricing> · <https://www.usecarly.com/blog/mighty-networks-ai/> (`secondary`) | Events creatable; no agent-run promotion or recap |
| **Slack** | Slackbot reframed as a **"personal AI agent"** + Agentforce | Tier-gated, not per-action | Slack AI add-on **"no longer available to purchase"**; changes announced Jun 2025, grandfathered "until their first renewal after August 17, 2025"; basic AI → Pro, advanced → Business+/Enterprise+ <https://slack.com/help/articles/39264531104275>. Page rendered Free $0 / Pro $4.38 / Business+ $9 / Enterprise+ $45 — **not reconcilable with historical per-user pricing → `[UNVERIFIED]`** <https://slack.com/pricing> | Channel summaries and agent tasks inside Slack only |
| **Discord (platform)** | Native scheduled events, forums, AutoMod (rule-based), roles. 2026-09-08 patch notes show **no** AI agent | — | — | **⚠ `support.discord.com` returned 403 (Cloudflare) on every attempt**, so AutoMod/Server-Insights specifics are unverified. "No shipped Discord AI agent" rests on absence of AI items in the blog index and patch notes — **negative evidence, not proof** |

## 2. Lane 2 — the actual incumbent: free volunteer bots

| Bot | What ships | Price, primary unless noted | Event lifecycle? |
|---|---|---|---|
| **Apollo** (Discord) | Recurring events, one-click button signups, custom signup options with **per-option capacity + auto waitlists**, role-restricted signups, **up to 5 custom reminders**, auto-archive, scheduled event posts, upcoming-event **digests**, Google Calendar sync (auto on paid), cross-server posting, white-label | Free ≤5 recurring / 1 reminder; Premium **$8/mo** or **$6/mo ($72/yr)**; Pro **$25/mo** or **$20/mo ($240/yr)** <https://apollo.fyi/premium>. Vendor claims "300,000+ servers, 29M+ events, 102M+ signups" — **self-reported, unused** | **Yes — the whole create→remind→signup loop, inside Discord** |
| **Combot** (Telegram) | "Analytics, moderation, automations, scheduled posts, AI and anti-spam"; CAS free | Free; Pro **$9.99/mo**; Business **$100/mo**; history 32d/100d/1yr; automations 2/50/200; "up to 30 scheduled messages per chat"; AI at **"$1 for 1,000 tokens"** <https://combot.org/> | Scheduled posts only |
| **MissRose** (Telegram) | Anti-spam, bans, "federation management and audit trails" | Free public deployment; **"Rose is not open source"**; "paid, customisable versions" <https://missrose.org/FAQ/> | No |
| **Shieldy** (Telegram captcha) | Captcha/anti-raid | Free; MIT, **957★**, last push 2026-02-09 <https://api.github.com/repos/1inch/shieldy> | No |
| **GroupHelp** | Site **failed to load**. OSS re-creation GPL-3.0, **38★**, last push **2024-11-08** (≈ dead). Secondary (2026-05-06): free; "~$3/group/mo" for advanced <https://getvarta.com/blog/telegram-moderation-bot-pricing-comparison-2026/> (`secondary`) | — | No |
| **MEE6** | Automations 0 free → 50; XP/Levels, Moderation, welcome, giveaways, YouTube/Twitch alerts gated; **"AI services (MEE6 AI, AI Characters): Not in upgrade, sold separately"** <https://help.mee6.xyz/en/articles/710936> | Premium price did not render on <https://www.mee6.xyz/en/premium>; `secondary`: **$11.99/mo, $49.99/yr, $89.99 lifetime** per server <https://www.vibebot.gg/blog/mee6-pricing-explained> (a **competitor-written** page) | No |
| **Carl-bot / Dyno** | Carl: 8 free automod modules, premium "Drama Watcher"; Dyno: 19 free filters, paid = advanced automod with per-rule log channels; Dyno has reminders | `carl.gg/get-premium` rendered no price; **`dyno.gg/premium` 403**. `secondary`: Carl **£6.50/mo via Patreon**, Dyno **$5.99/mo or $49.99/yr Standard** <https://supervisor.gg/blog/carl-bot-vs-dyno-vs-supervisor> | No |
| **Ticket Tool** | Tickets/panels/transcripts/dashboard/history <https://docs.tickettool.xyz/> | Premium price did not render — `[UNVERIFIED]` (note: ticket-tool.app is a different clone) | No |
| **Wick** | — | **wick.ai now shows a domain-for-sale page (min offer $69,500)**; official product site not located | No |
| Session Replay / Apollo access control | **Not verified**; apolloaccess.io fetch failed | — | No |
| **WhatsApp (ID communities)** | **Meta Groups API**: "now open to all businesses with an **Official Business Account (OBA)**"; send/receive group messages, remove participants; **`Max group participants: 8`**; up to 10,000 groups per business number; **no edit/delete**; **"Groups are not available for WhatsApp Business app phone numbers"**; "Performance metrics are not available for message templates used in Groups" <https://developers.facebook.com/documentation/business-messaging/whatsapp/groups> · Unofficial **Baileys** MIT, **11,355★**, pushed 2026-10-17 <https://github.com/whiskeysockets/Baileys> · Mekari Qontak sells a "WhatsApp Bot" for blast/CS, **no group-bot claim**, no price on page <https://qontak.com/fitur/whatsapp-bot/> | Broadcast + 8-person groups only |

**Read this row twice, because it reorders our positioning:** the pre-event Discord loop is **already solved for
$0–25/mo by a bot that communities already trust**. Kinship's value is not "we run events"; it is the chain that
Apollo cannot reach (cross-channel, RSVP→no-show→recap→sponsor report), the governance nobody in this row has
(per-action approval, once-vs-always grants, replayable audit), and the language rule no foreign vendor ships
(bilingual ID+EN).

## 3. Lane 3 — open-source community AI

| Item | Status | License / maturity |
|---|---|---|
| **Discourse AI** | **"Discourse AI is now shipped with Discourse core"** <https://github.com/discourse/discourse-ai> (96★, license field null, pushed 2026-08-27). Modules per <https://meta.discourse.org/t/discourse-ai/259214>: AI Bot, semantic AI Search, **"Spam Detector … one-click AI-powered spam detection"**, Automation ("automatically classify your posts and topics via AI triage"), Helper, Related Topics, Sentiment, **Summarize (topics + chat)**. Moderation can hide/tag/flag NSFW or toxic. **"LLM Usage Quotas"** = token-cost tracking. Multi-provider incl. self-hosted. Initially Pro/Business/Enterprise hosted tiers | Discourse core **GPL-2.0, 47,987★**, pushed 2026-10-16 → **real, mature, free, and it already does our Moderator agent's job on a forum** |
| **Chatwoot** | Captain AI: reply suggestions, message summarisation, knowledge-base answers; credits 300/500/800 by plan, extra **$20 per 1,000**; cloud $0/$19/$39/$99 per agent/mo; Startups free for OSS <https://www.chatwoot.com/pricing> | **NOASSERTION** (open-core), **37,872★**, pushed 2026-10-17 |
| OSS AI-moderation shelf | <https://github.com/topics/ai-moderation> top repos: worrybox **6★**, XShield **5★**, Redacted-Bot **3★**, openguard **3★** | Thin-to-abandoned; outside Discourse there is no OSS moderation to compete with — and none to reuse either |
| **HumanLayer** | Control plane for **coding** agents, not community moderation <https://www.humanlayer.dev/> | adjacent pattern only |
| Mastodon / PeerTube | **No shipped AI moderator found**; only academic work (<https://arxiv.org/html/2501.05871v1>, 2025-01) | absence of evidence |

## 4. Lane 4 — analytics / member intelligence / ticketing venues

- **Common Room** — §1: AI Scoring, "unlimited alerts, workflows and segments". At **$2,500/mo entry** and now
  sold to revenue teams, it is not a volunteer-community option. **The member-intelligence slot is therefore empty
  for volunteer meetups** — churn and re-invite work belongs to an agent with a budget, not a dashboard nobody can
  afford.
- **Orbit** — `orbit.co` **301-redirects to shift.to**, an unrelated "SHIFT Thinking" site. **No shutdown or sunset
  notice found**; recorded as unreachable, not as defunct.
- **Luma** <https://luma.com/pricing> — Free "forever", unlimited events/guests; **Plus $59/mo billed annually**,
  "up to 5,000 invites and newsletters per week", Zapier, **"Blasts and automated reminders via email, SMS, push
  notification and WhatsApp"**, Zoom integration with attendance tracking; add-ons up to **$800/mo**.
  **Consequence: the reminder lane is already a paid feature of the venue.** Our reminder value must be sequencing,
  cost governance and approval — stated that way or it is falsifiable in one page-load.
- **Discord Server Insights** — `[UNVERIFIED]` (403).
- **"GammaSuite"** could not be verified as a community-analytics product at all; **Busuu** is language learning.
  Both were named in the brief and neither is a real competitor — recorded so the next pass does not chase them.

## 5. Actionable takeaways (the part that changes work, not just knowledge)

1. **Position as the fleet/governance layer, never as "another bot".** Apollo already wins event mechanics in
   Discord at $0–25/mo; MEE6/Carl/Dyno own automod and tickets; Combot owns scheduled Telegram. Every one of those
   is an integration or a co-existence, not a feature to rebuild (PRD FR-4.2: additive to free bots).
2. **Two price anchors now exist for "AI that runs a community"** — Toggy **from $750/mo** (organisation tier,
   gating unverifiable) and Apollo **$8–25/mo** (individual organiser tier). A $99–$1,788/yr gap between them is
   where a self-hosted OSS product sits for free, and that is the honest framing for the AIClub pitch: *free,
   self-hosted, supervised* — not "cheaper than", because we have no cost of ownership figure to compare.
3. **Open source is not a moderation differentiator.** Discourse ships it in core under GPL-2.0 with quotas. Build
   the orchestrator, the bilingual content agents, and event ops **on top**; do not ship another AutoMod.
4. **Common Room's exit and Orbit's disappearance mean the cross-channel member-intelligence slot is open but
   unproven** — absence of competitors is also consistent with absence of demand, which is exactly the risk PRD §10
   names and phase 1 is instrumented to test.
5. **Skip WhatsApp group botting via unofficial libraries.** The official API caps at 8 participants and requires
   an OBA number; Baileys-class routes carry ban risk on the organiser's number. Support WhatsApp as read, draft,
   and individual approved templates — and treat Luma's existing WhatsApp blast as the sanctioned route for
   broadcast, not something we rebuild.
6. **Do not re-implement MEE6/Carl/Dyno automod or Ticket Tool panels.** Integrate and flag.
7. **Verification debt to close before any external copy:** Discord AutoMod + Server Insights, Ticket Tool pricing,
   MEE6 premium price, Bettermode Toggy's page, Qiscus/Wati IDR cards, Skool/Circle/Slack JS-rendered tiers.
   Re-read in a browser at the moment of quoting (PLAN W11 carries this as a step, not a hope).

## 6. Coverage gaps in this pass (stated by the pass itself)

1. **Discord could not be read at all** — `support.discord.com` blocked every attempt (403/Cloudflare). The
   "no shipped Discord AI agent" claim is negative evidence from blog index + 2026-09-08 patch notes.
2. **The Indonesian on-the-ground side stayed unreachable.** Meta's group limits, Qontak's marketing page, and
   n8n tutorials were found; **no primary Indonesian source** (kopdar organiser accounts, komunitas tooling, BSP
   group policy) was reached, so "what volunteer Indonesian groups actually run today" is **inferred, not
   observed**. Several bots named in the brief (Session Replay, Apollo access control, "YardBrands", GammaSuite)
   could not be confirmed to exist as described.
3. **No search outside these lanes** for community-facing agent frameworks (LMS/email-ESP competitors, HubSpot-class
   event journeys, Slack/Discord app-store agent listings) and **no organiser quotes** on which analytics metrics
   are actually used.
4. **Third-party price figures were not re-verified against a second source** except where noted `secondary`, and
   one vendor (Bettermode) had its plan ladder corroborated only by a diff-tracking site.
