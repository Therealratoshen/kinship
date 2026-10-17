# Stage 3 — Ideate

**Anchor POV:** organiser needs delegation *with retained control*; governance is the product. **Anchor HMWs:** 1 approve-in-minutes · 2 graduated authority · 3 attributed proof-of-work · 4 solo value before network · 5 events as the demo.
Rules applied: diverge first (no self-editing), cluster, screen against each HMW's "so that," shortlist distinct approaches only.

## Brain dump (48 ideas, grouped by technique)

### Brainstorming — around the POV

1. Approval inbox à la Circle, but open source and Bahasa/WA-native (HMW1)
2. "Morning briefing" agent: one daily digest of everything the fleet wants to do; organiser tick-tick-tick approves (HMW1)
3. Approve-by-replying "kirim" (send) in WhatsApp — approval UX inside the channel people already live in (HMW1)
4. Autonomy ladder per action class (flag-only → opt-in → auto) with one-click demotion (HMW2)
5. Replayable audit timeline ("show me every action last week and why") as a product surface, not a log file (HMW2)
6. Shatter-guard: any member complaint instantly freezes the responsible agent to draft-mode (HMW2)
7. Veto-window on scheduled posts (queued 2h before send unless pre-approved) (HMW2)
8. Trust score per agent that grows with clean runs — graduated authority *earned*, matching E6's "confidence over time" (HMW2)
9. Squad pack = declarative YAML (agents, roles, tools, autonomy) — forkable like an n8n workflow (HMW3)
10. Proof-of-work trail: every squad records which pack version ran which real event; contributor gets immutable "powered X events" badge (HMW3)
11. Attribution watermark on outbound drafts: "squad by @rizky" footers organisers can toggle (HMW3)
12. Registry hosts packs; canonical instance keeps moderation+identity server-side (Dify shape) (HMW3)
13. "Fork to your community" button that clones a pack into the forker's deployment with credit chain (HMW3)
14. One-organiser mode: works fully solo, zero members needed day one — fleet runs YOUR group (HMW4)
15. Self-host `docker up` + guided channel connect; single-player install in <30 min (HMW4)
16. Import your WhatsApp export → fleet proposes first digest immediately (time-to-first-feeling) (HMW4)
17. Landing page IS a live fleet demo: visitors get an agent-managed onboarding convo (HMW4/5)
18. Event-ops fleet as the only v0 product: promo→reminders→RSVP-chase→day-of→recap (HMW5)
19. Kopdar-in-a-box: chapter-level kit (event page + WA reminders + recap + sponsor slide) (HMW5)
20. Post-event recap auto-drafted from chat log + photos; organiser approves in 1 min (HMW1/5)
21. Sponsor-report agent: compiles turnout/impressions into the deck sponsors expect (HMW5, monetization hook)
22. Calendar-bridge: fleet maintains Google Cal + Luma + WA pinned message in sync (HMW1)
23. RSVP-chaser agent: 1:1 polite follow-ups to registered-no-shows, per-person opt-out (HMW2 guard)
24. Multilingual drafts: EN+ID paired copy for every announcement (owner's standing preference) (HMW5)
25. "Community pulse" weekly scorecard for the organiser only (privacy-safe; no member surveillance theatre) (HMW1)
26. Marketplace-free: packs are MIT; money is hosted-instance + sponsor-funded (E: payouts don't motivate) (HMW3)
27. Events calendar *fed by the fleet* becomes the hub's first content — no empty directory on day one (HMW4/5)
28. Chapter leaderboards: events run, packs shared, response times — status game, not revenue split (HMW3/5)
29. "Bring your own LLM keys" — cost transparency per event (Paperclip budget pattern; sponsor billing code) (HMW2)
30. Incident postmortem template built into the audit trail — one bad post becomes a documented fix, not a meme (HMW2)

### Worst-possible-idea inversion (requirements discovered in the corpses)

31. Worst: bot community where only agents post (Moltbook, 2.48-min lifespans) → requirement: **agents serve humans' dialogue, never replace it**
32. Worst: auto-ban anything negative about the organiser (Microslop) → requirement: **flag-only moderation, human verdicts, criticism-safe**
33. Worst: generic template dump with no context ("optimize for the screenshot") → requirement: **packs must ship runnable-in-a-real-community, with config prompts**
34. Worst: scrape Meetup/FB because APIs closed → requirement: **human-assist lane; never ToS-violating; degrade loudly**
35. Worst: charge members IDR subscription in Indonesia → evidence says sponsor-funded is THE model → requirement: **money flows from vendors/sponsors/orgs, never lurkers**
36. Worst: fully autonomous 24/7 marketing promise → sales liability per E6 → requirement: **marketing leads with supervision, not autonomy**

### SCAMPER on the Paperclip model (selection)

37. **Substitute** engineer-issues for member-conversations → conversation-threads as first-class work items (checkout rule prevents double-replying!)
38. **Combine** routines + events → event lifecycle = a routine with phases
39. **Adapt** chain-of-command → escalation to human organiser is the *top* of the chain (inversion #2 of paperclip-lessons)
40. **Modify** approval cards → checkbox card "pick which 4 of 6 posts go out this week"
41. **Put to another use** work-products → proof-of-work badges for the hub
42. **Eliminate** multi-tenant SaaS at v0 → one deployment per community, self-run
43. **Reverse** cold start → the FIRST community is the fleet's own deployment logs made public (build in public) (HMW4/5)

### Crazy-8s burst (fillers, mostly folded later)

44. Voice-agent host for hybrid events (owner has Agora/Vapi skills) — later
45. Telegram mini-app approval UI
46. "Shadow mode": fleet drafts, human posts manually for 3 events before any auto-send
47. Fleet-on-a-stick: preconfigured VPS image for chapters with no tech lead
48. Sponsor logo placement agent (negotiates nothing — just never forgets; mundane = valuable)

## Clustering → 6 families

| Family | Ideas | Approach |
|---|---|---|
| **F-A Event-ops fleet** | 18,19,20,21,22,23,24,25,46 | the supervised squad that runs an event end-to-end — single-player wedge |
| **F-B Governance plane** | 4,5,6,7,8,29,30,37,39,40 | the "Paperclip for communities" core: ladder, audit, shatter-guard, run-ids |
| **F-C Squad-pack registry** | 9,10,11,12,13,26,28,41 | shareable packs + attribution trails = hub's atomic unit |
| **F-D Install/first-value rails** | 14,15,16,17,27,47 | solo-mode onboarding; time-to-first-feeling engineering |
| **F-E Event-as-distribution** | 5(evade),17,19,27,43,44 | kopdar/webinar as acquisition + content + demo loop |
| **F-F Monetization frame** | 21,26,35,29 | sponsor-funded + hosted-premium; no member subs, no payout economy |

## Shortlist (screened; distinct approaches only)

| # | Idea | Approach | Outcome fit (HMW "so that") | Cheap prototype this week? | Riskiest assumption | Why keep |
|---|---|---|---|---|---|---|
| S1 | **Event-ops fleet in shadow mode** (A+F-D+F-B minimal): one community, one event, drafts-only, approval-by-reply | Do the delegated job first | HMW1+2+4 directly — in-control feeling measured on a real event | ✅ — scripts + n8n/agent harness + a queue doc; no new infra | Organiser (Filbert→Dewi) will keep using it after event #2 | Only branch with a user in hand; produces the demo and the data |
| S2 | **Squad-pack format + proof-of-work trail** (C) | Make contribution the product | HMW3 — recognition→leads | ✅ schema + 2 seed packs (event-ops, digest) authored by owner = not empty | Builders will publish runnable packs only if attribution is enforced | The hub re-scoped to what evidence supports; merge-fodder for F-C |
| S3 | **Kopdar-in-a-box pilot at AIClub** (E+F-A packaged) | Distribution via partner network | HMW5 — events seed growth; sponsor-report = viability | ⚠️ needs AIClub consent (partner lane confirmed) + 1 chapter | Chapters will grant even draft-mode access | Tests external-organiser trust (PRD §2.4) with a named target |
| S4 | **Governance plane as the OSS differentiator** (B) — publish the autonomy-ladder + audit-replay spec | Platform play | HMW2 — confidence over time | ✅ spec doc + reference impl inside S1 | Community-ops governance is what people want vs just cheaper Circle | The durable moat; S1/S2/S3 all consume it |

**Merged away:** F-F folded into S2/S3 (monetization is a property, not a product); idea 44 (voice host) → backlog; 35/32/31 inverted into non-negotiables now embedded everywhere.
**Shared-assumption check:** S1 and S3 share "organisers keep using supervised agents" — but S1 tests it *self*, S3 tests it *externally*; keep both, sequence S1→S3. S2's assumption (attribution→sharing) is independent → keep.
