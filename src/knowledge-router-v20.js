import {
  smartIntent,
  classifySourcePolicy,
  rankSources,
  stripMarkup,
  sourcePolicyLabel
} from './source-policy-v20.js';

const VERSION = '2.0-routing';
const DOC_KEY = 'ai-office-drive-docs-v16';
const KNOWLEDGE_KEY = 'ai-office-knowledge-v15';
const TASK_KEY = 'ai-office-tasks-v11';
const CHAT_KEY = 'ai-office-conversation-v19';
const MAX_SOURCES = 10;
const TIMEOUT = 9000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getJson = (key, fallback=[]) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
};
const setJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const safe = (text='') => String(text).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
const normalize = (text='') => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const words = (text='') => normalize(text).split(/[^a-z0-9]+/).filter(x => x.length > 2);

async function waitCore() {
  for (let i=0;i<80;i++) {
    if (window.AIOfficeV19?.handleMessage && window.AIOfficeV19?.classifyIntent) return window.AIOfficeV19;
    await sleep(25);
  }
  throw new Error('AI_OFFICE_CORE_NOT_READY');
}

function sanitizeLegacyKnowledge() {
  const docs = getJson(DOC_KEY, []);
  let changed = false;
  for (const doc of docs) {
    const before = String(doc?.text || '');
    const after = stripMarkup(before).slice(0,180000);
    if (after !== before) {
      doc.text = after;
      doc.sanitizedAt = new Date().toISOString();
      changed = true;
    }
    if (!doc.sourceOrigin) {
      doc.sourceOrigin = 'local_upload';
      changed = true;
    }
  }
  if (changed) setJson(DOC_KEY, docs);
  return docs;
}

function localApprovedSources(query, policy) {
  if (!policy?.useDrive) return [];
  const qWords = words(query);
  return getJson(DOC_KEY, [])
    .filter(d => d?.status === 'approved' && !d?.blocked && d?.text)
    .map(d => {
      const text = stripMarkup(d.text).slice(0,12000);
      const hay = normalize(`${d.name || ''} ${text}`);
      const score = qWords.reduce((n,w) => n + (hay.includes(w) ? 1 : 0), 0);
      return {
        kind:'local-approved',
        source:`Local approved · ${d.name || 'Tài liệu'}`,
        title:d.name || 'Tài liệu đã duyệt',
        url:'',
        text,
        approvalState:'approved',
        score
      };
    })
    .filter(s => s.score > 0 || policy.mode === 'admin_document')
    .sort((a,b) => b.score - a.score)
    .slice(0,5);
}

function cachedOfficialSources(policy) {
  if (!policy?.officialOnly) return [];
  const state = getJson(KNOWLEDGE_KEY, {});
  const defs = [
    ['admin','CSDL quốc gia VBPL','https://vbpl.vn/'],
    ['clerical','Cục Văn thư và Lưu trữ nhà nước','https://luutru.gov.vn/']
  ];
  return defs.flatMap(([key,title,url]) => {
    const item = state?.[key];
    if (!item?.excerpt) return [];
    return [{
      kind:'official-cached',
      source:title,
      title,
      url,
      domain:new URL(url).hostname,
      text:stripMarkup(item.excerpt).slice(0,5000)
    }];
  });
}

async function jsonFetch(url, options={}, timeout=TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal:controller.signal, cache:'no-store' });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function driveRuntimeSources(query, policy) {
  if (!policy?.useDrive) return [];
  try {
    const response = await jsonFetch('/api/drive-brain', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        action:'search',
        query,
        scopes: policy.mode === 'admin_document'
          ? ['03_TEMPLATES','02_APPROVED','01_KNOWLEDGE','04_SKILLS']
          : ['02_APPROVED','01_KNOWLEDGE','04_SKILLS'],
        limit:6
      })
    }, 6500);
    if (response.status === 404) return [];
    if (!response.ok) return [];
    const data = await response.json();
    if (!data?.configured || !Array.isArray(data?.sources)) return [];
    return data.sources.map(s => ({
      kind:s.kind || 'drive-approved',
      source:s.source || `Drive · ${s.title || 'Tài liệu'}`,
      title:s.title || 'Drive',
      url:s.url || '',
      domain:s.domain || '',
      text:stripMarkup(s.text || s.snippet || '').slice(0,12000),
      approvalState:s.approvalState || (s.scope === '02_APPROVED' ? 'approved' : 'unreviewed'),
      provenance:s.provenance || null
    })).filter(s => s.text || s.title);
  } catch {
    return [];
  }
}

