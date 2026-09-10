const VERSION='2.3-render-xiaozhi-direct';
const RENDER_WS='wss://ai-office-xiaozhi-gateway.onrender.com/xiaozhi/v1/';
let attached=false;

function setStatus(text){
  const s=document.getElementById('v19Status');
  if(s)s.textContent=`v2.3 · ${text}`;
}

function connectDirect(){
  if(attached)return true;
  const voice=window.AIOfficeV19?.voice;
  if(!voice)return false;
  attached=true;
  voice.wsUrl=RENDER_WS;
  voice.addEventListener('state',(event)=>{
    const state=event?.detail?.state||'';
    if(state==='connected')setStatus('XiaoZhi Render connected');
    else if(state==='connecting')setStatus('Đang nối XiaoZhi Render…');
    else if(state==='fallback')setStatus('Voice browser fallback');
  });
  voice.addEventListener('error',()=>setStatus('XiaoZhi lỗi · dùng browser fallback'));
  try{voice.connect();}catch{setStatus('Voice browser fallback');}
  window.AIOfficeVoiceRender={version:VERSION,wsUrl:RENDER_WS,voice};
  return true;
}

for(let i=0;i<80&&!connectDirect();i++)await new Promise(r=>setTimeout(r,50));

export { VERSION, RENDER_WS, connectDirect };
