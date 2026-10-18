/**
 * §2.11 — "Copy travels; people do not."
 *
 * A partner community is a third party the organiser vouches for, not a lane the fleet extends, so
 * the four rules of §2.11 all protect one asset: the member's identifier. `promote.cross-community`
 * pushes partner *words* to *our* members; nothing runs the other way. FR-6.1 states the test —
 * "the outbound payload contains zero member identifiers" — and this file is that assertion, as a
 * scan the engine can run ahead of any gate that could deliver.
 *
 * Two bounds, both deliberate, both tested:
 *
 *  - **Registry, not regex.** Only identifiers the fleet actually knows are protected. An unknown
 *    ten-digit string in partner copy is the partner's claim, not our member's number — the fleet
 *    cannot shield data it never saw, and pretending otherwise would be a claim outrunning evidence.
 *  - **A length floor on the bare form.** `wa:62811` is unambiguous; `62811` collides with times,
 *    prices, and dates. A scan that refuses ordinary copy on a false positive is a scan the first
 *    annoyed organiser disables, so short bare ids are matched only in their prefixed form.
 *  - **Refs, because refs are all the fleet holds.** A `Member` is `{ ref, tz, registeredAt }` — no
 *    name, no RSVP row, no handle (`types.ts`). So this file cannot scan for a member's *name*, and
 *    that is not an oversight to close here: a name reaching partner copy is a disclosure and
 *    aggregation question (§2.8, the recap floor in §2.9), owned elsewhere. If the fleet ever holds
 *    names, this scan has to grow with it, and the test that proves the bound must be edited with it.
 *
 * What the refusal says matters as much as when it fires: the audit timeline is member-readable
 * (§2.3), so it names the matched identifiers — the token the organiser must delete — and never the
 * sentence around them.
 */
import { refuse } from './errors.ts';
import type { FleetState } from './types.ts';

/**
 * Below this, a bare token is not distinguishable from a time or a price (see the header). The full
 * `lane:id` ref has no such problem and matches at any length.
 */
export const MIN_BARE_REF_LEN = 4;

/** One member's copy of the leak: who is exposed, and which token form the copy carried. */
export interface MemberLeak {
  ref: string;
  /** The token that actually appeared — may be the bare identifier rather than the stored ref. */
  token: string;
}

/**
 * The tokens that identify a registered member: the ref as stored, plus its bare identifier when the
 * bare form is long enough to be worth matching (see the header). `wa:62811` and `62811` are two
 * spellings of one person, so the scan reports them as one leak, not two.
 */
export function memberIdentifierTokens(state: FleetState): Array<{ ref: string; tokens: string[] }> {
  const out: Array<{ ref: string; tokens: string[] }> = [];
  for (const ref of state.members.keys()) {
    const tokens = [ref];
    const sep = ref.indexOf(':');
    if (sep >= 0) {
      const bare = ref.slice(sep + 1);
      if (bare.length >= MIN_BARE_REF_LEN) tokens.push(bare);
    }
    out.push({ ref, tokens });
  }
  return out;
}

/**
 * Which registered members appear in the given texts. Reports matches per member rather than a
 * boolean and rather than per token: a refusal that cannot name the person the organiser must
 * remove is a dead end (§1.2), and a count of tokens would overstate the exposure.
 */
export function findMemberLeaks(state: FleetState, texts: string[]): MemberLeak[] {
  const hits: MemberLeak[] = [];
  for (const { ref, tokens } of memberIdentifierTokens(state)) {
    // Prefer the prefixed form when both appear: it is the unambiguous spelling of the same member.
    const token = tokens.find((t) => texts.some((text) => text.includes(t)));
    if (token !== undefined) hits.push({ ref, token });
  }
  return hits.sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
}

/**
 * The §2.11 gate for partner-bound content. Called by `engine.commit` whenever a commit names a
 * partner — the only moment copy is travelling toward a third party. Pure check: it logs nothing and
 * mutates nothing; the engine owns the audit record for the refusal.
 */
export function assertNoMemberDataInPartnerCopy(state: FleetState, textId: string, textEn: string): void {
  const leaks = findMemberLeaks(state, [textId, textEn]);
  if (leaks.length === 0) return;
  const who = leaks.map((l) => (l.token === l.ref ? l.ref : `${l.ref} (written bare, as \`${l.token}\`)`)).join(', ');
  refuse('partner_data_leak', 'spec §2.11 / FR-6.1',
    `partner-facing copy carries ${leaks.length} member identifier(s): ${who} — a partnership is not a second lane around the member's own privacy, so the copy is refused rather than redacted: delete the reference and re-approve the revision`);
}
