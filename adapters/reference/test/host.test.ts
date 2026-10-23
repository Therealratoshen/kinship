import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertAnswersMatchNeeds, parseAnswers } from '../src/config.ts';
import { bootHost, persist, runCommand, verifyHost, type HostOptions } from '../src/host.ts';
import { readEvents } from '../src/store.ts';

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
function aHost(): { opts: HostOptions; dir: string; configFile: string; planFile: string } {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-host-'));
  // The org manifest has to sit beside the pack: the loader walks up for it, and booting floorless
  // is refused on purpose (PKG-58) — so a temp tree without one is not a pack that boots.
  cpSync(join(REPO, 'orgs'), join(dir, 'orgs'), { recursive: true });
  const packDir = join(dir, 'kopdar-ops');
  cpSync(PACK, packDir, { recursive: true });
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
    assert.equal(manifest.formatVersion, 1);
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
