export const ANSWER_POLICY_VERSION='1.0.0-p3';
export const ANSWER_MODES=Object.freeze({DIRECT:'DIRECT',GROUNDED:'GROUNDED',CURRENT:'CURRENT',INTERNAL:'INTERNAL'});

const INTERNAL=/\b(tai lieu noi bo|tai lieu cua co quan|ho so noi bo|drive noi bo|google drive|trong drive|kho kien thuc|du lieu co quan|du lieu to chuc)\b/;
const EXPLICIT_SEARCH=/\b(tra cuu|tim nguon|tim tren web|tim tren internet|search|nghien cuu|kiem chung|doi chieu nguon|nguon chinh thuc|dan nguon|citation|tham khao)\b/;
const CURRENT=/\b(hom nay|bay gio|hien nay|hien hanh|dang co hieu luc|moi nhat|gan day|cap nhat|vua moi|tuan nay|thang nay|nam nay|gia hien tai|lich hom nay|thoi tiet|ty gia|tin moi|latest|current|today|recent)\b/;
const MEDICAL=/\b(y khoa|y hoc|benh|chan doan|dieu tri|thuoc|lieu|tac dung phu|chong chi dinh|xet nghiem|lam sang|benh nhan|suc khoe|duoc|duoc ly|phau thuat|noi tiet|tim mach|than kinh|yhct|y hoc co truyen)\b/;
const LEGAL=/\b(phap luat|nghi dinh|thong tu|luat |dieu luat|quy dinh|van ban quy pham|xu phat|hanh chinh|phap ly|hieu luc|cong bao)\b/;
const FINANCIAL=/\b(dau tu|chung khoan|co phieu|trai phieu|lai suat|thue |bao hiem|tin dung|tai chinh)\b/;
const HIGH_STAKES_ACTION=/\b(nen dung|co nen|lieu dung|ke don|ngung thuoc|thay doi thuoc|tu van dieu tri|ky |gui chinh thuc|nop ho so|cam ket|quyet dinh)\b/;

export function normalizeAnswerText(text=''){
  return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}

export function classifyAnswerPolicy(text='',context={}){
  const n=normalizeAnswerText(text);
  const canonicalType=String(context.canonicalType||context.intentType||'QUESTION').toUpperCase();
  if(canonicalType!=='QUESTION')return Object.freeze({mode:ANSWER_MODES.GROUNDED,reason:'non-question-runtime-owned',requiresSources:false,allowDirect:false});
  if(INTERNAL.test(n))return Object.freeze({mode:ANSWER_MODES.INTERNAL,reason:'explicit-internal-source',requiresSources:true,allowDirect:false});
  if(EXPLICIT_SEARCH.test(n))return Object.freeze({mode:ANSWER_MODES.GROUNDED,reason:'explicit-research-request',requiresSources:true,allowDirect:false});
  if(CURRENT.test(n))return Object.freeze({mode:ANSWER_MODES.CURRENT,reason:'freshness-required',requiresSources:true,allowDirect:false});
  if(MEDICAL.test(n))return Object.freeze({mode:ANSWER_MODES.GROUNDED,reason:HIGH_STAKES_ACTION.test(n)?'medical-high-stakes':'medical-evidence-preferred',requiresSources:true,allowDirect:false});
  if(LEGAL.test(n))return Object.freeze({mode:ANSWER_MODES.GROUNDED,reason:'legal-evidence-required',requiresSources:true,allowDirect:false});
  if(FINANCIAL.test(n))return Object.freeze({mode:ANSWER_MODES.GROUNDED,reason:'financial-evidence-preferred',requiresSources:true,allowDirect:false});
  return Object.freeze({mode:ANSWER_MODES.DIRECT,reason:'stable-general-or-reasoning',requiresSources:false,allowDirect:true});
}

export function shouldDirectAnswer(text='',context={}){return classifyAnswerPolicy(text,context).mode===ANSWER_MODES.DIRECT}
