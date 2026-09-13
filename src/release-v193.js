const RELEASE = '1.9.3';
const AI_CORE = '3.2.3';
const GLOBAL_CANCEL = '3.3.0';
const AUTHORIZATION = '3.4.0';
const CONTEXT_MANAGER = '3.5.0';
const OPERATIONS_CENTER = '3.6.0';
const KNOWLEDGE_ROUTER = '2.7.1';
const INTERACTION_CONTROL = '2.3';
const WEATHER_BRIDGE = '2.1';
const VOICE_RENDER_BRIDGE = '2.3';
const VOICE_TURN_COORDINATOR = '2.5';
const INTERNAL_SOURCE_CONTROL = '2.7.0';
const MULTISOURCE_ORCHESTRATOR = '2.7.1';
const RESEARCH_SAFETY = '2.6.3';
const PRODUCT_COMPLETION = '2.4';
const CREDENTIALS_RUNTIME = '2.3.0';
const OFFICE_V2_DELEGATION = '2.10.0-chief-delegation';
const OFFICE_V2_TASKS = '2.10.0-chief-delegation-sync';
const OFFICE_V2_WORKSPACE = '2.10.0-chief-delegation-cards';
const UI_V2 = '3.0.0-production-shell';
const LEAN_UI = '3.1.1-active-only';
const MOBILE_UI = '3.2.0-focus-navigation';

function syncReleaseLabels() {
  const uiV2 = document.documentElement?.dataset?.aiOfficeUi === 'v2';
  document.title = uiV2 ? 'A.I Văn phòng · Trung tâm điều hành A.I' : `A.I Văn phòng v${RELEASE} · Interaction ${INTERACTION_CONTROL}`;
  const ey = document.querySelector('.ey');
  if (ey) ey.textContent = uiV2 ? 'A.I VĂN PHÒNG · PRODUCTION WORKSPACE' : `A.I VĂN PHÒNG · RELEASE ${RELEASE}`;
  const brandSmall = document.querySelector('.brand small');
  if (brandSmall) brandSmall.textContent = uiV2 ? 'AI Office Operating System' : `Autonomous Office Orchestrator · v${RELEASE}`;
  const footer = document.querySelector('.footer');
  if (footer) footer.textContent = uiV2
    ? `AI OFFICE V2 · Chief of Staff ${OFFICE_V2_DELEGATION} · Tasks ${OFFICE_V2_TASKS} · UI ${UI_V2} · Lean ${LEAN_UI} · Mobile ${MOBILE_UI} · Production`
    : `A.I VĂN PHÒNG · ${RELEASE} · AI CORE ${AI_CORE} · CONTEXT ${CONTEXT_MANAGER} · OPS ${OPERATIONS_CENTER} · CANCEL ${GLOBAL_CANCEL} · AUTH ${AUTHORIZATION} · SOURCE ROUTER ${KNOWLEDGE_ROUTER} · INTERNAL ${INTERNAL_SOURCE_CONTROL} · MULTISOURCE ${MULTISOURCE_ORCHESTRATOR} · SAFETY ${RESEARCH_SAFETY} · INTERACTION ${INTERACTION_CONTROL} · VOICE ${VOICE_RENDER_BRIDGE} · TURN ${VOICE_TURN_COORDINATOR} · RUNTIME ${CREDENTIALS_RUNTIME} · PRODUCT ${PRODUCT_COMPLETION}`;
  const status = document.querySelector('#v19Status');
  if (status && uiV2) status.textContent = 'Chief of Staff · Gemini-first · Voice/Intent/Action ON';
  else if (status && /^v1\.9\.2\b/.test(status.textContent || '')) status.textContent = (status.textContent || '').replace(/^v1\.9\.2\b/, `v${RELEASE}`);
}

