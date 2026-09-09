import { PwaInstallController } from './install/pwa-install.js';
import { XiaozhiVoiceFabric } from './voice/xiaozhi-voice-fabric.js';

const RELEASE = '1.8.0';
const CHAT_KEY = 'ai-office-conversation-v18';
const VOICE_KEY = 'ai-office-voice-continuous-v18';
const MAX_HISTORY = 18;
const RESEARCH_TIMEOUT = 8500;

const style = document.createElement('style');
style.textContent = `
#v17Dock{position:fixed;right:16px;bottom:16px;z-index:90;display:flex;gap:8px;align-items:center}
#v17Voice,#v17Install{border:1px solid #dce5f7;background:#fff;color:#315fe8;border-radius:999px;min-height:44px;padding:0 14px;font-weight:900;box-shadow:0 12px 30px #23366c22;cursor:pointer}
#v17Voice{width:52px;padding:0;font-size:20px}
#v17Voice[data-state="connected"],#v17Voice[data-state="browser-listening"]{background:#315fe8;color:#fff}
#v17Voice[data-mode="continuous"]{box-shadow:0 0 0 5px #315fe81b,0 12px 30px #23366c22}
#v17Status{font:700 9px/1.2 system-ui;color:#6f7892;background:#fff;border:1px solid #e2e8f5;border-radius:999px;padding:7px 9px;max-width:215px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ai18Answer{margin-top:8px;border:1px solid #d8e4ff;background:#eef4ff;border-radius:12px;padding:11px;font-size:10px;line-height:1.55;white-space:pre-wrap}
.ai18Sources{margin-top:7px;font-size:8px;color:#64708c}
@media(max-width:700px){#v17Dock{right:12px;bottom:12px}#v17Status{display:none}#v17Install{padding:0 11px}}
`;
document.head.appendChild(style);

document.title = 'A.I Văn phòng v1.8';
document.querySelector('.ey')?.replaceChildren(document.createTextNode('A.I VĂN PHÒNG · RELEASE 1.8'));
const brandSmall = document.querySelector('.brand small');
if (brandSmall) brandSmall.textContent = 'Continuous Second Brain · v1.8';
const footer = document.querySelector('.footer');
if (footer) footer.textContent = 'A.I VĂN PHÒNG · 1.8.0 CONTINUOUS SECOND BRAIN · Dashboard v1.5 approved';

const dock = document.createElement('div');
dock.id = 'v17Dock';
dock.innerHTML = '<span id="v17Status">Đang kết nối bộ não…</span><button id="v17Install" hidden>Cài ứng dụng</button><button id="v17Voice" aria-label="XiaoZhi hội thoại liên tục" title="Bật/tắt XiaoZhi hội thoại liên tục">🎙</button>';
document.body.appendChild(dock);

const install = new PwaInstallController({ button: document.getElementById('v17Install'), status: null }).start();
const voiceButton = document.getElementById('v17Voice');
const status = document.getElementById('v17Status');
const input = document.getElementById('msg');
const sendButton = document.getElementById('send');
const answerBox = document.getElementById('answer');
const bubble = document.getElementById('bubble');

let provider = { local: { configured: true }, gemini: { configured: false }, xiaozhi: { configured: false }, googleWorkspace: { configured: false } };
try {
  const r = await fetch('/api/health', { cache: 'no-store' });
  if (r.ok) provider = (await r.json()).providers || provider;
} catch {}

const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const voice = new XiaozhiVoiceFabric({
  wsUrl: provider.xiaozhi?.configured ? `${wsProtocol}//${location.host}/api/ws-xiaozhi` : null,
  language: 'vi-VN'
});

