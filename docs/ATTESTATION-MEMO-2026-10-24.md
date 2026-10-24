# The attestation memo — how a decision proves a human made it

> **Date:** 2026-10-24 · **Status:** a design for the owner to rule on. **Nothing here is
> implemented, and nothing here is a decision.** The open question this memo answers is recorded in
> `DECISIONS.md`'s *Not yet decided* table.
>
> **Why this memo exists.** An outside-in review reproduced the defect below by driving the MCP
> server over stdio with no human present. It is the one finding in that review that is **not** a
> documentation defect and **not** fixable by a patch: fixing it changes the trust model the
> product sells, so it is the owner's call, and a design is worth more than a guess.

---

## 1. The constraint, first

**The model's hand must not be able to become the human's signature.**

Everything below is shaped by that, and by one thing it implies: a mechanism the model can reach is
not evidence. A prompt instruction is not evidence. A string the model supplies is not evidence. A
token the model can compute is not evidence.

The repository's own words for this are in `runtime/src/roles.ts`:

> An agent's or a member's "yes, go ahead" is input to a proposal, never a verdict (section 2.7).

and in the log format's refusal vocabulary, `not_the_human` — *"a member or an agent tried to act as
the organiser"*. The rule is already written. **What is missing is a way to tell a human's verdict
from an agent's, at the moment the verdict is recorded.**

## 2. What is there today

Every fact below is re-provable from the tree at the commit this memo was written against.

| # | Fact | Where |
|---|---|---|
| 1 | The MCP tool takes the deciding actor from the tool call: `by: str(args.by) \|\| 'organiser'`. | `adapters/mcp/src/tools.ts:230` |
| 2 | `by` is **not** in the tool's required list — the required list is `['cardId', 'verdict', 'why']` — so a call with no `by` at all is recorded as a decision **by `organiser`**. | `adapters/mcp/src/tools.ts:217-220` |
| 3 | The tool's own description says: *"The assistant **may pass on a decision a human has already made, and must never invent one**."* That sentence is enforced by prose alone. | `adapters/mcp/src/tools.ts:208-210` |
| 4 | The runtime checks only that the actor **names a declared seat**: `assertSeat(ctx, args.by, …)`. | `runtime/src/cards.ts:67`, `runtime/src/roles.ts:39-47` |
| 5 | The authorization token is **derivable from the card id**: `token: \`auth-${cardId}\``. | `runtime/src/cards.ts:107` |
| 6 | The tool calls `ctx.persist()` after deciding, so the decision is in the log. | `adapters/mcp/src/tools.ts:234` |
| 7 | The MCP server **is a host**: it imports `bootHost` and `persist` from the reference host and reuses its store and clock. | `adapters/mcp/src/server.ts:33` |
| 8 | The reference host's CLI **already has** a human-facing `approve` command, and it already refuses an approve without a reason. | `adapters/reference/src/host.ts:556`, `runtime/src/cards.ts:76` |
| 9 | The MCP adapter has **no human-facing entry point of its own** — it is `server.ts` and `tools.ts`. | `adapters/mcp/src/` |

**The reproduction** (from the review, reproduced against this tree): propose a card, then call
`kinship_approve` with `{ cardId, verdict: "approve", why: "…" }` and no human anywhere. The tool
answers *"card card-3 is now approved, decided by organiser"*, the log row says
`{"type":"CardDecided","cardId":"card-3","verdict":"approve","by":"organiser",…}`, and the
authorization `auth-card-3` is issued. **No human was involved. The audit row says one was.**

**Why it is not exploitable today, and why that is the argument for doing it now.** D21 ships no
channel transport, so nothing member-facing can send whatever the log says. The defect is **latent,
not live** — and it becomes the top risk the moment a transport exists, because the transport is
precisely what would carry the forged approval to a member.

**And the finding is a duplicate of a rule the runtime already enforces elsewhere.** The runtime
*does* refuse a member or an agent acting as the organiser. What it cannot do is tell an agent
*posing as* `organiser` from the organiser. The seat check answers "is this a seat?" and the question
is "**did a human use it?**"

## 3. Why this cannot be patched

