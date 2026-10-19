/** Type surface of scripts/validate-pack.mjs — the shape gate the runtime boots against. */
export interface ValidateChecked {
  agents: number;
  skills: number;
  /** The organisation tier this pack resolves to, or null when the pack names none (D35). */
  org: string | null;
}

export interface ValidateOptions {
  /**
   * Where `orgs/<key>.yaml` is looked up. Defaults to `<cwd>/orgs`. Set it in tests that tamper with
   * an org manifest, so the working tree is never edited to prove a gate works.
   */
  orgsRoot?: string;
}

export interface ValidateResult {
  ok: boolean;
  errors: string[];
  notices: string[];
  checked: ValidateChecked;
}
export declare function validatePack(dir: string, opts?: ValidateOptions): ValidateResult;
