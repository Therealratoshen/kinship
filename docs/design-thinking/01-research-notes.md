# Stage 1 — Research Notes (desk research, real sources)

**Mode:** real desk research + simulated primary personas (see `00-challenge-brief.md`).
**Status:** 1 of 6 reports in. Sections fill as agents report; nothing below is simulated — every claim has a source.

**Legend:** [E] = evidence with source · [A] = assumption/labelled inference by the source itself · [U] = unverified by the research

---

## Report 1 · Indonesian AI/developer community landscape (received 2026-10-17)

### The headline finding

**The slot is open and the demand is spoken out loud — but incumbency risk is real.** No Indonesian platform/community specifically for sharing and building *AI agents* exists; agent-builder energy in 2025–26 is scattered across WhatsApp/Facebook/IG and one-off vendor events. Meanwhile frontier-lab communities (Anthropic, OpenAI, Google) are actively courting the *same* Indonesian audience for free. [E]

### Communities & events (verified 2025–2026)

- **GDG network active and AI-pivoting:** GDG Jakarta "Build With AI 2026: Industrializing Intelligence" (2026-06-06); GDG Makassar + GDG Bali Build with AI workshops; chapter list maintained on GitHub (`gdgindonesia`). Total chapter/member counts: [U] ([GDG Jakarta event](https://gdg.community.dev/events/details/google-gdg-jakarta-presents-build-with-ai-2026-jakarta-industrializing-intelligence/), [GDG Makassar](https://gdg.community.dev/events/details/google-gdg-makassar-presents-build-with-ai-2026-hands-on-workshop/), [chapter list](https://github.com/gdgindonesia/listcommunitygroup-gdgindonesia))
- **Dicoding** runs **DevCommunity Support 2025** — *funds* local dev communities ([Dicoding blog, 2025-05-23](https://www.dicoding.com/blog/dicoding-devcommunity-support-2025-untuk-komunitas-di-seluruh-indonesia/)). Meaning: community money in Indonesia flows through an incumbent platform's grant program. [E]
- **Vendor/lab-run AI communities now land in Jakarta directly:** Claude Indonesia Community launch workshop ([Luma](https://luma.com/bzezz6ym)); OpenAI Build Week Community Hackathon Jakarta ([Luma](https://luma.com/keng8c0n)); Codex Hackathon Jakarta 2026-07-18 with organizer recap ([LinkedIn](https://www.linkedin.com/posts/naufaldirafif_recap-codex-hackathon-jakarta-july-18-activity-7485316594483585025-xpBP)). [E]
- **Tool-specific communities exist but are platform-hosted fragments:** Komunitas n8n Indonesia (Facebook group, member count [U]) ([FB](https://www.facebook.com/groups/472780242492093/)); Python Indonesia active; PyLND.AI status 2026 [U].
- **Government/ministry hackathons real:** Kemenkes Healthcare AI Hackathon 2025 (23 finalists) ([press](https://kemkes.go.id/eng/kemenkes-luncurkan-healthcare-ai-hackathon-2025-kolaborasi-inovator-untuk-masa-depan-kesehatan-indonesia)); commercial World AI Show Indonesia ([site](https://worldaishow.com/indonesia/)). Tokopedia/GoTo/BRI internal hackathon scale 2025–26: [U].

### Demand signals

- **Talent gap, verified figures:** Komdigi: annual digital-worker demand **600k** vs domestic supply **~453k**, gap persisting to 2030 ([Antara, 2025-08-22](https://en.antaranews.com/news/374873/indonesia-pushes-ai-talent-training-as-it-faces-digital-skills-gap)). Komdigi "AI Talent Factory" headlines **12 juta** digital talents ([Komdigi release](https://www.komdigi.go.id/berita/siaran-pers/detail/wujudkan-kedaulatan-teknologi-nasional-komdigi-siapkan-ai-talent-factory); [GovInsider, 2026-01-21](https://govinsider.asia/indo-en/article/ai-talent-factory-strategi-indonesia-wujudkan-kedaulatan-ai)). ⚠️ The oft-cited **"21,500 AI talent gap by 2030" could not be verified — treat as likely misquoted; do not use.** [E-about-U]
- **Bahasa-language agent tooling content is booming:** full n8n tutorials in Indonesian ([fahmiiireza.com, 2026-08](https://www.fahmiiireza.com/id/insight/tutorial-n8n-bahasa-indonesia/)), paid n8n/AI-integration classes ([taalenta.id](https://taalenta.id/agt/)), bootcamp content funnels noting "puluhan juta" rupiah bootcamp prices ([buildwithangga, 2026-07](https://buildwithangga.com/tips/belajar-gratis-n8n-pemula-tanpa-bayar-bootcamp-puluhan-juta)). [E]
- **Direct quote of latent demand (verbatim, public FB thread):** developers literally asking *"Ada discord komunitas AI lokal Indonesia?"* ([FB GeForceCommunityID thread](https://www.facebook.com/groups/GeForceCommunityID/posts/2901081010055555/)). [E]

### Monetization that works in Indonesia

- Dominant model = **sponsor/vendor-funded free** (IDCamp = Indosat×Google; Dicoding's Google-backed academy; GDG community grants). [E]
- **Paid niche communities exist** (Koncoweb AI/no-code membership, price not public [U]; paid vibe-coding batches by bootcamps [E]). "IDR 100k–1jt+/yr typical paid-community pricing": [A — source's own industry-rumor caveat].
- **WhatsApp/Telegram groups monetize funnel-to-course, not subscriptions**; 29 Indonesian dev groups listed, mostly small and WA-first ([velixs directory](https://velixs.com/id/dev-communities-id)) — counts there are click metrics, not members. [E]

### Implications for Kinship (mine, not the source's — [INFERENCE])

> **Correction 2026-10-17, after owner flagged aiclub.id:** the report's gap check missed an existing player. **AIClub Indonesia** ([aiclub.id](https://aiclub.id)) is a live, free general-AI community platform: 3,976 members across 34 provinces/264 cities (site stamp 2026-10-17), chapters running offline kopdars (Yogyakarta #1, [IG](https://www.instagram.com/reel/DauAOYEluRR/)), job roles/polls/showcase links, org "AIClub Indonesia", site components MIT by Rama Aditya. The refined gap statement: *general AI communities exist in Indonesia; none found for **agent builders sharing runnable agents**, and none found with agent-run community operations.* That narrower slot is still open — and AIClub is the obvious beachhead/partner candidate rather than a rival for the builder niche.

1. Filbert's event-organiser position is the actual differentiator: the gap isn't "no Indonesian AI community" (GDG/lab communities fill that), it's **no venue for sharing/forking working agent builds in Bahasa+English with events attached**. That matches the hub side (Side A) wedge — narrow and specific.
2. Competing head-on for *general* AI-community attention against Anthropic/OpenAI/Google free offerings is a losing frame; competing on **practical agent ops + meetups + Indonesian context** is not something they run.
3. Viability evidence points at **sponsor-funded model** (telcos, cloud vendors, Dicoding-style grants) as the Indonesian-native revenue path — not member subscriptions. Paid-community precedent exists but is course-funnel-shaped.
4. The fleet side (Side B) got an unexpected corroboration: the most successful "communities" found are *event clusters* (hackathons, build weeks, workshops). Events-first community operations is demonstrably the shape that works in Indonesia.

---

## Report 2 · Global AI-agent community landscape (received 2026-10-17; GitHub figures pulled live 2026-10-17)

### The headline finding

**The gap is real and verified — and so is the failure mode.** Tool-attached communities (n8n, LangChain, CrewAI, Flowise) own discovery; builders exist in enormous numbers; **no neutral cross-framework agent community with functioning creator economics exists** — every attempt (GPT Store, agent.ai, agpt.co marketplace, aiagents.io) atrophied, shrank, or monetizes only indirectly. Go/no-go hinges less on demand than on the payout problem incumbents deliberately avoided. [E]

### Incumbents, measured

- **n8n = the benchmark of "community + templates" done right:** 13,490 community workflow templates ([n8n.io/workflows](https://n8n.io/workflows/), 2026-10-17); forum 182,126 users / 48,128 topics ([about.json](https://community.n8n.io/about.json), 2026-10-17). **Verified Creator program pays $0 direct revenue share** — badges, listing, team access ([n8n.io/creators](https://n8n.io/creators/)). Community itself keeps proposing a paid marketplace ([forum thread 2026-03](https://community.n8n.io/t/exploring-an-idea-marketplace-for-n8n-workflows-ai-automation-templates/273992), r/n8n "anyone actually making money?" thread). [E]
- **GPT Store = the cautionary tale:** ~3M GPTs created, ~159k public/active (third-party estimate, 2026-01 [digitalapplied](https://www.digitalapplied.com/blog/gpt-store-custom-gpts-business-guide-2026), treat as reported-not-official); revenue-share a capped trickle (~$0.03/conversation); flooded with low-value bots within months of launch ([Quartz via HN](https://qz.com/ai-girlfriend-bots-are-already-flooding-openai-s-gpt-st-1851159131)). [E/U-mixed]
- **LangChain forum small vs n8n** (3,571 users / 1,669 topics, 2026-10-17); **CrewAI forum** 5,395 users / 13,134 posts (2026-10-17). The oft-referenced CrewAI "community agent gallery": **not found — unverified, likely nonexistent as described.** [E]
- **Relevance AI marketplace: ~20 free agents** — live but tiny, lead-gen model ([marketplace](https://marketplace.relevanceai.com/), 2026-10-17). **Poe** runs the only durable per-message creator payout program (since 2023-10, [TechCrunch](https://techcrunch.com/2023-10-31/quoras-poe-introduces-an-ai-chatbot-creator-economy/); [earnings ToS](https://poe.com/pages/earnings-tos) still live) — but no published aggregate creator wealth. [E]
- **Dead/shrunk standalone agent networks:** agent.ai domain now redirects to a HubSpot-adjacent builder (fetched 2026-10-17); aiagents.io serves a lander redirect; AutoGPT's marketplace = 32 paid experts ([agpt.co](https://agpt.co/product/marketplace/)). [E] Recurring corpse: single-purpose marketplace attached to no tool-wallet. [A — source's synthesis]

### Demand proxies (GitHub, live 2026-10-17)

n8n **207.7k★/61.2k forks** · AutoGPT 187.6k/45.9k · LangChain 147.9k · MetaGPT 70.9k · AutoGen 61.4k · Flowise **55.5k★/25.1k forks** (fork ratio ≈ 0.45 — unusually high, a template-tinkering culture signal) · CrewAI 59.8k · LlamaIndex 52.5k. `e2b-dev/awesome-ai-agents` 30.5k★ = appetite for curated discovery. [E]

### Quality/complaint evidence (what people dislike about the status quo)

- Templates ship "generic skeletons" missing org context/permissions, degrade as vendor APIs change, optimize "for the screenshot" ([aiagent.app critique, 2026-07-28](https://aiagent.app/blog/ai-agent-marketplace)). [E-vendor-adjacent, treat accordingly]
- Discovery fragmented across Discords/subreddits/paid-course funnels; course-seller noise documented ([aibuilderclub roundup, 2026-07](https://www.aibuilderclub.com/blog/best-ai-agent-communities-2026)). [E]
- **Real money is indirect:** templates as lead-gen for $5k–20k consulting setups (reported, [digitalapplied](https://www.digitalapplied.com/blog/gpt-store-custom-gpts-business-guide-2026)); self-reported "$1.3k–3.2k/mo selling n8n workflows" on Medium — self-reported, [U]. Creator earnings via listings: essentially nowhere except Poe's per-message pool. [E]

### Implications for Kinship ([INFERENCE])

1. Side A must **not** launch as "template marketplace with revenue share" — that's the documented corpse pile. The defensible Side A shape is closer to **"runnable, governed squads + proof-of-work trails"** (see paperclip-lessons §1.12): contribution = squad packs/playbooks, reward = distribution + services + status (which is exactly what n8n's $0 creator program proves people accept).
2. Fork-heavy Flowise + 13.5k n8n templates: people DO fork/tinker/share when the tool is in their wallet. A hub needs the wallet first (the fleet), the gallery second.
3. The payout problem is unsolved industry-wide; if Kinship solves even *attribution* (who built what, what it ran), it creates the missing quality signal — a cheaper win than payouts.

---

## Report 3 · Community cold-start & churn evidence (received 2026-10-17)

### The headline finding

**Every surviving community was tool-first; every pure venue died or ghost-townied.** The strongest negative signal in the whole research set: the most-funded agent-sharing marketplace of the cycle — OpenAI's own GPT Store — ghost-towned on schedule (3M artifacts, no creator income, custom-GPTs announced for retirement in 2026). The strongest positive: agent *building* activity is exploding, and **event-seeded communities demonstrably grow** (AI Tinkerers: ~3,800 members in 2025 from offline demos alone, self-reported). [E]

### Cold-start pattern (single-player mode first)

- Andrew Chen's *Cold Start Problem* (2021): solve chicken-and-egg with **single-player value** — the product must be useful to one user on an empty network; "pick the smallest network that can be useful and dominate it." [E] ([PDF](https://andrewchen.com/wp-content/uploads/2022/01/ColdStartProb_9780062969743_AS0928_cc20_Final.pdf))
- **Hugging Face** pivoted 2019 to infra; the upload→likes→fork loop was the single-player mode; 2.4M models / 50k orgs by 2026 ([Contrary Research, 2026-01](https://research.contrary.com/report/hugging-face)). **Obsidian**: community formed during private beta, product-led, <12 staff, 1M+ members ([Robin Landy, 2024-06](https://www.robinlandy.com/blog/obsidian-as-an-example-of-thoughtful-pricing-strategy-and-the-power-of-product-tradeoffs)). **Supabase**: the OSS repo *was* the community surface; hosted followed traction. **n8n**: template flywheel attached to an already-usable tool. Indie Hackers (forum-first) is the one counterexample — [A, no primary source found]. [E]

### Death mechanics

- **90-9-1 participation inequality** (NN/g, 2006): ≥90% lurk, ~1% create — a launch-day directory is 99% empty to lurkers. [E]
- **GPT Store post-mortem:** revenue sharing never materialized for ordinary creators; discovery broken; near-zero usage for most GPTs ([OpenAI community thread, 2024-11](https://community.openai.com/t/gptstore-failure-reasons-ranking-featured-categories/1028710); retirement reporting [2026-04](https://scottarmbruster.com/articles/custom-gpts-dead-workspace-agents-replace-them/) — shutdown dates conflict across trackers, verify before citing). [E/U]
- **Killed by AI tracker:** 164 dead AI products, avg lifespan 3y2m, 89 deaths already in 2026. [E]
- **Supplier betrayal → exodus:** Envato's 2026 revenue-share/exclusivity changes triggered elite-author departures ([author thread](https://www.reddit.com/r/envato/comments/1tatz2t/as_an_elite_author_my_honest_take_on_envatos/)). Change terms, lose the 1%. [E]
- The requested "Ghost Towns"/Neocities study and Webb talk: **not found this session** — prior citations of them should be treated as [A], superseded by the verifiable analogues above.

### Contributor motivation & earnings reality

- Motivation surveys (large-sample, [arXiv 2404.08303, 2024](https://arxiv.org/html/2404.08303v1); ICSE 2021 *Shifting Sands*): **intrinsic enjoyment, learning, reputation/career signaling dominate; payment doesn't sustain**. Contributions drop when the "love stage" ends unless impact is visible. [E]
- Earnings long tail: third-party Gumroad analysis claims **median ~$72/yr** per creator, ~4.3% above meaningful thresholds ([Medium analysis, undated](https://medium.com/@automation.labs/why-ai-notion-template-income-fails-gumroad-s-median-is-72-3d381b8b35e0)) — directionally matches Envato threads; exact figures [ASSUMPTION-grade].
- What works instead: **distribution reach → services** (HF profiles → hiring; n8n templates → consulting funnels). [E pattern]

### Distribution economics

- Dev-audience sponsorship: **$35–60 CPM on dev newsletters**, niche placements $100–2k ([daily.dev, 2026-04](https://business.daily.dev/resources/developer-newsletter-advertising-reach-engineers-inbox/); [beehiiv, 2025-11](https://www.beehiiv.com/blog/newsletter-sponsorship-cost)) — sponsor money exists *once an engaged audience is proven*. [E]
- **No credible public benchmark** for time-to-1k active members or attendee→member conversion. Practitioner rule consistent with Chen: 100–1,000 atom users, months not weeks. [E-about-U]

### Top-5 fail / top-5 traction (verbatim synthesis from the report)

Fail: (1) no single-player value; (2) 90-9-1 ghost math; (3) hype-wave churn; (4) incumbent distribution owns creators' audiences; (5) "revenue share will drive contributions" is empirically near-worthless.
Traction: (1) tool-first, community-second; (2) seeded atomic loop with **status payoff**; (3) niche-dominance entry (one language/framework/city); (4) **offline/event seeding with curated density**; (5) sponsor-funded once engagement proven — not storefront cuts.

### Implications for Kinship ([INFERENCE] — these now cross-confirm two other reports)

1. **This is independent, evidence-backed support for PRD §7 Branch B.** "Tool-first, community-second" + the fleet's single-player value (an organiser runs *their own* community better with it, day one, zero network needed) is exactly the HF/n8n/Obsidian pattern. The hub-first branch is the pattern that killed the GPT Store.
2. Traction condition (4) — event seeding — is the one where Filbert already holds an asset no competitor in any report matched. Combined with the Indonesia report's "event clusters are how Indonesian communities work," this is the strongest triangulated insight so far.
3. Hub contribution design must target **status + learning + distribution** (survey-backed), not payments. Paperclip-lessons §1.12's "squad packs + proof-of-work trails" fits; "creator marketplace cut" does not.
4. Niche-dominance entry says: launch to *one dense sub-network* — Indonesian AI-agent builders who meet in person — not "Indonesia + global" simultaneously. Hybrid stays the destination, not the launch posture.
## Report 4 · Open-source platform precedents (received 2026-10-17; figures fetched live)

### The headline pattern (strongest single lesson in this report)

**Open-sourcing a *community platform* reliably produces software users and hosting revenue — not communities.** The forum-software record is direct evidence: Discourse (~48k★, GPL) works as a *vendor* whose business is Discourse Cloud, with self-hosting explicitly encouraged but communities forming around tools, not repos; Zulip (26.1k★) has 1,500+ contributors yet stayed niche; **Flarum stalled** (minimal 2.x commit pace, hobby forums only, no hosting engine); and the search "Circle.so self hosted alternative" returns a **decade-long unmet request with no credible OSS answer** — the gap exists but nobody has filled it profitably, partly because GitHub Discussions/Discord/Slack are free incumbents. [E]

### Where OSS *did* work as an attraction engine: tools-for-building with vendor-run canonical catalogs

- **Dify** 158.7k★/25.1k forks (Apache-2.0 + additional conditions); marketplace ≈ **1,000 plugins + 300 templates**, vendor-run and canonical ([Dify blog, 2026-09-09](https://dify.ai/blog/from-discovery-to-response-a-more-connected-dify-marketplace)). [E]
- **n8n** 208k★, **fair-code/Sustainable Use — explicitly NOT OSI**, yet 9,000+ community blueprints: community creation worked *without* an open license, at the cost of recurring "not really open source" friction ([HN](https://news.ycombinator.com/item?id=32797853)). Closest analogue to Kinship's product shape. [E]
- **AutoGPT** 187.6k★: MIT core but platform under **Polyform Shield** (can't sell competing hosting); highest star-fame-to-abandonment criticism in the set. **Open WebUI** 155.9k★: deliberately *re-closed* (non-OSI branding clause + enterprise licensing) with documented backlash ([r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/comments/1kg4avg/openwebui_license_change_red_flag/)). **Flowise** 55.5k★ Apache-2.0; **Langflow** 155.8k★ MIT; **LobeChat** ~82k★ Apache-2.0 with the skill catalog (10k+ skills) living on the vendor site, 684 open PRs = real contribution appetite; **ComfyUI** 137.5k★ with the official Registry as canonical node catalog; **CrewAI** MIT, claims 100k+ course-certified devs. [E]
- Pattern: **every large agent project that monetized added non-OSI or branding/enterprise restrictions — and each drew backlash.** [E]

### Sustainability numbers (the sober part)

- **60% of maintainers still unpaid** (Tidelift/LSR 2024, >400 respondents [dev.to summary](https://dev.to/tidelift/60-of-maintainers-are-still-not-paid-for-their-work-35jo)).
- **Median bus factor = exactly 1**; ~15% of npm packages lack active maintenance annually; 60% of maintainers have quit or considered ([BreakPoint State of Abandonment 2026](https://breakpoint.network/state-of-abandonment-2026)). [E]
- Money is institutional: Open Collective FISC took ~$12.5M in 2024, paid out $9.7M across *thousands* of projects ([board report](https://opencollective.com/opensource/updates/2024-25-board-and-strategic)); the $7.7B/yr OSS funding figure is **corporate-backed** OSS, not hobby projects ([2024 survey](https://opensourcefundingsurvey2024.com/)). Individual medians ≈ zero. [E]
- **Stars ≠ users:** ~4.5M suspected fake stars across GitHub ([arXiv 2412.13459](https://arxiv.org/html/2412.13459v1)). "OSS will attract users" is a hope, not a mechanism. [E]

### Forkability: the community-platform-specific trap

Canonical hubs survive forks when **catalog, moderation, identity and SEO live server-side, not in the repo** (meta.discourse.org, Dify Marketplace, Comfy Registry, LobeHub index). Mastodon is the warning: the code succeeded, the *network* fragmented into thousands of admin-burdened silos with shallow cross-instance interaction ([arXiv 2502.17926](https://arxiv.org/html/2502.17926v2)). Flarum is the other warning: a stalled OSS forum leaves **no** canonical community at all. [E]

### Implications for Kinship ([INFERENCE])

1. **The license question (PRD Q4) has a researched answer shape:** open-source the *squad-pack schema, agent-role format, and channel-adapter SDK* (the proven top-of-funnel), keep the *canonical hub, catalog, moderation and identity* hosted and fork-resistant — **the Dify/Comfy shape, not the Discourse/Flarum shape.** Full-OSS-the-venue is the documented losing move for a community play.
2. "Open source" as credibility still works on exactly Filbert's audience (indie Next.js/Supabase devs); note n8n proves the *community* benefit doesn't even require an OSI license — but the honesty tax is real (recurring backlash), so pick a clean lane.
3. Maintainer-burnout data (bus factor 1, 60% unpaid) lands directly on PRD risk "owner-time": the OSS plan needs delegated-maintenance structure (squad contributors, not just code contributors) or it inherits the abandonment statistic.
4. Aiclub.id connection: its site components are already MIT ("Komponen © Rama Aditya — MIT") — same ecosystem norm; a Kinship squad pack offered *to* AIClub would be a natural first contribution-loop test.
## Report 5 · AI-run community ops & single-vs-fleet evidence (received 2026-10-17)

### The headline finding

**Agents CAN run community ops — but the accepted, shipping design is human-gated, and "fully autonomous" is a documented sales liability.** Circle.so (the closest commercial analogue, Dec 2025) ships AI agents for moderation/onboarding/support **with an AI Inbox for humans to jump in and action limits/escalation**, gated behind ~5,000 credits (Plus) or $419/mo (Scale) tiers. Meanwhile agent-only spaces demonstrably decay: **Moltbook's measured median account lifespan was 2.48 minutes**, with a 4,535-post near-duplicate self-spam cluster and a leaked-1.5M-tokens security incident. The wedge named by the evidence: **event-ops fleet first** (72% of event professionals call AI valuable/essential; 62.4% already use it for marketing; logistics is the untouched lag), community agents later under approval. [E]

### Incumbents, measured

- **Circle.so AI Agents/Workflows** (18 Dec 2025): agents "take initiative and engage directly with members" — with human escape hatch. Approval-gated is what the market's leading platform actually shipped ([circle.so/ai-workflows](https://circle.so/ai-workflows); [review 2026-10-07](https://mvmplabs.com/blog/circle-ai-agent-review)). [E]
- **Zoom acquired Common Room (17 Jul 2026)** — community intelligence monetized as sales/GTM data, not autonomous CM ([Zoom blog](https://www.zoom.com/en/blog/zoom-to-acquire-common-room/); $266.8M figure single-sourced, [U]). **Nectar raised $40.6M total and rebranded "Nectar Agent"** — VC money arriving at the agent-employee frame, scope content+reporting, no governance ([Demand Gen](https://www.demandgenreport.com/industry-news/news-brief/nectar-social-raises-30m-rebrands-itself-as-nectar-agent/53121/)); **CellCog sells an "AI Community Manager" at ~$5–25/task** ([pricing](https://cellcog.ai/ai-employees/ai-community-manager)). Bettermode/Hivebrite market "human touch," no autonomous agents — evidence of absence. Discord has no first-party community agent. [E]
- **Event ops incumbents:** Eventbrite sold to Bending Spoons 2 Dec 2025 (~$500M) with 2026 staff cuts; Cvent 70+ AI features (Jul 2026). EventsAir survey (380+ pros): 72% AI valuable/essential, 62.4% marketing use, **26% not using at all — logistics lags** ([report](https://www.eventsair.com/resources/ai-in-events-report)). ⚠️ Name-collision trap flagged: the "Luma launches AI agents"/$900M story is **Luma AI (video models), NOT lu.ma events** — do not cite as competitor. [E]
- **Indonesia:** no AI-ops event tooling found (XTIX self-claim only; "Brexa" unfindable EN+ID). Indonesian search results are AI *conferences* — demand-side event volume, no tooling supply. [E-absence]

### The trust evidence (both directions, strong)

- **For:** Epoch survey (n=1,106, Jul 2026): **1 in 5 employed adults already delegates tasks to AI rather than humans**; 66% of outputs used unchanged/minor-edited ([Epoch AI](https://epoch.ai/publications/one-in-five-workers-delegate-work-to-ai)). **Botender field study** (6 Discord servers): members *proposing, iterating, deploying* bot behaviour works — community-configurable agents are the retention unlock, with deliberate oversight ([arXiv 2509.25492](https://arxiv.org/html/2509.25492v2)).
- **Against:** AI-restrictive subreddit rules **doubled 0.6%→1.2% (1,348→2,808 communities) Jul 2023→Nov 2024, ~17% among top-tier** ([arXiv 2410.11698](https://arxiv.org/html/2410.11698v3)); Microsoft's Copilot Discord auto-mod blocked the criticism term "Microslop" — a **6-month brand-incident** ([Windows Latest](https://www.windowslatest.com/2026-09-24/microsoft-tried-to-ban-microslop-and-six-months-later-it-has-given-up/)); Reuters 2026: AI-chatbot news trust only 20%. The **flag-don't-delete** moderation posture is politically the only survivable one. [E]
- **Multi-agent governance proof:** Project Sid (10→1,000+ agents, arXiv 2411.00114) showed emergent specialised roles and collective rule adherence — governance works *in simulation*; nothing tested against human members. AI Town remains a demo kit. [E]

### Whitespace confirmation (E3)

Searched (Oct 2026, EN+ID variants): `open source AI community manager agent`, `agents that moderate Discord/Telegram github`, `multi-agent control plane task governance`, `event operations multi-agent open source`, top-20/50 OSS agent lists → **no open-source product ships "agents running a community + its events."** Frameworks (CrewAI/LangGraph/AG2/Agents SDK/n8n) are vertical-agnostic; "agent control plane" is an emerging ops concept (IBM). [E-absence]

### Implications for Kinship ([INFERENCE])

1. The PRD's §1.1 posture ("fleet proposes, organiser approves; flag, never delete") is now **evidence-mandated, not just cautious**: it's the exact shape the market's leading shipping implementation landed on, and the counter-cases (Moltbook, Microslop) show what happens when it's ignored.
2. Kinship's differentiation vs Circle isn't "more autonomy" — it's **open source, event-lifecycle-native, multi-audience governance, and Indonesian-channel fit (WA/Telegram)**. The pricing ceiling reference just moved too: $419/mo hosted is the anchor OSS undercuts.
3. The "expensive Zapier" objection (report 6) has its answer here: the fleet wins where **dialogue state + judgment + approval** exist — reminders-sync loses to Zapier, onboarding-chase-and-recap is genuinely agent work.
4. **Best beachhead per external research, converging with the owner's own plan:** event-ops fleet first, measurable ROI, low identity threat — pilot publicly with the builder community; AIClub as the named partner trial fits exactly this wedge.
5. Risk §10 "member-facing trust" upgraded: E6 no longer pending — incumbents gate agents behind approval, buyers will demand the same.

## Report 6 · Integration surfaces (received 2026-10-17)

### Per-platform verdict (openness × organiser importance × defensibility)

1. **Discord / Telegram — most open.** Free mature bot APIs, moderation/automod/scheduled events, full group read-write ([Discord gateway docs](https://docs.discord.com/developers/events/gateway-events); [Telegram Bot API](https://core.telegram.org/bots/api)). Central to Indonesian tech communities. First adapters to build. [E]
2. **Luma — real write API, but paywalled behind Luma Plus**; events/ticket types/guest emails/registrations; 200–500 req/min; **no documented webhooks**; official Zapier app, third-party Make connector ([help.luma.com/p/luma-api](https://help.luma.com/p/luma-api), [docs](https://docs.luma.com/reference/getting-started-with-your-api)). [E]
3. **WhatsApp Cloud API — per-message pricing since 2025-07-01** + official Groups API (2025) but **Communities features only via unofficial gateways (ToS-risky)**; chatty group fleets get expensive at scale ([Meta pricing](https://developers.facebook.com/documentation/business/messaging/whatsapp/pricing), [Groups API](https://developers.facebook.com/documentation/business/messaging/whatsapp/groups)). High importance in ID, real cost friction. [E]
4. **Slack/Circle/Discourse** — open APIs; Slack admin-gated + seat pricing; Circle has public Admin API + headless components since 2024-08 ([Circle API](https://api.circle.so/apis/admin-api)). [E]
5. **Eventbrite** — full API + Terms, but **the platform now ships its own AI organiser tools** ([press, 2024-25](https://www.eventbrite.com/blog/press/newsroom/eventbrite-introduces-ai-powered-tools-to-empower-creators-and-reimagine-event-marketing/)) — platform-native competition. [E]
6. **Meetup — gated GraphQL with write ops** (OAuth2, 500 pts/60s; application-style access article 403-blocked; **no Zapier app — 404 verified 2026-10-17**); FB Groups — **API deprecated Graph v19.0 (April 2024), no compliant write path** ([Meta changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/)). [E on API facts; access terms U]
7. **Indonesian ticketing (Preta/Kiostix/Gotix/tiketapasaja): no public APIs found** — absence of evidence only. [E-absence]

### Where the fleet genuinely beats Zapier/n8n — and where it's "expensive Zapier"

- **Fleet wins:** (1) conversational community ops (two-way Q&A, RSVP chasing, onboarding — trigger-action can't hold state/dialogue; the whole AI-moderation-bot category exists because Zapier can't moderate); (2) multi-tool event lifecycle with judgment (draft copy, time outreach, recap across Luma+Discord+Sheets+WA); (3) surfaces with dead/absent connectors (Meetup GraphQL, regional ticketing via email/calendar inference). [E+A]
- **Zapier/n8n wins:** Luma→email sync, Eventbrite webhook plumbing, scheduled one-way announcements. **Rule of thumb: if a human wouldn't need to decide anything, plain automation is cheaper, deterministic, more auditable.** [A, practitioner-sourced]
- **Precedent check:** single-agent Eventbrite/WhatsApp AIs are commoditised (domywork, Beam, Relevance; Discord AI mods: Vibebot/Supervisor/SlakBot). **No multi-agent community-ops product found** (searched; nearest is OpenClaw multi-agent routing = personal messaging, not organiser tooling). Gap real, demand unproven. [E-absence]
- **Platform-dependency risk is the loudest warning in the dataset:** Reddit 2023 (Apollo ~$20M/yr → shutdown), X 2023 (indie clients killed), FB Groups API killed 2024, Meetup restricted since 2020, **WhatsApp repriced twice in ~12 months** (next change 2026-10-01). A fleet living in others' APIs **must be adapter-swappable or it's a feature on someone else's roadmap**. [E]

### Implications for Kinship ([INFERENCE])

1. v0 integration order: **Telegram → Discord → Luma (Plus) → WhatsApp (utility-template-priced, low frequency)**. Skip Meetup/FB. Indonesian ticketing = human-assist/calendar-inference mode.
2. The "expensive Zapier" line is the sharpest objection the PRD must answer head-on (§7 Branch B's phase-1 diary is exactly this test).
3. Adapter architecture is a **hard NFR**, not a nice-to-have, given the repricing record.
