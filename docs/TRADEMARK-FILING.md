# Filing the Kinship mark — the preparation

**Date:** 2026-10-24 · **Status:** prepared, **not filed**. See "What I could not do" at the bottom.

**Why this file exists.** D66 established the shape of the problem: **a licence grants rights in the
code and says nothing about the name.** MIT and Apache-2.0 are the same on this point. So a third party
can publish a "Kinship" tomorrow, and the only instrument that stops the confusion is the mark itself.
D75 records the decision to file; this file is the material the filing needs, so that when Filbert
instructs an attorney (or files himself), nothing has to be reconstructed.

---

## 1. The mark

| | |
|---|---|
| **Word mark** | **KINSHIP** (standard characters, uppercase) |
| **Design mark** | the two interlocking rings — `packs/../assets/kinship-mark.svg`, 512px PNG at `assets/kinship-mark.png` |
| **Namespace** | `kinshipai/…` — the pack-key namespace. It is a mark in its own right, and it is the one that matters most technically: a pack's key says who published it. |
| **Package names** | `kinship-runtime` on npm (checked free on 2026-10-24 — `kinship` itself is **taken** by an unrelated multiple-inheritance system, with several `kinship-graph` packages beside it, so the unscoped runtime name is the distinctive one) |

**The mark is black on white, one colour, no type.** The rings are strokes, so the mark is legible at
16px, at 512px, in one colour, on light and dark. That is deliberate: a mark that only works in one
place is a picture, not a mark.

---

## 2. What is being protected, and what is not

**Protected:** the name KINSHIP for the governance control plane; the `kinshipai/…` namespace; the
`kinship-runtime` package name.

**Not protected, and not attempted:** the ideas. A governance core for community agents is not
patentable in any useful way, and the repository's position (D19, D72) is that the licence governs
the code and the mark governs the name.

**The name collision is real and is the reason the descriptor exists.** The project is consistently
presented as **"Kinship — open-source supervised AI agents for community operations"**, and the
descriptor is in the README, the npm description, the `package.json` and the release notes. That is
the practical mitigation for a common word, and it is why the mark is worth registering rather than
merely asserted.

---

## 3. The goods and services (Nice classification)

| Class | For | Covers |
|---|---|---|
| **42** | scientific, nautical, surveying, photographic, optical, weighing, measuring, signalling, supervision, life-saving and navigational apparatus; laboratory apparatus and instruments; optical apparatus; weighing, measuring, signalling and checking (supervision) apparatus and instruments; apparatus for recording, transmission or reproduction of sound or images; **data processing apparatus; computers; computer hardware; computer software** | the runtime, the pack format, the tooling, the MCP server |
| **45** | legal services | **only if** the project ever offers a service described as legal or compliance advice. **Today it does not** — it is a control plane, and it makes no claim about legal compliance. **So 45 is NOT claimed, and claiming it would be exactly the kind of over-claim this repository's own ceiling forbids.** |

**Note on SaaS:** software-as-a-service is not a separate class; it is filed in the class of the
underlying good or service. So a hosted Kinship would sit in class 42 as well, and the hosted surface
stays inside the same mark.

**The specimen.** A filing needs a specimen — how the mark appears in commerce. The strongest one
available today is the **README's first screen** (the mark, the name, the descriptor) together with
the npm package page. A screenshot of the README's header plus the 512px PNG is enough for an
electronic specimen in most jurisdictions; a printed business card bearing the mark and the URL is
safer where an electronic specimen is refused.

---

## 4. The jurisdictions, and what each costs roughly

| Jurisdiction | Why it might be needed | Rough cost | Time |
|---|---|---|---|
| **Indonesia (DJKI)** | Filbert's base, the community the project serves, and the Indonesia-first design | IDR 3–5 million per class (as at 2026, for a small business) | ~3–6 months |
| **United States (USPTO)** | the npm audience, the likely contributors, the AI-agent market | ~$350–600 per class with a lawyer, ~$250 self-file with TEAS | ~6–12 months to grant |
| **European Union (EUIPO)** | one filing covers the EU; the OpenClaw/Hermes/Cursor audience is largely EU | ~€850 for the EUIPO for a small business, ~€1,450 for a full 11-class filing | ~4–9 months |
| **United Kingdom (UKIPO)** | cheap, fast, and the UK is where much of the AI-agent tooling is built | ~£200 self-file for one class | ~6–10 months |

**The minimum that is worth doing:** **Indonesia and the United States**, class 42, word mark first.
The word mark is cheaper, faster, and covers the thing that actually gets confused (the name). The
design mark can follow.

---

## 5. What I could NOT do, and why

**I did not file anything.** A trademark application is a legal filing: it needs an applicant, a
jurisdiction, a payment, and in most jurisdictions a declaration that the mark is not already in use
for those goods. **I cannot make that declaration for you, and I would not want to make it by
proxy.** What I have done is everything up to that point: the mark exists as clean vector art, the
name has been checked for collisions, the goods list is written, the specimens are identified, and the
cost and timeline are above.

**And the honest caveat stays in `TRADEMARKS.md`: until the application is filed, that file is a
statement of intent and a notice, not an enforceable claim.** A notice is still worth having — it is
the evidence of intent that a later registration leans on — but the repository should not claim a
registered mark before one exists.

---

## 6. The next step, in one line

**Instruct a trademark attorney with section 1 (the mark), section 3 (class 42), and section 4
(Indonesia + US) — or file the word mark yourself in Indonesia first, because it is the cheapest
registration that covers the community this project actually serves.**
