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
