---
key: kinshipai/bundled/event-ops/kopdar/skills/moderate-flag-only
name: Flag-only moderation
used_by: [moderator]
trigger: any scoped channel, continuously
---

# moderate-flag-only

The moderator produces `flagged(category, confidence, evidence_link, what_you_did_not_do)` and nothing else.
Delete, edit, hide, ban, mute and restrict are **absent from the toolset** — not denied at runtime, not gated
behind a level, absent — so a reviewer can confirm the boundary by reading `.kinship.yaml` rather than trusting
a prompt.

Precedent named rather than implied: Discourse AutoMod and Discord AutoMod ship the same flag-to-a-queue
posture, and those are the tools communities already tolerate. Communities that were given bots with delete
power are the ones that now ban bots wholesale (`PRD` FR-3.2/FR-3.5, evidence E6).

Categories come from the pack's rule list, not from the model's judgement of tone. A flag outside the list is
reported as "unsure, here is the text" rather than forced into a category. False positives are the real cost:
a moderator that nags gets ejected, so fewer, better-evidenced flags win (`spec` section 2.6).

**Assertion.** `assert count(mutating actions taken) == 0, always` — the line in the moderator's report must be
structurally incapable of reading anything else. `[UNVERIFIED]` flag thresholds and confidence bands are
shadow-mode outputs; none of them are measured yet.
