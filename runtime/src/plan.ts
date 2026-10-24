/**
 * The planner — how a community's own words become actions the fleet takes on its own.
 *
 * The runtime could already adjudicate an action (`engine.ts`), meter a run (`runner.ts`), schedule and
 * fire a timer (`lifecycle.ts`), and put a card in front of a human (`cards.ts`). What it could not do
 * was **decide what to do**: the caller handed it the copy on a command line, one `--text-id` at a
 * time. A host that invented the drafts would be inventing behaviour the pack does not have, so the
 * host does not think — and the result was a runtime that could judge a card but never produce one.
 *
 * This file is the missing half, and it has exactly one job: **turn a community's own copy and its own
 * event into the actions the fleet will take, at the times it will take them.**
 *
 * Four rules, each with a test that can fail:
 *
 *  1. **The copy is the community's, and it is filled from facts the community supplied.** The planner
 *     holds no copy of its own and invents no fact. A `{slot}` with no value is not a blank left in a
 *     member-facing message — it is a refusal, because a message with a hole in it ships a lie about a
 *     venue by leaving the venue out.
 *  2. **A lane the pack does not declare is not attempted.** `agents.*.autonomy_by_class` is the
 *     inventory of what this community's fleet may do. A template for a class no agent declares is a
 *     copy written for a lane that does not exist, and the planner says so instead of inventing a lane
 *     to put it in.
 *  3. **Only a timer-backed phase gets a timer.** The pack's `event-lifecycle` skill says a phase moves
 *     "on a named condition: a human verdict, a fired timer with a persisted wake row, or a
 *     deliverable that regenerated successfully — **never on elapsed time alone**." So a wake is
 *     scheduled only where the wake IS the named condition, and a template for any other phase is
 *     refused rather than quietly given a clock it is not allowed to have.
 *  4. **The disclosure is present before approval, and the community put it there.** The pack's
 *     `promo-copy` skill says the disclosure line "is part of the content and is present before
 *     approval, never added by the runtime". So the community writes it as the `{disclosure}` slot and
 *     the planner fills that slot with the runtime's canonical line for that language — the community
 *     chooses *where* the line goes, the wording is canonical per language, and a copy that omits the
 *     slot is refused at plan time, which is before the event rather than at the commit that would have
 *     refused it anyway.
 *
 * **The times are local, not UTC.** "T-1d" means one day before the event *at the event's own local
 * time*, so the shift is applied to the calendar date in the offset the community wrote, and the offset
 * is carried across unchanged. Subtracting 24 hours from an instant would put a reminder on the wrong
 * local hour twice a year — the same wall-clock rule the coverage window is held to (D54), applied to
 * the timer for the same reason.
 */
import { disclosureLine } from './disclosure.ts';
import { refuse } from './errors.ts';
import type { LocaleText } from './locales.ts';
import type { NeedAnswers, Packed, Phase, WakeAction } from './types.ts';

/** The copy a community wrote for one lane at one phase, in the languages it wrote it in. */
export interface CommunityTemplate {
  /** The action class this copy is for — it must be a class some agent in the pack declares. */
  actionClass: string;
  /** The agent that would take it — it must be an agent in the pack. */
  agent: string;
  /** The phase it belongs to, as written. Only the timer-backed phases get a timer. */
  phase: string;
  /** The copy per language code, with `{slot}` placeholders. */
  copy: Record<string, string>;
}

/**
 * A member of the community, as the community knows them.
 *
 * A member row is the thing that makes a send *checkable*: without one, a send is refused
 * (`suppression_unknown` — "absent suppression is unknown, and unknown is held"), because the runtime
 * cannot know whether this person said stop. So the community's file carries its own members, with
 * the timezone that decides their own quiet hours (FR-5.5) — a member in Berlin is not held to
 * Jakarta's clock.
 */
export interface CommunityMember {
  ref: string;
  /** The member's own timezone, for their quiet hours. */
  tz: string;
  /** Whether this member has said stop. A stop beats any grant, any lane, any autonomy level. */
  suppressed: boolean;
}

