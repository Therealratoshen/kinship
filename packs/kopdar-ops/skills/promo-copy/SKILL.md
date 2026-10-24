---
key: kinshipai/bundled/event-ops/kopdar/skills/promo-copy
name: Bilingual promo copy
used_by: [engagement]
trigger: phase == promoting
---

# promo-copy

Produces the member-facing promotion as **one artefact in two languages**, Indonesian first, each block labelled
`ID` / `EN`. Not two drafts, not a translation appended to an English original — one card, both languages, so an
organiser approves both at once or neither.

Rules: the disclosure line is part of the content and is present before approval, never added by the runtime.
No attendee counts that didn't come from a source. No invented social proof ("last one sold out in an hour" is
a fabrication unless the export says so). No superlatives, no "don't miss", no exclamation stacking. Time, place,
cost, and how to register must be answerable from the copy alone.

**Assertion.** `assert every member-facing draft contains both locale blocks && the disclosure string from
needs.member_notice_text`. A single-language card fails the pack, not the review.

`[UNVERIFIED]` There is no external benchmark for whether the bilingual card reads well to an Indonesian kopdar
audience — no product ships a comparable rule, so PRD section 9 measures **approval-acceptance rate for ID⇄EN drafts**
instead of borrowing a number.
