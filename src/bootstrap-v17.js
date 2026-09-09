import { PwaInstallController } from './install/pwa-install.js';
import { XiaozhiVoiceFabric } from './voice/xiaozhi-voice-fabric.js';

const style = document.createElement('style');
style.textContent = `
#v17Dock{position:fixed;right:16px;bottom:16px;z-index:90;display:flex;gap:8px;align-items:center}
#v17Voice,#v17Install{border:1px solid #dce5f7;background:#fff;color:#315fe8;border-radius:999px;min-height:44px;padding:0 14px;font-weight:900;box-shadow:0 12px 30px #23366c22;cursor:pointer}
#v17Voice{width:52px;padding:0;font-size:20px}
#v17Voice[data-state="connected"]{background:#eafaf3;color:#14764f}
#v17Voice[data-state="browser-listening"]{background:#315fe8;color:#fff}
#v17Status{font:700 9px/1.2 system-ui;color:#6f7892;background:#fff;border:1px solid #e2e8f5;border-radius:999px;padding:7px 9px;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:700px){#v17Dock{right:12px;bottom:12px}#v17Status{display:none}#v17Install{padding:0 11px}}
`;
document.head.appendChild(style);

document.title = 'A.I Văn phòng v1.7';
document.querySelector('.ey')?.replaceChildren(document.createTextNode('A.I VĂN PHÒNG · RELEASE 1.7'));
const brandSmall = document.querySelector('.brand small');
if (brandSmall) brandSmall.textContent = 'Second Brain · v1.7';
const footer = document.querySelector('.footer');
if (footer) footer.textContent = 'A.I VĂN PHÒNG · 1.7.0 SECOND BRAIN · Dashboard v1.5 approved · Local-first';

const dock = document.createElement('div');
dock.id = 'v17Dock';
dock.innerHTML = '<span id="v17Status">Đang kiểm tra provider…</span><button id="v17Install" hidden>Cài ứng dụng</button><button id="v17Voice" aria-label="XiaoZhi Voice">🎙</button>';
document.body.appendChild(dock);

const install = new PwaInstallController({
  button: document.getElementById('v17Install'),
  status: null
}).start();

let provider = { xiaozhi: { configured: false } };
try {
  const r = await fetch('/api/health', { cache: 'no-store' });
  if (r.ok) {
    const h = await r.json();
    provider = h.providers || provider;
    document.getElementById('v17Status').textContent = `v1.7 · ${provider.xiaozhi?.configured ? 'XiaoZhi ready' : 'Browser Voice fallback'}`;
  }
} catch {
  document.getElementById('v17Status').textContent = 'Local fallback';
}

const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const voice = new XiaozhiVoiceFabric({
  wsUrl: provider.xiaozhi?.configured ? `${wsProtocol}//${location.host}/api/ws-xiaozhi` : null,
  language: 'vi-VN'
});
const voiceButton = document.getElementById('v17Voice');
const status = document.getElementById('v17Status');

voice.addEventListener('state', (event) => {
  const state = event.detail.state;
  voiceButton.dataset.state = state;
  if (state === 'connected') status.textContent = 'XiaoZhi realtime';
  else if (state === 'browser-listening') status.textContent = 'Đang nghe…';
  else if (state === 'fallback') status.textContent = 'Browser Voice fallback';
});

voice.addEventListener('partial', (event) => {
  const input = document.getElementById('msg');
  if (input) input.value = event.detail.text || '';
});
voice.addEventListener('transcript', (event) => {
  const input = document.getElementById('msg');
  if (input) {
    input.value = event.detail.text || '';
    input.focus();
  }
});

voiceButton.addEventListener('click', () => {
  if (voice.state === 'browser-listening') return voice.stopBrowserListening();
  if (provider.xiaozhi?.configured) {
    voice.connect();
    return;
  }
  voice.startBrowserListening();
});

if (provider.xiaozhi?.configured) voice.connect();
window.AIOfficeV17 = { install, voice };
