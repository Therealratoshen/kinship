/**
 * The reference host.
 *
 * A host owns the four seams the runtime refuses to fill (spec/HOST-CONTRACT.md): the credential,
 * the clock, the store, and the transport. This one owns three of them — clock, store, and the
 * printing — and **not** the fourth, on purpose.
 *
 * **There is no transport here.** Not because one is unconfigured: because the refusal is a line of
 * code in `runtime/src/engine.ts`, and a host cannot talk the runtime out of it. Every member-facing
 * commit ends at `no_transport` (D21). That is the whole claim, and this host is what it looks like
 * from the outside — it ticks, it persists, it prints what a human has to decide, and it cannot
 * deliver. Opening a transport port is a separate decision with its own dated row (D41's memo, section 4:
 * O1 versus O2), not a side effect of building a host.
 *
 * What it produces is the artefact phase 1 is supposed to produce: **"here is what the fleet drafted
 * and what it refused, in a file you can hand a reviewer."**
 *
 *   node src/host.ts run     --pack ../../packs/kopdar-ops --config ../../packs/kopdar-ops/pack.local.yaml --log ../../logs
 *   node src/host.ts tick    --pack ... --config ... --log ... --tick-ms 5000
 *   node src/host.ts approve --pack ... --config ... --log ... --card card-1 --why "tanggal sudah benar"
 *   node src/host.ts verify  --pack ... --config ... --log ...
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Fleet } from 'kinship-runtime/src/engine.ts';
import { KinshipError } from 'kinship-runtime/src/errors.ts';
import { loadPack } from 'kinship-runtime/src/pack.ts';
import type { LoggedEvent, NeedAnswers, Packed } from 'kinship-runtime/src/types.ts';
import { readAnswers, assertAnswersMatchNeeds, readPlan, type CommunityPlan } from './config.ts';
import { planWakes, slotNames, type PlannedWake, type PlanProblem } from 'kinship-runtime/src/plan.ts';
import { createRun, type RunState } from 'kinship-runtime/src/budget.ts';
import { redactLog } from './redact.ts';
import { appendEvents, buildManifest, logDirFor, packDigest, readEvents, readManifest, writeManifest, type Manifest } from './store.ts';
import { answersDigest } from 'kinship-runtime/src/log.ts';

export interface HostOptions {
  packDir: string;
  configFile: string | null;
  logRoot: string;
  /** How far a tick moves the clock. The host owns the clock (seam 2). */
  tickMs: number;
  /** Whether to keep ticking. A host that only ticks on demand is a demo; one that ticks is a host. */
  watch: boolean;
  /** The command to run. */
  command: 'run' | 'tick' | 'draft' | 'approve' | 'publish' | 'verify' | 'plan' | 'digest' | 'redact' | 'init';
  /**
   * The community's plan file — their own copy and their next event.
   *
   * Absent means the community has written no copy yet, and the fleet has nothing to say. That is a
   * state, not an error: a host with no plan still boots, still verifies its log, still answers
   * `approve`.
   */
  planFile?: string | null;
  /**
   * The clock override: the moment the host is to act as if it were. A rehearsal needs one, because
   * a community that cannot wait seven days for its own T-7 reminder cannot test anything.
   */
  now?: number | null;
  cardId?: string;
  why?: string;
  /** For `draft`: the lane, the agent, and the copy the operator hands the runtime. */
  actionClass?: string;
  agent?: string;
  /** The copy, keyed by language code — the operator hands one per language the pack declares. */
  text: Record<string, string>;
  /** For `approve`: the verdict. A host that could only say yes would not be a human in the loop. */
  verdict?: 'approve' | 'edit' | 'reject';
  /** For `publish`: who the message is for. The host does not know the community's members. */
  recipients?: string[];
  /** For `digest`: the window, in milliseconds. Default 24 hours. */
  windowMs?: number;
}

/** Everything the host knows about the community it is running for. */
export interface Host {
  pack: Packed;
  /** Where the pack was read from — the cover's `packDigest` is a digest of that directory, and a
   *  digest nobody can recompute is a claim. */
  packDir: string;
  answers: NeedAnswers;
  fleet: Fleet;
  eventsPath: string;
  manifestPath: string;
  /** The rows already on disk when this host started. */
  onDisk: LoggedEvent[];
  /** The community's plan, read from their own file. */
  plan: CommunityPlan;
}

