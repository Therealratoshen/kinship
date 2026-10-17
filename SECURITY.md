# Security policy

**Do not open a public issue for a vulnerability.** Report it privately via
[GitHub security advisories](https://github.com/kinshipai/kinship/security/advisories/new) and
we will triage within 3 business days.

This repository is pre-code: the only executable surface today is
`scripts/validate-pack.mjs`, which parses untrusted pack directories. If you can make it
execute, write outside the pack directory, or pass a pack that declares a mutating moderation
tool or `whatsapp | send`, that is a vulnerability — the validator's job is to refuse, and a
forged `bundled: true` that claims an invariant we do not hold counts too.
