# CONTEXT — the vocabulary of Kinship

**This file is a glossary and nothing else.** It defines the words this project uses, so that a
reader (or an agent) does not have to infer them from code or prose. It carries **no** design
decisions and **no** implementation detail — where a term's *semantics* are specified, that document
is named, and the specification is the authority, not this file.

**Two words this project deliberately does not use.** A **decision** is a row in the log, not a
meeting; a **card** is a proposal, not a task. And the words **pilot** and **phase** are load-bearing
history rather than current vocabulary — see the decision log for what replaced them.

---

## The chassis

**Action class** — the unit the ladder is written in. *"draft a reminder"* and *"post to a member"*
are classes, and every class carries its own ceiling. `spec/GOVERNANCE-SPEC-OUTLINE.md` §1.1, Part 5.

**Autonomy ladder** — the per-class ceiling on what the fleet may do without a human. It only ever
narrows: a class starts at `draft` and never at `auto`. §1.1.

**Pack** — a community's own declaration: its action classes, its ladder, its budgets, its agent
roster, and the answers it needs before it will boot. §1.10.

**Organisation** — the tier above a pack. It holds floors and a ceiling, and it may **refuse a pack
or fill a blank** — never replace a value the pack declared. §1.10.

**Agent role** — a named lane of action classes. Three ship: one for the schedule and the money, one
for the member-facing surface, one for flags. **A role is a name for a class map, not a process** — no
role is a thing with its own memory, and a pack may declare a different roster entirely.

**Human seat** — a name the organisation declares as belonging to a person who may act for it. It is a
**role, not a password**: an organisation may rename it. One seat by default; the set is the
organisation's declaration. §1.11.

**Card** — a proposal waiting on a human. §1.5.

**Verdict** — a human's decision on a card: *approve*, *edit*, or *reject*. A verdict without a
reason is not a record. §1.5.

**Decision** — the record of a verdict. It names the seat that decided and why, and it is a row in
the log like any other. §1.5.

**Revision** — the exact copy a card carries. An edit supersedes the revision, and the approval that
covered the old one does not carry over. §1.5.

**Authorisation** — the capability that permits **one send of one revision**. It is issued when a
card is approved, and consumed by the send it permitted. §1.5.

**Grant** — a scoped permission to act: **once**, or **always** with a named scope, and revocable. §1.8.

**Refusal** — a named rule that stopped something. A refusal is a **record**, not a crash, and it
names the rule that fired.

**Audit log** — append-only and replayable: the rows fold back to the state they describe, and a row
that has been tampered with does not fold. §1.2.

**Disclosure** — the identity line the fleet carries when it speaks. It is an action class, not a
setting, and it cannot be turned off. §2.5, §2.8.

---

## The community

**Member** — a person in the community, identified by a **ref** and never by name. §2.9.

**Suppression** — a member's "stop". It beats any grant, and it is cross-lane. §2.9.

**Quiet hours** — the member's own clock, in the member's own time zone. Not the community's. §2.9.

**Trust label** — how a piece of input is treated. A stranger's text arrives **wrapped, as data,
never as instruction**. §2.7.

**Coverage window** — the hours a human was on duty, and what waited past them. §2.13.

**Operating posture** — how a community says it is run. §2.15.

**Sanction ladder** — a community's own graduated consequences, written down as data. **The fleet
cannot climb it.** §2.12.

**Shatter-guard** — the freeze a complaint triggers, and the only human act that lifts it. §2.6.

---

## The two audiences

**Adopter** — somebody who vendors the control plane into their own project and depends on its
public surface.

**Host** — a process that owns the **clock**, the **store** and the **printing**, and that a
community runs. `spec/HOST-CONTRACT.md`.

**Seam** — one of the four things a host owns: **credential**, **clock**, **store**, **transport**.
`spec/HOST-CONTRACT.md`.

**Public surface** — the set of things a caller may depend on. `runtime/src/index.ts` is the
**adopter's** surface; the host contract names the seams a **host** relies on. **Two audiences, two
surfaces** — and the terms in this file are shared by both, which is why they are here.
