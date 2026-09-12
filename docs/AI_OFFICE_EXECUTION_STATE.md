# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12

## CURRENT_PHASE
PHASE 21–42 COMPLETE — PROVIDER ROUTING / DEPLOY TRUTH / EXACT SOURCE STAMPING / IMMUTABLE RELEASE / QUOTA-SAFE DIAGNOSTICS / CANDIDATE PROMOTION / POST-PROMOTION ROLLBACK / CANONICAL QUALITY GATE / PINNED VERCEL CLI / HONEST PROVIDER HEALTH / PASSIVE XIAOZHI HEALTH / SAME-ORIGIN DIAGNOSTICS / DRIVE + RESEARCH + PROXY + IMAGE + INGEST GATEWAYS

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
- PHASE 20 stable research corrected to `api/research.ts -> research-v31.js`.
- PHASE 21 Gemini routing corrected: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- PHASE 22 provider smoke contract added.
- PHASE 23 XiaoZhi transient event verified without speculative patching; browser fallback retained.
- PHASE 24 XiaoZhi telemetry aligned to voice render v2.3.
- PHASE 25 Vercel deploy path verified to correct project/domain; native Git auto-deploy is not assumed.
- PHASE 26 exact source-commit stamping added.
- PHASE 27 production shell/assets pinned to validated release SHA; no raw GitHub `main` runtime loading.
- PHASE 28 coherent production smoke verifies backend source SHA, UI ref, asset ref, provider/artifact/safety contracts.
- PHASE 29 Drive Bridge pinned through SHA-based `/api/asset` gateway.
- PHASE 30 candidate promotion gate: candidate without traffic -> smoke -> promote -> production smoke.
- PHASE 31 quota-safe diagnostics: Runtime Credentials is health-only by default; Grounding/Drive Canary require explicit user action.
- PHASE 32 post-promotion rollback recovery targets exact production deployment captured before release and keeps failed release red after recovery.
- PHASE 33 provider quota regression moved into canonical `source-policy`; duplicate workflow removed.
- PHASE 34 candidate and production smoke require Gemini configured plus expected primary/economy models without Grounding probe.
- PHASE 35 Vercel CLI pinned to `59.11.7`.
- PHASE 36 Grounding health is honest/configured-unverified until explicit verification.
- PHASE 37 aggregate provider diagnostics are passive/zero-provider-call.
- PHASE 38 default `/api/health` no longer contacts XiaoZhi/Render; live voice is explicit via `?probe=voice`.
- PHASE 39 explicit Gemini/Grounding diagnostics require same-origin browser request metadata before paid provider invocation.
- PHASE 40 `/api/drive-brain` routes through same-origin POST+JSON gateway before readonly Drive provider access.
- PHASE 41 `/api/research` and `/api/proxy` route through same-origin POST+JSON gateways while preserving `research.ts -> research-v31.js` and Chief/Web/Artifact semantics.
- PHASE 42 `/api/image` and `/api/ingest` now route through `api/image-gateway.ts` and `api/ingest-gateway.ts`. Both require POST + JSON + same-origin Host/Referer and Fetch Metadata before delegating to Gemini Image or Office ingest. Rejected calls return `AI_RESOURCE_SAME_ORIGIN_REQUIRED` and `providerCallMade:false`. Artifact regression still validates real DOCX/XLSX/PPTX round-trip and now also locks the image/ingest gateway contract.

## VERIFIED CI
- PHASE 40 main #215 (`34667384170`): full source-policy PASS including Drive gateway; deploy BLOCKED at missing credential.
- PHASE 41 targeted branch QA (`34667642877`): PASS research/proxy gateway syntax, stable v31 route, Chief timeout/fallback and dependency audit.
- PHASE 41 main #217 (`34667678759`): full canonical source-policy PASS; deploy BLOCKED exactly at credential gate.
- PHASE 42 targeted branch QA (`34667861962`): PASS image/ingest gateway syntax, artifact round-trip + resource boundary regression and dependency audit.
- PHASE 42 main #219 (`34667900241`): full canonical source-policy PASS including research/proxy/Drive/XiaoZhi and Office artifact round-trip + image/ingest gateways. `deploy-production` FAIL/BLOCKED exactly at `Require deployment credential`; all actual release steps skipped.
- `npm audit --omit=dev --audit-level=high`: PASS in all current verified suites.

## SOURCE_STATE
- Current feature baseline through PHASE 42 before this checkpoint documentation commit: `ff2261a23596833f3d82d1ee8a8189d8043f08d8`.
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
  - `api/drive-brain-gateway.ts`
  - `api/research-gateway.ts`
  - `api/proxy-gateway.ts`
  - `api/image-gateway.ts`
  - `api/ingest-gateway.ts`
  - `api/research.ts` / `api/research-v31.js`
  - `api/proxy.ts`
  - `api/image.ts`
  - `api/ingest.ts`
  - `api/health.ts`
  - `api/provider-check.ts`
  - `vercel.json`
  - `.github/workflows/quality-v20.yml`
  - canonical regression tests under `tests/`.

