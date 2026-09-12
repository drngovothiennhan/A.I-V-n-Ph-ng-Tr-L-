# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–32 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / EXACT SOURCE STAMPING / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION / POST-PROMOTION ROLLBACK
NEXT: production remains BLOCKED by missing `VERCEL_TOKEN`. Continue only with current-source issues proven by tests or fresh runtime evidence.

## CURRENT_OBJECTIVE
Continue additive, production-safe hardening from the canonical orchestrator and approved Dashboard v1.5. Keep SOURCE READY separate from PRODUCTION VERIFIED. Do not rebuild stable subsystems, fabricate telemetry, or deploy through an unscoped path.

## COMPLETED
- PHASE 0 baseline/safety audit completed.
- PHASE 1 canonical AI Core implemented with QUESTION, TASK, DOCUMENT_TASK, DATA_TASK, SEARCH_TASK, INTERNAL_KNOWLEDGE_TASK, COMMUNICATION_TASK, SYSTEM_COMMAND, APP_COMMAND, VOICE_COMMAND.
- PHASE 2 Gemini-first/source routing hardened; ordinary questions do not depend on internal docs; explicit internal opt-in and negative internal phrasing are respected; 401/403/429 uses honest fallback/circuit behavior.
- PHASE 3 Drive readonly scope resolver bug fixed. Drive remains direct retrieval + relevance ranking; durable semantic indexing/delta sync is NOT claimed complete.
- PHASE 5 canonical orchestration metadata attached without chain-of-thought logging.
- PHASE 12 Global Cancel v3.3 merged across text + voice.
- PHASE 13 existing safe-by-default approval engine preserved.
- PHASE 14 Authorization Broker v3.4 merged with least-privilege connection/permission semantics.
- PHASE 15 Context Manager v3.5 merged with bounded context and deterministic compression.
- PHASE 16–17 Operations Center v3.6 merged: unified Task Center + AI Center, real task store, measured progress only, honest `NO TELEMETRY`.
- PHASE 18 Chief timeout hardening: Gemini `chief` timeout 30s -> 12s; timeout/abort becomes honest local fallback instead of HTTP 502; non-timeout failures still propagate.
- PHASE 19 deployment truthfulness: missing `VERCEL_TOKEN` FAILS `deploy-production`; skipped deployment can no longer appear green. Production smoke requires exact `x-ai-office-source-commit == GITHUB_SHA`.
- PHASE 20 stable `/api/research` corrected to `api/research.ts -> research-v31.js`; obsolete v29 Vercel rewrite removed.
- PHASE 21 Gemini routing corrected: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- PHASE 22 production smoke requires live primary/economy Gemini model contract plus artifact selftest and research-safety asset.
- PHASE 23 XiaoZhi transient health event verified without speculative patching: one `VOICE_RENDER_UNREACHABLE` sample recovered immediately; browser fallback retained.
- PHASE 24 XiaoZhi telemetry aligned to voice render version `2.3`; runtime/WebSocket behavior unchanged.
- PHASE 25 Vercel deployment path verified to correct project/domain, but native Git auto-deploy linkage is NOT proven; do not bypass the tested token-based workflow.
- PHASE 26 exact source-commit stamping: `api/health.ts` emits `x-ai-office-source-commit` from explicit runtime state; CLI deploy passes `AI_OFFICE_SOURCE_COMMIT=$GITHUB_SHA` so smoke verifies the deliberately stamped commit.
- PHASE 27 immutable release shell/assets: `api/app.ts` and `api/asset.ts` no longer load raw GitHub `main` in production. They resolve raw content from `AI_OFFICE_SOURCE_COMMIT` / `VERCEL_GIT_COMMIT_SHA`, validate a full 40-character hex SHA, and expose `x-ai-office-ui-source-ref` / `x-ai-office-asset-source-ref`.
- PHASE 28 coherent production smoke: deployment verifies backend health SHA, UI shell source-ref and runtime asset source-ref against the validated `GITHUB_SHA`, in addition to provider/artifact/safety checks.
- PHASE 29 Drive Bridge release pinning: Runtime Credentials popup no longer copies `DriveBrainBridge.gs` from raw GitHub `main`; it fetches the Bridge through the SHA-pinned `/api/asset` gateway. `api/asset.ts` allows exactly `integrations/google-apps-script/DriveBrainBridge.gs` outside `src/`/`public/`, serves `.gs` as plain text, and regression prevents raw-main drift.
- PHASE 30 candidate promotion gate: production bundle is deployed with `--prod --skip-domain`, keeping production environment/secrets while withholding production traffic. Candidate is smoke-tested through `vercel curl` for provider contract, exact source SHA, UI source-ref, runtime asset source-ref, safety asset and artifact selftest. Only a passing candidate can run `vercel promote`; production domain is then smoke-tested again.
- PHASE 31 quota-safe provider diagnostics: Runtime Credentials popup is health-only by default and no longer auto-calls Gemini Google Search Grounding or Drive Canary. Expensive checks run only after explicit `Kiểm tra Grounding + Canary`; unprobed states are `MANUAL_CHECK_REQUIRED` rather than fake failures. Public API separates cheap `refresh()` from explicit `check()`.
- PHASE 32 post-promotion rollback recovery: workflow captures the exact currently serving production deployment before release. If promotion succeeds but any post-promotion production smoke fails, workflow requests rollback through Vercel `POST /v1/projects/{projectId}/rollback/{previousDeploymentId}`, polls production hostname until it resolves back to the captured deployment, and verifies the restored source commit when known. The workflow remains failed after recovery so rollback cannot masquerade as a successful release.

