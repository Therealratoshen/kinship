# Paperclip, read from the inside — what the reference implementation actually does

**Doc ID:** PAPERCLIP-OSS-STUDY-2026-10-17
**Status:** evidence document. Read-only study; no Kinship artifact was edited by this file's own claims.
**Method:** shallow clone of `paperclipai/paperclip` at `master` (229 MB, 10,651 files), read on disk at
`/tmp/paperclip-oss`; `gh api` for repo-side metrics; npm registry API for downloads; vendor docs
(`docs.paperclip.ing`, `doc/`, `docs/`) for stated behaviour.
**Two agents** read the implementation (`server/`, `packages/db`) and the repo-ops surface
(`.github/`, `rules/`, `evals/`, `packages/*-catalog`) in parallel; their findings are marked below and were
spot-checked against source where a claim would change a requirement.

**Confidence key:** ✅ read in code · ⚠️ stated in docs, not verified in code · ❓ not found / could not verify.

---

## 1. What Paperclip actually is, at the scale of numbers

| Measure | Value | Source | What it means for Kinship |
|---|---|---|---|
| Stars | 103,198 | `gh api repos/paperclipai/paperclip` 2026-10-17 | Headline adoption signal; also the least trustworthy one |
| Watchers | **472** | same | **0.46% of stargazers.** The star count and the attention count disagree by ~200×. E2 ("stars ≠ users") confirmed first-hand |
| Forks | 17,265 | same | Forks without a registry to receive them = noise (their answer is ClipHub, §5) |
| npm downloads | **191,461 / month** (48,653 in the week 2026-10-06→12) | `api.npmjs.org/downloads/point/last-month/paperclipai` | The honest adoption proxy. `npx paperclipai onboard` is the install path, so downloads ≈ install attempts |
| Age | created 2026-03-02, pushed 2026-10-17 | gh api | ~7 months |
| License | **MIT**, © "Paperclip AI" (LICENSE) / "Paperclip Labs, Inc" (README) | `LICENSE`, `README.md:582` | Answers half of PRD Q4: the highest-traction OSS agent plane chose MIT + a hosted cloud waitlist, not AGPL |
| Merged PRs | 3,420 | `gh api search/issues?q=is:pr+is:merged` | README claims "over 2,700" — **understates** its own number, i.e. stale marketing copy rather than inflated |
| Open PRs | **2,968** | same | Nearly as many open PRs as merged. Agent-speed contribution outran review capacity |
| Open / closed issues | 3,090 / 966 | same | 3.2 : 1 open:closed. Issue debt is the visible cost of 100k stars |
| GitHub Discussions | 214 | GraphQL | The quiet half of the community happens off issues |
| Community plugins | ~25 listed in `awesome-paperclip` (962★, third-party repo) | repo README | Ecosystem = 1% of parent stars, and **zero** entries are community-ops or event-ops (§4) |
| Server weight | ~543k non-test LOC in `server/src`; **170 tables**, 354 migrations in `packages/db` ✅ | agent 1 + spot-check | "Reuse Paperclip" is not free; it is adopting a 170-table domain model |

**The number worth stealing as a target, not as a boast:** Paperclip reached ~191k npm downloads/month in month 7
with 103k stars and 472 watchers. For Kinship's PRD §9, "installs" (a clone, an `npx`, a pack fetch) is the metric;
"stars" is banned as a success metric — the first-hand star/watcher gap is now the citation for that ban.

---

## 2. Architecture in one paragraph, and the sentence that matters

Two layers, stated identically in `doc/GOAL.md`, `docs/start/what-is-paperclip.md` and the README: a **control
plane** (Postgres + a single Express/Drizzle server + React UI) that owns identity, tasks, org chart, budgets,
governance, routines, secrets, activity; and **execution services = adapters**, which are the agents themselves.
`doc/GOAL.md`: *"The control plane doesn't run agents. It orchestrates them. Agents run wherever they run and
phone home."* Adapter types are LLM harnesses — Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Pi, Hermes,
Grok, Kimi, OpenClaw, process, HTTP ✅ (`packages/adapters/`, 13 examples).

That split is the single most useful thing Kinship can steal, because it is also the answer to "why agents not
n8n": **the durable part is the plane (state, governance, audit), the swappable part is the runtime.** Kinship
currently implies a fleet-runtime product; the reference implementation deliberately refuses to own the runtime.

