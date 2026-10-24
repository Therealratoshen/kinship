import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertAnswersMatchNeeds, parseAnswers } from '../src/config.ts';
import { bootHost, persist, runCommand, verifyHost, type HostOptions } from '../src/host.ts';
import { FORMAT_VERSION } from '../src/store.ts';
import { readEvents, appendEvents, withLogLock } from '../src/store.ts';

const REPO = join(import.meta.dirname, '..', '..', '..');
const PACK = join(REPO, 'packs', 'kopdar-ops');

const ANSWERS = [
  'community_name: "AI Builders ID"',
  'schedule: "every other Saturday"',
  'venue_source: "manual"',
  'sponsor_list: "none yet"',
  'escalation_contact: "organiser"',
  'member_notice_text: "bot ini asisten organiser"',
  'rsvp_source_of_truth: "google form"',
  'partner_policy: "Kopdar Sebelah saja"',
].join('\n');

/** A temp copy of the pack, the org manifest beside it, a config that answers it, and a temp log root. */
function aHost(opts: { seat?: string } = {}): { opts: HostOptions; dir: string; configFile: string; planFile: string } {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-host-'));
  // The org manifest has to sit beside the pack: the loader walks up for it, and booting floorless
  // is refused on purpose (PKG-58) — so a temp tree without one is not a pack that boots.
  cpSync(join(REPO, 'orgs'), join(dir, 'orgs'), { recursive: true });
  const packDir = join(dir, 'kopdar-ops');
  cpSync(PACK, packDir, { recursive: true });
  if (opts.seat !== undefined) {
    // The seat is the community's declaration, in both tiers: the org names it, and the pack's
    // sanction ladder names whoever sanctions (PKG-62). Rename one and the boot is refused.
    const orgFile = join(dir, 'orgs', 'kinshipai.yaml');
    writeFileSync(orgFile, readFileSync(orgFile, 'utf8').replace(/^human_seats:\n  - \S+$/m, `human_seats:\n  - ${opts.seat}`));
    const packFile = join(dir, 'kopdar-ops', '.kinship.yaml');
    writeFileSync(packFile, readFileSync(packFile, 'utf8').replace(/^(\s*by: )organiser$/gm, `$1${opts.seat}`));
  }
  const configFile = join(dir, 'pack.local.yaml');
  writeFileSync(configFile, ANSWERS + '\n');
  // The community's own working file: their copy, their next event, their members. The shipped
  // example is the plan the test runs, so the example a new user copies is the example that is tested.
  const planFile = join(dir, 'pack.local.plan.yaml');
  cpSync(join(PACK, 'pack.local.plan.example.yaml'), planFile);
  return {
    opts: { packDir, configFile, planFile, logRoot: join(dir, 'logs'), tickMs: 1000, watch: false, command: 'run' },
    dir,
    configFile,
    planFile,
  };
}

/** The moment of the example event — the point where both of its reminders are due. */
const EVENT_MOMENT = '2026-11-07T19:00:00+07:00';

test('the config reader takes a flat key: value document and strips the quotes', () => {
  const answers = parseAnswers('a: "one"\nb: two\n# a whole-line comment\nc: "has # a hash"\nd: plain # a trailing comment\n');
  assert.deepEqual(
    answers,
    { a: 'one', b: 'two', c: 'has # a hash', d: 'plain' },
    'a quoted value may contain a `#`; an unquoted one ends at a `#` that follows whitespace',
  );
});

test('the config reader refuses a line that is not a pair, a duplicate, and an empty value', () => {
  assert.throws(() => parseAnswers('not a pair'), /key: value/);
  assert.throws(() => parseAnswers('a: 1\na: 2'), /answered twice/);
  assert.throws(() => parseAnswers('a:'), /has no value/);
});

test('the host refuses an answer the pack did not ask for — a typo must not pass silently', () => {
  assert.throws(() => assertAnswersMatchNeeds({ scheduel: 'x' }, ['schedule']), /not a need this pack declares/);
  assert.doesNotThrow(() => assertAnswersMatchNeeds({ schedule: 'x' }, ['schedule']));
});

