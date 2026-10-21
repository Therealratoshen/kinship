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
 * deliver. Opening a transport port is a separate decision with its own dated row (D41's memo, §4:
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
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Fleet } from 'kinship-runtime/src/engine.ts';
import { loadPack } from 'kinship-runtime/src/pack.ts';
import type { LoggedEvent, NeedAnswers, Packed } from 'kinship-runtime/src/types.ts';
import { readAnswers, assertAnswersMatchNeeds } from './config.ts';
import { appendEvents, buildManifest, logDirFor, packDigest, readEvents, readManifest, writeManifest } from './store.ts';

export interface HostOptions {
  packDir: string;
  configFile: string | null;
  logRoot: string;
  /** How far a tick moves the clock. The host owns the clock (seam 2). */
  tickMs: number;
  /** Whether to keep ticking. A host that only ticks on demand is a demo; one that ticks is a host. */
  watch: boolean;
  /** The command to run. */
  command: 'run' | 'tick' | 'draft' | 'approve' | 'verify';
  cardId?: string;
  why?: string;
  /** For `draft`: the lane, the agent, and the copy the operator hands the runtime. */
  actionClass?: string;
  agent?: string;
  textId?: string;
  textEn?: string;
}

/** Everything the host knows about the community it is running for. */
export interface Host {
  pack: Packed;
  answers: NeedAnswers;
  fleet: Fleet;
  eventsPath: string;
  manifestPath: string;
  /** The rows already on disk when this host started. */
  onDisk: LoggedEvent[];
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

  const dir = logDirFor(opts.logRoot, pack.key);
  const eventsPath = join(dir, 'events.jsonl');
  const manifestPath = join(dir, 'manifest.json');
  const onDisk = readEvents(eventsPath);

  const fleet = onDisk.length > 0
    ? Fleet.replay(onDisk, answers, pack)
    : Fleet.boot(pack, answers, Date.now());

  return { pack, answers, fleet, eventsPath, manifestPath, onDisk };
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
 * The comparison is the restore-and-compare a host does after a restore: the rows are re-read from
 * disk and folded, and the state they fold to must be the state the fleet holds. Density, fold, and
 * the answers digest are checked at the same time.
 */
export function verifyHost(host: Host): { ok: boolean; problems: string[]; rows: number } {
  const rows = readEvents(host.eventsPath);
  const v = Fleet.verifyLog(rows, host.answers, host.pack, { state: host.fleet.state });
  return { ok: v.ok, problems: v.problems.map((p) => `[${p.kind}] ${p.detail}`), rows: rows.length };
}

/** Move the clock, fire whatever came due, and tell the operator what is waiting on them. */
export function tick(host: Host, opts: HostOptions): string[] {
  host.fleet.advance(opts.tickMs);
  const due = host.fleet.health().wakes.overdue;
  const fired: string[] = [];
  for (const wake of due) {
    host.fleet.fireWake(wake.id);
    fired.push(`wake ${wake.id} fired: ${wake.purpose}`);
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
  const tickMs = Number(flag('tick-ms') ?? '5000');
  if (!Number.isInteger(tickMs) || tickMs <= 0) throw new Error('--tick-ms must be a positive whole number of milliseconds');
  return {
    packDir,
    configFile: flag('config'),
    logRoot,
    tickMs,
    watch: has('watch'),
    command,
    cardId: flag('card') ?? undefined,
    why: flag('why') ?? undefined,
    actionClass: flag('class') ?? undefined,
    agent: flag('agent') ?? undefined,
    textId: flag('text-id') ?? undefined,
    textEn: flag('text-en') ?? undefined,
  };
}

/** Run one command and return what to print. */
export function runCommand(opts: HostOptions): string[] {
  const host = bootHost(opts);
  const out: string[] = [];
  switch (opts.command) {
    case 'run': {
      out.push(`host up — pack ${host.pack.key}, ${host.onDisk.length} rows on disk`);
      const written = persist(host, opts);
      out.push(written === 0 ? 'no new rows' : `appended ${written} row(s)`);
      out.push(...operatorView(host));
      break;
    }
    case 'tick': {
      const fired = tick(host, opts);
      out.push(...fired);
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
      if (opts.textId === undefined || opts.textEn === undefined) {
        throw new Error('draft needs --text-id and --text-en — the copy is the caller\'s, not the host\'s');
      }
      const actionClass = opts.actionClass ?? 'draft.reminder';
      const result = host.fleet.attempt({
        actionClass, agent: opts.agent ?? 'event-ops',
        origin: { kind: 'operator', id: 'manual' },
        textId: opts.textId, textEn: opts.textEn,
      });
      out.push(result.disposition === 'card'
        ? `${actionClass} drafted into card ${result.card!.id} — waiting on a human`
        : `${actionClass} ran on its own lane and was logged`);
      persist(host, opts);
      out.push(...operatorView(host));
      break;
    }
    case 'approve': {
      if (opts.cardId === undefined || opts.why === undefined) {
        throw new Error('approve needs --card <id> and --why "<reason>" — a verdict without a why is not a record');
      }
      out.push(approve(host, opts.cardId, opts.why));
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
      throw new Error(`unknown command \`${opts.command}\` — run, tick, draft, approve or verify`);
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
