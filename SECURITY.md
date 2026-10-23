# Security policy

**Do not open a public issue for a vulnerability.** Report it privately — either way reaches the same
inbox, and both are read by the maintainer:

1. **[GitHub security advisories](https://github.com/Therealratoshen/kinship/security/advisories/new)** —
   the private route, and the one to prefer: it is the only one that does not put a disclosure in a
   place an attacker can read before it is fixed.
2. **Email — `filborthen@gmail.com`**, the same address the commits and the licence carry. Put
   "security" in the subject. **This address is the maintainer's personal one; a dedicated
   `security@` alias on a domain the project owns is the better long-term home, and setting one up is
   an open item rather than a done thing.**

Triage within **3 business days**, and a fix or a mitigation note before the next release either way.

**What is *not* a vulnerability**, so the report is not wasted: a pack that fails to boot because its
own shape is wrong; a refusal you think is wrong (the refusal codes are the product, and
[the spec](spec/GOVERNANCE-SPEC-OUTLINE.md) says which rule each one enforces); and a fork you think
should have shipped something it does not — that is a feature request, and the discussion is open.

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
