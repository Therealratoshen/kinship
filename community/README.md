# `community/` — the evidence layers

Three files live here, and they are not the same kind of thing:

| File | What it is | Dated against |
|---|---|---|
| [`OSS-COMPLETENESS-POV-2026-10-19.md`](OSS-COMPLETENESS-POV-2026-10-19.md) | the first pass at *what is not complete yet* as an open-source project | `main` at `02f80d1`, 2026-10-19 |
| [`OSS-COMPLETENESS-POV-2026-10-24.md`](OSS-COMPLETENESS-POV-2026-10-24.md) | **the current one** — the same pass, re-read five days on, and **its own corrections are recorded in its body** | `main` at `76c7b4b`, 2026-10-24 |
| [`REPO-AUDIT-2026-10-24.md`](REPO-AUDIT-2026-10-24.md) | how the branch development went, and what still drifts | 2026-10-24 |
| [`MEMBER-LENS-2026-10-17.md`](MEMBER-LENS-2026-10-17.md) | the member's side of the same product, read from outside the codebase | 2026-10-17 |

**Why they are dated snapshots and not living documents.** Each one is a *reading at a commit*, and
the commit is named in it, so a reader can re-run every number in it. A finding that has since been
fixed stays in the snapshot — the snapshot's job is to show what was true then, not to track what is
true now. **The live surfaces are [`ROADMAP.md`](../ROADMAP.md) (what is not complete) and
[`DECISIONS.md`](../DECISIONS.md) (what was decided, and by whom)** — read those for the current
state.

**The one rule that governs this directory** (`CONTRIBUTING.md` says it too): these are *evidence
layers*. They are corrected by a **new** dated document or a **new** row in `DECISIONS.md` — never by
editing an old one in place, because the point of the record is that what was written when is still
there to be read.
