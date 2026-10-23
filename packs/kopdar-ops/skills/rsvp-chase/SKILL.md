---
key: kinshipai/bundled/event-ops/kopdar/skills/rsvp-chase
name: RSVP chase
used_by: [engagement]
trigger: phase == promoting, and the guest-list export is readable
---

# rsvp-chase

Reconciles the named source of truth (`needs.rsvp_source_of_truth` — a Luma guest list, a Sheets tab, a Mayar
export) against the people who said yes, and drafts a chase for the ones who didn't answer.

Rules: it **never states a headcount it did not read**. If the export is missing, stale, or contradicts another
source, it reports the contradiction to the organiser instead of picking a number. Chase cadence comes from
`event-lifecycle`, one message per origin per phase. A "no" is a complete answer and is never chased.

Everyone contacted by this skill is a named individual with a reason for being on the list. There is no
broadcast-to-imported-contacts path in this pack.

**Assertion.** `assert every count in a chase card cites the export it read (source + read-at timestamp)` and
`assert no person is chased after a decline or after two unanswered attempts`.

Source: named in PRD section 1 as core work, **absent from every product surveyed**
(`research/COMPETITOR-ANALYSIS-2026-10-17.md` section 3, row A-4/G).
