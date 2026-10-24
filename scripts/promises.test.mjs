/**
 * promises.test.mjs — a document must not describe another document in the past tense.
 *
 *   node --test scripts/promises.test.mjs
 *
 * **WHY THIS FILE EXISTS.** `ROADMAP.md` carried a row saying `SECURITY.md` "promises triage
 * within 3 business days". It had not promised that for a while: commit `478ee48` (D76) changed
 * the wording to an **acknowledgement**, best effort, with the capacity named — and the roadmap
 * row was not touched. So the file whose whole job is to tell a stranger *"what is missing?"*
 * was describing a live document in the past tense, and asking the owner to decide something the
 * security policy had already decided.
 *
 * That is the same defect class as D83 and D84 — **a claim nothing checks rots** — and the same
 * class as the licence drift, except this time the stale claimant was the gap list itself. The
 * review that found the licence problem found this one from the outside: *"a project whose thesis
 * is don't trust prose, trust the check"* has a prose description of its own security policy that
 * nobody compared with the policy.
 *
 * **THE SHAPE.** `SECURITY.md` is authoritative — it is the document a reader trusts about a
 * security report. The roadmap describes it. So the description is checked against the document,
 * not against a hand-written list of what the description is allowed to say: the commitment kind
 * (an acknowledgement, not a triage) and the number (3 business days) are both **read out of
 * `SECURITY.md`**. Change the policy and the roadmap fails until it catches up; change the
 * roadmap to over-promise and it fails immediately.
 *
 * This is the first promise this file holds. The shape generalises — a repository that publishes
 * commitments has to be able to check that the documents describing them still match.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Does this text **claim** a word, rather than deny it or quote it?
 *
 * "promises triage within 3 business days" claims a triage. "not a triage, not a fix" denies one,
 * and a check that cannot tell those apart is a check that fires on the honest sentence. A word in
 * quotation marks is a **citation** — the same rule the claim ceiling uses for a quoted span — so
 * a row that quotes the wording it is describing does not thereby claim it.
 */