Three structural problems, and each one breaks a different patch:

| Patch | Why it fails |
|---|---|
| Remove `by` from the tool and hardcode `organiser` | The model still decides. The log says a human did. **The defect survives.** |
| Require the caller to pass a magic string | The model can pass any string. A shared secret in the prompt is a secret in the prompt. |
| Disable `kinship_approve` | The brief is right not to: the tool has a legitimate job — passing on a decision a human already made — and removing it removes the path rather than securing it. |
| Make the token random | Necessary, and **not sufficient**: a random token that the model can *cause to exist* by deciding the card proves nothing about who decided. |

**The shape of the fix is therefore not "a better check" — it is a second act.** A decision and the
evidence for it cannot be the same act performed by the same party.

## 4. The design

**One concept: a decision requires an attestation, and the attestation is minted where the model
cannot reach.**

1. **The log is the evidence.** The `CardDecided` row is written by a **human-facing path** — the host
   CLI that already exists (fact 8) — and never by an adapter tool. The MCP adapter's
   `kinship_approve` becomes what its description always said it was: a way to **pass on a decision a
   human has already made, and prove it**.
2. **The proof is a capability the model cannot mint.** The human's path mints a **random,
   single-use attestation** (256 bits — and the token stops being `auth-${cardId}`, so it stops being
   derivable, fact 5), records it with the decision, and shows it to the human. The tool presents it;
   the runtime verifies it against the log. **A decision with no attestation is refused.**
3. **`by` stops being a tool argument.** The seat is resolved by the host, never supplied by the
   caller. The MCP tool's schema loses `by` entirely.
4. **The check lives in the runtime, not in the adapter.** If `decideCard` refuses an unattested
   decision, then *every* adapter is bound — the MCP one, and the next one. **Fix it in the adapter
   and the next adapter repeats the bug.**
5. **The log tells three states apart**, not two: *proposed* (the fleet asked), *decided with an
   attestation* (a human said yes, and here is the attestation id), and *no attestation present*
   (nothing was claimed). A card with a verdict and no attestation is **not** a decided card, and
   the timeline says so.
6. **No transport (D21) and no credential change.** The attestation is a local capability, on the
   machine the human is already sitting at. Seam 1 stays the host's.

### What the tool surface becomes

| | Today | After |
|---|---|---|
| `kinship_approve` inputs | `cardId`, `verdict`, `why`, **`by`**, `text` | `cardId`, `verdict`, `why`, **`attestation`**, `text` — **`by` gone** |
| What the tool does | decides the card | **reports** a decision the log already holds, and proves it |
| When the tool is called with no attestation | records a decision by `organiser` | **refused**, and says what to do |
| The seat in the log | whatever the caller said | **the host's** seat |
| The token | `auth-${cardId}` | a **random single-use** capability |

## 5. The alternatives, and why they lose

| Option | The shape | Why it loses |
|---|---|---|
| **A. The host CLI decides; the server reads** | The human runs `kinship approve card-1 --why …`; the server never writes a `CardDecided` row and reports what the log holds. | **Cleanest, and it collides with the log's single-writer lock**: the server and the CLI are two processes over one log, and the server also *proposes* cards, so it is a writer too. This option forces the "who writes a decision" question — see Q1. |
| **B. The server mints on the human's instruction** | The human drops an attestation file (or runs a command that writes one); the server watches for it and decides with it. | Works inside one process, and the channel is one the model cannot use — but it is a new local channel to build and secure. |
| **C. The assistant asks the human to run the CLI and paste the attestation** | The human mints it by hand and hands it over. | **Zero new machinery** — the CLI already exists — and the weakest human experience. Fine as a first release. |
| **D. The model may not approve at all** | Drop `kinship_approve`; the human always uses the CLI. | Honest, and it removes the *convenience* the tool was for. It also leaves the adapter unable to report a decision, which an assistant needs. |

**My recommendation: C first, then A or B.** C needs no new machinery and closes the hole; A and B
are the better experience once the writer question is settled. D is the fallback if the owner wants
the smallest possible surface.

## 6. What it costs

