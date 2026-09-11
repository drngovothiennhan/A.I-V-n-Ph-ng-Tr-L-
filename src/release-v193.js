const RELEASE = '1.9.3';
const AI_CORE = '3.2.1';
const KNOWLEDGE_ROUTER = '2.7.1';
const INTERACTION_CONTROL = '2.2';
const WEATHER_BRIDGE = '2.1';
const VOICE_RENDER_BRIDGE = '2.3';
const VOICE_TURN_COORDINATOR = '2.5';
const INTERNAL_SOURCE_CONTROL = '2.7.0';
const MULTISOURCE_ORCHESTRATOR = '2.7.1';
const RESEARCH_SAFETY = '2.6.3';
const PRODUCT_COMPLETION = '2.4';
const CREDENTIALS_RUNTIME = '2.3.0';

function syncReleaseLabels() {
  document.title = `A.I Văn phòng v${RELEASE} · Interaction ${INTERACTION_CONTROL}`;
  document.querySelector('.ey')?.replaceChildren(document.createTextNode(`A.I VĂN PHÒNG · RELEASE ${RELEASE}`));
  const brandSmall = document.querySelector('.brand small');
  if (brandSmall) brandSmall.textContent = `Autonomous Office Orchestrator · v${RELEASE}`;
  const footer = document.querySelector('.footer');
  if (footer) footer.textContent = `A.I VĂN PHÒNG · ${RELEASE} · AI CORE ${AI_CORE} · SOURCE ROUTER ${KNOWLEDGE_ROUTER} · INTERNAL ${INTERNAL_SOURCE_CONTROL} · MULTISOURCE ${MULTISOURCE_ORCHESTRATOR} · SAFETY ${RESEARCH_SAFETY} · INTERACTION ${INTERACTION_CONTROL} · VOICE ${VOICE_RENDER_BRIDGE} · TURN ${VOICE_TURN_COORDINATOR} · RUNTIME ${CREDENTIALS_RUNTIME} · PRODUCT ${PRODUCT_COMPLETION} · Dashboard v1.5 approved`;
  const status = document.querySelector('#v19Status');
  if (status && /^v1\.9\.2\b/.test(status.textContent || '')) {
    status.textContent = (status.textContent || '').replace(/^v1\.9\.2\b/, `v${RELEASE}`);
  }
}

async function bootKnowledgeRouter() {
  try {
    // Canonical intent contract initializes first; existing v1.9/v2.x behavior remains the execution engine.
    const aiCore = await import('./ai-orchestrator-core-v32.js?v=321');
    aiCore.installAICoreOrchestrator?.();

    // Install the explicit source-consent UI before any router can derive source policy.
    const sourceControl = await import('./internal-source-control-v27.js?v=270');
    sourceControl.installInternalSourceControl?.();

    await import('./knowledge-router-v20.js?v=271');
    const multiSource = await import('./multisource-orchestrator-v26.js?v=271');
    multiSource.installMultiSourceOrchestrator?.();

    const researchSafety = await import('./research-safety-guard-v263.js?v=263');
    researchSafety.installResearchSafetyGuard?.();
    const weather = await import('./weather-bridge-v21.js?v=211');
    await import('./interaction-runtime-v22.js?v=220');
    await import('./interaction-control-v21.js?v=211');
    await import('./credential-setup-v22.js?v=230');
    await import('./product-completion-v24.js?v=240');
    await import('./voice-render-bridge-v23.js?v=230');
    const voiceTurns = await import('./voice-turn-coordinator-v25.js?v=250');
    weather.patchVoice?.();
    window.AIOfficeV22?.attachAfterV21?.();
    voiceTurns.installVoiceTurnCoordinator?.();
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