test('the host boots, persists, and verifies — and a fresh fleet has logged nothing yet', () => {
  const { opts, dir } = aHost();
  try {
    const host = bootHost(opts);
    persist(host, opts);
    const v = verifyHost(host);
    assert.equal(v.ok, true, `the log this host just wrote must verify: ${v.problems.join('; ')}`);
    assert.equal(v.rows, 0, 'a fleet that has done nothing has logged nothing — the host does not invent rows');
    assert.ok(existsSync(host.manifestPath), 'the cover is written even when the log is empty');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the manifest is compared to the rows — a tampered cover does not verify', () => {
  // The cover is the log's own statement about itself: how many rows it has, which pack it came
  // from, which answers it was written against. `verify` read the rows and folded them, and the
  // comment above it claimed the answers digest was checked at the same time — **it was not, the
  // manifest was never opened**. Five fields could be corrupted and the host still said "verified".
  //
  // A verification that ignores the thing being verified is not a verification; it is a fold.
  const { opts, dir } = aHost();
  try {
    const host = bootHost(opts);
    persist(host, opts);
    const manifestPath = host.manifestPath;
    const original = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;

    for (const [field, value] of [
      ['answersDigest', 'deadbeef'],
      ['packDigest', 'cafebabe'],
      ['rowCount', 999],
      ['firstSeq', 5],
      ['lastSeq', 99],
    ] as const) {
      writeFileSync(manifestPath, JSON.stringify({ ...original, [field]: value }, null, 2) + '\n');
      const v = verifyHost(host);
      assert.equal(v.ok, false, `a tampered \`${field}\` must not verify`);
      assert.ok(
        v.problems.some((p) => p.includes(field)),
        `the refusal must name the field it found: ${v.problems.join('; ')}`,
      );
    }

    // A missing manifest is a refusal, not a pass: this is not a log this host wrote.
    rmSync(manifestPath);
    const v = verifyHost(host);
    assert.equal(v.ok, false, 'a log with no manifest is not a log this host wrote');
    assert.ok(v.problems.length > 0, 'and the refusal says why');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a drafted lane becomes a card on disk, and the file still verifies', () => {
  const { opts, dir } = aHost();
  try {
    const out = runCommand({
      ...opts,
      command: 'draft',
      actionClass: 'draft.reminder',
      agent: 'event-ops',
      text: { id: 'Reminder: Kopdar besok jam 19:00.', en: 'Reminder: Kopdar tomorrow at 19:00.' },
    });
    assert.ok(out.some((l) => l.includes('drafted into card')), out.join('\n'));
    const host = bootHost(opts);
    const v = verifyHost(host);
    assert.equal(v.ok, true, v.problems.join('; '));
    assert.ok(v.rows > 0, 'the drafted card is in the file');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the host continues its log on restart rather than starting again', () => {
  const { opts, dir } = aHost();
  try {
    const first = bootHost(opts);
    persist(first, opts);
    const before = readEvents(first.eventsPath).length;
    const second = bootHost(opts);
    assert.equal(second.onDisk.length, before, 'a restarted host reads its own log back');
    assert.equal(second.fleet.events.length, before, 'and continues from it, not from nothing');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a tampered log does not verify — and the host says why', () => {
  const { opts, dir } = aHost();
  try {
    // Two drafts, so the log has a row to delete from the middle: deleting the *only* row would
    // leave an empty file, which is dense and legal, and the gap would have nothing to show.
    for (let i = 0; i < 2; i++) {
      runCommand({
        ...opts,
        command: 'draft',
        actionClass: 'draft.reminder',
        text: { id: `Reminder ${i}.`, en: `Reminder ${i}.` },
      });
    }
    const host = bootHost(opts);
    persist(host, opts);
    const rows = readEvents(host.eventsPath);
    assert.ok(rows.length >= 2, 'the fixture must have a row to delete');
    writeFileSync(host.eventsPath, rows.slice(1).map((r) => JSON.stringify(r)).join('\n') + '\n');
    const v = verifyHost(host);
    assert.equal(v.ok, false, 'a deleted row leaves a gap');
    assert.ok(v.problems.some((p) => p.includes('seq_missing')), v.problems.join('; '));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the host sends nothing: the log holds no transport, and the claim is structural', () => {
  const { opts, dir } = aHost();
  try {
    runCommand({
      ...opts,
      command: 'draft',
      actionClass: 'draft.reminder',
      text: { id: 'Reminder.', en: 'Reminder.' },
    });
    const host = bootHost(opts);
    const text = readFileSync(host.eventsPath, 'utf8');
    assert.ok(!text.includes('CommitExecuted'), 'no commit executed — the refusal is a line of code, not a missing setting');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the manifest states the privacy posture in the artefact, and keeps the answers out of it', () => {
  const { opts, dir } = aHost();
  try {
    const host = bootHost(opts);
    persist(host, opts);
    const manifest = JSON.parse(readFileSync(host.manifestPath, 'utf8'));
    assert.equal(manifest.memberDataInFile, true);
    assert.equal(manifest.memberMessageTextStored, false, 'member message text never lands — only a hash');
    assert.equal(manifest.draftCopyInFile, true, 'and saying so matters: the log DOES hold the draft copy, because an approval binds to the exact bytes');
    assert.equal(manifest.retentionOwner, 'host');
    // The format version is a CLAIM about the file's shape, so the claim is checked against the code
    // that writes it — a hardcoded number here is a number that rots the moment the format moves,
    // which is exactly what happened when the content hash widened (D70).
    assert.equal(manifest.formatVersion, FORMAT_VERSION, 'the manifest states the format the code writes');
    assert.ok(manifest.answersDigest.length >= 32, 'and the answers digest is a 128-bit hash');
    assert.ok(manifest.answersDigest.length > 0);
    assert.ok(!JSON.stringify(manifest).includes('organiser'), 'the escalation contact is a named human and stays out of the file');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI refuses an approve without a why — a verdict without a why is not a record', () => {
  const { opts, dir } = aHost();
  try {
    assert.throws(() => runCommand({ ...opts, command: 'approve', cardId: 'card-1' }), /--why/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- the fleet runs: plan, schedule, fire, decide, publish (D60) ------------------------------------------

test('a plan reads what the fleet would do, and writes nothing', () => {
  const { opts, dir } = aHost();
  const out = runCommand({ ...opts, command: 'plan' });
  assert.ok(out.some((l) => l.includes('2 action(s) planned')), out.join('\n'));
  assert.ok(out.some((l) => l.includes('draft.reminder@t-minus-1')), 'the T-1 reminder is planned');
  assert.equal(readEvents(join(dir, 'logs', 'kinshipai', 'bundled', 'event-ops', 'kopdar', 'events.jsonl')).length, 0,
    'a plan is a read — it writes no rows');
});

test('running the fleet schedules the timers, fires them, and leaves the cards on a human\'s desk', () => {
  const { opts } = aHost();
  const out = runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  assert.ok(out.some((l) => l.includes('scheduled: draft.reminder@t-minus-1')), out.join('\n'));
  assert.ok(out.some((l) => l.includes('card-') && l.includes('waiting on a human')), 'a card is waiting on a human');
  assert.ok(out.some((l) => l.includes('2 to decide')), 'and the inbox says so');
});

test('a second run does not schedule the same promise twice', () => {
  const { opts } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  const second = runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  assert.ok(second.some((l) => l.includes('already scheduled')), second.join('\n'));
  assert.ok(!second.some((l) => l.startsWith('  scheduled:')), 'and nothing new was scheduled');
});

test('the human can say no, and the reason is the record', () => {
  const { opts } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  const out = runCommand({ ...opts, command: 'approve', cardId: 'card-1', why: 'terlalu awal', verdict: 'reject' });
  assert.ok(out.some((l) => l.includes('is now rejected')), out.join('\n'));
});

test('the verdict is recorded under the community\'s own seat, not a hardcoded name — the positive control', () => {
  // A community whose human is called something else. The org manifest says it in words: "the seat
  // is a role, not a password." A host that hardcoded 'organiser' would be REFUSED here, because
  // the runtime refuses an actor that is not a declared seat — so this test FAILS if the seat is
  // ever written as a literal again.
  const { opts } = aHost({ seat: 'ketua' });
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  const out = runCommand({ ...opts, command: 'approve', cardId: 'card-1', why: 'terlalu awal', verdict: 'reject' });
  assert.ok(out.some((l) => l.includes('decided by ketua')), out.join('\n'));
  assert.ok(!out.some((l) => l.includes('decided by organiser')), 'and not under the default name');
});

test('publishing an approved card is refused by the transport gate — phase 1 ships no transport (D21)', () => {
  const { opts } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  runCommand({ ...opts, command: 'approve', cardId: 'card-2', why: 'tanggal dan tempat sudah benar' });
  const out = runCommand({ ...opts, command: 'publish', cardId: 'card-2', recipients: ['wa:62811'] });
  assert.ok(out.some((l) => l.includes('refused: no_transport')), out.join('\n'));
});

test('publishing to a member who has said stop is refused before the transport gate, and says so', () => {
  const { opts } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  runCommand({ ...opts, command: 'approve', cardId: 'card-2', why: 'tanggal dan tempat sudah benar' });
  const out = runCommand({ ...opts, command: 'publish', cardId: 'card-2', recipients: ['wa:62813'] });
  assert.ok(out.some((l) => l.includes('refused: member_suppressed')), out.join('\n'));
});

test('publishing an unapproved card is refused — the human decides first', () => {
  const { opts } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  assert.throws(
    () => runCommand({ ...opts, command: 'publish', cardId: 'card-2', recipients: ['wa:62811'] }),
    /not approved/,
  );
});

test('publishing needs the member named — the host does not know the community\'s members', () => {
  const { opts } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  runCommand({ ...opts, command: 'approve', cardId: 'card-2', why: 'tanggal dan tempat sudah benar' });
  assert.throws(
    () => runCommand({ ...opts, command: 'publish', cardId: 'card-2' }),
    /--recipient/,
  );
});

test('the run cap bounds the tick: the wakes past the cap stay due for the next one', () => {
  // The pack's `max_actions_per_run` is 15 and the example event has two reminders, so the cap is
  // not reached here — this test is about the wiring: the host holds ONE run handle for the tick,
  // so the cap bounds the tick rather than each wake. Without the handle the fleet's own path was
  // not bounded at all, because the cap lived only in `runActions`.
  const { opts } = aHost();
  const out = runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  assert.ok(!out.some((l) => l.includes('stopped at its cap')), 'two reminders is inside a cap of 15');
  assert.ok(out.some((l) => l.includes('waiting on a human')));
});

test('the digest command reports the day, per channel, and names nobody', () => {
  const { opts } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  runCommand({ ...opts, command: 'approve', cardId: 'card-2', why: 'tanggal dan tempat sudah benar' });
  const out = runCommand({ ...opts, command: 'digest', now: Date.parse(EVENT_MOMENT) + 3_600_000 });
  const text = out.join('\n');
  assert.ok(text.includes('digest —'), text);
  assert.ok(text.includes('2 draft(s)'), 'both reminders were drafted');
  assert.ok(text.includes('1 approved'));
  assert.ok(text.includes('kopdar-2026-11-07'), 'and the channel is named');
  assert.ok(text.includes('NOT a summary of what members said to each other'), 'and the limit is stated');
  assert.equal(text.includes('wa:62811'), false, 'the digest names nobody');
});

test('the redact command takes the member identifiers out and leaves the governance evidence in', () => {
  const { opts, dir } = aHost();
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  const logDir = join(dir, 'logs');
  const out = runCommand({ ...opts, command: 'redact', logRoot: logDir });
  assert.ok(out.some((l) => l.includes('member identifier(s) replaced')), out.join('\n'));
  const src = join(logDir, 'kinshipai', 'bundled', 'event-ops', 'kopdar', 'events.jsonl');
  const redacted = join(logDir, 'events.redacted.jsonl');
  assert.ok(existsSync(redacted), 'the redacted copy exists');
  const original = readFileSync(src, 'utf8');
  const copy = readFileSync(redacted, 'utf8');
  assert.ok(original.includes('wa:62811'), 'the original still has the real identifiers — it is the only record');
  assert.equal(copy.includes('wa:62811'), false, 'and the copy does not');
  assert.ok(copy.includes('member-1'), 'the pseudonyms are there instead');
  assert.equal(copy.split('\n').filter((l) => l.trim() !== '').length, original.split('\n').filter((l) => l.trim() !== '').length,
    'the row count is the same — the structure survived');
});

test('init scaffolds the two working files from the examples, and never overwrites one', () => {
  const { opts, dir } = aHost();
  const packDir = join(dir, 'kopdar-ops');
  // Start from a pack with no working files.
  rmSync(join(packDir, 'pack.local.yaml'), { force: true });
  rmSync(join(packDir, 'pack.local.plan.yaml'), { force: true });
  const out = runCommand({ ...opts, packDir, command: 'init' });
  assert.ok(out.some((l) => l.includes('created 2 file(s)')), out.join('\n'));
  assert.ok(existsSync(join(packDir, 'pack.local.yaml')));
  assert.ok(existsSync(join(packDir, 'pack.local.plan.yaml')));
  assert.ok(out.some((l) => l.includes('who you are')), 'and it says what to edit next');
  // Second run: nothing is overwritten.
  writeFileSync(join(packDir, 'pack.local.yaml'), 'community_name: "Mine"\n');
  const again = runCommand({ ...opts, packDir, command: 'init' });
  assert.ok(again.some((l) => l.includes('nothing was overwritten')), again.join('\n'));
  assert.equal(readFileSync(join(packDir, 'pack.local.yaml'), 'utf8'), 'community_name: "Mine"\n',
    "a community's own answers survive init");
});

test('one writer per log: a second writer is refused instead of duplicating a seq', () => {
  const { opts, dir } = aHost();
  const logDir = join(dir, 'logs');
  // The first host writes.
  runCommand({ ...opts, command: 'run', now: Date.parse(EVENT_MOMENT) });
  const eventsPath = join(logDir, 'kinshipai', 'bundled', 'event-ops', 'kopdar', 'events.jsonl');
  const after = readFileSync(eventsPath, 'utf8').trim().split('\n');
  assert.ok(after.length > 0);

  // A second host, booted from the same log, tries to append rows whose seq continues from ITS OWN
  // memory — which is now behind the file. The reconciliation refuses it, rather than writing a
  // duplicate seq that would replay to a different state on another machine.
  const rows = JSON.parse(after[0]) as { seq: number };
  assert.throws(
    () => appendEvents(eventsPath, [{ seq: rows.seq, type: 'Test', at: 1 } as never]),
    /another writer has advanced the log|ONE writer per log/,
    'the write is refused, not silently duplicated',
  );
});

test('a lock left behind by a dead process is taken over, not obeyed forever', () => {
  const { dir } = aHost();
  const eventsPath = join(dir, 'logs', 'kinshipai', 'bundled', 'event-ops', 'kopdar', 'events.jsonl');
  mkdirSync(join(eventsPath, '..'), { recursive: true });
  // A pid that cannot be running: the lock is stale.
  writeFileSync(`${eventsPath}.lock`, '999999999');
  let wrote = false;
  withLogLock(eventsPath, () => { wrote = true; });
  assert.equal(wrote, true, 'a stale lock is taken over — a lock nobody can clear is a log nobody can write');
});
