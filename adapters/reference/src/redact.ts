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
 *  - The **structure is untouched**: the event types, the order, the `seq`, the action classes, the
 *    refusal codes, the reason strings. A redacted log still folds to the same state, so a maintainer
 *    can replay it and check the governance held.
 *  - **The pseudonyms are NOT reversible and carry no meaning.** They are numbered, not derived from
 *    the original, and the mapping is not written anywhere. A redaction that leaked the mapping
 *    would be a redaction in name only.
 *  - **The draft copy is NOT redacted.** The copy is the community's own words and the thing under
 *    review; redacting it would leave a log nobody can check. (Member *message text* is not in the log
 *    in the first place — see `runtime/src/containment.ts`.)
 *  - **The manifest is redacted too**, and it says so, so a reader knows the artefact is a redacted
 *    copy and not the original. The answers digest is kept: it is a digest of the community's *answers*,
 *    and it is what lets a reader check that the log and the pack belong together.
 *
 * **And the limit, said plainly.** Redaction removes the identifiers. It cannot remove **the shape**:
 * a log about a three-person community is still a small log, and a maintainer who reads it still
 * learns that three people exist. **A redacted log of a tiny community is still a leak of a small
 * community.** That is why this is a convenience and not a clearance — the way to share a log
 * publicly is to share one from a community big enough that the shape is not the story.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** A member identifier, and the pseudonym it becomes. */
interface Mapping {
  byRef: Map<string, string>;
  next: number;
}

/**
 * Replace every member identifier with a stable pseudonym.
 *
 * The identifiers the runtime knows are member refs (`wa:62811`, `member:…`), and they appear in a
 * handful of places: `MemberRegistered.member.ref`, `SuppressionRecorded.row.memberRef`, a card's
 * origin, a thread's `memberRef`, a commit's `recipients` array, and `commitsByMember`'s map keys.
 * Each is replaced in place, so the redacted log has the same shape as the original.
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

  const redactRef = (v: unknown): unknown => (typeof v === 'string' && v !== '' ? pseudonymFor(v) : v);

  const walk = (node: unknown, key: string | null): unknown => {
    if (Array.isArray(node)) return node.map((n) => walk(n, key));
    if (node === null || typeof node !== 'object') return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      // The keys that hold a member identifier, and nothing else. `member` is walked INTO rather
      // than replaced — it is an object, and its `ref` is the identifier.
      if (k === 'memberRef' || k === 'ref' || k === 'recipient' || k === 'pointer') {
        out[k] = redactRef(v);
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