/** The community's next event: when it is, and the facts its copy may draw on. */
export interface CommunityEvent {
  id: string;
  /** ISO 8601 with an offset, e.g. `2026-11-07T19:00:00+07:00`. */
  startsAt: string;
  /**
   * The community's own IANA time zone, e.g. `Asia/Jakarta`.
   *
   * **Why it is asked for.** "T-1d" means *one calendar day earlier, at the same local wall clock*.
   * With a named zone that is exact even across a daylight saving change; without one, the written
   * offset is carried across unchanged, which is exact for a zone that has no daylight saving and
   * **an hour out for a zone that does, twice a year.**
   */
  timezone?: string;
  /** The facts the copy may use. Free-form: a community may add `date_long` or anything else. */
  facts: Record<string, string>;
}

/** A wake the fleet will schedule, and the action it will attempt when it fires. */
export type { WakeAction } from './types.ts';

export interface PlannedWake {
  purpose: string;
  nextCheckAt: number;
  eventId: string;
  action: WakeAction;
}

/** Why a template did not become a wake. Every code here is a thing the community can fix. */
export type PlanProblemCode =
  | 'template_incomplete'
  | 'lane_undeclared'
  | 'phase_not_timer_backed'
  | 'locale_missing'
  | 'slot_unfilled'
  | 'slot_malformed'
  | 'disclosure_missing';

export interface PlanProblem {
  code: PlanProblemCode;
  /** The template it is about, as `actionClass@phase`. */
  template: string;
  detail: string;
}

/**
 * The phases a timer may back, and how far before the event they fire.
 *
 * `t-minus-7` and `t-minus-1` are the pack's own reminder cadence (`reminder-schedule`: "T-7d and
 * T-1d"). Every other phase in `PHASES` moves on a human verdict or a regenerated deliverable, and
 * giving one of those a timer would put the phase exactly where the pack's rule forbids it.
 */
export const TIMER_BACKED_PHASES: Readonly<Record<string, number>> = {
  't-minus-7': -7,
  't-minus-1': -1,
};

// --- the community's plan, read from their own file -----------------------------------------------------

/** One logical line: its indent, its text, and the body of a block scalar if it had one. */
interface LogicalLine {
  indent: number;
  text: string;
  block: string[] | null;
}

/**
 * Fold block scalars (`|`, `|-`) into their line, so the reader below never has to think about them.
 *
 * The community's copy is prose — a promo is three lines, not one — and prose in a `key: value` file
 * has to be readable by the person who wrote it. A `|` block is the only way to write it, so it is
 * supported rather than worked around.
 */
function logicalLines(raw: readonly string[]): LogicalLine[] {
  const out: LogicalLine[] = [];
  for (let i = 0; i < raw.length; i++) {
    const l = raw[i]!;
    const trimmed = l.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      out.push({ indent: -1, text: '', block: null });
      continue;
    }
    const indent = l.length - l.trimStart().length;
    const m = /^([A-Za-z_][\w-]*):\s*(\||\|-)\s*$/.exec(trimmed);
    if (m === null) {
      out.push({ indent, text: trimmed, block: null });
      continue;
    }
    const body: string[] = [];
    let bodyIndent = -1;
    let j = i + 1;
    for (; j < raw.length; j++) {
      const n = raw[j]!;
      if (n.trim() === '') {
        body.push('');
        continue;
      }
      const ni = n.length - n.trimStart().length;
      if (ni <= indent) break;
      if (bodyIndent === -1) bodyIndent = ni;
      body.push(n.slice(bodyIndent));
    }
    out.push({ indent, text: `${m[1]}:`, block: body });
    i = j - 1;
  }
  return out;
}

/** A value's surrounding quotes come off; the value inside them is the value. */
function unquote(v: string): string {
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

/** Read the community's plan: their templates, their next event, and their members. */
export function parseCommunityPlan(yaml: string): {
  templates: CommunityTemplate[];
  event: CommunityEvent | null;
  members: CommunityMember[];
} {
  const lines = logicalLines(yaml.split('\n'));
  const templates: CommunityTemplate[] = [];
  const members: CommunityMember[] = [];
  let event: CommunityEvent | null = null;

  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.indent === 0 && l.text === 'templates:') {
      // `readTemplates` returns the index of the first line it did NOT consume, and the loop below
      // advances from there — a `for` loop's `i++` would step straight over the next top-level key.
      i = readTemplates(lines, i + 1, templates);
      continue;
    }
    if (l.indent === 0 && l.text === 'event:') {
      event = readEvent(lines, i + 1);
      i += 1;
      continue;
    }
    if (l.indent === 0 && l.text === 'members:') {
      i = readMembers(lines, i + 1, members);
      continue;
    }
    i += 1;
  }
  return { templates, event, members };
}

