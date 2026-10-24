#!/usr/bin/env node
/**
 * configure-branch-protection.mjs — read the repository's merge rule, and set the one it has decided on.
 *
 *   node scripts/configure-branch-protection.mjs            # print the current rule
 *   node scripts/configure-branch-protection.mjs --apply    # set the decided rule
 *
 * **WHY THIS EXISTS.** This repository has one maintainer, and GitHub does not count an author's own
 * approval toward a required review. So the rule "one approving review" could not be met by the only
 * reviewer it has — it was an impossibility described as a rule, and it was being met by an admin
 * bypass that nothing recorded (`DECISIONS.md` D99).
 *
 * **THE DECIDED RULE — the gates are the review.**
 *
 *   - `required_status_checks` — **the CI jobs are required**, so a red gate blocks a merge for
 *     everybody, the maintainer included. Today the status checks are `null`, so CI is *advisory* —
 *     which means the only thing standing between a branch and `main` is a human review that cannot
 *     happen.
 *   - `required_approving_review_count: 0` — **no human review is required**, because there is no
 *     second human to require one from. Requiring it would freeze the repository, which is not a
 *     rule; it is a stop sign.
 *   - `enforce_admins: true` — **the rules bind the owner too.** This is the part that was missing:
 *     an open-source repository whose own rule does not bind its own maintainer is a repository
 *     asking to be trusted rather than checking itself.
 *
 * **AND THE UPGRADE PATH.** When a second maintainer exists, the review count goes back to 1 and
 * the human review returns. `SECURITY.md` already names that as the honest fix for the conduct
 * seam; this is the same fix for the merge seam.
 *
 * **WHAT IT NEEDS.** A token with **Administration: write** (a fine-grained PAT with
 * `administration: read and write`, or a classic PAT with `repo`). The token this repository's agent
 * holds cannot read the protection at all — GitHub answers *403, "Resource not accessible by
 * personal access token"* — which is why the rule has been a claim in prose rather than a setting
 * anybody could read back.
 */
import { request } from 'node:https';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'Therealratoshen/kinship';
const BASE = 'api.github.com';

/**
 * The CI jobs that must be green before anything merges — **read out of the workflow**, not typed.
 *
 * A hand-written list of check names is a claim nothing checks: the workflow renames a job and the
 * protection quietly stops requiring it, while the repository says it is gated. The names GitHub
 * records are `<job name> (<matrix value>)`, so both are read from the workflow file.
 */
export function requiredChecks(workflowText) {
  const jobs = [];
  let current = null;
  // Only the `jobs:` block — above it, `push:` and `pull_request:` are triggers, not jobs, and a
  // trigger is not a check anybody can go green on.
  let inJobs = false;
  for (const line of workflowText.split('\n')) {
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs) continue;
    const job = /^ {2}([a-z][a-z-]*):\s*$/.exec(line);
    if (job !== null && !['on', 'permissions', 'concurrency', 'jobs', 'env'].includes(job[1])) {
      current = { id: job[1], name: job[1], matrix: null };
      jobs.push(current);
      continue;
    }
    if (current === null) continue;
    const named = /^ {4}name:\s*(.+?)\s*$/.exec(line);
    if (named !== null) current.name = named[1].replace(/^['"]|['"]$/g, '');
    const matrix = /node:\s*\[([^\]]*)\]/.exec(line);
    if (matrix !== null) current.matrix = [...matrix[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }
  const out = [];
  for (const job of jobs) {
    if (job.matrix === null) out.push(job.name);
    else for (const value of job.matrix) out.push(`${job.name} (${value})`);
  }
  return out;
}

/** The rule this repository has decided on. */
export function decidedRule(checks) {
  return {
    required_status_checks: { strict: true, contexts: checks },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 0,
      dismiss_stale_reviews: true,
    },
    required_signatures: false,
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  };
}

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = request(
      {
        host: BASE,
        path,
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'kinship-branch-protection',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let out = '';
        res.on('data', (c) => { out += c; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = out === '' ? null : JSON.parse(out); } catch { parsed = { raw: out }; }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '';

export async function main() {
  const path = `/repos/${REPO}/branches/main/protection`;
  const workflow = readFileSync(join(import.meta.dirname, '..', '.github', 'workflows', 'test.yml'), 'utf8');
  const checks = requiredChecks(workflow);
  const rule = decidedRule(checks);

  if (!token) {
    console.log('No token. Set GITHUB_TOKEN to a token with `administration: read and write`.\n');
    console.log('This repository\'s decided rule, for the record:');
    console.log(JSON.stringify(rule, null, 2));
    console.log('\nThe endpoints this uses:');
    console.log(`  GET    https://api.github.com${path}`);
    console.log(`  PUT    https://api.github.com${path}`);
    return;
  }

  const current = await api('GET', path, undefined, token);
  if (current.status !== 200) {
    console.error(`Could not read the current protection: HTTP ${current.status}`);
    console.error(`  ${current.body?.message ?? ''}`);
    console.error('\nThe token needs `administration: read and write`. A token with only');
    console.error('`contents: write` cannot read it, which is why the rule has been prose so far.');
    process.exit(1);
  }

  const c = current.body;
  console.log('The rule as it is now:');
  console.log(`  required approving reviews : ${c.required_pull_request_reviews?.required_approving_review_count ?? 'none'}`);
  console.log(`  required status checks    : ${(c.required_status_checks?.contexts ?? []).join(', ') || 'NONE — CI is advisory'}`);
  console.log(`  enforce admins            : ${c.enforce_admins?.enabled ?? false}`);
  console.log(`  dismiss stale reviews     : ${c.required_pull_request_reviews?.dismiss_stale_reviews ?? false}`);

  if (!process.argv.includes('--apply')) {
    console.log('\nDry run. Re-run with --apply to set the decided rule.');
    return;
  }

  const applied = await api('PUT', path, rule, token);
  if (applied.status !== 200) {
    console.error(`Could not apply the rule: HTTP ${applied.status} — ${applied.body?.message ?? ''}`);
    process.exit(1);
  }
  console.log('\nApplied. The rule now binds everybody, the maintainer included:');
  console.log('  - the gates are required (a red gate blocks a merge)');
  console.log('  - no human review is required, because there is no second human to require one from');
  console.log('  - admins are bound by it');
  console.log('\nRead it back to be sure:');
  const check = await api('GET', path, undefined, token);
  console.log(`  HTTP ${check.status} · checks: ${(check.body?.required_status_checks?.contexts ?? []).length} · enforce_admins: ${check.body?.enforce_admins?.enabled ?? false}`);
}

if (process.argv[1] && process.argv[1].endsWith('configure-branch-protection.mjs')) {
  main().catch((e) => {
    console.error(`branch protection: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
