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
different sentence and needs its own dated row (`DECISIONS.md` D41's memo §4, O1 versus O2). The
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