## PRODUCTION_STATUS
- Vercel project: `ai-van-phong-tro-ly` (`prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`).
- Team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Production domain: `https://ai-van-phong-tro-ly.vercel.app`.
- Current serving production deployment previously resolved as `dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca`.
- Last fresh live verification still reported `x-ai-office-source-commit: 825dbf8073284eadc38800245f42d4f70f647c98`.
- Therefore source through PHASE 42 is NOT production-verified; live production still uses older routing until a verified deploy occurs.
- Without `VERCEL_TOKEN`, no capture/candidate deployment/promotion/rollback workflow can run.

## AI_PROVIDER_STATUS
- Gemini: CONFIGURED / DEGRADED. Last explicit Google Search Grounding probe observed HTTP 429. Current source does not equate configuration with verified Grounding health.
- Gemini model contract: primary `gemini-3.8-flash`; economy `gemini-3.5-flash-lite`.
- Gemini Image stays available in source but production `/api/image` is now same-origin guarded before provider invocation.
- Runtime Credentials does not spend Grounding quota on auto-open/ordinary refresh.
- Aggregate provider diagnostics are passive and zero-provider-call.
- Public research fallback: CONFIGURED / AVAILABLE; current source routes it through same-origin gateway while preserving v31.
- Local Safe Engine: CONFIGURED fallback.
- XiaoZhi: CONFIGURED; passive health returns `NOT PROBED`, browser fallback remains mandatory.
- Drive runtime: NOT CONFIGURED; current source protects Drive route before readonly provider logic.
- Google Workspace actions: NOT CONFIGURED.
- Durable Drive semantic index/delta sync: NOT implemented/proven.

## OPEN_ERRORS / LIMITATIONS
- Production remains stale at source `825dbf...` until a real verified deploy occurs.
- Gemini Grounding 429 keeps provider health DEGRADED rather than HEALTHY; do not auto-probe it.
- Drive and Google Workspace E2E remain credential-dependent.
- Live production lacks PHASE 38–42 hardening because current source is not deployed yet.
- Same-origin Fetch Metadata/Referer validation is defense-in-depth against CSRF/cross-site/unintended browser invocation; it is not account authentication or rate limiting. A broadly public/multi-user product still needs authenticated + rate-limited user boundaries.
- `url.parse()` DEP0169 and `stripTypeScriptTypes` remain warning-only measured signals; do not refactor merely to silence them.
- Historical loader errors belong to old production; re-evaluate after current source reaches production.
- Rollback recovery remains source/test verified only because deploy credentials are absent.

## BLOCKERS
- `VERCEL_TOKEN` absent from GitHub Actions secrets. Primary production blocker.
- Drive E2E requires readonly Drive credentials or Apps Script Bridge credentials.
- Google Workspace actions require runtime authorization/configuration.
- Gemini Grounding must recover from 429 before it can be marked verified healthy.

## NEXT_ACTION
1. Configure `VERCEL_TOKEN`; highest-value external unblock.
2. Once token exists, run canonical release: capture current production -> pinned Vercel CLI -> pull/build -> candidate without traffic -> candidate smoke -> promote -> production smoke -> rollback captured deployment if post-smoke fails.
3. Until deploy is unblocked, continue only with current-code/test-backed or fresh-runtime issues.
4. Audit only remaining externally callable action/resource endpoints before further feature work; do not broaden gateway work without code-backed evidence.
5. After current source reaches production, verify passive health, explicit XiaoZhi probe, provider diagnostics, Drive/research/proxy/image/ingest gateways and research v31.
6. If application access becomes public/multi-user, add real authenticated + rate-limited boundaries rather than treating Fetch Metadata as authorization.

## DO_NOT_BREAK
- Approved Dashboard v1.5 shell/responsive behavior.
- Existing automation/orchestration/approval/procedural-memory contracts.
- `research-v31.js`; `/api/research` gateway must still delegate to `api/research.ts -> research-v31.js`.
- `api/proxy.ts` Chief timeout/honest fallback semantics.
- Explicit internal/Drive opt-in and approved-only `02_APPROVED` ground truth.
- Real DOCX/XLSX/PPTX/PNG artifact generation.
- Canonical image and Office ingest engines behind their gateways.
- XiaoZhi v2.3, browser fallback, barge-in, continuous session and shared text/voice semantics.
- Runtime Credentials health-only by default; expensive probes require explicit action.
- Grounding configuration must not be reported as verification.
- `probe=all` on provider-check must remain passive/zero-provider-call.
- Default `/api/health` remains passive with respect to XiaoZhi.
- Production Drive/research/proxy/image/ingest routes remain behind same-origin gateways before runtime/provider/resource work.
- Operations Center honest telemetry.
- Deployment remains fail-closed; candidate never receives production traffic before smoke passes.
- Failed post-promotion smoke rolls back exact captured deployment and stays failed.
- Production shell/assets/Drive Bridge remain pinned to validated source SHA; no raw `main`.
- Vercel CLI remains pinned to `59.11.7` until intentional upgrade is revalidated.

## DEPLOYMENT_STATUS
SOURCE READY / SOURCE QA PASS through PHASE 42 at feature baseline `ff2261a23596833f3d82d1ee8a8189d8043f08d8` before this checkpoint commit.
PRODUCTION BLOCKED / NOT UPDATED / NOT VERIFIED because `VERCEL_TOKEN` is missing. Last verified live source remains `825dbf8073284eadc38800245f42d4f70f647c98`.
