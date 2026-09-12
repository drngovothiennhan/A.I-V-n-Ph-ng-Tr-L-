# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–46 COMPLETE. PHASE 47 VERIFIED BLOCKER — SAFE PRODUCTION AUTHENTICATION REQUIRES A VERCEL AUTH CREDENTIAL.

## CURRENT_OBJECTIVE
Keep SOURCE READY separate from PRODUCTION VERIFIED. Continue additive, production-safe work only. Track GitHub + Vercel real-time state on every main push. Never bypass the validated candidate -> smoke -> promote -> production smoke -> exact rollback pipeline with an unscoped deployment path.

## COMPLETED
- PHASE 0–42: canonical orchestration, source routing, explicit internal-source consent, Drive readonly retrieval, bounded context, Global Cancel, Authorization Broker, honest Operations Center, Chief timeout fallback, fail-closed deployment, stable research v31, exact source stamping, immutable SHA-pinned runtime assets, candidate-before-promotion, exact rollback, pinned Vercel CLI, passive provider/voice health, and same-origin gateways for Drive/research/proxy/image/ingest.
- PHASE 43: legacy `api/ws-xiaozhi.ts` retired; direct Render WSS v2.3 + browser fallback preserved.
- PHASE 44: `/api/selftest` exact-source POST gate preserves real DOCX/XLSX/PPTX release testing.
- PHASE 45: public `/api/research-v28..v31` routes retired through HTTP 410 while internal v31→v30→v29→v28 module delegation remains intact.
- PHASE 46: public `/api/health-v17` retired through HTTP 410 so canonical `/api/health` is the only supported telemetry endpoint.
- PHASE 47 investigation: current Vercel documentation confirms GitHub OIDC is for trusted-source / Deployment Protection bypass, not a replacement for Vercel CLI deployment authentication. `vercel project token` and Deploy Hook creation still require an authenticated Vercel context. Therefore no verified tokenless replacement preserves the current project-scoped release pipeline. Do not substitute an unscoped direct-deploy tool.

## VERIFIED CI
- PHASE 45 targeted QA `34668939062`: PASS retired research routing + stable internal chain + dependency audit.
- PHASE 45 main #225 (`34668972162`): full source-policy PASS; deploy blocked at credential gate.
- PHASE 46 targeted QA `34669105751`: PASS canonical passive health + retired legacy health + dependency audit.
- PHASE 46 main #227 (`34669143696`): full source-policy PASS; `deploy-production` FAIL/BLOCKED exactly at `Require deployment credential`; Capture/Install/Pull/Build/Candidate Deploy/Candidate Smoke/Promote/Post-Smoke/Rollback all skipped.
- `npm audit --omit=dev --audit-level=high`: PASS in current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 46: `5076a1863b02651b71e522ad78e3a3adf9325677` before checkpoint commits.
- Canonical health: `/api/health`; `/api/health-v17` retired.
- Canonical research: `/api/research -> research-gateway -> research.ts -> research-v31`; public versioned routes retired.
- Drive/research/proxy/image/ingest remain behind request-boundary gateways.
- `/api/selftest` remains exact-source gated and creates real Office artifacts.
- XiaoZhi remains direct Render v2.3 + browser fallback; legacy Vercel bridge retired.

## REALTIME_PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Current/latest production deployment: `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca` (`READY`).
- Vercel polling after PHASE 46 main push found zero new deployments; no hidden Git auto-deploy occurred.
- Fresh `/api/health` check at `2026-09-12T03:00:09.511Z`: HTTP 200, `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Live JSON still exposes old behavior such as `googleSearchGrounding:true` and eager XiaoZhi probing, which confirms production has not received PHASE 36–46.
- Production is therefore BLOCKED / NOT UPDATED / NOT VERIFIED for current source.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. Last explicit Grounding probe observed HTTP 429. Do not auto-probe or report healthy from key presence.
- Gemini primary/economy: `gemini-3.8-flash` / `gemini-3.5-flash-lite`.
- Public research fallback: AVAILABLE; stable v31 is behind secure gateway.
- Local Safe Engine: AVAILABLE fallback.
- XiaoZhi: CONFIGURED; direct Render v2.3 + browser fallback. Current-source passive health does not imply live reachability.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. This is the exact primary production blocker.
- No verified GitHub-OIDC-only substitute exists for the Vercel CLI deployment/promotion authentication used by this pipeline.
- Drive E2E requires readonly Drive or Apps Script Bridge credentials.
- Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before verified healthy status.

## NEXT_ACTION
1. User/admin must create or supply a Vercel authorization token with access to project `prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc` and store it as GitHub Actions secret `VERCEL_TOKEN`.
2. Then rerun/push canonical main workflow. Expected path: capture serving production -> Vercel CLI `59.11.7` pull/build -> production-environment candidate without traffic -> exact-source candidate smoke -> promote -> exact-source production smoke -> exact rollback on failure.
3. During that run, monitor GitHub + Vercel real time; only mark PRODUCTION VERIFIED when live `x-ai-office-source-commit` equals the validated release SHA and post-promotion smoke passes.
4. Until credential arrives, continue only with source/test-backed issues or fresh runtime evidence; do not patch old-production warning-only logs and do not use an unscoped deployment shortcut.

## DO_NOT_BREAK
- Dashboard v1.5 shell/responsive behavior.
- Existing automation/orchestration/approval/procedural-memory contracts.
- Stable research v31 behind canonical gateway; public versioned routes remain retired.
- `/api/health` canonical/passive; `/api/health-v17` retired.
- Chief timeout/honest fallback semantics.
- Explicit internal/Drive opt-in and `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- XiaoZhi direct Render v2.3 + browser fallback; legacy bridge retired.
- `/api/selftest` exact-source gated and real.
- Runtime Credentials health-only by default; expensive probes require explicit action.
- Honest telemetry only.
- Deployment fail-closed; no production traffic before candidate smoke; exact rollback on failed post-smoke.
- SHA-pinned production shell/assets/Drive Bridge; no raw `main`.
- Vercel CLI pinned to `59.11.7` until intentional revalidation.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 46 at feature baseline `5076a1863b02651b71e522ad78e3a3adf9325677` before checkpoint commits.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Fresh live source remains `825dbf8073284eadc38800245f42d4f70f647c98` on deployment `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`.