/** The `members:` list — the community's own people, with the clock that protects them. */
function readMembers(lines: readonly LogicalLine[], from: number, into: CommunityMember[]): number {
  let i = from;
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.indent < 0) { i++; continue; }
    if (l.indent === 0) break;
    if (!l.text.startsWith('- ')) {
      refuse('pack_invalid', 'community plan parse gate',
        'the `members:` list has an entry that is not marked with `-` — a list this reader cannot see the shape of is a list it would half-read');
    }
    const entry: LogicalLine[] = [{ indent: l.indent + 2, text: l.text.slice(l.text.indexOf('- ') + 2), block: null }];
    const base = l.indent;
    i++;
    for (; i < lines.length; i++) {
      const n = lines[i]!;
      if (n.indent < 0) continue;
      if (n.indent <= base) break;
      entry.push(n);
    }
    const fields = new Map<string, string>();
    for (const e of entry) {
      const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(e.text);
      if (m !== null) fields.set(m[1]!, unquote(m[2]!.trim()));
    }
    const ref = fields.get('ref');
    if (ref === undefined) refuse('pack_invalid', 'community plan parse gate', 'a member names no `ref` — a member without a reference cannot be protected');
    into.push({
      ref,
      tz: fields.get('tz') ?? 'UTC',
      suppressed: (fields.get('suppressed') ?? 'false').toLowerCase() === 'true',
    });
  }
  return i;
}

/** The `templates:` list — a YAML list of maps, the same shape the pack format uses for its windows. */
function readTemplates(lines: readonly LogicalLine[], from: number, into: CommunityTemplate[]): number {
  let i = from;
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.indent < 0) { i++; continue; }
    if (l.indent === 0) break; // the next top-level key
    if (!l.text.startsWith('- ')) {
      // A list written without `-` markers is a list this reader cannot see the shape of, and a list
      // it would half-read is a list it must refuse.
      refuse('pack_invalid', 'community plan parse gate',
        'the `templates:` list has an entry that is not marked with `-` — a list this reader cannot see the shape of is a list it would half-read');
    }
    const entry: LogicalLine[] = [{ indent: l.indent + 2, text: l.text.slice(l.text.indexOf('- ') + 2), block: null }];
    const base = l.indent;
    i++;
    for (; i < lines.length; i++) {
      const n = lines[i]!;
      if (n.indent < 0) continue;
      if (n.indent <= base) break;
      entry.push(n);
    }
    into.push(readTemplate(entry));
  }
  return i;
}

/** One template: its lane, its phase, its agent, and its copy per language. */
function readTemplate(entry: readonly LogicalLine[]): CommunityTemplate {
  const fields = new Map<string, string>();
  const copy = new Map<string, string>();
  let base = -1;
  for (let i = 0; i < entry.length; i++) {
    const l = entry[i]!;
    if (base === -1) base = l.indent;
    if (l.indent !== base) continue;
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l.text);
    if (m === null) continue;
    const key = m[1]!;
    if (l.block !== null) {
      fields.set(key, l.block.join('\n'));
      continue;
    }
    if (m[2]!.trim() === '') {
      // A nested map — `copy:`. Its children are deeper than the key that opened it.
      for (let j = i + 1; j < entry.length; j++) {
        const n = entry[j]!;
        if (n.indent <= l.indent) break;
        const nm = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(n.text);
        if (nm === null) continue;
        copy.set(nm[1]!, n.block !== null ? n.block.join('\n') : unquote(nm[2]!.trim()));
      }
      continue;
    }
    fields.set(key, unquote(m[2]!.trim()));
  }

  const actionClass = fields.get('action_class');
  const phase = fields.get('phase');
  const agent = fields.get('agent');
  if (actionClass === undefined) refuse('pack_invalid', 'community plan parse gate', 'a template names no `action_class` — a lane with no class is not a lane');
  if (phase === undefined) refuse('pack_invalid', 'community plan parse gate', `a template for \`${actionClass}\` names no \`phase\` — a copy with no phase has no moment to belong to`);
  if (agent === undefined) refuse('pack_invalid', 'community plan parse gate', `a template for \`${actionClass}\` names no \`agent\` — a copy with no author has nobody to hold it`);
  if (copy.size === 0) refuse('pack_invalid', 'community plan parse gate', `a template for \`${actionClass}\` carries no \`copy\` — a lane with no words is not a lane`);

  return { actionClass, phase, agent, copy: Object.fromEntries(copy) };
}

