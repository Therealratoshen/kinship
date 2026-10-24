# The reference host

A host owns the four seams the runtime refuses to fill — **credential, clock, store, transport**
(`spec/HOST-CONTRACT.md`). This one owns three of them and deliberately not the fourth.

```bash
node adapters/reference/src/host.ts run \
  --pack packs/kopdar-ops \
  --config packs/kopdar-ops/pack.local.yaml \
  --log logs
```

## What it does

| Command | What it does |
|---|---|
| `run` | Boots the fleet (or **continues the log** if one exists), writes the cover, prints what a human is waiting on. `--watch` keeps ticking. |
| `tick` | Moves the clock by `--tick-ms` (default 5000), fires whatever came due, persists, prints. |
| `approve --card card-1 --why "..."` | The organiser's verdict, through the same API a UI would use. A verdict without a why is refused. |
| `verify` | Reads the files back and verifies them: dense in `seq`, they fold, and the state they fold to is the state the fleet holds. |

## What it produces

Two files per community, under `logs/<pack-key>/`:

```
logs/kinshipai/bundled/event-ops/kopdar/events.jsonl     # one LoggedEvent per line, seq ascending, nothing else
logs/kinshipai/bundled/event-ops/kopdar/manifest.json    # the cover — never fed to replay
```

`events.jsonl` is byte-for-byte the input `Fleet.replay` expects, so there is no filtering rule a
host can get wrong. The manifest says which community the log belongs to, how many rows it holds,
which `needs:` answers it was written under, and — stated *in* the artefact — that it holds member
identifiers and that **no message text is stored**.

The answers' **values stay out of the manifest**: a digest and the key names go in. One of the eight
answers is `escalation_contact`, a named human, and a log that travels to a co-organiser should not
carry a second person's identifier. Drift shows up as a digest mismatch instead.

Both files are written `0600`. Retention is the host's policy (seam 3).

## What it cannot do: deliver

Not because a transport is unconfigured — because the refusal is a line of code in
`runtime/src/engine.ts`. Every member-facing commit ends at `no_transport` (D21).