/**
 * Boot the host: load the pack, read the answers, and — if a log already exists — **continue it**
 * rather than starting again. A host that forgot its own log on restart would be a host that
 * forgets what it refused.
 */
export function bootHost(opts: HostOptions): Host {
  const pack = loadPack(opts.packDir);
  const answers = readAnswers(opts.configFile);
  assertAnswersMatchNeeds(answers, pack.needs);
  const plan = readPlan(opts.planFile ?? null);

  const dir = logDirFor(opts.logRoot, pack.key);
  const eventsPath = join(dir, 'events.jsonl');
  const manifestPath = join(dir, 'manifest.json');
  const onDisk = readEvents(eventsPath);

  const startAt = opts.now ?? Date.now();
  const fleet = onDisk.length > 0
    ? Fleet.replay(onDisk, answers, pack)
    : Fleet.boot(pack, answers, startAt);

  // A replay takes its clock from the log, because the log is what happened. A `--now` still wins,
  // because a rehearsal is the operator saying "act as if it were this moment" — and `advance` is a
  // plain addition, so the clock lands exactly there whether it moved forward or back.
  if (opts.now !== null && opts.now !== undefined) fleet.advance(opts.now - fleet.now());

  return { pack, packDir: opts.packDir, answers, fleet, eventsPath, manifestPath, onDisk, plan };
}

/** The rows the fleet has produced since the last write. */
function unwritten(host: Host): LoggedEvent[] {
  const written = host.onDisk.length;
  return host.fleet.events.slice(written);
}

/** Append the new rows and rewrite the cover. */
export function persist(host: Host, opts: HostOptions): number {
  const fresh = unwritten(host);
  appendEvents(host.eventsPath, fresh);
  const rows = readEvents(host.eventsPath);
  const manifest = buildManifest({
    packKey: host.pack.key,
    packSchema: host.pack.schema,
    packDigest: packDigest(opts.packDir),
    answers: host.answers,
    rows,
    verifyCommand: `node adapters/reference/src/host.ts verify --pack ${opts.packDir} --config ${opts.configFile ?? '(none)'} --log ${opts.logRoot}`,
  });
  writeManifest(host.manifestPath, manifest);
  host.onDisk = rows;
  return fresh.length;
}

/**
 * Read the file back and verify it — the whole point of a log file.
 *
 * **Two halves, and the second half used to be missing.** The rows are re-read from disk and
 * folded, and the state they fold to must be the state the fleet holds: that is the restore-and-
 * compare a host does after a restore, and it is what the density and the fold check. **The cover
 * is the other half** — the manifest's own statement about how many rows it holds, which pack it
 * came from, and which answers it was written under — and it was **never opened**. The comment above
 * this function claimed the answers digest was checked at the same time; it was not.
 *
 * **Why the cover has to be compared, and not just read.** A fold proves the rows are internally
 * consistent. It cannot prove the rows are *the rows this log claims to be*: five fields in the
 * cover could be corrupted and the fold would still succeed, because the fold never looked. So the
 * cover's `rowCount`, `firstSeq`, `lastSeq`, `packDigest` and `answersDigest` are each compared with
 * what the rows and the host actually hold, and a mismatch is a refusal that names the field.
 *
 * **A missing cover is a refusal, not a pass.** A log with no manifest is not a log this host wrote,
 * and saying "verified" about it would be the one claim nothing could check.
 */
export function verifyHost(host: Host): { ok: boolean; problems: string[]; rows: number } {
  const rows = readEvents(host.eventsPath);
  const v = Fleet.verifyLog(rows, host.answers, host.pack, { state: host.fleet.state });
  const problems = v.problems.map((p) => `[${p.kind}] ${p.detail}`);

  // --- the cover ---
  let manifest: Manifest;
  try {
    manifest = readManifest(host.manifestPath);
  } catch (e) {
    problems.push(`[manifest] ${(e as Error).message}`);
    return { ok: false, problems, rows: rows.length };
  }

  const firstSeq = rows.length > 0 ? rows[0]!.seq : null;
  const lastSeq = rows.length > 0 ? rows[rows.length - 1]!.seq : null;
  const compare = (field: string, claimed: unknown, actual: unknown): void => {
    if (claimed !== actual) {
      problems.push(`[manifest] ${field} is ${JSON.stringify(claimed)}, the log holds ${JSON.stringify(actual)}`);
    }
  };
  compare('rowCount', manifest.rowCount, rows.length);
  compare('firstSeq', manifest.firstSeq, firstSeq);
  compare('lastSeq', manifest.lastSeq, lastSeq);
  compare('packDigest', manifest.packDigest, packDigest(host.packDir));
  compare('answersDigest', manifest.answersDigest, answersDigest(host.answers));

  return { ok: problems.length === 0, problems, rows: rows.length };
}

