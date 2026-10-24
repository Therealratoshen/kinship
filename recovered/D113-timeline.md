# D113 — what the dead session did, in order

Session `455907776823462`, turn `b6f5f4f3-2068-495d-8932-6707813a3b13` (see header for the exact id).

**It never committed and never pushed.** The two `.patch` files next to this one are the edits it had
already applied to `runtime/src/capabilities.ts`; the rest of the plan (validator rules, schema,
settings provenance, tests, docs) was still only in the design.

## Tool calls, in order

- `bash` :: cd /workspace/kinship
echo "=== org.ts: parseOrgCapabilityBlock + helpers ==="
awk '/function parseOrgCapabilityBlock/,/^}/' runtime/src/org.ts
echo
echo "=== org.ts: the two-level block reader ==="
grep -n "parseOrgCapabilityBlock\|function blockMap\|function block\|nestedBlock\|twoLevel" runtime/s
- `read` :: {"path":"/workspace/kinship/runtime/test/capabilities.test.ts"}
- `bash` :: cd /workspace/kinship
echo "=== settings.ts 80-100 (the notes array) ==="
sed -n '80,100p' runtime/src/settings.ts
echo
echo "=== types.ts 419-465 (capability types) ==="
sed -n '415,465p' runtime/src/types.ts
echo
echo "=== types.ts 520-545 (PackedOrg capabilities + SettingSource) ==="
sed -n '518,
- `bash` :: cd /workspace/kinship
echo "=== validator: org + schema handling ==="
grep -n "orgsRoot\|ORGANISATION\|organisation\|SCHEMA\|schema\|JSON.parse\|additionalProperties" scripts/validate-pack.mjs | head -40
echo
echo "=== the validator's cross-file org section ==="
sed -n "$(grep -n 'orgsRoot' scripts/
- `edit` :: /workspace/kinship/runtime/src/capabilities.ts
- `edit` :: /workspace/kinship/runtime/src/capabilities.ts
