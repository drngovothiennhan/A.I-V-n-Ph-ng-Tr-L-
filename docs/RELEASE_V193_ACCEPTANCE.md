# A.I Văn phòng v1.9.3 — Release Acceptance

Date: 2026-09-10

## Release objective
Transform the approved A.I Văn phòng dashboard from task-simulation behavior into a safe autonomous office workflow with intent routing, contextual continuation, real execution states, QA, structured Office artifacts, approved-only data operations and an irreversible-action approval gate.

## Acceptance matrix

| Test | Expected | v1.9.3 implementation |
|---|---|---|
| “Tại sao cần QA trước khi phát hành văn bản?” | Question, answer only | Intent router classifies question patterns; no task execution path required. |
| “Soạn Kế hoạch triển khai … và xuất Word” | admin / plan / docx → execute → QA → approval | Administrative type + artifact detection, structured DOCX client engine, QA and approval state. |
| “Đối chiếu hai file Excel và đánh dấu trường hợp trùng” | data / xlsx; no fabricated result without inputs | Local approved-data engine requires two Approved data tables; otherwise status becomes `awaiting_input`. |
| “Tiếp tục phần còn lại” | Continue the prior task | Continuation now inherits prior task kind, document type, artifacts, priority, root instruction and irreversible flag. |
| “Gửi công văn này đi” | Prepare but do not perform external send without approval | `irreversible=true`, decision=`prepare_and_hold`, approval gate retained across continuation. |
| Providers are not configured | Truthful fallback | Runtime reads provider truth from `/api/health`; frontend shows Local Safe Engine / Workspace not connected / Voice fallback. |
| No organization-approved template exists | Do not claim organization-specific conformance | `SYSTEM_BASELINE_DRAFT` is explicitly Draft; Approved remains user-controlled. |

## Artifact QA
Browser Office Artifact Engine creates OOXML packages for DOCX, XLSX and PPTX without external CDN dependency. Development QA validated ZIP integrity, XML parseability and successful LibreOffice opening/conversion for generated DOCX/XLSX/PPTX samples before release integration.

## Production-live components
The deployed Vercel asset gateway dynamically reads canonical GitHub `main`, so these frontend modules are production-live when fetched by the dashboard:
- `src/automation-core-v19.js`
- `src/client-artifacts-v19.js`
- `src/client-office-files-v19.js`
- `src/data-ops-v19.js`
- `src/bootstrap-v18.js`

## Source-ready but not serverless-live
The following source is committed but requires a new Vercel serverless deployment:
- `api/_artifact-engine.ts`
- updated `api/proxy.ts`
- `api/ingest.ts`
- updated `api/health.ts`

Production verification on 2026-09-10 showed `/api/health` still reports release `1.8.1-provider-setup` and `/api/ingest` returns HTTP 404. Therefore server-side v1.9.3 capabilities must not be represented as live yet.

## Provider blockers
Production provider truth at release check:
- Gemini: not configured (`GEMINI_API_KEY` absent in current runtime).
- XiaoZhi external upstream: not configured (`XIAOZHI_WS_URL` absent in current runtime).
- Google Workspace runtime integration inside the custom app: not configured.

Browser/local fallbacks remain active. Provider blockers do not authorize fake connected states.

## Knowledge governance
Canonical Drive remains:
`00_INBOX / 01_KNOWLEDGE / 02_APPROVED / 03_TEMPLATES / 04_SKILLS / 05_TRAINING / 06_OUTPUTS / 07_ARCHIVE`.

`03_TEMPLATES/SYSTEM_BASELINE_DRAFT/00_TEMPLATE_REGISTRY - SYSTEM BASELINE DRAFT` was created as a non-approved fallback registry. It must not be promoted to `02_APPROVED` without explicit user approval.

## Release decision
Frontend autonomous-office capability: ACCEPTED for v1.9.3 scope.
Serverless v1.9.3 deployment: BLOCKED by deployment linkage/tooling, not by source completeness.
External AI/Workspace/XiaoZhi providers: BLOCKED by runtime configuration/secrets.

No blocked capability may be displayed or reported as connected/live until an end-to-end check passes.
