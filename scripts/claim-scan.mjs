/**
 * claim-scan.mjs — the claim ceiling, as code.
 *
 * PRD §2.3 "The claim ceiling" is the normative table: the left column is allowed in any copy, the
 * right column is forbidden in any copy. AGENTS.md invariant 3 states part of the same list in prose
 * and adds what §2.3 does not carry: three string bans (hours-saved, TAM, community size) and one
 * rule of its own.
 *
 * WHY THIS IS A MODULE AND NOT A CONSTANT INSIDE THE VALIDATOR: the list is a *claim about a
 * document*, and a claim that lives in one place but is checked in another is the drift class this
 * repo polices. `scripts/claims.test.mjs` reads PRD §2.3 and AGENTS.md and asserts that this file
 * accounts for every forbidden cell — so the list cannot quietly fall behind the documents it
 * claims to enforce, and the documents cannot quietly grow a ban the gate does not know about.
 *
 * TWO KINDS OF FORBIDDEN THING, and the difference is not cosmetic:
 *
 *   - a **string** ban ("fully autonomous") is a phrase that copy can assert, so a sweep can
 *     enforce it. These live in `BANNED_CLAIMS`.
 *   - a **rule** ban ("any competitor size/adoption number before [n] lands") is a judgement no
 *     sweep can make, because the threshold is a fact only a person holds. These live in
 *     `CLAIM_RULES`, and the gate does not pretend to enforce them — it names them, and the
 *     contract test asserts that every forbidden cell in §2.3 is accounted for in one list or the
 *     other. A ban that lands in the PRD and in neither list is a build failure, not a silent gap.
 *
 * CITATION vs ASSERTION. A document is allowed to *name* a banned phrase in order to forbid it —
 * the pack's own PACK.md writes `"runs itself."` precisely to say that phrase is banned copy. So a
 * phrase inside a code span, or inside a double-quoted span in prose, is a citation: it is removed
 * before the scan.
 *
 * A CITATION IS A SPAN WITHIN ONE PARAGRAPH, and it must be opened like a quotation. The first
 * version of this rule paired quote marks across the whole document, which meant a quotation that
 * opened in one paragraph and closed in another swallowed everything between — including a claim,
 * and including prose the author never quoted. One stray quote mark was enough to hide a paragraph.
 * The span is now confined to its paragraph, and an opening quote must follow whitespace or an
 * opening bracket, so `5"` (a measurement, a typo) cannot open one. The pack's own citation wraps
 * across two lines *inside* one paragraph, and it is still a citation — the fix is the scope, not
 * the exemption.
 *
 * That rule is a **prose convention and does not travel into a data file**. In YAML and JSON a
 * double quote is a delimiter, not a quotation, so `notes: "fully autonomous community
 * management"` is a value the pack declares, and a declared value is an assertion. Hence
 * `stripCitations` takes the file's kind. Before this rule existed, that one line of YAML was a
 * hole a fork could put its claim through, while the pack's own prose — quoted the same way —
 * was correctly read as a citation.
 *
 * WHAT THIS STILL DOES NOT CATCH, stated here rather than left to be found later: a banned phrase
 * inside a double-quoted span of *prose* is still a citation, so a sentence that quotes the claim
 * in order to assert it slips past. The trade-off is deliberate and old — a rule that fires on the
 * repo's own ban list gets switched off, and "a decorative rule is worse than none because it
 * claims a boundary it does not hold" (the reasoning PKG-57 states for its own design). The
 * honest form of the rule is therefore narrow, and the limit ships inside the artefact.
 */

/**
 * The strings §2.3 and AGENTS.md invariant 3 forbid in any copy. `source` says where each one is
 * written, so a reviewer can check this list against the documents rather than trust it.
 *
 * Every pattern is word-bounded on purpose: `tam` must not match "tamper", and "community size"
 * must match "community sizes" without matching a larger word.
 *
 * `traces` is how an entry proves it belongs: the forms in which it appears in PRD §2.3 or
 * AGENTS.md. It is usually the phrase itself, but §2.3 row 4 writes one span with a shared
 * prefix — "Members will feel more valued / more engaged" — so that entry traces through both of
 * its halves rather than through a phrase the PRD never wrote.
 */
