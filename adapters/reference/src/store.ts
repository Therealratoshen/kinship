/**
 * The writer — seam 3, the host's half.
 *
 * The runtime never writes a file: `runtime/src` may touch `node:fs` in `pack.ts` alone, read-only,
 * and a writer inside it would fail the boundary gate on purpose (D32). So the format lives here,
 * beside the host that owns it, and the runtime keeps the *verification* (a pure read) where the
 * semantics belong.
 *
 * **Two files, and the split is the point.**
 *
 *   `events.jsonl`   one `LoggedEvent` per line, `seq` ascending, nothing else — so the file is
 *                    byte-for-byte the input `Fleet.replay` expects, and there is no filtering rule
 *                    a host can get wrong.
 *   `manifest.json`  the cover — never fed to `replay`. It says which community the log belongs to,
 *                    how many rows it holds, which answers it was written under, and what a reader
 *                    must know before they open it.
 *
 * The answers' **values stay out of the manifest**; a digest and the key names go in. One of the
 * eight answers is `escalation_contact` — a named human — and a log that travels to a co-organiser
 * should not carry a second person's identifier. Drift shows up as a digest mismatch instead.
 */
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { hashText } from 'kinship-runtime/src/store.ts';
import { answersDigest } from 'kinship-runtime/src/log.ts';
import type { LoggedEvent, NeedAnswers } from 'kinship-runtime/src/types.ts';

/**
 * The format version. A reader must **refuse a higher version, never clamp it** — the D35 rule
 * ("refuse, never clamp") applied to a file format.
 */
/**
 * The log format version.
 *
 * **2** because the content hash widened from 64 to 128 bits (D70). A log written by a v1 host
 * still *replays* — its rows carry their own hashes — but a v1 **manifest**'s `answersDigest` was
 * computed with the old width, so the two no longer agree, and the manifest says so rather than
 * leaving a reader to guess which half is stale.
 */
export const FORMAT_VERSION = 2;

/** The cover. Every field says something a reader needs before they trust the rows. */
export interface Manifest {
  formatVersion: number;
  packKey: string;
  packSchema: string;
  /** So "the pack changed under the log" is visible. */
  packDigest: string;
  nodeVersion: string;
  firstSeq: number | null;
  lastSeq: number | null;
  /** From the rows, not from prose. */
  rowCount: number;
  /** The `needs:` answers this log was written under — the digest, never the values. */
  answersDigest: string;
  answerKeys: string[];
  /**
   * The privacy posture, stated *in* the artefact so it travels with the file — and precise, because
   * a field that overstates would be worse than no field at all:
   *
   *  - member **identifiers** do land in the log (a member reference on an input or a suppression);
   *  - member **message text** does not — the log carries a hash, never the text;
   *  - the **draft copy** does: `CardCreated` carries the bilingual revision, because an approval
   *    binds to the exact bytes that would ship. So "no message text" is true of what a *member
   *    wrote*, and false of what the *fleet drafted* — and saying only the first would read as the
   *    second.
   */
  memberDataInFile: true;
  memberMessageTextStored: false;
  draftCopyInFile: true;
  /** Seam 3's sentence, machine-readable. */
  retentionOwner: 'host';
  /** The regeneration discipline every audit artefact in this repo carries: the reader re-runs rather than trusts. */
  verifyCommand: string;
}

/** Where a pack's two files live: `logs/<pack-key>/`. */
export function logDirFor(logRoot: string, packKey: string): string {
  return join(logRoot, ...packKey.split('/'));
}

/** A digest of the pack folder: the sorted relative paths and their contents. */
export function packDigest(packDir: string): string {
  const parts: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else parts.push(`${relative(packDir, path).split(sep).join('/')}\n${readFileSync(path, 'utf8')}`);
    }
  };
  walk(packDir);
  return hashText(parts.join('\n'));
}

/** Read the rows. A malformed line is a refusal, not a skipped row. */
export function readEvents(eventsPath: string): LoggedEvent[] {
  if (!existsSync(eventsPath)) return [];
  const rows: LoggedEvent[] = [];
  const lines = readFileSync(eventsPath, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === '') continue;
    try {
      rows.push(JSON.parse(line) as LoggedEvent);
    } catch {
      throw new Error(`${eventsPath}:${i + 1} is not a JSON row — the file is not what this runtime wrote`);
    }
  }
  return rows;
}

/**
 * Append rows. The file is append-only: a row is never rewritten in place.
 *
 * **Under a single-writer lock, and reconciled against what is already on disk.**
 *
 * The `seq` of a row comes from the writer's in-memory state, so two hosts that booted from the same
 * log would each believe they own the next number — and the file would carry two rows with the same
 * `seq`. That is not a theoretical hazard: it is what the D68 test reproduces, and a duplicate `seq`
 * is a log that replays to a different state on a different machine.
 *
 * So the append takes an **exclusive lock** for its duration, and **re-reads the file under that
 * lock**: if the file's last `seq` is not the one this writer expected to continue from, the writer
 * refuses instead of writing a duplicate. One writer, many readers — the other processes read the log
 * and hand their intents to the writer (seam 3: the store is the host's).
 */
