# Persisted log and the first host — seam 3, as a question with a recommendation

**Date:** 2026-10-19 · **Owner of the decision:** Filbert. Seam 3 is the host's by contract
(`spec/HOST-CONTRACT.md` §seam 3: "persisting, pruning, backing up, and access-controlling the event
log"), but the *format* is not decided by anyone: it appears in this repo only as a gap — "**no
persisted log format**" in the not-decided list of `DECISIONS.md` D40 and in `PLAN.md`'s tenth addendum,
and as shortlist item **A2** in `community/OSS-COMPLETENESS-POV-2026-10-19.md`, where it is called
explicitly *his* phase-1 ruling. `ROADMAP.md`'s adopter row is the place that calls it "the runtime's
**first persisted format**" (the POV row it came from words it as "his ruling on the first persisted
format"), and that sentence is this file's reason for existing: it is a design decision written down as a
to-do, with no row anywhere in `DECISIONS.md` that records it. So this memo answers a question that has
never been written down as a question. **Status: open.** This file recommends. It decides nothing, builds
nothing, and changes no promise — nothing here enters `DECISIONS.md` as a settled row until he takes the
call, and the row will be his, not mine.

Written because `ROADMAP.md` lists three adopter gaps that are one gap wearing three hats — no host, no
file, no quickstart that ends in an artefact — and because phase 1's evidence is currently **a hand-filled
template** (`pilots/shadow-mode/TEST-PROTOCOL.md` §5 "Instruments" lists `EVENT-TEMPLATE.md` as the
per-card approval log), which means the diary and the fleet's own record cannot be cross-checked against
each other.

**The constraint that invalidates the rest if missed:** persisting the log is the moment member
identifiers stop being memory and start being **a file someone can copy**. Every format choice below is
downstream of that sentence.

---

## 1 · What is already true, verified today

Each row is a fact about the tree, with the command or line that re-proves it. Nothing here is inferred
from the spec.

| # | Fact | Where to check |
|---|---|---|
| 1 | The log is a plain array in memory: `freshState()` returns `events: []`, and `append()` deep-copies with `structuredClone({ ...event, seq })` on a monotonic seq. | `runtime/src/store.ts` |
| 2 | `Fleet.replay(events, answers = {}, pack?)` is **not** a function of the rows alone — a faithful replay also needs the eight `needs:` answers and the pack. | `runtime/src/engine.ts:107` (`boot` at `:95`, constructor at `:86`) |
| 3 | The event vocabulary is 26 union members. | `grep -o "type: '[A-Za-z]*'" runtime/src/types.ts \| sort -u \| wc -l` — recount, do not restate |
| 4 | `CommitRefused` and `EscalationRaised` fold to nothing: "the log entry is the record; nothing else derives from it." | `runtime/src/apply.ts:60-63`, `:93-95` |
| 5 | Member **message text never enters the log** — only `textHash` (16 hex), and state keeps arrival metadata only. Two tests pin it. | `runtime/src/containment.ts:38`, `runtime/test/containment.test.ts:16,19`, `runtime/src/types.ts:182-192` |
| 6 | Member **identifiers do** enter the log, and the human-readable timeline prints them verbatim: `input from <memberRef> received (sha …)`, `member <memberRef> stopped`. | `runtime/src/engine.ts:413-414` |
| 7 | Draft copy is in the log in full — `CardCreated` carries the bilingual revision, so approved text that may quote a person is stored, not hashed. | `runtime/src/types.ts:38-51` (`Card.revision` at `:44`), `runtime/src/types.ts:142` |
| 8 | The transport refusal fires **only when there are recipients**; recipient-less internal commits execute and log `transport: 'none'`. So "nothing sends" is about member-facing lanes, and the code already says so. | `runtime/src/engine.ts:251-257`, `:266` |
| 9 | `runtime/src` may touch `node:fs` in **`pack.ts` only**, read-only, and each `node:` builtin is mapped to exactly one permitted module (`node:crypto` → `store.ts`). Scope is `runtime/src/**`; `tour.ts` and the tests already use `node:fs`/`node:os`. | `runtime/test/boundary.test.ts:44-48`, `:24`, `:30` |
| 10 | The self-describing precedent exists in the read-side: `health()` returns `derivedAt` and `derivedFromSeq`, and sweeps member identifiers out before returning. | `runtime/src/health.ts:95-96`, `:214-215` |
| 11 | **There is no pack digest anywhere in the runtime.** `hashText` is used for revision hashes, input hashes and class templates — nothing hashes the pack folder. So "record the pack sha" is a new field, not an existing one being copied. | `grep -rn "hashText" runtime/src/*.ts` |
| 12 | Adding a root-level document cannot fail the build: `GATE_DOCS` is an exact five-item list, history files are asserted *absent* from it, and no test enumerates the repo's files. | `scripts/gates.test.mjs:98`, `:103` |

## 2 · Three consequences nobody has written down

**(a) Replay proves the state. It does not prove the record — and `HOST-CONTRACT.md` reads as if it does.**
Seam 3 promises the host "restore the rows, replay them, and a mismatch is a corrupt store rather than a
governance bug" (`spec/HOST-CONTRACT.md` §seam 3, added by D33). Because of fact 4, a host can **delete
every `CommitRefused` row from a file and the replay still matches**, since refusals and escalations mutate
nothing. The rows most embarrassing to a fleet — what it tried and was refused — are precisely the rows a
restore-and-compare check is blind to. `seq` density catches whole-row deletion (a gap is visible without
any crypto). It does **not** catch an in-place edit to a field that does not fold, e.g. rewriting a
refusal's `code`. So the honesty ladder is three rungs, and the memo's ask is which rung phase 1 pays for.
The sentence I would change in `spec/HOST-CONTRACT.md` once he rules: *"the host's migration and backup
verification, for free"* → *"…verification of the **state**; the record itself needs the dense-seq check,
and tier 2 adds a digest chain."* I have not changed it, because a normative spec edit needs his word, not
my convenience.

**(b) A restored log is not self-sufficient, and making it self-sufficient puts a person's handle in the file.**
Fact 2: `replay` needs the eight `needs:` answers (`runtime/src/types.ts:265` — `Record<string, string>`)
and the pack. One of the eight is `escalation_contact` (`packs/kopdar-ops/.kinship.yaml:133`), which is a
named human. So the format has to choose: carry the answers (file becomes self-contained, and gains a
second person's identifier), or carry a **digest** of them and require the verifier to hold the real values
out-of-band (file stays portable; drift becomes visible as a mismatch, and reproducibility needs the
operator's own config — which they already have). Recommend digest, with the key list spelled out so a
reader sees which answers existed without seeing who the escalation contact is.

**(c) Persisting makes two already-open questions concrete.** Fact 5 is the good news and it should be
kept as a promise with a test: **message text does not land in the file.** Facts 6 and 7 are the exposure:
member refs and full draft copy do land. `spec/` §2.3 both asks "who can see the audit log?" and calls the
timeline member-readable, and `ROADMAP.md` lists that as unresolved; the UU PDP / platform-data-terms
posture is a standing owner decision that has never been asserted as compliant. In memory those gaps were
theoretical; a file in a folder is copyable, syncable, and forwardable. Recommendation for v0, and the
cheapest thing that is defensible without waiting for the legal answer: the file is **single-operator,
`0600`, outside any sync folder, retention owned by the host** (seam 3 already says retention is host
policy), and the manifest states plainly that it contains member identifiers — so a reader who finds the
file learns what it is before they read it.

## 3 · The format, concretely

Two files per community (one per pack key), because `replay` folds one ordered list and a reader must be
able to hand it over intact:

```
logs/<pack-key>/events.jsonl     # one LoggedEvent per line, seq ascending, nothing else
logs/<pack-key>/manifest.json    # metadata cover — never fed to replay
```

`events.jsonl` holds **only** `LoggedEvent` rows — no header line, no checkpoint rows interleaved — so the
file is byte-for-byte the input `Fleet.replay` expects, and there is no filtering rule a host can get
wrong. A row is exactly what `append` produced:

```json
{"seq":1,"type":"MemberRegistered","member":{"ref":"m-114","tz":"Asia/Jakarta","registeredAt":1000},"at":1000}
```

`manifest.json` is the cover, in the same self-describing style `health()` already uses (fact 10):

| Field | Why it is there | Status |
|---|---|---|
| `formatVersion` | A reader must **refuse a higher version, never clamp it** — the D35 rule, applied to a file format. | new |
| `packKey`, `packSchema` | Which community; both already exist on `Packed` (`types.ts:238-239` — `schema`, `key`). | exists |
| `packDigest` | So "the pack changed under the log" is visible. | **does not exist yet** — fact 11 |
| `nodeVersion` | The runtime's supported range is 23/24 in CI; a file written elsewhere should say so. | host-side |
| `firstSeq`, `lastSeq`, `rowCount` | Density check inputs; `rowCount` from `wc -l`, not from prose. | new |
| `answersDigest`, `answerKeys` | Replay needs the answers (fact 2); the keys name them, the digest detects drift, the values stay out. | new |
| `memberDataInFile: true`, `messageTextStored: false` | The privacy posture stated *in* the artefact, so it travels with the file. Fact 5 makes the second one testable. | new |
| `retentionOwner: "host"` | Seam 3's sentence, machine-readable. | exists as prose |
| `verifyCommand` | The regeneration discipline every audit artefact in this repo carries: the reader re-runs rather than trusts. | new |

**Verification in two tiers, and pick one.**

- **Tier 1 (recommend for phase 1).** Dense seq + replay-and-compare: read the rows, check `seq` is
  1..N with no gap, replay against the pack and answers, and assert deep-equal state the way
  `test/replay.test.ts` already does. Catches deletion of any row and edit of any folded field. Does not
  catch an edit to a non-folding field. No crypto, no canonical-serialisation problem, one pure function.
- **Tier 2 (name it, decide it later).** A per-row digest chain (`prev` + row → next digest), which catches
  in-place edits — and costs a **canonical serialisation rule**, because `JSON.stringify` order follows key
  insertion order, which depends on which code path built the event. That is real work and a real way to
  get a false "the file is corrupt" answer. It would reuse `hashText` from `store.ts` rather than import
  `node:crypto` into a new module, so the D32 builtin allowlist stays exactly as it is (fact 9).

**Where the code goes, and it is not where people will ask.** Verification is control-plane semantics —
invariant #2 says Kinship owns the replayable audit trail — so it belongs in the runtime as a pure read:
`Fleet.verifyLog(rows, answers, pack)` returning `{ ok, problems }`, with no `fs` and no I/O, tested by
fixtures. **Writing** the file is seam 3 and belongs to the host. That split is not a preference: fact 9
means a writer inside `runtime/src` fails CI on purpose, and the boundary gate would have to widen to let
it in, which is the wrong way to buy a log file.

## 4 · The reference host, and the one thing it cannot do

`ROADMAP.md` proposes a sibling package — boot the pack, own a `setInterval`, append rows, print cards.
That row's own wording says "through an `echo` transport", which pre-empts the O1-versus-O2 question below:
under O1 there is no transport at all, echo included, and the host prints through the read paths that already
exist. The phrase is the owner's to keep or change, and this memo does not touch `ROADMAP.md`'s text beyond
pointing the two rows here.
`spec/HOST-CONTRACT.md` §"What an adapter looks like" already fixes the location: `adapters/<host>/`, own
manifest, own dependencies, never inside `runtime/`, never a dependency of `kinship-runtime`. There is no
root `package.json` and `runtime/package.json` is `private: true`, so the first host has to decide the
install question too — a `file:../runtime` dependency works locally without publishing anything, which is
the cheapest answer and still leaves the "is vendoring-by-copy intended?" line in `ROADMAP.md` open.

**What it can do today, without touching `runtime/`:** own the clock (seam 2), persist the log (seam 3),
meter spend (seam 1's `recordSpend`), and print `inbox()` + pending cards to stdout. Every member-facing
commit still refuses `no_transport` (fact 8), so the demo ends where phase 1 is supposed to end: the
artefact is **"here is what the fleet drafted and what it refused, in a file you can hand a reviewer"**,
not "here is a delivered send".

**What it cannot do:** deliver. Not because a transport is unconfigured — because the refusal is a line of
code. That distinction is the whole claim, and it is the one genuine fork in this memo:

| Option | What it is | What it costs | Verdict |
|---|---|---|---|
| **O1** | No port. The reference host persists, ticks and prints. `runtime/` unchanged; "sends nothing" stays structural. | A shadow-mode event produces refusals and a file, which is exactly the designed shape — but no delivery receipt is possible, and `inbox()` already states it cannot confirm a handoff (`runtime/src/inbox.ts:173`). | **Recommended for phase 1.** |
| **O2** | Add an injected `deliver` at boot; when absent, today's refusal path is byte-identical. A host can then wire an `echo` transport and exercise the one-send authorization for real. | Converts the repo's strongest claim from *cannot* to *does not unless wired* — so README's §"What ships vs what is gated", `AGENTS.md`, `tour.ts`'s `gatedByDesign`, and D21's own sentence all need re-wording **in the same pass**, with a positive-control test that the unwired path still refuses. Needs its own dated row. | Real work, and his call — not a side effect of building a host. |
| **O3** | An echo transport inside `runtime/src`. | Breaks invariant #2 and fails `boundary.test.ts`. | Refused by the gates, not by taste. |

The trigger that should move him from O1 to O2 is measurable, not aesthetic: the day phase 1's protocol
needs a **delivery** figure rather than a drafting figure. Until then O1 keeps the claim.

## 5 · What I need from him — four answers, one line each

1. **Two files or one?** Recommend two (`events.jsonl` pure, `manifest.json` as cover), so the file is
   exactly `replay`'s input.
2. **Tier 1 or Tier 2 now?** Recommend Tier 1 for phase 1 and Tier 2 named-but-unbuilt, because the chain's
   hard part is canonical serialisation, and a false corruption alarm on an organiser's only audit file is
   worse than a slower truth.
3. **Answers: digest only, or values in the manifest?** Recommend digest + key list, so the log file carries
   no escalation contact and stays forwardable to a co-organiser who already has the config.
4. **O1 or O2?** Recommend O1, and O2 only as its own dated decision when a delivery figure is actually
   asked for.

Building it after those four is mechanical, not creative: `Fleet.verifyLog` + fixtures + one tour guarantee
in `runtime/`, one sibling package with a writer and a printer, and the two `ROADMAP.md` rows closing
themselves.

## 6 · Two defects this memo turned up, and did not fix

**(a) A privacy sentence printed at an organiser is wrong.** `runtime/src/inbox.ts:173-174` returns a
**limits sentence the organiser reads**, and it says: "the full bilingual copy, the who/why of a complaint,
and **the raw member input text** live in the audit log."
The first half is true (fact 7). The last clause is **false** — the log stores a hash, never the text
(fact 5, with two tests). It is a privacy statement printed to a human, and it is wrong in the direction
that makes the runtime look more exposed than it is; it also undercuts §2(c) of this memo, which depends on
that promise. The fix is one clause in one string; I have not applied it, because "go" covered this document
and a source edit — even a comment-free string — is his call. Say the word and it becomes a dated row with
a positive-control test that a log scan finds no message text.

**(b) The repo's own count of documents is not reproducible, including in this repo's gap list.**
`ROADMAP.md`'s prose-count row states that six files state a suite or guarantee figure and eleven tell the
reader to recompute something; `DECISIONS.md`'s open-question table still says the totals "are written into
six documents". Re-measured on this pass with the two commands below, the same-day numbers are **nine** and
**thirteen**:

```bash
grep -rlE "[0-9]+ (tests|cases|guarantees|lines)" --include="*.md" . | wc -l   # 9
grep -rlE "recount|recompute|re-run them|tour\.ts --json" --include="*.md" . | wc -l   # 13
```

Those are not the six and eleven `ROADMAP.md` quotes, because that pass searched with different terms — and
that is the point rather than a wrinkle: the count is a property of the pattern, not of the tree. So M1's own
row cannot be fixed by re-measuring it once; either the docs stop quoting a document count, or the count
becomes a generated surface with its command printed next to it. Both files are one edit each, and I have
not made them — `ROADMAP.md` is contributor-facing and `DECISIONS.md` is the log; a wording change in either
is his call.

## 7 · What this memo does not do

No code, no gate, no schema, no new action class, no pack key, no `logs/` directory created. **No PRD §14
row and no version bump: nothing here changes what the product promises** — it is the opposite, a document
about a promise that stays unmade. It does not add a §12 question number (the numbering is his, and D30's
Q13 is the last one I was told to leave open). It does not start phase 1: **`D9` is still unset and is still
the only thing that does.** It does not close any `ROADMAP.md` row — it gives two of them a shape to be
closed by.

**Reversibility 🟢:** one file at root; deleting it costs nothing downstream, because nothing links to it
except `ROADMAP.md`'s two rows and a `DECISIONS.md` row.

---

**Changelog**

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-10-19 | Opened as `DECISIONS.md` D41: the twelve verified facts, the replay-vs-record gap, the answers/replay dependency, the two-file format with two verification tiers, the verify-in-runtime / write-in-host split, and O1/O2/O3 on the transport port. §6 names two defects it found and did not fix — the `inbox.ts:174` privacy sentence that is wrong today, and the repo's own document count, which this pass measured as nine and thirteen against the six and eleven `ROADMAP.md` quotes. Recommendations only — every decision in §5 is the owner's. |
