---
key: kinshipai/bundled/event-ops/kopdar/skills/reminder-schedule
name: Reminder schedule
used_by: [event-ops]
trigger: phase enters t-minus-7 or t-minus-1
---

# reminder-schedule

Cadence: **T-7d and T-1d**, one card per phase per origin, cheapest legitimate channel first —
`email → Telegram/Discord → paid WhatsApp template`. The order is a design constraint, not a preference: after
24 h of a member not messaging, only an approved template category can reach them, and template review is a
separate vendor process with quality-based pauses (`research/COMPETITOR-ANALYSIS-2026-10-17.md` section 6).

Before any metered-channel send: read the organiser's **own** live rate card, refuse if it's stale
(`{rate_stale: true}` → no send, one card explaining why), and check remaining event budget. A reminder that
silently spends the event's ceiling is worse than a missed reminder.

Duplicate control is structural: a partial unique index on `(eventId, originKind, originId, phase)`
(`spec` section 1.9.4). Not an application check, not a memory.

**Assertion.** `assert at_most_one_send_per(event, origin, phase)` and
`assert no metered send exists without a fresh rate record && budget headroom`.