async function wikiSources(query, lang='vi') {
  try {
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({
      action:'query', generator:'search', gsrsearch:query, gsrlimit:'3',
      prop:'extracts|info', exintro:'1', explaintext:'1', inprop:'url',
      format:'json', origin:'*'
    });
    const response = await jsonFetch(u.toString(), {}, 7000);
    if (!response.ok) return [];
    const data = await response.json();
    return Object.values(data?.query?.pages || {}).map(p => ({
      kind:'web',
      source:`Wikipedia ${lang.toUpperCase()}`,
      title:p.title || '',
      url:p.fullurl || `https://${lang}.wikipedia.org/?curid=${p.pageid}`,
      domain:`${lang}.wikipedia.org`,
      text:stripMarkup(p.extract || '').slice(0,3600)
    })).filter(s => s.text);
  } catch { return []; }
}

async function duckSource(query) {
  try {
    const u = new URL('https://api.duckduckgo.com/');
    u.search = new URLSearchParams({
      q:query, format:'json', no_html:'1', no_redirect:'1', skip_disambig:'0'
    });
    const response = await jsonFetch(u.toString(), {}, 6500);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data?.AbstractText) return [];
    let domain = '';
    try { domain = new URL(data.AbstractURL || '').hostname; } catch {}
    return [{
      kind:'web',
      source:data.AbstractSource || 'DuckDuckGo',
      title:data.Heading || query,
      url:data.AbstractURL || '',
      domain,
      text:stripMarkup(data.AbstractText).slice(0,3600)
    }];
  } catch { return []; }
}

async function pubmedSources(query) {
  try {
    const search = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    search.search = new URLSearchParams({db:'pubmed',term:query,retmax:'4',sort:'relevance',retmode:'json'});
    const response = await jsonFetch(search.toString(), {}, 7000);
    if (!response.ok) return [];
    const found = await response.json();
    const ids = found?.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const summary = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    summary.search = new URLSearchParams({db:'pubmed',id:ids.join(','),retmode:'json'});
    const sResponse = await jsonFetch(summary.toString(), {}, 7000);
    if (!sResponse.ok) return [];
    const data = await sResponse.json();
    return ids.map(id => {
      const p = data?.result?.[id] || {};
      return {
        kind:'scholarly',
        source:'PubMed',
        title:p.title || `PubMed ${id}`,
        url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        domain:'pubmed.ncbi.nlm.nih.gov',
        text:stripMarkup([p.title,p.fulljournalname,p.pubdate].filter(Boolean).join('. '))
      };
    });
  } catch { return []; }
}

async function researchEndpoint(query, policy, driveSources=[]) {
  try {
    const response = await jsonFetch('/api/research', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        query,
        mode:policy?.mode || 'general_question',
        officialOnly:Boolean(policy?.officialOnly),
        driveContext:driveSources.slice(0,5).map(s => ({
          title:s.title, url:s.url, text:s.text, approvalState:s.approvalState
        }))
      })
    }, 16000);
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const data = await response.json();
    return data || null;
  } catch { return null; }
}