---

## 3. The governance mechanics we'd already adopted — how they're actually enforced

Our PRD FR-1.5/1.6/1.7 came from Paperclip's *agent-facing skill doc*. The implementation is more honest than the doc.

| Mechanic | Reality in code | Grade |
|---|---|---|
| Exclusive checkout → 409 | `server/src/services/issues.ts` (~11657+): a conditional `UPDATE` that only succeeds when `assigneeAgentId` is null-or-self **and** `checkoutRunId` is null-or-same-run; no row updated → re-read → `HttpError(409, "Issue checkout conflict")`. Optimistic lock, **not** a unique index. `statusVersion` bigint on the row for stale-write detection. | ✅ |
| **"Never retry a 409"** | **Prompt-only.** `skills/paperclip/SKILL.md`, `references/api-reference.md`. No code prevents a retry loop. | ❓ |
| No ghost watchers (disposition guard) | `server/src/routes/issues.ts` (~4600–4700): moving to `in_review` requires one of **five** persisted paths — pending interaction, active approval, human assignee, `executionState.currentParticipant`, or `hasScheduledMonitor()`. Otherwise `422 invalid_issue_disposition`. | ✅ — stronger than our FR-1.5, which names one path |
| Monitor fields | **On the `issues` row itself**: `monitorNextCheckAt`, `monitorWakeRequestedAt`, `monitorAttemptCount`, `monitorScheduledBy` ✅. Tick claim is a DB update in `services/heartbeat/scheduling.ts`. | ✅ — a column, not a table. Cheaper than what I'd assumed |
| Revision-bound approvals | `revisionId`/`revisionNumber` live in the interaction's `payload.target`; creation validates against `documents.latestRevisionId` inside a row-locked transaction; resolution re-checks and returns `outcome: "stale_target"` ✅ | ✅ |
| Idempotency | DB-enforced, several shapes: `issue_create_idempotency_keys` unique(companyId,key), partial-unique on thread interactions, `routine_runs.idempotencyKey`, and six partial-unique fences on `agent_wakeup_requests` keyed on `idempotencyKey LIKE 'prefix:%'` ✅ | ✅ — the `LIKE`-prefix fence is a trick worth copying for per-event idempotency |
| Execution stages (review/approval) | jsonb on the issue (`executionPolicy`, `executionState`), decisions in `issue_execution_decisions` ✅ — **not** a table per stage | ✅ |
| Budgets | metric is **`billed_cents`** (money, not tokens), scoped company/agent/project, `hardStopEnabled`, open-incident partial-unique ✅. Nuance from README: "usage reporting and in-flight work can **delay** a stop." | ✅ |
| Approvals | type is a **closed 4-value enum** (`hire_agent`, `budget_override_required`, …) in `packages/shared/src/constants.ts` ✅ | ⚠️ this is the wall Kinship hits — see §4 |

**Read for Kinship:** everything we adopted is *transferable discipline*, not code we need. Conditional-UPDATE
locks, partial-unique "one active X per origin" indexes, CHECK-constrained proposal tables, monitor columns on the
work row, and a five-path disposition guard are a few hundred lines on Postgres/Supabase — which is exactly what
FR-1.5/1.6/1.7 already promise. Also: **Paperclip's audit trail is a table of `activity_log` rows with
`actorType/action/runId`, and every table carries `companyId` with no RLS.** Our multi-audience governance must do
better than "query scoping" if strangers' data is in it.

---

## 4. Does community-ops fit inside Paperclip? (PRD Q8, answered)

### What I looked for, and what exists

- **Channels.** `server/src/services/chat-channels/` implements **Telegram, Slack, Discord, Microsoft Teams,
  iMessage, GitHub** ✅. **WhatsApp: not found** — only a string in a third-party connector catalog. Experimental
  per the README; `doc/plans/chat-adapters/` is research, not shipped.
- **Event/meetup/Luma/community-ops domain.** Grep across `doc/`, `docs/`, `server/`, `ui/`: **zero hits** for
  `luma`, `meetup`, `event-ops`, `community manager`. The generic `originKind` + `title/description` on issues is
  the only place an event could live.
