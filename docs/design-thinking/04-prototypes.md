# Stage 4 — Prototypes

Four cheap parallel prototypes, one per shortlisted idea. Fidelity chosen by the question each must answer. **None is a build commitment** — they exist to be criticized and tested.

---

## P1 — Storyboard: "Dewi's Tuesday" (S1, event-ops fleet in shadow mode)

**Question it answers:** does approve-in-minutes actually produce the *in-control* feeling, and where does the flow break? (flow → storyboard)

Frames (6):
1. **08:02** Dewi opens her phone. One message from Kinship: *"Kopdar #12 in 3 weeks. I drafted the plan below — tap ✅ per item or ✏️ to edit."* Items: date/venue confirm, promo post (ID+EN), reminder schedule, sponsor mention placement, recap plan.
2. She edits the venue line ("add the mosque parking note"), approves 4 items, rejects the IG reel draft ("too formal"), replies in WhatsApp as always. **Total: 6 minutes.**
3. **T-7d / T-1d** reminders queue fires; each sends only because the schedule was pre-approved. A member asks a question in the group → engagement agent *replies as itself* ("assistant of Kopdar #12") with answer + human-escalation button visible.
4. **Day-of:** attendance list drifts; logistics agent nudges registered-no-shows 1:1 (opt-out honored), posts the location update Dewi approved that morning.
5. **T+1:** recap draft lands in her queue: turnout, 3 photo picks auto-selected from the shared album, sponsor slide with logo placement (idea 48), next-date poll draft. She approves at breakfast.
6. **Friday:** pulse scorecard (organiser-only): response times, no-show recovery, spend. One flagged incident in the week: agent drafted a wrong time in a rejected version — shown in the audit replay with her ✏️ correction. She *sees the near-miss the gate caught.* → feeling payoff moment.

**Failure branches to probe in test:** what if she wants to skip reviewing? (what shadow mode is for) What if members react badly to "assistant of..."? (identity disclosure lane) What if two agents want the same thread? (checkout rule demo)

**How to test cheaply:** paper role-play with Filbert as Dewi using HIS real next event; then the same cards in front of 2–3 real chapter organisers.

---

## P2 — Schema sketch: the squad pack + proof-of-work trail (S2)

**Question it answers:** what exactly would Rizky fork, and what makes him publish it? (product/artifact → rough model)

```yaml
# squad-pack: kopdar-ops/id  (MIT)
pack:
  name: kopdar-ops
  locale: [id, en]
  agents:
    - role: event-ops      # lifecycle phases: plan/promo/remind/recap
      tools: [whatsapp.api|draft-only, luma|write, gcal|write]
      autonomy: draft               # draft → opt-in-auto → auto  (per-action-class)
    - role: engagement     # digest, welcome, FAQ
      autonomy: draft
    - role: moderator      # flag-only, ALWAYS flag-only in core packs
      autonomy: flag
  guardrails:
    identity_disclosure: required  # "assistant of ..." never fake-human
    shatter: complaint → freeze-to-draft
  budgets: {llm_per_event_idr: 50000, queue_max: 20}
  needs:   # what the installer must configure — the anti-"generic skeleton" device
    - community_name, schedule, venue_source, sponsor_list, escalation_contact
attribution:
  author: rizky (@handle)          # immutable in pack hash
  powered: auto-counted            # every real event run increments public trail
```

- Forking clones the pack into the forker's deployment; the **usage trail credits the ancestor author** (idea 13's chain) — status payoff, not payout.
- Test question for Stage 5: *does the enforced credit chain change publishing behavior* — verifiable via 2 seed packs + one "fork this" ask at a meetup.

---

## P3 — Value-proposition sketch: Kopdar-in-a-box for AIClub chapters (S3)

**Question it answers:** would a volunteer chapter organiser say yes to this? (business model → one-pager)

| For | Chapter organisers of AIClub-style communities (volunteer, time-poor, WA-first) |
|---|---|
| **They get** | A supervised AI team that runs their kopdar loop — promo (ID+EN), reminders, RSVP chasing, recap, sponsor report — while they approve in minutes from WhatsApp |
| **That is unlike** | Siloed single bots (one job each), USD-priced Western platforms ($419/mo Circle), or ungated autonomy (brand-incident risk) |
| **Because** | Every member-facing action passes their own approval (or their pre-set rules); every action is replayable; authority is graduated and revocable in one tap |
| **Proof-of-result** | The first chapter's 3-event audit trail + time-diary delta (P1 data) |
| **Costs them** | Nothing to start (OSS self-run); sponsor-funded if chapter can't self-host; no member paywall, ever |
| **Our ask** | One chapter, one event, shadow mode, 6 weeks |

**Kill-adjacent risk surfaced by this sketch:** chapters with zero technical members need the "fleet-on-a-stick" (47) — untested ops cost. Note honestly: pitching this *before* P1's own-event data exists is the order that wastes the partner relationship. Sequence: Filbert's event first → proof → AIClub.

---

## P4 — One-page lean canvas: governance plane as OSS wedge (S4)

| Block | Entry |
|---|---|
| Problem | Delegation blocked by trust, not capability (POV) |
| Solution | Autonomy-ladder + audit-replay + shatter-guard spec; open, implementable by any framework |
| Key metric | % of queued actions approved without edit (trust proxy); repeat deployment (retention) |
| Unique | Only spec that treats *community* governance (audience-per-action, identity disclosure, criticism-safety) as first-class — Paperclip proves the pattern for engineering; nobody for communities |
| Channels | OSS repos, his own deployments' public logs, kopdar demos, dev newsletters ($35–60 CPM niche, sponsor-viable) |
| Unguaranteed | Cost structure (LLM per event — budgeted), "community will form around the spec" (needs P1–P3 traffic) |
| Revenue | Hosted instance (undercut $419 anchor), sponsor-funded deployments (ID model), enterprise governance later |

---

## What got deliberately NOT prototyped

- A hub/forum UI (E1 says venue-first dies; the registry P2 *is* the hub's honest seed)
- Phone-first member app (subreddit-ban evidence: identity threat beats convenience risk)
- Paid template marketplace (payout-motivation claim falsified by reports 3/4 before we spent a prototype on it)
