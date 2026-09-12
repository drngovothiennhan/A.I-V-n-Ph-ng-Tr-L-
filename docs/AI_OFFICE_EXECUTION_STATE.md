# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–46 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION + ROLLBACK / HONEST PROVIDER HEALTH / SAME-ORIGIN RUNTIME GATEWAYS / LEGACY XIAOZHI BRIDGE RETIRED / EXACT-SOURCE ARTIFACT SELFTEST / VERSIONED RESEARCH ROUTES RETIRED / LEGACY HEALTH ROUTE RETIRED

NEXT: production remains BLOCKED by missing `VERCEL_TOKEN`. Continue only with current-source issues proven by tests or fresh runtime evidence. Keep GitHub + Vercel real-time state synchronized in every phase report.

## COMPLETED
- PHASE 0–42: canonical orchestration, source routing, explicit internal-source consent, Drive readonly retrieval, bounded context, Global Cancel, Authorization Broker, honest Operations Center, Chief timeout fallback, fail-closed deployment, stable research v31, exact source stamping, immutable SHA-pinned runtime assets, candidate-before-promotion, exact rollback, pinned Vercel CLI, passive provider/voice health, and same-origin gateways for Drive/research/proxy/image/ingest.
- PHASE 43: retired legacy `api/ws-xiaozhi.ts`; current voice remains direct Render WSS v2.3 + browser fallback.
- PHASE 44: `/api/selftest` requires POST + exact release-source header before real DOCX/XLSX/PPTX work; release smoke verifies exact source.
- PHASE 45: public `/api/research-v28..v31` routes now fail closed through `api/research-legacy-retired.ts`; internal v31→v30→v29→v28 imports remain intact behind canonical `/api/research`.
- PHASE 46: public `/api/health-v17` now rewrites to `api/health-legacy-retired.ts` and returns HTTP 410 `LEGACY_HEALTH_ROUTE_RETIRED`, canonical `/api/health`, `telemetryCurrent:false`. The old release-1.7/env-inference health response can no longer compete with canonical real-time health semantics.

## VERIFIED CI
- PHASE 45 targeted QA `34668939062`: PASS retired-version routing, stable research chain, relevance contract and dependency audit.
- PHASE 45 main #225 (`34668972162`): full source-policy PASS; deploy BLOCKED at credential gate.
- PHASE 46 targeted QA `34669105751`: PASS canonical passive-health contract, retired legacy-health route and dependency audit.
- PHASE 46 main #227 (`34669143696`): full canonical source-policy PASS including provider-health regression. `deploy-production` FAIL/BLOCKED exactly at `Require deployment credential`; all actual release steps skipped.
- `npm audit --omit=dev --audit-level=high`: PASS in current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 46 before this checkpoint documentation commit: `5076a1863b02651b71e522ad78e3a3adf9325677`.
- Canonical health endpoint: `/api/health` only. `/api/health-v17` is retired.
- Canonical research endpoint: `/api/research -> research-gateway -> research.ts -> research-v31`; versioned HTTP routes are retired, internal module delegation remains intact.
- Other protected routes: Drive/research/proxy/image/ingest request-boundary gateways; exact-source `/api/selftest`; direct Render XiaoZhi v2.3 with legacy Vercel bridge retired.

## REALTIME_PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Current/latest production deployment remains `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca` (`READY`).
- Vercel polling after PHASE 46 main push found zero new deployments; no hidden Git auto-deploy occurred.
- Fresh `/api/health` check at `2026-09-12T03:00:09.511Z` returned HTTP 200 with `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Live JSON still shows old health behavior (`googleSearchGrounding:true`, eager XiaoZhi probe), confirming production has not received PHASE 36–46.
- Therefore PHASE 46 is SOURCE READY only; production remains older source `825dbf...`.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. Last explicit Google Search Grounding probe observed HTTP 429. Configuration is not verified Grounding health.
- Gemini primary/economy: `gemini-3.8-flash` / `gemini-3.5-flash-lite`.
- Public research fallback: AVAILABLE; stable v31 remains behind secure gateway.
- Local Safe Engine: AVAILABLE fallback.
- XiaoZhi: CONFIGURED; direct Render v2.3 + browser fallback. Current-source passive health does not imply live reachability.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS / LIMITATIONS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini Grounding 429 keeps provider health DEGRADED; do not auto-probe.
- Drive and Workspace E2E remain credential-dependent.
- Same-origin request guards are defense-in-depth, not account authentication/rate limiting.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` remain warning-only old-production signals; do not patch merely to silence them before current source is deployed and remeasured.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. Primary production blocker and exact reason main deploy job remains red.
- Drive E2E requires readonly Drive credentials or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before it can be marked verified healthy.

## NEXT_ACTION
1. Configure GitHub Actions secret `VERCEL_TOKEN`; this is the only blocker preventing current source from reaching the live app through the validated release pipeline.
2. Once token exists, run canonical release: capture current production -> pinned Vercel CLI -> pull/build -> candidate without traffic -> exact-source candidate smoke -> promote -> exact-source production smoke -> exact rollback on failure.
3. Continue real-time GitHub + Vercel monitoring around every main push/release; never infer production state from source alone.
4. Until deploy is unblocked, continue only with current-code/test-backed or fresh-runtime issues; do not patch old-production warning-only logs.
5. After current source reaches production, verify passive health, explicit XiaoZhi probe, retired health/research routes, request gateways, research v31 and exact-source artifact selftest.

## DO_NOT_BREAK
- Dashboard v1.5 shell/responsive behavior.
- Existing automation/orchestration/approval/procedural-memory contracts.
- Stable research v31 behind canonical gateway; versioned HTTP routes stay retired while internal imports remain intact.
- `/api/health` stays canonical/passive; `/api/health-v17` stays retired.
- Chief timeout/honest fallback semantics.
- Explicit internal/Drive opt-in and `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- XiaoZhi direct Render v2.3 + browser fallback; legacy Vercel bridge stays retired.
- `/api/selftest` stays exact-source gated and real.
- Runtime Credentials health-only by default; expensive probes require explicit action.
- `probe=all` remains passive/zero-provider-call.
- Honest telemetry only; no fake progress/quota/latency/provider health.
- Deployment stays fail-closed; candidate receives no production traffic before smoke; failed post-promotion smoke rolls back exact captured deployment and remains failed.
- SHA-pinned production shell/assets/Drive Bridge; no raw `main`.
- Vercel CLI remains pinned to `59.11.7` until intentional upgrade is revalidated.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 46 at feature baseline `5076a1863b02651b71e522ad78e3a3adf9325677` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Fresh live source remains `825dbf8073284eadc38800245f42d4f70f647c98` on deployment `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`.
