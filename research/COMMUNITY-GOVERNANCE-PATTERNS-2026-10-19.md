# How an ordinary community governs itself — and what that model asks of this system

**Status:** desk research, added 2026-10-19. It decides nothing and creates no requirement. If any row in
§6 becomes a requirement, the vehicle is a dated `DECISIONS.md` row plus a PRD FR — not an edit to this file.

**Method.** Three dated external reads (§9) on how human communities actually hold themselves together:
Ostrom's design principles for commons governance, McMillan & Chavis's four elements of sense of community,
and the participation-inequality finding. Each principle is then checked against this repo as it exists on
disk today, by file and line — not against the spec's intentions. Where the check was a computation, the
command is printed (§8).

**Claim ceiling, stated before anything else.** This is a *model applied to a design*, not evidence about a
community. Primary research is still zero (`PRD … §7`, honesty-contract item 3): no kopdar member, no
AIClub chapter officer, and no community moderator has been interviewed or observed. So nothing in §4 or §6
may be cited externally as demand. It is a checklist for whether the governance core matches the way groups
of people actually work, and the honest output of that check is a list of gaps.

---

## 1. The distilled answer: what a working community actually does

Reading the three sources against each other, a community that survives does six things, and **enforcement is
the rarest of them**. The literature on commons governance is mostly about the other five; the reason
rule-by-AI tooling feels wrong in a group chat is that it automates the sixth thing while skipping the first
five.

1. **It knows who is in.** A boundary exists and is legible to members — who counts as one of us, and what
   being in costs. (Ostrom: actor-group boundary clarity. McMillan: membership / "Spirit", including
   boundaries that "distinguish members from nonmembers", plus emotional safety.)