- **Third-party ecosystem.** `awesome-paperclip` (962★, ~25 entries): Discord/Slack/Telegram bridges, Linear and
  GitHub-issues on-ramps, an obsidian bridge, analytics, a company wizard, MCP shim. **No community-ops, no
  event-ops, no WhatsApp.**
- **Autonomy ladder — they already ship the shape of ours.** Connected Apps expose **per-action "Allowed / Ask
  first / Off"** policies (README; `doc/MCP-ACCESS-GOVERNANCE.md`, 461 lines: Application→Connection→Catalog→
  Profile→Gateway→Action Request). That is `auto / opt-in-auto / draft-then-approve / never` at the tool-gateway
  level, for engineering actions.

### The three options, with the two facts that decide them

| | Option 1 — build **on** Paperclip (self-host it, add Kinship as content) | Option 2 — **plugin** on Paperclip | Option 3 — **thin purpose-built plane**, Paperclip's patterns as the spec |
|---|---|---|---|
| Fit for our domain | Needs schema surgery: `approvals.type` is a **closed 4-value enum** ✅; events/guest lists/member queues are new first-class entities | Plugin manifest can declare **agents + projects + routines + skills** (`capabilities: ["agents.managed","projects.managed","routines.managed","skills.managed"]` ✅ — verified in `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`) | Full control of the action taxonomy |
| Can it hold our invariants? | Yes, but they'd be *our* additions to a 170-table core | **No** — `doc/plugins/PLUGIN_SPEC.md` non-goals: plugins "must not mutate approval, auth, issue checkout, or budget enforcement logic"; core owns them. Also: plugin UI is *trusted code*, not sandboxed; current model is "single-tenant, self-hosted, filesystem-persistent" | Yes, and the invariants are the product |
| Weight at 4–5 h/wk | Owning 543k LOC + embedded-Postgres/lease machinery — **no** | Cheap, but the ceiling is their core | ~a dozen tables on Supabase. Yes |
| Auth | **better-auth** email/password ✅ (`server/src/auth/better-auth.ts`) — we already run Clerk; two auth systems is a tax | inherits theirs | Clerk, native |

**Answer to Q8: Option 3 for the product — with Option 2 as the *pack format donor* and a fourth option taken
for phase 1 (below).** Deciding facts: (a) the plugin boundary explicitly excludes governance mutation, and
governance semantics *are* Kinship's differentiator; (b) `approvals.type` is a closed enum and our approval card is
the product's core object; (c) the schema is engineering-work-shaped and unmaintainable at his hours.
`doc/plugins/PLUGIN_SPEC.md`'s own status line — *"proposed complete spec… not part of the V1 implementation
contract"* — means even the plugin surface is moving under us.

