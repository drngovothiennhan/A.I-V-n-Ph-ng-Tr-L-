# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–45 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION + ROLLBACK / HONEST PROVIDER HEALTH / SAME-ORIGIN RUNTIME GATEWAYS / LEGACY XIAOZHI BRIDGE RETIRED / EXACT-SOURCE ARTIFACT SELFTEST / VERSIONED RESEARCH HTTP ROUTES RETIRED

NEXT: production remains BLOCKED by missing `VERCEL_TOKEN`. Continue only with current-source issues proven by tests or fresh runtime evidence. Keep GitHub + Vercel real-time state synchronized in every phase report.

## CURRENT_OBJECTIVE
Continue additive, production-safe hardening from the canonical orchestrator and approved Dashboard v1.5. Keep SOURCE READY separate from PRODUCTION VERIFIED. Do not rebuild stable subsystems, fabricate telemetry, or deploy through an unscoped path.

## COMPLETED
- PHASE 0–42: canonical orchestration, source routing, explicit internal-source consent, Drive readonly retrieval, bounded context, Global Cancel, Authorization Broker, honest Operations Center, Chief timeout fallback, fail-closed deployment, stable research v31, exact source stamping, immutable SHA-pinned runtime assets, candidate-before-promotion, exact rollback, pinned Vercel CLI, passive provider/voice health, and same-origin gateways for Drive/research/proxy/image/ingest.
- PHASE 43: retired legacy `api/ws-xiaozhi.ts`; current voice remains direct Render WSS v2.3 + browser fallback.
- PHASE 44: `/api/selftest` now requires POST + exact release-source header before creating real DOCX/XLSX/PPTX; candidate and production smoke verify `sourceCommit === GITHUB_SHA`.
- PHASE 45: public versioned research HTTP routes `/api/research-v28`, `/api/research-v29`, `/api/research-v30`, `/api/research-v31` are rewritten to `api/research-legacy-retired.ts`, which returns HTTP 410 `LEGACY_RESEARCH_ROUTE_RETIRED`, canonical endpoint `/api/research`, and `providerCallMade:false`. The internal import chain `research-v31 -> v30 -> v29 -> v28` remains unchanged and available only behind the canonical `/api/research -> research-gateway -> research.ts -> v31` route.

## VERIFIED CI
- PHASE 44 targeted QA `34668601956`: PASS exact-source selftest, release coherence, candidate promotion, real artifact round-trip and dependency audit.
- PHASE 44 main #223 (`34668666387`): full source-policy PASS; deploy BLOCKED exactly at credential gate.
- PHASE 45 targeted QA `34668939062`: PASS retired-version routing, stable research chain, research relevance contract and dependency audit.
- PHASE 45 main #225 (`34668972162`): full canonical source-policy PASS including stable/retired research routing. `deploy-production` FAIL/BLOCKED exactly at `Require deployment credential`; Capture/Install/Pull/Build/Candidate Deploy/Candidate Smoke/Promote/Post-Smoke/Rollback all skipped.
- `npm audit --omit=dev --audit-level=high`: PASS in current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 45 before this checkpoint documentation commit: `4a7e8f49de7de2f131056dab8e2b4b1dc392d675`.
- Key protected routes/contracts:
  - `/api/drive-brain -> api/drive-brain-gateway.ts -> readonly Drive handler`
  - `/api/research -> api/research-gateway.ts -> api/research.ts -> research-v31.js`
  - `/api/research-v28..v31 -> api/research-legacy-retired.ts -> HTTP 410/no provider call`
  - `/api/proxy -> api/proxy-gateway.ts -> canonical Chief/Web/Artifact proxy`
  - `/api/image -> api/image-gateway.ts -> canonical Gemini image handler`
  - `/api/ingest -> api/ingest-gateway.ts -> canonical Office ingest handler`
  - `/api/selftest -> exact-source POST release gate -> real Office artifact engine`
  - XiaoZhi current path: direct Render WSS + browser fallback; legacy Vercel bridge retired.

