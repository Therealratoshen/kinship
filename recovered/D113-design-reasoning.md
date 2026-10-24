# D113 — the design reasoning, recovered from the dead session's transcript

Session `455907776823462` ("Continue kinship handover"), turn `b6f5f4f3-2068-495d-8932-6707813a3b13`.
The session died on the MiniMax token-plan quota (42212) at **17.3% context**, mid-edit — so it never
committed, never pushed, and its workspace was wiped. This thinking block is the only surviving
record of the reasoning behind the design.

**It also carries the open questions the session had not yet resolved** — read it before re-deciding.

---

Good. Now I understand the validator's structure. Rules are `add('PKG-NN', message)`.

Now let me plan the implementation concretely. Let me write the plan:

## Design: the pack-level capability override (D113)

### 1. The shape

A pack's `.kinship.yaml` gains an optional top-level `capabilities:` block, same shape as the org's:

```yaml
capabilities:
  human_check:
    shape: pull
    reason: "..."
```

### 2. The rules (the "narrow, never widen" rule)

- **A pack may NARROW what the org enables.**
  - `human_check` shapes: `pull` is narrower than `push`.
  - So: org `push` + pack `pull` → allowed, resolves to `pull`, source `pack`.
  - org `pull` + pack `push` → **refused** (widening).
  - org absent (pack is its own top tier) → the pack may declare any shape (it's the top tier; there's nothing above it to widen past). Hmm — is that right? If the pack is its own top tier, it IS the authority. But the org might not exist. Let me think: with no org, the pack declares the capability → source `pack`. That's consistent with `guardrails` handling: a pack with no org uses its own values.
  
  Hmm, but careful: the org's human_check is `push` in `orgs/kinshipai.yaml`. The bundled pack names that org. If the bundled pack declares `pull`, it narrows. If it declares `push`, that matches the org → not a widening, but also not the org's decision... Hmm. If the pack says `push` and the org says `push` → same, allowed, source `pack`? Or `org`? 
  
  Let me define: **the pack's declaration wins only when it is strictly narrower.** If the pack declares the same shape as the org, that's not narrowing — it's agreement — and the org's reason is the one that justified it. Hmm, but then the pack's own `reason:` would be ignored, and the pack shouldn't be forced to give a reason for a no-op.
  
  Hmm, this is getting complicated. Let me simplify to a clean, defensible rule:

  **The pack's `capabilities:` block is an OVERRIDE, and it is only allowed to narrow.** So:
  - The pack declares `human_check` with a shape that is strictly narrower than the org's → the pack's shape wins, source `pack`, and the pack's `reason:` is required (it must justify the narrowing).
  - The pack declares a shape equal to the org's → **refused**: an override that does not narrow is a second copy of a decision, and D100's lesson (a fact in two files drifts). Hmm — or allowed-and-ignored? Refusing is more in keeping with "refuse, never clamp" and "an unknown field is refused, not ignored".
  
    Hmm, but that's harsh: a pack that says `push` when the org says `push` is harmless. But it's a *second copy* of a decision the org already made. The repo's style is to refuse second copies of facts (the `seat:` case). Hmm, but the `seat:` case was refused because the runtime resolved it elsewhere AND the manifest carried it.
    
    Hmm. Let me reconsider. A cleaner and more forgiving rule that's still safe:
    - pack declares a shape **narrower** → pack wins (source `pack`).
    - pack declares a shape **equal** to the org's → the org's declaration stands; the pack's declaration is redundant. Is redundancy a refusal? Hmm.
    
    Let me think about which is more useful and more in the repo's spirit. The repo refuses "a field nothing reads" and "a second copy of a fact". A pack that declares the same shape as the org IS a second copy. But refusing it means a pack can't be self-contained (a pack you copy to another org would break).
    
    Hmm! That's an important practical point: packs get forked and moved between orgs. If a pack hard-codes `push` and you install it under an org that says `pull`, the pack would be refused for widening. That's the *correct* behaviour for "refuse never clamp" (the pack is asking for more than the operator allows) but it makes packs non-portable.
    
    OK. Decision: **refuse only a widening.** Allow a narrowing (pack wins, source `pack`, pack's reason required). Allow an equal declaration (pack agrees; the org's reason and source stand — and note it in provenance). That is forgiving, safe, and portable. And it means the pack's `reason:` is required only when the pack actually narrows.

    Hmm, but then a pack that narrows must give a reason, and a pack that agrees needn't. That's slightly asymmetric but defensible and simple: **the reason is required when the pack takes the decision** (narrows). When the pack merely agrees, the org's reason stands.
    
    Hmm, hmm. Actually, simpler and more consistent: **require `reason:` on every pack capability declaration** (same as the org). Consistency beats cleverness, and the org parser already requires it. Then: pack reason is used when the pack narrows; when the pack agrees, the org's reason is the operative one and the pack's reason is... unused. Hmm, that's the "field nothing reads" smell.
    
    OK, final: require `reason:` on every pack capability declaration, and **use the pack's reason whenever the pack's declaration is in force** (narrowing OR equal). When equal, source = `pack` (the pack did state it) — hmm, no. If equal, both files state it; source should be... 
    
    Ugh, I'm overthinking. Let me pick the simplest coherent semantics:

    **Rule: a pack's `capabilities:` block may only narrow the org's. Equal or absent → the org's declaration stands (source `org`). Narrower → the pack's declaration stands (source `pack`), and the pack's `reason:` is required. Wider → refused.**
    
    And: when the pack narrows, the pack MUST give a `reason:` — because it is taking the decision. When the pack's shape equals the org's, the pack's `reason:` is optional and ignored (the org's stands). Hmm — "ignored" is a field nothing reads. 
    
    Alternative: when the pack's shape equals the org's, the pack's `reason:` is REQUIRED and the resolution is source `pack` with the pack's reason. Then every field is read. And the "narrow" rule only ever refuses a *widening*. That's clean: **the pack's block, when present, is in force** — with one exception: it may not widen. Its reason is required. Its source is `pack`.
    
    Wait, but then the pack can *replace* the org's reason with its own for the same shape. Is that OK? It's the community's own file, and the community is the one being governed. The org's reason is the operator's justification for the org's default; the pack's reason is the community's for its own. Hmm, but the org said `push` for a reason ("Cards wait for a person, and a person who is not told is not waiting"). If the pack says `push` with reason "we want it", the pack has restated the decision with its own justification. That's... actually fine and arguably right: the community justifies its own operating posture.
    
    Hmm, but it means the org's reason is lost, which might be exactly what the org wanted to ensure. Hmm.
    
    OK you know what, let me go with the SAFEST and most defensible, which is also the simplest to explain:

    **A pack's capability declaration is an override of the ORG's, and only a NARROWING one is accepted.**
    - narrower → the pack's shape + the pack's reason are in force (source `pack`). Pack's reason required.
    - equal → **refused**: "your override does not narrow anything — the org's declaration stands; remove it, or narrow it." This refuses the second copy of a decision (D100's lesson) and keeps every field read.
    - wider → **refused**: "a pack may narrow, never widen."
    - absent → the org's stands (source `org`).
    - pack is its own top tier (no org) → the pack's declaration is the top-tier declaration (source `pack`), any shape is legal, reason required.

    Hmm, "equal → refused" — is that too strict? It means a pack under an org that says `push` cannot write `push`. It must omit the block. That's clean, one rule, and it makes the pack's block *only* meaningful as a narrowing. I like it. And it's genuinely "refuse, never clamp".

    Hmm, but one more consideration: a pack that is its own top tier and declares `pull` — fine. And a pack under an org with NO capability declaration (org omits `capabilities:`) — the org's default is `pull` (DEFAULT_REVIEW_SHAPE). Can the pack then declare `push`? That would be *widening* past the org's effective `pull`. Hmm — but the org didn't declare it; the org just didn't say. Is `pull` the org's decision or the runtime's default?
    
    The org's file declares `capabilities.human_check.shape: push`. So the effective org shape is `push`. If an org omitted the block, the effective is `pull` from `default`. A pack under such an org declaring `push` → widens past the default. Per "the org may only refuse or fill a blank", the org's *absence* is a blank that the runtime fills with the conservative default. A pack widening past that default... hmm.
    
    Cleanest: **the pack may narrow the EFFECTIVE org shape, whatever it is.** If the org's effective is `pull` (default), the pack cannot widen to `push`. Simple, one rule, no special case. 

    Hmm, but then a community whose operator never configured capabilities can never choose `push` — they can only choose `pull` (the default). That's the conservative direction and it's consistent with "absence is not permission". Fine. And it means the bundled pack (under kinshipai which says push) may narrow to `pull`.

    Hmm, wait, but there's a wrinkle: the runtime's default when NO manifest says anything is `pull`, and it's described as "the runtime does not ask". If a pack under an org-with-no-capabilities wants `push`, they're stuck. Acceptable and safe. Actually — hmm, let me reconsider: should the pack be allowed to go from `default` to `push` when the org declared nothing? The rule "an org may only refuse a pack or fill a blank it left" means the org's blank gets the default. The pack is the community. Hmm.

    I'll go with: **the pack may narrow the effective shape. Period.** And I'll state in the D-row that a community whose operator left the capability unset inherits `pull` and may not widen to `push` — a pack is a narrowing instrument, and widening is the org's job. That's a clean, defensible, safe rule. And it directly matches #36's acceptance: "A pack may narrow a capability the org enables, and may not widen one the org disabled."

3. **Which shape is narrower?** `pull` < `push`. I need to justify this in the D-row. Justification: `push` makes the runtime write an extra `ReviewRequested` row and obliges the host to notify a human — more machinery and more interruption, i.e. a wider blast radius; `pull` is the conservative default. So `pull` is narrower. Hmm, hmm. Is that right though? Let me think again from the governance side.

    Hmm — actually, hold on. Let me think about it from the *member protection* side, which is this repo's compass. Does `push` or `pull` protect members more?
    
    `push` = the runtime writes a ReviewRequested row → the host notifies the human → the human answers faster. Faster human answer = the member waits less. That sounds *better* for members.
    
    `pull` = the human must come and look. Slower.
    
    Hmm! So from a member's perspective, `push` might be better. But `push` also means the host must have a notification channel — more machinery, and the row is written for every card.
    
    Hmm, this matters — "narrower" must mean something defensible. Let me look at the D103 decision and the spec's framing again: "The human check's **shape** is configurable... `push` (the runtime asks: a card that needs a human also writes a `ReviewRequested` row, which is what a host turns into a notification) or `pull` (the human opens the inbox and the runtime interrupts nobody)."
    
    And the default is `pull`, described as "the conservative reading — a fleet that starts by interrupting a human it was never introduced to is a fleet that has already spent the one thing it cannot get back."
    
    So the repo's own word for `pull` is **conservative**. Conservative = narrower. I'll go with `pull` narrower than `push`, and justify it with the repo's own framing: `push` writes an extra row and obliges the host to interrupt a human — a wider blast radius on the operator's side; `pull` is what the runtime calls conservative and it interrupts nobody. **Narrower = fewer side effects and fewer obligations created by the runtime.**
    
    Hmm, wait. Let me reconsider once more, because there's a risk I'm building a rule with the direction backwards and burying it. Let me check: is there any existing precedent in the repo for "narrower" between capability shapes? No — human_check is the only capability. Hmm.

    Hmm, let me think about it differently — **what could go wrong?**
    - If `pull` is narrower: a pack under a `push` org can turn off the notification. Effect: cards wait longer. Risk: a community forgets cards. That's the failure `push` was designed to avoid ("a card that waits silently is a card that waits forever"). So the pack override could reintroduce that failure — but that's the *community's* choice about its own operation, which is exactly what a pack-level override is for.
    - If `push` is narrower: a pack under a `pull` org could turn on notifications — the runtime writes more rows and obliges the host to interrupt a human. That's "wider" in the sense of more machinery, but "better" for members.

    Hmm. The decisive framing in this repo: **"narrow" = "less reach, fewer obligations created"** — used for autonomy, budgets, guardrails. And the repo's own DEFAULT for the capability is `pull`, called "the conservative reading". A default that is conservative is the narrow end. If `pull` were the wide end, the conservative default would be the wide end, which contradicts the repo's language.

    Hmm, but "conservative" for the *operator* ≠ "narrow" for the *fleet*. Ugh.
    
    Hmm, OK, let me look for a tiebreaker in the repo. "A pack may be STRICTER than what is here" (org floors). "A pack that tries to be looser is refused, not clamped." What does "stricter" mean for the org's `floors`? `member_message_cap_per_24h` — smaller is stricter. `report_aggregation_floor` — larger is stricter. Direction is per key.
    
    So for a capability, direction must be justified. The analogue of "stricter" for the human check: **which shape makes fewer demands of the system?** `pull` = the runtime does nothing extra; the human comes. `push` = the runtime writes a row per card and the host must notify.
    
    **Decision: `pull` is narrower (fewer moving parts, nothing written, nobody interrupted).** I'll state the direction AND its reason explicitly in the D-row and in the code, so a reviewer can see the reasoning and argue with it. And I'll note the one honest consequence: a pack that narrows to `pull` accepts that cards wait for the human to come and look — which is the community's own call about its own operation.

    Hmm — hold on, wait. Let me reconsider ONE more time, because there's a much stronger argument available. Let me re-read the spec: "**The human check's existence is a floor.** Its *shape* is configurable — `push` (the runtime asks...) or `pull` (the human opens the inbox and the runtime interrupts nobody)."
    
    The check's EXISTENCE is the floor — both shapes have it. So narrowing is not about the check existing. It's about... hmm, "push" means the runtime ASKS. "pull" means the human OPENS.
    
    Think of it as: who bears the burden of noticing. `push`: the system carries the burden (writes rows, notifies). `pull`: the human carries it (must remember to check). Narrowing = shifting burden from the system to the human = the runtime does less. Yes — **`pull` is narrower**: the runtime does strictly less, and the check still exists.
    
    That's the cleanest statement: **narrowing = the runtime does less; the check itself is a floor that no shape removes.** And it matches "the runtime interrupts nobody" vs "the runtime asks". Locking it in.

4. **Enforcement points:**
   - **Runtime**: `runtime/src/capabilities.ts` — `parseCapabilities` currently handles the org block; I need a pack-tier parser + resolution. `resolveCapabilities({org, packCapabilities, humanSeats})`.
   - **Pack loader**: `runtime/src/pack.ts` — parse the pack's `capabilities:` block (a nested block, so the hand-rolled YAML reader needs a new function — `block()` handles `key:` + indented lines; a nested map under `capabilities:` needs a two-level reader). Note `org.ts` has `parseOrgCapabilityBlock` — "the two-level reader that refuses what it cannot read". Let me look at it and reuse.
   - **Validator**: `scripts/validate-pack.mjs` — new rules (PKG-64+) for the pack's capability block: unknown capability name, disabling word, missing reason, unknown field, widening.
   - **Schema**: `.kinship.schema.json` — add `capabilities`.
   - **Settings**: `runtime/src/settings.ts` — provenance row must say which tier decided.
   
5. **Tests:**
   - `runtime/test/capabilities.test.ts` — new cases (the pack narrowing, the widening refusal, the equal refusal, the no-org top tier, the provenance).
   - `scripts/validate-pack.test.mjs` — validator cases.
   
6. **Docs:**
   - `DECISIONS.md` — D113
   - `docs/PRD-KINSHIP-COMMUNITY-OPS-V0-2026-10-17.md` §14 — changelog row
   - `spec/GOVERNANCE-SPEC-OUTLINE.md` — §1.12 prose + Part 6 implementation map row
   - `AGENTS.md` — maybe the capability paragraph
   - `CHANGELOG.md` — Unreleased entry
   - `ROADMAP.md` — the #36 row? Hmm, ROADMAP has rows about gaps. #36 is an issue, not a roadmap row. Let me check if ROADMAP mentions the pack-level override. Hmm, the capabilities.ts comment says "a community's own pack-level override is a later slice". And settings.ts line 91-92 has the note text (a `notes` array — probably the "notes" shown in provenance/health). I'll need to update that note.

Let me now look at `org.ts`'s `parseOrgCapabilityBlock` and the `settings.ts` notes block, then start writing code.

Let me also check: how does `parseOrg` handle the two-level block? Let me read org.ts.

Let me get moving — I'll read org.ts's capability parser and the validator's relevant helpers.