async function bootKnowledgeRouter() {
  try {
    const aiCore = await import('./ai-orchestrator-core-v32.js?v=323');
    aiCore.installAICoreOrchestrator?.();

    const sourceControl = await import('./internal-source-control-v27.js?v=270');
    sourceControl.installInternalSourceControl?.();

    await import('./knowledge-router-v20.js?v=271');
    const multiSource = await import('./multisource-orchestrator-v26.js?v=271');
    multiSource.installMultiSourceOrchestrator?.();

    const researchSafety = await import('./research-safety-guard-v263.js?v=263');
    researchSafety.installResearchSafetyGuard?.();
    const weather = await import('./weather-bridge-v21.js?v=211');
    const interactionV23 = await import('./interaction-runtime-v23.js?v=230');
    await import('./interaction-control-v21.js?v=211');
    const globalCancel = await import('./global-cancel-v33.js?v=330');
    globalCancel.installGlobalCancel?.();
    await import('./credential-setup-v22.js?v=230');
    const authorization = await import('./authorization-broker-v34.js?v=340');
    authorization.installAuthorizationBroker?.();
    const operations = await import('./operations-center-v36.js?v=360');
    operations.installOperationsCenter?.();
    await import('./product-completion-v24.js?v=240');
    await import('./voice-render-bridge-v23.js?v=230');
    const voiceTurns = await import('./voice-turn-coordinator-v25.js?v=250');

    const taskBridge = await import('./office-v2/task-runtime-bridge.js?v=2101');
    taskBridge.installOfficeV2TaskRuntimeBridge?.();
    const taskWorkspace = await import('./office-v2/task-workspace.js?v=2101');
    taskWorkspace.installOfficeV2TaskWorkspace?.();
    const uiV2 = await import('./office-v2/ui-v2-shell.js?v=3002');
    uiV2.installAIOfficeUIV2?.();
    const leanDashboard = await import('./office-v2/lean-dashboard-v72.js?v=3110');
    leanDashboard.installLeanDashboard?.();
    const mobileShell = await import('./office-v2/mobile-shell-v73.js?v=3200');
    mobileShell.installMobileShell?.();

    weather.patchVoice?.();
    window.AIOfficeV22?.attachAfterV21?.();
    interactionV23.attachGlobalCancelVoice?.();
    voiceTurns.installVoiceTurnCoordinator?.();
    syncReleaseLabels();
  } catch (error) {
    console.error('ai_office_extended_boot_failed', { message:String(error?.message || error).slice(0,240) });
    const status = document.querySelector('#v19Status');
    if (status) status.textContent = `v${RELEASE} · Extended router fallback`;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncReleaseLabels, { once: true });
else syncReleaseLabels();
setTimeout(syncReleaseLabels, 0);
setTimeout(syncReleaseLabels, 250);
setTimeout(bootKnowledgeRouter, 0);
window.AIOfficeRelease = RELEASE;
window.AIOfficeAICoreVersion = AI_CORE;
window.AIOfficeContextVersion = CONTEXT_MANAGER;
window.AIOfficeOperationsVersion = OPERATIONS_CENTER;
window.AIOfficeGlobalCancelVersion = GLOBAL_CANCEL;
window.AIOfficeAuthorizationVersion = AUTHORIZATION;
window.AIOfficeKnowledgeRouterVersion = KNOWLEDGE_ROUTER;
window.AIOfficeInternalSourceControlVersion = INTERNAL_SOURCE_CONTROL;
window.AIOfficeMultiSourceVersion = MULTISOURCE_ORCHESTRATOR;
window.AIOfficeResearchSafetyVersion = RESEARCH_SAFETY;
window.AIOfficeInteractionVersion = INTERACTION_CONTROL;
window.AIOfficeWeatherBridgeVersion = WEATHER_BRIDGE;
window.AIOfficeVoiceRenderBridgeVersion = VOICE_RENDER_BRIDGE;
window.AIOfficeVoiceTurnCoordinatorVersion = VOICE_TURN_COORDINATOR;
window.AIOfficeCredentialsRuntimeVersion = CREDENTIALS_RUNTIME;
window.AIOfficeProductCompletionVersion = PRODUCT_COMPLETION;
window.AIOfficeOfficeV2ChiefDelegationVersion = OFFICE_V2_DELEGATION;
window.AIOfficeOfficeV2TaskBridgeVersion = OFFICE_V2_TASKS;
window.AIOfficeOfficeV2TaskWorkspaceVersion = OFFICE_V2_WORKSPACE;
window.AIOfficeUIV2Version = UI_V2;
window.AIOfficeLeanDashboardVersion = LEAN_UI;
window.AIOfficeMobileShellVersion = MOBILE_UI;