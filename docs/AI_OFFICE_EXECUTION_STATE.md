# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–35 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / EXACT SOURCE STAMPING / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION / POST-PROMOTION ROLLBACK / CANONICAL QUALITY GATE / GEMINI CONFIG RELEASE GATE / PINNED VERCEL CLI
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
- PHASE 16–17 Operations Center v3.6 merged: unified Task Center + AI Center, real task store, measured progress only, honest `NO TELEMETRY`.
- PHASE 18 Chief timeout hardening: Gemini `chief` timeout 30s -> 12s; timeout/abort becomes honest local fallback instead of HTTP 502; non-timeout failures still propagate.
- PHASE 19 deployment truthfulness: missing `VERCEL_TOKEN` FAILS `deploy-production`; skipped deployment can no longer appear green. Production smoke requires exact `x-ai-office-source-commit == GITHUB_SHA`.
- PHASE 20 stable `/api/research` corrected to `api/research.ts -> research-v31.js`; obsolete v29 Vercel rewrite removed.
- PHASE 21 Gemini routing corrected: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- PHASE 22 provider smoke contract added.
- PHASE 23 XiaoZhi transient health event verified without speculative patching; browser fallback retained.
- PHASE 24 XiaoZhi telemetry aligned to voice render version `2.3`; runtime/WebSocket behavior unchanged.
- PHASE 25 Vercel deployment path verified to correct project/domain, but native Git auto-deploy linkage is NOT assumed.
- PHASE 26 exact source-commit stamping: `api/health.ts` emits `x-ai-office-source-commit` from explicit runtime state; CLI deploy passes `AI_OFFICE_SOURCE_COMMIT=$GITHUB_SHA`.
- PHASE 27 immutable release shell/assets: `api/app.ts` and `api/asset.ts` no longer load raw GitHub `main`; runtime content resolves by validated 40-character release SHA and exposes UI/asset source-ref headers.
- PHASE 28 coherent production smoke verifies backend source SHA, UI source-ref and runtime asset source-ref against `GITHUB_SHA`, plus provider/artifact/safety contracts.
- PHASE 29 Drive Bridge release pinning: Runtime Credentials fetches `DriveBrainBridge.gs` through SHA-pinned `/api/asset`; no raw `main` runtime dependency.
- PHASE 30 candidate promotion gate: production-environment candidate uses `--prod --skip-domain`; candidate smoke passes before `vercel promote`; production smoke runs after promotion.
- PHASE 31 quota-safe provider diagnostics: Runtime Credentials is health-only by default. Gemini Grounding and Drive Canary run only after explicit user check; unprobed state is `MANUAL_CHECK_REQUIRED`.
- PHASE 32 post-promotion rollback recovery: capture exact serving production before release; if post-promotion smoke fails, rollback targets that captured deployment and verifies restoration; workflow remains failed after recovery.
- PHASE 33 canonical quality-gate consolidation: provider-probe quota regression moved inside canonical `source-policy`; duplicate standalone workflow removed so quota safety actually gates deployment and CI cost is reduced.
- PHASE 34 Gemini configuration release gate: candidate and production smoke now require `providers.gemini.configured === true` in addition to the expected primary/economy model names. Release smoke still does NOT call Gemini Grounding or aggregate provider probes, so this gate costs no model quota.
- PHASE 35 deterministic Vercel CLI: CI no longer installs `vercel@latest`; it pins `vercel@59.11.7`. Upgrades must be intentional and revalidated through canonical source-policy before merge.