/**
 * Move the clock, fire whatever came due, and tell the operator what is waiting on them.
 *
 * **The tick is metered and it says what happened.** It shares the one run handle with the rest of
 * the tick's work, so `budgets.max_actions_per_run` bounds the tick rather than each wake; and a
 * refused wake is reported as a refusal, not as a success — a line that says "fired" when the
 * action was refused is the kind of line nobody checks again.
 */
export function tick(host: Host, opts: HostOptions): string[] {
  host.fleet.advance(opts.tickMs);
  const due = host.fleet.health().wakes.overdue;
  const fired: string[] = [];
  const run = createRun();
  for (const wake of due) {
    const outcome = host.fleet.fireWake(wake.id, run);
    if (outcome.result === 'attempted') {
      fired.push(`wake ${wake.id} fired: ${wake.purpose}${outcome.card !== undefined ? ` → card ${outcome.card.id}, waiting on a human` : ''}`);
    } else if (outcome.result === 'refused') {
      fired.push(`wake ${wake.id} fired: ${wake.purpose} → REFUSED: ${outcome.code ?? 'unknown'}`);
    } else if (outcome.result === 'truncated') {
      fired.push(`wake ${wake.id} not fired — this tick stopped at its cap of ${host.pack.budgets.maxActionsPerRun} actions`);
      break;
    } else {
      fired.push(`wake ${wake.id} fired: ${wake.purpose}`);
    }
  }
  return fired;
}

/** What a human is waiting on — the inbox, which sweeps member identifiers before it returns. */
export function operatorView(host: Host): string[] {
  const inbox = host.fleet.inbox();
  const lines: string[] = [];
  lines.push(`inbox — ${inbox.counts.verdict} to decide, ${inbox.counts.handoff} to hand over, ${inbox.counts.overdue} overdue`);
  for (const item of inbox.items) {
    lines.push(`  [${item.kind}] ${item.ref} — ${item.action}`);
    lines.push(`      ${item.detail}`);
  }
  if (inbox.items.length === 0) lines.push('  (nothing is waiting on a human)');
  const health = host.fleet.health();
  lines.push(`queue — ${health.queue.pending} pending of ${health.queue.cap}`);
  if (health.refusals.length > 0) {
    lines.push(`refusals — ${health.refusals.length} kinds recorded`);
    for (const r of health.refusals) lines.push(`  ${r.code} ×${r.count}`);
  }
  return lines;
}

/** The organiser's verdict, through the same API a UI would use. */
export function approve(host: Host, cardId: string, why: string): string {
  const card = host.fleet.decideCard(cardId, { verdict: 'approve', by: 'organiser', why });
  return `card ${card.id} is now ${card.status}, decided by ${card.decidedBy}`;
}

/** The CLI. Every flag is a plain `--name value`; nothing here is clever. */
export function parseArgs(argv: readonly string[]): HostOptions {
  const command = (argv[0] ?? 'run') as HostOptions['command'];
  const flag = (name: string): string | null => {
    const at = argv.indexOf(`--${name}`);
    return at === -1 ? null : (argv[at + 1] ?? null);
  };
  const has = (name: string): boolean => argv.includes(`--${name}`);
  const packDir = flag('pack');
  if (packDir === null) throw new Error('--pack <dir> is required — the pack folder the fleet runs');
  const logRoot = flag('log') ?? 'logs';
  const nowRaw = flag('now');
  if (nowRaw !== null && Number.isNaN(Date.parse(nowRaw))) {
    throw new Error(`--now must be an ISO 8601 moment (e.g. 2026-11-07T19:00:00+07:00) — got \`${nowRaw}\``);
  }
  const tickMs = Number(flag('tick-ms') ?? '5000');
  if (!Number.isInteger(tickMs) || tickMs <= 0) throw new Error('--tick-ms must be a positive whole number of milliseconds');
  return {
    packDir,
    configFile: flag('config'),
    planFile: flag('plan'),
    now: nowRaw === null ? null : Date.parse(nowRaw),
    logRoot,
    tickMs,
    watch: has('watch'),
    command,
    cardId: flag('card') ?? undefined,
    why: flag('why') ?? undefined,
    actionClass: flag('class') ?? undefined,
    agent: flag('agent') ?? undefined,
    // The copy comes in as `--text-<code>`, once per language the pack declares: `--text-id`,
    // `--text-en`, `--text-ar`. The host does not know which languages exist — the PACK does — so a
    // flag for a language the pack does not declare is a mistake the runtime refuses, not one the
    // host papers over.
    text: collectText(argv),
    verdict: readVerdict(flag('verdict')),
    windowMs: flag('window-ms') === null ? undefined : Number(flag('window-ms')),
    recipients: collectRecipients(argv),
  };
}

