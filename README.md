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
- Approved dashboard v1.5 design preserved.

## Office Engine
Production now has both browser-side and server-side Office Engine paths:
- Read DOCX/XLSX/PPTX in the browser and ingest them as Draft knowledge.
- `/api/ingest` is live for server-side DOCX/XLSX/PPTX ingestion.
- Create structured DOCX with A4/Times New Roman/admin formatting profile.
- Create structured XLSX with table data, widths and autofilter.
- Create multi-slide 16:9 PPTX rather than putting the whole result on one slide.
- Run approved-only local data comparison; if two approved data tables are not available, the task is held at `awaiting_input` and no fabricated result is produced.
- `/api/proxy?op=artifact` loads the server-side structured artifact engine; server self-test passes DOCX/XLSX/PPTX generation.

Server-side source is maintained in `api/_artifact-engine.ts`, `api/proxy.ts`, and `api/ingest.ts`.

## Canonical knowledge
Google Drive remains the canonical knowledge layout:
`00_INBOX / 01_KNOWLEDGE / 02_APPROVED / 03_TEMPLATES / 04_SKILLS / 05_TRAINING / 06_OUTPUTS / 07_ARCHIVE`.
Only Approved content is production ground truth.

`03_TEMPLATES/SYSTEM_BASELINE_DRAFT` contains a fallback template registry. It is intentionally Draft and must not be represented as an organization-specific approved template. `02_APPROVED` remains under user authority.

## Provider truth
Gemini requires `GEMINI_API_KEY`. XiaoZhi external realtime requires a private/self-hosted `XIAOZHI_WS_URL` and should normally use authentication. Google Workspace automation is not considered connected unless its runtime integration is actually enabled and tested. The UI must report fallback/connected states truthfully.

Current production provider check on 2026-09-10: Local Safe Engine is active; Gemini is not configured; XiaoZhi external upstream is not configured; Google Workspace runtime actions are not configured. Browser/local fallbacks remain available.

## Key files
- `src/automation-core-v19.js` — intent, continuation context, policy, plan, execution, QA, approval and procedural memory.
- `src/client-artifacts-v19.js` — browser-side structured DOCX/XLSX/PPTX generation.
- `src/client-office-files-v19.js` — browser-side DOCX/XLSX/PPTX parsing with server fallback.
- `src/data-ops-v19.js` — approved-only local table comparison.
- `src/bootstrap-v18.js` — production bootstrap; activates the v1.9 Office Engine while preserving the approved dashboard shell.
- `src/release-v193.js` — release-label synchronization layer.
- `docs/MASTER_PROMPT_V19_AUTONOMOUS_OFFICE.md` — production refactor specification and acceptance tests.
- `api/_artifact-engine.ts`, `api/proxy.ts`, `api/ingest.ts` — live server-side Office Engine.
- `api/health.ts` — v1.9.3 server capability contract.

## Deployment truth
Production deployment `dpl_GWyGJFmeCMY3skHXGAnSVNLsnU6g` is live on `https://ai-van-phong-tro-ly.vercel.app`.

Verified on 2026-09-10:
- `/api/health` → HTTP 200, release `1.9.3-autonomous-office-orchestrator`.
- `/api/selftest` → HTTP 200, DOCX/XLSX/PPTX all pass.
- `/api/ingest` → route is live; GET correctly returns HTTP 405 because ingestion is POST-only.
- `/api/proxy?op=artifact` → route and artifact-engine module load; GET correctly returns HTTP 405 because artifact generation is POST-only.
- `/api/provider-check?probe=config` → HTTP 200 and reports provider configuration truthfully.
- `/` → HTTP 200 and serves the approved dashboard shell with v1.9.3 release labeling.

The Vercel project is still not Git-linked for automatic backend deployment, so future serverless source changes require an explicit Vercel deployment until CI/Git integration is added.

Never claim Gemini, XiaoZhi external upstream, or Google Workspace actions are connected until their provider checks pass end-to-end.