**But the gap claim needs re-wording, not deleting.** Paperclip ships heartbeat wake, exclusive checkout, budgets
with hard stops, revisioned config with rollback, activity attribution, governed tool gateway with per-action
policies, low-trust containment, MCP governance, skill packs with version history. Our E3 claim ("no OSS
community-ops fleet exists") is **still true and now stronger** — but the *mechanisms* are not novel, and Kinship
must never market them as novel. What is absent from Paperclip, from its plugin ecosystem, and from every product
in the same category: a **community-action taxonomy** (promo / reminder / RSVP chase / no-show nudge / recap /
sponsor report), **identity disclosure of member-facing utterances**, **strangers-as-input containment for a live
group**, and an **event-lifecycle state machine**. That is the real wedge, and it is a *domain + trust* wedge, not
a control-plane-engineering wedge.

### Phase-1 option that costs zero code — do this

Shadow mode does not need Kinship's plane. It needs: a scheduled wake, drafting agents, an approval queue, and a
replayable log. **He already runs a Paperclip instance with all four.** Run the shadow-mode event as a Paperclip
company: a `kopdar-ops` project, three agents with `draft`-equivalent posture, routines for T-7d/T-1d, approval
cards as the human verdict, activity log + task documents as the audit replay, and the `FEELING-DIARY.md`
measurement unchanged. Risks to state honestly in the protocol: it couples phase-1 evidence to a dependency we
don't control, it teaches Paperclip's vocabulary rather than ours, and its approval types don't cover
member-facing content (which is fine, because phase 1 sends nothing). The payoff: the measurement that gates the
build arrives ~2 weeks earlier and at ~0 h of build time — the cheapest conversion of assumption to evidence
available, which is precisely what the final gate asked for.

---

## 5. The squad-pack lesson: Paperclip already solved the artifact

`packages/teams-catalog` (`@paperclipai/teams-catalog` v0.1.0, MIT, own `publishConfig.access: public`) and
`packages/skills-catalog` (v0.3.1) are **npm packages whose payload is markdown, not code** ✅. On disk:

```
catalog/bundled/software-development/product-engineering/
├── TEAM.md                      frontmatter + prose rationale
├── .paperclip.yaml                schema: paperclip/v1   (machine: permissions per agent)
├── agents/{cto,senior-coder,qa}/AGENTS.md    each: frontmatter (role, reportsTo, skills) + instructions
└── projects/product-engineering/{PROJECT.md, tasks/}
```

TEAM.md frontmatter: `slug`, `category`, namespaced `key: paperclipai/bundled/software-development/product-engineering`,
`manager: agents/cto/AGENTS.md`, `includes:`, **`requiredSkills:`** referencing skills by namespace key,
`defaultInstall: false`, `recommendedForCompanyTypes:`, `tags:`, `license: MIT` ✅. Plus a "weekly-engineering-sync
**routine**" bundled inside the team — recurring cadence ships *with* the org.

**Six lessons that change `packs/kopdar-ops/pack.example.yaml`:**

1. **Markdown directory + one tiny versioned YAML**, not a config blob. Instructions are human-readable files;
   the machine part is a schema key and a permissions map. (Kinship's current pack is 95 lines of invented YAML.)
2. **Namespaced keys** (`kinshipai/bundled/event-ops/kopdar`) make forks addressable — the prerequisite for the
   attribution trail in S2.
3. **Inter-pack deps by key** (`requiredSkills`) — so a pack can require a moderation procedure pack instead of
   copying it.
4. **`bundled` vs `optional` is the safety boundary** ✅ — core packs are curated and can guarantee
   "moderator is flag-only"; optional packs cannot. Kinship needs this exactly: `bundled/` = invariants held by us.
5. **Structure, not state.** `doc/CLIPHUB.md`: templates contain no in-progress tasks, no cost history, no runtime
   artifacts — *"just the blueprint."* Our packs must carry `needs:` (they do) and *never* venue history or member data.
6. **A validator + contract tests, semver independent of the app** (`validate-catalog.ts`,
   `shipped-catalog.test.ts`, `frontmatter.test.ts`) ✅. Cheap: one script + one test file turns a folder into an API.

**ClipHub** (`doc/CLIPHUB.md`) is their answer to the hub question, and it is the most relevant doc in the repo for
Kinship: "download a company"; categories; **semantic search over keyword**; install command
`paperclip install cliphub:<publisher>/<slug>`; version history + semver; stars/comments/forks per listing; and
**sub-packages** (single agent, team subtree, adapter config) so you don't have to publish a whole org. Note the
ordering: the **registry is specified after the export/import mechanism exists**, and the doc is an explicit
proposal, not a shipped product. Our hub-first-vs-fleet-first decision (D6) is the same call, and their sequencing
supports Branch B — pack format before gallery. Note too the schema-name drift: `.paperclip.yaml` says
`paperclip/v1` while TEAM.md frontmatter says `agentcompanies/v1` ✅ — two spec generations live in one catalog;
version the namespace on day one.

---

## 6. Governance features to add to Kinship that we did not have

Ranked by how much each closes a known hole. All are Paperclip mechanisms verified in code.

1. **`sourceTrust` metadata + quarantine redaction.** Every issue and work product carries `sourceTrust` jsonb;
   `server/src/services/source-trust.ts` replaces a quarantined body with a fixed string
   (`LOW_TRUST_QUARANTINED_BODY`) when read into a higher-trust context, nulling presentation and metadata.
   `doc/LOW-TRUST-PRESETS.md`: presets `standard` / `low_trust_review`, resolved by **intersecting**
   agent + project + issue policy, **narrower wins, fails closed**, and a low-trust preset must resolve to a
   concrete company-local scope. *"This is containment for hostile automated work. It is not a privacy system."*
   → **This is the mechanism behind our spec §2.1 ("member input is data, never instruction")**, which I'd written
   as a principle with no implementation shape. Add to the ladder: trust preset is resolved, not declared by the
   agent, and low-trust output cannot auto-promote.
2. **Private objects return 404, not 403; break-glass is audited.** `doc/ISSUE-PRIVACY.md` (204 lines): non-members
   get `404`; owners/admins reading a private object must pass `?breakGlass=true`, which writes
   `issue.break_glass_read` **and** puts a warning on the task, and explicitly does not change the read predicate
   or create a grant ✅. → Kinship: an organiser peeking at restricted member data leaves a mark the community can
   see. Direct answer to P4's "who can see the audit log" and to the UU PDP posture question.
3. **Per-origin "one active X" partial-unique indexes** ✅ (≈10 on `issues`), i.e. a single webhook/comment can only
   ever spawn one task. → our FR-1.7 becomes DB-enforced, not advisory. Also fixes duplicate-reminder risk (FR-2.2).
4. **Secret-proposal table with DB CHECK constraints** ✅ (kind∈{secret,binding}, 5 statuses, expiry, ancestor-chain
   snapshots, a ciphertext-scrubbing column). → our pack budgets + channel tokens need the same "propose, never
   echo" pattern.
5. **Run-id header verified against a signed JWT** ✅ (`middleware/auth.ts`) — the action→run→actor chain is
   cryptographically anchored, and `createdByRunId` is on work products and decisions. → FR-1.2 should say the
   log's `actor` is *verified*, not self-declared.
6. **Masked-preview rule, with a test that asserts the sentence.** `server/src/routes/access.ts` and
   `ui/src/lib/agent-onboarding-prompt.ts`: *"Store the parsed `token` field from the raw HTTP JSON response before
   printing or summarizing it… A token value containing literal `...` or `[redacted]` is a masked display preview,
   not a valid key"* — regression-tested in `agent-onboarding-prompt.test.ts` ✅. Three redaction layers
   (`middleware/redact-sensitive.ts`, `http-log-redaction.ts`, `logger.ts`). → for a community deployment holding
   attendee emails, this is a day-one requirement, not a v1 polish item.
7. **A command-safety matrix in the docs.** `doc/CLI.md` explains why `npx paperclipai "<untrusted arg>"` is inert
   and `pnpm paperclipai "<untrusted>"` runs a shell over it (backticks in an issue body = code execution).
   → Kinship packs that instruct CLI use must carry the same warning; pack `needs:` values are untrusted input.
8. **`skills/complain` + `skills/suggestion-box`** ✅ — an agent-only venting channel with *explicitly forbidden*
   structure, paired with a constructive, observed-only, ≤3-per-run suggestion path that must not double-fire.
   → the cheapest fleet-health signal available for an event-ops squad: "the reminder lane is a mess" as a
   first-class, rate-limited signal the organiser can read.
9. **`maps/` two-view capability contract** ✅ (`maps/README.md`): `feature-map/<area>.md` (what a person can do +
   how to verify the journey) and `agent-access-map/<area>.md` (API + entry point + permission boundary) share
   **capability IDs**, with orthogonal columns: API presence, Agent access, Policy, **Evidence**
   (`source-only|verified|failed|blocked|not-run`), Review depth. Two sentences worth adopting verbatim: *"an
   available read path cannot certify a write path"* and *"structural checks are not production acceptance."*
   → this is Kinship's spec structure: our action taxonomy *is* the capability list, and the Evidence column is
   what shadow mode fills in.

---

## 7. Repo operations: what to copy now, at first contributor, and never

From the `.github/`/`rules/`/`evals/` study, filtered to a 4–5 h/week solo project.

**Now, while pre-code (near-zero cost):**
- **`AGENTS.md` → scoped `rules/*.mdc` → machine-loaded mirror.** Their root file is 261 lines with a "read this
  first" order (GOAL → PRODUCT → SPEC-implementation → DEVELOPING) and `rules/README.md` *honestly states the `.mdc`
  dir is a convention, not auto-loaded* ✅. Kinship version: ≤60 lines, 3 numbered invariants, 2 rule files.
- **Maps, 3 capabilities only** (§6.9) — the Evidence column doubles as the shadow-mode acceptance table.
- **Dated, append-only plan files with a terminal state.** They mandate `doc/plans/YYYY-MM-DD-slug.md` ✅, and the
  230 files have **no archive convention** — hence `…-validation-2026-09-29.json`, `-09-30.json`,
  `-09-30-current.json` (the `-current` suffix is the tell) ✅. Our version: frontmatter
  `Status: proposed|done|superseded-by-<file>` — which is exactly the discipline `DECISIONS.md` already has.
- **8-line SECURITY.md** pointing at GitHub private advisories, "do not open public issues" ✅. Verbatim copyable.
- **Pack validator + one contract test** (§5.6).
- **`Model Used` as a required PR field** ✅ (provider, exact model id, context window, reasoning mode, tool use, or
  "None — human-authored"). Costs nothing, and gives the dataset for "which model wrote the PR that broke the pack".
- **Promptfoo Phase-0 evals with synonym-disjunction + `not-contains` on the forbidden action** ✅
  (`evals/promptfoo/tests/governance.yaml` asserts on `contains: "GET /api/approvals"` + a disjunction over
  acceptable refusal phrasings + a `metric` on `bypass`/`checkout`). This is the exact problem `llm-invariant-testing`
  describes, solved for cheap: **assert on verbs, endpoints and refusals; never on phrasing.** Kinship version: 5–8
  behaviour cases against the draft-only invariant ("no outbound call while autonomy=draft").
- **Skepticism pre-declared in prose.** `CONTRIBUTING.md` says uncoordinated feature PRs "may be closed, even when
  the implementation is thoughtful and high quality. That is about roadmap ownership… not a judgment about the
  effort" ✅. Their GitHub-side labels (`unclear value`, `questionable solution`, `contributor:flagged` "flagged for
  review by trust analysis", `pr:flagged` "Superagent flagged for security review", and an automated-fix ladder:
  `fix in progress` → `needs answer` → `iterating on PR` → `ready for review` / `couldn't fix`) exist **only in
  GitHub settings — zero repo hits** ⚠️. Lesson: write the stance down; the labels are the cheap half.

**At the first external contributor:** pure-function PR gates consolidated into one bot comment (8 `check-*.mjs`
files run by `commitperclip[bot]` on `pull_request_target`, **base checkout, never PR code** ✅); a "Thinking Path"
PR section requiring ≥3 traced steps ✅ (top-of-project → subsystem → problem → this change — the highest
signal-per-line artifact in the repo, and it kills drive-by agent PRs); label-as-compute-gate (`storybook-visual`,
`profile-ci` ✅) so expensive CI runs only when labelled; a one-file untrusted-PR review container
(`doc/UNTRUSTED-PR-REVIEW.md` ✅) so reviewing a hostile pack never touches the host.

**Do not bother at this scale:** canary→nightly→beta→stable CalVer with npm OIDC trusted publishing, environment
approval gates and tag-provenance chains (`doc/RELEASING.md`, a 1,627-line `release.yml` ✅); a provider-neutral
"eval kernel" package that is deliberately hollow ✅; per-lane release checklists and a "release captain" role;
CODEOWNERS with 4 owners ✅; Greptile's hard 5/5-no-open-P2 merge bar ✅ (paid per-PR, substitutes for parallel
human reviewers; at one person *you* are the gate); frozen `skills-releases/` snapshots with adoption provenance ✅
(premature until a pack is contested).

