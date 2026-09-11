# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-11

## CURRENT_PHASE
PHASE 1 — AI CORE / INTENT ROUTER

## CURRENT_OBJECTIVE
Introduce one additive canonical AI intent/orchestration contract above the existing stable v1.9.3/v2.x routing stack without replacing working production behavior.

## COMPLETED
- PHASE 0 baseline repository audit completed on `main`.
- Current source commit before this checkpoint: `825dbf8073284eadc38800245f42d4f70f647c98`.
- GitHub Actions `Source Router + Interaction QA` passed all source-policy, interaction, Drive, XiaoZhi, artifact and npm-audit gates for that commit.
- Production `/api/health` returned HTTP 200 and reported source commit `825dbf8073284eadc38800245f42d4f70f647c98`.
- Production `/api/selftest` returned `pass: true`; DOCX/XLSX/PPTX artifact tests passed.
- Production provider config reports Gemini configured and Google Search grounding enabled.
- Internal source opt-in isolation and Gemini-first multi-source path already exist and must be preserved.
- Timeout-resilient research v3.1 entry is on `main` and covered by CI.

## FILES_CHANGED
- `docs/AI_OFFICE_EXECUTION_STATE.md`

## TESTS_RUN
- GitHub Actions run `34583212211`: source-policy job PASS.
- Live production `/api/health`: PASS (HTTP 200).
- Live production `/api/selftest`: PASS (HTTP 200).
- Live production `/api/provider-check?probe=config`: PASS (HTTP 200).

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Latest observed production deployment: `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`, READY.
- Production domains: `ai-van-phong-tro-ly.vercel.app`, `ai-van-phong-tro-ly-hiu-yhct.vercel.app`.
- GitHub deploy workflow exists but `VERCEL_TOKEN` is currently unavailable to GitHub Actions, so build/deploy/smoke steps are skipped.
- Production runtime gateway reports the latest GitHub source commit in response headers; do not assume this replaces a validated Vercel deployment for backend bundle changes.

## OPEN_ERRORS
- Repeated Node `DEP0169` warning related to `url.parse()` on API routes; root source not yet proven.
- Runtime gateway emits Node experimental `stripTypeScriptTypes` warning; currently non-fatal.
- XiaoZhi configured endpoint exists, but live health probe reports `VOICE_RENDER_UNREACHABLE`; browser fallback remains active.
- Google Drive runtime is not configured in production.
- Google Workspace runtime actions are not configured in production.

## BLOCKERS
- GitHub Actions cannot perform an explicit Vercel production deployment until `VERCEL_TOKEN` is configured in repository Actions secrets.
- Drive canonical runtime requires one configured Drive provider before end-to-end internal knowledge verification.
- XiaoZhi external gateway must pass health/readiness before it can be marked runtime-ready.

## NEXT_ACTION
Add and test a canonical Intent Contract that maps existing stable intents to: QUESTION, TASK, DOCUMENT_TASK, DATA_TASK, SEARCH_TASK, INTERNAL_KNOWLEDGE_TASK, COMMUNICATION_TASK, SYSTEM_COMMAND, APP_COMMAND, VOICE_COMMAND; then install it additively before source routing.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell and current responsive behavior.
- Existing `automation-core-v19.js` execution/approval/procedural-memory contract.
- Continuation behavior in `orchestrator-v193.js`.
- Gemini-first research and `research-v31.js` freshness/timeout behavior.
- Explicit user opt-in boundary for Drive/local internal knowledge.
- Approved-only ground truth policy for `02_APPROVED`.
- Artifact Engine and real DOCX/XLSX/PPTX generation.
- XiaoZhi browser fallback, barge-in and shared text/voice routing semantics.
- Safe/reversible auto-execution and approval gate for irreversible actions.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED; default grounded provider available by configuration.
- Public research fallback: CONFIGURED.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi external: CONFIGURED endpoint, runtime health NOT READY; browser fallback active.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.

## DEPLOYMENT_STATUS
READY production deployment observed; explicit CI deploy currently skipped because deployment credential is absent.
