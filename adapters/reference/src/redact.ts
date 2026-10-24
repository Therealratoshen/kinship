/**
 * Redaction — the mechanism behind "never attach a raw log to a public issue".
 *
 * The log carries member **identifiers** and never member message text. That is a good privacy
 * design and a bad sharing story: a community manager who wants a maintainer to look at a log has no
 * way to share it, because the identifiers in it are real people. So the answer cannot be "be careful".
 *
 * **What redaction does, and what it deliberately does not.**
 *
 *  - Every member identifier is replaced by a **stable pseudonym** — the same member is the same
 *    pseudonym everywhere in the log, because a redacted log that cannot tell two members apart is
 *    useless for the thing it is for (a maintainer asking "how many distinct people did this touch?").
 *  - **The scan is over VALUES, not over key names.** It used to be over key names — `memberRef`,
 *    `ref`, `recipient`, `pointer` — and anything else passed through untouched, so a new event
 *    field or an adapter-added field carried the identifier straight out of a shared log wearing a
 *    different key. **Redaction failed open.** The rule is now the runtime's own: the members the
 *    log knows, and their identifiers scanned for in *every* string, whatever the key is called
 *    (`kinship-runtime/src/partner.ts` → `memberTokensFor`). **Two rules for one privacy property is
 *    one rule too many**, so the redaction asks the runtime's rule instead of inventing a weaker
 *    one (D90).
 *  - The **structure is untouched**: the event types, the order, the `seq`, the action classes, the
 *    refusal codes, the reason strings. A redacted log still folds to the same state, so a maintainer
 *    can replay it and check the governance held.
 *  - **The pseudonyms are NOT reversible and carry no meaning.** They are numbered, not derived from
 *    the original, and the mapping is not written anywhere. A redaction that leaked the mapping
 *    would be a redaction in name only.
 *  - **The draft copy is not rewritten.** The copy is the community's own words and the thing under
 *    review; replacing it would leave a log nobody can check. (Member *message text* is not in the log
 *    in the first place — see `runtime/src/containment.ts`.) **What is still withheld inside a copy is
 *    an identifier**: the promise is that no member identifier survives a redaction, and a copy that
 *    names one breaks it.
 *  - **The manifest is redacted too**, and it says so, so a reader knows the artefact is a redacted
 *    copy and not the original. The answers digest is kept: it is a digest of the community's *answers*,
 *    and it is what lets a reader check that the log and the pack belong together.
 *
 * **And the limit, said plainly.** Redaction removes the identifiers. It cannot remove **the shape**:
 * a log about a three-person community is still a small log, and a maintainer who reads it still
 * learns that three people exist. **A redacted log of a tiny community is still a leak of a small
 * community.** That is why this is a convenience and not a clearance — the way to share a log
 * publicly is to share one from a community big enough that the shape is not the story.
 *
 * **The other limit, also plain.** The scan knows the members **this log** knows — the ones it
 * registered. A member named in a log that never registered them is invisible to it, exactly as it
 * is to the runtime's own scan. The runtime's rule and this one are the same rule, so they have the
 * same reach, and neither pretends to more.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { memberTokensFor } from 'kinship-runtime/src/partner.ts';

/** A member identifier, and the pseudonym it becomes. */
interface Mapping {
  byRef: Map<string, string>;
  next: number;
}

/**
 * The member identifiers this log knows.
 *
 * Two sources, and both are the log's own: the `MemberRegistered` rows, and any value sitting under
 * a key the runtime itself uses for a member reference. The second matters for a log that starts
 * part-way through — the member was registered in an earlier file, and this file is all there is.
 */
function refsIn(rows: readonly unknown[]): string[] {
  const refs = new Set<string>();
  const REF_KEYS = new Set(['memberRef', 'ref', 'recipient']);
  const walk = (node: unknown, key: string | null): void => {
    if (Array.isArray(node)) {
      for (const n of node) walk(n, key);
      return;
    }
    if (node === null || typeof node !== 'object') {
      if (key !== null && REF_KEYS.has(key) && typeof node === 'string' && node !== '') refs.add(node);
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'member' && v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const r = (v as Record<string, unknown>).ref;
        if (typeof r === 'string' && r !== '') refs.add(r);
      }
      walk(v, k);
    }
  };
  for (const row of rows) walk(row, null);
  return [...refs];
}

