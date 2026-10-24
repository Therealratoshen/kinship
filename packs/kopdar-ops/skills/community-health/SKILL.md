---
key: kinshipai/bundled/event-ops/kopdar/skills/community-health
name: Community health
used_by: [engagement]
trigger: phase == recap
---

# community-health

The community's health check, as a recommended metric — recommended, because a community's own health is
the community's call, and this pack is a tool the organiser holds, not a scoreboard the pack enforces.

What it reads, and only this:

- **Was anyone on duty?** The `coverage:` window in `.kinship.yaml` is the community's own statement of
  its staffed hours. The health read reports whether a human was on duty at the moment the read happened.
- **Did an obligation outlive a staffed shift?** This is the one number worth watching. An obligation
  raised on Monday and still open on Wednesday is a real gap: the community promised to answer and did
  not. A question raised Friday evening and still open Monday morning is *not* a gap, because Friday's
  shift had already ended when it was raised and Monday's had not. The clock pauses outside coverage.
- **What is waiting, and who owes it.** Pending cards, live authorizations, unreleased freezes, overdue
  wakes — the same four things `inbox` lists, because "what is owed" and "what is late" are the same
  question.
- **The questions the community still owes an answer to.** Open **threads** (spec section 2.14): how many, and
  how old the oldest is. This is the one number on the list a member would recognise, because it is the
  only one about a person rather than about the fleet's own housekeeping. A thread still open when a
  staffed shift ended is the community failing to keep its word — and the count of those is the same
  `missedShift` number, read the community-facing way.
- **What this cannot say.** Sentiment, morale, churn risk, whether anyone was happy. None of these are
  measured in v0 (PRD section 5) and this read says so rather than implying omniscience.
- **How the community runs.** The `posture:` the pack declares — whether the fleet may approach a member
  who did not ask, and whether the community is discoverable (spec section 2.15). It belongs in a health read
  because it is the community's own statement about itself, and because a health read that reported a
  "missed shift" without saying whether the community was even supposed to be on duty would be asking the
  reader to guess.

The null discipline, which is the whole point:

- A pack that declares **no** coverage window has an *unknown* duty state. That reads as `null`, never
  as `0`. Zero would claim the community was never on duty, and that is a different — and false — claim.
- A missed shift that has not ended yet is not a miss. It is inside the shift.
- A missing number is `null`. Zero is a measurement.

Why this is a *recommended* metric and not a KPI: the moment a health number becomes a target, the
community starts optimising for the number instead of the community. A weekly health read that the
organiser reads as a question — "was anyone on duty, and did anything wait?" — is a tool. A score the
pack refuses to let go of is a target, and targets in a volunteer community are how good behaviour dies.

The `unmeasured` list is part of the output, not a footnote. A health read that only says what it can
measure teaches the reader to trust the parts it did not measure.

**Assertion.** `assert the health read states its own unmeasured list && an unknown duty state reads as null and never as zero && an open question is counted, not itemised`.