2. **The ruled wrote the rules.** Rules that come from outside the group decay; rules the group authored are
   self-enforcing. (Ostrom: participation in rule making, proportionality of costs and benefits, external
   recognition of the group's own right to organize.)
3. **Members watch each other, lightly.** Monitoring is mostly peers noticing, not an authority auditing.
   (Ostrom: self-monitoring; the environmental-monitoring half is where outside data enters.)
4. **Responses escalate in steps, and the first steps are informal.** A word, then a private word, then a
   public correction, then removal — with removal rare and regretted. (Ostrom: graduated/self sanctions;
   conflict resolution as its own principle.)
5. **The person who accuses does not adjudicate.** Where a community gets this wrong it stops being a
   community quickly. (Ostrom: conflict resolution. McMillan: "an authority structure that can be trusted".)
6. **Belonging is produced by shared time, not by rules.** Rituals, in-jokes, a first welcome, someone
   noticing you left. (McMillan: integration and fulfilment of needs / "Trade", shared emotional connection /
   "Art"; influence as reciprocal, "Trust".)

And one asymmetry every organiser lives with: participation is unequal by a large margin — the 1% rule as
popularised by McConnell and Huba, Nielsen's 2006 formulation of participation inequality, with the standard
caveat that the actual ratio depends on the subject. Roughly: most people consume, a few edit, very few
create. A tool that optimises the loud 1% while adding load for the 90% has mis-read its own user.

---

## 2. Mapping: mechanism → what this repo has → verdict

| Community mechanism | What exists here, by file and line | Verdict |
|---|---|---|
| **1. Boundary: who is in** | `runtime/src/members.ts:37` — `assertContactable` refuses `suppression_unknown`: "Unknown ≠ clear: fail closed is the whole point (§2.9)". A member with no row is held, not assumed. Stranger text is quarantined separately (`containment.ts:36`, spec §2.7). | **Holds, and stricter than a normal community.** Most groups have a fuzzy boundary; this one refuses to act on an unknown identity at all. |
| **2. The ruled wrote the rules** | The pack *is* locally-authored law: `packs/kopdar-ops/.kinship.yaml` carries **30** guardrail keys (recompute: §8), and `needs:` (8 entries) boot-refuses unless the community answers in its own names (`pack.ts:164-186`, tour guarantee `boot_requires_all_needs`). The org tier cannot rewrite a declared community number — `settings.ts:115` refuses instead of clamping; `LIMITS` line 17 states the org "can never change a value a community declared". | **Half holds.** Authorship sits with the **organiser**, not the members. Ostrom's "participation in rule making" has no analogue: no member has any hand on any rule. This is the same asymmetry `community/MEMBER-LENS-2026-10-17.md` found at v0.5 — that pass fixed the member as a *subject*, not as a *party*. |
| **3. Members watch each other, lightly** | `health()` (`health.ts:188-201`) counts rows per agent and names `active` / `watch` / `retire`; `inbox()` lists what a human owes; replay reproduces state (§1.2). | **Partial, and pointed the wrong way.** Every count is of **the fleet**, by design (the runtime may not score members). Peer-level watching — members noticing an organiser is overwhelmed — has no artefact, because it would need sentiment, which `health.ts:206-210` deliberately lists as `unmeasured` and PRD **Q13** leaves unbuilt. |
| **4. Graduated response** | Absent, and named: `scripts/validate-pack.mjs:77` `FORBIDDEN_ACTIONS` (delete, ban, mute, kick, restrict, remove-message, unsend); `spec/GOVERNANCE-SPEC-OUTLINE.md:626` lists `moderation.delete` / `moderation.ban` as absent-not-denied; and `skills/flag-notice/SKILL.md:20` says the notice "is not an appeal verdict, **a warning**, or a negotiation". | **Deliberately absent — with a hole.** No rung may be *executed* by the fleet, which is right. But nothing can *record* a rung a human took in the channel, so the system models a community with no sanctions at all rather than one whose sanctions are human. Same gap as `moderation.outcome`, named 2026-10-19. |
| **5. Accuser ≠ judge** | `skills/member-rights/SKILL.md:35` and `skills/flag-notice/SKILL.md:22`: the member's reply becomes a `flag_appeal` card in the same queue, and "the agent that raised the flag may not resolve that appeal" — the same restriction FR-1.6 puts on approvals. `spec:497` requires the notice to carry the reason and the deciding human. | **Holds.** This is the principle most real communities fail, and it is encoded here as a refusal with a test behind it. |
| **6. Belonging / shared time** | Nothing, and one deliberate boundary: `packs/kopdar-ops/PACK.md:118,133` leaves welcome messages, role assignment, and AutoMod keyword flags to the tools that already do them — the posture is additive. The event lifecycle models the **event**, not the **person's arrival**. | **Absent by choice.** Kinship can see the boundary (a member row) and cannot see belonging. The honest statement of that is already in `health().unmeasured`; the honest addition is a `needs:` question, not a feature (§6c). |
| **Asymmetry of participation** | `guardrails.digest_sources_are_consent_scoped` (FR-5.7) and `member_message_cap_per_24h: 2` (FR-5.5) protect the silent majority from being described and from being addressed. `report_aggregation_floor: 10` with `external_reports_aggregate_only` (FR-5.3). | **Holds unusually well.** Most community tooling optimises the 1% that posts; two of these three guardrails exist to protect the 90% that do not. |

## 3. Three places this system is already stricter than an ordinary community

Worth stating plainly, because the point of applying the model was not only to find gaps:

- **Promises are enumerable and revocable.** A normal community's implicit rules ("we don't post promos
  here") cannot be listed, counted, or switched off by the person they constrain. `allow_once` /
  `allow_always` / `deny` with a named scope and one-tap revocation (§1.8) is a genuinely better artifact
  than a norm, and it is the part worth pitching.
- **A member's stop beats any grant.** `suppression_precedence: member-over-organiser` (`.kinship.yaml:96`)
  is the reverse of the usual power curve in a volunteer community, where the organiser's intent outranks a
  member's objection.
- **Nobody gets ranked.** `score.member`, `member.opt-out-override`, `report.name-a-member` are on the
  structurally-absent list and checked by tamper cases (FR-5.8). Communities do develop informal status
  hierarchies; this system refuses to formalise one, which is the correct call while the sponsor pressure
  in PRD §12's reasoning is real.

## 4. What the model exposes as the actual design risk

The core is a **refusal machine** pointed at a **norms machine**. Every primitive it has answers "what may
the fleet not do", and a community runs on "what do we do here". That is not a defect — refusals are the part
that survives contact with a volunteer organiser and a sponsor — but it means the fleet's model of a
community is a population of inboxes plus one author. The two things a real community has that this repo has
no vocabulary for are **a volunteer who is neither organiser nor member-in-good-standing** (a moderator with
duties but no seat; PRD §12-Q12 is exactly this question, still unratified) and **a newcomer** (someone who
is inside the boundary but has no history in the log — and today, per `assertContactable`, someone the fleet
may not contact at all until a row is written; the fail-closed rule is right, and the *arrival* moment is
unmodelled).

## 5. The three cheapest faithful additions

Ranked by how little they cost and how much of the model they close. **None is built, none is a requirement,
and (c) is the only one that is doc-and-validator-only.** All three are his call.

**(a) Record the human's rung — `moderation.outcome`.** One append-only, seat-gated event: who acted, on whom,
which rung, with a reason. No tool ships for it, so invariant #2 holds and `FORBIDDEN_ACTIONS` stays intact.
Read sides keep counting only, never refs, the way `health()` and `inbox()` already sweep member identifiers.

**(b) Declare the ladder without owning it — `sanction_ladder:`.** A pack lists its rungs as data
(`nudge → private word → public correction → removal`), each naming *who* acts and *what the member is told*.
The validator can check the shape (every rung names a human, the last rung names the appeal path) and the
runtime can check that the ladder never appears in any `tools:` list — so the ladder is community-authored and
fleet-unreachable at the same time. This is the cheapest real answer to "graduated sanctions" without
crossing into "automated moderation".

**(c) Ask the anti-generic question about arrival.** `needs:` is this repo's own mechanism for refusing to
invent a community's shape (8 entries, `need_unanswered` at boot). Adding a ninth — how a newcomer is
introduced and who vouches — costs one list entry, one validator count, and one tour line, and it puts the
one thing the system cannot see into the file the organiser must answer. Counts move; every count in the docs
gets recomputed, not restated.

## 6. What stays absent even after applying this model

The model does not license any of these, and each has a gate or a decision that already refuses it:

- ❌ Any member score, karma, leaderboard, or reputation rank — FR-5.8, structurally absent, tamper-tested.
- ❌ Sentiment, morale, churn, or a "community health" number — `health().unmeasured`, PRD **Q13**.
- ❌ Fleet-executed moderation of any kind — `FORBIDDEN_ACTIONS`, D13's basis, two tour guarantees.
- ❌ A member vote or governance mechanism invented from this analysis — no dated event (D9) has ever asked
  for one, and §12-Q12 is the owner's ruling, not a design detail.
- ❌ Automating the norm layer (welcome bots, role assignment, keyword filters) — `PACK.md:133` keeps the
  additive posture; those tools already exist and the pack says so.

## 7. Recompute, don't restate

```bash
# guardrail keys declared in the seed pack (the 30 in §2)
node -e "const fs=require('fs');const m=fs.readFileSync('packs/kopdar-ops/.kinship.yaml','utf8').split('\n');\
const i=m.findIndex(l=>/^guardrails:/.test(l));let j=i+1,n=0;while(j<m.length&&!/^\S/.test(m[j])){if(/^\s{2}\w/.test(m[j]))n++;j++}console.log(n)"
# the absent-not-denied vocabulary (FORBIDDEN_ACTIONS)
grep -n "FORBIDDEN_ACTIONS" scripts/validate-pack.mjs
# what the runtime refuses to measure
grep -n "unmeasured" runtime/src/health.ts
# nothing in this file changed code, so the four gates must read as before
node scripts/gates.mjs
```

## 8. Sources, dated

- Ostrom design principles, as categorised by the Social-Ecological Systems Meta-Analysis Database (Dartmouth)
  — read 2026-10-19: <https://sesmad.dartmouth.edu/theories/54>. It records the original **eight** guidelines,
  a 2010 evaluation expanding them to **ten**, and the database's **eleven** variable types, with the caveat
  that "these concepts operate independently without a singular storyline" — so they are a checklist, not a
  theory with one causal chain. The names used in §1 are as that page spells them.
- Sense of community — McMillan & Chavis (1986) four elements, with the author's own later renaming to
  Spirit / Trust / Trade / Art: <https://www.drdavidmcmillan.com/sense-of-community/sense-of-community>, read
  2026-10-19.
- Participation inequality — Nielsen, dated 2006-10-09 on the article's own account:
  <https://en.wikipedia.org/wiki/Participation_inequality> (read 2026-10-19; the page names the concept but not
  the ratio), and the 1% rule / 90-9-1 variant, attributed there to Ben McConnell and Jackie Huba, with the
  caveat that "actual percentage is likely to vary depending upon the subject":
  <https://en.wikipedia.org/wiki/1%25_rule_(Internet_culture)> (read 2026-10-19). **No ratio in this file is a
  figure about any community, and none may be used in copy.**

Internal line references: `runtime/src/{members,settings,health,pack,containment}.ts`,
`scripts/validate-pack.mjs`, `spec/GOVERNANCE-SPEC-OUTLINE.md`, `packs/kopdar-ops/{.kinship.yaml,PACK.md,skills/*}`,
`DECISIONS.md` D13 / D15 / D21 / D35 / D36.
