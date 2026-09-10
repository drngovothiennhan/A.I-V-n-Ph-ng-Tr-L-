const RELEASE = '1.9.3';
const KNOWLEDGE_ROUTER = '2.0';
const INTERACTION_CONTROL = '2.2';
const WEATHER_BRIDGE = '2.1';
const VOICE_RENDER_BRIDGE = '2.3';
const VOICE_TURN_COORDINATOR = '2.5';
const PRODUCT_COMPLETION = '2.4';

function syncReleaseLabels() {
  document.title = `A.I Văn phòng v${RELEASE} · Interaction ${INTERACTION_CONTROL}`;
  document.querySelector('.ey')?.replaceChildren(document.createTextNode(`A.I VĂN PHÒNG · RELEASE ${RELEASE}`));
  const brandSmall = document.querySelector('.brand small');
  if (brandSmall) brandSmall.textContent = `Autonomous Office Orchestrator · v${RELEASE}`;
  const footer = document.querySelector('.footer');
  if (footer) footer.textContent = `A.I VĂN PHÒNG · ${RELEASE} · SOURCE ROUTER ${KNOWLEDGE_ROUTER} · INTERACTION ${INTERACTION_CONTROL} · VOICE ${VOICE_RENDER_BRIDGE} · TURN ${VOICE_TURN_COORDINATOR} · PRODUCT ${PRODUCT_COMPLETION} · Dashboard v1.5 approved`;
  const status = document.querySelector('#v19Status');
  if (status && /^v1\.9\.2\b/.test(status.textContent || '')) {
    status.textContent = (status.textContent || '').replace(/^v1\.9\.2\b/, `v${RELEASE}`);
  }
}

async function bootKnowledgeRouter() {
  try {
    await import('./knowledge-router-v20.js?v=200');
    const weather = await import('./weather-bridge-v21.js?v=211');
    await import('./interaction-runtime-v22.js?v=220');
    await import('./interaction-control-v21.js?v=211');
    await import('./credential-setup-v22.js?v=222');
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
window.AIOfficeKnowledgeRouterVersion = KNOWLEDGE_ROUTER;
window.AIOfficeInteractionVersion = INTERACTION_CONTROL;
window.AIOfficeWeatherBridgeVersion = WEATHER_BRIDGE;
window.AIOfficeVoiceRenderBridgeVersion = VOICE_RENDER_BRIDGE;
window.AIOfficeVoiceTurnCoordinatorVersion = VOICE_TURN_COORDINATOR;
window.AIOfficeProductCompletionVersion = PRODUCT_COMPLETION;
