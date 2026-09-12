# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–23 COMPLETE — GEMINI ECONOMY ROUTING + PROVIDER SMOKE CONTRACT + XIAOZHI TRANSIENT HEALTH VERIFICATION
NEXT: continue only with current-source issues proven by tests or fresh runtime evidence. Production deployment remains BLOCKED by missing `VERCEL_TOKEN`.

## CURRENT_OBJECTIVE
Continue additive, production-safe hardening from the canonical orchestrator, Operations Center, truthful deployment gate, research-v31 route, provider routing and voice fallback. Preserve Dashboard v1.5, automation/artifact/source/voice contracts, and keep source/CI readiness explicitly separate from production-live status.

## COMPLETED
- PHASE 0 baseline/safety audit completed.
- PHASE 1 canonical AI Core implemented with QUESTION, TASK, DOCUMENT_TASK, DATA_TASK, SEARCH_TASK, INTERNAL_KNOWLEDGE_TASK, COMMUNICATION_TASK, SYSTEM_COMMAND, APP_COMMAND, VOICE_COMMAND.
- PHASE 2 Gemini-first/source routing hardened; ordinary questions do not depend on internal documents; explicit internal opt-in and negative internal phrasing are respected; 401/403/429 uses honest fallback/circuit behavior.
- PHASE 3 Drive readonly scope resolver bug fixed. Drive remains direct retrieval + relevance ranking; durable semantic indexing/delta sync is NOT claimed complete.
- PHASE 5 orchestration metadata attached without chain-of-thought logging.
- PHASE 12 Global Cancel v3.3 merged: command/task/processing/AI-generation/approval/input/upload/output/pending-action cancellation contracts across text + voice.
- PHASE 13 existing approval engine preserved: safe/reversible internal actions auto-execute; high-risk/irreversible actions wait for approval.
- PHASE 14 Authorization Broker v3.4 merged with least-privilege service/reason/scope/resource popup contract; connection setup is never misreported as authorization success.
- PHASE 15 Context Manager v3.5 merged with bounded recent context and deterministic compression.
- PHASE 16–17 Operations Center v3.6 merged: unified Task Center + AI Center, real task store, measured progress only, honest `NO TELEMETRY`, no quota-consuming health probe.
- PHASE 18 measured Chief timeout issue fixed: Gemini `chief` timeout 30s -> 12s; timeout/abort becomes honest local fallback instead of HTTP 502; non-timeout failures still propagate.
- PHASE 19 deployment truthfulness merged: missing `VERCEL_TOKEN` now FAILS `deploy-production`; build/deploy/smoke cannot be green when skipped.
- PHASE 19 smoke requires live `x-ai-office-source-commit == GITHUB_SHA`.
- PHASE 20 removed obsolete Vercel rewrite `/api/research -> /api/research-v29`; stable `/api/research` now resolves via `api/research.ts -> research-v31.js`.
- PHASE 21 restored the intended Gemini economy route. `AI_OFFICE_GEMINI_MODEL=gemini-3.8-flash`; `AI_OFFICE_GEMINI_ECONOMY_MODEL=gemini-3.5-flash-lite`. Simple/economy research no longer silently collapses onto the primary model.
- PHASE 22 production smoke contract now also requires live health to report primary Gemini `gemini-3.8-flash` and economy model `gemini-3.5-flash-lite`, in addition to exact source commit, artifact selftest and research safety asset.
- PHASE 23 fresh XiaoZhi health anomaly verified without speculative patching: one live `/api/health` probe at 2026-09-12T00:11:54Z reported `VOICE_RENDER_UNREACHABLE`; a repeat at 2026-09-12T00:12:47Z recovered to `runtimeReady=true`, `gatewayRelease=xiaozhi-render-gateway-1.2.0`, `trustedOriginMode=true`. Vercel showed no `/api/health` runtime errors in the surrounding 30-minute window and no `VOICE_RENDER` error logs in the surrounding 15-minute window. Classified as transient; no code change made.

## VERIFIED CI
- PHASE 19 branch run #167 (`34655869441`): PASS source suite + dependency audit.
- PHASE 19 main run #168 (`34655905518`): source-policy PASS; deploy-production FAIL/BLOCKED at missing credential.
- PHASE 20 branch run #169 (`34656010502`): PASS full source suite.
- PHASE 20 main run #170 (`34656040039`): source-policy PASS; deploy-production FAIL/BLOCKED at missing credential.
- PHASE 21 branch run #172 (`34660626777`): PASS full source suite, including Gemini economy routing regression.
- PHASE 21 main run #173 (`34660658604`): source-policy PASS; deploy-production FAIL/BLOCKED at missing credential.
- PHASE 22 branch run #174 (`34660739270`): PASS full source suite, including provider smoke contract.
- PHASE 22 main run #175 (`34660761254`): source-policy PASS; deploy-production FAIL/BLOCKED at missing credential.
- `npm audit --omit=dev --audit-level=high`: PASS in the above full suites.

