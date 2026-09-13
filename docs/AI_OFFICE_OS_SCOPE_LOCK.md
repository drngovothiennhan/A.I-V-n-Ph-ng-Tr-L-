# A.I Văn phòng Trợ lý — Personal A.I Office OS

## P0 — Project Scope Lock

Status: **LOCKED**

This document is an execution contract for the production project. Changes outside this scope must be placed in backlog and must not be implemented implicitly.

## Product goal

Build one personal A.I Office OS for Android and desktop web that receives natural-language requests, understands context, selects the required tools, executes work, verifies results, and returns the final answer or artifact.

The product is **one office intelligence with many tools**, not a collection of separate A.I dashboards.

## Explicitly in scope

- Chief A.I / single orchestration entry point.
- Google Workspace connectors where officially supported.
- Gmail and approved email connectors.
- Google Drive knowledge and user-approved files.
- Calendar and work/study context.
- Work/school email through official or authorized connectors.
- OpenAI/ChatGPT-compatible capabilities where appropriate.
- Web research and domain research tools through approved interfaces.
- Document/data/presentation/image artifact workflows.
- Notifications, schedules and event-driven automation.
- Modular connector/tool registry.
- Permission levels: READ, PREPARE, EXECUTE_WITH_APPROVAL, TRUSTED_AUTOMATION.
- Auditability, verification, rollback and failure isolation.

## Explicitly out of scope

The following are removed from the project and must not appear in roadmap, UI, connector registry, automation rules, implementation prompts, or future speculative code:

- Facebook integration.
- Facebook monitoring/scraping.
- Zalo integration.
- Zalo monitoring/scraping.
- Generic social-network scraping or browser impersonation.

A future social connector may only be considered after a new explicit user requirement and a new scope review. It is not part of this project now.

## UI architecture lock

The user-facing product must converge to five surfaces only:

1. **Home** — priority summary and what needs attention.
2. **Work** — unified job stream from request to result.
3. **A.I** — one conversation/command surface.
4. **Knowledge** — user-approved internal and external knowledge sources.
5. **Account** — connections, permissions and settings.

Do not create separate user-facing pages for individual agents, runtimes, telemetry, probes, model internals or connector diagnostics. Developer diagnostics stay hidden from normal users.

## A.I architecture lock

One Chief A.I receives every request and follows:

`INTENT -> CONTEXT -> PLAN -> TOOL -> EXECUTE -> VERIFY -> RESULT`

Specialized agents are workers behind the Chief A.I. They do not become new product surfaces unless there is an explicit product requirement.

## Connector architecture lock

Every external service uses a connector adapter. Provider-specific behavior must not leak into the core orchestrator.

Priority order:

`OFFICIAL API -> WEBHOOK/EVENT -> MCP/APP CONNECTOR -> USER-AUTHORIZED INTEGRATION`

If an official/authorized method is not available, the feature is marked unsupported rather than implemented through unsafe scraping or credential automation.

## Development constraints

- Do not add features to increase chat volume or code volume.
- Do not ask the user technical questions that can be resolved from code, current architecture, or existing requirements.
- Do not rebuild stable backend contracts without a demonstrated need.
- Components explicitly marked REBUILD must be written as new isolated modules, not patched indefinitely.
- One requirement must map to one verifiable implementation outcome.
- No speculative frameworks or future modules without an approved requirement.
- Every phase ends with implementation, tests, production verification and an exact checkpoint.

## Critical path

`P0 Scope Lock -> P1 New Office Shell -> P2 Connector Hub -> P3 Chief AI Brain -> P4 Universal Inbox -> P5 Proactive Office -> P6 Knowledge OS -> P7 Agent Actions -> P8 Module SDK -> P9 Production Hardening`

Do not implement Facebook or Zalo at any phase.
