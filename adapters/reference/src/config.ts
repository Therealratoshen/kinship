/**
 * The operator's answers — the eight `needs:` a community supplies.
 *
 * These live in `pack.local.yaml`, which is gitignored: a community's real names, channels and
 * contacts never enter the repository. Nothing in `runtime/` reads that file — the runtime takes the
 * answers as an in-memory map — so reading it is **the host's** job, and this file is the host's
 * half of that.
 *
 * The reader is deliberately small and deliberately strict:
 *
 *   - only `key: value` at the top level, because that is the only shape `needs:` has;
 *   - a value may be quoted, and the quotes come off;
 *   - a `#` starts a comment only when it follows whitespace, so a value may contain one;
 *   - a duplicate key, a line without a value, or a key the pack does not declare is refused
 *     rather than ignored — a typo'd need that silently did nothing is worse than a loud failure.
 */
import { readFileSync } from 'node:fs';
import { parseCommunityPlan, type CommunityEvent, type CommunityMember, type CommunityTemplate } from 'kinship-runtime/src/plan.ts';

/** One `key: value` pair, unquoted. */
export type Answers = Record<string, string>;

/**
 * Parse a flat `key: value` document.
 *
 * @throws when a line is not a pair, a key repeats, or a value is empty.
 */
export function parseAnswers(text: string): Answers {
  const out: Answers = {};
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim().startsWith('#')) continue; // a whole-line comment
    const line = raw.trim();
    if (line === '') continue;
    const at = line.indexOf(':');
    if (at === -1) {
      throw new Error(`line ${i + 1} is not a \`key: value\` pair: ${raw.trim()}`);
    }
    const key = line.slice(0, at).trim();
    if (key === '') throw new Error(`line ${i + 1} has an empty key`);
    const rest = line.slice(at + 1).trim();
    let value: string;
    if (rest.startsWith('"') || rest.startsWith("'")) {
      // A quoted value ends at its closing quote, so it may contain a `#`; anything after the
      // closing quote must be a comment.
      const quote = rest[0]!;
      const close = rest.indexOf(quote, 1);
      if (close === -1) throw new Error(`line ${i + 1} (\`${key}\`) opens a quote it never closes`);
      value = rest.slice(1, close);
      const tail = rest.slice(close + 1).trim();
      if (tail !== '' && !tail.startsWith('#')) {
        throw new Error(`line ${i + 1} (\`${key}\`) has text after its closing quote`);
      }
    } else {
      value = stripComment(rest).trim();
      if (value === '') throw new Error(`line ${i + 1} (\`${key}\`) has no value`);
    }
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      throw new Error(`\`${key}\` is answered twice — the second answer would silently win`);
    }
    out[key] = value;
  }
  return out;
}

/** An unquoted value ends at a `#` that follows whitespace. */
function stripComment(line: string): string {
  const at = line.search(/\s#/);
  return at === -1 ? line : line.slice(0, at);
}

/** Read the answers from a file, or from an inline document when `file` is null. */
export function readAnswers(file: string | null): Answers {
  if (file === null) return {};
  return parseAnswers(readFileSync(file, 'utf8'));
}

/**
 * The answers must answer the pack's `needs:` and nothing else.
 *
 * A missing answer is refused by the runtime's boot gate, so this half checks the other direction:
 * an answer for a need the pack does not declare. That is almost always a typo, and a typo here
 * would leave the fleet running with an answer nobody supplied — silently, because the runtime
 * never asked for it.
 */
export function assertAnswersMatchNeeds(answers: Answers, needs: readonly string[]): void {
  const declared = new Set(needs);
  for (const key of Object.keys(answers)) {
    if (!declared.has(key)) {
      throw new Error(`\`${key}\` is not a need this pack declares — the pack asks for ${needs.join(', ')}`);
    }
  }
}


/**
 * The community's own plan: the copy they wrote, and their next event.
 *
 * It is a **separate file** from the answers, and that is not tidiness — the two have different
 * lifetimes. The answers are the community's identity and change when the community does; the plan is
 * the community's *work* and changes every event. Splitting them means the file a person edits before
 * each event is not the file that holds their permanent settings, and a copy-paste of one cannot
 * silently overwrite the other.
 *
 * The runtime owns the reader (`parseCommunityPlan`), so the shape is checked in one place and the
 * host does not grow a second parser. Nothing in `runtime/` reads this file — the host reads it and
 * hands the plan to the runtime in memory, exactly as it hands over the answers.
 */
export interface CommunityPlan {
  templates: CommunityTemplate[];
  event: CommunityEvent | null;
  members: CommunityMember[];
}

export function readPlan(file: string | null): CommunityPlan {
  if (file === null) return { templates: [], event: null, members: [] };
  return parseCommunityPlan(readFileSync(file, 'utf8'));
}
