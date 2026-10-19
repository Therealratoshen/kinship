/**
 * The organisation tier — the tier above the pack, and the reason a pack is not the whole answer.
 *
 * A pack is one community. An operator running three kopvars, a workshop series, and a sponsor
 * newsletter does not have one community; they have several, and the thing those packs must not be
 * able to drift apart on is the member's protections. `orgs/<key>.yaml` is where the shared floor is
 * stated once, so a fork that edits `member_message_cap_per_24h` up to 20 fails against the
 * organisation's number rather than against the validator's generic bound.
 *
 * What this file pins, and why each one is a rule rather than a preference:
 *
 *  - **Exactly one human seat while PRD §12-Q12 stands.** The runtime has one human identity string
 *    (`'organiser'`) and no delegation mechanism, so declaring two seats in a manifest would be a
 *    company setting the code does not have. The refusal names §12-Q12 because the reader of that
 *    failure is the person who is allowed to change it — the owner, not the implementer.
 *  - **A seat name may not also be an agent role.** Otherwise a pack declares an agent called
 *    `organiser` and an agent now holds the human seat — the four seat-gated acts
 *    (decideCard / issueGrant / revokeGrant / releaseShatter) would accept it.
 *  - **`never` is the pack's to declare, not the org's.** Invariant #1 says `never` means *absent*,
 *    and the review is a grep of the pack's toolset. An org ceiling of `never` would make a class
 *    present-but-unreachable, which is exactly the denied-not-absent shape §1.1 forbids.
 *  - **A missing value is not a guess.** The parser is hand-rolled and small, like the pack parser's:
 *    anything it cannot read refuses `org_invalid`, because a parser that guesses is a trust
 *    boundary with holes (pack.ts says the same sentence about the pack half).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOrg } from '../src/org.ts';
import { KinshipError } from '../src/errors.ts';

const MINIMAL = `schema: kinship-org/v1
key: kinshipai
name: Kinship
human_seats:
  - organiser
agent_roles:
  - event-ops
  - engagement
  - moderator
floors:
  member_message_cap_per_24h: 4
  report_aggregation_floor: 5
  identity_disclosure: required
  defaults: deny
autonomy_ceiling:
  commit.channel-post: draft
  promote.cross-community: draft
`;

const codeOf = (fn: () => unknown): string => {
  try { fn(); } catch (e) {
    assert.ok(e instanceof KinshipError, `expected a refusal, got ${e}`);
    return e.code;
  }
  throw new Error('expected a refusal, got a value');
};

test('the minimal org manifest parses into seats, roles, floors, and a ceiling', () => {
  const org = parseOrg(MINIMAL);
  assert.equal(org.schema, 'kinship-org/v1');
  assert.equal(org.key, 'kinshipai');
  assert.equal(org.name, 'Kinship');
  assert.deepEqual(org.humanSeats, ['organiser']);
  assert.deepEqual(org.agentRoles, ['event-ops', 'engagement', 'moderator']);
  assert.equal(org.floors.memberMessageCapPer24h, 4, 'the cap the org will not let a pack exceed');
  assert.equal(org.floors.reportAggregationFloor, 5, 'the floor the org will not let a pack drop below');
  assert.equal(org.floors.identityDisclosure, true);
  assert.equal(org.floors.defaultsDeny, true);
  assert.equal(org.autonomyCeiling['commit.channel-post'], 'draft');
});

test('a manifest is a bare org key, not a pack key — the two namespaces are not interchangeable', () => {
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace('key: kinshipai', 'key: kinshipai/bundled/event-ops/kopdar'))), 'org_invalid',
    'an org that looks like a pack key would resolve to a folder that does not exist');
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace('key: kinshipai', 'key: Kinship AI'))), 'org_invalid');
});

test('the schema is checked before anything is read, like the pack half (D15)', () => {
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace('schema: kinship-org/v1', 'schema: kinship/v1'))), 'org_invalid',
    'a pack manifest read as an org manifest is a tier collision, not a typo to forgive');
});

test('an org with no human seat is an unattended fleet, and the manifest is where that is caught', () => {
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace(/^human_seats:\n  - organiser\n/m, 'human_seats: []\n'))), 'org_invalid',
    'spec §2.7 puts approval and veto with a named human — a manifest with no seat cannot boot one');
});

test('TWO human seats refuse, naming PRD §12-Q12 — the shape exists, the delegation does not', () => {
  const two = MINIMAL.replace('  - organiser\n', '  - organiser\n  - delegate\n');
  try { parseOrg(two); assert.fail('a second human seat must not parse while §12-Q12 is unanswered'); }
  catch (e) {
    assert.ok(e instanceof KinshipError);
    assert.equal(e.code, 'org_invalid');
    assert.match(e.message, /12-Q12/, 'the reader of this failure is the owner, so the failure names his open question');
    assert.match(e.message, /delegate/, 'it must name the seat it refused, not just the count');
  }
});

test('a seat name cannot also be an agent role — that is how an agent acquires the human seat', () => {
  const collision = MINIMAL.replace('  - event-ops\n', '  - event-ops\n  - organiser\n');
  assert.equal(codeOf(() => parseOrg(collision)), 'org_invalid',
    'decideCard/issueGrant/revokeGrant/releaseShatter all accept a seat name; a roster containing one would widen them');
});

test('an org autonomy_ceiling may not say `never` — that is the pack\'s to declare (§1.1, invariant #1)', () => {
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace('commit.channel-post: draft', 'commit.channel-post: never'))), 'org_invalid',
    'a central `never` would make a class present-but-unreachable; `never` means the tool is absent from the pack');
});

test('a ceiling value that is not on the ladder refuses — an unset class is not a loophole either way', () => {
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace('commit.channel-post: draft', 'commit.channel-post: auto'))), 'org_invalid');
});

test('a floor that is not a number refuses rather than becoming the default', () => {
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace('member_message_cap_per_24h: 4', 'member_message_cap_per_24h: low'))), 'org_invalid',
    'a parser that guesses turns a company setting into a silent one');
});

test('floors are optional: an org only holds what it names, and the values it names are its floors', () => {
  const org = parseOrg(`schema: kinship-org/v1
key: kopdar-held
name: Kopdar Held
human_seats:
  - organiser
agent_roles: []
`);
  assert.deepEqual(org.floors, {}, 'no floors declared — the pack keeps its own numbers');
  assert.deepEqual(org.autonomyCeiling, {});
  assert.deepEqual(org.humanSeats, ['organiser']);
});

test('a duplicate seat or role is a refused shape, not a silently deduped list', () => {
  // Same defect class as the duplicate-key error D27 recorded in errors.ts: a list that dedupes
  // hides the second declaration, and the second declaration was someone's intent.
  assert.equal(codeOf(() => parseOrg(MINIMAL.replace('  - engagement\n', '  - engagement\n  - engagement\n'))), 'org_invalid');
});

test('the refusal carries the manifest identity so a multi-org repo knows which file failed', () => {
  try { parseOrg(MINIMAL.replace('key: kinshipai', 'key: other-org').replace('commit.channel-post: draft', 'commit.channel-post: never')); assert.fail(); }
  catch (e) {
    assert.ok(e instanceof KinshipError);
    assert.match(e.message, /other-org/, 'which org, not just what — the org tier is the one place several files share a shape');
  }
});
