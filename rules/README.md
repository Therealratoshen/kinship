# rules/

Two scoped rule files, referenced from `../AGENTS.md`:

| File | Governs |
|---|---|
| `governance-invariants.mdc` | Autonomy ladder, grants, budgets, disclosure, containment |
| `pack-format.mdc` | Pack directory shape, namespaced keys, the validator gate |

**Honesty note, stated rather than assumed:** the `.mdc` extension is a **convention, not an
auto-loading mechanism** in this repository. Nothing here reads the frontmatter `globs:` and
nothing enforces them — the file that actually enforces anything is `scripts/validate-pack.mjs`,
and it enforces *structure*, not these semantics. Naming the convention anyway is deliberate:
it is where a contributor looks, it costs nothing to maintain, and the alternative — implying
enforcement that does not exist — is the failure mode the governance spec exists to prevent.

Each rule is a restatement of a numbered spec section. If a rule and the spec disagree, the spec
wins and the rule is corrected in the same PR.