That distinction is the whole claim, and it is why this host has no transport at all: opening a
port converts the repo's strongest claim from *cannot* to *does not unless wired*, which is a
different sentence and needs its own dated row (`DECISIONS.md` D41's memo section 4, O1 versus O2). The
artefact phase 1 is supposed to produce is **"here is what the fleet drafted and what it refused,
in a file you can hand a reviewer"** — not "here is a delivered send".

## Where the code lives, and why

Adapters live outside `runtime/` — a sibling package with its own manifest and its own dependencies,
never inside `runtime/` and never a dependency of `kinship-runtime`. The split is mechanical:
`runtime/src` may touch `node:fs` in `pack.ts` alone, read-only, so a writer inside it would fail
the boundary gate on purpose (D32). **Verification** is control-plane semantics and lives in the
runtime as a pure read (`Fleet.verifyLog`); **writing** is seam 3 and lives here.

## Its dependencies

One, and it is a local path: `kinship-runtime` at `file:../../runtime`. Nothing is published and
nothing is fetched from a registry — `npm install` in this folder only creates a symlink.

```bash
cd adapters/reference && npm install && npm test
```

The four gates at the repo root still need no install step: this package is not one of them, and a
gate list that grows is a doc that drifts (D24).

---

## Run it on your own community

The reference host runs the fleet and writes a file. The gates in the root README print results; this is the part that *acts*.

```bash
cd adapters/reference && npm install --no-audit --no-fund && cd ../..
```

That is the only `npm install` a **user** needs (the root README's `scripts/quickstart.mjs` does it for you). The typecheck above installs its compiler with
`--no-save` so it never enters a manifest, and the MCP adapter's one has a `preinstall` hook that links
the same local path. The host's own dependency is a path to `runtime/`, so npm creates a symlink and
downloads nothing. `--offline` works too.

**Two files, both gitignored, because both hold your community's own data.** The first is who you are;
the second is what you are doing next. You do not have to copy them by hand:

```bash
node adapters/reference/src/host.ts init --pack packs/kopdar-ops
```

That creates both from the shipped examples and tells you what to edit next. **It never overwrites a
file that already exists** — an `init` that clobbers a community's own answers is a data-loss bug
wearing a helpful hat.

```bash
$EDITOR packs/kopdar-ops/pack.local.yaml         # eight answers: your name, your channels, your contacts
$EDITOR packs/kopdar-ops/pack.local.plan.yaml    # your copy, your next event, your members
```

`pack.local.yaml` is the eight answers the pack needs before it will boot. `pack.local.plan.yaml` is
your working file: **the copy you wrote** for each lane and phase, **the next event** with the facts
your copy may use, and **your members** with the timezone that decides their own quiet hours.

**Your copy is your copy.** There is no model in this repository. The runtime writes no member-facing
text of its own and invents no fact. A `{slot}` with no value refuses the whole template rather than
leaving a hole in a message, and a copy written for a lane your pack does not declare is refused too.

Now run the fleet. `--now` is the moment the host acts as if it were, which is how you rehearse a
week's worth of reminders without waiting a week.

`plan` is a read. It writes nothing. It tells you what the fleet would do, and what is broken in your
copy before the event rather than during it.

```bash
node adapters/reference/src/host.ts plan --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --plan packs/kopdar-ops/pack.local.plan.yaml --log logs
```

`run` schedules the timers, fires the ones that are due, and drafts the cards. The copy in them is
yours, with your facts filled in and the disclosure line in the place you put it.

```bash
node adapters/reference/src/host.ts run --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --plan packs/kopdar-ops/pack.local.plan.yaml --log logs --now "2026-11-07T19:00:00+07:00"
```

**Two more commands you will want.** `tick` fires the wakes that are due right now, without
re-planning the event; `draft` drafts one card on demand, which is how you draft something the
schedule did not think of:

```bash
node adapters/reference/src/host.ts tick --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --plan packs/kopdar-ops/pack.local.plan.yaml --log logs

node adapters/reference/src/host.ts draft --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --plan packs/kopdar-ops/pack.local.plan.yaml --log logs --class draft.reminder --agent event-ops --text-id "Reminder: Kopdar besok jam 19:00." --text-en "Reminder: Kopdar tomorrow at 19:00."
```

Now you are the human in the loop, and you can say no:

```bash
node adapters/reference/src/host.ts approve --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs --card card-2 --why "tanggal dan tempat sudah benar"

node adapters/reference/src/host.ts approve --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs --card card-1 --verdict reject --why "terlalu awal, kita umumkan besok"
```

And then you try to publish, and the gate stops you:

```bash
node adapters/reference/src/host.ts publish --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs --card card-2 --recipient wa:62811
```

```
refused: no_transport
  [no_transport] (D21 / D11) phase 1 ships no channel transport — delivery is the organiser's hand;
  the authorization is left intact and the refusal is logged
```

**That refusal is the product.** Phase 1 ships no channel transport, so every member-facing commit
stops at `no_transport` and the log records that it stopped. A member who has said stop is stopped
earlier still, at `member_suppressed`.

Two files appear under `logs/kinshipai/bundled/event-ops/kopdar/`:

```
events.jsonl     one row per action, in order — this is exactly what replay reads
manifest.json    what a reader needs to know before opening the log
```

Check the log is honest:

```bash
node adapters/reference/src/host.ts verify --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
```

**And if you want the day's summary** — what the fleet did, what a human decided, what was
refused, and what is still waiting on you — ask for the digest:

```bash
node adapters/reference/src/host.ts digest --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
```

**And if you want to share the log** — with a maintainer, in an issue, anywhere public — redact it first.
The log carries member *identifiers*; the redacted copy carries none, and the governance evidence
(event types, order, refusal codes, reason strings) survives intact, so a reader can still check that
the rules held. The original is never touched.

> **Read this before you share it.** Redaction removes the **identifiers**, and it deliberately keeps
> the **copy** — the drafted message is the thing under review, so removing it would leave a log
> nobody can check. Which means **every message your fleet drafted travels in the redacted copy**:
> the venue, the phone number, the register link. **If any of those is a secret, the redacted copy is
> not safe to share** — a private stream link, a passcode, a Telegram invite. Delete the secret from
> the copy before it goes anywhere. (The manifest says this too, in one field: `draftCopyInFile: true`.)
> The other limit, unchanged: a redacted log of a three-person community is still a small log, and a
> reader still learns that three people exist.

```bash
node adapters/reference/src/host.ts redact --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
# → logs/events.redacted.jsonl and logs/manifest.redacted.json
```

**And the honest limit of redaction:** it removes the *identifiers*, not the *shape*. A redacted log
of a three-person community is still a small log, and a reader still learns that three people exist.

The manifest states the privacy position inside the file: member identifiers are in the log, member
message text is not, and the draft copy is. It carries a digest of your eight answers rather than
their values, so the log can travel without carrying a second person's name.
