const MAX_QUERY = 1600;
const MAX_CONTEXT = 24000;
const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
const DEFAULT_ECONOMY_MODEL = 'gemini-3.5-flash-lite';
const OFFICIAL_DOMAINS = ['vbpl.vn','vanban.chinhphu.vn','chinhphu.vn','moh.gov.vn'];
const MEDICAL_DOMAINS = ['pubmed.ncbi.nlm.nih.gov','who.int','moh.gov.vn'];

function primaryModel() {
  return process.env.AI_OFFICE_GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
}
function economyModel() {
  return process.env.AI_OFFICE_GEMINI_ECONOMY_MODEL || DEFAULT_ECONOMY_MODEL;
}
function clean(input, max = 8000) {
  return String(input ?? '').replace(/\0/g,'').replace(/\s+/g,' ').trim().slice(0,max);
}
function stripMarkup(input) {
  return String(input ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/\s+/g,' ').trim();
}
function json(res, status, body) {
  res.setHeader('cache-control','no-store');
  res.setHeader('x-content-type-options','nosniff');
  return res.status(status).json(body);
}
function medicalMode(mode, query) {
  return mode === 'medical_question' || /\b(bệnh|thuốc|y học|y tế|sức khỏe|điều trị|chẩn đoán|medicine|health|disease|drug)\b/i.test(query);
}
function sourceDomain(url='') { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } }
function dedupe(sources=[]) {
  const seen = new Set();
  return sources.filter(s => {
    const key = `${s.url || ''}|${s.title || ''}|${String(s.text || '').slice(0,90)}`;
    if (!s.text || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function complexRequest(query, mode, officialOnly, driveContext=[]) {
  if (officialOnly || medicalMode(mode, query) || driveContext.length) return true;
  if (/admin|internal|legal|document/.test(mode)) return true;
  if (query.length > 520) return true;
  return /\b(phân tích|đánh giá|so sánh|tổng hợp|đề xuất|chiến lược|kiến trúc|lập luận|nguyên nhân|đa nguồn|quy định|pháp lý|an toàn|rủi ro|debug|thiết kế hệ thống)\b/i.test(query);
}
function modelForRequest(query, mode, officialOnly, driveContext=[]) {
  const primary = complexRequest(query, mode, officialOnly, driveContext);
  return { model: primary ? primaryModel() : economyModel(), costTier: primary ? 'reasoning' : 'economy' };
}
function publicFirstEligible(query, mode, officialOnly, driveContext=[]) {
  if (officialOnly || driveContext.length || medicalMode(mode, query)) return false;
  if (query.length > 180) return false;
  if (/\b(hôm nay|hiện nay|mới nhất|vừa|giá|tỷ giá|thời tiết|lịch|2026|current|latest|today|now)\b/i.test(query)) return false;
  return /^(ai|gì|nào|thế nào|giải thích|cho tôi biết|what|who|define|explain)\b/i.test(query.trim()) || /\b(là gì|nghĩa là gì)\b/i.test(query);
}

async function fetchJson(url, timeout=9000) {
  const response = await fetch(url, { headers:{'user-agent':'AI-Office-Research/2.4'}, signal:AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  return response.json();
}

async function wiki(query, lang='vi') {
  try {
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrlimit:'3',prop:'extracts|info',exintro:'1',explaintext:'1',inprop:'url',format:'json',origin:'*'}).toString();
    const data = await fetchJson(u.toString());
    return Object.values(data?.query?.pages || {}).map((p) => ({kind:'web',source:`Wikipedia ${lang.toUpperCase()}`,title:p.title || '',url:p.fullurl || `https://${lang}.wikipedia.org/?curid=${p.pageid}`,domain:`${lang}.wikipedia.org`,text:stripMarkup(p.extract || '').slice(0,4000)})).filter(s=>s.text);
  } catch { return []; }
}

async function duck(query) {
  try {
    const u = new URL('https://api.duckduckgo.com/');
    u.search = new URLSearchParams({q:query,format:'json',no_html:'1',no_redirect:'1',skip_disambig:'0'}).toString();
    const data = await fetchJson(u.toString());
    if (!data?.AbstractText) return [];
    return [{kind:'web',source:data.AbstractSource || 'DuckDuckGo',title:data.Heading || query,url:data.AbstractURL || '',domain:sourceDomain(data.AbstractURL || ''),text:stripMarkup(data.AbstractText).slice(0,4000)}];
  } catch { return []; }
}

async function pubmed(query) {
  try {
    const s = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    s.search = new URLSearchParams({db:'pubmed',term:query,retmax:'4',sort:'relevance',retmode:'json'}).toString();
    const result = await fetchJson(s.toString());
    const ids = result?.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const u = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    u.search = new URLSearchParams({db:'pubmed',id:ids.join(','),retmode:'json'}).toString();
    const data = await fetchJson(u.toString());
    return ids.map(id => { const p=data?.result?.[id] || {}; return {kind:'scholarly',source:'PubMed',title:p.title || `PubMed ${id}`,url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,domain:'pubmed.ncbi.nlm.nih.gov',text:stripMarkup([p.title,p.fulljournalname,p.pubdate].filter(Boolean).join('. '))}; });
  } catch { return []; }
}

function extractive(query, sources) {
  const terms = clean(query,MAX_QUERY).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(x=>x.length>2);
  const ranked = sources.map(s => {
    const hay=clean(`${s.title || ''} ${s.text || ''}`,6000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    let score=terms.reduce((n,w)=>n+(hay.includes(w)?1:0),0);
    if (OFFICIAL_DOMAINS.some(d => s.domain === d || s.domain.endsWith(`.${d}`))) score += 2;
    if (MEDICAL_DOMAINS.some(d => s.domain === d || s.domain.endsWith(`.${d}`))) score += 2;
    return {...s,score};
  }).sort((a,b)=>b.score-a.score);
  const picked=[];
  for (const s of ranked.slice(0,5)) {
    const parts=stripMarkup(s.text).split(/(?<=[.!?])\s+/).filter(x=>x.length>=35&&x.length<=700);
    parts.sort((a,b)=>terms.filter(w=>b.toLowerCase().includes(w)).length-terms.filter(w=>a.toLowerCase().includes(w)).length);
    if (parts[0]) picked.push(parts[0]);
    if (picked.length>=4) break;
  }
  return picked.length ? picked.join(' ') : '';
}

async function publicExtractive(query, mode, officialOnly) {
  const jobs=[wiki(query,'vi'),duck(query),wiki(query,'en')];
  if (medicalMode(mode,query)) jobs.unshift(pubmed(query));
  let sources=dedupe((await Promise.all(jobs)).flat());
  if (officialOnly) {
    const official=sources.filter(s=>OFFICIAL_DOMAINS.some(d=>s.domain===d||s.domain.endsWith(`.${d}`)));
    if (official.length) sources=official;
  }
  return { sources, answer:extractive(query,sources) };
}

async function geminiGrounded(query, mode, officialOnly, driveContext=[]) {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  const route = modelForRequest(query, mode, officialOnly, driveContext);
  const domainHint = officialOnly ? `Ưu tiên nguồn chính thức Việt Nam: ${OFFICIAL_DOMAINS.join(', ')}.` : medicalMode(mode,query) ? 'Ưu tiên PubMed, WHO và Bộ Y tế.' : '';
  const maxContext = route.costTier === 'economy' ? 12000 : MAX_CONTEXT;
  const context = (Array.isArray(driveContext) ? driveContext : []).map((s,i)=>`[DRIVE-${i+1}] ${clean(s?.title,180)}\n${clean(s?.text,4500)}`).join('\n\n').slice(0,maxContext);
  const prompt = `Bạn là Trưởng phòng A.I. Trả lời câu hỏi bằng tiếng Việt, chính xác, bám sát ngữ cảnh và đủ ý. Dùng Google Search khi cần dữ kiện hiện hành. ${domainHint}\nKhông bịa dữ kiện. Không xuất raw HTML/XML/JS. Drive context chỉ là ngữ cảnh nội bộ; với dữ kiện hiện hành phải kiểm chứng nguồn web khi phù hợp.\n\nCÂU HỎI: ${clean(query,MAX_QUERY)}\n\nDRIVE CONTEXT:\n${context}`;
  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(route.model)}:generateContent`);
  const response = await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{maxOutputTokens:route.costTier==='economy'?1600:3000}}),signal:AbortSignal.timeout(route.costTier==='economy'?18000:30000)});
  if (!response.ok) return null;
  const data = await response.json();
  const candidate=data?.candidates?.[0] || {};
  const answer=stripMarkup(candidate?.content?.parts?.map(p=>p?.text || '').join('') || '');
  const chunks=candidate?.groundingMetadata?.groundingChunks || [];
  const sources=chunks.map((c,i)=>({kind:'grounded-web',source:'Google Search',title:clean(c?.web?.title || `Nguồn ${i+1}`,240),url:clean(c?.web?.uri || '',2048),domain:sourceDomain(c?.web?.uri || ''),text:''})).filter(s=>s.url);
  return answer ? {provider:'gemini-google-search',model:route.model,costTier:route.costTier,answer,sources} : null;
}

export default async function handler(req,res) {
  if (req.method !== 'POST') return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  const query=clean(req.body?.query,MAX_QUERY);
  if (!query) return json(res,400,{error:'QUERY_REQUIRED'});
  const mode=clean(req.body?.mode,80) || 'general_question';
  const officialOnly=Boolean(req.body?.officialOnly);
  const driveContext=Array.isArray(req.body?.driveContext) ? req.body.driveContext.slice(0,6) : [];
  try {
    if (publicFirstEligible(query,mode,officialOnly,driveContext)) {
      const fast=await publicExtractive(query,mode,officialOnly);
      if (fast.answer && fast.sources.length) {
        return json(res,200,{configured:true,provider:'public-extractive',costTier:'zero-model',geminiConfigured:Boolean(process.env.GEMINI_API_KEY),primaryModel:primaryModel(),economyModel:economyModel(),answer:fast.answer,sources:fast.sources.slice(0,8),limitations:[]});
      }
    }

    const grounded=await geminiGrounded(query,mode,officialOnly,driveContext);
    if (grounded) return json(res,200,{configured:true,...grounded});

    const fallback=await publicExtractive(query,mode,officialOnly);
    return json(res,200,{configured:true,provider:'public-extractive',costTier:'zero-model',geminiConfigured:Boolean(process.env.GEMINI_API_KEY),primaryModel:primaryModel(),economyModel:economyModel(),answer:fallback.answer || '',sources:fallback.sources.slice(0,8),limitations: fallback.answer ? [] : ['Không có nguồn public đủ liên quan từ fallback hiện tại; không tạo câu trả lời giả.']});
  } catch(error) {
    console.error('research_v24_error',{message:String(error?.message || error).slice(0,220)});
    return json(res,502,{error:'RESEARCH_FAILED'});
  }
}
