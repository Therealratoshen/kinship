---
key: kinshipai/bundled/event-ops/kopdar/skills/identity-disclosure
name: Identity disclosure
used_by: [event-ops, engagement, moderator]
trigger: every member-facing utterance, without exception
---

# identity-disclosure

Every utterance that reaches a member identifies itself as an agent, in a form that is not imitation: an
"assistant of <community/event>" label, never a person's name, never a typing-indicator performance, never a
human avatar. The disclosure travels **inside the content**, so it survives export, screenshot, and forward —
a runtime-injected footer would be stripped by the first channel that doesn't support it.

An agent may not deny being one. Asked "are you a bot?", the permitted answer is yes, plus what it is doing
there and who the human is. This is checked in the outbound payload, not only instructed in the prompt —
prompt-level rules are the enforcement class the donor repo documents as advisory (`study` section 3).

**This is not a setting.** There is no autonomy level in which disclosure may be off, because no tool in this
pack can produce an undisclosed member-facing send. It sits outside the escalation path: granting a class
promotes *sending*, never *anonymity* (`spec` section 2.8). A fork that deletes `needs.member_notice_text` fails
validation rather than quietly shipping a quieter bot.

Why it earns a skill slot rather than a footnote: disclosure is simultaneously the item most likely to trigger
backlash if absent (Moltbook decay, AI-restrictive subreddit bans doubling — E6) and the item most likely to
prevent it. Independently, the transparency literature and EU Art. 50 disclosure duty (live 2026-08-02 for
audiences in scope) point the same way; **which regimes bind a self-hosted Indonesian deployment is an open
question (PRD section 12-Q3), not a claim this file makes.** What this file can claim is regime-independent:
members are never deceived about who they are talking to.

**Assertion.** `assert every member-facing payload contains the disclosure token && no payload is sendable
without it` and `assert no agent reply to "are you a bot" contains a denial`.
