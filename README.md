# A.I Văn phòng v1.9.3 — Autonomous Office Orchestrator

A.I Văn phòng has been refactored from a dashboard/task simulator into an execution-oriented office assistant: understand intent → resolve context → decide safe autonomy → execute → QA → standardize output → approval → learn only from approved work.

## v1.9.3 core
- Multi-intent router: question, administrative document, data, research, presentation, image, technical task and continuation.
- Continuation memory: “tiếp tục/làm tiếp/sửa tiếp…” inherits the prior task kind, document type, output format, priority, root instruction and irreversible-action safety state.
- Safe decision policy: reversible internal work executes automatically; external/irreversible actions stop at an approval gate.
- Real workflow state: progress advances from execution events, not timer simulation.
- Administrative document type recognition: Kế hoạch, Báo cáo, Công văn, Tờ trình, Thông báo, Quyết định, Biên bản, Giấy mời.
- QA gate for completion, fabrication risk, structure, artifact request and irreversible actions.
- Approved-only procedural memory: user-approved workflows can be reused; rejected work is not promoted as best practice.
- Continuous voice layer preserved through XiaoZhi/browser fallback.
- Approved dashboard design preserved.

## Office Engine
The production frontend now includes a browser-side Office Engine so essential artifact work does not depend on a server redeploy:
- Read DOCX/XLSX/PPTX in the browser and ingest them as Draft knowledge.
- Create structured DOCX with A4/Times New Roman/admin formatting profile.
- Create structured XLSX with table data, frozen header, widths and autofilter.
- Create multi-slide 16:9 PPTX rather than putting the whole result on one slide.
- Run approved-only local data comparison; if two approved data tables are not available, the task is held at `awaiting_input` and no fabricated result is produced.

Backend source for the same structured artifact engine and Office ingestion endpoint is also committed in `api/_artifact-engine.ts`, `api/proxy.ts`, and `api/ingest.ts`. It becomes server-side production only after the Vercel serverless project is redeployed.

## Canonical knowledge
Google Drive remains the canonical knowledge layout:
`00_INBOX / 01_KNOWLEDGE / 02_APPROVED / 03_TEMPLATES / 04_SKILLS / 05_TRAINING / 06_OUTPUTS / 07_ARCHIVE`.
Only Approved content is production ground truth.

`03_TEMPLATES/SYSTEM_BASELINE_DRAFT` contains a fallback template registry. It is intentionally Draft and must not be represented as an organization-specific approved template. `02_APPROVED` remains under user authority.

## Provider truth
Gemini requires `GEMINI_API_KEY`. XiaoZhi external realtime requires a private/self-hosted `XIAOZHI_WS_URL` and should normally use authentication. Google Workspace automation is not considered connected unless its runtime integration is actually enabled and tested. The UI must report fallback/connected states truthfully.

## Key files
- `src/automation-core-v19.js` — intent, continuation context, policy, plan, execution, QA, approval and procedural memory.
- `src/client-artifacts-v19.js` — browser-side structured DOCX/XLSX/PPTX generation.
- `src/client-office-files-v19.js` — browser-side DOCX/XLSX/PPTX parsing with server fallback.
- `src/data-ops-v19.js` — approved-only local table comparison.
- `src/bootstrap-v18.js` — production bootstrap; activates the v1.9 Office Engine while preserving the approved dashboard shell.
- `docs/MASTER_PROMPT_V19_AUTONOMOUS_OFFICE.md` — production refactor specification and acceptance tests.
- `api/_artifact-engine.ts`, `api/proxy.ts`, `api/ingest.ts` — source-ready server-side Office Engine.
- `api/health.ts` — v1.9.3 server capability contract for the next backend deployment.

## Deployment truth
The current Vercel app serves frontend assets from the canonical GitHub repository through its deployed asset gateway, so the v1.9.3 orchestration core and browser Office Engine can become live without changing the approved dashboard. Serverless backend source changes still require a Vercel backend deployment because the current Vercel project is not Git-linked.

Never claim Gemini, XiaoZhi external upstream, Google Workspace actions, `/api/ingest`, or the new server-side artifact engine are live until their provider/deployment checks pass.
