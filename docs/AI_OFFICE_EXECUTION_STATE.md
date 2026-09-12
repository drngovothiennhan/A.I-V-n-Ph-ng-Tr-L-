# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–36 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / EXACT SOURCE STAMPING / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION / POST-PROMOTION ROLLBACK / CANONICAL QUALITY GATE / GEMINI CONFIG RELEASE GATE / PINNED VERCEL CLI / HONEST GROUNDING HEALTH
NEXT: production remains BLOCKED by missing `VERCEL_TOKEN`. Continue only with current-source issues proven by tests or fresh runtime evidence.

## CURRENT_OBJECTIVE
Continue additive, production-safe hardening from the canonical orchestrator and approved Dashboard v1.5. Keep SOURCE READY separate from PRODUCTION VERIFIED. Do not rebuild stable subsystems, fabricate telemetry, or deploy through an unscoped path.

## COMPLETED
- PHASE 0 baseline/safety audit completed.
- PHASE 1 canonical AI Core implemented with canonical office intents.
- PHASE 2 Gemini-first/source routing hardened; ordinary questions do not depend on internal docs; explicit internal opt-in and negative internal phrasing are respected; 401/403/429 uses honest fallback/circuit behavior.
- PHASE 3 Drive readonly scope resolver bug fixed. Drive remains direct retrieval + relevance ranking; durable semantic indexing/delta sync is NOT claimed complete.
- PHASE 5 canonical orchestration metadata attached without chain-of-thought logging.
- PHASE 12 Global Cancel v3.3 merged across text + voice.
- PHASE 13 existing safe-by-default approval engine preserved.
- PHASE 14 Authorization Broker v3.4 merged with least-privilege connection/permission semantics.
- PHASE 15 Context Manager v3.5 merged with bounded context and deterministic compression.
- PHASE 16–17 Operations Center v3.6 merged with real task state and honest telemetry.
- PHASE 18 Chief timeout hardening: timeout/abort becomes honest local fallback; non-timeout failures still propagate.
- PHASE 19 deployment truthfulness: missing `VERCEL_TOKEN` fails deploy; skipped deployment cannot appear successful.
- PHASE 20 stable `/api/research` corrected to `api/research.ts -> research-v31.js`.
- PHASE 21 Gemini routing corrected: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- PHASE 22 provider smoke contract added.
- PHASE 23 XiaoZhi transient event verified without speculative patching; browser fallback retained.
- PHASE 24 XiaoZhi telemetry aligned to voice render v2.3.
- PHASE 25 Vercel deploy path verified to correct project/domain; native Git auto-deploy is not assumed.
- PHASE 26 exact source-commit stamping added.
- PHASE 27 production shell/assets pinned to validated release SHA; no raw GitHub `main` runtime loading.
- PHASE 28 coherent production smoke verifies backend source SHA, UI ref, asset ref, provider/artifact/safety contracts.
- PHASE 29 Drive Bridge pinned through SHA-based `/api/asset` gateway.
- PHASE 30 candidate promotion gate: `--prod --skip-domain` candidate -> smoke -> promote -> production smoke.
- PHASE 31 quota-safe diagnostics: Runtime Credentials is health-only by default; Grounding/Drive Canary require explicit user action.
- PHASE 32 post-promotion rollback recovery targets exact production deployment captured before release and keeps failed release red after recovery.
- PHASE 33 provider quota regression moved into canonical `source-policy`; duplicate workflow removed.
- PHASE 34 candidate and production smoke require `providers.gemini.configured === true` plus expected primary/economy models, without running Grounding probe.
- PHASE 35 Vercel CLI is pinned to `59.11.7`; no `vercel@latest` release drift.
- PHASE 36 honest Grounding health: `/api/health` no longer maps API-key presence to `googleSearchGrounding: true`. Legacy field is `null` until verified; explicit fields now distinguish `googleSearchGroundingConfigured`, `googleSearchGroundingVerified`, `googleSearchGroundingStatus`, and `groundingVerificationMode: explicit-manual-probe`. Health remains quota-free.

