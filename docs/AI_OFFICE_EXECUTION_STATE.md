# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 18 COMPLETE — MEASURED AI HEALTH / CHIEF TIMEOUT RESILIENCE
NEXT: continue only with measured high-impact runtime issues; production deployment remains BLOCKED by missing VERCEL_TOKEN.

## CURRENT_OBJECTIVE
Continue additive production-safe restructuring from the verified canonical orchestrator and Operations Center. Preserve the approved Dashboard v1.5 shell, automation/artifact/source/voice contracts, and optimize only measured/high-impact issues. Do not re-audit from zero and do not report source/CI changes as production-live until Vercel smoke proves the current main source.

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
- PHASE 16–17 Operations Center v3.6 merged to `main`: unified drawer/modal with Task Center + AI Center; reuses existing task store/navigation, Global Cancel and canonical retry runtime; measured progress only; AI health uses `/api/health`; no quota-consuming Gemini probe; missing telemetry is shown as `NO TELEMETRY` instead of fabricated values.
- PHASE 18 measured runtime review used Vercel production error clusters instead of speculative optimization. Main actionable issue was repeated `proxy_error` for `chief` provider timeouts.
- PHASE 18 Chief resilience merged to `main`: Gemini `chief` timeout reduced from 30s to 12s; timeout/abort returns an honest local-fallback response instead of becoming HTTP 502; provider health/limitation/timeout metadata are returned; timeout audit does not log the user prompt. Non-timeout failures still propagate to the existing error path.
- Source code through PHASE 18: `fe1868d29ed72b21a320ad18380c9dcb77faeb77`.
- PHASE 18 feature QA run #164 (`34655534706`) PASS full regression and dependency audit.
- PHASE 18 main QA run #165 (`34655572983`) PASS source-policy, multisource, research, interaction, context, cancel, authorization, Operations Center, Chief resilience, business workflow, Drive, XiaoZhi, artifact round-trip and dependency audit.

## FILES_CHANGED
Key additive/modified files through current checkpoint:
- `src/ai-orchestrator-core-v32.js`
- `src/context-manager-v35.js`
- `src/multisource-orchestrator-v26.js`
- `api/research-v31.js`
- `api/drive-brain.ts`
- `api/proxy.ts`
- `src/interaction-runtime-v22.js`
- `src/interaction-runtime-v23.js`
- `src/interaction-policy-v21.js`
- `src/global-cancel-v33.js`
- `src/authorization-broker-v34.js`
- `src/operations-center-v36.js`
- `src/release-v193.js`
- `tests/ai-orchestrator-core-v32.test.mjs`
- `tests/context-manager-v35.test.mjs`
- `tests/global-cancel-v33.test.mjs`
- `tests/authorization-broker-v34.test.mjs`
- `tests/operations-center-v36.test.mjs`
- `tests/proxy-chief-resilience-v37.test.mjs`
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
- Office business workflow/risk regression: PASS.
- Drive registry/bridge/readonly provider regression: PASS.
- XiaoZhi client continuity + gateway fallback regression: PASS.
- Office artifact round-trip regression: PASS.
- `npm audit --omit=dev --audit-level=high`: PASS.
- Live production `/api/health`: HTTP 200 at 2026-09-11T22:45Z.
- Production error cluster review (24h): 75 `url.parse()` deprecation warnings; 22 `stripTypeScriptTypes` experimental warnings; 4 measured `chief` timeout errors; lower-frequency historical loader/research/provider timeout errors. Only the measured current-source Chief timeout gap was patched in PHASE 18.

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Latest listed production deployment remains `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`, READY.
- Live `/api/health` at 2026-09-11T22:45Z reports `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore PHASE 1/2/3/5/12/14/15/16/17/18 source changes on `main` are NOT yet production-verified.
- GitHub Actions deploy step remains credential-gated; without `VERCEL_TOKEN`, Install/Pull/Build/Deploy/Smoke are skipped even when the deploy job itself reports success.
- Do not mark production COMPLETE until live source commit and smoke tests prove deployment of current `main`.

## OPEN_ERRORS
- Gemini is configured but latest explicit Google Search Grounding probe observed HTTP 429; treat Gemini as DEGRADED, not healthy. Public/source-grounded fallback remains available.
- Google Drive runtime is not configured in production; end-to-end internal knowledge retrieval cannot be verified yet.
- Google Workspace runtime actions are not configured.
- Durable Drive semantic indexing/delta synchronization is not yet implemented/proven; current system performs direct retrieval + relevance ranking.
- Production still serves old source commit `825dbf...` while PHASE 18 source is `fe1868d...`.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` warnings are measured but currently warning-only. Do not refactor broad runtime loader code solely to silence warnings without product-impact evidence.
- Older runtime-loader syntax/bare-module errors were observed on historical/current-old deployments; re-evaluate after current source can be deployed before creating new broad loader patches.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets, so explicit production build/deploy/smoke is skipped.
- Drive E2E requires either `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` with Viewer access to the A.I Văn phòng Drive root, or Apps Script Bridge credentials.
- Gemini Grounding must recover from 429 before provider health can be marked fully healthy.

## NEXT_ACTION
1. Re-check measured production error clusters only after current source is deployable; compare new errors against the PHASE 18 baseline.
2. If continuing before deployment, work only on source-side issues backed by current-code tests or measurable runtime behavior; do not chase warning-only noise.
3. Keep Task Center/AI Center additive to Dashboard v1.5 and avoid duplicate state stores.
4. If provider/runtime telemetry is missing, expose honest telemetry before attempting dashboard analytics.
5. Production smoke only after deploy credential becomes available.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell and current responsive behavior.
- Existing `automation-core-v19.js` execution/approval/procedural-memory contract.
- Continuation behavior in `orchestrator-v193.js`.
- Gemini-first research and `research-v31.js` freshness/timeout fallback behavior.
- Explicit user opt-in boundary for Drive/local internal knowledge.
- Approved-only ground truth policy for `02_APPROVED`.
- Artifact Engine and real DOCX/XLSX/PPTX generation.
- XiaoZhi browser fallback, barge-in, continuous session and shared text/voice routing semantics.
- Safe/reversible auto-execution and approval gate for irreversible actions.
- Existing credential setup UI and server-side secret handling.
- Operations Center honest telemetry rule: no fake percentages, quotas, latency or provider health.
- Chief timeout fallback must remain fail-fast and honest; do not convert arbitrary non-timeout provider/network errors into fake success.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED (latest explicit grounding probe 429; AI Center does not consume quota merely to render status).
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED / LIVE gateway health ready; browser fallback retained.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.

## DEPLOYMENT_STATUS
SOURCE READY / CI PASS through PHASE 18 at `fe1868d29ed72b21a320ad18380c9dcb77faeb77`.
PRODUCTION NOT UPDATED/NOT VERIFIED for current source because Vercel deployment steps are skipped without `VERCEL_TOKEN`; live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
