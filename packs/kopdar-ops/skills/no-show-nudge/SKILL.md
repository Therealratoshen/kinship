---
key: kinshipai/bundled/event-ops/kopdar/skills/no-show-nudge
name: No-show nudge
used_by: [engagement]
trigger: phase == recap, 24–72 h after the event
---

# no-show-nudge

The most reputationally dangerous skill in the pack, so it is the most constrained one.

It runs **after** the event, addresses people who said yes and did not come, and uses the cheapest channel that
reaches an individual: email → Telegram/Discord. **Never a paid WhatsApp template** — that lane is classified
`marketing` by default, costs roughly 6× a utility message on the rates that could be verified, carries
reclassification risk, and lands as "the organiser is billing me because I missed the meetup." It also reads as
surveillance to anyone who was simply sick.

Tone: assume good faith, offer nothing to defend, one line about the recap, and an explicit "tell me to stop
and I will" that actually writes a suppression rule (stored, revocable, one tap — `spec` §1.8).

**Assertion.** `assert channel in {email, telegram, discord}` and
`assert suppression written when a recipient asks to stop` and `assert no nudge fires before the event phase == recap`.

`[UNVERIFIED]` Whether a nudge helps or annoys in an Indonesian kopdar is unmeasured. Phase 1 drafts it and does
not send it; the diary records how the organiser feels about the idea of sending it, which is the cheaper signal.