## VERIFIED CI
- PHASE 33 branch #199 (`34665179101`): canonical source-policy PASS including provider quota regression.
- PHASE 33 main #200 (`34665543085`): source-policy PASS; deploy BLOCKED at credential gate.
- PHASE 34 branch #202 (`34665775983`): full source-policy PASS including Gemini configuration release gate.
- PHASE 34 main #203 (`34665808158`): full source-policy PASS; deploy BLOCKED; no candidate/promotion executed.
- PHASE 35 branch #204 (`34665933586`): full source-policy PASS including Vercel CLI pin regression.
- PHASE 35 main #205 (`34665983893`): full source-policy PASS + dependency audit; deploy BLOCKED at missing credential.
- PHASE 36 targeted branch QA #1 (`34666136934`): PASS health syntax, provider/honest-Grounding regression and dependency audit.
- PHASE 36 main #207 (`34666199812`): full source-policy PASS including extended provider-smoke/honest-Grounding contract, Drive, XiaoZhi, artifact round-trip and dependency audit. `deploy-production` FAIL/BLOCKED at `Require deployment credential`; all actual release steps skipped.
- `npm audit --omit=dev --audit-level=high`: PASS in all current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 36 before this checkpoint documentation commit: `a56ec4ce2696c6cbe2c30d9709e2fb94d4ab2b7d`.
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
  - `tests/provider-smoke-contract-v41.test.mjs`
  - `tests/deployment-promotion-gate-v46.test.mjs`
  - `tests/credential-probe-quota-v47.test.mjs`
  - `tests/deployment-rollback-recovery-v48.test.mjs`
  - `tests/deployment-gemini-config-v49.test.mjs`
  - `tests/deployment-vercel-cli-pin-v50.test.mjs`

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Current serving production deployment previously resolved as `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`.
- Fresh live `/api/health` at 2026-09-12T01:47:50Z still reports `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore source through PHASE 36 is NOT production-verified.
- Without `VERCEL_TOKEN`, no capture/candidate deployment/promotion/rollback workflow can run.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. Last explicit Google Search Grounding probe observed HTTP 429. Current source no longer equates configuration with verified Grounding health.
- Gemini model contract: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- Runtime Credentials does not spend Grounding quota on auto-open/ordinary refresh.
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED. At 01:47:38Z one health probe returned `VOICE_RENDER_UNREACHABLE`; the next at 01:47:50Z recovered to READY with gateway release `xiaozhi-render-gateway-1.2.0`. Treat as transient; preserve browser fallback and do not patch without repeated error evidence.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini Grounding 429 keeps provider health DEGRADED rather than HEALTHY; do not auto-probe it.
- Drive and Google Workspace E2E remain credential-dependent.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` remain measured warning-only signals; do not broadly refactor merely to silence them.
- Historical loader/bare-module errors belong to old production; re-evaluate after current source reaches production.
- XiaoZhi one-probe transient unreachability recovered immediately; no speculative voice patch.
- Rollback recovery remains source/test verified only because deploy credentials are absent.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. Primary production blocker.
- Drive E2E requires readonly Drive credentials or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before it can be marked verified healthy.

## NEXT_ACTION
1. Configure `VERCEL_TOKEN`; highest-value external unblock.
2. Once token exists, run canonical release: capture current production -> pinned Vercel CLI -> pull/build -> candidate `--prod --skip-domain` -> candidate smoke -> promote -> production smoke -> rollback captured deployment if post-smoke fails.
3. Candidate/production smoke must require Gemini configured true, expected models, exact source/UI/asset refs, artifact selftest and safety asset; Grounding probe remains excluded from release smoke.
4. Until deploy is unblocked, continue only with source-side issues proven by current code/tests or fresh runtime evidence.
5. After current source reaches production, rerun runtime error clusters and verify `/api/research` serves v31.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- Existing automation/orchestration/approval/procedural-memory contracts.
- Gemini-first `research-v31.js` and stable `/api/research -> api/research.ts -> research-v31.js`.
- Explicit internal/Drive opt-in and approved-only `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- XiaoZhi v2.3, browser fallback, barge-in, continuous session and shared text/voice semantics.
- Runtime Credentials health-only by default; expensive provider/canary probes require explicit user action.
- Grounding configuration must not be reported as Grounding verification. Unknown stays unknown until an explicit probe.
- Provider quota regression remains in canonical source-policy.
- Operations Center honest telemetry; no fake progress/quota/latency/provider health.
- Deployment remains fail-closed; candidate never receives production traffic before smoke passes.
- Failed post-promotion smoke rolls back exact captured deployment and stays failed.
- Production shell/assets/Drive Bridge remain pinned to validated source SHA; no raw `main`.
- Vercel CLI remains pinned to `59.11.7` until an intentional upgrade is revalidated.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 36 at feature baseline `a56ec4ce2696c6cbe2c30d9709e2fb94d4ab2b7d` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Last verified live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.