/** The verdict a human reached. `approve` is the default because that is what a host is for. */
function readVerdict(v: string | null): 'approve' | 'edit' | 'reject' {
  if (v === null) return 'approve';
  if (v === 'approve' || v === 'edit' || v === 'reject') return v;
  throw new Error(`--verdict must be approve, edit or reject — got \`${v}\``);
}

/** Every `--recipient <id>` on the command line. The host does not know the community's members. */
function collectRecipients(argv: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--recipient') continue;
    const value = argv[i + 1];
    if (value === undefined) throw new Error('--recipient needs the member it is for');
    out.push(value);
    i++;
  }
  return out;
}

/** Every `--text-<code> value` on the command line, as a map keyed by the code. */
function collectText(argv: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const m = /^--text-([A-Za-z]{2,3})$/.exec(argv[i]!);
    if (m === null) continue;
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`--text-${m[1]} needs the copy in that language`);
    out[m[1]!] = value;
    i++;
  }
  return out;
}

/**
 * Register the community's own members, so a send can be checked at all.
 *
 * A member with no row cannot be contacted — "absent suppression is unknown, and unknown is held"
 * (FR-5.2). So the community's file carries its members, and the host registers them before the
 * fleet acts. Registration is idempotent, and a member who has said stop is recorded as a stop: the
 * runtime holds that over any grant, any lane, any autonomy level.
 */
export function registerMembers(host: Host): string[] {
  const out: string[] = [];
  for (const m of host.plan.members) {
    host.fleet.registerMember(m.ref, m.tz);
    if (m.suppressed) host.fleet.suppressMember(m.ref, 'member');
    out.push(`  ${m.ref} (${m.tz})${m.suppressed ? ' — has said stop' : ''}`);
  }
  return out;
}

/**
 * The easy setup: scaffold a community's two working files from the shipped examples.
 *
 * **Why a command and not a paragraph.** A new user should not have to know that there are two
 * files, which is which, or that one of them is gitignored — they should run one command and be
 * told what to edit next. **Nothing is ever overwritten**: a file that already exists is kept and
 * said so, because an `init` that clobbers a community's own answers is a data-loss bug wearing a
 * helpful hat.
 */
export function initCommunity(packDir: string, out: string[]): void {
  const answers = join(packDir, 'pack.local.yaml');
  const plan = join(packDir, 'pack.local.plan.yaml');
  const created: string[] = [];
  for (const [from, to] of [
    [join(packDir, 'pack.local.example.yaml'), answers],
    [join(packDir, 'pack.local.plan.example.yaml'), plan],
  ] as const) {
    if (existsSync(to)) {
      out.push(`  kept: ${to} (it already exists — nothing was overwritten)`);
      continue;
    }
    if (!existsSync(from)) {
      out.push(`  missing: ${from} — copy it from the pack's README by hand`);
      continue;
    }
    copyFileSync(from, to);
    created.push(to);
  }
  out.push(created.length > 0 ? `created ${created.length} file(s):` : 'nothing to create:');
  for (const c of created) out.push(`  ${c}`);
  out.push('');
  out.push('  Edit them next — two things, and the fleet needs both:');
  out.push(`    ${answers}      — who you are: your name, your channels, your contacts`);
  out.push(`    ${plan}         — what you are doing next: your copy, your event, your members`);
  out.push('');
  out.push(`  Then:  node adapters/reference/src/host.ts plan --pack ${packDir} --config ${answers} --plan ${plan} --log logs`);
  out.push("  The files are gitignored on purpose: a community's member list is not a repository artefact.");
}

