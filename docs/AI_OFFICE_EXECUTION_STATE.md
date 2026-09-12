# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–43 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION + ROLLBACK / HONEST PROVIDER HEALTH / SAME-ORIGIN RUNTIME GATEWAYS / LEGACY XIAOZHI BRIDGE RETIRED

NEXT: production remains BLOCKED by missing `VERCEL_TOKEN`. Continue only with current-source issues proven by tests or fresh runtime evidence.

## CURRENT_OBJECTIVE
Continue additive, production-safe hardening from the canonical orchestrator and approved Dashboard v1.5. Keep SOURCE READY separate from PRODUCTION VERIFIED. Do not rebuild stable subsystems, fabricate telemetry, or deploy through an unscoped path.

## COMPLETED
- PHASE 0–42: canonical orchestration, source routing, explicit internal-source consent, Drive readonly retrieval, bounded context, global cancel, authorization broker, honest Operations Center, Chief timeout fallback, truthful/fail-closed deployment, stable research v31, exact source stamping, immutable SHA-pinned runtime assets, candidate-before-promotion, exact rollback, pinned Vercel CLI, passive provider/voice health, and same-origin gateways for Drive/research/proxy/image/ingest.
- PHASE 43: retired legacy `api/ws-xiaozhi.ts`. Current browser voice already uses direct Render WSS (`wss://ai-office-xiaozhi-gateway.onrender.com/xiaozhi/v1/`) and the Render gateway already enforces trusted-origin/token authorization. The unused Vercel bridge previously contained upstream WebSocket + server-token logic; it now fails closed with HTTP 410 `LEGACY_VERCEL_WS_BRIDGE_RETIRED`, keeps browser-fallback guidance, and contains no upstream/token execution path. Current direct Render v2.3 behavior is unchanged.

## VERIFIED CI
- PHASE 40 main #215 (`34667384170`): full source-policy PASS; deploy BLOCKED at credential gate.
- PHASE 41 targeted QA `34667642877`: PASS research/proxy gateways, stable v31 route, Chief fallback and dependency audit.
- PHASE 41 main #217 (`34667678759`): full source-policy PASS; deploy BLOCKED.
- PHASE 42 targeted QA `34667861962`: PASS image/ingest gateways, artifact round-trip and dependency audit.
- PHASE 42 main #219 (`34667900241`): full source-policy PASS; deploy BLOCKED.
- PHASE 43 targeted QA `34668069640`: PASS direct Render contract, retired legacy bridge, XiaoZhi live fallback transport and dependency audit.
- PHASE 43 main #221 (`34668116728`): full canonical source-policy PASS including XiaoZhi version telemetry, client continuity, live fallback, artifacts, Drive and dependency audit. `deploy-production` FAIL/BLOCKED exactly at `Require deployment credential`; Capture/Install/Pull/Build/Candidate Deploy/Candidate Smoke/Promote/Post-Smoke/Rollback all skipped.
- `npm audit --omit=dev --audit-level=high`: PASS in all current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 43 before this checkpoint documentation commit: `21264e463004011812ec2df1d55cedeecd8010f1`.
- Key protected routes/contracts:
  - `/api/drive-brain -> api/drive-brain-gateway.ts -> readonly Drive handler`
  - `/api/research -> api/research-gateway.ts -> api/research.ts -> research-v31.js`
  - `/api/proxy -> api/proxy-gateway.ts -> canonical Chief/Web/Artifact proxy`
  - `/api/image -> api/image-gateway.ts -> canonical Gemini image handler`
  - `/api/ingest -> api/ingest-gateway.ts -> canonical Office ingest handler`
  - XiaoZhi current path: direct Render WSS + browser fallback; legacy Vercel bridge retired.

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Last verified live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore source through PHASE 43 is NOT production-verified and production still uses older routing/voice behavior.
- Without `VERCEL_TOKEN`, no capture/candidate deployment/promotion/rollback workflow can run.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. Last explicit Google Search Grounding probe observed HTTP 429. Configuration is not reported as verified Grounding health.
- Gemini primary/economy: `gemini-3.8-flash` / `gemini-3.5-flash-lite`.
- Gemini Image remains available behind same-origin gateway in current source.
- Public research fallback: AVAILABLE; current source preserves v31 behind secure gateway.
- Local Safe Engine: AVAILABLE fallback.
- XiaoZhi: CONFIGURED; direct Render v2.3 + browser fallback. Passive health returns `NOT PROBED`; legacy Vercel tokenized bridge is retired.
- Drive runtime: NOT CONFIGURED.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS / LIMITATIONS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini Grounding 429 keeps provider health DEGRADED rather than HEALTHY; do not auto-probe it.
- Drive and Workspace E2E remain credential-dependent.
- Same-origin Fetch Metadata/Referer guards are defense-in-depth, not account authentication or rate limiting. A broad multi-user/public deployment needs real authenticated + rate-limited user boundaries.
- `api/selftest.ts` intentionally creates real DOCX/XLSX/PPTX artifacts for release smoke and is still externally callable GET; harden only if release smoke remains real and deterministic.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` remain warning-only measured signals; do not refactor merely to silence them.
- Historical loader errors belong to old production; re-evaluate after current source reaches production.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. Primary production blocker.
- Drive E2E requires readonly Drive credentials or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before it can be marked verified healthy.

## NEXT_ACTION
1. Configure `VERCEL_TOKEN`; highest-value external unblock.
2. Once token exists, run canonical release: capture current production -> pinned Vercel CLI -> pull/build -> candidate without traffic -> candidate smoke -> promote -> production smoke -> rollback captured deployment if post-smoke fails.
3. Until deploy is unblocked, continue only with current-code/test-backed or fresh-runtime issues.
4. Next source candidate: harden real artifact `/api/selftest` against casual/crawler invocation while preserving genuine candidate/production smoke.
5. After current source reaches production, verify passive health, explicit XiaoZhi probe, same-origin runtime gateways, retired legacy voice route and research v31.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- Existing automation/orchestration/approval/procedural-memory contracts.
- Stable research v31 chain behind its gateway.
- Chief timeout/honest fallback semantics.
- Explicit internal/Drive opt-in and `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- Canonical image and Office ingest engines behind their gateways.
- XiaoZhi direct Render v2.3, browser fallback, barge-in, continuous session and shared text/voice semantics.
- `api/ws-xiaozhi.ts` must remain retired/fail-closed unless an intentional, authenticated architecture replaces it.
- Runtime Credentials health-only by default; expensive probes require explicit action.
- `probe=all` remains passive/zero-provider-call; `/api/health` remains passive for XiaoZhi.
- Production Drive/research/proxy/image/ingest routes remain behind same-origin gateways.
- Honest telemetry only; no fake progress/quota/latency/provider health.
- Deployment remains fail-closed; candidate receives no production traffic before smoke passes; failed post-promotion smoke rolls back exact captured deployment and remains failed.
- Production shell/assets/Drive Bridge remain pinned to validated source SHA; no raw `main`.
- Vercel CLI remains pinned to `59.11.7` until intentional upgrade is revalidated.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 43 at feature baseline `21264e463004011812ec2df1d55cedeecd8010f1` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Last verified live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
