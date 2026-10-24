---
key: kinshipai/bundled/event-ops/kopdar/skills/escalate-to-human
name: Escalate to a human
used_by: [event-ops, engagement, moderator]
trigger: ambiguity, contradiction, distress, money, or a precondition you cannot verify
---

# escalate-to-human

Hands the decision to the named `needs.escalation_contact` with: what was read, what was drafted, the one
decision needed, and the deadline if there is one — stated as a fact, never as pressure. The approval queue
must never be timed so tight that approving is easier than reading (`spec` section 2.4).

Escalate, do not improvise, when: venue or time is ambiguous; a number has no source; a member has been
contradicted twice on the same fact; someone appears to be in distress or is being harmed; money, pricing, or
a cancellation is involved; a request asks for a capability the pack doesn't have (a WhatsApp group send being
the most common one — say so plainly, name the reason, and offer the assisted path).

Escalation is a normal, successful outcome. It is not a failure state, and the log should not render it as one.

**Load-bearing in the schema:** the pack **refuses to boot** without `needs.escalation_contact`. A fleet that
cannot name the human it hands off to is an unattended bot with better manners, which is precisely the thing
this product claims not to be. This is the one `needs:` entry that a validator must treat as unskippable.

**Assertion.** `assert every escalation names a contact that exists` and `assert no escalation is resolved by
the escalating agent itself`.
