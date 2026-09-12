// Canonical production entrypoint retained for index.html compatibility.
// All policy layers are activated here in deterministic order so no versioned module is merely present in source but inactive at runtime.
const bootstrap = await import('./bootstrap-v18.js');
void bootstrap;

// Office V2 runs observe-only first: it records structural parity and never consumes input.
const officeV2Shadow = await import('./office-v2/shadow-interceptor.js?v=220');
officeV2Shadow.installOfficeV2ShadowInterceptor?.();

const sourceControl = await import('./internal-source-control-v27.js?v=270');
sourceControl.installInternalSourceControl?.();

await import('./knowledge-router-v20.js?v=270');

const multiSource = await import('./multisource-orchestrator-v26.js?v=270');
multiSource.installMultiSourceOrchestrator?.();

const researchSafety = await import('./research-safety-guard-v263.js?v=263');
researchSafety.installResearchSafetyGuard?.();

const weather = await import('./weather-bridge-v21.js?v=211');
await import('./interaction-runtime-v22.js?v=220');
await import('./interaction-control-v21.js?v=211');

// Office V2 task bridge is read/sync-only relative to the canonical legacy task runtime.
// It builds the persistent task lifecycle used by the upcoming Workspace without changing execution behavior.
const officeV2Tasks = await import('./office-v2/task-runtime-bridge.js?v=280');
officeV2Tasks.installOfficeV2TaskRuntimeBridge?.();

await import('./credential-setup-v22.js?v=230');
await import('./product-completion-v24.js?v=240');
await import('./voice-render-bridge-v23.js?v=230');
const voiceTurns = await import('./voice-turn-coordinator-v25.js?v=250');

weather.patchVoice?.();
window.AIOfficeV22?.attachAfterV21?.();
voiceTurns.installVoiceTurnCoordinator?.();
window.dispatchEvent(new CustomEvent('ai-office-v2-repatch-voice'));

window.AIOfficeRelease='1.9.3';
window.AIOfficeKnowledgeRouterVersion='2.7';
window.AIOfficeMultiSourceVersion='2.7.0';
window.AIOfficeInternalSourceControlVersion='2.7.0';
window.AIOfficeOfficeV2ShadowVersion='2.2.0-observe-only';
window.AIOfficeOfficeV2TaskBridgeVersion='2.8.0-legacy-task-sync';

const status=document.getElementById('v19Status');
if(status) status.textContent='Gemini-first · Nội bộ opt-in · Voice/Intent/Action ON';