- **The MCP tool surface changes**: `by` is gone, `attestation` is required. Any client written
  against the old surface stops working — correctly, because the old surface was the defect.
- **One new refusal code** (`not_attested`). The refusal vocabulary is a **closed set of 34**, grown
  only by a dated row, because a code is part of the audit vocabulary and renaming one is a versioned
  event. So this is a versioned change, not an edit.
- **The log grows a field** (the attestation id on the decision row). Whether that is additive or
  needs a format-version bump is a decision with a cost either way, and it is the owner's.
- **The runtime gains one concept.** The runtime is the right home for the check, and the cost of the
  runtime is that it stops being a library with no opinion about who is talking.

## 7. Acceptance, if it is ratified

- A test that calls the approval path with **no attestation fails**, and the failure names the rule.
- The same call with a **valid attestation passes**, and the log row carries the evidence: the seat,
  the attestation id, and the reason.
- **The MCP tool surface has no input that can forge it.** A test that enumerates the tool's schema
  and asserts no caller-supplied field can stand in for the attestation or the seat.
- The token is **not derivable from the card id** — a test that two different cards' tokens are
  unrelated, and that the token is not a function of the card id.
- A **decision with no attestation never appears in the log** as a decision.
- Every new rule gets **a failing test first** (D24's rule, and this repository's).

## 8. The questions that are the owner's

**Q1 — who writes a decision?** The MCP server and the host CLI are two processes over one log, and
the log has a single-writer lock. Either the human's decision goes *through* the server (needs a
channel the model cannot use — option B), or the server stops writing decisions and only reads them
(option A), and the server re-reads the log before it answers anything. **I recommend deciding this
one first**, because it constrains the other two. *(This is the same "one writer per log" seam the
host contract already owns — D71 — and it is not a new problem, it is an existing rule applied to a
second host.)*

**Q2 — is one attestation one decision, or one session?** I recommend **one decision** (single-use,
consumed by the decision), because it matches the grant taxonomy the runtime already has: a grant is
scoped and consumed, not a standing permission.

**Q3 — does the log need to distinguish *proposed* from *decided*?** I recommend **yes**, with a
`proposedBy` on the proposal row, so "the fleet asked" and "the human said yes" are two facts with
two authors rather than one row with a name in it. This is the same distinction the timeline already
draws for refusals.

**Q4 — if the human's act is a command, is the command's output the evidence, or is the log?** I
recommend **the log**: the command's stdout is a convenience, and the row is the record. (A shell
history entry is a *hint* that a human was at the keyboard, not proof of what they decided.)

**Q5 — is one attestation per card, or per decision?** A card can be decided once, but an `edit`
verdict creates a new revision and a new card. I recommend **per decision**, so the attestation
travels with the verdict it authorises and cannot be replayed onto a later revision.

## 9. What this memo does not do

- It does not change the runtime, the MCP adapter, the log format, or the refusal vocabulary.
- It does not decide Q1–Q5, and it does not pick an option in §5 — that is the owner's.
- It does not touch `D9` (the shadow-mode event), the transport question, or PRD section 12-Q12
  (the delegation question). **One seat stays `organiser` until the owner ratifies otherwise**, and
  this memo does not change that.
- It does not widen any trust boundary. The attestation is a **narrowing**: the model can do less.

## 10. What to do with it

Ratify, reject, or rewrite. If ratified, the order I would take it in:

1. A dated `DECISIONS.md` row for the decision, and a refusal-code row — because the vocabulary is a
   closed set and this grows it.
2. The runtime change: `decideCard` refuses an unattested decision, and the token becomes random.
   **Failing tests first.**
3. The host CLI's `approve` mints the attestation.
4. The MCP adapter's tool surface: `by` gone, `attestation` required, and the tool reports rather
   than decides.
5. The log-format question (additive field, or a version bump) — the owner's, and the one thing
   here that cannot be undone by a revert.

**The last thing this memo says, and the most important:** the defect is latent today, and it is
latent *because* the product ships no transport. That is a coincidence of sequence, not a property.
**The moment a transport exists, this is the top risk in the repository** — so designing it now,
while it is still cheap and while the decision costs one sentence, is the cheapest it will ever be.
