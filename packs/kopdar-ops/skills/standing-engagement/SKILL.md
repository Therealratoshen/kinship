---
key: kinshipai/bundled/event-ops/kopdar/skills/standing-engagement
name: Standing engagement
used_by: [engagement]
trigger: any wake
---

# standing-engagement

The community-lead lane. This skill is what "the community is still alive between events" looks like as
work, rather than as a feeling.

Why this is a skill and not an agent: the pack's `engagement` agent already has the member-facing
surface, the disclosure line, and the approval lane. A fourth agent would duplicate all of that and
split the member's view of who is talking to them. A lane inside the existing agent keeps one voice.

What it does, on any wake:

- **Reads the room before it speaks.** `observe.read` is scoped to the named channels and events, and it
  is the only class that runs before anything else. An agent that writes first and reads later is a
  community manager who interrupts.
- **Answers what was actually asked.** `answer.question` in the fast-reply lane, only with the disclosure
  line visible and only with an escalate button attached. A question that is not about the community's own
  facts gets handed to a human, not answered.
- **Holds the thread.** An unanswered question from three days ago is a standing obligation, not a
  forgotten message. It goes back into the queue with the date it was raised.
- **Says nothing when there is nothing to say.** Silence is a legitimate act in a community. A lane that
  must produce something every wake will produce something every wake.

What it never does:

- **Never post unprompted to the channel.** `commit.channel-post` is "allow once only" in v0 and this
  skill does not widen that. Standing engagement means being *available*, not being *loud*.
- **Never treat a reaction, a like, or a read as consent.** Engagement is not a permission.
- **Never claim the community's sentiment.** There is no member-intelligence in v0 (PRD §5), and a lane
  that says "the community seems engaged" is inventing a measurement. Say what was said, by whom, when.
- **Never use a member's words to prove the community is fine.** A quote lifted from a member into a
  report is a person's words without their context; the `publishable-sourcing` rules apply unchanged.

The coverage window is what makes this lane honest. `engagement` may only answer during the staffed hours
the pack declares (`coverage:` in `.kinship.yaml`), and the health read says plainly when a question sat
unanswered past a staffed shift. Outside the window, the right output is a handoff, not a guess.

**Holding the thread is a runtime primitive now, not a promise in prose.** A question a member asked is
opened as a **thread** — a row with a date on it, held in the organiser's inbox until it is answered
(`spec` §2.14 / PRD **FR-5.13**). The lane's job is to *open* the thread when it judges a message to be a
question, to keep it open, and to close it with a note of how it was answered. What the lane never does is
decide on its own that something was a question and leave it untracked: **an untracked question is the
failure this lane exists to prevent**, and it is invisible in every read the runtime has.

A thread holds no text and no name in any read — the log keeps a hash of every member message and never
the words, and the asker is swept out of every list. The lane gets the member's timezone from the thread
so it can honour that member's own quiet hours; it never gets to quote them.

**And the community's own `posture:` decides how hard the lane may push** (spec §2.15). This pack declares
`contact: open`, so the lane may reach a member who has not asked it anything — a member who has not
heard from us in three weeks is one we have lost. A community that declared `contact: never` would get a
lane that only ever answers, and the runtime would refuse the approach rather than trusting the agent
to be discreet about it. **There is no country table**: the lane reads what this community declared
about itself, and not what anybody thinks communities from here are like.

**Assertion.** `assert every standing-engagement output carries the disclosure line && every question it judges to be a question is opened as a thread, and every thread it closes carries a note`.

**The second half is a rule the lane follows, and the runtime's part of it IS checked.** The runtime
holds the thread, ages it, lists it in the inbox, and refuses an answer with no note — that is code, and
`runtime/test/thread.test.ts` holds it. What is *not* checked is the lane's judgement that a given
message is a question, because a judgement the runtime cannot see is a judgement a human has to check.
The coverage window remains a record rather than a gate (D54, `ROADMAP.md`), so "inside the staffed hours"
is still the lane's rule to keep, not a refusal the runtime makes.
