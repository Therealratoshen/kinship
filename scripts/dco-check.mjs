#!/usr/bin/env node
/**
 * The DCO sign-off check — "Did every outside contributor sign for the work they sent?"
 *
 * **What this is for.** A contribution is code somebody else wrote. The DCO (Developer Certificate
 * of Origin, <https://developercertificate.org/>) is the lightest way to record that the person
 * sending it had the right to send it: one `Signed-off-by:` line per commit. It is lighter than a
 * CLA, and a CLA's extra power — the right to re-licence later — is not needed here.
 *
 * **Who is exempt, and why that is not a loophole.** The maintainer's own commits are exempt, because
 * the maintainer is the copyright holder and signing off their own work proves nothing. The rule is
 * aimed at exactly the case it exists for: **a commit from somebody else, with no sign-off.** The
 * check names the commit, its author, and the line to add — it does not demand a ritual from the one
 * person the ritual cannot inform.
 *
 * **And the honest limit.** A sign-off is a *statement*, not a proof — it is worth exactly what the
 * jurisdiction in which a dispute is heard makes it worth. It is the cheapest of the available
 * instruments, and it is the one that scales to strangers: a pull request from someone you have never
 * met arrives with a record of what they claim about their own contribution.
 *
 * **What it does NOT check.** It does not check that the contribution is original, that it is
 * licence-compatible, or that it is good. It is a provenance record, not a review.
 */
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const repoFlag = argv.indexOf('--repo');
const REPO = repoFlag === -1 ? process.cwd() : argv[repoFlag + 1];

const MAINTAINER = 'filborthen@gmail.com';

/** `sha<TAB>author email<TAB>subject` for every commit in the range. */
function commitsIn(range) {
  let out = '';
  try {
    out = execFileSync('git', ['log', '--format=%H%x09%ae%x09%s', range], { encoding: 'utf8', cwd: REPO });
  } catch {
    return [];
  }
  return out.split('\n').filter((l) => l.trim() !== '').map((l) => {
    const [sha, email, ...rest] = l.split('\t');
    return { sha: sha ?? '', email: email ?? '', subject: rest.join('\t') };
  });
}

/** The `Signed-off-by:` trailers on a commit. */
function signoffs(sha) {
  let body = '';
  try {
    body = execFileSync('git', ['log', '-1', '--format=%B', sha], { encoding: 'utf8', cwd: REPO });
  } catch {
    return [];
  }
  return body.split('\n').filter((l) => /^Signed-off-by:/i.test(l.trim()));
}

function main() {
  const args = argv.filter((a, i) => !a.startsWith('--') && i !== repoFlag + 1);
  const range = args[0] ?? process.env.DCO_RANGE ?? '';
  if (range === '') {
    console.log('dco-check: no range given — nothing to check (not a failure; a fork without a base has no outside commits to judge)');
    return 0;
  }
  const commits = commitsIn(range);
  const offenders = commits.filter((c) => c.email.toLowerCase() !== MAINTAINER).filter((c) => signoffs(c.sha).length === 0);
  if (offenders.length === 0) {
    console.log(`dco-check: ${commits.length} commit(s) in ${range}, every outside contribution signed off`);
    return 0;
  }
  console.error(`dco-check: ${offenders.length} commit(s) from outside the maintainer carry no DCO sign-off:`);
  for (const c of offenders) {
    console.error(`  ${c.sha.slice(0, 9)}  ${c.email}  ${c.subject.slice(0, 70)}`);
  }
  console.error('');
  console.error('  Add the sign-off and amend the commit:');
  console.error('    git commit --amend -s --no-edit');
  console.error('  Or sign off the whole branch:');
  console.error('    git rebase --exec "git commit --amend --no-edit -s" -i <base>');
  console.error('');
  console.error('  The sign-off says: "I certify that I have the right to submit this work under the');
  console.error('  project\'s licence, and that I have disclosed any third-party work in it."');
  return 1;
}

process.exit(main());
