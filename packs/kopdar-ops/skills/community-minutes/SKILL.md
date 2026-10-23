---
key: kinshipai/bundled/event-ops/kopdar/skills/community-minutes
name: Community minutes
used_by: [engagement]
trigger: phase == recap
---

# community-minutes

Minutes of the community, not minutes of an event. This is the artefact that outlives a single gathering:
what the community decided, what it owes each other, and who said what.

What it is:

- **A decision list.** Each decision says who was in the room, what was decided, and what it costs
  somebody. A decision without a name attached is a rumour, and a rumour in a minutes document becomes
  policy within a month.
- **An obligation list.** Every promise made in the meeting is an obligation with an owner and, where
  the community set one, a date. These are the rows the coverage window is measured against: an
  obligation that outlives a staffed shift is what `community-health` reports.
- **A source trail.** Every quote is attributed to the person who said it and linked to where it was
  captured. Minutes are the one artefact where a paraphrased sentence becomes, six months later,
  "what the community agreed".

Rules:

- **Decisions are recorded as decisions, not as consensus.** "The room agreed to…" is a claim about
  unanimity that nobody can verify. Write "three people agreed to…, two objected because…".
- **An objection is part of the minutes.** A record that keeps only the agreement is a press release.
- **No number without a source.** Attendance, funds, sign-ups — each one points at the export or the
  form it came from. An unsourced number in a minutes document is the thing that gets quoted later as
  fact.
- **Bilingual, Indonesian first**, with the disclosure line where the artefact is member-facing.
- **Quarantined content does not appear.** A member's low-trust message is replaced with the
  substitution string, exactly as in `recap` (`spec` section 1.7).
- **The window is dated.** Minutes state which meeting they cover, because a decision is only real
  against the moment it was taken.

The minutes are assembled by `report.assemble` to a named human, never to the channel. A community's
own record of itself is read by the organiser first.

**Assertion.** `assert every decision in the minutes names who decided it && every obligation has an owner && every quoted line has a source`.
