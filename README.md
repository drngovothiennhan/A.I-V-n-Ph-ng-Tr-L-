# A.I Văn phòng v1.9 — Autonomous Office Orchestrator

A.I Văn phòng is being refactored from a dashboard/task simulator into an execution-oriented office assistant: understand intent → resolve context → decide safe autonomy → execute → QA → standardize output → approval → learn only from approved work.

## v1.9 core
- Multi-intent router: question, administrative document, data, research, presentation, image, technical task and continuation.
- Safe decision policy: reversible internal work executes automatically; external/irreversible actions stop at an approval gate.
- Real workflow state: progress advances from execution events, not timer simulation.
- Administrative document type recognition: Kế hoạch, Báo cáo, Công văn, Tờ trình, Thông báo, Quyết định, Biên bản, Giấy mời.
- QA gate for completion, fabrication risk, structure, artifact request and irreversible actions.
- Approved-only procedural memory: user-approved workflows can be reused; rejected work is not promoted as best practice.
- Continuous voice layer preserved through XiaoZhi/browser fallback.
- Approved dashboard design preserved.

## Canonical knowledge
Google Drive remains the canonical knowledge layout:
`00_INBOX / 01_KNOWLEDGE / 02_APPROVED / 03_TEMPLATES / 04_SKILLS / 05_TRAINING / 06_OUTPUTS / 07_ARCHIVE`.
Only Approved content is production ground truth. Empty Approved/Templates folders must never be represented as if organization-specific standards already exist.

## Provider truth
Gemini requires `GEMINI_API_KEY`. XiaoZhi external realtime requires a private/self-hosted `XIAOZHI_WS_URL` and should normally use authentication. Google Workspace automation is not considered connected unless its runtime integration is actually enabled and tested. The UI must report fallback/connected states truthfully.

## Key files
- `src/automation-core-v19.js` — intent, policy, plan, execution, QA, approval and procedural memory.
- `src/bootstrap-v18.js` — current production bootstrap; now activates the v1.9 orchestrator while preserving the existing dashboard shell.
- `docs/MASTER_PROMPT_V19_AUTONOMOUS_OFFICE.md` — production refactor specification and acceptance tests.
- `api/health.ts` — capability truth contract for the next backend deployment.

## Current deployment note
The existing Vercel app serves frontend assets from the canonical GitHub repository, so the v1.9 orchestration asset can become active without changing the approved dashboard. Serverless backend changes still require a Vercel backend deployment. Never claim Gemini, XiaoZhi external upstream, Google Workspace actions or improved server-side artifact generation are live until their provider/deployment checks pass.
