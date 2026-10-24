# The MCP adapter — so any assistant can ask Kinship for permission

**A community manager has a personal assistant in the platform they already use** — Grok, Claude
Desktop, Cursor, OpenClaw, Hermes. The assistant can write a message, plan a reminder, draft a reply.
**The question is what happens when it wants to do something member-facing.**

The answer cannot be "it decided": an assistant has no authority, and no memory that survives an
audit. So the assistant **asks**. It proposes an action here, and **the runtime decides** whether
that action becomes a card for a human to approve, or is refused with the rule that fired.

> **The assistant is the hand. Kinship is the judgement. The human is the signature.**

That is the whole thesis in one round trip, and this adapter is where it happens.

## Run it

```bash
cd adapters/mcp && npm install --no-audit --no-fund
node src/server.ts --pack ../../packs/kopdar-ops \
  --config ../../packs/kopdar-ops/pack.local.yaml \
  --plan ../../packs/kopdar-ops/pack.local.plan.yaml \
  --log logs
```

**One `npm install` is enough**, and it fetches nothing: this adapter reuses the reference host's
plumbing, so its `preinstall` installs the reference host's own local links first. Every dependency is
a `file:` path — `npm` creates symlinks and the registry is never contacted.

It speaks **MCP `2025-06-18`** over stdio — JSON-RPC 2.0, one message per line. Point an assistant's
MCP client at that command and it can call the six tools.

## The six tools

| Tool | Answers | Changes |
|---|---|---|
| `kinship_plan` | what the fleet would do, and what is broken in the community's copy | nothing |
| `kinship_digest` | the last day, per channel: drafts, verdicts, refusals, open threads | nothing |
| `kinship_drafts` | what is waiting on the organiser | nothing |
| **`kinship_propose`** | **may this action go out?** | a card, or a refusal — **never a send** |
| `kinship_approve` | the organiser's verdict, with a reason | a decision, recorded |
| `kinship_health` | the fleet's condition, and what it does not measure | nothing |

**There is no tool here that delivers anything to a member.** Phase 1 ships no transport (D21), so the
commit path refuses at `no_transport` whoever calls it — and the refusal is in the log. A server that
let the assistant skip the judgement step would not be a governance layer; it would be a stranger with
your community's address book.

**And a refusal is an answer.** A tool that returns *"refused — `member_suppressed`"* is more useful
to an assistant than one that returns a yes, and it is the only honest thing to return, because the
runtime is what decides.

## Where it sits in the host contract

This is a **host** in `spec/HOST-CONTRACT.md`'s sense, and it owns the three seams a host can own
without a credential:

- **the clock** — the host decides when a run happens;
- **the store** — the log is written here, and `Fleet.replay` means an assistant that connects to a
  running community sees the same history the human does;
- **the printing** — what comes back is text, and it is what the assistant reads.

It owns **no transport** and holds **no provider key**, because Kinship has no model. The provider's
key stays with the provider — BYOK, seam 1.

## Why it reuses the reference host's plumbing

The answers reader, the log store and the clock live in `adapters/reference/`. **Two implementations of
"how a host persists a log" is two rules in two places**, which is the failure class this repository
keeps recording — so the second host reuses the reference host's seams rather than re-implementing
them.

## The tests

`npm test` — **8 conformance tests that speak the protocol over a real pipe**, because a protocol
implementation you can only test through a function is one you have not tested: the framing, the line
endings, the stdout discipline and the handshake are all part of the contract.

They check that `initialize` answers with the protocol version and the tool capability; that
`tools/list` exposes the six tools with schemas; that `kinship_propose` **drafts and never sends**;
that `kinship_approve` without a reason is refused; and that an unknown tool and an unknown method
are JSON-RPC errors rather than silence.