async function gatherSources(query, policy) {
  const local = localApprovedSources(query, policy);
  const [drive, endpoint] = await Promise.all([
    driveRuntimeSources(query, policy),
    policy?.useWeb || policy?.useDrive ? researchEndpoint(query, policy, local) : Promise.resolve(null)
  ]);

  if (endpoint?.answer) {
    const endpointSources = (endpoint.sources || []).map(s => ({
      ...s,
      text:stripMarkup(s.text || s.snippet || '').slice(0,5000)
    }));
    return {
      sources:rankSources(query, [...drive,...local,...endpointSources], policy).slice(0,MAX_SOURCES),
      endpointAnswer:stripMarkup(endpoint.answer),
      provider:endpoint.provider || 'research'
    };
  }

  const webJobs = [];
  if (policy?.useWeb) {
    if (policy.mode === 'medical_question') webJobs.push(pubmedSources(query));
    webJobs.push(wikiSources(query,'vi'), duckSource(query), wikiSources(query,'en'));
  }
  const web = (await Promise.all(webJobs)).flat();
  const official = cachedOfficialSources(policy);
  const merged = policy?.mode === 'admin_document'
    ? [...drive,...local,...official,...web]
    : [...drive,...official,...web,...local];
  const seen = new Set();
  const unique = merged.filter(s => {
    const key = `${s.url || ''}|${s.title || ''}|${String(s.text || '').slice(0,100)}`;
    if ((!s.text && !s.title) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { sources:rankSources(query, unique, policy).slice(0,MAX_SOURCES), endpointAnswer:'', provider:'client-retrieval' };
}

function extractiveFallback(query, sources, policy) {
  const ranked = rankSources(query, sources, policy).filter(s => s.text);
  if (!ranked.length) {
    if (policy?.useDrive && !policy?.useWeb) {
      return 'Tôi chưa truy cập được nguồn Drive phù hợp trong runtime hiện tại. Tôi không dùng tài liệu local ngẫu nhiên để thay thế. Hãy kết nối Drive Runtime hoặc chỉ định nguồn cần đọc.';
    }
    return 'Tôi chưa tìm được nguồn đủ phù hợp để trả lời chắc chắn. Tôi không ghép nội dung ngẫu nhiên hoặc tự bịa câu trả lời.';
  }
  const qWords = words(query);
  const sentences = [];
  for (const source of ranked.slice(0,5)) {
    const chunks = String(source.text)
      .split(/(?<=[.!?])\s+|\n+/)
      .map(stripMarkup)
      .filter(s => s.length >= 30 && s.length <= 700)
      .map(sentence => ({
        sentence,
        score:qWords.reduce((n,w) => n + (normalize(sentence).includes(w) ? 1 : 0), 0)
      }))
      .sort((a,b) => b.score - a.score);
    for (const item of chunks.slice(0,2)) {
      if (item.score > 0 || sentences.length < 2) sentences.push(item.sentence);
      if (sentences.length >= 4) break;
    }
    if (sentences.length >= 4) break;
  }
  if (!sentences.length) return 'Tôi đã tìm được nguồn nhưng chưa có đoạn nào đủ liên quan để trả lời chắc chắn. Tôi sẽ không trả raw nội dung của tài liệu.';
  return `${sentences.join(' ')}\n\nNguồn đã được chọn theo chính sách: ${sourcePolicyLabel(policy)}.`;
}

async function synthesizeWithChief(query, sources, policy, core) {
  if (policy?.directAnswer) return policy.directAnswer;
  const provider = core?.provider || window.AIOfficeV19?.provider || null;
  const runtimeProvider = window.AIOfficeV20?.providerState || provider;
  if (!runtimeProvider?.gemini?.configured) return extractiveFallback(query, sources, policy);

  const history = getJson(CHAT_KEY, []).slice(-10).map(x => `${x.role}: ${stripMarkup(x.text || '')}`).join('\n').slice(0,6000);
  const sourcePack = sources.map((s,i) =>
    `[${i+1}] ${s.source || s.title || 'Nguồn'}\nURL: ${s.url || ''}\n${stripMarkup(s.text || '').slice(0,4200)}`
  ).join('\n\n').slice(0,22000);
  try {
    const response = await jsonFetch('/api/proxy?op=chief', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        message:`Bạn là Trưởng phòng A.I. Trả lời bằng tiếng Việt, đúng trọng tâm và theo ngữ cảnh.
SOURCE POLICY: ${policy.mode}. ${policy.useDrive ? 'Drive chỉ dùng khi có liên quan.' : 'Không dùng Drive/local làm nguồn mặc định.'}
Tuyệt đối không in raw HTML/XML/JS. Không đủ bằng chứng thì nói rõ.
Dùng citation [n] cho các mệnh đề dựa trên SOURCE PACK.

LỊCH SỬ:
${history}

CÂU HỎI:
${query}

SOURCE PACK:
${sourcePack}`
      })
    }, 30000);
    if (response.ok) {
      const data = await response.json();
      const reply = stripMarkup(data?.reply || '');
      if (reply) return reply;
    }
  } catch {}
  return extractiveFallback(query, sources, policy);
}

