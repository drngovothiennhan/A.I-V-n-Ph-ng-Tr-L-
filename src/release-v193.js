const RELEASE = '1.9.3';

function syncReleaseLabels() {
  document.title = `A.I Văn phòng v${RELEASE}`;
  document.querySelector('.ey')?.replaceChildren(document.createTextNode(`A.I VĂN PHÒNG · RELEASE ${RELEASE}`));
  const brandSmall = document.querySelector('.brand small');
  if (brandSmall) brandSmall.textContent = `Autonomous Office Orchestrator · v${RELEASE}`;
  const footer = document.querySelector('.footer');
  if (footer) footer.textContent = `A.I VĂN PHÒNG · ${RELEASE} AUTONOMOUS OFFICE ORCHESTRATOR · Dashboard v1.5 approved`;
  const bubble = document.querySelector('#bubble');
  if (bubble && /v1\.9\.2 đã kích hoạt/i.test(bubble.textContent || '')) {
    bubble.textContent = (bubble.textContent || '').replace(/v1\.9\.2/g, `v${RELEASE}`);
  }
  const status = document.querySelector('#v19Status');
  if (status && /^v1\.9\.2\b/.test(status.textContent || '')) {
    status.textContent = (status.textContent || '').replace(/^v1\.9\.2\b/, `v${RELEASE}`);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncReleaseLabels, { once: true });
else syncReleaseLabels();
setTimeout(syncReleaseLabels, 0);
setTimeout(syncReleaseLabels, 250);
window.AIOfficeRelease = RELEASE;
