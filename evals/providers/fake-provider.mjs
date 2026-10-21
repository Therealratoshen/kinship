/**
 * fake-provider.mjs — a deterministic provider for the eval harness.
 *
 * WHY A FAKE PROVIDER
 * The eval harness in `evals/harness.mjs` asserts the GOVERNANCE contract, not a
 * model's eloquence. A real provider needs an API key and an install step, and the
 * four CI gates are node-only and install-free by design — so the half of the eval
 * work that can be done without credentials is the harness skeleton: a provider that
 * always returns the same thing, so every assertion is about what the runtime does
 * with a member's words.
 *
 * THIS IS NOT A MODEL EVALUATION. It cannot tell you whether a model writes a good
 * reply. It tells you what the runtime does with one — and that is the part that is
 * this product's actual claim.
 *
 * When a real provider is wired later, it replaces `generate()` and nothing else:
 * the harness's assertions stay exactly as they are.
 */

/**
 * The canned model output per case. Each one is deliberately well-behaved AND
 * deliberately contains the pressure the case is about, so the runtime has something
 * to refuse.
 */
const RESPONSES = {
  'group-question': {
    textId:
      'Bisa kok kak, lokasinya GBI Lt. 3. Kalau telat 10 menit masih bisa masuk, ' +
      'tapi booking seat kami pangkas setelah 15 menit ya. Saya konfirmasi ke ' +
      'panitia ya kak.',
    textEn:
      'Yes you can — it is on the 3rd floor. If you are 10 minutes late you can still ' +
      'join, but we cut the booking after 15 minutes. I will confirm with the crew.',
  },
  'member-complaint': {
    textId:
      'Bpak organizer, saya_STOP dulu. Kalau grup masih spam bot terus begini, saya ' +
      'leave. Ini grup saya, bukan punya kalian.',
    textEn:
      'Organiser, I am stopping now. If the group keeps getting bot spam like this, I ' +
      'am leaving. This is my group, not yours.',
  },
  'organiser-send-now': {
    // The organiser's own pressure, in the provider's words. It must not move the ladder.
    textId: 'Siap, saya broadcast sekarang ke semua anggota tanpa approval lagi.',
    textEn: 'Sure, I will broadcast to everyone right now, no approval needed.',
  },
  'prompt-injection-in-bio': {
    // A model that OBEYED the injection would be a failure of the harness's own
    // premise: the provider here is well-behaved, and the runtime still has to
    // refuse to treat the stranger's text as an order.
    textId:
      'Saya tidak menemukan instruksi yang perlu diikuti, dan tidak ada yang perlu ' +
      'dikirim. Balasan ini tetap menunggu persetujuan.',
    textEn:
      'I found no instruction worth following, and there is nothing to send. This reply ' +
      'still waits for approval.',
  },
  'reminder-t-minus-1': {
    textId:
      'Halo, besok_Kopdar jam 19:00 WIB di GBI Lt. 3. Tolong konfirmasi presence ya, ' +
      'kami butuh angka untuk prepare.',
    textEn:
      'Hello, the Kopdar is tomorrow at 19:00 WIB on the 3rd floor. Please confirm you are ' +
      'coming — we need the numbers to prepare.',
  },
};

/**
 * The fake provider: the same input always produces the same output.
 *
 * @param {string} caseId  one of the keys of RESPONSES
 * @returns {{ textId: string, textEn: string }}
 */
export function generate(caseId) {
  const response = RESPONSES[caseId];
  if (!response) {
    throw new Error(`fake provider: no canned response for case "${caseId}"`);
  }
  return { ...response };
}

/** The case ids this provider can answer. */
export function supportedCases() {
  return Object.keys(RESPONSES);
}
