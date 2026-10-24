/**
 * branch-protection.test.mjs — the merge rule this repository applies is derived, not typed.
 *
 *   node --test scripts/branch-protection.test.mjs
 *
 * **WHY THIS FILE EXISTS.** The rule that decides what may merge into `main` was, until 2026-10-24, a
 * **sentence in a markdown table** that nobody could read back: the token this repository's agent holds
 * gets *403, "Resource not accessible by personal access token"*, from the endpoint that reports the
 * protection. So the rule was prose, the prose was wrong (it described a review the author could not
 * give), and seven pull requests merged on an admin bypass that nothing recorded.
 *
 * **WHAT THIS CHECKS.** The list of CI checks the protection must require is **read out of the
 * workflow**, not typed. A hand-typed list of check names is a claim nothing checks: the workflow
 * renames a job and the protection quietly stops requiring it, while the repository says it is gated.
 * So every CI job must be covered by the derived list, the list must contain no trigger (a trigger is
 * not a check anybody can go green on), and the decided rule must bind the owner.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requiredChecks, decidedRule } from './configure-branch-protection.mjs';

const ROOT = join(import.meta.dirname, '..');
const WORKFLOW = readFileSync(join(ROOT, '.github', 'workflows', 'test.yml'), 'utf8');
const JOBS_BLOCK = WORKFLOW.split(/^jobs:\s*$/m)[1] ?? '';

/**
 * The name GitHub records each job under: its `name:` when it has one, else its id.
 *
 * Read with its own scan, so the test does not simply ask the script what the script thinks.
 */
function jobDisplayNames(jobsBlock) {
  const out = new Map();
  let current = null;
  for (const line of jobsBlock.split('\n')) {
    const id = /^ {2}([a-z][a-z-]*):\s*$/.exec(line);
    if (id !== null) { current = id[1]; out.set(current, current); continue; }
    if (current === null) continue;
    const named = /^ {4}name:\s*(.+?)\s*$/.exec(line);
    if (named !== null) out.set(current, named[1].replace(/^['"]|['"]$/g, ''));
  }
  return out;
}

test('every CI job in the workflow is in the derived list of required checks', () => {
  const checks = requiredChecks(WORKFLOW);
  assert.ok(checks.length > 0, 'the workflow has jobs');

  const ids = [...JOBS_BLOCK.matchAll(/^ {2}([a-z][a-z-]*):\s*$/gm)].map((m) => m[1]);
  assert.ok(ids.length >= 4, `expected several CI jobs, found ${ids.length}`);

  // **The display name, not the id.** GitHub records a check under the job's `name:` when it has one,
  // so a job called `host` with `name: Reference host` is required as "Reference host (23)". A
  // hand-written list gets this wrong, which is one reason the list is derived.
  const display = jobDisplayNames(JOBS_BLOCK);
  const required = new Set(checks.map((c) => c.replace(/ \([^)]*\)$/, '')));
  for (const id of ids) {
    assert.ok(
      required.has(display.get(id) ?? id),
      `the CI job \`${id}\` is not in the required-checks list — a job that is not required is a job that does not gate`,
    );
  }
});

test('the derived list contains no trigger — a trigger is not a check', () => {
  const checks = requiredChecks(WORKFLOW);
  for (const trigger of ['push', 'pull_request', 'schedule']) {
    assert.ok(
      !checks.includes(trigger),
      `\`${trigger}\` is a trigger, not a check — requiring it would freeze every pull request`,
    );
  }
});

test('the list is derived, not frozen — renaming a job changes it', () => {
  // A positive control: if the list were a frozen literal, a renamed job would leave the protection
  // requiring a check that no longer exists, while the repository still said it was gated.
  const renamed = WORKFLOW.replace('    name: Reference host', '    name: The host');
  const before = requiredChecks(WORKFLOW);
  const after = requiredChecks(renamed);
  assert.notDeepEqual(before, after, 'renaming a CI job must change the required-checks list');
  assert.ok(after.some((c) => c.startsWith('The host')), 'and the new name is the one required');
});

test('the decided rule binds the owner and asks for no human review', () => {
  const rule = decidedRule(requiredChecks(WORKFLOW));
  // The rules bind the maintainer too — that is the whole point of the change.
  assert.equal(rule.enforce_admins, true, 'the rule must bind the owner as well as everybody else');
  // No human review is required, because there is no second human to require one from: requiring it
  // would freeze the repository rather than protect it.
  assert.equal(rule.required_pull_request_reviews.required_approving_review_count, 0);
  // And the gates are required, which is what makes the rule a rule rather than an intention.
  assert.ok(rule.required_status_checks.contexts.length > 0, 'the gates must be required');
  assert.equal(rule.required_status_checks.strict, true, 'and the branch must be up to date');
});
