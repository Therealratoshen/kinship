/**
 * The capability manifest — what the fleet may do, and who answers for it.
 *
 * **The decision this file pins (DECISIONS.md D103).** The owner decided (2026-10-24) that the
 * community decides: the check's shape, the log's format, and everything the fleet is allowed to do
 * are the community's, not the project's. That answer needed a *vocabulary* — there was nowhere to
 * write "push", so nobody could write it — and this file is that vocabulary's first entry.
 *
 * **The three properties worth a test each.**
 *
 *   - **The check's existence is a floor.** Its *shape* is configurable; the check itself is not.
 *     There is no `off` value, and every word that means one is refused with the reason. A floor
 *     that could be set by accident would not be a floor — so the test walks the whole vocabulary
 *     of "off" rather than asserting one spelling.
 *   - **A power says why it is on.** `reason:` is required. A capability that changes what the
 *     fleet may do, with no stated justification, is not a configuration — it is a wider blast
 *     radius with a YAML key on it. **The seat is not in the manifest at all**: it is resolved
 *     from the community's declared seat set, because a seat written in a second place is a seat
 *     that drifts (D100's lesson, caught by the MCP adapter's own test).
 *   - **The vocabulary grows only with enforcement.** `human_check` is in it because the shape
 *     changes what the runtime DOES: under `push` a card also writes a `ReviewRequested` row, and
 *     under `pull` it does not. The last two tests are the ones that keep this honest — if a
 *     capability ever became a value the runtime only read back, these would fail.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOrg } from '../src/org.ts';
import { resolveSettings } from '../src/settings.ts';
import { asks, CAPABILITY_NAMES } from '../src/capabilities.ts';
import { createCard } from '../src/cards.ts';
import { KinshipError } from '../src/errors.ts';
import { makeCtx, makePack } from './helpers.ts';
import type { FleetEvent, LoggedEvent, PackedOrg } from '../src/types.ts';

const codeOf = (fn: () => unknown): string => {
  try { fn(); } catch (e) {
    assert.ok(e instanceof KinshipError, `expected a refusal, got ${e}`);
    return e.code;
  }
  throw new Error('expected a refusal, got a value');
};

/** An org manifest with the given `capabilities:` block appended. */
const orgWith = (block: string): PackedOrg => parseOrg(`schema: kinship-org/v1
key: kinshipai
name: Kinship
human_seats:
  - organiser
agent_roles:
  - event-ops
floors:
  member_message_cap_per_24h: 4
autonomy_ceiling:
  commit.channel-post: draft
${block}`);

/** The pack an org tier attaches to. */
const packUnder = (org: PackedOrg) => ({ ...makePack({ 'event-ops': { 'commit.channel-post': 'draft' } }), org });

// --- the floor -------------------------------------------------------------------------------

test('every word that means "off" is refused, because the check has no off state', () => {
  for (const word of ['off', 'none', 'disabled', 'false', 'no', 'never']) {
    assert.equal(
      codeOf(() => orgWith(`capabilities:\n  human_check:\n    shape: ${word}\n    reason: "x"\n`)),
      'org_invalid',
      `shape: ${word} was accepted — the human check's existence is a floor`,
    );
  }
});

test('the refusal for an off state says the existence is a floor, not that the word is unknown', () => {
  assert.throws(
    () => orgWith('capabilities:\n  human_check:\n    shape: off\n    reason: "x"\n'),
    /existence is a floor/,
  );
});

test('a capability the runtime does not have is refused rather than ignored', () => {
  assert.equal(
    codeOf(() => orgWith('capabilities:\n  telepathy:\n    shape: push\n    reason: "x"\n')),
    'org_invalid',
  );
  assert.deepEqual([...CAPABILITY_NAMES], ['human_check']);
});

// --- a power names its owner and its reason -------------------------------------------------

test('a field the runtime does not read is refused, not ignored — and a `seat:` is one of them', () => {
  // The manifest has no seat field: the seat that answers is resolved from the declared seat set.
  // A `seat:` written here would be a second copy of a fact, and a second copy goes stale the
  // moment a community renames its human. So it is refused by name rather than quietly dropped.
  assert.equal(
    codeOf(() => orgWith('capabilities:\n  human_check:\n    shape: push\n    seat: organiser\n    reason: "x"\n')),
    'org_invalid',
  );
  assert.throws(
    () => orgWith('capabilities:\n  human_check:\n    shape: push\n    seat: organiser\n    reason: "x"\n'),
    /does not read/,
  );
});

test('a capability with no reason is refused — "we turned this on" is not a decision', () => {
  assert.equal(
    codeOf(() => orgWith('capabilities:\n  human_check:\n    shape: push\n')),
    'org_invalid',
  );
});