export const BANNED_CLAIMS = [
  { phrase: 'replace your community manager', re: /\b(replace your community manager)\b/i, traces: ['replace your community manager'], source: 'PRD §2.3 row 1' },
  { phrase: 'fully autonomous', re: /\b(fully autonomous)\b/i, traces: ['fully autonomous'], source: 'PRD §2.3 row 2' },
  { phrase: 'autonomous 24/7', re: /\b(autonomous 24\/7)\b/i, traces: ['autonomous 24/7'], source: 'PRD §2.3 row 2' },
  { phrase: '24/7 management', re: /\b(24\/7 management)\b/i, traces: ['24/7 management'], source: 'PRD §2.3 row 2' },
  { phrase: 'we run your events', re: /\b(we run your events)\b/i, traces: ['we run your events'], source: 'PRD §2.3 row 2' },
  { phrase: 'we send your reminders', re: /\b(we send your reminders)\b/i, traces: ['we send your reminders'], source: 'PRD §2.3 row 2' },
  {
    // §2.3 row 4 writes one span with a shared prefix — "Members will feel more valued / more
    // engaged" — so the entry is one claim with two readings, not two claims.
    phrase: 'members will feel more valued / more engaged',
    re: /\b(members will feel more (?:valued|engaged))\b/i,
    traces: ['members will feel more valued / more engaged'],
    source: 'PRD §2.3 row 4',
  },
  {
    // §2.3 row 5 is one sentence with a shared prefix: "We invented approvals / budgets /
    // heartbeats / audit trails." Four mechanisms, one way of claiming them.
    phrase: 'we invented approvals / budgets / heartbeats / audit trails',
    re: /\b(we invented (?:approvals|budgets|heartbeats|audit trails))\b/i,
    traces: ['we invented approvals / budgets / heartbeats / audit trails'],
    source: 'PRD §2.3 row 5',
  },
  { phrase: 'runs itself', re: /\b(runs itself)\b/i, traces: ['runs itself'], source: 'AGENTS.md invariant 3' },
  { phrase: 'hours saved', re: /\b(hours[-\s]saved)\b/i, traces: ['hours saved'], source: 'AGENTS.md invariant 3' },
  { phrase: 'community size', re: /\b(community sizes?)\b/i, traces: ['community size'], source: 'AGENTS.md invariant 3' },
  { phrase: 'tam', re: /\b(tam)\b/i, traces: ['tam'], source: 'AGENTS.md invariant 3' },
];

/**
 * The forbidden things §2.3 and AGENTS.md state as rules rather than as strings. A sweep cannot
 * enforce these, and the gate says so instead of pretending otherwise.
 */
export const CLAIM_RULES = [
  {
    phrase: 'any competitor size/adoption number before [n] lands',
    source: 'PRD §2.3 row 3',
    note: 'the threshold is literally unset — `[n]` is a placeholder no one has filled. A sweep cannot enforce a number that was never written down, so this is named and left open for the owner.',
  },
  {
    phrase: 'any price that was not read from the vendor on the day it was printed',
    source: 'AGENTS.md invariant 3',
    note: 'a dated-fact rule, not a string. It is kept honest by the evidence ledger, not by a sweep.',
  },
];

/** Case-folded and punctuation-collapsed, so "hours-saved" and "hours saved" compare equal. */
export const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** True when the file is prose, where a double quote is a quotation rather than a delimiter. */
export const isProse = (rel) => /\.md$/i.test(rel);

/** Remove the spans that count as citations: code spans everywhere, double-quoted spans in prose. */
export function stripCitations(text, { prose = true } = {}) {
  // Paragraph by paragraph, and never across a paragraph break. A quotation in copy is a phrase
  // inside one paragraph — the pack's own PACK.md wraps "we run your events / we send your
  // reminders" across two lines, and that must stay a citation. A span that reached further
  // would hide every paragraph between two quotes, including a claim, and including text the
  // author never quoted.
  const parts = text.split(/(\n\s*\n+)/);
  return parts
    .map((part, i) => (i % 2 === 1 ? part : stripParagraphCitations(part, prose)))
    .join('');
}

function stripParagraphCitations(paragraph, prose) {
  const withoutCode = paragraph.replace(/`[^`]*`/g, ' ');
  if (!prose) return withoutCode;
  let out = '';
  let i = 0;
  while (i < withoutCode.length) {
    const ch = withoutCode[i];
    // An opening quote is preceded by whitespace, the start of the paragraph, or an opening
    // bracket. Otherwise `5"` — a measurement, a typo — would open a span and hide the rest of
    // the paragraph, which is a way to say anything without saying it.
    if (ch === '"' && (i === 0 || /[\s([{]/.test(withoutCode[i - 1]))) {
      const close = withoutCode.indexOf('"', i + 1);
      if (close !== -1) {
        out += ' ';
        i = close + 1;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Every banned claim this text asserts, named as it was actually written. Citations are removed
 * first, so a document may name a banned phrase in order to forbid it — that is the whole point of
 * a ceiling.
 */
export function scanForClaims(text, { prose = true } = {}) {
  const asserted = stripCitations(text, { prose });
  const hits = [];
  for (const c of BANNED_CLAIMS) {
    const m = asserted.match(c.re);
    if (m) hits.push(m[1] ?? m[0]);
  }
  return hits;
}