---

## 8. Strain inoculation — what 100k stars did to a 7-month-old repo

Concrete, verified, and all avoidable at week one:

1. **Two doc trees.** `doc/` (93 entries, 389 md, maintainer/agent-facing) **and** `docs/` (78 md, the published
   Mintlify site with `docs.json`) ✅, with `docs/plans/` vs the mandated `doc/plans/` and `docs/specs/` vs
   `doc/spec/` both live on master, and a duplicated nav entry in `docs.json` ✅. *Choose one authored tree; let the
   publish layer read from it.*
2. **No canonical doc index — and an unfinished README shipped beside a finished one.** There is **no
   `doc/README.md`**, only `doc/README-draft.md` ✅, next to a polished 600-line root README.
3. **Four screenshot homes, in violation of their own rule.** `CONTRIBUTING.md:102` bans committed screenshots;
   root `screenshots/` (1.7M), `docs/pr-screenshots/` (8.7M), `doc/screenshots/` (1.2M), `doc/pr/5429/` all exist ✅.
   *Any image that enters master is permanent. Either gate it or don't write the rule.*
4. **Declared policy with no enforcement.** The 1,000-line PR rule and the "no code comments in a PR" rule have **no
   CI implementation** ✅. At solo scale an unenforced rule becomes the de-facto norm, because there's no one to correct it.
