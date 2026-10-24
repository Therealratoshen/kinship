/**
 * The MCP conformance test — the protocol, from the wire.
 *
 * **Why it is a subprocess and not a function call.** A protocol implementation you can only test
 * through a function is a protocol implementation you have not tested: the framing, the line
 * endings, the stdout discipline and the handshake are all part of the contract, and a client will
 * not forgive a stray `console.log` on stdout. **So the stdio loop is tested the way a client uses
 * it** — a real process, real lines in, real lines out.
 *
 * Six things a client needs, each with a test that can fail:
 *   1. `initialize` answers with the protocol version and the tool capability.
 *   2. `tools/list` exposes the six tools, each with a name, a description and a JSON Schema.
 *   3. `tools/call` on a real tool answers with `content: [{type:'text'}]`.
 *   4. `kinship_propose` DRAFTS — it never sends, and it says so.
 *   5. `kinship_approve` without a reason is REFUSED, because a verdict without a why is not a record.
 *   6. An unknown tool and an unknown method are JSON-RPC errors, not silence.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REFUSAL_CODES } from 'kinship-runtime/src/errors.ts';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ADAPTER = join(HERE, '..');
const REPO = join(ADAPTER, '..', '..');

const ANSWERS = [
  'community_name: "AI Builders ID"',
  'schedule: "every other Saturday"',
  'venue_source: "manual"',
  'sponsor_list: "none yet"',
  'escalation_contact: "organiser"',
  'member_notice_text: "bot ini asisten organiser"',
  'rsvp_source_of_truth: "google form"',
  'partner_policy: "Kopdar Sebelah saja"',
].join('\n');

/** A temp community: the shipped pack, its answers, its plan, and a log folder. */
function aCommunity(): { dir: string; config: string; plan: string; log: string } {
  const dir = mkdtempSync(join(tmpdir(), 'kinship-mcp-'));
  cpSync(join(REPO, 'orgs'), join(dir, 'orgs'), { recursive: true });
  cpSync(join(REPO, 'packs', 'kopdar-ops'), join(dir, 'kopdar-ops'), { recursive: true });
  const config = join(dir, 'kopdar-ops', 'pack.local.yaml');
  const plan = join(dir, 'kopdar-ops', 'pack.local.plan.yaml');
  writeFileSync(config, ANSWERS + '\n');
  cpSync(join(REPO, 'packs', 'kopdar-ops', 'pack.local.plan.example.yaml'), plan);
  return { dir, config, plan, log: join(dir, 'logs') };
}

/** Send the given JSON-RPC messages to a real server process and collect its answers. */
function talk(messages: unknown[], opts: { config: string; plan: string; log: string }): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [join(ADAPTER, 'src', 'server.ts'),
      '--pack', join(ADAPTER, '..', '..', 'packs', 'kopdar-ops'),
      '--config', opts.config, '--plan', opts.plan, '--log', opts.log], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', () => {
      try {
        resolve(out.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l)));
      } catch (e) {
        reject(new Error(`unparseable output: ${out}\nstderr: ${err}`));
      }
    });
    for (const m of messages) child.stdin.write(JSON.stringify(m) + '\n');
    child.stdin.end();
  });
}

const INIT = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } };

test('initialize answers with the protocol version and the tool capability', async () => {
  const c = aCommunity();
  try {
    const [res] = await talk([INIT], c);
    const r = res as { result: { protocolVersion: string; capabilities: Record<string, unknown>; serverInfo: { name: string } } };
    assert.equal(r.result.protocolVersion, '2025-06-18');
    assert.ok(r.result.capabilities.tools, 'the server advertises tools');
    assert.equal(r.result.serverInfo.name, 'kinship');
  } finally { rmSync(c.dir, { recursive: true, force: true }); }
});

test('tools/list exposes the six tools, each with a name, a description and a schema', async () => {
  const c = aCommunity();
  try {
    const [, res] = await talk([INIT, { jsonrpc: '2.0', id: 2, method: 'tools/list' }], c);
    const tools = (res as { result: { tools: { name: string; description: string; inputSchema: { type: string; properties: unknown } }[] } }).result.tools;
    assert.equal(tools.length, 6);
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, ['kinship_approve', 'kinship_digest', 'kinship_drafts', 'kinship_health', 'kinship_plan', 'kinship_propose']);
    for (const t of tools) {
      assert.ok(t.description.length > 40, `${t.name} needs a description a model can act on`);
      assert.equal(t.inputSchema.type, 'object');
      assert.ok(t.inputSchema.properties !== undefined);
    }
  } finally { rmSync(c.dir, { recursive: true, force: true }); }
});