/**
 * What the community's plan says the fleet will do.
 *
 * The host asks the runtime; the runtime does not ask the host. The plan is computed from the pack,
 * the answers, the community's own copy and their event — and the host prints the answer without
 * writing anything, so `plan` is a read and `run` is the write.
 */
export function plannedFor(host: Host): { wakes: PlannedWake[]; problems: PlanProblem[] } {
  return planWakes({
    templates: host.plan.templates,
    event: host.plan.event,
    pack: host.pack,
    answers: host.answers,
  });
}

/** The plan, in the operator's words: what is broken, and what would happen. */
export function planView(host: Host): string[] {
  const { wakes, problems } = plannedFor(host);
  const out: string[] = [];
  if (host.plan.templates.length === 0) {
    out.push('no plan — this community has written no copy yet, so the fleet has nothing to say');
    return out;
  }
  if (problems.length > 0) {
    out.push(`${problems.length} problem(s) — nothing is scheduled until these are fixed:`);
    for (const p of problems) out.push(`  [${p.code}] ${p.template}: ${p.detail}`);
  }
  if (wakes.length > 0) {
    out.push(`${wakes.length} action(s) planned:`);
    for (const w of wakes) {
      const due = w.nextCheckAt <= host.fleet.now();
      out.push(`  ${w.purpose}`);
      out.push(`      at ${new Date(w.nextCheckAt).toISOString()}${due ? '  (due now)' : ''}`);
      out.push(`      copy: ${w.action.text[host.pack.locale[0]!] ?? '(none)'}`);
      // The facts the copy draws on. A community that reads this knows what to put in the event.
      const t = host.plan.templates.find((x) => `${x.actionClass}@${x.phase}` === w.purpose.slice(0, w.purpose.lastIndexOf(':')));
      if (t !== undefined) {
        const slots = [...new Set(Object.values(t.copy).flatMap((c) => slotNames(c)))].sort();
        out.push(`      needs: ${slots.join(', ')}`);
      }
    }
  } else if (problems.length === 0) {
    out.push('nothing planned — the templates you wrote are not timer-backed phases');
  }
  return out;
}

/**
 * Schedule the planned wakes, skipping any that already exist.
 *
 * A wake that is already scheduled is not scheduled twice: the promise is in the log, and a second
 * row for the same promise would be two promises.
 */
export function schedulePlan(host: Host, opts: HostOptions): string[] {
  const { wakes, problems } = plannedFor(host);
  if (problems.length > 0) return [];
  const already = new Set([...host.fleet.state.wakes.values()].map((w) => w.purpose));
  const out: string[] = [];
  for (const w of wakes) {
    if (already.has(w.purpose)) {
      out.push(`  already scheduled: ${w.purpose}`);
      continue;
    }
    host.fleet.scheduleWake({
      purpose: w.purpose,
      nextCheckAt: w.nextCheckAt,
      eventId: w.eventId,
      action: w.action,
    });
    out.push(`  scheduled: ${w.purpose} at ${new Date(w.nextCheckAt).toISOString()}`);
  }
  return out;
}

/**
 * Fire the wakes that are due, and report what each one did.
 *
 * A refusal is an outcome, not a crash: one refused action does not lose the rest of the batch, which
 * is the runner's own rule applied to timers.
 *
 * **And the run cap applies here.** One `createRun()` handle is held for the whole tick, so
 * `budgets.max_actions_per_run` bounds the tick rather than each wake separately (spec section 1.6,
 * and D38's `capScope`). Before D60 this path was not bounded at all: the cap lived only in
 * `runActions`, and the fleet's own path never went through it.
 */
export function fireDue(host: Host, run: RunState = createRun()): string[] {
  const out: string[] = [];
  const due = host.fleet.health().wakes.overdue;
  for (const w of due) {
    const fired = host.fleet.fireWake(w.id, run);
    if (fired.result === 'attempted') {
      out.push(`  ${w.purpose} → ${fired.card !== undefined ? `card ${fired.card.id}, waiting on a human` : 'attempted'}`);
    } else if (fired.result === 'refused') {
      out.push(`  ${w.purpose} → refused: ${fired.code ?? 'unknown'}`);
    } else if (fired.result === 'no-action') {
      out.push(`  ${w.purpose} → fired (no action attached)`);
    } else if (fired.result === 'truncated') {
      out.push(`  this run stopped at its cap of ${host.pack.budgets.maxActionsPerRun} actions — the wakes above are done, and nothing below is retried`);
      break; // the cap stops the tick; the rest stay due for the next one
    }
  }
  return out;
}

