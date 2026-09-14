const RELEASE = '1.9.3';
const AI_CORE = '3.2.5';
const GLOBAL_CANCEL = '3.3.0';
const AUTHORIZATION = '3.4.0';
const CONTEXT_MANAGER = '3.5.1';
const OPERATIONS_CENTER = '3.6.0';
const KNOWLEDGE_ROUTER = '2.7.1';
const INTERACTION_CONTROL = '2.3';
const WEATHER_BRIDGE = '2.1';
const VOICE_RENDER_BRIDGE = '2.3';
const VOICE_TURN_COORDINATOR = '2.5';
const INTERNAL_SOURCE_CONTROL = '2.7.0';
const MULTISOURCE_ORCHESTRATOR = '2.7.1';
const RESEARCH_SAFETY = '2.6.3';
const PRODUCT_COMPLETION = '2.4.1';
const CREDENTIALS_RUNTIME = '2.3.0';
const OFFICE_V2_DELEGATION = '2.10.0-chief-delegation';
const OFFICE_V2_TASKS = '2.10.1-chief-plan-sync';
const OFFICE_OS_SHELL = '1.0.0-p1';
const OFFICE_OS_RUNTIME_HOTFIX = '1.0.0';
const CONNECTOR_REGISTRY = '1.0.0-p2';
const CHIEF_ANSWER_ROUTER = '1.0.1-p3-context';

function suppressLegacyChrome() {
  if (document.getElementById('ai-office-os-legacy-suppression')) return;
  const style = document.createElement('style');
  style.id = 'ai-office-os-legacy-suppression';
  style.textContent = 'body.aiOfficeOS>#v19Dock,body.aiOfficeOS>#cred22Launcher{display:none!important}';
  document.head.appendChild(style);
}

function syncReleaseLabels() {
  const officeOS = document.documentElement?.dataset?.aiOfficeOs === 'p1';
  document.title = officeOS ? 'A.I Văn phòng · Personal Office OS' : `A.I Văn phòng v${RELEASE} · Interaction ${INTERACTION_CONTROL}`;
  const ey = document.querySelector('.ey');
  if (ey && !officeOS) ey.textContent = `A.I VĂN PHÒNG · RELEASE ${RELEASE}`;
  const brandSmall = document.querySelector('.brand small');
  if (brandSmall && !officeOS) brandSmall.textContent = `Autonomous Office Orchestrator · v${RELEASE}`;
  const footer = document.querySelector('.footer');
  if (footer && !officeOS) footer.textContent = `A.I VĂN PHÒNG · ${RELEASE} · AI CORE ${AI_CORE} · CONTEXT ${CONTEXT_MANAGER} · OPS ${OPERATIONS_CENTER} · CANCEL ${GLOBAL_CANCEL} · AUTH ${AUTHORIZATION} · SOURCE ROUTER ${KNOWLEDGE_ROUTER} · INTERNAL ${INTERNAL_SOURCE_CONTROL} · MULTISOURCE ${MULTISOURCE_ORCHESTRATOR} · SAFETY ${RESEARCH_SAFETY} · INTERACTION ${INTERACTION_CONTROL} · VOICE ${VOICE_RENDER_BRIDGE} · TURN ${VOICE_TURN_COORDINATOR} · RUNTIME ${CREDENTIALS_RUNTIME} · PRODUCT ${PRODUCT_COMPLETION}`;
  const status = document.querySelector('#v19Status');
  if (status && officeOS) status.textContent = 'Personal Office OS · Chief A.I ready';
  else if (status && /^v1\.9\.2\b/.test(status.textContent || '')) status.textContent = (status.textContent || '').replace(/^v1\.9\.2\b/, `v${RELEASE}`);
}

async function bootKnowledgeRouter() {
  try {
    const officeOS = await import('./office-os/office-shell-v1.js?v=101');
    officeOS.installAIOfficeOSShell?.();
    suppressLegacyChrome();
    try { sessionStorage.setItem('ai-office-credentials-seen-v230','1'); } catch {}

    // Office OS must never depend on a competing entrypoint winning a startup race.
    // Bootstrap the stable V19 core here before any router waits for it.
    await import('./bootstrap-v18.js');
    const canonicalGate = await import('./canonical-input-gate-v71.js?v=711');
    canonicalGate.installCanonicalInputGate?.();
    await import('./office-os/runtime-ready-hotfix-v1.js?v=100');

    const aiCore = await import('./ai-orchestrator-core-v32.js?v=325');
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
    await import('./credential-setup-v22.js?v=231');
    const authorization = await import('./authorization-broker-v34.js?v=340');
    authorization.installAuthorizationBroker?.();
    const operations = await import('./operations-center-v36.js?v=360');
    operations.installOperationsCenter?.();
    await import('./product-completion-v24.js?v=241');
    await import('./voice-render-bridge-v23.js?v=230');
    const voiceTurns = await import('./voice-turn-coordinator-v25.js?v=250');

    const taskBridge = await import('./office-v2/task-runtime-bridge.js?v=2102');
    taskBridge.installOfficeV2TaskRuntimeBridge?.();

    const connectors = await import('./office-os/connector-registry-v1.js?v=100');
    connectors.installConnectorRegistry?.();
    const answerRouter = await import('./office-os/chief-answer-router-v1.js?v=101');
    answerRouter.installChiefAnswerRouter?.();

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
window.AIOfficeOSShellVersion = OFFICE_OS_SHELL;
window.AIOfficeOfficeOSRuntimeHotfixVersion = OFFICE_OS_RUNTIME_HOTFIX;
window.AIOfficeConnectorRegistryVersion = CONNECTOR_REGISTRY;
window.AIOfficeChiefAnswerRouterVersion = CHIEF_ANSWER_ROUTER;