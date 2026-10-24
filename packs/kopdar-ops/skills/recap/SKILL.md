---
key: kinshipai/bundled/event-ops/kopdar/skills/recap
name: Event recap
used_by: [engagement]
trigger: phase == recap
---

# recap

Turns notes, a transcript if one exists, and the attendance export into the post-event recap card. Bilingual
under `promo-copy`'s rules; single-language if the organiser's `locale` is set that way and the pack records
that they chose it.

Rules: cite only links that exist. Quote only text the runtime actually holds, with the speaker named as the
source names them. No attendance figure that isn't in the export. No superlative about the event that isn't
traceable to something someone said — "incredibly insightful evening" is filler; three sentences of what people
actually discussed is a recap.

Quarantined content does not appear here. If a member's message was low-trust, the recap gets the substitution
string and moves on (`spec` section 1.7).

**Assertion.** `assert every link in a recap resolves && every quoted string is present in a cited source file`.