function renderAnswer(answer, sources=[], policy={}) {
  const bubble = document.getElementById('bubble');
  const box = document.getElementById('answer');
  const cleanAnswer = stripMarkup(answer);
  if (bubble) bubble.textContent = cleanAnswer;
  if (!box) return;
  const refs = sources.slice(0,8).map((s,i) => {
    const label = `[${i+1}] ${String(s.source || s.title || 'Nguồn').replace(/[&<>]/g,'')}`;
    if (!s.url) return `<span>${safe(label)}</span>`;
    try {
      const u = new URL(s.url);
      if (!['http:','https:'].includes(u.protocol)) return `<span>${safe(label)}</span>`;
      return `<a href="${safe(u.toString())}" target="_blank" rel="noopener noreferrer">${safe(label)}</a>`;
    } catch {
      return `<span>${safe(label)}</span>`;
    }
  }).join(' · ');
  box.innerHTML = `<div class="ai19Answer"><b>Trưởng phòng A.I</b>
<div style="margin-top:5px">${safe(cleanAnswer).replace(/\n/g,'<br>')}</div>
<div class="ai19Sources">Điều phối nguồn: ${safe(sourcePolicyLabel(policy))}${refs ? `<br>Nguồn: ${refs}` : ''}</div></div>`;
}

function saveTurn(role, text, meta={}) {
  const history = getJson(CHAT_KEY, []);
  history.push({role,text:stripMarkup(text).slice(0,8000),at:new Date().toISOString(),...meta});
  setJson(CHAT_KEY, history.slice(-24));
}

function persistTask(task) {
  const list = getJson(TASK_KEY, []);
  const i = list.findIndex(x => x.id === task.id);
  if (i >= 0) list[i] = task; else list.unshift(task);
  setJson(TASK_KEY, list);
  window.render?.();
}

async function adminEvidence(text, intent) {
  const policy = classifySourcePolicy(text, intent);
  const gathered = await gatherSources(text, policy);
  return { policy, ...gathered };
}

