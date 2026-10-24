/**
 * The Kinship tool surface — what an assistant may ask, and what it gets back.
 *
 * **Why this exists.** A community manager now has a personal assistant in the platform they already
 * use — Grok, Claude, Cursor, OpenClaw, Hermes — and the question is what happens when that
 * assistant wants to do something member-facing. The answer cannot be "it decided", because an
 * assistant has no authority and no memory that survives an audit. So the assistant **asks**:
 * it proposes an action here, and the runtime decides whether that action becomes a card for a
 * human or is refused.
 *
 * **That is the whole thesis in one round trip.** The assistant is the hand; Kinship is the
 * judgement; the human is the signature. An assistant that skips the middle step has not lost a
 * safety feature, it has lost the product.
 *
 * **Six tools, and each one is a read or a proposal — never a send.** There is no tool here that
 * delivers anything to a member, because phase 1 ships no transport (D21), and the commit path
 * refuses at `no_transport` regardless of who calls it. An assistant that asks Kinship to send
 * gets a refusal, and the refusal is in the log.
 *
 * | Tool | What it answers | What it changes |
 * |---|---|---|
 * | `kinship_plan` | what the fleet would do, and what is broken in the community's copy | nothing |
 * | `kinship_digest` | what happened in the last day, per channel | nothing |
 * | `kinship_drafts` | what is waiting on the organiser | nothing |
 * | `kinship_propose` | **may this action go out?** | a card, or a refusal — never a send |
 * | `kinship_approve` | the organiser's verdict, with a reason | a decision, recorded |
 * | `kinship_health` | the fleet's condition, and what it does not measure | nothing |
 *
 * **And the refusals are the answer.** A tool that returns "refused, and here is the rule that
 * fired" is more useful to an assistant than one that returns a yes — and it is the only honest
 * thing to return, because the runtime is what decides.
 */
import { Fleet } from 'kinship-runtime/src/engine.ts';
import { KinshipError } from 'kinship-runtime/src/errors.ts';
import type { LocaleText, Packed } from 'kinship-runtime/src/types.ts';

/** A tool as MCP describes it: a name, a description, and a JSON Schema for its arguments. */
export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** The handler. Returns the text the assistant sees. */
  run: (args: Record<string, unknown>, ctx: ToolContext) => string;
}

/** What the planner says: the actions the fleet would take, and what is broken. */
export interface PlanView {
  wakes: { purpose: string; nextCheckAt: number; action: { text: LocaleText } }[];
  problems: { code: string; template: string; detail: string }[];
}

