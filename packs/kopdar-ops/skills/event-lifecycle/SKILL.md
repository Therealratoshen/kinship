---
key: kinshipai/bundled/event-ops/kopdar/skills/event-lifecycle
name: Event lifecycle
used_by: [event-ops]
trigger: an event object exists or is created
phases: [draft, scheduled, promoting, t-minus-7, t-minus-1, running, recap, report, closed]
---

# event-lifecycle

The spine of the pack. Everything else in Kinship that a competitor also does hangs off this state machine;
it is why "did we already remind them?" is a lookup rather than a judgement call.

**Advance rule.** A phase moves only on a named condition: a human verdict, a fired timer with a persisted wake
row, or a deliverable that regenerated successfully. Never on elapsed time alone.

**Entry rule.** A phase cannot be entered whose predecessor lacks its verdict. `promoting` requires the promo
card to be `allow_once`d or the class to carry an `allow_always` grant naming this series and channel.

**Kill-and-resume rule.** If the event is cancelled, every pending timer is cancelled in the same operation and
the log shows the pair `phase-terminated(reason=cancelled)`. A reminder that fires for a cancelled event is the
worst artefact this pack can produce.

**Assertion (must hold).** For any event, `count(sends) == count(verdicts)` and no phase appears in the log
without its entry condition recorded. `assert no wake row exists for a phase after status == closed`.

Source: the gap named in `research/COMPETITOR-ANALYSIS-2026-10-17.md` §3 (row A-2) — no surveyed product ships
an event-lifecycle machine with per-phase approval; cron posters and inbox bots do not own a state machine.