async function upgradeAdminDraft(task, text, evidence, providerState) {
  const sources = evidence.sources || [];
  task.sourcePolicy = evidence.policy?.mode || 'admin_document';
  task.evidence = sources.slice(0,8).map(s => ({title:s.title,source:s.source,url:s.url,kind:s.kind}));
  task.templateMatch = sources.find(s => /template/.test(String(s.kind || ''))) || null;
  task.driveRuntimeUsed = sources.some(s => /drive/.test(String(s.kind || '')) && !/local/.test(String(s.kind || '')));

  if (!providerState?.gemini?.configured || !sources.length) {
    const note = task.driveRuntimeUsed
      ? '\n\nNGUỒN ĐỐI CHIẾU: đã truy xuất Drive/nguồn chính thức; cần QA trước khi phát hành.'
      : '\n\nLƯU Ý NGUỒN: Drive Runtime chưa cung cấp mẫu Approved phù hợp trong phiên này. Bản này là dự thảo và không được tự coi là mẫu cơ quan.';
    if (!String(task.outputDraft || '').includes('LƯU Ý NGUỒN')) task.outputDraft = `${task.outputDraft || ''}${note}`;
    task.qa = task.qa || {};
    task.qa.issues = [...new Set([...(task.qa.issues || []), ...(task.driveRuntimeUsed ? [] : ['Chưa có mẫu Approved từ Drive Runtime để đối chiếu tự động.'])])];
    return task;
  }

  const sourcePack = sources.slice(0,8).map((s,i) =>
    `[${i+1}] ${s.title || s.source}\n${s.url || ''}\n${stripMarkup(s.text || '').slice(0,4500)}`
  ).join('\n\n').slice(0,26000);
  try {
    const response = await jsonFetch('/api/proxy?op=chief', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        message:`Bạn là chuyên gia soạn thảo văn bản hành chính công Việt Nam.
Hãy tạo DỰ THẢO hoàn chỉnh cho yêu cầu dưới đây.
Ưu tiên mẫu/nguồn Drive Approved nếu có, sau đó nguồn chính thức. Không bịa số ký hiệu, căn cứ, người ký hay số liệu.
Nếu thiếu trường bắt buộc, để rõ [CHƯA CÓ DỮ LIỆU] thay vì đoán.
Giữ nội dung phù hợp loại văn bản ${intent?.docType || 'hành chính'} và có cấu trúc thực thi rõ.
Không in raw HTML/XML/JS.

YÊU CẦU:
${text}

NGUỒN ĐỐI CHIẾU:
${sourcePack}`
      })
    }, 30000);
    if (response.ok) {
      const data = await response.json();
      const draft = stripMarkup(data?.reply || '');
      if (draft.length > 200) {
        task.outputDraft = draft;
        task.engine = 'hybrid-admin-drive-web-gemini';
      }
    }
  } catch {}
  return task;
}

function currentProviderState(core) {
  return window.AIOfficeV20?.providerState || core?.provider || {
    local:{configured:true}, gemini:{configured:false}, xiaozhi:{configured:false}, googleWorkspace:{configured:false}
  };
}

async function handleQuestionV20(text, options, core, intent) {
  const status = document.getElementById('v19Status');
  const policy = classifySourcePolicy(text, intent);
  if (status) status.textContent = `Đang trả lời · ${sourcePolicyLabel(policy)}…`;

  if (policy.directAnswer) {
    renderAnswer(policy.directAnswer, [], policy);
    saveTurn('user',text,{intent:'question',sourcePolicy:policy.mode});
    saveTurn('assistant',policy.directAnswer,{intent:'answer',sourcePolicy:policy.mode,sourceCount:0});
    if (options?.spoken) speak(policy.directAnswer, core);
    if (status) status.textContent = 'Sẵn sàng · Source Router v2';
    return policy.directAnswer;
  }

  const gathered = await gatherSources(text, policy);
  const providerState = currentProviderState(core);
  let answer = gathered.endpointAnswer || '';
  if (!answer) answer = await synthesizeWithChief(text, gathered.sources, policy, {provider:providerState});
  renderAnswer(answer, gathered.sources, policy);
  saveTurn('user',text,{intent:'question',sourcePolicy:policy.mode});
  saveTurn('assistant',answer,{intent:'answer',sourcePolicy:policy.mode,sourceCount:gathered.sources.length});
  if (options?.spoken) speak(answer, core);
  if (status) status.textContent = 'Sẵn sàng · Source Router v2';
  return answer;
}