## VERIFIED CI
- PHASE 19 branch #167 (`34655869441`): PASS full source suite.
- PHASE 19 main #168 (`34655905518`): source PASS; deploy BLOCKED at missing credential.
- PHASE 20 branch #169 (`34656010502`): PASS full source suite.
- PHASE 20 main #170 (`34656040039`): source PASS; deploy BLOCKED.
- PHASE 21 branch #172 (`34660626777`): PASS full source suite + Gemini economy routing.
- PHASE 21 main #173 (`34660658604`): source PASS; deploy BLOCKED.
- PHASE 22 branch #174 (`34660739270`): PASS full source suite + provider smoke contract.
- PHASE 22 main #175 (`34660761254`): source PASS; deploy BLOCKED.
- PHASE 24 branch #177 (`34661027101`): PASS full source suite + XiaoZhi version telemetry contract.
- PHASE 24 main #178 (`34661066079`): source PASS; deploy BLOCKED at credential gate.
- PHASE 26 branch #180 (`34661401183`): PASS full source suite + runtime source-commit regression.
- PHASE 26 main #181 (`34661444190`): source PASS; deploy BLOCKED at credential gate.
- PHASE 27 branch #183 (`34661640119`): PASS full source suite + immutable runtime shell/assets regression.
- PHASE 27 main #184 (`34661685229`): source PASS; deploy BLOCKED at credential gate.
- PHASE 28 branch #185 (`34661773922`): PASS full source suite + deployment release coherence regression.
- PHASE 28 main #186 (`34661804202`): source PASS; deploy BLOCKED at credential gate.
- PHASE 29 targeted branch QA #1 (`34664054384`): PASS syntax, immutable Bridge regression and dependency security gate.
- PHASE 29 main #187 (`34664088853`): full source-policy suite PASS; deploy BLOCKED at credential gate.
- PHASE 30 branch #190 (`34664398053`): PASS full source suite including candidate promotion gate.
- PHASE 30 main #191 (`34664438077`): full source-policy suite PASS; deploy BLOCKED at credential gate.
- PHASE 31 targeted quota branch (`34664680118`): PASS syntax + provider probe quota regression + dependency audit.
- PHASE 31 main quota workflow (`34664721469`): PASS.
- PHASE 31 canonical main #194 (`34664783558`): source-policy PASS all regressions + dependency audit; deploy BLOCKED at credential gate.
- PHASE 32 branch #195 (`34664937770`): PASS full source suite including post-promotion rollback recovery regression.
- PHASE 32 main quota workflow #4 (`34664964376`): PASS.
- PHASE 32 canonical main #196 (`34664964386`): source-policy PASS all regressions including rollback recovery, Drive, XiaoZhi, artifact round-trip and dependency audit. `deploy-production` FAIL/BLOCKED at `Require deployment credential`; Capture/Build/Candidate Deploy/Candidate Smoke/Promote/Post-Smoke/Rollback were skipped because `VERCEL_TOKEN` is absent.
- `npm audit --omit=dev --audit-level=high`: PASS in all current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 32 before this checkpoint documentation commit: `200766a781cf5e762547ce4c617588801eaa1172`.
- Key contracts/files include:
  - `src/ai-orchestrator-core-v32.js`
  - `src/context-manager-v35.js`
  - `src/multisource-orchestrator-v26.js`
  - `src/interaction-runtime-v22.js`
  - `src/interaction-runtime-v23.js`
  - `src/global-cancel-v33.js`
  - `src/authorization-broker-v34.js`
  - `src/operations-center-v36.js`
  - `src/credential-setup-v22.js`
  - `src/voice-render-bridge-v23.js`
  - `api/app.ts`
  - `api/asset.ts`
  - `api/research-v31.js`
  - `api/research.ts`
  - `api/drive-brain.ts`
  - `api/proxy.ts`
  - `api/health.ts`
  - `api/provider-check.ts`
  - `vercel.json`
  - `.github/workflows/quality-v20.yml`
  - `.github/workflows/quality-credential-probe-v47.yml`
  - `tests/proxy-chief-resilience-v37.test.mjs`
  - `tests/deployment-truthfulness-v38.test.mjs`
  - `tests/vercel-research-route-v39.test.mjs`
  - `tests/gemini-economy-model-v40.test.mjs`
  - `tests/provider-smoke-contract-v41.test.mjs`
  - `tests/xiaozhi-version-contract-v42.test.mjs`
  - `tests/source-commit-runtime-v43.test.mjs`
  - `tests/immutable-runtime-assets-v44.test.mjs`
  - `tests/deployment-release-coherence-v45.test.mjs`
  - `tests/deployment-promotion-gate-v46.test.mjs`
  - `tests/credential-probe-quota-v47.test.mjs`
  - `tests/deployment-rollback-recovery-v48.test.mjs`

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Current production hostname resolves to deployment `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`, URL `ai-van-phong-tro-29zwbd4rt-hiu-yhct.vercel.app`, target production, READY.
- Fresh live `/api/health` last verified in this continuation still reports `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Production root from the stale deployment does not expose the new `x-ai-office-ui-source-ref`, confirming the live release predates PHASE 27–32.
- Therefore current source through PHASE 32 is NOT production-verified.
- Deployment is fail-closed. Without `VERCEL_TOKEN`, no capture/candidate deployment/promotion/rollback production workflow can run.
- Native Vercel Git auto-deploy linkage is not proven and must not be assumed.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED because the latest explicit Google Search Grounding probe observed HTTP 429. Public-source fallback remains available.
- Runtime Credentials no longer spends Gemini Grounding quota on auto-open or ordinary refresh; Grounding is checked only by explicit deep diagnostics.
- Gemini model contract: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED; latest repeated health READY after one transient unreachable probe; voice render telemetry contract v2.3; browser fallback remains mandatory.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini grounding 429 keeps provider health DEGRADED rather than HEALTHY; do not auto-probe it.
- Drive and Google Workspace E2E remain credential-dependent.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` are measured warning-only signals; do not broadly refactor runtime merely to silence them.
- Historical loader/bare-module errors belong to old production; re-evaluate only after current source reaches production.
- XiaoZhi had one transient `VOICE_RENDER_UNREACHABLE` sample but recovered immediately and produced no matching Vercel error cluster.
- Rollback recovery is source/test verified only; it has not run live because deployment credentials are absent.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. This is the primary production blocker.
- Drive E2E requires either `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` with Viewer access to the A.I Văn phòng root folder or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before provider health can be marked fully healthy.