/**
 * Replace every member identifier with a stable pseudonym.
 *
 * The identifiers the runtime knows are member refs (`wa:62811`, `member:…`), and they appear in a
 * handful of places: `MemberRegistered.member.ref`, `SuppressionRecorded.row.memberRef`, a card's
 * origin, a thread's `memberRef`, a commit's `recipients` array, and `commitsByMember`'s map keys.
 * Each is replaced in place, so the redacted log has the same shape as the original — and now so
 * does an identifier in a key nobody has heard of, because the scan is over the value.
 */
export function redactEvents(rows: readonly unknown[]): { rows: unknown[]; pseudonyms: number } {
  const mapping: Mapping = { byRef: new Map(), next: 1 };
  const pseudonymFor = (ref: string): string => {
    let p = mapping.byRef.get(ref);
    if (p === undefined) {
      p = `member-${mapping.next}`;
      mapping.next += 1;
      mapping.byRef.set(ref, p);
    }
    return p;
  };

  // The runtime's rule, asked of the members this log knows. Longest token first, so `wa:62811` is
  // replaced before `62811` and one person is substituted once, not twice.
  const tokens = memberTokensFor(refsIn(rows))
    .flatMap((m) => m.tokens.map((t) => ({ token: t, ref: m.ref })))
    .sort((a, b) => b.token.length - a.token.length);

  /** Every identifier token in a string, replaced by the pseudonym of the member it names. */
  const redactText = (s: string): string => {
    let out = s;
    for (const { token, ref } of tokens) {
      if (out.includes(token)) out = out.split(token).join(pseudonymFor(ref));
    }
    return out;
  };

  const redactRef = (v: unknown): unknown => (typeof v === 'string' && v !== '' ? redactText(v) : v);

  /** An opaque handle gets a pseudonym of its own — it names a message, not a member. */
  const redactHandle = (v: unknown): unknown => (typeof v === 'string' && v !== '' ? pseudonymFor(v) : v);

  const walk = (node: unknown, key: string | null): unknown => {
    if (Array.isArray(node)) return node.map((n) => walk(n, key));
    if (node === null || typeof node !== 'object') {
      // A leaf that is a string may carry an identifier anywhere inside it — "message wa:62811" is
      // as much an exposure as a bare "wa:62811", and the key it hides under does not matter.
      return typeof node === 'string' ? redactText(node) : node;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      // `pointer` is not a member reference — it is an opaque handle to a message, and it names
      // somebody too, so it is replaced by a pseudonym of its own. The member identifiers are
      // handled by the value scan, which does not care what the key is called.
      if (k === 'pointer') {
        out[k] = redactHandle(v);
        continue;
      }
      if (k === 'recipients') {
        out[k] = Array.isArray(v) ? v.map((n) => redactRef(n)) : redactRef(v);
        continue;
      }
      out[k] = walk(v, k);
    }
    return out;
  };

  const rows2 = rows.map((r) => walk(r, null));
  return { rows: rows2, pseudonyms: mapping.next - 1 };
}

/**
 * Redact a log file in place-safe fashion: write the redacted rows to `outPath`, and a redacted
 * manifest beside it.
 *
 * The ORIGINAL is never touched. A redaction tool that overwrites the source is one keystroke away
 * from destroying the only record of what happened.
 */
export function redactLog(args: {
  eventsPath: string;
  manifestPath?: string;
  outDir: string;
}): { eventsPath: string; manifestPath: string | null; pseudonyms: number; rows: number } {
  const raw = readFileSync(args.eventsPath, 'utf8');
  const rows = raw.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as unknown);
  const { rows: redacted, pseudonyms } = redactEvents(rows);

  const outEvents = `${args.outDir}/events.redacted.jsonl`;
  writeFileSync(outEvents, redacted.map((r) => JSON.stringify(r)).join('\n') + '\n', { mode: 0o600 });

  let outManifest: string | null = null;
  if (args.manifestPath !== undefined) {
    try {
      const manifest = JSON.parse(readFileSync(args.manifestPath, 'utf8')) as Record<string, unknown>;
      const redactedManifest = {
        ...manifest,
        redacted: true,
        redaction: {
          what: 'member identifiers were replaced by stable, non-reversible pseudonyms',
          pseudonyms,
          note: 'the original is untouched; this copy exists so a log can be shared without naming anybody',
        },
      };
      outManifest = `${args.outDir}/manifest.redacted.json`;
      writeFileSync(outManifest, JSON.stringify(redactedManifest, null, 2) + '\n', { mode: 0o600 });
    } catch {
      outManifest = null; // a missing or unreadable manifest is not a reason to fail the redaction
    }
  }

  return { eventsPath: outEvents, manifestPath: outManifest, pseudonyms, rows: rows.length };
}