5. **Ticket-ID leakage into public artifacts** (`PAP-14624` in `skills-releases/paperclip/releases.json`,
   `PAP-101` in `doc/design/KNOWN-DUPLICATES.md`) despite a `CONTRIBUTING.md` rule against it ✅ — for Kinship this is
   the *member-data* analogue: internal identifiers in a public pack or audit export.
6. **Dangling cross-repo reference:** `doc/evals.md` → `paperclip-evals/evals/paperclip-runner`, a directory that
   does not exist in the repo ✅.
7. **Workflow monoliths:** 8,880 lines across 25 files; `pr-trusted.yml` 1,636, `release.yml` 1,627, and
   `runs-on:` ladders hard-coded to a specific `repository_id` for self-hosted AWS runners ✅ — ownership diffusion
   lets a workflow grow instead of being rewritten.
8. **Root weight:** 186 loose files in `scripts/`, 14 hand-maintained `patches/*.patch` including **two versions of
   the same dependency** ✅, `pnpm-lock.yaml` 625K.
9. **Contribution backlog as the visible face of the project:** 2,968 open PRs and 3,090 open issues against 966
   closed. A newcomer's first impression is the queue. *Fix: cap what an agent can submit, and gate on Evidence,
   not volume.* Their README's answer to "is this slop?" is a merged-PR count — which is a throughput number, not a
   quality one.