export function claimsWord(text, word) {
  const re = new RegExp(`\\b${word}\\w*\\b`, 'gi');
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    const before = text.slice(Math.max(0, m.index - 48), m.index);
    const beforeLower = before.toLowerCase();
    if (/\b(not|no|never|rather than|instead of|without|neither|nor)\b[^.;|]*$/.test(beforeLower)) continue; // denied
    const quotes = (before.match(/["`]/g) ?? []).length;
    if (quotes % 2 === 1) continue; // cited, not claimed
    return true;
  }
  return false;
}

/**
 * How `ROADMAP.md` describes the security response time, compared with what `SECURITY.md` says.
 *
 * Returns a list of problems — empty when the two agree.
 */
export function promiseDrift(securityText, roadmapText) {
  const problems = [];

  // What the policy actually promises. It is the authority; the description is checked against it.
  const commitment = /Acknowledged within (\d+) business days/i.exec(securityText);
  if (!commitment) {
    problems.push('SECURITY.md states no acknowledgement window — the policy no longer promises a response time at all');
    return problems;
  }
  const days = commitment[1];

  // The roadmap's row about it.
  const row = roadmapText
    .split('\n')
    .find((l) => l.startsWith('|') && l.includes('SECURITY.md') && /business days|response time|SLA|acknowledg/i.test(l));
  if (!row) {
    problems.push('ROADMAP.md has no row describing the security response time');
    return problems;
  }

  // 1. The commitment kind. The policy promises an acknowledgement, which is the weaker promise;
  //    a description that claims a triage or a fix is claiming something the policy does not make.
  if (!claimsWord(row, 'acknowledg')) {
    problems.push('ROADMAP.md does not name the commitment SECURITY.md makes (an acknowledgement)');
  }
  for (const stronger of ['triage', 'fix', 'resol']) {
    if (claimsWord(row, stronger)) {
      problems.push(`ROADMAP.md claims a ${stronger === 'resol' ? 'resolution' : stronger}; SECURITY.md promises an acknowledgement`);
    }
  }

  // 2. The number. Two documents quoting a response time must quote the same one.
  const quoted = /\b(\d+)\s+business days/.exec(row);
  if (!quoted) {
    problems.push('ROADMAP.md describes the response time without stating the number SECURITY.md states');
  } else if (quoted[1] !== days) {
    problems.push(`ROADMAP.md says ${quoted[1]} business days; SECURITY.md says ${days}`);
  }

  return problems;
}

test('ROADMAP.md describes the security response time the way SECURITY.md promises it', () => {
  const problems = promiseDrift(read('SECURITY.md'), read('ROADMAP.md'));
  assert.deepEqual(
    problems,
    [],
    `the roadmap and the security policy disagree:\n  ${problems.join('\n  ')}`,
  );
});

test('the policy still states a response time, and the roadmap still describes it', () => {
  // Both halves, because a check that passes because a document was deleted is not a check.
  const security = read('SECURITY.md');
  const roadmap = read('ROADMAP.md');
  assert.match(security, /Acknowledged within \d+ business days/i, 'SECURITY.md states the window it promises');
  assert.match(roadmap, /SECURITY\.md/, 'the roadmap still has a row about the security policy');
  assert.match(security, /one maintainer/i, 'the policy names the capacity it makes the promise with');
});

test('POSITIVE CONTROL: the old wording — "promises triage" — is caught', () => {
  // The defect this file exists for: the roadmap described the pre-D76 promise.
  const security = read('SECURITY.md');
  const stale = read('ROADMAP.md').replace(
    /`SECURITY\.md` promises an \*\*acknowledgement within \d+ business days[^|]*\|/,
    '`SECURITY.md` promises triage "within 3 business days". |',
  );
  const problems = promiseDrift(security, stale);
  assert.ok(
    problems.some((p) => /triage/i.test(p)),
    `the stale description must be caught:\n  ${problems.join('\n  ')}`,
  );
});

test('POSITIVE CONTROL: a different number is caught, and a deleted row is caught', () => {
  const security = read('SECURITY.md');
  const roadmap = read('ROADMAP.md');

  const wrongNumber = roadmap.replace(/(\d+) business days/, '7 business days');
  assert.ok(
    promiseDrift(security, wrongNumber).some((p) => /7 business days/.test(p)),
    'a roadmap quoting a different window must fail',
  );

  const noRow = roadmap
    .split('\n')
    .filter((l) => !(l.startsWith('|') && l.includes('SECURITY.md')))
    .join('\n');
  assert.ok(
    promiseDrift(security, noRow).some((p) => /no row describing/.test(p)),
    'a roadmap with no row about the policy must fail, not pass silently',
  );

  assert.deepEqual(promiseDrift(security, roadmap), [], 'and the real files pass');
});

test('the decision log\'s ratification range ends at the highest row in the log', () => {
  // The "Not yet decided" table's ratification cell has been amended **ten times** by hand, each
  // amendment ending with the admission "nothing recomputes it, so M1 still stands" — and it was
  // forty rows stale. The amendments stay, because a dated row says what it said on the day it said
  // it; but the **last** one is now read by a gate, so the next decision row cannot land until the
  // cell is amended. A hand-typed number that drifts now fails the build instead of waiting for a
  // human to notice it.
  const decisions = read('DECISIONS.md');
  const highest = Math.max(...[...decisions.matchAll(/^\| \*\*D(\d+)\*\* \|/gm)].map((m) => Number(m[1])));
  const claimed = [...decisions.matchAll(/the range now reads D10–D(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(claimed.length > 0, 'the ratification cell states a range');
  const last = claimed[claimed.length - 1];
  assert.equal(
    last,
    highest,
    `the ratification cell says the open range ends at D${last}, but the log's highest row is D${highest} — amend the cell`,
  );
});