## REALTIME_PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Current/latest production deployment remains `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca` (`READY`).
- Vercel polling after PHASE 45 main push found zero new deployments; there is no hidden Git auto-deploy of current main.
- Fresh `/api/health` check at `2026-09-12T02:56:04.899Z` returned HTTP 200 with `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- The live JSON still exposes old behavior such as `googleSearchGrounding:true` and an eager XiaoZhi probe; this is evidence that production has not received PHASE 36–45, not a regression of current source.
- Therefore PHASE 45 is SOURCE READY only; production remains older source `825dbf...`.
- Fresh runtime aggregation before PHASE 45 showed only warning-only old-production groups `DEP0169 url.parse()` and experimental `stripTypeScriptTypes`; no new actionable error cluster.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. Last explicit Google Search Grounding probe observed HTTP 429. Configuration is not verified Grounding health.
- Gemini primary/economy: `gemini-3.8-flash` / `gemini-3.5-flash-lite`.
- Public research fallback: AVAILABLE; current source preserves v31 behind secure gateway.
- Local Safe Engine: AVAILABLE fallback.
- XiaoZhi: CONFIGURED; direct Render v2.3 + browser fallback. Current-source passive health must not be interpreted as a live probe.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS / LIMITATIONS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini Grounding 429 keeps provider health DEGRADED rather than HEALTHY; do not auto-probe it.
- Drive and Workspace E2E remain credential-dependent.
- Same-origin request guards are defense-in-depth, not account authentication/rate limiting. Broad multi-user/public deployment still needs authenticated + rate-limited boundaries.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` remain warning-only old-production signals; do not refactor merely to silence them before current source is deployed and remeasured.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. Primary production blocker and exact reason main deploy job remains red.
- Drive E2E requires readonly Drive credentials or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before it can be marked verified healthy.

## NEXT_ACTION
1. Configure GitHub Actions secret `VERCEL_TOKEN`; highest-value external unblock.
2. Once token exists, run canonical release: capture current production -> pinned Vercel CLI -> pull/build -> candidate without traffic -> exact-source candidate smoke -> promote -> exact-source production smoke -> rollback captured deployment if post-smoke fails.
3. Continue real-time GitHub + Vercel monitoring around every main push/release; never infer deployment from source state.
4. Until deploy is unblocked, continue only with current-code/test-backed or fresh-runtime issues. Do not patch old-production warning-only logs.
5. After current source reaches production, verify passive health, explicit XiaoZhi probe, all request gateways, retired versioned research routes, stable research v31 and exact-source artifact selftest.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- Existing automation/orchestration/approval/procedural-memory contracts.
- Stable research v31 chain behind canonical gateway; versioned HTTP routes remain retired while internal imports remain intact.
- Chief timeout/honest fallback semantics.
- Explicit internal/Drive opt-in and `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- XiaoZhi direct Render v2.3 + browser fallback; legacy Vercel bridge remains retired.
- `/api/selftest` remains real but exact-source gated; candidate/production smoke verifies `sourceCommit === GITHUB_SHA`.
- Runtime Credentials remain health-only by default; expensive probes require explicit action.
- `probe=all` remains passive/zero-provider-call; current-source `/api/health` remains passive for XiaoZhi.
- Production Drive/research/proxy/image/ingest routes remain behind request-boundary gateways.
- Honest telemetry only; no fake progress/quota/latency/provider health.
- Deployment remains fail-closed; no production traffic before candidate smoke; failed post-promotion smoke rolls back exact captured deployment and remains failed.
- Production shell/assets/Drive Bridge remain pinned to validated source SHA; no raw `main`.
- Vercel CLI remains pinned to `59.11.7` until intentional upgrade is revalidated.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 45 at feature baseline `4a7e8f49de7de2f131056dab8e2b4b1dc392d675` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Fresh live source remains `825dbf8073284eadc38800245f42d4f70f647c98` on deployment `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`.
