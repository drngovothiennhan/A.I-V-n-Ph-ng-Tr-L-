# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 19–20 COMPLETE — TRUTHFUL DEPLOYMENT GATE + STABLE RESEARCH V31 ROUTE
NEXT: continue only with measured high-impact source/runtime issues; production deployment remains BLOCKED by missing `VERCEL_TOKEN`.

## CURRENT_OBJECTIVE
Continue additive production-safe restructuring from the verified canonical orchestrator, Operations Center and provider-health hardening. Preserve Dashboard v1.5, automation/artifact/source/voice contracts, and optimize only measured/high-impact issues. Source/CI readiness must remain explicitly separate from production-live status.

## COMPLETED
- PHASE 0 baseline/safety audit completed.
- PHASE 1 canonical AI Core implemented with QUESTION, TASK, DOCUMENT_TASK, DATA_TASK, SEARCH_TASK, INTERNAL_KNOWLEDGE_TASK, COMMUNICATION_TASK, SYSTEM_COMMAND, APP_COMMAND, VOICE_COMMAND.
- PHASE 2 Gemini-first/source routing hardened: ordinary questions do not depend on local/internal documents; explicit internal request is one-shot consent; negative internal phrasing is respected; Gemini 401/403/429 opens a per-request circuit and falls back without pretending search succeeded.
- PHASE 3 Drive readonly service-account scope resolver bug fixed (`scope -> folderId` string mapping). Drive remains direct retrieval + relevance ranking; durable semantic indexing/delta sync is NOT claimed complete.
- PHASE 5 canonical orchestration metadata attached to interaction/task runtime: orchestration ID, canonical intent, provider/source mode, artifact hints and approval requirement. No chain-of-thought is logged.
- PHASE 12 Global Cancel v3.3 merged to `main`: command, task, processing, AI generation, approval, undo approval, input, upload, output and pending-action cancellation contracts; text + voice bridge; cancellation audit metadata; output invalidation without history destruction.
- PHASE 13 existing approval engine verified and preserved: safe/reversible internal execution remains automatic; high-risk/irreversible requests are prepare-and-hold / awaiting approval; cancel and undo approval remain available.
- PHASE 14 Authorization Broker v3.4 merged to `main`: service/reason/scope/resource popup contract; Drive stays `drive.readonly`; connection setup is never reported as authorization success; missing Drive runtime is surfaced when internal source is enabled; existing credential UI is reused rather than duplicating secret handling.
- PHASE 15 Context Manager v3.5 merged to `main`: bounded recent context, current task/source/approval/cancel snapshot, deterministic compression; long history is not copied into every request.
- PHASE 16–17 Operations Center v3.6 merged to `main`: unified Task Center + AI Center; real task store/navigation; Global Cancel and canonical retry runtime reused; measured progress only; AI health uses `/api/health`; missing telemetry is shown as `NO TELEMETRY` rather than fabricated values.
- PHASE 18 measured runtime review used Vercel production error clusters instead of speculative optimization. Main actionable issue was repeated `proxy_error` for `chief` provider timeouts.
- PHASE 18 Chief resilience merged to `main`: Gemini `chief` timeout reduced from 30s to 12s; timeout/abort returns an honest local-fallback response instead of HTTP 502; provider health/limitation/timeout metadata are returned; timeout audit does not log the user prompt; non-timeout failures still propagate to the existing error path.
- PHASE 19 deployment truthfulness merged to `main`: missing `VERCEL_TOKEN` now fails the production deployment job instead of allowing a green job with all deploy steps skipped. Build/deploy/smoke cannot report PASS unless they actually execute.
- PHASE 19 production smoke contract now captures headers and requires live `x-ai-office-source-commit` to equal the exact validated `GITHUB_SHA`; a stale deployment must fail smoke.
- PHASE 20 research route alignment merged to `main`: removed the obsolete `vercel.json` rewrite `/api/research -> /api/research-v29`. Stable `/api/research` now resolves through `api/research.ts`, which imports/exports `research-v31.js`, so current grounding/quota/fallback fixes cannot be silently bypassed by the Vercel route config.
- PHASE 19 feature QA run #167 (`34655869441`) PASS all source regressions and dependency audit.
- PHASE 19 main QA run #168 (`34655905518`) source-policy PASS; deploy-production correctly FAIL/BLOCKED at credential gate because `VERCEL_TOKEN` is absent.
- PHASE 20 feature QA run #169 (`34656010502`) PASS all source regressions and dependency audit.
- PHASE 20 main QA run #170 (`34656040039`) source-policy PASS; deploy-production correctly FAIL/BLOCKED at credential gate because `VERCEL_TOKEN` is absent.
- PHASE 20 source commit before this checkpoint: `36a532ca752871631457c7c78570585056998a48`.

## FILES_CHANGED
Key additive/modified files through current checkpoint:
- `src/ai-orchestrator-core-v32.js`
- `src/context-manager-v35.js`
- `src/multisource-orchestrator-v26.js`
- `api/research-v31.js`
- `api/research.ts`
- `api/drive-brain.ts`
- `api/proxy.ts`
- `src/interaction-runtime-v22.js`
- `src/interaction-runtime-v23.js`
- `src/interaction-policy-v21.js`
- `src/global-cancel-v33.js`
- `src/authorization-broker-v34.js`
- `src/operations-center-v36.js`
- `src/release-v193.js`
- `vercel.json`
- `tests/ai-orchestrator-core-v32.test.mjs`
- `tests/context-manager-v35.test.mjs`
- `tests/global-cancel-v33.test.mjs`
- `tests/authorization-broker-v34.test.mjs`
- `tests/operations-center-v36.test.mjs`
- `tests/proxy-chief-resilience-v37.test.mjs`
- `tests/deployment-truthfulness-v38.test.mjs`
- `tests/vercel-research-route-v39.test.mjs`
- `.github/workflows/quality-ai-core-v32.yml`
- `.github/workflows/quality-v20.yml`
- `docs/AI_OFFICE_EXECUTION_STATE.md`