## SOURCE_STATE
- Feature baseline through PHASE 22 before this checkpoint documentation commit: `cab3a388ec34412388d29491c5e9735b82d1e826`.
- Key files added/modified include:
  - `src/ai-orchestrator-core-v32.js`
  - `src/context-manager-v35.js`
  - `src/multisource-orchestrator-v26.js`
  - `src/interaction-runtime-v22.js`
  - `src/interaction-runtime-v23.js`
  - `src/global-cancel-v33.js`
  - `src/authorization-broker-v34.js`
  - `src/operations-center-v36.js`
  - `api/research-v31.js`
  - `api/research.ts`
  - `api/drive-brain.ts`
  - `api/proxy.ts`
  - `api/health.ts`
  - `vercel.json`
  - `.github/workflows/quality-v20.yml`
  - `tests/proxy-chief-resilience-v37.test.mjs`
  - `tests/deployment-truthfulness-v38.test.mjs`
  - `tests/vercel-research-route-v39.test.mjs`
  - `tests/gemini-economy-model-v40.test.mjs`
  - `tests/provider-smoke-contract-v41.test.mjs`

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Latest live checks still report `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore PHASE 1/2/3/5/12/14/15/16/17/18/19/20/21/22 source changes are NOT production-verified.
- Old production health currently reports Gemini primary `gemini-3.8-flash` and economy `gemini-3.5-flash-lite`; this does NOT prove current source deployment because the source header is still `825dbf...`.
- Deployment is fail-closed. Without `VERCEL_TOKEN`, `Require deployment credential` fails and Install/Pull/Build/Deploy/Smoke are skipped.
- Do not mark production COMPLETE until build/deploy/smoke execute and live source header equals the exact validated GitHub SHA.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED because the latest explicit Google Search Grounding probe observed HTTP 429. Public-source fallback remains available.
- Gemini routing contract: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED; latest repeat live health READY after one transient unreachable probe; browser fallback remains mandatory.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS
- Production is still stale at source `825dbf...`.
- Gemini grounding 429 means provider health must remain DEGRADED rather than HEALTHY.
- Drive and Google Workspace E2E cannot be verified without credentials/runtime configuration.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` warnings are measured but warning-only; do not refactor broad runtime code solely to silence them without product-impact evidence.
- Historical loader/bare-module errors belong to the old production generation; re-evaluate only after current source reaches production.
- XiaoZhi had one transient `VOICE_RENDER_UNREACHABLE` sample but recovered on immediate follow-up and produced no matching Vercel runtime error cluster; do not treat it as a persistent outage unless fresh evidence repeats.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. This is the primary production blocker.
- Drive E2E requires either `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` with Viewer access to the A.I Văn phòng root folder, or Apps Script Bridge credentials.
- Google Workspace actions require their runtime authorization/configuration.
- Gemini Grounding must recover from 429 before provider health can be marked fully healthy.

## NEXT_ACTION
1. Highest-value external unblock: configure `VERCEL_TOKEN` so validated source can build/deploy and exact-commit/provider smoke can run.
2. Until deployment is unblocked, continue only with source-side issues proven by current code/tests or fresh runtime evidence.
3. After current source reaches production, rerun runtime error clusters and compare Chief/research/provider/loader behavior against the PHASE 18 baseline.
4. Validate stable `/api/research` actually serves v31 behavior in production.
5. Verify production health reports primary `gemini-3.8-flash`, economy `gemini-3.5-flash-lite`, and exact current source SHA.
6. Re-check XiaoZhi only if fresh health/log evidence indicates repeated unreachability; otherwise preserve current fallback architecture.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- `automation-core-v19.js` execution/approval/procedural-memory contract.
- `orchestrator-v193.js` continuation behavior.
- Gemini-first `research-v31.js` freshness/quota/fallback behavior.
- Stable `/api/research` must resolve through `api/research.ts -> research-v31.js`.
- Gemini primary/economy routing must remain distinct unless an explicit measured reason changes it.
- Explicit user opt-in boundary for Drive/local internal knowledge.
- Approved-only ground truth policy for `02_APPROVED`.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- XiaoZhi browser fallback, barge-in, continuous session and shared text/voice routing semantics.
- Safe/reversible auto-execution and approval gate for irreversible actions.
- Existing credential setup UI and server-side secret handling.
- Operations Center honest telemetry: no fake progress, quota, latency or provider health.
- Chief timeout fallback remains fail-fast and honest; arbitrary non-timeout errors must not become fake success.
- Deployment remains fail-closed: missing credential, wrong provider config, failed selftest, missing safety asset or source-commit mismatch must never be reported as production success.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 22 at feature baseline `cab3a388ec34412388d29491c5e9735b82d1e826` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