/**
 * A member of the community, as the community knows them.
 *
 * A member row is the thing that makes a send *checkable*: without one, a send is refused
 * (`suppression_unknown` — "absent suppression is unknown, and unknown is held"), because the runtime
 * cannot know whether this person said stop. So the community's file carries its own members, with
 * the timezone that decides their own quiet hours (FR-5.5) — a member in Berlin is not held to
 * Jakarta's clock.
 */
export interface CommunityMember {
  ref: string;
  /** The member's own timezone, for their quiet hours. */
  tz: string;
  /** Whether this member has said stop. A stop beats any grant, any lane, any autonomy level. */
  suppressed: boolean;
}

/** The community's next event: when it is, and the facts its copy may draw on. */
function readEvent(lines: readonly LogicalLine[], from: number): CommunityEvent | null {
  const fields = new Map<string, string>();
  for (let i = from; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.indent < 0) continue;
    if (l.indent === 0) break;
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(l.text);
    if (m === null) continue;
    fields.set(m[1]!, l.block !== null ? l.block.join('\n') : unquote(m[2]!.trim()));
  }
  const id = fields.get('id');
  const startsAt = fields.get('starts_at');
  if (id === undefined || startsAt === undefined) return null;
  const timezone = fields.get('timezone');
  const facts: Record<string, string> = {};
  for (const [k, v] of fields) if (k !== 'id' && k !== 'starts_at' && k !== 'timezone') facts[k] = v;
  return { id, startsAt, ...(timezone !== undefined ? { timezone } : {}), facts };
}

// --- slots -----------------------------------------------------------------------------------------------

