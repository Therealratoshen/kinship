# Security policy

**Do not open a public issue for a vulnerability.** Report it privately via
[GitHub security advisories](https://github.com/Therealratoshen/kinship/security/advisories/new)
and it will be triaged within 3 business days.

The executable surface is two things, both of which parse **untrusted pack directories**:

- `scripts/validate-pack.mjs` — the pack shape gate.
- `runtime/` — the control-plane core. `pack.ts` loads a pack through that same validator, then
  `engine.ts` boots it. It ships **no channel transport**, so it cannot deliver anything to a
  member; a flaw here is a *governance bypass*, not a send.

A vulnerability is any way to make the fleet do what its invariants forbid — for example: execute
code or write outside the pack directory; boot a pack that declares a mutating moderation tool or
`whatsapp | send`; resurrect a `never` action class through a grant; get past the `no_transport`
gate; configure away member suppression, quiet hours, or the 2/24h cap; or forge a `bundled: true`
that claims an invariant this repo does not hold. Each of those is meant to **refuse** — if one
instead succeeds, that is the report we want.
