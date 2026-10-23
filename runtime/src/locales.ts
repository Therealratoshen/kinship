/**
 * The languages this runtime implements, and the pairs a community may run in.
 *
 * **Before this existed, the runtime spoke exactly one language pair — Indonesian and English — and
 * the FIELD NAMES said so.** `textId` and `textEn` were not just two strings; they were a promise that
 * this product serves Indonesian communities, written into the shape of every card, every revision hash
 * and every log line. That is why "cover Dubai" was not a pack edit: a community in English and Arabic
 * could not be expressed, because the copy's field names had already decided the answer.
 *
 * So the copy is now a **map keyed by language code** (`LocaleText`), the pair is a **pack-level
 * declaration**, and this file is the single source of truth for both.
 *
 * **The pair is still a pair.** PRD FR-5.6 keeps broadcast copy on two languages — per-recipient
 * language is phase 2 — so a community runs in a declared PAIR and every member-facing artefact
 * carries both. What changed is *which* pairs, and that the code no longer hard-codes one of them.
 *
 * **And the new pair is not a claim about a culture.** Arabic is here because a community in Dubai
 * needs it, and the disclosure line has to be *canonical* in whatever language the community reads
 * (FR-5 / §2.8) — an improvised translation that drifts from the source would be a disclosure gate that
 * passes for the wrong reason. What a community *tolerates* — whether it wants being approached, whether
 * it is discoverable — is the **posture** (§2.15), declared by the community, and still not a table
 * this runtime carries.
 */

/**
 * One language: the code, and the copy the runtime itself writes in it.
 *
 * The runtime writes its own copy in exactly two places — the budget-stop card and the escalation card
 * — and it writes the canonical disclosure line for every language. Those are the strings a community
 * reads whether or not a human drafted them, so they belong with the language, not in the modules that
 * happen to raise them.
 */
export interface LocaleSpec {
  /** The BCP-47-ish code a pack declares. */
  code: string;
  /** The canonical disclosure line (FR-5 / §2.8) — deterministic, carrying the community's name. */
  disclosure: (community: string) => string;
  /** The budget-stop card the runtime raises (§1.6). */
  budgetStop: (eventId: string, wouldBe: number, ceiling: number) => string;
  /** The escalation card the runtime raises (§2.4). */
  escalation: (purpose: string, to: string) => string;
}

/**
 * Every language this runtime implements.
 *
 * A language here means three strings the runtime can produce in it: the disclosure line every
 * member-facing send must carry, and the two cards the runtime raises on its own. A language with a
 * disclosure line but no runtime copy would still be usable — but the runtime's own cards would then
 * be written in the wrong language, so the pair is refused rather than half-supported.
 */
export const LOCALES: Readonly<Record<string, LocaleSpec>> = {
  id: {
    code: 'id',
    disclosure: (community) => `pesan ini dikirim oleh asisten otomatis komunitas ${community} — bukan oleh manusia. balas di sini untuk eskalasi ke organiser.`,
    budgetStop: (eventId, wouldBe, ceiling) =>
      `Anggaran habis: Rp ${wouldBe} dari plafon Rp ${ceiling} untuk ${eventId}. Fase terjadwal tidak dilewatkan diam-diam — putuskan lanjut atau naikkan plafon.`,
    escalation: (purpose, to) => `Eskalasi: ${purpose}. Butuh keputusan ${to}.`,
  },
  en: {
    code: 'en',
    disclosure: (community) => `this message was sent by the automated assistant of ${community} — not a human. reply here to escalate to the organiser.`,
    budgetStop: (eventId, wouldBe, ceiling) =>
      `Budget exhausted: Rp ${wouldBe} of the Rp ${ceiling} ceiling for ${eventId}. Scheduled phases are not silently dropped — decide whether to continue or raise the ceiling.`,
    escalation: (purpose, to) => `Escalation: ${purpose}. Needs a decision from ${to}.`,
  },
  ar: {
    code: 'ar',
    // Arabic. The gate is that this line is CANONICAL — the same sentence the runtime promises — and
    // that it names the community, says plainly that it is not a human, and gives the way to reach a
    // human. A vaguer "this is an AI" would be a different promise, and a member reading it should
    // get the same guarantee as a member reading the English one.
    disclosure: (community) =>
      `أُرسلت هذه الرسالة بواسطة المساعد الآلي لـ ${community} — وليست من إنسان. الردّ هنا لتحويلها إلى المنظّم.`,
    budgetStop: (eventId, wouldBe, ceiling) =>
      `نفدت الميزانية: ${wouldBe} من سقف ${ceiling} للحدث ${eventId}. لا تُسقط المراحل المجدولة بصمت — قرّر الاستمرار أو ارفع السقف.`,
    escalation: (purpose, to) => `تصعيد: ${purpose}. يحتاج قرارًا من ${to}.`,
  },
};

