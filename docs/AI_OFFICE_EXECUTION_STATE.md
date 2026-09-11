# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-11

## CURRENT_PHASE
PHASE 14 COMPLETE — PERMISSION / AUTHORIZATION
NEXT: PHASE 15–17 — CONTEXT / AI CENTER / TASK CENTER

## CURRENT_OBJECTIVE
Continue the additive production-safe restructuring from canonical orchestration through context/task/admin control surfaces, while preserving stable automation, artifact, source-routing and voice contracts. Do not re-audit from zero.

## COMPLETED
- PHASE 0 baseline/safety audit completed.
- PHASE 1 canonical AI Core implemented: `src/ai-orchestrator-core-v32.js` v3.2.1 with QUESTION, TASK, DOCUMENT_TASK, DATA_TASK, SEARCH_TASK, INTERNAL_KNOWLEDGE_TASK, COMMUNICATION_TASK, SYSTEM_COMMAND, APP_COMMAND, VOICE_COMMAND.
- PHASE 2 Gemini-first/source routing hardened: ordinary questions do not depend on local/internal documents; explicit internal request is one-shot consent; negative internal phrasing is respected; Gemini 401/403/429 opens a per-request circuit and falls back without pretending search succeeded.
- PHASE 3 Drive readonly service-account scope resolver bug fixed (`scope -> folderId` string mapping). Drive remains direct retrieval + relevance ranking; durable semantic indexing/delta sync is NOT claimed complete.
- PHASE 5 canonical orchestration metadata attached to interaction/task runtime: orchestration ID, canonical intent, provider/source mode, artifact hints and approval requirement. No chain-of-thought is logged.
- PHASE 12 Global Cancel v3.3 merged to `main`: command, task, processing, AI generation, approval, undo approval, input, upload, output and pending-action cancellation contracts; text + voice bridge; cancellation audit metadata; output invalidation without history destruction.
- PHASE 13 existing approval engine verified and preserved: safe/reversible internal execution remains automatic; high-risk/irreversible requests are prepare-and-hold / awaiting approval; cancel and undo approval remain available.
- PHASE 14 Authorization Broker v3.4 merged to `main`: service/reason/scope/resource popup contract; Drive stays `drive.readonly`; connection setup is never reported as authorization success; missing Drive runtime is surfaced when internal source is enabled; existing credential UI is reused rather than duplicating secret handling.
- Current `main` source commit after PHASE 14: `97c0eaa7a82c068c8957d4870bd76a2796f0baf0`.
- AI Core CI for Global Cancel checkpoint PASS: run `34620139842`.
- Source Router + Interaction QA run #152 PASS for Global Cancel checkpoint.
- Authorization branch run #153 PASS.
- Main Source Router + Interaction QA run #154 source-policy PASS, including authorization, cancel, Drive, XiaoZhi, artifact round-trip and npm audit gates.

## FILES_CHANGED
Key additive/modified files through current checkpoint:
- `src/ai-orchestrator-core-v32.js`
- `src/multisource-orchestrator-v26.js`
- `api/research-v31.js`
- `api/drive-brain.ts`
- `src/interaction-runtime-v22.js`
- `src/interaction-runtime-v23.js`
- `src/interaction-policy-v21.js`
- `src/global-cancel-v33.js`
- `src/authorization-broker-v34.js`
- `src/release-v193.js`
- `tests/ai-orchestrator-core-v32.test.mjs`
- `tests/global-cancel-v33.test.mjs`
- `tests/authorization-broker-v34.test.mjs`
- `.github/workflows/quality-ai-core-v32.yml`
- `.github/workflows/quality-v20.yml`
- `docs/AI_OFFICE_EXECUTION_STATE.md`

## TESTS_RUN
- Canonical intent regression: PASS.
- Source policy + multi-source regression: PASS.
- Research freshness/relevance/safety regression: PASS.
- Interaction v2.1/v2.2 regression: PASS.
- Global Cancel + canonical runtime regression: PASS.
- Authorization Broker least-privilege/readiness regression: PASS.
- Office business workflow/risk regression: PASS.
- Drive registry/bridge/readonly provider regression: PASS.
- XiaoZhi client continuity + gateway fallback regression: PASS.
- Office artifact round-trip regression: PASS.
- `npm audit --omit=dev --audit-level=high`: PASS.
- Live production `/api/health`: HTTP 200 at 2026-09-11T16:12Z.

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Live health currently reports `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore PHASE 1/2/3/5/12/14 source changes on `main` are NOT yet production-verified.
- GitHub Actions deployment job runs but Install/Pull/Build/Deploy/Smoke steps are skipped when `VERCEL_TOKEN` is absent.
- Do not mark production COMPLETE until live source commit and smoke tests prove deployment of current `main`.

## OPEN_ERRORS
- Gemini is configured but latest live Google Search Grounding probe observed HTTP 429; treat Gemini as DEGRADED, not healthy. Public/source-grounded fallback remains available.
- Google Drive runtime is not configured in production; end-to-end internal knowledge retrieval cannot be verified yet.
- Google Workspace runtime actions are not configured.
- Durable Drive semantic indexing/delta synchronization is not yet implemented/proven; current system performs direct retrieval + relevance ranking.
- Production still serves old source commit `825dbf...` while GitHub `main` is `97c0eaa...`.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets, so explicit production build/deploy/smoke is skipped.
- Drive E2E requires either `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` with Viewer access to the A.I Văn phòng Drive root, or Apps Script Bridge credentials.
- Gemini Grounding must recover from 429 before provider health can be marked fully healthy.

## NEXT_ACTION
1. PHASE 15: verify context compression/task-memory/relevant-retrieval behavior; add only missing central context contract.
2. PHASE 16–17: inspect existing admin/dashboard/task surfaces; consolidate AI Center and Task Center without duplicating working UI.
3. Continue performance/AI-health fixes only after identifying measured/high-impact issues.
4. Re-run full QA and production smoke after deploy credential becomes available.

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

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED (latest live grounding probe 429).
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED / LIVE gateway health ready; browser fallback retained.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.

## DEPLOYMENT_STATUS
SOURCE READY / CI PASS at `97c0eaa7a82c068c8957d4870bd76a2796f0baf0`.
PRODUCTION NOT UPDATED/NOT VERIFIED for current source because Vercel deployment steps are skipped without `VERCEL_TOKEN`.
