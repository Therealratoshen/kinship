---
key: kinshipai/bundled/event-ops/kopdar/skills/cross-community-promotion
name: Promote a partner without spending your members' trust
used_by: [engagement, event-ops]
trigger: a partner community's event, launch, or copy is to be surfaced to our members
---

# cross-community-promotion

Communities join up, and the organiser wants to say yes — to a partner's kopdar, a co-hosted edition, a
friend's launch. The yes is his to give. This skill exists because the failure mode that follows is never
the first promotion; it is the fourth, when "help us spread this" has quietly become a standing lane with
its own cadence, no disclosure, and someone's unsourced attendance figure repeated as ours. Semantics:
`spec/GOVERNANCE-SPEC-OUTLINE.md` section 2.11; requirements: PRD **FR-6.1–6.5**.

**The class before the copy.** `promote.cross-community` sits at `draft`, and the pack that declares it
must answer `needs.partner_policy` — the named allowed partners and the required disclosure line. No
policy, no class: an installer who skips the gate gets a lane that never fires, which is the correct
incentive. A partner holds **no key, no grant, no scope**; the grant taxonomy is for humans. An organiser
who wants this automatic must grant `allow always` *naming the partner, the lane, and the window* — "just
always promote partner stuff" is not a grant, it is an omission wearing one's clothes (section 1.8).

**Partner facts are stranger input with a nicer introduction.** The organiser vouched for the partner;
he did not certify their numbers. Any figure in partner copy — "300+ attendees last run", "early bird
Rp150rb" — is treated exactly like every other number in this fleet: it needs a source the organiser
named, and without one the card is held and escalated with the figure and the missing source attached.
This is not distrust of friends; it is the difference between "the organiser endorses this community" and
"the organiser verified this spreadsheet".

**What leaves, and what never does.** Copy leaves. People do not. The partner receives approved words
through the organiser's own channels and nothing else — no member list, no RSVP export, no identifier in
either direction, because `memberdata.export` is absent from every bundled pack (spec Part 5). For a
*co-hosted* event the guest-list question is real and is **Q11-gated, default never**: a merge requires
the Q3 regime answer plus per-member consent at RSVP time, and until both exist the answer is the
organiser reconciling two lists by hand, which is the price of the partnership and a small one.

**The member's terms do not change because the content did.** A member who said stop is not reachable by
partner content — the suppression check runs before this class like any other commit class, and a
partnership is not a second lane around it. Partner promotions count against `member_message_cap_per_24h`
and the per-event cap (`cross_promo_per_event_cap`), because from the member's side there is no meaningful
difference between our fourth message and a partner's first. The copy names the partner and the
relationship, in both languages, **on top of** the standing disclosure line — the fleet still says it is
a fleet; the partner line says whose event this is. One does not substitute for the other.

**When the organiser asks for something the pack cannot do** — post into the partner's group, share the
RSVP list, post "as a member" — the answer is the plain one from `escalate-to-human`: name the absence,
name the reason, offer the assisted path. `message.as-member` does not exist in this pack's toolset and
no partner's convenience changes that.

**Assertion.** `assert no partner artefact reaches a member with a suppression row`, `assert no partner
number without a named source is repeated in copy rather than escalated`, `assert every cross-community
draft names the partner and the relationship in both languages`, `assert no member identifier is present
in anything sent to, or on behalf of, a partner`, and `assert an allow_always grant on this class names
partner, lane, and window`.