test('the seat that answers is RESOLVED from the seat set, not written into the manifest', () => {
  // The first version of the manifest carried a `seat:` field, and the MCP adapter's own test
  // caught it: a community that renames its human got a manifest naming the old one, and the
  // refusal was correct. That is D100's lesson one layer down — the seat is resolved, not typed —
  // so the manifest has no seat field at all, and the answer is the declared seat set.
  const org = orgWith('capabilities:\n  human_check:\n    shape: push\n    reason: "x"\n');
  assert.deepEqual(Object.keys(org.capabilities!.human_check!).sort(), ['reason', 'shape'], 'the declaration carries no seat');
  const settings = resolveSettings({ pack: packUnder(org) });
  assert.equal(settings.capabilities.humanCheck.seat, 'organiser');
  // And the seat in the log is the community's own seat, not a default.
  const events = cardEvents(orgWith('capabilities:\n  human_check:\n    shape: push\n    reason: "x"\n'));
  const request = events.find((e) => e.type === 'ReviewRequested');
  assert.equal((request as Extract<FleetEvent, { type: 'ReviewRequested' }>).seat, 'organiser');
});

test('a capability with no shape is refused — a setting with no behaviour is not a setting', () => {
  assert.equal(
    codeOf(() => orgWith('capabilities:\n  human_check:\n    reason: "x"\n')),
    'org_invalid',
  );
});

test('a shape this runtime does not have is refused', () => {
  assert.equal(
    codeOf(() => orgWith('capabilities:\n  human_check:\n    shape: shout\n    reason: "x"\n')),
    'org_invalid',
  );
});

// --- resolution -----------------------------------------------------------------------------

test('with no manifest, the runtime asks nobody — the conservative default is pull', () => {
  const settings = resolveSettings({ pack: packUnder(parseOrg('schema: kinship-org/v1\nkey: k\nname: K\nhuman_seats:\n  - organiser\nagent_roles: []\n')) });
  assert.equal(settings.capabilities.humanCheck.shape, 'pull');
  assert.equal(settings.capabilities.humanCheck.source, 'default');
  assert.equal(asks(settings.capabilities), false);
});

test('a manifest that declares push is in force, with its seat and its reason', () => {
  const org = orgWith('capabilities:\n  human_check:\n    shape: push\n    reason: "because nobody answers a silent card"\n');
  const settings = resolveSettings({ pack: packUnder(org) });
  assert.equal(settings.capabilities.humanCheck.shape, 'push');
  assert.equal(settings.capabilities.humanCheck.source, 'org');
  assert.equal(settings.capabilities.humanCheck.seat, 'organiser');
  assert.equal(settings.capabilities.humanCheck.reason, 'because nobody answers a silent card');
  assert.equal(asks(settings.capabilities), true);
});

test('the settings report says which shape is in force and which file put it there', () => {
  const org = orgWith('capabilities:\n  human_check:\n    shape: push\n    reason: "x"\n');
  const settings = resolveSettings({ pack: packUnder(org) });
  const row = settings.provenance.find((p) => p.key === 'capability:human_check');
  assert.ok(row, 'the capability has no provenance row');
  assert.equal(row!.tier, 'capability');
  assert.equal(row!.source, 'org');
  assert.equal(row!.effective, 'push');
});

// --- the shape changes what the runtime DOES -------------------------------------------------

/** Create a card and return the events it wrote. */
const cardEvents = (org: PackedOrg): LoggedEvent[] => {
  const pack = packUnder(org);
  const ctx = makeCtx(pack);
  createCard(ctx, {
    actionClass: 'commit.channel-post',
    agent: 'event-ops',
    origin: { kind: 'event', id: 'event-1' },
    phase: null,
    text: { id: 'Halo', en: 'Hello' },
  });
  return [...ctx.state.events];
};

test('under push, a card that needs a human also writes the request — the runtime asks', () => {
  const events = cardEvents(orgWith('capabilities:\n  human_check:\n    shape: push\n    reason: "x"\n'));
  const request = events.find((e) => e.type === 'ReviewRequested');
  assert.ok(request, 'push wrote no ReviewRequested row — the shape would be a setting with no behaviour');
  assert.equal((request as Extract<FleetEvent, { type: 'ReviewRequested' }>).seat, 'organiser');
});

test('under pull, the card waits and the runtime interrupts nobody', () => {
  const events = cardEvents(orgWith('capabilities:\n  human_check:\n    shape: pull\n    reason: "x"\n'));
  assert.equal(events.some((e) => e.type === 'ReviewRequested'), false);
  assert.equal(events.some((e) => e.type === 'CardCreated'), true, 'the card itself is still there — the check is a floor');
});