/**
 * The pairs a community may declare.
 *
 * An ordered pair: the FIRST code is the community's primary language — the one its own copy leads
 * with, and the one the organiser's inbox previews. The second is its paired language, and PRD FR-5.6
 * keeps broadcast copy on both.
 */
export const SUPPORTED_LOCALE_PAIRS: readonly (readonly [string, string])[] = [
  ['id', 'en'],
  ['en', 'ar'],
];

/** The pair a pack gets when it says nothing — the pair this runtime shipped with. */
export const DEFAULT_LOCALE_PAIR: readonly [string, string] = ['id', 'en'];

/** True when a declared locale list is exactly a pair this runtime implements, in its order. */
export function localeIsSupported(locale: readonly string[]): boolean {
  return SUPPORTED_LOCALE_PAIRS.some(
    (pair) => pair.length === locale.length && pair.every((l, i) => l === locale[i]),
  );
}

/** The spec for a language code, or `undefined` if this runtime does not implement it. */
export function localeSpec(code: string): LocaleSpec | undefined {
  return LOCALES[code];
}

/**
 * The member-facing copy of an artefact, in the community's declared languages.
 *
 * A map keyed by language code, because the codes are the only thing that should decide what a
 * string is — and a map generalises to a third language without another field, which is the whole
 * point of doing this refactor.
 */
export type LocaleText = Record<string, string>;

import { refuse } from './errors.ts';

/**
 * The runtime's OWN copy, in every language the community declared.
 *
 * The runtime writes two things by itself — the budget-stop card (§1.6) and the escalation card
 * (§2.4) — and a community reads them whether or not a human drafted them. So they are written in
 * the community's languages, not in the runtime's: a card raised in Indonesian to a community that
 * reads English and Arabic is a card nobody can act on.
 */
export function localeCopy(
  ctx: { pack: { locale: readonly string[] } },
  which: 'budgetStop' | 'escalation',
  build: (spec: LocaleSpec) => string,
): LocaleText {
  const out: LocaleText = {};
  for (const language of ctx.pack.locale) {
    const spec = localeSpec(language);
    if (spec === undefined) {
      refuse('pack_invalid', 'spec §2.8 / FR-5',
        `this runtime does not implement \`${language}\` — the copy it writes on its own would have nowhere to be written`);
    }
    out[language] = build(spec);
  }
  return out;
}

/**
 * The copy of an artefact, joined in the community's declared language order — the string a revision
 * hash is taken over.
 *
 * The ORDER is the pack's, not the map's: `Object.keys` on a copy object gives insertion order, and
 * two packs that write the same two strings in a different order are two different artefacts. So the
 * join is taken over the pack's declared pair, which is the same order the disclosure gate and the
 * organiser's preview use.
 */
export function localeTextForHash(text: LocaleText, locale: readonly string[]): string {
  return locale.map((l) => text[l] ?? '').join('\u2044\u2044');
}
