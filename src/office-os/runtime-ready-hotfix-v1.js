export const OFFICE_OS_RUNTIME_HOTFIX_VERSION='1.0.0';

const CHAT_KEY='ai-office-conversation-v19';
const BAD_OBJECT='[object Object]';
const RUNTIME_ERROR_PREFIX='Bộ não điều phối chưa sẵn sàng.';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function cleanText(value='',limit=12000){
  return String(value??'').replace(/\s+/g,' ').trim().slice(0,limit);
}

function cleanBrokenHistory(){
  try{
    const raw=JSON.parse(localStorage.getItem(CHAT_KEY)||'[]');
    if(!Array.isArray(raw))return;
    const cleaned=raw.filter(item=>{
      if(item?.role!=='assistant')return true;
      const text=cleanText(item?.text||'');
      return text!==BAD_OBJECT&&!text.startsWith(RUNTIME_ERROR_PREFIX);
    });
    if(cleaned.length!==raw.length)localStorage.setItem(CHAT_KEY,JSON.stringify(cleaned.slice(-30)));
  }catch{}
}

function resultText(result){
  if(result==null)return '';
  if(typeof result==='string')return cleanText(result);
  if(typeof result!=='object')return cleanText(result);

  const answer=typeof result.answer==='string'?cleanText(result.answer):'';
  const task=result.task&&typeof result.task==='object'?result.task:result;
  const output=typeof task?.outputDraft==='string'?cleanText(task.outputDraft):'';
  const message=typeof task?.message==='string'?cleanText(task.message):'';
  const status=cleanText(task?.status||'');

  if(answer&&output)return `${answer}\n\n${output}`.slice(0,12000);
  if(answer)return answer;
  if(output)return output;
  if(message)return message;
  if(status==='awaiting_approval')return 'Đã xử lý nhiệm vụ và đang chờ duyệt.';
  if(status==='awaiting_input')return 'Đã hiểu nhiệm vụ và đang chờ dữ liệu đầu vào.';
  if(status==='completed')return 'Nhiệm vụ đã hoàn tất.';
  if(status==='cancelled')return 'Nhiệm vụ đã được hủy.';
  return '';
}

async function waitForCanonicalRuntime(timeoutMs=12000){
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    if(window.AIOfficeV22?.handleMessage&&window.AIOfficeCanonicalInputGate?.dispatch)return true;
    await sleep(40);
  }
  return false;
}

function patchCanonicalGate(){
  const gate=window.AIOfficeCanonicalInputGate;
  if(!gate?.dispatch||gate.__officeOsRuntimeReadyHotfix)return false;
  const original=gate.dispatch.bind(gate);
  gate.dispatch=async (...args)=>{
    await waitForCanonicalRuntime();
    const result=await original(...args);
    return resultText(result);
  };
  gate.__officeOsRuntimeReadyHotfix=OFFICE_OS_RUNTIME_HOTFIX_VERSION;
  return true;
}

function install(){
  if(typeof window==='undefined')return false;
  cleanBrokenHistory();
  if(patchCanonicalGate())return true;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(patchCanonicalGate()||attempts>=300)clearInterval(timer);
  },40);
  return true;
}

install();

window.AIOfficeOfficeOSRuntimeHotfix=Object.freeze({
  version:OFFICE_OS_RUNTIME_HOTFIX_VERSION,
  resultText,
  cleanBrokenHistory
});
