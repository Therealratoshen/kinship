/**
 * The Kinship MCP server — so any assistant can ask Kinship for permission.
 *
 * **The shape of it.** MCP is JSON-RPC 2.0 over a transport; the local one is **stdio** — one JSON
 * message per line on stdin, one answer per line on stdout. Version `2025-06-18`. The methods that
 * matter here are `initialize`, `notifications/initialized`, `ping`, `tools/list` and `tools/call`.
 *
 * **Why it exists.** Grok, Claude Desktop, Cursor, OpenClaw and Hermes all speak MCP, so ONE server
 * gives every one of them the same governance — which is what "support all AI agents" has to mean
 * if it is going to mean anything. An assistant in a platform the community manager already uses can
 * now **ask** whether an action may go out, and the answer comes from the runtime rather than from
 * the model's confidence.
 *
 * **And what it does NOT do.** There is no tool here that delivers anything to a member. Phase 1
 * ships no transport (D21), so the commit path refuses at `no_transport` whoever calls it — and the
 * refusal is in the log. **The assistant is the hand; Kinship is the judgement; the human is the
 * signature.** A server that let the assistant skip the middle step would not be a governance layer.
 *
 * **The transport owns the clock and the store** (seam 2 and seam 3 of `spec/HOST-CONTRACT.md`): the
 * server holds the log, and every state-changing tool commits to it. `kinship_approve` and
 * `kinship_propose` therefore change the world — and the world they change is recorded.
 *
 * **One dependency, and it is a path.** The runtime is imported as `kinship-runtime`, which
 * `npm install` resolves to a symlink — the same trick the reference host uses, so a fork installs
 * nothing from a registry.
 */
import { createInterface } from 'node:readline';
import { planWakes } from 'kinship-runtime/src/plan.ts';
// The reference host is the reference implementation of the four seams — the answers reader, the
// log store and the clock. This server is a SECOND host, and it reuses those seams rather than
// re-implementing the store: two implementations of "how a host persists a log" is two rules in two
// places, which is the failure class this repository keeps recording.
import { bootHost, persist, type HostOptions } from 'kinship-adapter-reference/src/host.ts';
import { TOOLS, findTool, toolList, type ToolContext } from './tools.ts';

/** The MCP protocol version this server speaks. */
export const PROTOCOL_VERSION = '2025-06-18';

/** A JSON-RPC request as it arrives on stdin. */
interface RpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/** The answer to a request. */
export interface RpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Answer one JSON-RPC request.
 *
 * **Exported so it can be tested without a pipe.** The stdio loop below is a thin wrapper around
 * this — and that is deliberate, because a protocol implementation you can only test through a
 * subprocess is a protocol implementation you cannot test.
 */
export function handleRequest(request: RpcRequest, ctx: ToolContext): RpcResponse | null {
  const id = request.id ?? null;

  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'kinship', version: '0.1.0' },
          instructions:
            'Kinship decides what an AI agent fleet may do to reach a person, and proves that it was ' +
            'decided. Propose member-facing actions with kinship_propose — the runtime decides, and a ' +
            'refusal is an answer. Nothing here sends anything.',
        },
      };

    case 'notifications/initialized':
      return null; // a notification has no id and gets no answer

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: toolList() };

    case 'tools/call': {
      const name = String(request.params?.name ?? '');
      const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
      const tool = findTool(name);
      if (tool === undefined) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `unknown tool \`${name}\` — this server exposes ${TOOLS.map((t) => t.name).join(', ')}` },
        };
      }
      try {
        const text = tool.run(args, ctx);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } };
      } catch (e) {
        // A tool that throws is a bug in the tool, and the protocol says so — `isError: true` with the
        // message is for a tool that ran and the ANSWER is an error (a refusal); an exception is the
        // server's fault and belongs in the JSON-RPC error channel.
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: e instanceof Error ? e.message : String(e) },
        };
      }
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `method \`${request.method}\` is not implemented by this server` },
      };
  }
}

/**
 * Build the tool context: the pack, the answers, and a fleet that **continues the log on disk**.
 *
 * The reference host's `bootHost` replays an existing log rather than starting again, so an assistant
 * that connects to a running community sees the same history the human does — and a card it approves
 * lands in the same log the human reads.
 */
export function buildContext(opts: { packDir: string; configFile: string | null; planFile: string | null; logDir: string | null; now: number }): ToolContext {
  const hostOptions = {
    packDir: opts.packDir,
    configFile: opts.configFile,
    planFile: opts.planFile,
    logRoot: opts.logDir ?? 'logs',
    tickMs: 1000,
    watch: false,
    command: 'run',
    text: {},
  } as unknown as HostOptions;
  const host = bootHost(hostOptions);
  if (opts.now !== undefined) host.fleet.advance(opts.now - host.fleet.now());
  return {
    pack: host.pack,
    answers: host.answers,
    fleet: host.fleet,
    plan: () => {
      const p = planWakes({
        templates: host.plan.templates,
        event: host.plan.event,
        pack: host.pack,
        answers: host.answers,
      });
      return {
        wakes: p.wakes.map((w) => ({ purpose: w.purpose, nextCheckAt: w.nextCheckAt, action: { text: w.action.text } })),
        problems: p.problems.map((x) => ({ code: x.code, template: x.template, detail: x.detail })),
      };
    },
    persist: () => {
      persist(host, hostOptions);
    },
  };
}

/** The stdio loop: one JSON message per line in, one per line out. */
export function serve(ctx: ToolContext, input: NodeJS.ReadableStream = process.stdin): void {
  const rl = createInterface({ input, crlfDelay: Infinity });
  rl.on('line', (line: string) => {
    const trimmed = line.trim();
    if (trimmed === '') return;
    let request: RpcRequest;
    try {
      request = JSON.parse(trimmed) as RpcRequest;
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) + '\n');
      return;
    }
    const response = handleRequest(request, ctx);
    if (response !== null) process.stdout.write(JSON.stringify(response) + '\n');
  });
}

// --- the entry point -----------------------------------------------------------------------------------

/** Read `--name value` off the command line. */
function flag(argv: readonly string[], name: string): string | null {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? null : (argv[at + 1] ?? null);
}

/**
 * The command an assistant is pointed at.
 *
 * `node src/server.ts --pack <dir> --config <file> --plan <file> --log <dir>` speaks MCP on
 * stdin/stdout. It is
 * a **host** in the host-contract's sense: it owns the clock and the store, and it holds every
 * credential — this one holds no provider key at all, because Kinship has no model.
 */
export function main(argv: readonly string[]): void {
  const packDir = flag(argv, 'pack');
  if (packDir === null) {
    process.stderr.write('kinship-mcp: --pack <dir> is required — the pack this community runs\n');
    process.exit(1);
  }
  const ctx = buildContext({
    packDir,
    configFile: flag(argv, 'config'),
    planFile: flag(argv, 'plan'),
    logDir: flag(argv, 'log'),
    now: Date.now(),
  });
  serve(ctx);
}

const invokedDirectly = process.argv[1]?.endsWith('server.ts');
if (invokedDirectly) main(process.argv.slice(2));