/** The slots a copy names, in the order they appear. */
export function slotNames(copy: string): string[] {
  const out: string[] = [];
  for (const m of copy.matchAll(/\{([^{}]*)\}/g)) {
    const name = m[1]!;
    if (!/^[A-Za-z_][\w-]*$/.test(name)) continue;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * Fill a copy's slots from the facts.
 *
 * A slot with no fact keeps its `{name}` in the text and is reported — the hole is never quietly closed
 * and never quietly dropped, because a member-facing message that reads "Besok di {venue}" is a message
 * that went out with a hole in it.
 */
export function renderCopy(copy: string, facts: Record<string, string>): { text: string; unfilled: string[]; malformed: string[] } {
  const unfilled: string[] = [];
  const malformed: string[] = [];
  const text = copy.replace(/\{([^{}]*)\}/g, (_whole, content: string) => {
    const name = content.trim();
    // A slot is a word in braces with **nothing else** — `{venue}`, not `{venue }`. The exact
    // spelling is the rule, because a template that half-matches is a template nobody wrote: a
    // member reading "di {venue }" was told nothing, and silently forgiving the space is guessing
    // at what the community meant. So a brace pair that does not match exactly, and whose trimmed
    // content *starts* like a slot, is reported. A brace pair that does not start like a slot
    // (`{ }`, `{ 30% }`) is prose and is left alone.
    if (!/^[A-Za-z_][\w-]*$/.test(content)) {
      if (/^[A-Za-z_]/.test(name) && !malformed.includes(content)) malformed.push(content);
      return _whole;
    }
    const value = facts[name];
    // **An empty value is the absence of a value.** `venue: ""` is not a venue; it is a hole that
    // would ship as "di ." — a lie about the venue by leaving the venue out.
    if (value === undefined || value.trim() === '') {
      if (!unfilled.includes(name)) unfilled.push(name);
      return `{${name}}`;
    }
    return value;
  });
  return { text, unfilled, malformed };
}

// --- the plan --------------------------------------------------------------------------------------------

/**
 * Turn the community's templates into the wakes the fleet will run.
 *
 * Every problem is reported rather than thrown: a community with three broken templates is told about
 * three things at once, and nothing is scheduled until each one is fixed. A wake is scheduled only when
 * its template produced no problem at all.
 */
export function planWakes(args: {
  templates: readonly CommunityTemplate[];
  event: CommunityEvent | null;
  pack: Packed;
  answers: NeedAnswers;
}): { wakes: PlannedWake[]; problems: PlanProblem[] } {
  const { templates, event, pack, answers } = args;
  const wakes: PlannedWake[] = [];
  const problems: PlanProblem[] = [];
  const community = answers['community_name'] ?? '';

  for (const t of templates) {
    const label = `${t.actionClass}@${t.phase}`;
    const problem = (code: PlanProblemCode, detail: string): void => {
      problems.push({ code, template: label, detail });
    };

    // 1. The lane must exist in this community's pack.
    const agent = pack.agents[t.agent];
    if (agent === undefined) {
      problem('lane_undeclared', `no agent \`${t.agent}\` in this pack — a copy written for an agent that does not exist has nobody to hold it`);
      continue;
    }
    if (agent.autonomyByClass[t.actionClass] === undefined) {
      problem('lane_undeclared', `agent \`${t.agent}\` does not declare the class \`${t.actionClass}\` — a class absent from an agent's toolset is not denied, it is absent`);
      continue;
    }

    // 2. Only a timer-backed phase may have a timer.
    const days = TIMER_BACKED_PHASES[t.phase];
    if (days === undefined) {
      problem('phase_not_timer_backed',
        `phase \`${t.phase}\` moves on a human verdict, not on a clock — the phases a timer may back are ${Object.keys(TIMER_BACKED_PHASES).join(' and ')}`);
      continue;
    }

    // 3. The event, without which there is no time to schedule against.
    if (event === null) {
      problem('template_incomplete', 'this plan names no `event:` — a template with no event has no moment to fire at');
      continue;
    }

    // 4. The copy must exist in every language the pack declares.
    const missing = pack.locale.filter((l) => t.copy[l] === undefined);
    if (missing.length > 0) {
      problem('locale_missing',
        `this pack runs in ${pack.locale.join(' and ')} and the copy has ${Object.keys(t.copy).join(' and ')} — a card in one language is a card the other language never sees`);
      continue;
    }

    // 5. Fill every language, and refuse a copy with a hole or without the disclosure.
    const text: LocaleText = {};
    const holes = new Map<string, string[]>(); // slot -> the languages it is missing from
    const typos = new Map<string, string[]>(); // what it looked like -> the languages it was in
    const undisclosed: string[] = [];
    for (const language of pack.locale) {
      const source = t.copy[language]!;
      const facts: Record<string, string> = {
        ...event.facts,
        community_name: community,
        ...localDateFacts(event.startsAt),
        disclosure: disclosureLine(language, community),
      };
      const rendered = renderCopy(source, facts);
      for (const slot of rendered.unfilled) {
        const list = holes.get(slot) ?? [];
        list.push(language);
        holes.set(slot, list);
      }
      for (const typo of rendered.malformed) {
        const list = typos.get(typo) ?? [];
        list.push(language);
        typos.set(typo, list);
      }
      if (!rendered.text.includes(disclosureLine(language, community))) undisclosed.push(language);
      text[language] = rendered.text;
    }
    // A missing fact is ONE thing to fix, even when it is missing from two languages — so the problem
    // names the slot and the languages, rather than reporting the same hole twice.
    if (typos.size > 0) {
      problem('slot_malformed',
        [...typos.entries()].map(([typo, langs]) =>
          'the ' + langs.join(' and ') + ' copy contains a brace pair that is not a slot: '
          + typo + ' — a slot is a word in braces with nothing else, like {venue}').join('; ')
        + ' — a typo\'d slot would ship as the typo');
      continue;
    }
    if (holes.size > 0) {
      problem('slot_unfilled',
        [...holes.entries()].map(([slot, langs]) =>
          `the ${langs.join(' and ')} copy uses \`{${slot}}\` and this event supplies no value for it`).join('; ') +
        ' — a message with a hole in it goes out with the hole');
      continue;
    }
    if (undisclosed.length > 0) {
      problem('disclosure_missing',
        `the ${undisclosed.join(' and ')} copy does not carry the disclosure line — the community writes it (the \`{disclosure}\` slot) and the runtime never adds it`);
      continue;
    }

    wakes.push({
      purpose: `${t.actionClass}@${t.phase}:${event.id}`,
      nextCheckAt: shiftLocalDays(event.startsAt, days, event.timezone),
      eventId: event.id,
      action: { actionClass: t.actionClass, agent: t.agent, phase: t.phase as Phase, text },
    });
  }

  return { wakes, problems };
}

/**
 * The event's local date and time, as facts a copy may use.
 *
 * `date` is the local calendar date and `time` the local wall clock, both read out of the offset the
 * community wrote — not converted to UTC, because a promo that says the event is at 13:00 because the
 * runtime did the arithmetic in UTC is a promo that tells the community the wrong time.
 */
function localDateFacts(startsAt: string): { date: string; time: string } {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(startsAt);
  if (m === null) {
    refuse('pack_invalid', 'community plan parse gate',
      `\`starts_at: ${startsAt}\` is not an ISO 8601 local time with an offset — a timer whose moment cannot be read is a timer that fires at a moment nobody chose`);
  }
  return { date: m[1]!, time: m[2]! };
}

/**
 * Shift an ISO local time by whole days, in the community's own local calendar.
 *
 * The offset is carried across unchanged, so "one day before 19:00 local" is 19:00 local on the earlier
 * date — on both sides of a daylight-saving change. Subtracting 24 hours from the instant instead would
 * land the reminder on the wrong local hour twice a year.
 */
export function shiftLocalDays(iso: string, days: number, timezone?: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/.exec(iso);
  if (m === null) {
    refuse('pack_invalid', 'community plan parse gate',
      `\`starts_at: ${iso}\` is not an ISO 8601 local time with an offset`);
  }
  const [, y, mo, d, hh, mm, ss, off] = m as unknown as [string, string, string, string, string, string, string | undefined, string]; // a tuple, because the regex guarantees every group but the seconds — `string[]` under `noUncheckedIndexedAccess` types them all as `string | undefined`, and then the type contract disagrees with the pattern that already guarantees them

  // The calendar shift is the same either way: one day earlier, the same local wall clock.
  const shifted = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)) + days * 86_400_000);
  const y2 = String(shifted.getUTCFullYear()).padStart(4, '0');
  const mo2 = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(shifted.getUTCDate()).padStart(2, '0');

  // **With a named zone, the local wall clock is what the shift preserves.** A community that says
  // "19:00 in Europe/Berlin" means 19:00 on the earlier date *in Berlin* — and across a daylight
  // saving change that is NOT the same instant as 24 hours earlier, because the zone's offset moved.
  // Carrying the written offset across unchanged would put the reminder on the wrong local hour
  // twice a year. So: name the zone, and the arithmetic is exact.
  if (timezone !== undefined) {
    return zonedLocalToInstant(y2, mo2, d2, hh, mm, ss ?? '00', timezone);
  }

  // **Without a named zone, the written offset is carried across unchanged.** That is exact for a
  // zone without daylight saving, and one hour out for a zone with it — which is why the community
  // can name its zone, and why the plan says so when it does not.
  return Date.parse(`${y2}-${mo2}-${d2}T${hh}:${mm}:${ss ?? '00'}${off}`);
}

