/**
 * §1.1 the autonomy ladder, resolved per action class, and §1.7 fail-closed trust resolution.
 *
 * The three rules that make the ladder real, each checkable by a test:
 * - default is deny: a class with no configured level behaves as `never`;
 * - `never` is a floor: no runtime operation widens it (the pack edit is the only path, and the
 *   validator holds that edit to the invariants);
 * - narrowing always wins (§1.7): shatter freezes, the org's autonomy ceiling, the partner gate, and
 *   any future preset can only move a class down, never up.
 */
import { isShattered } from './shatter.ts';
import { ceilingFor } from './settings.ts';
import type { Autonomy, Ctx, FleetState, NeedAnswers, Packed, ResolvedSettings } from './types.ts';

const ORDER: Record<Autonomy, number> = { 'opt-in-auto': 0, draft: 1, never: 2 };

/** The §1.7 intersection — narrower wins, and it fails closed. */
export function narrowest(a: Autonomy, b: Autonomy): Autonomy {
  return ORDER[a] >= ORDER[b] ? a : b;
}

export interface ResolveArgs {
  pack: Packed;
  role: string;
  actionClass: string;
  state: FleetState;
  answers: NeedAnswers;
  channel?: string;
  /**
   * The resolved tier stack (D35). Optional so a caller that has no org tier can still resolve the
   * pack's own ladder — but every engine path supplies it, because an absent `settings` is the one
   * way a ceiling could be reported and then not enforced.
   */
  settings?: ResolvedSettings;
}

export function resolveAutonomy(args: ResolveArgs): Autonomy {
  const agent = args.pack.agents[args.role];
  // Default deny — an unset class is not a loophole, and an unknown role has no classes at all.
  const declared = agent?.autonomyByClass[args.actionClass];
  if (declared === undefined || declared === 'never') return 'never';

  let level: Autonomy = declared;
  // §1.7 narrowing, from the tier above: a ceiling can only ever pull a class down, and an
  // undeclared class was already returned as `never` above — the org cannot resurrect what the pack
  // made absent (invariant #1), and cannot reach what nobody declared.
  if (args.settings) {
    const ceiling = ceilingFor(args.settings, args.actionClass);
    if (ceiling !== undefined) level = narrowest(level, ceiling);
  }
  if (args.actionClass.startsWith('promote.cross') && !args.answers['partner_policy']) {
    level = 'never'; // §2.11 — the class is unreachable until the organiser names partners + line
  }
  if (isShattered(args.state, args.channel)) {
    level = narrowest(level, 'draft'); // §2.6 — the complaint freezes the lane
  }
  return level;
}