test('kinship_propose DRAFTS and never sends — and it says so', async () => {
  const c = aCommunity();
  try {
    const [, res] = await talk([INIT, {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'kinship_propose', arguments: {
        actionClass: 'draft.reminder', agent: 'event-ops', eventId: 'ev-1',
        text: { id: 'halo', en: 'hello' },
      } },
    }], c);
    const text = (res as { result: { content: { type: string; text: string }[] } }).result.content[0]!.text;
    assert.match(text, /DRAFTED/);
    assert.match(text, /waiting on a human/i);
    assert.match(text, /has NOT been sent/i);
    assert.doesNotMatch(text, /sent to/i);
  } finally { rmSync(c.dir, { recursive: true, force: true }); }
});

test('kinship_approve without a reason is REFUSED — a verdict without a why is not a record', async () => {
  const c = aCommunity();
  try {
    // A real card first: the card lookup runs before the reason check, so a made-up card id would
    // be refused for the wrong reason and the test would pass for the wrong reason.
    const [, proposed] = await talk([INIT, {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'kinship_propose', arguments: {
        actionClass: 'draft.reminder', agent: 'event-ops', eventId: 'ev-1', text: { id: 'halo', en: 'hello' },
      } },
    }], c);
    const proposedText = (proposed as { result: { content: { text: string }[] } }).result.content[0]!.text;
    const cardId = /card (\S+)/.exec(proposedText)?.[1];
    assert.ok(cardId, `the proposal must name the card: ${proposedText}`);

    const [, res] = await talk([INIT, {
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'kinship_approve', arguments: { cardId, verdict: 'approve', why: '' } },
    }], c);
    const text = (res as { result: { content: { text: string }[] } }).result.content[0]!.text;
    assert.match(text, /REFUSED/);
    assert.match(text, /verdict_without_why/);
  } finally { rmSync(c.dir, { recursive: true, force: true }); }
});

test('an unknown tool and an unknown method are JSON-RPC errors, not silence', async () => {
  const c = aCommunity();
  try {
    const [, a, b] = await talk([INIT,
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'kinship_send_everything', arguments: {} } },
      { jsonrpc: '2.0', id: 6, method: 'resources/list' },
    ], c);
    assert.equal((a as { error: { code: number } }).error.code, -32602);
    assert.match((a as { error: { message: string } }).error.message, /unknown tool/);
    assert.equal((b as { error: { code: number } }).error.code, -32601);
  } finally { rmSync(c.dir, { recursive: true, force: true }); }
});

test('kinship_plan reports the community\'s own plan and the problems in it', async () => {
  const c = aCommunity();
  try {
    const [, res] = await talk([INIT, {
      jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'kinship_plan', arguments: {} },
    }], c);
    const text = (res as { result: { content: { text: string }[] } }).result.content[0]!.text;
    assert.match(text, /action\(s\) planned/);
    assert.match(text, /draft\.reminder/);
  } finally { rmSync(c.dir, { recursive: true, force: true }); }
});

// --- the persona ---------------------------------------------------------------------------------------

test('the persona names only refusal codes the runtime actually has', () => {
  // A persona that names a code the runtime cannot raise teaches an assistant a vocabulary that
  // does not exist — and an assistant that gets it wrong sounds exactly like one that is lying.
  const persona = readFileSync(join(ADAPTER, 'kinship-persona.md'), 'utf8');
  const named = [...persona.matchAll(/^- (\w+) —/gm)].map((m) => m[1]!);
  assert.ok(named.length >= 10, `the persona should name the refusals an assistant will meet — found ${named.length}`);
  const unknown = named.filter((c) => !(REFUSAL_CODES as readonly string[]).includes(c));
  assert.deepEqual(unknown, [], `the persona names codes the runtime cannot raise: ${unknown.join(', ')}`);
});

test('the persona fits the platform budget and carries the one rule that matters', () => {
  const persona = readFileSync(join(ADAPTER, 'kinship-persona.md'), 'utf8');
  const start = persona.indexOf('```', persona.indexOf('## The instruction set')) + 3;
  const instructionSet = persona.slice(start, persona.indexOf('```', start));
  assert.ok(instructionSet.length <= 4000,
    `the instruction set is ${instructionSet.length} characters — Grok's Custom Agent budget is ~4000, and a persona that does not fit is a persona nobody uses`);
  assert.match(instructionSet, /may not send, schedule, post, or promise anything to a member without asking/i,
    'the one rule that matters must be in the instruction set, in the words an assistant reads');
  assert.match(instructionSet, /that refusal is the\s+answer/i);
  // And no member data: a persona is pasted into a chat platform.
  assert.equal(/wa:\d{4,}/.test(instructionSet), false, 'no member identifier in a pasted persona');
});