## NEXT_ACTION
1. Configure `VERCEL_TOKEN`; this remains the highest-value external unblock.
2. Once token exists, run the existing workflow: capture current production -> Vercel pull -> production build -> `deploy --prebuilt --prod --skip-domain --env AI_OFFICE_SOURCE_COMMIT=$GITHUB_SHA` -> candidate smoke -> `vercel promote` -> production smoke -> automatic rollback to captured deployment if post-promotion smoke fails.
3. Candidate and production smoke must verify exact current source SHA, UI shell ref, runtime asset ref, primary/economy Gemini models, artifact engine selftest and research-safety asset.
4. Until deployment is unblocked, continue only with source-side issues proven by current code/tests or fresh runtime evidence.
5. After current source reaches production, rerun runtime error clusters and compare Chief/research/provider/loader behavior against PHASE 18 baseline.
6. Validate `/api/research` actually serves v31 behavior in production.
7. Re-check XiaoZhi only if new health/log evidence shows repeated unreachability; otherwise preserve current runtime and browser fallback.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- `automation-core-v19.js` execution/approval/procedural-memory contract.
- `orchestrator-v193.js` continuation behavior.
- Gemini-first `research-v31.js` freshness/quota/fallback behavior.
- Stable `/api/research` -> `api/research.ts -> research-v31.js`.
- Distinct Gemini primary/economy routing unless measured evidence requires change.
- Explicit Drive/local internal-source opt-in boundary.
- Approved-only ground truth policy for `02_APPROVED`.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- XiaoZhi voice render v2.3, browser fallback, barge-in, continuous session and shared text/voice routing semantics.
- Safe/reversible auto-execution and approval gate for irreversible actions.
- Existing credential UI and server-side secret handling.
- Runtime Credentials must remain health-only by default; expensive provider/canary probes require explicit user action.
- Operations Center honest telemetry: no fake progress, quota, latency or health.
- Chief timeout fallback stays fail-fast/honest; arbitrary non-timeout errors must not become fake success.
- Deployment remains fail-closed: missing credential, candidate smoke failure, wrong provider config, failed selftest, missing safety asset, source-commit mismatch, UI-ref mismatch or asset-ref mismatch must never be reported as production success.
- A candidate must not receive production domains/traffic before candidate smoke passes; only a verified candidate may be promoted.
- If post-promotion production smoke fails after a successful promotion, rollback must target the exact production deployment captured before release and the job must remain failed even after recovery.
- CLI/prebuilt deployment exact source verification must use explicit runtime stamping and must not silently rely on Git-trigger metadata.
- Production runtime shell, JS assets and Drive Bridge setup code must stay pinned to the validated release SHA; do not fetch raw `main` for production behavior.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 32 at feature baseline `200766a781cf5e762547ce4c617588801eaa1172` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Last verified live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
