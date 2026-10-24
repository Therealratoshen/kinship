/**
 * section 2.8 identity disclosure — a product surface, not a compliance footnote. Every member-facing
 * utterance identifies itself as an agent in a way that is *not imitation*: one canonical,
 * deterministic line per language, carrying the community's name, an explicit "not a human",
 * and the escalation path (section 2.4). An improvised "I'm an AI" paragraph does not satisfy the gate
 * — the line is canonical precisely so a member (and a reviewer) can predict what disclosure
 * looks like and notice its absence.
 *
 * The line lives IN the approved revision, not stamped at send time: the organiser approves
 * the exact bytes that ship, disclosure included (section 1.5). The commit gate refuses a send whose
 * revision lacks it.
 */
import { refuse } from './errors.ts';

/**
 * The languages, the pairs a community may declare, and the disclosure line in each.
 *
 * These used to live here as a hard-coded Indonesian/English pair with two named functions — and the
 * FIELD NAMES in every card said the same thing. The languages now live in `src/locales.ts`, which
 * is the single source of truth: a pack's declared `locale:` is checked against the pairs there, the
 * canonical disclosure line exists for each language there, and the copy the runtime writes on its own
 * (the budget-stop card, the escalation card) is there too. A language with a disclosure line but no
 * runtime copy would leave the runtime raising its own cards in the wrong language, so the pair is
 * refused rather than half-supported.
 */
export { LOCALES, SUPPORTED_LOCALE_PAIRS, DEFAULT_LOCALE_PAIR, localeIsSupported, localeSpec } from './locales.ts';
export type { LocaleSpec, LocaleText } from './locales.ts';

import { LOCALES, localeSpec } from './locales.ts';
import type { LocaleText } from './locales.ts';

/** The canonical disclosure line in one language. */
export function disclosureLine(language: string, community: string): string {
  const spec = localeSpec(language);
  if (spec === undefined) {
    refuse('pack_invalid', 'spec section 2.8 / FR-5',
      `this runtime does not implement \`${language}\` — a disclosure line the runtime cannot produce canonically is not disclosure`);
  }
  return spec.disclosure(community);
}

/** The disclosure line in the community's primary language — the one a preview leads with. */
export function disclosureLineFor(text: LocaleText, locale: readonly string[], community: string): string {
  return disclosureLine(locale[0] ?? 'en', community);
}

/**
 * The gate: EVERY declared language carries the canonical line, or the send refuses (fail closed).
 *
 * The languages are the community's own pair, in its own order — so this is no longer "Indonesian and
 * English" but "whatever this community runs in", which is the only version of the rule that was ever
 * true.
 */
export function assertDisclosed(text: LocaleText, community: string, locale: readonly string[]): void {
  for (const language of locale) {
    const line = disclosureLine(language, community);
    if (!(text[language] ?? '').includes(line)) {
      refuse('disclosure_missing', 'spec section 2.8 / FR-5',
        `a member-facing send carries the canonical disclosure line in every declared language — \`${language}\` is missing it, and an improvised AI mention is not disclosure`);
    }
  }
}

/**
 * FR-5.1 answerability, the internal half. `assertAnswerability` below refuses a *member-facing*
 * commit that names no human; an internal commit may legitimately have none — but it may not
 * borrow one. The field has no backfill path (FR-5.1), so a log line that quietly defaults to the
 * organiser is an attribution no later review can correct, fabricated at the moment of writing.
 */
export const UNATTRIBUTABLE = 'unattributable';

export function answerableBy(onBehalfOf: string | undefined): string {
  return onBehalfOf !== undefined && onBehalfOf.trim() !== '' ? onBehalfOf : UNATTRIBUTABLE;
}

/**
 * FR-5.1 answerability: a member-facing commit names the human it answers to. A fleet that
 * cannot name its human is an unattended bot with better manners (pack needs.escalation_contact).
 */
export function assertAnswerability(onBehalfOf: string | undefined): void {
  if (onBehalfOf === undefined || onBehalfOf.trim() === '') {
    refuse('answerability_missing', 'spec section 2.9 / FR-5.1', 'a member-facing commit carries on_behalf_of — the named human who answers for it');
  }
}