## VERIFIED CI
- PHASE 29 main #187 (`34664088853`): full source-policy PASS; deploy BLOCKED at credential gate.
- PHASE 30 branch #190 (`34664398053`): full source suite PASS including candidate promotion gate.
- PHASE 30 main #191 (`34664438077`): full source-policy PASS; deploy BLOCKED at credential gate.
- PHASE 31 canonical main #194 (`34664783558`): source-policy PASS; deploy BLOCKED.
- PHASE 32 branch #195 (`34664937770`): full source suite PASS including rollback recovery.
- PHASE 32 main #196 (`34664964386`): source-policy PASS; deploy BLOCKED at credential gate.
- PHASE 33 branch #199 (`34665179101`): canonical source-policy PASS including provider quota regression.
- PHASE 33 main #200 (`34665543085`): source-policy PASS; deploy BLOCKED exactly at `Require deployment credential`.
- PHASE 34 branch #202 (`34665775983`): full source-policy PASS including Gemini configuration release gate.
- PHASE 34 main #203 (`34665808158`): full source-policy PASS; deploy BLOCKED at credential gate; no candidate/promotion executed.
- PHASE 35 branch #204 (`34665933586`): full source-policy PASS including Vercel CLI pin regression; branch deploy skipped.
- PHASE 35 main #205 (`34665983893`): full source-policy PASS including v50 + dependency audit; `deploy-production` FAIL/BLOCKED at `Require deployment credential`; Capture/Install/Pull/Build/Candidate Deploy/Candidate Smoke/Promote/Post-Smoke/Rollback all skipped because `VERCEL_TOKEN` is absent.
- `npm audit --omit=dev --audit-level=high`: PASS in all current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 35 before this checkpoint documentation commit: `9a2d098afb7615ab15eb01fba638222f0284fec4`.
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
- Therefore source through PHASE 35 is NOT production-verified.
- Deployment remains fail-closed. Without `VERCEL_TOKEN`, no capture/candidate deployment/promotion/rollback workflow can run.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. The last explicit Google Search Grounding probe observed HTTP 429; do not call it healthy merely because an API key exists.
- Gemini model contract: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- Runtime Credentials does not spend Grounding quota on auto-open/ordinary refresh.
- Public research fallback: CONFIGURED / AVAILABLE.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED. Fresh health at 2026-09-12T01:47:38Z briefly returned `VOICE_RENDER_UNREACHABLE`; the next probe at 01:47:50Z recovered to READY with gateway release `xiaozhi-render-gateway-1.2.0`. Treat as transient; preserve browser fallback and do not patch without a repeated error cluster.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini Grounding 429 keeps provider health DEGRADED rather than HEALTHY; do not auto-probe it.
- Drive and Google Workspace E2E remain credential-dependent.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` remain measured warning-only signals; do not broadly refactor runtime merely to silence them.
- Historical loader/bare-module errors belong to old production; re-evaluate only after current source reaches production.
- XiaoZhi showed another one-probe transient unreachability but recovered immediately; no speculative voice patch.
- Rollback recovery is source/test verified only; it has not run live because deployment credentials are absent.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. Primary production blocker.
- Drive E2E requires either `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` with Viewer access to A.I Văn phòng root or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before provider health can be marked fully healthy.

## NEXT_ACTION
1. Configure `VERCEL_TOKEN`; highest-value external unblock.
2. Once token exists, run the existing canonical workflow: capture current production -> install pinned Vercel CLI -> pull production config -> production build -> candidate `--prod --skip-domain` -> candidate smoke -> promote -> production smoke -> rollback captured deployment if post-smoke fails.
3. Candidate/production smoke must require Gemini configured true, expected primary/economy models, exact source SHA, UI source-ref, runtime asset source-ref, artifact selftest and safety asset; Grounding probe is intentionally excluded from release smoke.
4. Until deployment is unblocked, continue only with source-side issues proven by current code/tests or fresh runtime evidence.
5. After current source reaches production, rerun production error clusters and verify `/api/research` serves v31 behavior.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- `automation-core-v19.js` execution/approval/procedural-memory contract.
- `orchestrator-v193.js` continuation behavior.
- Gemini-first `research-v31.js` freshness/quota/fallback behavior and stable `/api/research -> api/research.ts -> research-v31.js`.
- Distinct Gemini primary/economy routing unless measured evidence requires change.
- Explicit Drive/local internal-source opt-in boundary and approved-only `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- XiaoZhi voice render v2.3, browser fallback, barge-in, continuous session and shared text/voice semantics.
- Safe/reversible auto-execution and approval gate for irreversible actions.
- Runtime Credentials health-only by default; expensive provider/canary probes require explicit user action.
- Provider quota regression stays inside canonical `source-policy` that gates deployment.
- Operations Center honest telemetry: no fake progress, quota, latency or provider health.
- Chief timeout fallback stays fail-fast/honest; arbitrary non-timeout errors must not become fake success.
- Deployment stays fail-closed: missing credential, Gemini not configured, candidate smoke failure, wrong model config, failed selftest, missing safety asset, source/UI/asset mismatch must never report production success.
- Candidate never receives production traffic before smoke passes; only verified candidate may be promoted.
- Failed post-promotion smoke rolls back to exact deployment captured before release and job remains failed.
- Production runtime shell, JS assets and Drive Bridge setup stay pinned to validated release SHA; do not fetch raw `main`.
- Vercel CLI remains pinned to `59.11.7` until an intentional upgrade is separately revalidated.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 35 at feature baseline `9a2d098afb7615ab15eb01fba638222f0284fec4` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Last verified live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.