export function appendEvents(eventsPath: string, rows: readonly LoggedEvent[]): void {
  if (rows.length === 0) return;
  mkdirSync(join(eventsPath, '..'), { recursive: true });
  const lock = withLogLock(eventsPath, () => {
    // Reconcile: what is on disk is the truth, not what this writer remembers.
    const onDisk = readEvents(eventsPath);
    const lastOnDisk = onDisk.length > 0 ? onDisk[onDisk.length - 1]!.seq : 0;
    const first = rows[0]!.seq;
    if (first !== lastOnDisk + 1) {
      throw new Error(
        `${eventsPath} is at seq ${lastOnDisk} and this writer is holding seq ${first} — another writer has ` +
        'advanced the log, so these rows would duplicate a sequence number. ONE writer per log: the others ' +
        'read it and hand their intents to the writer.',
      );
    }
    appendFileSync(eventsPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', { mode: 0o600 });
  });
  void lock;
}

/**
 * Run `fn` holding an exclusive lock on this log.
 *
 * The lock is a file created with `wx` (exclusive create), so exactly one process can hold it. It
 * carries the holder's pid, so a lock left behind by a process that died is **taken over** rather
 * than blocking the log forever — a lock nobody can clear is a log nobody can write.
 */
export function withLogLock<T>(eventsPath: string, fn: () => T): T {
  const lockPath = `${eventsPath}.lock`;
  mkdirSync(join(eventsPath, '..'), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lockPath, 'wx', 0o600);
      try {
        writeFileSync(fd, String(process.pid));
        return fn();
      } finally {
        closeSync(fd);
        try { unlinkSync(lockPath); } catch { /* already gone */ }
      }
    } catch (e) {
      if ((e as { code?: string }).code !== 'EEXIST') throw e;
      // A lock exists. If the process that took it is gone, the lock is stale: take it over.
      if (!lockIsHeld(lockPath)) {
        try { unlinkSync(lockPath); } catch { /* someone else got there first */ }
        continue;
      }
      throw new Error(
        `another host is writing this log (${lockPath} is held by pid ${readLockPid(lockPath)}) — ` +
        'ONE writer per log: the others read it and hand their intents to the writer.',
      );
    }
  }
  throw new Error(`could not take the lock on ${eventsPath}`);
}

/** Is the process that took this lock still alive? */
function lockIsHeld(lockPath: string): boolean {
  const pid = readLockPid(lockPath);
  if (pid === null) return false;
  try {
    process.kill(pid, 0); // signal 0 asks "are you there?"
    return true;
  } catch (e) {
    // EPERM means the process exists but is not ours to signal; ESRCH means it is gone.
    return (e as { code?: string }).code === 'EPERM';
  }
}

function readLockPid(lockPath: string): number | null {
  try {
    const pid = Number(readFileSync(lockPath, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/** Write the cover. `0600`: the file holds member identifiers, and seam 3 makes retention the host's policy. */
export function writeManifest(manifestPath: string, manifest: Manifest): void {
  mkdirSync(join(manifestPath, '..'), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  chmodSync(manifestPath, 0o600);
}

/** Read the cover, refusing a version this code does not know. */
export function readManifest(manifestPath: string): Manifest {
  if (!existsSync(manifestPath)) throw new Error(`no manifest at ${manifestPath} — this is not a log this host wrote`);
  const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  if (typeof m.formatVersion !== 'number') throw new Error(`${manifestPath} has no formatVersion`);
  if (m.formatVersion > FORMAT_VERSION) {
    throw new Error(`${manifestPath} is format version ${m.formatVersion} and this host understands ${FORMAT_VERSION} — refuse, never clamp (D35)`);
  }
  return m;
}

/** Build the cover from what the host actually knows. */
export function buildManifest(input: {
  packKey: string;
  packSchema: string;
  packDigest: string;
  answers: NeedAnswers;
  rows: readonly LoggedEvent[];
  verifyCommand: string;
  nodeVersion?: string;
}): Manifest {
  return {
    formatVersion: FORMAT_VERSION,
    packKey: input.packKey,
    packSchema: input.packSchema,
    packDigest: input.packDigest,
    nodeVersion: input.nodeVersion ?? process.versions.node,
    firstSeq: input.rows.length > 0 ? input.rows[0]!.seq : null,
    lastSeq: input.rows.length > 0 ? input.rows[input.rows.length - 1]!.seq : null,
    rowCount: input.rows.length,
    answersDigest: answersDigest(input.answers),
    answerKeys: Object.keys(input.answers).sort(),
    memberDataInFile: true,
    memberMessageTextStored: false,
    draftCopyInFile: true,
    retentionOwner: 'host',
    verifyCommand: input.verifyCommand,
  };
}

/** The size of a file, for a refusal that names it. */
export function fileSize(path: string): number {
  return existsSync(path) ? statSync(path).size : 0;
}
