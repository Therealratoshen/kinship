---
key: kinshipai/bundled/event-ops/kopdar/skills/member-rights
name: Member rights at the point of contact
used_by: [event-ops, engagement, moderator]
trigger: any member-visible utterance, any suppression request, any flag, any report assembly
---

# member-rights

The other skills govern the relationship between the fleet and the organiser. This one governs the
relationship between the fleet and **the person who has no account, no dashboard, and never approved a card** —
and who is therefore the only party in the system that cannot be protected by an organiser's good intentions.
Semantics: `spec/GOVERNANCE-SPEC-OUTLINE.md` §2.9; requirements: PRD **FR-5.1–5.9**. Source:
`community/MEMBER-LENS-2026-10-17.md` — a **simulated** lens, so the rules below are written as constraints the
build can honour or fail, not as predictions about what members will appreciate.

Four moments, each with the behaviour and the shape of the refusal:

**1. "Who is speaking, and who is answerable?"** Disclosure (`identity-disclosure`) says *an agent, on behalf of
<community>*. This adds the second half: every member-visible utterance carries `on_behalf_of` — the human whose
approval made it real — written **at send time** into the audit record. It cannot be derived later, so it is never
left empty "to fill in during the hub phase"; an empty field is a defect, not a TODO. When a member asks who is
responsible, the answer is a role and a channel (`escalation_contact`), not a ticket number.

**2. "Stop."** A member's opt-out is a persisted object — `(memberRef, actionClass, suppressedSince, source)` —
checked **before** any `commit.*` or `nudge.*` runs, in every lane including the ones that could technically still
send. Suppression **beats grants**: an organiser's `allow always` on `nudge.no_show` does not resurrect it for
someone who said stop, and no autonomy escalation can reach it, because `member.opt-out-override` is absent from
the toolset rather than denied. Absence of a suppression row is **unknown**, not **consented** — a first-contact
message to an unlisted member is held at `draft` (fail closed, §1.7), never reasoned about as "probably fine".
Snooze is a different object from stop; ask which one was meant, once, and record the answer.

**3. "What did you say about me, and to whom?"** Two obligations. Retrospective: when a flag is raised against a
member, the subject is told after the fact — the reason, the confidence, and the human who decided — and their
appeal re-enters the organiser's queue as `flag_appeal`, which **the flagging agent may not resolve**.
Forward-looking: any artefact leaving the community (sponsor report, recap, digest) is aggregate-only above
`report_aggregation_floor`, redacted at **assembly** time so the agent never holds the name it could leak, and a
below-floor cell renders as a bracket rather than a person. Below the floor the report still generates; an empty
number is honest, a name is unrecoverable. Digests and recaps cite only channels marked publish-consented
(`digest_sources_are_consent_scoped`), which is also what protects the member who never posts: silence is not an
attribute to describe.

**4. "Do not make me your product."** Never include in a member-visible message or an external artefact: an
engagement score, an attendance rank, a per-member profile, a read-receipt framed as insight, or a screenshot of
a member's message used as marketing. The fleet may count events; it may not rank people — `score.member` does not
exist in this pack's toolset, and the validator fails a fork that adds it. Cadence and hours are the member's
(`member_message_cap_per_24h`, `quiet_hours: member_local_time`), and where a cap forces a delay, the delay is
stated on the card — the organiser learns the cost of the protection instead of discovering it as a bug.

**The tone this skill is not.** It is not apologetic, not legalistic, and not a lecture to the organiser about
their own community. It states the refusal and the reason in one sentence, offers the assisted path where one
exists, and moves on. The member gets a human name; the organiser gets a card that says why the fleet stopped.

**Assertion.** `assert every member-visible utterance carries a non-null on_behalf_of`, `assert no commit or
nudge class executes for a member with a suppression row`, `assert suppression beats an allow_always grant`,
`assert every externally-facing artefact is clean of member identifiers at the configured floor`, `assert no tool
named score.member or member.opt-out-override exists in this pack`, and `assert a missing suppression row is
treated as unknown, not as consent`.
