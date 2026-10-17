---
key: kinshipai/bundled/event-ops/kopdar/skills/near-miss-log
name: Near-miss log
used_by: [event-ops, engagement, moderator]
trigger: a draft is rejected or edited, or an action is refused
---

# near-miss-log

Records what the gate caught, with the *why*, in a form the organiser can show to a member or a sponsor
without opening a terminal.

A near-miss is: wrong time, wrong venue, wrong name, invented number, single-language card, missing disclosure,
budget breach refused, stale rate card refused, low-trust content that would have crossed into a report, a
capability that doesn't exist and was not attempted. The rejection reason is captured in the organiser's words,
not paraphrased by the model.

This is the pack's most valuable output and it is counter-intuitive: a run with zero near-misses teaches the
organiser nothing, while a run with three caught errors is the evidence that delegation is safe enough to
escalate one lane. It is also the direct measurement of Stage 5's central unverified claim — that trust is
*caught-near-miss visibility*, not accuracy (`design-thinking/05-test-results.md`).

**Assertion.** `assert every rejected or edited card persists with verdict + reason + diff` and
`assert deletion of a near-miss record is not possible from any agent's toolset`. Rejected drafts are never
deleted — a pack that discards its own evidence has no audit trail to advertise.
