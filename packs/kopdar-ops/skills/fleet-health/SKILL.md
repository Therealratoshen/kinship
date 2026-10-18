---
key: kinshipai/bundled/event-ops/kopdar/skills/fleet-health
name: Fleet health signal
used_by: [event-ops, engagement, moderator]
trigger: once per run, after the work
---

# fleet-health

The cheapest fleet-health signal available to a two-person-plus-three-agents operation: let the agent report
that a lane is a mess, before the organiser discovers it from a member.

Two channels, deliberately unequal, taken from the donor repo's skill pair (`study` §6.8):

- **`complain`** — unstructured, agent-only, never surfaced to members, no format imposed. Structuring a
  complaint is how you get plausible-sounding complaints instead of true ones.
- **`suggestion_box`** — constructive, observed-only, **max 3 per run**, must cite the run it observed, and
  must not double-fire with a complaint about the same thing.

Both are advisory to the organiser and neither may trigger a configuration change on its own. An agent cannot
raise its own autonomy level because it thinks the lane is inefficient; that is the `trust.raise-self` class,
which is structurally absent (`spec` Part 5).

**Assertion.** `assert count(suggestions_per_run) <= 3` and `assert no complaint or suggestion mutates an
autonomy grant` and `assert a suggestion and a complaint never both fire for the same observed event`.

Why it belongs in a community pack at all: "the reminder lane is a mess" arriving on Thursday is a fixable
problem; arriving via an annoyed member on the Monday after the event is a reputation event.

**(Additive, 2026-10-18 — `DECISIONS.md` D30, recorded here so a reader does not assume this file is implemented.)**
The *aggregate* half of fleet health now exists in the runtime: `Fleet.health()` (`runtime/src/health.ts`) derives
live freezes, queue depth against the pack's cap, budget ratios, overdue wakes, refusals by code, idle agents, and
two member integers from the audit log — and it will not score a person, so it carries no sentiment and no dormancy
signal. **These two channels are still prose.** `complain` and `suggestion_box` are not action classes in
`.kinship.yaml`, so no runtime path can log one; the pack's only complaint-shaped rule is the `shatter:
complaint -> freeze-to-draft-and-log` mapping, which freezes a lane and does not record the complaint. Whether the
two become logged events is a spec Part 5 taxonomy decision, recorded as PRD **Q13** and left open. Until someone
makes it, a fleet running this pack has a symptom report and no complaint channel — which is the opposite of the
paragraph above, and worth knowing before the Monday-after-the-event version arrives.
