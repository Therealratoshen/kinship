/** Type surface of scripts/validate-pack.mjs — the shape gate the runtime boots against. */
export interface ValidateResult {
  ok: boolean;
  errors: string[];
  notices: string[];
  checked: number;
}
export declare function validatePack(dir: string): ValidateResult;
