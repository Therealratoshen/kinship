---
key: kinshipai/bundled/event-ops/kopdar/skills/publishable-sourcing
name: Only cite what the community agreed to publish
used_by: [engagement, event-ops]
trigger: assembling a recap, digest, sponsor report, or any artefact that leaves the community
---

# publishable-sourcing

Everything else in this pack worries about a message going *out* to members. This skill worries about the
other direction: content going *out of* the community, which is where a member's silence gets turned into
material. The recap is the friendliest artefact in the fleet and therefore the easiest one to write carelessly
— it reads like a summary of the week, and a summary of a week in a small community is a description of
specific people.

Semantics: `spec/GOVERNANCE-SPEC-OUTLINE.md` §2.9.3 and §2.9.5; requirements: PRD **FR-5.3, FR-5.7**.
Source: `community/MEMBER-LENS-2026-10-17.md` §1 (the right to lurk) and §3 (the silent-leave triggers).

**The scope of "publishable".** A channel, thread, or form is citable only if it was marked publish-consented
when the content was written. Not "the organiser has access", not "it isn't named private", and not "the
group is semi-public". Absence of a mark is **not** permission — the same fail-closed posture §1.7 applies to
trust presets, applied here to sourcing. A `digest_sources_are_consent_scoped` check runs at **assembly** time,
before any text is generated, so the model never holds a quote it would have to be careful with. That ordering
is the whole design: redaction after generation is a filter, and filters get bypassed by paraphrase.

**The quiet member is not a finding.** A recap may describe the community: attendance moved from eleven to
nineteen, the Q&A ran long, the demo slot needed a second evening. It may not describe the person who came
three times and never spoke, did not answer the poll, or whose name is in the RSVP list and nowhere else. There
is no interesting sentence about a lurker that is not surveillance dressed as warmth — "we noticed you've been
quiet" is the exact line that makes people leave a group, so `member.described-in-recap` is absent from the
toolset rather than restricted.

**Numbers, not names, once the artefact leaves the room.** A sponsor report answers "how many, which of them
came, what did the room look like" and never "who". Above `report_aggregation_floor` a cell renders as a count;
below it, it renders as a bracket — `<5` — and the report still generates, because an empty cell is a
conversation the organiser can have and a named attendee in a PDF is a thing that cannot be un-sent. The floor
is a value in `.kinship.yaml`, not advice in a comment.

**Recaps are regenerable; screenshots are not.** A member's message may be quoted inside the community with
their name attached, because they can see it and correct it. The same line in a public post, a deck, or a
marketing page loses that protection — it leaves the room where the member has standing. Quote in-community,
paraphrase out-of-community, and attribute out-of-community only to people who explicitly agreed, in writing,
per artefact. "They said it was fine in the group" is consent to a conversation, not consent to a campaign.

**When the sourcing check would empty the artefact,** say so on the card: "this recap has no publish-consented
source for Thursday, so Thursday is not in it." An organiser who wants Thursday included learns the exact action
that would license it. A silently shortened recap teaches them that the check is decorative.

**Assertion.** `assert no artefact that leaves the community cites an unmarked source`, `assert every member
identifier in an external artefact sits inside a cell at or above report_aggregation_floor`, `assert no
generated recap or report contains the phrase-level description of a member who did not post`, and
`assert the sourcing check runs before generation, not as a post-generation filter`.
