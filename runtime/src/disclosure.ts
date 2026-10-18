/**
 * §2.8 identity disclosure — a product surface, not a compliance footnote. Every member-facing
 * utterance identifies itself as an agent in a way that is *not imitation*: one canonical,
 * deterministic line per language, carrying the community's name, an explicit "not a human",
 * and the escalation path (§2.4). An improvised "I'm an AI" paragraph does not satisfy the gate
 * — the line is canonical precisely so a member (and a reviewer) can predict what disclosure
 * looks like and notice its absence.
 *
 * The line lives IN the approved revision, not stamped at send time: the organiser approves
 * the exact bytes that ship, disclosure included (§1.5). The commit gate refuses a send whose
 * revision lacks it.
 */
import { refuse } from './errors.ts';

export function disclosureLineId(community: string): string {
  return `pesan ini dikirim oleh asisten otomatis komunitas ${community} — bukan oleh manusia. balas di sini untuk eskalasi ke organiser.`;
}

export function disclosureLineEn(community: string): string {
  return `this message was sent by the automated assistant of ${community} — not a human. reply here to escalate to the organiser.`;
}

/** The gate: both languages carry the canonical line, or the send refuses (fail closed). */
export function assertDisclosed(textId: string, textEn: string, community: string): void {
  if (!textId.includes(disclosureLineId(community)) || !textEn.includes(disclosureLineEn(community))) {
    refuse('disclosure_missing', 'spec §2.8 / FR-5', 'a member-facing send carries the canonical disclosure line in both languages — an improvised AI mention is not disclosure');
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
    refuse('answerability_missing', 'spec §2.9 / FR-5.1', 'a member-facing commit carries on_behalf_of — the named human who answers for it');
  }
}
