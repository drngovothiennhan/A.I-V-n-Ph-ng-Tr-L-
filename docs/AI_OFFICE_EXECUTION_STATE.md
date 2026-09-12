# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–44 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION + ROLLBACK / HONEST PROVIDER HEALTH / SAME-ORIGIN RUNTIME GATEWAYS / LEGACY XIAOZHI BRIDGE RETIRED / EXACT-SOURCE ARTIFACT SELFTEST

NEXT: production remains BLOCKED by missing `VERCEL_TOKEN`. Continue only with current-source issues proven by tests or fresh runtime evidence.

## CURRENT_OBJECTIVE
Continue additive, production-safe hardening from the canonical orchestrator and approved Dashboard v1.5. Keep SOURCE READY separate from PRODUCTION VERIFIED. Do not rebuild stable subsystems, fabricate telemetry, or deploy through an unscoped path. Track GitHub + Vercel real-time state during each phase so live production is never confused with source readiness.

## COMPLETED
- PHASE 0–42: canonical orchestration, source routing, explicit internal-source consent, Drive readonly retrieval, bounded context, Global Cancel, Authorization Broker, honest Operations Center, Chief timeout fallback, fail-closed deployment, stable research v31, exact source stamping, immutable SHA-pinned runtime assets, candidate-before-promotion, exact rollback, pinned Vercel CLI, passive provider/voice health, and same-origin gateways for Drive/research/proxy/image/ingest.
- PHASE 43: retired legacy `api/ws-xiaozhi.ts`. Current browser voice remains direct Render WSS v2.3 with browser fallback; the unused Vercel bridge now fails closed with HTTP 410 and no longer contains upstream/token execution logic.
- PHASE 44: hardened real Office artifact selftest. `/api/selftest` now requires `POST` plus `x-ai-office-selftest-source` exactly matching `AI_OFFICE_SOURCE_COMMIT` / `VERCEL_GIT_COMMIT_SHA`. GET/navigation and wrong/missing markers fail before artifact work with `artifactWorkPerformed:false`. Valid release selftest still creates real DOCX/XLSX/PPTX and returns the verified `sourceCommit`.
- PHASE 44 release workflow updated so candidate and post-promotion production smoke both POST `/api/selftest` with `x-ai-office-selftest-source: $GITHUB_SHA`, and reject responses whose `sourceCommit !== GITHUB_SHA`.

## VERIFIED CI
- PHASE 43 targeted QA `34668069640`: PASS direct Render contract, retired legacy bridge, XiaoZhi live fallback and dependency audit.
- PHASE 43 main #221 (`34668116728`): full canonical source-policy PASS; deploy BLOCKED at credential gate.
- PHASE 44 targeted QA `34668601956`: PASS exact-source selftest behavior, release coherence, candidate promotion contract, real Office artifact round-trip and dependency audit.
- PHASE 44 main #223 (`34668666387`): full canonical source-policy PASS including exact-source selftest regression. `deploy-production` FAIL/BLOCKED exactly at `Require deployment credential`; Capture/Install/Pull/Build/Candidate Deploy/Candidate Smoke/Promote/Post-Smoke/Rollback all skipped.
- `npm audit --omit=dev --audit-level=high`: PASS in current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 44 before this checkpoint documentation commit: `d69a03148fc1bb0d3f24bf39dc2dfb81fbf3211b`.
- Key protected routes/contracts:
  - `/api/drive-brain -> api/drive-brain-gateway.ts -> readonly Drive handler`
  - `/api/research -> api/research-gateway.ts -> api/research.ts -> research-v31.js`
  - `/api/proxy -> api/proxy-gateway.ts -> canonical Chief/Web/Artifact proxy`
  - `/api/image -> api/image-gateway.ts -> canonical Gemini image handler`
  - `/api/ingest -> api/ingest-gateway.ts -> canonical Office ingest handler`
  - `/api/selftest -> exact-source POST release gate -> real Office artifact engine`
  - XiaoZhi current path: direct Render WSS + browser fallback; legacy Vercel bridge retired.