/** Run one command and return what to print. */
export function runCommand(opts: HostOptions): string[] {
  // `init` runs BEFORE the host boots: the files it creates are the ones the boot needs, so booting
  // first would ask for a config that does not exist yet.
  if (opts.command === 'init') {
    const out: string[] = [];
    initCommunity(opts.packDir, out);
    return out;
  }
  const host = bootHost(opts);
  const out: string[] = [];
  switch (opts.command) {
    case 'plan': {
      // A read. Nothing is written, nothing is scheduled, nothing is sent.
      out.push(...planView(host));
      break;
    }
    case 'run': {
      out.push(`host up — pack ${host.pack.key}, ${host.onDisk.length} rows on disk`);
      const registered = registerMembers(host);
      if (registered.length > 0) {
        out.push('members:');
        out.push(...registered);
      }
      const scheduled = schedulePlan(host, opts);
      if (scheduled.length > 0) {
        out.push('scheduled:');
        out.push(...scheduled);
        persist(host, opts);
      }
      const fired = fireDue(host);
      if (fired.length > 0) {
        out.push('fired:');
        out.push(...fired);
      }
      const written = persist(host, opts);
      out.push(written === 0 ? 'no new rows' : `appended ${written} row(s)`);
      out.push(...operatorView(host));
      break;
    }
    case 'tick': {
      const fired = tick(host, opts);
      out.push(...fired);
      out.push(...fireDue(host));
      const written = persist(host, opts);
      out.push(`appended ${written} row(s)`);
      out.push(...operatorView(host));
      break;
    }
    case 'draft': {
      // The seam where a future agent runner plugs in. The operator (or an agent) hands the runtime
      // the copy; the **runtime** decides whether that lane drafts a card, runs automatically, or
      // refuses. The host does not think — a host that invented drafts would be inventing behaviour
      // the pack does not have.
      if (Object.keys(opts.text).length === 0) {
        throw new Error('draft needs the copy — one --text-<code> per language the pack declares (the copy is the caller\'s, not the host\'s)');
      }
      const actionClass = opts.actionClass ?? 'draft.reminder';
      const result = host.fleet.attempt({
        actionClass, agent: opts.agent ?? 'event-ops',
        origin: { kind: 'operator', id: 'manual' },
        text: opts.text,
      });
      // The `auto` disposition means the class runs unattended — and the host is not a runner, so
      // nothing happened. Saying "ran on its own lane and was logged" would be a lie in a line the
      // operator reads once.
      out.push(result.disposition === 'card'
        ? `${actionClass} drafted into card ${result.card!.id} — waiting on a human`
        : `${actionClass} is a lane that runs unattended, and the host does not run one — nothing was attempted, and nothing was logged. Use a draft lane, or let the planner schedule it.`);
      persist(host, opts);
      out.push(...operatorView(host));
      break;
    }
    case 'approve': {
      if (opts.cardId === undefined || opts.why === undefined) {
        throw new Error('approve needs --card <id> and --why "<reason>" — a verdict without a why is not a record');
      }
      const verdict = opts.verdict ?? 'approve';
      const card = host.fleet.decideCard(opts.cardId, {
        verdict,
        by: 'organiser',
        why: opts.why,
        ...(verdict === 'edit' ? { newText: opts.text } : {}),
      });
      out.push(`card ${card.id} is now ${card.status}, decided by ${card.decidedBy}`);
      persist(host, opts);
      break;
    }
    case 'redact': {
      // The mechanism behind "never attach a raw log to a public issue": the identifiers come out, the
      // structure stays, and the original is never touched.
      const dir = opts.logRoot;
      // The log's directory comes from the pack's own key, not from the example pack's path: a
      // command that only works for one pack is a command that only works in this repository.
      const src = logDirFor(dir, host.pack.key);
      const r = redactLog({
        eventsPath: join(src, 'events.jsonl'),
        manifestPath: join(src, 'manifest.json'),
        outDir: dir,
      });
      out.push(`redacted ${r.rows} row(s) — ${r.pseudonyms} member identifier(s) replaced`);
      out.push(`  ${r.eventsPath}`);
      if (r.manifestPath !== null) out.push(`  ${r.manifestPath}`);
      out.push('  the original is untouched, and the pseudonyms are not reversible');
      break;
    }
    case 'digest': {
      // The community manager's day: what the fleet did, what a human decided, what was refused,
      // and what is still waiting — per channel, over a window the caller names.
      const windowMs = opts.windowMs ?? 24 * 3_600_000;
      const d = host.fleet.digest(host.fleet.now(), windowMs);
      out.push(`digest — ${new Date(d.from).toISOString()} → ${new Date(d.to).toISOString()}`);
      out.push(`  ${d.totals.drafts} draft(s) · ${d.totals.approved} approved · ${d.totals.rejected} rejected · ${d.totals.edited} edited`);
      out.push(`  ${d.totals.refusals} refusal(s) · ${d.totals.openThreads} open thread(s) · ${d.waiting} waiting on a human`);
      for (const c of d.channels) {
        out.push(`  ${c.channel}: ${c.drafts} draft(s), ${c.approved} approved, ${c.rejected} rejected, ${c.edited} edited`);
      }
      for (const [code, n] of Object.entries(d.refusalsByCode)) out.push(`  refused: ${code} ×${n}`);
      out.push(`  scope: ${d.scope}`);
      for (const n of d.notMeasured) out.push(`  not measured: ${n}`);
      break;
    }
    case 'publish': {
      // The last step of the loop, and the one that shows the product: the message is ready, the
      // human has approved it, and the transport gate stops it anyway (D21). The refusal is not a
      // bug in the host — it is the phase-1 lock, and it is logged like any other refusal.
      if (opts.cardId === undefined) throw new Error('publish needs --card <id>');
      if (opts.recipients === undefined || opts.recipients.length === 0) {
        throw new Error('publish needs --recipient <member-id> (repeat it for more) — say who this message is for; your community\'s members are in the plan file, and a member the runtime has no row for is held');
      }
      registerMembers(host);
      const card = host.fleet.state.cards.get(opts.cardId);
      if (card === undefined) throw new Error(`no card \`${opts.cardId}\` — the fleet has no such card`);
      if (card.status !== 'approved') {
        throw new Error(`card \`${card.id}\` is \`${card.status}\`, not approved — a human approves it first, with a why`);
      }
      try {
        host.fleet.commit({
          actionClass: card.actionClass,
          agent: card.agent,
          origin: card.origin,
          phase: card.phase,
          recipients: opts.recipients,
          onBehalfOf: host.answers['escalation_contact'] ?? 'organiser',
          authorizationToken: `auth-${card.id}`,
          text: card.revision.text,
        });
        out.push(`published to ${opts.recipients.join(', ')} — the transport gate did not stop it, which should not happen in phase 1`);
      } catch (e) {
        if (e instanceof KinshipError) {
          out.push(`refused: ${e.code}`);
          out.push(`  ${e.message}`);
        } else {
          throw e;
        }
      }
      persist(host, opts);
      break;
    }
    case 'verify': {
      const v = verifyHost(host);
      out.push(v.ok
        ? `log verified — ${v.rows} rows, dense in seq, folds to the state the fleet holds`
        : `log NOT verified — ${v.rows} rows`);
      out.push(...v.problems.map((p) => `  ${p}`));
      break;
    }
    default:
      throw new Error(`unknown command \`${opts.command}\` — init, plan, run, tick, digest, redact, draft, approve, publish or verify`);
  }
  return out;
}

/** The entry point. `main` is exported so a test can drive it without a subprocess. */
export function main(argv: readonly string[]): string[] {
  const opts = parseArgs(argv);
  if (opts.command === 'run' && opts.watch) {
    const out: string[] = [];
    const step = (): void => {
      const host = bootHost(opts);
      const written = persist(host, opts);
      console.log(`[${new Date().toISOString()}] appended ${written} row(s)`);
      for (const line of operatorView(host)) console.log(line);
    };
    step();
    setInterval(step, opts.tickMs);
    return ['watching — the host ticks, persists and prints. It sends nothing.'];
  }
  return runCommand(opts);
}

const invokedDirectly = process.argv[1]?.endsWith('host.ts');
if (invokedDirectly) {
  try {
    for (const line of main(process.argv.slice(2))) console.log(line);
  } catch (e) {
    console.error(`host refused: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
