---
key: kinshipai/bundled/event-ops/kopdar/skills/flag-notice
name: Tell the person you flagged
used_by: [moderator]
trigger: a flag is raised against an identified member
---

# flag-notice

Flag-only moderation (`moderate-flag-only`) is the correct posture and it is also **incomplete**: it produces a
record *about* a person that the person never sees, while changing how they are treated. Silence plus quieter
treatment is not "the human decides" — it is a decision executed without a party. This skill closes that gap.
Semantics: spec section 2.9.4; requirement: PRD FR-5.4.

The rule, as behaviour: when `moderate.flag` fires against an identified member, a notice is **composed** — the
behaviour described, the reason in plain language, the confidence, and the name of the human who decided — and it
sits at `draft` until that human releases it. Timing is deliberately *after* the organiser's decision, never
before: a notice that announces a flag the organiser was about to dismiss is its own harm.

What the notice is not: an appeal verdict, a warning, or a negotiation. It states what happened and where to
answer it. The member's reply becomes a `flag_appeal` card in the **same queue the flag came from**, and the
agent that raised the flag may not resolve that appeal — same restriction FR-1.6 places on approvals and
`escalate-to-human` places on escalations: **nobody adjudicates their own output.**

Where the member cannot be identified with confidence, or the flag concerns content rather than a person
(spam-domain, link reputation), no notice is composed and the log says that explicitly — "no subject to notify"
is a recorded outcome, not a skipped step. Group-level notices ("3 messages were flagged this week") are
allowed and are the honest substitute when individual attribution would require surveillance to produce.

The capacity note a forker must read: this skill assumes the fleet can address one member privately. On the
bundled pack's lanes that means email, Telegram or Discord — **never** a WhatsApp template, which cannot address
a member privately in a group context and is out of scope for this pack (`DECISIONS.md` D11/D13). Where the only
reachable surface is the group itself, the notice is not sent; the flag is handed to the human with the reason
and the constraint named.

**Assertion.** `assert every flag naming an identified member produces either a drafted notice or a logged
"no subject to notify"`, `assert no flag_appeal is resolved by the agent that raised the flag`, and
`assert no notice is composed before the organiser's decision on the flag exists`.