/**
 * The offset a zone is at, in milliseconds, at a given instant.
 *
 * `Intl` knows the zone's rules; this asks it what the wall clock reads there, and the difference
 * between that and UTC is the offset. It is a pure computation — no I/O, no clock, no network —
 * so it satisfies the runtime's boundary (D32) and its determinism rule.
 */
function zoneOffsetMs(instant: number, timezone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(instant));
  } catch {
    refuse('pack_invalid', 'community plan parse gate',
      `\`timezone: ${timezone}\` is not a time zone this runtime knows — use an IANA name like \`Asia/Jakarta\``);
  }
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - instant;
}

/**
 * The instant at which a local wall clock reads a given time in a named zone.
 *
 * Two passes, because the offset depends on the instant you are asking about and the instant is
 * what you are computing: the first guess may land on the wrong side of a daylight saving change,
 * so the second pass re-reads the offset where the first one landed. A zone that has no change
 * gives the same offset twice and finishes in one step.
 */
function zonedLocalToInstant(y: string, mo: string, d: string, hh: string, mm: string, ss: string, timezone: string): number {
  const guess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  const first = zoneOffsetMs(guess, timezone);
  const candidate = guess - first;
  const second = zoneOffsetMs(candidate, timezone);
  return first === second ? candidate : guess - second;
}