## TESTS_RUN
- Canonical intent regression: PASS.
- Bounded context regression: PASS.
- Source policy + multi-source regression: PASS.
- Research freshness/relevance/safety regression: PASS.
- Interaction v2.1/v2.2 regression: PASS.
- Global Cancel + canonical runtime regression: PASS.
- Authorization Broker least-privilege/readiness regression: PASS.
- Operations Center honest telemetry/task-state regression: PASS.
- Chief timeout resilience regression: PASS.
- Deployment truthfulness regression: PASS.
- Stable `/api/research` -> v31 route regression: PASS.
- Office business workflow/risk regression: PASS.
- Drive registry/bridge/readonly provider regression: PASS.
- XiaoZhi client continuity + gateway fallback regression: PASS.
- Office artifact round-trip regression: PASS.
- `npm audit --omit=dev --audit-level=high`: PASS.
- Live production `/api/health`: HTTP 200 at 2026-09-11T22:56Z.
- Production error cluster baseline previously measured: 75 `url.parse()` deprecation warnings; 22 `stripTypeScriptTypes` experimental warnings; 4 `chief` timeout errors; lower-frequency historical loader/research/provider timeout errors. Warning-only items remain intentionally untouched until product impact is demonstrated.

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Live `/api/health` at 2026-09-11T22:56Z still reports `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore PHASE 1/2/3/5/12/14/15/16/17/18/19/20 source changes are NOT yet production-verified.
- Deployment pipeline is now fail-closed: source QA may PASS while `deploy-production` FAILS explicitly at `Require deployment credential` when `VERCEL_TOKEN` is absent. This failure is intentional and truthful, not a source regression.
- When credentials become available, production smoke must verify health, exact source commit, artifact selftest and the client research safety asset before deploy can be marked successful.
- Do not mark production COMPLETE until the live source header equals the validated GitHub commit and smoke tests PASS.

## OPEN_ERRORS
- Gemini is configured but latest explicit Google Search Grounding probe observed HTTP 429; treat Gemini as DEGRADED, not healthy. Public/source-grounded fallback remains available.
- Google Drive runtime is not configured in production; end-to-end internal knowledge retrieval cannot be verified yet.
- Google Workspace runtime actions are not configured.
- Durable Drive semantic indexing/delta synchronization is not yet implemented/proven; current system performs direct retrieval + relevance ranking.
- Production still serves old source commit `825dbf...` while current source is ahead of PHASE 20 commit `36a532c...`.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` warnings are measured but currently warning-only. Do not refactor broad runtime loader code solely to silence warnings without product-impact evidence.
- Historical runtime-loader syntax/bare-module errors belong to the old production generation; re-evaluate only after current source can be deployed.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. Production deployment now fails explicitly instead of reporting false success.
- Drive E2E requires either `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` with Viewer access to the A.I Văn phòng Drive root, or Apps Script Bridge credentials.
- Gemini Grounding must recover from 429 before provider health can be marked fully healthy.

## NEXT_ACTION
1. Highest-value external unblock: configure `VERCEL_TOKEN` so the validated source can be built/deployed and exact-commit smoke can run.
2. Until deployment is unblocked, continue only with source-side problems proven by current code/tests; avoid broad fixes based solely on old production logs.
3. After current source reaches production, re-run error clusters and compare `chief`, research/provider and loader errors against the PHASE 18 baseline.
4. Validate stable `/api/research` behavior in production specifically, confirming v31 provider-health/freshness responses rather than v29.
5. Drive E2E and Google Workspace actions remain separate credential-dependent workstreams.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell and current responsive behavior.
- Existing `automation-core-v19.js` execution/approval/procedural-memory contract.
- Continuation behavior in `orchestrator-v193.js`.
- Gemini-first research and `research-v31.js` freshness/timeout fallback behavior.
- Stable `/api/research` must resolve through `api/research.ts -> research-v31.js`; do not pin the public endpoint back to a legacy research version.
- Explicit user opt-in boundary for Drive/local internal knowledge.
- Approved-only ground truth policy for `02_APPROVED`.
- Artifact Engine and real DOCX/XLSX/PPTX generation.
- XiaoZhi browser fallback, barge-in, continuous session and shared text/voice routing semantics.
- Safe/reversible auto-execution and approval gate for irreversible actions.
- Existing credential setup UI and server-side secret handling.
- Operations Center honest telemetry rule: no fake percentages, quotas, latency or provider health.
- Chief timeout fallback must remain fail-fast and honest; do not convert arbitrary non-timeout provider/network errors into fake success.
- Deployment status is fail-closed: missing credentials or source-commit mismatch must never be reported as production success.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED (latest explicit grounding probe 429; AI Center does not consume quota merely to render status).
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED / LIVE gateway health ready; browser fallback retained.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 20 at `36a532ca752871631457c7c78570585056998a48` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing; the deploy job now correctly fails at the credential gate. Live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