async function handleTaskV20(text, options, core, intent) {
  const status = document.getElementById('v19Status');
  if (status) status.textContent = 'Đang thực thi · workflow + QA…';
  let evidence = null;
  if (intent.kind === 'admin') evidence = await adminEvidence(text, intent);

  const task = await core.executeTask(text);
  if (intent.kind === 'data' && typeof core.runLocalDataOperation === 'function') {
    const localData = core.runLocalDataOperation(text);
    if (localData) {
      task.outputDraft = localData.text;
      task.rows = localData.rows || undefined;
      task.dataMeta = localData.meta;
      if (localData.meta?.reason) {
        task.status='awaiting_input';
        task.progress=35;
        task.qa={score:90,passed:false,issues:['Cần đủ dữ liệu đã duyệt để thực hiện phép đối chiếu thật.'],userFacts:[]};
      } else {
        task.status='awaiting_approval';
        task.progress=96;
        task.qa={score:100,passed:true,issues:[],userFacts:[]};
      }
    }
  }

  if (intent.kind === 'admin' && evidence) {
    await upgradeAdminDraft(task, text, evidence, currentProviderState(core));
  }
  task.sourcePolicy = task.sourcePolicy || classifySourcePolicy(text,intent).mode;
  task.v20 = true;
  persistTask(task);
  renderAnswer(task.outputDraft || 'Đã tiếp nhận và thực hiện nhiệm vụ.', evidence?.sources || [], evidence?.policy || classifySourcePolicy(text,intent));
  saveTurn('user',text,{intent:'task',kind:intent.kind,sourcePolicy:task.sourcePolicy});
  saveTurn('assistant',task.outputDraft || '',{intent:'task_result',qaScore:task.qa?.score,engine:task.engine,sourcePolicy:task.sourcePolicy});
  if (options?.spoken) speak(task.status === 'awaiting_input' ? 'Tác vụ đang chờ dữ liệu đầu vào phù hợp.' : 'Đã thực hiện nhiệm vụ và chuyển qua kiểm định.', core);
  if (status) status.textContent = task.status === 'awaiting_input' ? 'Đang chờ dữ liệu đầu vào' : 'Đã thực hiện · chờ duyệt';
  return task;
}

async function handleMessageV20(text, options={}, core) {
  const value = String(text || '').trim();
  if (!value) return;
  if (window.AIOfficeV20?.busy) return;
  window.AIOfficeV20.busy = true;
  try {
    const context = core.contextSnapshot?.() || {};
    const intent = smartIntent(value, core.classifyIntent, context);
    return intent.kind === 'question'
      ? await handleQuestionV20(value, options, core, intent)
      : await handleTaskV20(value, options, core, intent);
  } finally {
    window.AIOfficeV20.busy = false;
  }
}

function speak(text, core) {
  const voice = core?.voice;
  if (!('speechSynthesis' in window)) return;
  try { voice?.stopBrowserListening?.(); } catch {}
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(stripMarkup(text).replace(/https?:\/\/\S+/g,'').replace(/\[[0-9]+\]/g,'').slice(0,3200));
  utterance.lang='vi-VN';
  utterance.rate=1.02;
  utterance.onend = utterance.onerror = () => {
    try {
      if (localStorage.getItem('ai-office-voice-continuous-v19') === '1') setTimeout(() => voice?.startBrowserListening?.(), 420);
    } catch {}
  };
  window.speechSynthesis.speak(utterance);
}

async function probeDriveRuntime() {
  try {
    const response = await jsonFetch('/api/drive-brain', {
      method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'health'})
    }, 5000);
    if (!response.ok) return {configured:false,live:false,status:response.status};
    const data = await response.json();
    return {configured:Boolean(data?.configured),live:true,...data};
  } catch {
    return {configured:false,live:false};
  }
}

