# Event template study — what a good one contains, and why (2026-10-24)

> **Date:** 2026-10-24 · **Status:** a fact-finding note, not a decision.
>
> **Why this file exists.** The owner asked (2026-10-24) how to make a good event template, after
> deciding that shadow mode is retired and the project becomes production-ready and self-hostable.
> The existing template lives at `pilots/shadow-mode/EVENT-TEMPLATE.md` and the machine-readable form
> is the community's own plan file (`packs/kopdar-ops/pack.local.plan.example.yaml`).

## 1. The two forms, and why there are two

The template a human writes and the plan the runtime reads are **the same document in two forms**:

- the **plan file** (`pack.local.plan.yaml`) — `templates:` (the copy, per lane) and `event:` (the
  next event's facts). It is the runtime's input.
- the **event template** (`event-<slug>.md`) — the *worksheet* a human fills in, which becomes the
  plan file.

The template that exists today is not a form to fill out and hand over. It is a **worksheet with four
sections**, and each one exists because something in the code or the policy needs it.

## 2. What the code requires — the parser's refusals, which are decisions

From `runtime/src/plan.ts` (the community plan parse gate):

| refusal | what it protects |
|---|---|
| *"a member names no `ref` — a member without a reference cannot be protected"* | a member who cannot be protected is not a member |
| *"a template names no `action_class` — a lane with no class is not a lane"* | copy written for a lane nobody holds has no owner |
| *"a template for `actionClass` names no `phase` — a copy with no phase has no moment to belong to"* | a copy with no moment has no schedule |
| *"a template names no `agent` — a copy with no author has nobody to hold it"* | the agent that would send it must be named |
| *"a template for `actionClass` carries no `copy` — a lane with no words is not a lane"* | the runtime never invents copy |
| a slot with no value refuses the whole template | *"a message with a hole in it goes out with the hole, so it does not go out"* |

**Every required field is a refusal first.** The template's job is to make those refusals impossible
to hit by accident.

## 3. What the template must NOT carry

From the spec and the pack format (`spec/GOVERNANCE-SPEC-OUTLINE.md`, `rules/pack-format.mdc`,
`scripts/validate-pack.mjs`):

- **No model and no key.** The runtime has no network code at all; a pack may not contain a provider
  credential (PKG-57).
- **No transport.** A pack declares lanes, never channels.
- **No identifier for a member.** The log holds member references, never message text or a member's
  phone number.
- **No number without a source.** Section 2.11 requires a partner claim to cite a source the
  organiser named. **This is not built** — open issue #6 records that an unsourced number can still
  draft today — and it is the clearest example of a rule the template should make *easy* to satisfy.
- **No second human seat.** An org declaring more than one seat is refused at parse time; that is
  Q12's question and it is not the template's to answer.

## 4. What the platforms' own templates all insist on

Every mainstream event platform asks for the same small set, and Kinship's template already asks for
all of it: **a name and edition · a date (E-day) · a format (offline / online / hybrid) · a venue or
platform · expected attendance · the community's channels · sponsors (explicitly "none" rather than
fabricated) · a human escalation contact**.

Two of those are governance, not logistics:

- **the escalation contact** — a human being, and the WhatsApp policy's "clear escalation path";
- **the fleet config used, at a version** — so a log row can be read back against the pack that
  produced it.

## 5. What the existing template has that a template normally lacks

The template on disk today is better than a platform form, and the reason is worth keeping:

- **The baseline section** asks what the community does *manually* — promo, reminders, day-of, recap —
  and asks for the honest hands-on time, with the instruction *"record as estimate; do not publish as
  a saving"*. **The comparison is against your own manual baseline, not against an abstract "before
  AI".**
- **It names its own kill condition**: *"Time to complete on a real event: under 20 minutes spread
  across the week. If it takes longer than that, the fleet is adding load rather than removing it."*
- **The card log keeps the "why" column** — *"a reject without a reason is a lost finding"* — which
  is the same refusal the runtime makes (`verdict_without_why`).

## 6. What the template should contain

**Required** (each one is a refusal the parser makes):

1. **The event facts** — name/edition, E-day, format, venue or platform, expected attendance,
   channels, sponsors (or "none"), escalation contact (a human), the pack version in force.
2. **The lanes** — for each: the action class, the agent that holds it, the copy per declared
   language, and the moment it belongs to.
3. **The slots** — every `{name}` the copy uses, and where its value comes from (an event fact, the
   community's name, the event's local time, or `{disclosure}`). **An unfilled slot refuses the whole
   template**, so the author should be able to see the hole before the runtime finds it.
4. **The disclosure line** — the runtime's canonical line per language, which the author does not
   write.

**Optional but valuable:** the manual baseline, the honest cost estimate, and the autonomy level per
lane (all `draft` unless a prior run licensed otherwise, and the exception names the run that
licensed it).

**Must be absent:** models, keys, transports, member identifiers, unsourced numbers, a second seat.

**The three questions the template should force its author to answer:**

1. **Who is the human, and how do they approve?** (the escalation contact, and *how* — the Discord
   policy wants the permission mechanism to be clearly labelled and apparent)
2. **What is this community doing by hand today, and how long does it take?** (the baseline — the
   only comparison that means anything)
3. **What must never be sent without a human reading it first?** (the lanes, the autonomy level per
   lane, and the escalation)

## 7. What this study did not do

It did not write the new template, did not rename or move `pilots/shadow-mode/`, and did not decide
the phase question (the owner decided on 2026-10-24 that there is one phase and everything is live
— which makes the `phase:` field a candidate for removal, and that decision is not this file's to
make). It did not check the platform-side template *approval* workflows for WhatsApp, which are a
separate, slower process and are covered in `TRANSPORT-TERMS-STUDY-2026-10-24.md`.
