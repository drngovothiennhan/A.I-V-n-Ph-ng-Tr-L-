const MAX_QUERY = 1600;
const MAX_CONTEXT = 24000;
const OFFICIAL_DOMAINS = ['vbpl.vn','vanban.chinhphu.vn','chinhphu.vn','moh.gov.vn'];
const MEDICAL_DOMAINS = ['pubmed.ncbi.nlm.nih.gov','who.int','moh.gov.vn'];

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

async function fetchJson(url, timeout=9000) {
  const response = await fetch(url, { headers:{'user-agent':'AI-Office-Research/2.0'}, signal:AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  return response.json();
}

async function wiki(query, lang='vi') {
  try {
    const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    u.search = new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrlimit:'3',prop:'extracts|info',exintro:'1',explaintext:'1',inprop:'url',format:'json',origin:'*'});
    const data = await fetchJson(u.toString());
    return Object.values(data?.query?.pages || {}).map(p => ({kind:'web',source:`Wikipedia ${lang.toUpperCase()}`,title:p.title || '',url:p.fullurl || `https://${lang}.wikipedia.org/?curid=${p.pageid}`,domain:`${lang}.wikipedia.org`,text:stripMarkup(p.extract || '').slice(0,4000)})).filter(s=>s.text);
  } catch { return []; }
}

async function duck(query) {
  try {
    const u = new URL('https://api.duckduckgo.com/');
    u.search = new URLSearchParams({q:query,format:'json',no_html:'1',no_redirect:'1',skip_disambig:'0'});
    const data = await fetchJson(u.toString());
    if (!data?.AbstractText) return [];
    return [{kind:'web',source:data.AbstractSource || 'DuckDuckGo',title:data.Heading || query,url:data.AbstractURL || '',domain:sourceDomain(data.AbstractURL || ''),text:stripMarkup(data.AbstractText).slice(0,4000)}];
  } catch { return []; }
}

async function pubmed(query) {
  try {
    const s = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    s.search = new URLSearchParams({db:'pubmed',term:query,retmax:'4',sort:'relevance',retmode:'json'});
    const result = await fetchJson(s.toString());
    const ids = result?.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const u = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    u.search = new URLSearchParams({db:'pubmed',id:ids.join(','),retmode:'json'});
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

async function geminiGrounded(query, mode, officialOnly, driveContext=[]) {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const domainHint = officialOnly ? `Ưu tiên nguồn chính thức Việt Nam: ${OFFICIAL_DOMAINS.join(', ')}.` : medicalMode(mode,query) ? `Ưu tiên PubMed, WHO và Bộ Y tế.` : '';
  const context = (Array.isArray(driveContext) ? driveContext : []).map((s,i)=>`[DRIVE-${i+1}] ${clean(s?.title,180)}\n${clean(s?.text,4500)}`).join('\n\n').slice(0,MAX_CONTEXT);
  const prompt = `Bạn là Trưởng phòng A.I. Trả lời câu hỏi bằng tiếng Việt, chính xác, ngắn gọn nhưng đủ ý. Dùng Google Search khi cần dữ kiện hiện hành. ${domainHint}\nKhông bịa dữ kiện. Không xuất raw HTML/XML/JS. Drive context chỉ là ngữ cảnh nội bộ; với dữ kiện hiện hành phải kiểm chứng nguồn web khi phù hợp.\n\nCÂU HỎI: ${clean(query,MAX_QUERY)}\n\nDRIVE CONTEXT:\n${context}`;
  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  endpoint.searchParams.set('key',key);
  const response = await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:0.12,maxOutputTokens:4096}}),signal:AbortSignal.timeout(30000)});
  if (!response.ok) return null;
  const data = await response.json();
  const candidate=data?.candidates?.[0] || {};
  const answer=stripMarkup(candidate?.content?.parts?.map(p=>p?.text || '').join('') || '');
  const chunks=candidate?.groundingMetadata?.groundingChunks || [];
  const sources=chunks.map((c,i)=>({kind:'grounded-web',source:'Google Search',title:clean(c?.web?.title || `Nguồn ${i+1}`,240),url:clean(c?.web?.uri || '',2048),domain:sourceDomain(c?.web?.uri || ''),text:''})).filter(s=>s.url);
  return answer ? {provider:'gemini-google-search',model,answer,sources} : null;
}

export default async function handler(req,res) {
  if (req.method !== 'POST') return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  const query=clean(req.body?.query,MAX_QUERY);
  if (!query) return json(res,400,{error:'QUERY_REQUIRED'});
  const mode=clean(req.body?.mode,80) || 'general_question';
  const officialOnly=Boolean(req.body?.officialOnly);
  const driveContext=Array.isArray(req.body?.driveContext) ? req.body.driveContext.slice(0,6) : [];
  try {
    const grounded=await geminiGrounded(query,mode,officialOnly,driveContext);
    if (grounded) return json(res,200,{configured:true,...grounded});

    const jobs=[wiki(query,'vi'),duck(query),wiki(query,'en')];
    if (medicalMode(mode,query)) jobs.unshift(pubmed(query));
    let sources=dedupe((await Promise.all(jobs)).flat());
    if (officialOnly) {
      const official=sources.filter(s=>OFFICIAL_DOMAINS.some(d=>s.domain===d||s.domain.endsWith(`.${d}`)));
      if (official.length) sources=official;
    }
    const answer=extractive(query,sources);
    return json(res,200,{configured:true,provider:'public-extractive',geminiConfigured:Boolean(process.env.GEMINI_API_KEY),answer:answer || '',sources:sources.slice(0,8),limitations: answer ? [] : ['Không có nguồn public đủ liên quan từ fallback hiện tại; không tạo câu trả lời giả.']});
  } catch(error) {
    console.error('research_v20_error',{message:String(error?.message || error).slice(0,220)});
    return json(res,502,{error:'RESEARCH_FAILED'});
  }
}