/** Everything a tool needs from the world around it. */
export interface ToolContext {
  pack: Packed;
  answers: Record<string, string>;
  /** The live fleet. A tool that changes something commits to it; a tool that does not, does not. */
  fleet: Fleet;
  /** The community's own plan, resolved. */
  plan: () => PlanView;
  /**
   * Write the log down.
   *
   * **A state-changing tool must call this.** The log is the only durable record of what the fleet
   * decided, so a tool that changes the world and does not persist it has done something the fleet
   * cannot explain afterwards — which is the failure this whole product exists to prevent.
   */
  persist: () => void;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** The tool catalogue. */
export const TOOLS: ToolDefinition[] = [
  {
    name: 'kinship_plan',
    title: 'What the fleet would do',
    description:
      'The community\'s own plan, resolved: the actions the fleet would take, when, and what is broken in ' +
      'the community\'s copy. Read-only. Use this before proposing anything — a template the runtime ' +
      'refuses is a template the assistant should not have written.',
    inputSchema: { type: 'object', properties: {} },
    run: (_args, ctx) => {
      const plan = ctx.plan();
      const lines: string[] = [];
      if (plan.problems.length > 0) {
        lines.push(`${plan.problems.length} problem(s) — nothing is scheduled until these are fixed:`);
        for (const p of plan.problems) lines.push(`  [${p.code}] ${p.template}: ${p.detail}`);
      }
      if (plan.wakes.length > 0) {
        lines.push(`${plan.wakes.length} action(s) planned:`);
        for (const w of plan.wakes) {
          lines.push(`  ${w.purpose}`);
          lines.push(`      at ${new Date(w.nextCheckAt).toISOString()}`);
          const copy = w.action.text[ctx.pack.locale[0] ?? 'id'] ?? '';
          lines.push(`      copy: ${copy.split('\n')[0]}`);
        }
      }
      if (lines.length === 0) lines.push('nothing planned — this community has no templates yet');
      return lines.join('\n');
    },
  },
  {
    name: 'kinship_digest',
    title: "Yesterday's digest, per channel",
    description:
      'What the fleet did in a window, per channel: drafts, human verdicts, refusals by code, and the ' +
      'threads still open. Read-only, and it names what it cannot see — it is the FLEET\'s day, not the ' +
      'community\'s chatter.',
    inputSchema: {
      type: 'object',
      properties: {
        windowHours: { type: 'number', description: 'How far back to look, in hours. Default 24.' },
      },
    },
    run: (args, ctx) => {
      const hours = typeof args.windowHours === 'number' && args.windowHours > 0 ? args.windowHours : 24;
      const d = ctx.fleet.digest(ctx.fleet.now(), hours * 3_600_000);
      const lines = [
        `digest — ${new Date(d.from).toISOString()} → ${new Date(d.to).toISOString()}`,
        `${d.totals.drafts} draft(s) · ${d.totals.approved} approved · ${d.totals.rejected} rejected · ${d.totals.edited} edited`,
        `${d.totals.refusals} refusal(s) · ${d.totals.openThreads} open thread(s) · ${d.waiting} waiting on a human`,
      ];
      for (const c of d.channels) {
        lines.push(`  ${c.channel}: ${c.drafts} draft(s), ${c.approved} approved, ${c.rejected} rejected, ${c.edited} edited`);
      }
      for (const [code, n] of Object.entries(d.refusalsByCode)) lines.push(`  refused: ${code} ×${n}`);
      lines.push(`scope: ${d.scope}`);
      return lines.join('\n');
    },
  },
  {
    name: 'kinship_drafts',
    title: 'What is waiting on the organiser',
    description:
      'The cards a human still has to decide, and what each one is waiting for. Read-only. Nothing here ' +
      'can be approved by the assistant — approval is the human\'s, and it needs a reason.',
    inputSchema: { type: 'object', properties: {} },
    run: (_args, ctx) => {
      const box = ctx.fleet.inbox();
      if (box.items.length === 0) return 'nothing is waiting on a human';
      const lines = [`${box.counts.verdict} to decide, ${box.counts.handoff} to hand over, ${box.counts.overdue} overdue`];
      for (const item of box.items) lines.push(`  [${item.kind}] ${item.ref} — ${item.action}\n      ${item.detail}`);
      return lines.join('\n');
    },
  },
  {
    name: 'kinship_propose',
    title: 'Propose a member-facing action — the runtime decides',
    description:
      'Propose an action the fleet wants to take toward a member. The RUNTIME decides: it becomes a card ' +
      'for a human to approve, or it is refused with the rule that fired. This never sends anything — ' +
      'phase 1 has no transport, and the refusal is recorded. Use it for every member-facing action; ' +
      'never claim an action was sent.',
    inputSchema: {
      type: 'object',
      properties: {
        actionClass: { type: 'string', description: 'The action class, e.g. draft.reminder or rsvp.chase.' },
        agent: { type: 'string', description: 'The agent that would take it. Default: event-ops.' },
        eventId: { type: 'string', description: 'The event this belongs to.' },
        phase: { type: 'string', description: 'The phase, e.g. t-minus-1. Optional.' },
        text: { type: 'object', description: 'The copy, keyed by language code, e.g. {"id": "...", "en": "..."}.' },
      },
      required: ['actionClass', 'text'],
    },
    run: (args, ctx) => {
      const text = (args.text ?? {}) as LocaleText;
      try {
        const result = ctx.fleet.attempt({
          actionClass: str(args.actionClass),
          agent: str(args.agent) || 'event-ops',
          origin: { kind: 'event', id: str(args.eventId) || 'assistant' },
          ...(args.phase !== undefined ? { phase: str(args.phase) as never } : {}),
          text,
        });
        if (result.disposition === 'card' && result.card !== null) {
          // **The card must be written down.** The log is the only durable record of what the fleet
          // decided, so a tool that drafts a card and does not persist it has done something the
          // fleet cannot explain afterwards — and an assistant that restarts would propose the same
          // card again, forever.
          ctx.persist();
          return [
            `DRAFTED — card ${result.card.id} is waiting on a human.`,
            'It has NOT been sent, and it will not be sent until a named human approves it with a reason.',
            `copy: ${(result.card.revision.text[ctx.pack.locale[0] ?? 'id'] ?? '').split('\n')[0]}`,
          ].join('\n');
        }
        return [
          `REFUSED — the class \`${str(args.actionClass)}\` runs unattended, and a timer-free assistant may not run it.`,
          'Only a human-gated draft lane may be proposed this way.',
        ].join('\n');
      } catch (e) {
        if (e instanceof KinshipError) {
          return [`REFUSED — ${e.code}.`, e.message].join('\n');
        }
        throw e;
      }
    },
  },
  {
    name: 'kinship_approve',
    title: "Record the organiser's verdict",
    description:
      "Record a human's decision on a card: approve, edit, or reject, ALWAYS with a reason. The assistant " +
      'may pass on a decision a human has already made, and must never invent one. A verdict without a ' +
      'reason is not a record.',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'The card to decide.' },
        verdict: { type: 'string', description: 'approve, edit, or reject.' },
        why: { type: 'string', description: "The human's reason. Required — a verdict without a why is refused." },
        by: { type: 'string', description: 'Who decided. Default: organiser.' },
        text: { type: 'object', description: 'The replacement copy, keyed by language code. Only for an edit.' },
      },
      required: ['cardId', 'verdict', 'why'],
    },
    run: (args, ctx) => {
      const verdict = str(args.verdict);
      if (verdict !== 'approve' && verdict !== 'edit' && verdict !== 'reject') {
        return `REFUSED — the verdict must be approve, edit, or reject; got \`${verdict}\`.`;
      }
      try {
        const card = ctx.fleet.decideCard(str(args.cardId), {
          verdict,
          by: str(args.by) || 'organiser',
          why: str(args.why),
          ...(verdict === 'edit' ? { newText: (args.text ?? {}) as LocaleText } : {}),
        });
        // A verdict is a decision, and a decision nobody can read back is not a record.
        ctx.persist();
        return `card ${card.id} is now ${card.status}, decided by ${card.decidedBy}. The reason is in the log.`;
      } catch (e) {
        if (e instanceof KinshipError) return [`REFUSED — ${e.code}.`, e.message].join('\n');
        throw e;
      }
    },
  },
  {
    name: 'kinship_health',
    title: "The fleet's condition",
    description:
      'What condition the fleet is in: queue depth, refusals by code, idle agents, whether anyone is on ' +
      'duty — and, explicitly, what it does NOT measure. Read-only.',
    inputSchema: { type: 'object', properties: {} },
    run: (_args, ctx) => {
      const h = ctx.fleet.health();
      const lines = [
        `queue — ${h.queue.pending} pending of ${h.queue.cap}`,
        `refusals — ${h.refusals.length} kind(s)`,
      ];
      for (const r of h.refusals) lines.push(`  ${r.code} ×${r.count}`);
      lines.push('not measured: sentiment, churn, reach, delivery, and whether a draft was any good.');
      return lines.join('\n');
    },
  },
];

/** The catalogue as MCP's `tools/list` returns it. */
export function toolList(): { tools: unknown[] } {
  return {
    tools: TOOLS.map((t) => ({
      name: t.name,
      ...(t.title !== undefined ? { title: t.title } : {}),
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}

/** Find a tool by name, or `undefined`. */
export function findTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}
