# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–26 COMPLETE — PROVIDER ROUTING / SMOKE / XIAOZHI TELEMETRY / DEPLOY PATH / EXACT SOURCE COMMIT STAMPING
NEXT: production remains BLOCKED by missing `VERCEL_TOKEN`. Continue only with current-source issues proven by tests or fresh runtime evidence.

## CURRENT_OBJECTIVE
Continue additive, production-safe hardening from the canonical orchestrator, Operations Center, truthful deployment gate, research-v31 route, provider routing and voice fallback. Preserve Dashboard v1.5 and all working automation/artifact/source/voice contracts. Keep SOURCE READY separate from PRODUCTION VERIFIED.

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
- PHASE 21 Gemini model routing corrected: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- PHASE 22 production smoke requires live primary/economy Gemini model contract plus artifact selftest and research-safety asset.
- PHASE 23 XiaoZhi transient health event verified without speculative patching: one `VOICE_RENDER_UNREACHABLE` sample recovered on immediate retry; no matching Vercel health/runtime error cluster; browser fallback retained.
- PHASE 24 XiaoZhi telemetry alignment: provider-check now reports the real voice render version `2.3`, matching `src/voice-render-bridge-v23.js` and `api/health.ts`; runtime/WebSocket behavior unchanged.
- PHASE 25 Vercel deployment-path verification: correct project/domain/deployment confirmed, but native Git auto-deploy linkage is NOT proven by available deployment metadata or GitHub external statuses. Do not bypass the tested token-based workflow or invoke an unscoped deployment tool.
- PHASE 26 exact source-commit stamping: Vercel documentation confirms `--prebuilt` deployments must not rely on implicit Git-trigger system metadata. `api/health.ts` now emits `x-ai-office-source-commit` from `AI_OFFICE_SOURCE_COMMIT`, falling back to `VERCEL_GIT_COMMIT_SHA` then `unknown`. The production deployment command explicitly passes `--env "AI_OFFICE_SOURCE_COMMIT=$GITHUB_SHA"`; exact-commit smoke therefore verifies a deliberately stamped SHA rather than hidden Vercel Git state.

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
- PHASE 26 main #181 (`34661444190`): source-policy PASS full suite; deploy-production FAIL/BLOCKED at `Require deployment credential` because `VERCEL_TOKEN` is absent.
- `npm audit --omit=dev --audit-level=high`: PASS in all current full suites.

## SOURCE_STATE
- Feature baseline through PHASE 26 before this checkpoint documentation commit: `33f4dea6d21e3f02a1e8122f10270d6624ab0705`.
- Key files/contracts include:
  - `src/ai-orchestrator-core-v32.js`
  - `src/context-manager-v35.js`
  - `src/multisource-orchestrator-v26.js`
  - `src/interaction-runtime-v22.js`
  - `src/interaction-runtime-v23.js`
  - `src/global-cancel-v33.js`
  - `src/authorization-broker-v34.js`
  - `src/operations-center-v36.js`
  - `src/voice-render-bridge-v23.js`
  - `api/research-v31.js`
  - `api/research.ts`
  - `api/drive-brain.ts`
  - `api/proxy.ts`
  - `api/health.ts`
  - `api/provider-check.ts`
  - `vercel.json`
  - `.github/workflows/quality-v20.yml`
  - `tests/proxy-chief-resilience-v37.test.mjs`
  - `tests/deployment-truthfulness-v38.test.mjs`
  - `tests/vercel-research-route-v39.test.mjs`
  - `tests/gemini-economy-model-v40.test.mjs`
  - `tests/provider-smoke-contract-v41.test.mjs`
  - `tests/xiaozhi-version-contract-v42.test.mjs`
  - `tests/source-commit-runtime-v43.test.mjs`

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Latest known production deployment: `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`, READY, target production.
- Live `/api/health` at 2026-09-12T00:24Z still reports `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore current source through PHASE 26 is NOT production-verified.
- Old production health currently reports Gemini primary `gemini-3.8-flash`, economy `gemini-3.5-flash-lite`, and XiaoZhi gateway ready; those values do not prove current source deployment because the source header remains stale.
- Deployment is fail-closed. Without `VERCEL_TOKEN`, Install/Pull/Build/Deploy/Smoke do not run.
- Native Vercel Git auto-deploy linkage is not proven and must not be assumed.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED because the latest explicit Google Search Grounding probe observed HTTP 429. Public-source fallback remains available.
- Gemini model contract: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED; latest repeated health READY after one transient unreachable probe; voice render telemetry contract is v2.3; browser fallback remains mandatory.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS
- Production remains stale at source `825dbf...`.
- Gemini grounding 429 keeps provider health DEGRADED rather than HEALTHY.
- Drive and Google Workspace E2E remain credential-dependent.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` are measured warning-only signals; do not refactor broad runtime code merely to silence them.
- Historical loader/bare-module errors belong to old production; re-evaluate after current source reaches production.
- XiaoZhi had one transient `VOICE_RENDER_UNREACHABLE` sample but recovered immediately on re-probe and produced no matching Vercel error cluster.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. This is the primary production blocker.
- Drive E2E requires either `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` with Viewer access to the A.I Văn phòng root folder or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before provider health can be marked fully healthy.

## NEXT_ACTION
1. Configure `VERCEL_TOKEN`; this remains the highest-value external unblock.
2. Once token exists, run the existing workflow: Vercel pull -> build -> `deploy --prebuilt --prod --env AI_OFFICE_SOURCE_COMMIT=$GITHUB_SHA` -> smoke.
3. Smoke must verify exact current source SHA, primary/economy Gemini models, artifact engine selftest and research-safety asset.
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
- Operations Center honest telemetry: no fake progress, quota, latency or health.
- Chief timeout fallback stays fail-fast/honest; arbitrary non-timeout errors must not become fake success.
- Deployment remains fail-closed: missing credential, wrong provider config, failed selftest, missing safety asset or source-commit mismatch must never be reported as production success.
- Exact source-commit verification must use explicit runtime stamping for CLI/prebuilt deployments and must not silently rely on Git-trigger metadata.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 26 at feature baseline `33f4dea6d21e3f02a1e8122f10270d6624ab0705` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
