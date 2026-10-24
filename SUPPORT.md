# Support

**Kinship is maintained by one person, in their own time.** This file exists so that what you can
expect is written down rather than guessed at.

## What you can expect

- **Issues and pull requests are read.** Not answered on a schedule — there is no schedule, and
  inventing one would be the first promise this project breaks.
- **A bug is a bug** when the code does not do what the spec says it does, or does something the spec
  says it must never do. A missing feature is not a bug; it is a feature, and `ROADMAP.md` says
  whether a contributor may close it or it is the owner's call.
- **Security reports are read first**, and handled ahead of everything else. See [SECURITY.md](SECURITY.md).
- **No SLA, no uptime promise, no response-time promise.** This is a governance library with a
  reference host, not a service.

## What you should not expect

- **A hosted version of this repository.** Nothing *here* is hosted: this repo is a library you run
  yourself, and it has no SLA because it is not a service. A separate project — **Kinship Host**, at
  [shortcutsistem.com](https://shortcutsistem.com) — does host a pilot on top of the same control plane,
  with its own terms and its own (no) SLA. The open-source boundary is a promise with a dated row behind
  it — see [DECISIONS.md](DECISIONS.md) D19, D81 and the README.
- Commercial support of any kind. If you need it, this project is not the answer yet.
- Compatibility with a harness you have not seen the host contract for. If you are writing an
  adapter, [spec/HOST-CONTRACT.md](spec/HOST-CONTRACT.md) is the contract — four seams, and what
  Kinship checks afterwards.

## Asking well

The fastest question is the one that says what you did, what you expected, and what happened
instead. Include the **version** (the `v0.x.y` tag or the commit sha), the **Node version**
(`node --version` — the runtime needs node ≥ 23), the **exact command**, and the output.

**Never attach a raw log or anything containing member data to a public issue.** The log carries
member identifiers. Redact it first — `node adapters/reference/src/host.ts redact --pack <dir>
--config <file> --log <dir>` writes `events.redacted.jsonl` and `manifest.redacted.json` beside the
original, with the identifiers replaced by stable, non-reversible pseudonyms and every event type,
refusal code and reason left intact. **The original is never touched.** If the report is a
vulnerability, open a private security advisory instead ([SECURITY.md](SECURITY.md)).

## Reporting something that might be a vulnerability

Not a public issue. [SECURITY.md](SECURITY.md).