function tuneUi(providerState, driveState) {
  document.title='A.I Văn phòng · Unified Knowledge Router';
  const subtitle=document.querySelector('.sub');
  if (subtitle) subtitle.textContent='Web-first cho câu hỏi · Drive-first khi cần · Template-first cho hành chính · QA Gate';

  const brainBoxes=[...document.querySelectorAll('#brain .brainBox')];
  const shared=brainBoxes.find(x => /Shared Brain/i.test(x.textContent || ''));
  if (shared) {
    const p=shared.querySelector('p');
    if (p) p.textContent='Drive là kho canonical; Web Research xử lý câu hỏi bên ngoài; file local chỉ là nguồn bổ sung và không còn là điều kiện để A.I trả lời.';
  }
  const upload=document.querySelector('label.upload');
  if (upload) {
    const input=upload.querySelector('input');
    upload.replaceChildren(document.createTextNode('＋ Nạp file bổ sung '));
    if (input) upload.appendChild(input);
  }

  const pills=[...document.querySelectorAll('.pills .pill')];
  if (pills[0]) pills[0].textContent=providerState?.gemini?.configured?'✦ Gemini reasoning ON':'✦ External fallback';
  if (pills[1]) pills[1].textContent='▰ Source Router v2';
  if (pills[2]) pills[2].textContent=driveState?.configured?'☁ Drive Brain online':'☁ Drive canonical · runtime chờ nối';
  if (pills[3]) pills[3].textContent=providerState?.xiaozhi?.configured?'🎙 XiaoZhi realtime':'🎙 Voice browser fallback';
  if (pills[4]) pills[4].textContent='🧠 Approved-only learning';
}

function installInputInterceptors(core) {
  document.addEventListener('click', async event => {
    const target = event.target?.closest?.('#send');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const input=document.getElementById('msg');
    const text=input?.value || '';
    if (input) input.value='';
    await handleMessageV20(text,{spoken:false},core);
  }, true);

  document.addEventListener('keydown', async event => {
    if (event.target?.id !== 'msg' || event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const input=document.getElementById('msg');
    const text=input?.value || '';
    if (input) input.value='';
    await handleMessageV20(text,{spoken:false},core);
  }, true);

  const voice=core.voice;
  if (voice && !voice.__v20DispatchPatched) {
    const original=voice.dispatchEvent?.bind(voice);
    if (original) {
      voice.dispatchEvent=(event) => {
        if (event?.type === 'transcript') {
          const text=String(event?.detail?.text || '').trim();
          if (text) {
            const input=document.getElementById('msg');
            if (input) input.value=text;
            handleMessageV20(text,{spoken:true},core).catch(console.error);
          }
          return true;
        }
        return original(event);
      };
      voice.__v20DispatchPatched=true;
    }
  }
}

const core = await waitCore();
sanitizeLegacyKnowledge();

let providerState = {local:{configured:true},gemini:{configured:false},xiaozhi:{configured:false},googleWorkspace:{configured:false}};
try {
  const response = await jsonFetch('/api/health', {}, 5000);
  if (response.ok) providerState=(await response.json()).providers || providerState;
} catch {}

const driveState = await probeDriveRuntime();
window.AIOfficeV20 = {
  version:VERSION,
  providerState,
  driveState,
  busy:false,
  handleMessage:(text,options={}) => handleMessageV20(text,options,core),
  classifyIntent:(text) => smartIntent(text,core.classifyIntent,core.contextSnapshot?.() || {}),
  classifySourcePolicy,
  gatherSources:(text,policy) => gatherSources(text,policy || classifySourcePolicy(text,smartIntent(text,core.classifyIntent,core.contextSnapshot?.() || {}))),
  sanitizeLegacyKnowledge
};

installInputInterceptors(core);
tuneUi(providerState, driveState);

const status=document.getElementById('v19Status');
if (status) {
  const ai=providerState?.gemini?.configured?'Gemini':'External fallback';
  const drive=driveState?.configured?'Drive online':'Drive runtime chưa nối';
  status.textContent=`Source Router v2 · ${ai} · ${drive}`;
}
const bubble=document.getElementById('bubble');
if (bubble) bubble.textContent='Đã bật Source Router v2: câu hỏi thông thường không còn bị ép dùng file local; Drive chỉ được gọi khi ngữ cảnh cần, văn bản hành chính ưu tiên mẫu/nguồn đã duyệt.';
