import v29 from './research-v29.js';

const VERSION='3.0.0-freshness-entry';
const FRESH_HINTS=['moi nhat','hom nay','hien nay','gan day','vua ','tin moi','tin tuc','thoi su','latest','today','recent','news'];

function normalize(text=''){
  return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}
function robustLatest(text=''){
  const n=normalize(text);
  return FRESH_HINTS.some(h=>n.includes(h));
}

export default async function handler(req,res){
  if(req.method!=='POST')return v29(req,res);
  const original=String(req.body?.query||'').trim();
  if(!robustLatest(original))return v29(req,res);
  const body=req.body||{};
  // v29's freshness branch recognizes the ASCII sentinel while retaining the user's original Vietnamese query.
  // This protects routing against Unicode word-boundary differences introduced by browser/runtime normalization.
  req.body={...body,query:`${original} news`};
  res.setHeader('x-ai-office-freshness-entry',VERSION);
  try{return await v29(req,res)}finally{req.body=body}
}

export {VERSION,robustLatest};
