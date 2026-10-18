/**
 * The gate that `tsc` would provide — but this runtime has no dependencies and no install step
 * (D21), and Node's type-stripping does not *check* types, it only erases them. So a type used
 * without being imported is invisible here and fatal for the first contributor who runs a real
 * typecheck. That is not hypothetical: `shatter.ts` referenced `Ctx` in three signatures without
 * importing it, and 73 tests passed over it.
 *
 * This is a structural scanner, not a type system. It checks one thing it can actually prove
 * from source text: every type name declared in `types.ts` that a file *uses* must be *imported*
 * by that file. Anything subtler belongs in a real typecheck, and the day a typecheck is added
 * this file shrinks to the duplicate-import rule alone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Type names declared in src/types.ts — the closed vocabulary the runtime may reference. */
function declaredTypeNames(): string[] {
  const types = readFileSync(join(SRC, 'types.ts'), 'utf8');
  return [...types.matchAll(/^export (?:interface|type) (\w+)/gm)].map((m) => m[1]!);
}

/** Strip line and block comments so prose ("Member input narrows…") cannot register as code. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Names imported by a file, from every import form the erasable syntax allows. */
function importedNames(src: string): Set<string> {
  const names = new Set<string>();
  for (const m of src.matchAll(/import(?:\s+type)?\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1]!.split(',')) {
      const token = part.trim().replace(/^type\s+/, '');
      if (!token) continue;
      names.add(token.split(/\s+as\s+/).pop()!.trim());
    }
  }
  return names;
}

interface ImportDefect {
  kind: 'type_not_imported' | 'name_imported_twice';
  name: string;
}

/** The rule, over a source string. Exported to no one: it is a test seam on purpose. */
function defectsIn(body: string, declared: string[], imported: Set<string>): ImportDefect[] {
  const found: ImportDefect[] = [];
  for (const name of declared) {
    if (imported.has(name)) continue;
    if (new RegExp(`\\b${name}\\b`).test(body)) found.push({ kind: 'type_not_imported', name });
  }
  const seen = new Set<string>();
  for (const m of body.matchAll(/import(?:\s+type)?\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1]!.split(',')) {
      const token = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()!.trim();
      if (token && seen.has(token)) found.push({ kind: 'name_imported_twice', name: token });
      else if (token) seen.add(token);
    }
  }
  return found;
}

test('every runtime source file imports each types.ts name it uses (no invisible tsc breakage)', () => {
  const declared = declaredTypeNames();
  const offenders: string[] = [];
  for (const file of readdirSync(SRC)) {
    if (file === 'types.ts') continue; // the declaration site, not a use site
    const src = readFileSync(join(SRC, file), 'utf8');
    const body = withoutComments(src.replace(/^import[\s\S]*?;$/gm, ''));
    const defects = defectsIn(body, declared, importedNames(src));
    if (defects.length) offenders.push(`${file}: ${defects.map((d) => `${d.kind}(${d.name})`).join(', ')}`);
  }
  assert.deepEqual(offenders, [], `unresolved type references in runtime/src:\n${offenders.join('\n')}`);
});

test('the scanner can fail: a file that uses Ctx without importing it is reported', () => {
  // The real shape of the shatter.ts defect, reconstructed so the rule cannot pass for the wrong reason.
  const broken = `import { refuse } from './errors.ts';\nexport function trip(ctx: Ctx): void { refuse('not_the_human', '§2.6', 'x'); }\n`;
  const defects = defectsIn(broken, ['Ctx', 'FleetState'], importedNames(broken));
  assert.deepEqual(defects, [{ kind: 'type_not_imported', name: 'Ctx' }]);
});

test('the scanner can fail: a name imported twice is reported', () => {
  const dup = `import type { FleetEvent } from './types.ts';\nimport type { FleetEvent } from './types.ts';\nconst x: FleetEvent | null = null;\nvoid x;\n`;
  assert.deepEqual(defectsIn(dup, [], new Set(['FleetEvent'])), [{ kind: 'name_imported_twice', name: 'FleetEvent' }]);
});

test('the scanner does not fire on a value + type split of the same specifier (legal, not a duplicate)', () => {
  const split = `import { PHASES } from './types.ts';\nimport type { Ctx, Phase } from './types.ts';\nexport function f(_p: Phase, _c: Ctx): number { return PHASES.length; }\n`;
  const declared = ['Ctx', 'Phase', 'PHASES'];
  assert.deepEqual(defectsIn(withoutComments(split.replace(/^import[\s\S]*?;$/gm, '')), declared, importedNames(split)), []);
});

test('prose in comments is not a type reference (no false positives on the docs this repo loves)', () => {
  const commented = `// Member input narrows any lane to draft.\n/** A Card is the only member-visible artefact. */\nexport function noop(): void {}\n`;
  assert.deepEqual(defectsIn(withoutComments(commented), ['Member', 'Card'], new Set()), []);
});
