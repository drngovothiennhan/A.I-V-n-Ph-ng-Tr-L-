# A.I Văn phòng v1.9.3 — Release Acceptance

Date: 2026-09-10

## Release objective
Transform the approved A.I Văn phòng dashboard from task-simulation behavior into a safe autonomous office workflow with intent routing, contextual continuation, real execution states, QA, structured Office artifacts, approved-only data operations and an irreversible-action approval gate.

## Acceptance matrix

| Test | Expected | v1.9.3 implementation |
|---|---|---|
| “Tại sao cần QA trước khi phát hành văn bản?” | Question, answer only | Intent router classifies question patterns; no task execution path required. |
| “Soạn Kế hoạch triển khai … và xuất Word” | admin / plan / docx → execute → QA → approval | Administrative type + artifact detection, structured DOCX client/server engine, QA and approval state. |
| “Đối chiếu hai file Excel và đánh dấu trường hợp trùng” | data / xlsx; no fabricated result without inputs | Local approved-data engine requires two Approved data tables; otherwise status becomes `awaiting_input`. |
| “Tiếp tục phần còn lại” | Continue the prior task | Continuation inherits prior task kind, document type, artifacts, priority, root instruction and irreversible flag. |
| “Gửi công văn này đi” | Prepare but do not perform external send without approval | `irreversible=true`, decision=`prepare_and_hold`, approval gate retained across continuation. |
| Providers are not configured | Truthful fallback | Runtime reads provider truth from `/api/health`; frontend shows Local Safe Engine / Workspace not connected / Voice fallback. |
| No organization-approved template exists | Do not claim organization-specific conformance | `SYSTEM_BASELINE_DRAFT` is explicitly Draft; Approved remains user-controlled. |

## Artifact QA
Browser Office Artifact Engine creates OOXML packages for DOCX, XLSX and PPTX without external CDN dependency. Development QA validated ZIP integrity, XML parseability and successful LibreOffice opening/conversion for generated DOCX/XLSX/PPTX samples before release integration.

Production server self-test on 2026-09-10 also passed DOCX, XLSX and PPTX generation through installed server dependencies.

## Production verification
Production deployment: `dpl_GWyGJFmeCMY3skHXGAnSVNLsnU6g`
Production URL: `https://ai-van-phong-tro-ly.vercel.app`

Verified after deployment:
- `/api/health` → HTTP 200 and release `1.9.3-autonomous-office-orchestrator`.
- `/api/selftest` → HTTP 200, `pass=true`, DOCX/XLSX/PPTX all pass.
- `/api/ingest` → live route; GET returns HTTP 405 as designed because the parser is POST-only.
- `/api/proxy?op=artifact` → route and `_artifact-engine` import load; GET returns HTTP 405 as designed because artifact generation is POST-only.
- `/api/provider-check?probe=config` → HTTP 200 and release `1.9.3-autonomous-office-orchestrator`.
- `/` → HTTP 200 and serves the approved dashboard shell with v1.9.3 release labeling.
- `/src/release-v193.js?v=193` → HTTP 200 through the canonical GitHub asset gateway.
- Production build contains 8 Node.js functions and completed READY without the earlier TypeScript import error.

Runtime error review showed no production crash/5xx cluster from the new release. A Node `DEP0169` deprecation warning is emitted by a dependency path; it is non-blocking and should be removed during dependency maintenance.

## Production-live components
Frontend:
- `src/automation-core-v19.js`
- `src/client-artifacts-v19.js`
- `src/client-office-files-v19.js`
- `src/data-ops-v19.js`
- `src/bootstrap-v18.js`
- `src/release-v193.js`

Serverless:
- `api/_artifact-engine.ts` through `api/proxy.ts`
- `api/ingest.ts`
- `api/health.ts`
- `api/provider-check.ts`
- `api/selftest.ts`
- `api/app.ts`
- `api/asset.ts`

## Provider blockers
Production provider truth after release:
- Gemini: not configured (`GEMINI_API_KEY` absent in current runtime).
- XiaoZhi external upstream: not configured (`XIAOZHI_WS_URL` absent in current runtime).
- Google Workspace runtime integration inside the custom app: not configured.

Browser/local fallbacks remain active. Provider blockers do not authorize fake connected states.

## Knowledge governance
Canonical Drive remains:
`00_INBOX / 01_KNOWLEDGE / 02_APPROVED / 03_TEMPLATES / 04_SKILLS / 05_TRAINING / 06_OUTPUTS / 07_ARCHIVE`.

`03_TEMPLATES/SYSTEM_BASELINE_DRAFT/00_TEMPLATE_REGISTRY - SYSTEM BASELINE DRAFT` remains a non-approved fallback registry. It must not be promoted to `02_APPROVED` without explicit user approval.

## Remaining infrastructure debt
The Vercel project is not Git-linked for automatic backend deployments. Frontend assets continue to read canonical GitHub `main` through the deployed asset gateway, but future serverless changes require an explicit deployment until CI/Git integration is established.

The source XiaoZhi WebSocket bridge is not represented as externally live because the upstream is not configured and persistent WebSocket behavior must be validated on the chosen runtime before activation.

## Release decision
Frontend autonomous-office capability: **ACCEPTED**.
Serverless v1.9.3 Office Engine and ingestion: **ACCEPTED / PRODUCTION LIVE**.
Deployment-linkage blocker that previously held v1.9.3 serverless: **CLOSED**.
External Gemini / Workspace / XiaoZhi providers: **BLOCKED BY RUNTIME CONFIGURATION**, with truthful local/browser fallback active.

No provider capability may be displayed or reported as connected/live until an end-to-end provider check passes.
