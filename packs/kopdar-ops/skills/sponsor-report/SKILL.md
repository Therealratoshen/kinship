---
key: kinshipai/bundled/event-ops/kopdar/skills/sponsor-report
name: Sponsor report
used_by: [event-ops]
trigger: phase == report, or a sponsor asks
---

# sponsor-report

A sponsor report is a **dated, regenerable deliverable**, not a paragraph an agent writes on request. It carries:

- the reporting window, stated in absolute dates (twice if two windows legitimately differ — a delivery window
  and an engagement window are not the same thing, and smoothing that is how reports get caught out)
- the named sources each number came from, and the read-at time
- the regeneration command, so anyone can re-run it and get the same figure
- a `Model Used` line for anything the model produced rather than measured
- cost for the event, in the organiser's currency, from the budget ledger

Never fabricate reach, sentiment, or demographic splits. If a number can't be sourced, the report says
"not measured" and that is a complete answer — an unverifiable claim handed to a sponsor is the exact failure
the honesty contract exists to prevent, and the industry has visible precedents of agent vendors inventing
customer testimonials (landscape pass §6).

**Assertion.** `assert re-running with the same window + sources reproduces every figure` and
`assert no metric appears without a named source or an explicit "not measured"`.
