/**
 * Redaction — the mechanism behind "never attach a raw log to a public issue".
 *
 * Four properties, each with a test that can fail: the identifiers are gone, the *structure* is not
 * (a redacted log still folds), the pseudonyms are stable and non-reversible, and the original is
 * never touched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { redactEvents, redactLog } from '../src/redact.ts';

const ROWS = [
  { type: 'MemberRegistered', member: { ref: 'wa:62811', tz: 'Asia/Jakarta' }, at: 1 },
  { type: 'MemberRegistered', member: { ref: 'wa:62812', tz: 'Asia/Jakarta' }, at: 2 },
  { type: 'ThreadOpened', thread: { id: 't1', memberRef: 'wa:62811', pointer: 'msg-1' }, at: 3 },
  { type: 'CommitRefused', actionClass: 'draft.reminder', agent: 'event-ops', code: 'no_transport', at: 4 },
];

test('member identifiers are gone from a redacted log', () => {
  const { rows } = redactEvents(ROWS);
  const text = JSON.stringify(rows);
  assert.equal(text.includes('wa:62811'), false);
  assert.equal(text.includes('wa:62812'), false);
  assert.equal(text.includes('msg-1'), false, 'a thread pointer is a handle to a message — it names someone too');
});

test('the structure survives: the same event types, the same order, the same codes', () => {
  const { rows } = redactEvents(ROWS);
  assert.equal(rows.length, ROWS.length);
  assert.deepEqual(rows.map((r) => (r as { type: string }).type), ROWS.map((r) => r.type));
  assert.equal((rows[3] as { code: string }).code, 'no_transport', 'a refusal code is the governance evidence');
  assert.equal((rows[3] as { at: number }).at, 4, 'and the clock is untouched');
});

test('the pseudonyms are stable — the same member is the same pseudonym everywhere', () => {
  const { rows } = redactEvents(ROWS);
  const registered = (rows[0] as { member: { ref: string } }).member.ref;
  const onThread = (rows[2] as { thread: { memberRef: string } }).thread.memberRef;
  assert.equal(registered, onThread, 'a maintainer must still be able to tell that it is the same person');
  assert.notEqual(registered, (rows[1] as { member: { ref: string } }).member.ref, 'and two people stay two people');
});

test('the pseudonyms carry no meaning — they are not derived from the original', () => {
  const { rows } = redactEvents(ROWS);
  const p = (rows[0] as { member: { ref: string } }).member.ref;
  assert.equal(p.includes('62811'), false);
  assert.match(p, /^member-\d+$/);
});

test('redaction never touches the original file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-redact-'));
  const src = join(dir, 'events.jsonl');
  writeFileSync(src, ROWS.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const before = readFileSync(src, 'utf8');
  const out = redactLog({ eventsPath: src, outDir: dir });
  assert.equal(readFileSync(src, 'utf8'), before, 'the source is the only record of what happened');
  assert.ok(existsSync(out.eventsPath));
  const redacted = readFileSync(out.eventsPath, 'utf8');
  assert.equal(redacted.includes('wa:62811'), false);
  assert.equal(redacted.split('\n').filter((l) => l.trim() !== '').length, ROWS.length);
});