let continuousVoice = localStorage.getItem(VOICE_KEY) === '1';
let processing = false;
let speaking = false;
let lastIntent = 'question';
let ignoreTranscriptUntil = 0;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]').slice(-MAX_HISTORY); }
  catch { return []; }
}
function saveTurn(role, text, meta = {}) {
  const history = loadHistory();
  history.push({ role, text: String(text || '').slice(0, 6000), at: new Date().toISOString(), ...meta });
  localStorage.setItem(CHAT_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
}
function words(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((x) => x.length > 2);
}
function classifyIntent(text) {
  const raw = String(text || '').trim();
  const q = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const taskPatterns = [
    /^(hay|vui long|giup|lam|tao|soan|viet|xuat|loc|doi chieu|kiem tra|phan tich|trien khai|nang cap|sua|cap nhat|ket noi|gui|lap|chuan bi|thuc hien|thi hanh|tim cho toi)\b/,
    /\b(tạo|soạn|xuất|lọc|đối chiếu|triển khai|nâng cấp|sửa|thực hiện|thi hành|giao việc|làm giúp|hãy làm)\b/i
  ];
  const questionPatterns = [
    /\?\s*$/,
    /^(ai|gi|nao|tai sao|vi sao|khi nao|o dau|bao nhieu|the nao|co phai|giai thich|cho toi biet|hay cho biet)\b/
  ];
  let taskScore = taskPatterns.reduce((n, re) => n + ((re.test(raw) || re.test(q)) ? 2 : 0), 0);
  let questionScore = questionPatterns.reduce((n, re) => n + ((re.test(raw) || re.test(q)) ? 2 : 0), 0);
  if (/\b(docx|xlsx|pptx|excel|word|powerpoint|file|bang tinh|bao cao|ke hoach|cong van|poster|hinh anh)\b/.test(q)) taskScore += 2;
  if (/^(tiep tuc|lam tiep|xuat tiep|sua tiep|cap nhat tiep)\b/.test(q) && lastIntent === 'task') taskScore += 3;
  if (/\b(la gi|nghia la gi|khac nhau|nguyen nhan|co tac dung|co nen|duoc khong)\b/.test(q)) questionScore += 2;
  return taskScore > questionScore ? 'task' : 'question';
}

function localContext(query) {
  try {
    if (typeof window.ctx === 'function') return String(window.ctx(query) || '').slice(0, 12000);
  } catch {}
  return '';
}
async function fetchJson(url, timeout = RESEARCH_TIMEOUT) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}
async function wikiSources(query, lang = 'vi') {
  try {
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: query, gsrlimit: '3', prop: 'extracts|info', exintro: '1', explaintext: '1', inprop: 'url', format: 'json', origin: '*' });
    const j = await fetchJson(u.toString());
    return Object.values(j?.query?.pages || {}).map((p) => ({ kind: 'web', source: `Wikipedia ${lang.toUpperCase()}`, title: p.title || '', url: p.fullurl || `https://${lang}.wikipedia.org/?curid=${p.pageid}`, text: String(p.extract || '').replace(/\s+/g, ' ').trim().slice(0, 2600) })).filter((x) => x.text);
  } catch { return []; }
}
async function duckSource(query) {
  try {
    const u = new URL('https://api.duckduckgo.com/');
    u.search = new URLSearchParams({ q: query, format: 'json', no_html: '1', no_redirect: '1', skip_disambig: '0' });
    const j = await fetchJson(u.toString());
    if (!j?.AbstractText) return [];
    return [{ kind: 'web', source: j.AbstractSource || 'DuckDuckGo', title: j.Heading || query, url: j.AbstractURL || '', text: String(j.AbstractText).slice(0, 2600) }];
  } catch { return []; }
}
async function pubmedSources(query) {
  const medical = /\b(bệnh|thuốc|y học|y tế|sức khỏe|triệu chứng|điều trị|chẩn đoán|dược|medicine|health|disease|drug|therapy|diagnosis)\b/i.test(query);
  if (!medical) return [];
  try {
    const search = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    search.search = new URLSearchParams({ db: 'pubmed', term: query, retmax: '3', sort: 'relevance', retmode: 'json' });
    const s = await fetchJson(search.toString());
    const ids = s?.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const summary = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    summary.search = new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'json' });
    const j = await fetchJson(summary.toString());
    return ids.map((id) => { const p = j?.result?.[id] || {}; return { kind: 'scholarly', source: 'PubMed', title: p.title || `PubMed ${id}`, url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, text: [p.title, p.fulljournalname, p.pubdate].filter(Boolean).join(' · ') }; });
  } catch { return []; }
}
function localSources(context) {
  if (!context) return [];
  return context.split('\n').filter(Boolean).slice(0, 7).map((line, i) => { const m = line.match(/^\[([^\]]+)\]\s*(.*)$/); return { kind: 'internal', source: m?.[1] || `Internal ${i + 1}`, title: m?.[1] || 'Drive Brain', url: '', text: (m?.[2] || line).slice(0, 2200) }; });
}
async function gatherSources(query) {
  const local = localSources(localContext(query));
  const [vi, en, ddg, pubmed] = await Promise.all([wikiSources(query, 'vi'), wikiSources(query, 'en'), duckSource(query), pubmedSources(query)]);
  const seen = new Set();
  return [...local, ...pubmed, ...ddg, ...vi, ...en].filter((s) => { const key = `${s.url}|${s.title}|${s.text.slice(0, 80)}`; if (!s.text || seen.has(key)) return false; seen.add(key); return true; }).slice(0, 12);
}
function groundedFallback(query, sources) {
  const qWords = words(query);
  const ranked = sources.map((s) => ({ ...s, score: qWords.reduce((n, w) => n + (String(s.text).toLowerCase().includes(w) ? 1 : 0), 0) + (s.kind === 'internal' ? 2 : 0) + (s.kind === 'scholarly' ? 1 : 0) })).sort((a, b) => b.score - a.score);
  const best = ranked.filter((x) => x.text).slice(0, 3);
  if (!best.length) return 'Tôi chưa tìm được nguồn đủ tin cậy để trả lời chắc chắn câu hỏi này. Bạn có thể bổ sung tài liệu vào Drive Brain hoặc hỏi cụ thể hơn.';
  const sentences = best.flatMap((s) => String(s.text).split(/(?<=[.!?])\s+/).slice(0, 2)).filter(Boolean).slice(0, 5);
  return `${sentences.join(' ')}\n\nTôi đang trả lời ở chế độ grounded fallback vì provider suy luận nâng cao chưa được cấu hình; nội dung trên chỉ dùng các nguồn vừa truy xuất, không tự bịa thêm.`;
}
async function reasonAnswer(query, sources) {
  const history = loadHistory().slice(-8).map((x) => `${x.role}: ${x.text}`).join('\n').slice(0, 5000);
  const sourcePack = sources.map((s, i) => `[${i + 1}] ${s.source} | ${s.title}\n${s.text}`).join('\n\n').slice(0, 18000);
  if (provider.gemini?.configured) {
    try {
      const response = await fetch('/api/proxy?op=chief', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: `Bạn là Trưởng phòng A.I. Trả lời chính xác, ngắn gọn nhưng đủ ý bằng tiếng Việt. Chỉ dùng thông tin có trong SOURCE PACK và lịch sử hội thoại; nếu nguồn không đủ phải nói rõ. Gắn [n] sau mệnh đề tương ứng.\n\nLỊCH SỬ:\n${history}\n\nCÂU HỎI:\n${query}\n\nSOURCE PACK:\n${sourcePack}` }) });
      if (response.ok) { const j = await response.json(); if (j?.reply?.trim()) return j.reply.trim(); }
    } catch {}
  }
  return groundedFallback(query, sources);
}
function renderAnswer(answer, sources) {
  if (bubble) bubble.textContent = answer;
  if (!answerBox) return;
  const safe = String(answer).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const links = sources.filter((s) => s.url).slice(0, 6).map((s, i) => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">[${i + 1}] ${String(s.source).replace(/[&<>]/g, '')}</a>`).join(' · ');
  answerBox.innerHTML = `<div class="ai18Answer"><b>Trưởng phòng A.I</b><br>${safe}<div class="ai18Sources">Nguồn đã truy cập: ${links || 'Drive Brain / nguồn nội bộ đã duyệt'}</div></div>`;
}
function speakThenResume(text) {
  const clean = String(text || '').replace(/https?:\/\/\S+/g, '').replace(/\[[0-9]+\]/g, '').slice(0, 3500);
  if (!continuousVoice || !('speechSynthesis' in window)) return;
  speaking = true;
  voice.stopBrowserListening();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'vi-VN';
  utterance.rate = 1.02;
  utterance.onend = utterance.onerror = () => { speaking = false; ignoreTranscriptUntil = Date.now() + 350; if (continuousVoice) setTimeout(() => voice.startBrowserListening(), 420); };
  window.speechSynthesis.speak(utterance);
}
async function handleQuestion(text, { spoken = false } = {}) {
  status.textContent = 'Đang truy cập nguồn & suy luận…';
  if (bubble) bubble.textContent = 'Tôi đang truy cập Drive Brain, nguồn học thuật và nguồn ngoài phù hợp…';
  const sources = await gatherSources(text);
  const answer = await reasonAnswer(text, sources);
  renderAnswer(answer, sources);
  saveTurn('user', text, { intent: 'question' });
  saveTurn('assistant', answer, { intent: 'answer', sourceCount: sources.length });
  status.textContent = continuousVoice ? 'XiaoZhi · hội thoại liên tục' : 'Sẵn sàng';
  if (spoken || continuousVoice) speakThenResume(answer);
  return answer;
}
async function handleTask(text, { spoken = false } = {}) {
  saveTurn('user', text, { intent: 'task' });
  if (input) input.value = text;
  const acknowledgement = 'Tôi đã nhận nhiệm vụ và chuyển vào workflow xử lý. Tôi sẽ giữ ngữ cảnh cuộc hội thoại này để các lượt sau có thể tiếp tục công việc.';
  try { if (typeof window.submit === 'function') await window.submit(); } catch {}
  saveTurn('assistant', acknowledgement, { intent: 'task_ack' });
  status.textContent = continuousVoice ? 'XiaoZhi · đang chờ câu tiếp theo' : 'Nhiệm vụ đã tiếp nhận';
  if (spoken || continuousVoice) speakThenResume(acknowledgement);
  return acknowledgement;
}
async function handleMessage(text, options = {}) {
  const value = String(text || '').trim();
  if (!value || processing) return;
  processing = true;
  try { const intent = classifyIntent(value); lastIntent = intent; return intent === 'task' ? await handleTask(value, options) : await handleQuestion(value, options); }
  finally { processing = false; }
}

voice.addEventListener('state', (event) => {
  const state = event.detail.state;
  voiceButton.dataset.state = state;
  if (state === 'connected') status.textContent = 'XiaoZhi realtime · đã kết nối';
  else if (state === 'browser-listening') status.textContent = continuousVoice ? 'XiaoZhi · đang nghe liên tục…' : 'Đang nghe…';
  else if (state === 'fallback') status.textContent = 'XiaoZhi Hybrid · Browser Voice + External Brain';
});
voice.addEventListener('partial', (event) => { if (input && !speaking) input.value = event.detail.text || ''; });
voice.addEventListener('transcript', async (event) => {
  if (Date.now() < ignoreTranscriptUntil || speaking || processing) return;
  const text = String(event.detail.text || '').trim();
  if (!text) return;
  if (input) input.value = text;
  if (continuousVoice) voice.stopBrowserListening();
  await handleMessage(text, { spoken: true });
});
voice.addEventListener('assistant', (event) => {
  const text = String(event.detail?.text || event.detail?.message || '').trim();
  if (text) { renderAnswer(text, []); saveTurn('assistant', text, { intent: 'xiaozhi_external' }); speakThenResume(text); }
});
voiceButton.addEventListener('click', () => {
  continuousVoice = !continuousVoice;
  localStorage.setItem(VOICE_KEY, continuousVoice ? '1' : '0');
  voiceButton.dataset.mode = continuousVoice ? 'continuous' : 'off';
  if (!continuousVoice) { window.speechSynthesis?.cancel(); voice.stopBrowserListening(); status.textContent = 'Hội thoại giọng nói đã tắt'; return; }
  if (provider.xiaozhi?.configured) voice.connect();
  const started = voice.startBrowserListening();
  status.textContent = started ? 'XiaoZhi · đang nghe liên tục…' : 'Hãy cấp quyền microphone để bắt đầu';
});
if (sendButton) {
  sendButton.addEventListener('click', async (event) => { event.preventDefault(); event.stopImmediatePropagation(); const text = input?.value || ''; if (input) input.value = ''; await handleMessage(text, { spoken: false }); }, true);
}
if (input) {
  input.addEventListener('keydown', async (event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.stopImmediatePropagation(); const text = input.value; input.value = ''; await handleMessage(text, { spoken: false }); } }, true);
}
if (provider.xiaozhi?.configured) voice.connect();
voiceButton.dataset.mode = continuousVoice ? 'continuous' : 'off';
status.textContent = provider.xiaozhi?.configured ? `v${RELEASE} · XiaoZhi external ready` : `v${RELEASE} · XiaoZhi Hybrid ready`;
window.AIOfficeV18 = { install, voice, handleMessage, classifyIntent, gatherSources, loadHistory };