---

## 9. What this changes in Kinship (the actionable list)

| # | Change | Artifact |
|---|---|---|
| 1 | **PRD Q8 answered:** thin purpose-built plane for the product; Paperclip's pack/plugin format as donor; **phase 1 runs inside the owner's existing Paperclip instance** | `PRD §12`, `DECISIONS.md`, `PLAN.md` W2–W5 |
| 2 | **PRD Q4 evidence:** MIT + hosted-cloud anchor is the category's proven shape; Paperclip is MIT with an EE policy *editing* layer while core keeps enforcement ✅ | `PRD §12-Q4`, `DECISIONS.md` |
| 3 | **E3 wording tightened:** the *mechanisms* are not novel; the gap is domain + trust. Claim ceiling gains a forbidden line ("we invented approvals/budgets/heartbeats") | `PRD §2.2/§2.3` |
| 4 | **New requirements from §6:** trust-preset resolution (fail-closed, narrower wins), quarantine of low-trust output in higher-trust context, 404-not-403 + audited break-glass, DB-enforced single-active-per-origin, verified actor chain, redaction + masked-preview rule with a test | `PRD §6 FR-1.x`, `spec/GOVERNANCE-SPEC-OUTLINE.md` §1.7/§2.1/§2.7 |
| 5 | **Pack v2:** markdown directory (`PACK.md` + `agents/*/AGENT.md` + `.kinship.yaml`), namespaced keys, `requiredPacks`, `bundled` vs `community`, structure-not-state, validator + one contract test | `packs/kopdar-ops/` |
| 6 | **Autonomy ladder gains a real precedent row:** Allowed / Ask-first / Off per action (their gateway) vs our draft / opt-in-auto / never per action-class + the per-agent-vs-per-action distinction | `spec/…` §1.1 |
| 7 | **Success metric swap:** installs/downloads (npm or git clone) and packs-fetched replace stars; star/watcher 200× gap becomes the citation for the existing ban | `PRD §9` |
| 8 | **Repo hygiene now, not later:** 8-line SECURITY.md, one doc tree, AGENTS.md + 2 rules, dated plans with terminal status, `Model Used` field, 5 promptfoo cases asserting the draft-only invariant | new files |
| 9 | **Do-not-copy list enters HOLD** (CalVer lanes, eval kernel, CODEOWNERS, Greptile merge bar, frozen skill snapshots) | `PLAN.md` §"Explicitly not doing" |
| 10 | **The "control plane vs runtime" split becomes Kinship's architecture sentence** — and the answer to "why not n8n" | `README.md`, `spec/…` |

One honest caveat on all of the above: this is a **single-repo, single-branch, point-in-time** read of `master` as of
2026-10-17. Plugin capabilities, chat-channel status, and the approval enum can change under us — which is itself
the argument for Option 3 plus the "swappable adapter" posture: depend on *patterns* we can implement, not on a
moving surface we cannot pin.
