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

## Point an assistant at it

The server speaks MCP over stdio, so any MCP client can drive it. The configuration is one command
and four paths:

```json
{
  "mcpServers": {
    "kinship": {
      "command": "node",
      "args": [
        "/absolute/path/to/kinship/adapters/mcp/src/server.ts",
        "--pack", "/absolute/path/to/kinship/packs/kopdar-ops",
        "--config", "/absolute/path/to/kinship/packs/kopdar-ops/pack.local.yaml",
        "--plan", "/absolute/path/to/kinship/packs/kopdar-ops/pack.local.plan.yaml",
        "--log", "/absolute/path/to/kinship/logs"
      ]
    }
  }
}
```

### One exchange, captured from a real server

**This is what the server actually answered**, not a transcript written by hand — the same JSON-RPC
lines a client sends, over the same pipe.

**1. The handshake.** The client says who it is; the server answers with the protocol version, the
tool capability, and what this server is for.

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"kinship","version":"0.1.0"},"instructions":"Kinship decides what an AI agent fleet may do to reach a person, and proves that it was decided. Propose member-facing actions with kinship_propose — the runtime decides, and a refusal is an answer. Nothing here sends anything."}}
```

**2. The tools.** Six of them, each with a name, a description and a JSON Schema:
`kinship_plan`, `kinship_digest`, `kinship_drafts`, `kinship_propose`, `kinship_approve`,
`kinship_health`.

**3. The assistant proposes.** This is the interesting one, and the answer is **a card, not a send**:

```json
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"DRAFTED — card card-1 is waiting on a human.\nIt has NOT been sent, and it will not be sent until a named human approves it with a reason.\ncopy: Halo! Besok jam 19:00."}]}}
```

**What the assistant should do with that.** Show the card to the human, with its copy, and stop.
**It is not allowed to approve it** — the tool that does that is the open question below, and until
it is settled, the assistant's job ends at *propose*.

**4. The human decides.** A verdict with a reason, recorded in the log:

```json
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"card card-1 is now approved, decided by organiser. The reason is in the log."}]}}
```

**Where the log is.** `--log <dir>`, and inside it the pack's own directory —
`<log>/kinshipai/bundled/event-ops/kopdar/events.jsonl` and `manifest.json`. The same files the
reference host writes, in the same format, because this adapter **reuses** the reference host's store
rather than inventing a second one. `kinship_digest` and `kinship_drafts` read them back.

### And the one step that is not settled

**`kinship_approve` records that the actor holds the community's declared seat — it cannot yet tell
that a *human* used it.** The seat itself is resolved, not chosen: it comes from the org's
`human_seats` (spec section 1.11), the tool takes no actor argument, and a call that carries one
anyway is checked against the community's seat — a **mismatched** seat is refused loudly, and one
that matches is accepted (so a client written against the old schema keeps working). What the runtime
still cannot see is the difference between *the seat holder decided this* and *something drove the
seat holder's tools*. So the approval step proves less than
the rest of this adapter does, and `DECISIONS.md`'s *Not yet decided* table carries the design for
making it prove the rest. **Treat `kinship_approve` as a local convenience, not a boundary**, and
read the log rather than the tool's answer when the question is "did a human decide this?".

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