## REALTIME_PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Current/latest production deployment at fresh check: `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca` (`READY`).
- Fresh `/api/health` check at `2026-09-12T02:42:54.863Z` returned HTTP 200 but header `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Vercel deployment polling after PHASE 44 main push found no new deployment, so there is no hidden Git auto-deploy of current main.
- Therefore PHASE 44 source is NOT production-verified; live production remains older source `825dbf...`.
- Fresh 1-hour runtime error aggregation shows only two warning groups on old production: `DEP0169 url.parse()` and experimental `stripTypeScriptTypes`; no new actionable runtime error cluster was observed.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. Last explicit Google Search Grounding probe observed HTTP 429. Configuration is not reported as verified Grounding health.
- Gemini primary/economy: `gemini-3.8-flash` / `gemini-3.5-flash-lite`.
- Gemini Image remains available behind same-origin gateway in current source.
- Public research fallback: AVAILABLE; current source preserves v31 behind secure gateway.
- Local Safe Engine: AVAILABLE fallback.
- XiaoZhi: CONFIGURED; direct Render v2.3 + browser fallback. Passive health must not be treated as a live provider probe.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS / LIMITATIONS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini Grounding 429 keeps provider health DEGRADED rather than HEALTHY; do not auto-probe it.
- Drive and Workspace E2E remain credential-dependent.
- Same-origin Fetch Metadata/Referer guards are defense-in-depth, not account authentication or rate limiting. A broad multi-user/public deployment still needs authenticated + rate-limited user boundaries.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` are current old-production warning-only signals; do not refactor merely to silence them before current source is deployed and remeasured.
- Historical loader/runtime errors belong to old production; re-evaluate only after current source reaches production.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. This is the primary production blocker and the exact reason main deploy job remains red.
- Drive E2E requires readonly Drive credentials or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before it can be marked verified healthy.

## NEXT_ACTION
1. Configure GitHub Actions secret `VERCEL_TOKEN`; highest-value external unblock.
2. Once token exists, run canonical release: capture current production -> pinned Vercel CLI -> pull/build -> production-environment candidate without traffic -> exact-source candidate smoke -> promote -> exact-source production smoke -> rollback captured deployment if post-smoke fails.
3. Continue real-time polling of Vercel deployment/source state around every main release so any external or Git-triggered deployment is detected instead of assumed.
4. Until deploy is unblocked, continue only with current-code/test-backed or fresh-runtime issues; do not patch old-production warnings merely to make logs quiet.
5. After current source reaches production, re-run runtime error clusters and verify passive health, explicit XiaoZhi probe, all runtime gateways, retired legacy voice route, research v31 and exact-source artifact selftest.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- Existing automation/orchestration/approval/procedural-memory contracts.
- Stable research v31 chain behind its gateway.
- Chief timeout/honest fallback semantics.
- Explicit internal/Drive opt-in and `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- Canonical image and Office ingest engines behind their gateways.
- XiaoZhi direct Render v2.3, browser fallback, barge-in, continuous session and shared text/voice semantics.
- `api/ws-xiaozhi.ts` remains retired/fail-closed unless an intentional authenticated architecture replaces it.
- `/api/selftest` must remain a real artifact test but fail before artifact work unless the caller supplies the exact release source marker.
- Candidate/production selftest smoke must verify `sourceCommit === GITHUB_SHA`.
- Runtime Credentials health-only by default; expensive probes require explicit action.
- `probe=all` remains passive/zero-provider-call; `/api/health` remains passive for XiaoZhi.
- Production Drive/research/proxy/image/ingest routes remain behind their current request-boundary gateways.
- Honest telemetry only; no fake progress/quota/latency/provider health.
- Deployment remains fail-closed; candidate receives no production traffic before smoke passes; failed post-promotion smoke rolls back exact captured deployment and remains failed.
- Production shell/assets/Drive Bridge remain pinned to validated source SHA; no raw `main`.
- Vercel CLI remains pinned to `59.11.7` until intentional upgrade is revalidated.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 44 at feature baseline `d69a03148fc1bb0d3f24bf39dc2dfb81fbf3211b` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Fresh live source remains `825dbf8073284eadc38800245f42d4f70f647c98` on deployment `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`.
