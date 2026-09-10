const RELEASE = '1.9.3';
const KNOWLEDGE_ROUTER = '2.0';
const INTERACTION_CONTROL = '2.1';
const WEATHER_BRIDGE = '2.1';

function syncReleaseLabels() {
  document.title = `A.I Văn phòng v${RELEASE}`;
  document.querySelector('.ey')?.replaceChildren(document.createTextNode(`A.I VĂN PHÒNG · RELEASE ${RELEASE}`));
  const brandSmall = document.querySelector('.brand small');
  if (brandSmall) brandSmall.textContent = `Autonomous Office Orchestrator · v${RELEASE}`;
  const footer = document.querySelector('.footer');
  if (footer) footer.textContent = `A.I VĂN PHÒNG · ${RELEASE} · SOURCE ROUTER ${KNOWLEDGE_ROUTER} · INTERACTION ${INTERACTION_CONTROL} · Dashboard v1.5 approved`;
  const bubble = document.querySelector('#bubble');
  if (bubble && /v1\.9\.2 đã kích hoạt/i.test(bubble.textContent || '')) {
    bubble.textContent = (bubble.textContent || '').replace(/v1\.9\.2/g, `v${RELEASE}`);
  }
  const status = document.querySelector('#v19Status');
  if (status && /^v1\.9\.2\b/.test(status.textContent || '')) {
    status.textContent = (status.textContent || '').replace(/^v1\.9\.2\b/, `v${RELEASE}`);
  }
}

async function bootKnowledgeRouter() {
  try {
    await import('./knowledge-router-v20.js?v=200');
    const weather = await import('./weather-bridge-v21.js?v=211');
    await import('./interaction-control-v21.js?v=210');
    weather.patchVoice?.();
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
