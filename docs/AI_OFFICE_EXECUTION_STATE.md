# A.I. VĂN PHÒNG TRỢ LÝ — EXECUTION STATE

Updated: 2026-09-12 — Phase 56 live, release verification repair verified in CI.

## CURRENT_PHASE
Phase 56 PRODUCTION VERIFIED for health and Office artifacts. Do not roll back or rebuild Phase 56 because historical release run 34676910385 failed.

## SOURCE_STATE
- main / live application source: `1c0d13708339e705ae2f10e5e363f8f51d01b0a3`.
- Serving deployment: `dpl_65VBcfTe61MCEekGEZ9bEXaon1P5`.
- Canonical URL: https://ai-van-phong-tro-ly.vercel.app
- Project: `prj_SJqoqJ8FvH7CRJzbRRTGWQvIAtSc`; team: `team_zMTBj85c4Dh5QoDNIjWqQRTg`.
- Release CI and checkpoint changes live on `ai-office-phase56-promote`; they do not change the deployed application SHA. main is intentionally retained pending CI verification and a controlled docs/CI integration.

## FRESH_RUNTIME_EVIDENCE
- 2026-09-12T06:18:28Z: production HTTP 200, status ok, exact source header matches Phase 56.
- GitHub main independently matches the same SHA; Vercel project independently identifies the same serving deployment.
- 2026-09-12T06:19:39Z: POST selftest with exact header returns pass true, exact source, DOCX 4884 bytes, XLSX 6941 bytes, PPTX 12890 bytes.
- 2026-09-12T06:20:29Z: identical marker with a phase56_smoke query also passes. A query-string header-loss hypothesis is not reproduced.
- Release verifier executed locally against public production: PASS at attempt 1, checking response SHA/header and every Office format.
- 2026-09-12T06:19:40Z: explicit `GET /api/health?probe=voice` reports gateway ready, release xiaozhi-render-gateway-1.2.0, trusted-origin.
- Direct Render health at 2026-09-12T06:20:56Z reports `upstreamConfigured:false`, `upstreamMode:browser-fallback-transport`. Gateway reachability is NOT speech recognition / spoken-answer end-to-end success.

## RELEASE_GATE_FINDINGS
- Candidate run 34676809123 succeeded (historical evidence).
- Release run 34676910385 actually sent the correct x-ai-office-selftest-source header, according to job 103508273115 logs. A claim that CI omitted the header is unsupported.
- Historical 403 SELFTEST_RELEASE_MARKER_REQUIRED cannot distinguish absent expected env, absent request header, or mismatched SHA: the original handler intentionally returns the same body for all three. The old run lacks per-handler source/header diagnostics.
- Current exact requests pass with and without query. Per-function post-promotion propagation is a hypothesis, not an established root cause.
- Verified defect in workflow: it treats one health result as all-route convergence, performs one selftest attempt, then invokes rollback for any verification failure.
- Repaired release verifier waits a bounded six attempts ONLY for work-free marker rejection, checking health exact-source each time. Persistent rejection, invalid result, wrong SHA, missing format or other error still FAIL. Handler/security gates are unchanged.
- Phase 56 release workflow now verifies the already-live deployment ID/source, static UI/assets, Office engine, real Gemini and all gateways. It contains no deploy/promote/rollback call. A failed verification cannot move traffic.

## RECOVERY_POLICY
- Vercel team plan confirmed as Hobby. Official CLI docs: https://vercel.com/docs/cli/rollback — Hobby rollback target must be the immediately previous production deployment.
- Old workflow hard-coded dpl_DfW8oQE4WTrsQTJxLVWtVmfi3sca and got 402; the old logs discarded the API error body. Plan/eligibility is consistent with the failure, but exact historical API reason is not recoverable from that log alone.
- Do not substitute promote for an ineligible historical rollback or attempt to bypass a plan restriction.
- Phase 56 verification requires no recovery action and now has none. For the next actual release, capture serving deployment ID + source immediately before promotion, use pinned Vercel CLI `vercel rollback <captured-immediate-previous-id> --token=...`, and independently verify public deployment ID, exact health source, and runtime smoke afterward. Never use a hard-coded older stable ID.
- Actual rollback execution is NOT tested on this healthy production system.

## PROVIDER_BOUNDARIES
- Gemini configured: true; model gemini-3.8-flash; economy gemini-3.5-flash-lite. General questions default to Gemini; internal source remains opt-in.
- Drive runtime configured: false; Workspace configured: false. Keep both feature-gated; no automatic local-upload fallback.
- Drive provider priority: Apps Script bridge then Service Account readonly. Ground truth 02_APPROVED; blocked 00_INBOX and 07_ARCHIVE.
- XiaoZhi gateway reachable; upstream not configured. Real microphone recognition and audible playback remain UNVERIFIED. Do not report voice end-to-end PASS.

## RELEASE_VERIFICATION_RESULT
- CI repair commit: `b4ce0d3f4fa57f285ae0da6e1890b4c3243c1684` on `ai-office-phase56-promote`.
- Run `34678095067`, attempt 2, job `103511693844`: SUCCESS. All steps passed: six verifier regressions; main/source lock; live deployment ID; public health/UI/assets; exact-source DOCX/XLSX/PPTX; real Gemini response 4; research/Drive/image/ingest gateways; explicit voice gateway probe.
- Attempt 1, job `103511483861`: selftest PASS, Gemini upstream 429 caused a truthful FAIL. One later retry succeeded. The 429 is recorded as transient provider degradation, not erased or claimed fixed by this CI change.
- Fresh browser UI test returned `2 + 2 bằng 4.` with internal checkbox OFF.
- Browser reached microphone permission dialog. Automatic approval review rejected granting microphone permission because exact access scope was not considered authorized. No microphone access was granted; end-to-end audio QA is BLOCKED pending explicit user permission. The dialog was dismissed and text QA completed.
- App deployment was neither rebuilt nor promoted nor rolled back. Phase 56 source is preserved.

## NEXT_ACTIONS
1. Obtain explicit permission for microphone access to ai-van-phong-tro-ly.vercel.app for this QA session, then test actual speech input and playback. Audio QA cannot be inferred from gateway health or text success.
2. XiaoZhi upstream is still missing; configure only with real upstream URL/credential. Browser voice is the existing fallback, not evidence of an upstream XiaoZhi brain.
3. Preserve application source and no-traffic policy. Do not rerun historical run 34676910385 (its immutable workflow still promotes/rolls back).
4. If historical marker rejection recurs, retain response diagnostics; a next candidate may add non-sensitive handler reason codes without loosening the exact-source gate.
5. Integrate these docs/CI-only branch changes into main only through a controlled path: the existing main quality workflow has a deploy job, so a routine merge is not a no-deploy operation.

---
## HISTORICAL_STATE_BEFORE_PHASE_56 (superseded; not current blockers)

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
