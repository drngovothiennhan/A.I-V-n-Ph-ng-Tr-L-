import { isWeatherQuery, explicitPlaceFromWeather } from './interaction-policy-v21.js';

const VERSION='2.1-weather-bridge';
const LOCATION_KEY='ai-office-weather-location-v21';
const esc=(text='')=>String(text).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let busy=false;
let resolveLocation=null;

function featureAllowsGeolocation(){
  try{
    if(document.featurePolicy?.allowsFeature)return document.featurePolicy.allowsFeature('geolocation');
    if(document.permissionsPolicy?.allowsFeature)return document.permissionsPolicy.allowsFeature('geolocation');
  }catch{}
  return false;
}

function render(answer,source=null){
  const clean=String(answer||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const bubble=document.getElementById('bubble');
  const box=document.getElementById('answer');
  const status=document.getElementById('v19Status');
  if(bubble)bubble.textContent=clean;
  if(box){
    let ref='';
    if(source?.url)ref=`<div class="ai19Sources">Nguồn: <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open-Meteo Forecast</a></div>`;
    box.innerHTML=`<div class="ai19Answer"><b>Trưởng phòng A.I</b><div style="margin-top:5px">${esc(clean)}</div>${ref}</div>`;
  }
  if(status)status.textContent='Sẵn sàng · Weather intent';
  return clean;
}

function injectModal(){
  if(document.getElementById('ai21WeatherLocation'))return;
  const style=document.createElement('style');
  style.id='ai21-weather-style';
  style.textContent=`#ai21WeatherLocation{position:fixed;inset:0;z-index:1100;display:none;place-items:center;padding:18px;background:#111a365e;backdrop-filter:blur(6px)}#ai21WeatherLocation.show{display:grid}#ai21WeatherLocation .panel{width:min(440px,100%);background:#fff;border:1px solid #dce5f7;border-radius:20px;padding:18px;box-shadow:0 24px 70px #15244935}#ai21WeatherLocation h3{margin:0 0 7px;font-size:17px}#ai21WeatherLocation p{margin:0 0 11px;color:#66708b;font-size:11px;line-height:1.5}#ai21WeatherLocation input{width:100%;border:1px solid #dce5f7;border-radius:11px;padding:11px 12px;font:inherit;font-size:11px;outline:none}#ai21WeatherLocation input:focus{border-color:#6689ef;box-shadow:0 0 0 3px #315fe814}#ai21WeatherLocation .privacy{font-size:8px;color:#7a849d;background:#f5f7fc;border-radius:9px;padding:8px;margin-top:8px}#ai21WeatherLocation .buttons{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;margin-top:13px}#ai21WeatherLocation button{border:1px solid #dce5f7;background:#fff;color:#445275;border-radius:10px;padding:9px 11px;font-weight:850;cursor:pointer}#ai21WeatherLocation .primary{background:#315fe8;color:#fff;border-color:#315fe8}`;
  document.head.appendChild(style);
  const modal=document.createElement('div');
  modal.id='ai21WeatherLocation';
  modal.innerHTML='<div class="panel" role="dialog" aria-modal="true"><h3>Cần vị trí để trả lời chính xác</h3><p>Câu hỏi thời tiết không nêu địa điểm. Hãy nhập khu vực hoặc cho phép dùng vị trí thiết bị khi trình duyệt hỗ trợ.</p><input id="ai21WeatherPlace" autocomplete="address-level2" placeholder="Ví dụ: Phường Tam Bình, TP.HCM"><div class="privacy">Vị trí chỉ dùng cho dự báo thời tiết và được lưu trong phiên hiện tại; không đưa vào Drive hay dữ liệu học.</div><div class="buttons"><button id="ai21WeatherCancel">Hủy</button><button id="ai21WeatherDevice">Dùng vị trí thiết bị</button><button class="primary" id="ai21WeatherUse">Dùng địa điểm này</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('#ai21WeatherCancel').onclick=()=>finishLocation(null);
  modal.querySelector('#ai21WeatherUse').onclick=()=>{const value=modal.querySelector('#ai21WeatherPlace').value.trim();if(value)finishLocation({kind:'place',value})};
  modal.querySelector('#ai21WeatherPlace').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const value=e.currentTarget.value.trim();if(value)finishLocation({kind:'place',value})}};
  modal.querySelector('#ai21WeatherDevice').onclick=()=>finishLocation({kind:'device'});
  modal.addEventListener('click',e=>{if(e.target===modal)finishLocation(null)});
}

function finishLocation(value){
  const modal=document.getElementById('ai21WeatherLocation');
  modal?.classList.remove('show');
  const resolve=resolveLocation;resolveLocation=null;resolve?.(value);
}

function askLocation(){
  injectModal();
  const modal=document.getElementById('ai21WeatherLocation');
  const device=modal.querySelector('#ai21WeatherDevice');
  device.hidden=!featureAllowsGeolocation();
  modal.classList.add('show');
  setTimeout(()=>modal.querySelector('#ai21WeatherPlace')?.focus(),40);
  return new Promise(resolve=>{resolveLocation=resolve});
}

async function geocode(place){
  const u=new URL('https://geocoding-api.open-meteo.com/v1/search');
  u.search=new URLSearchParams({name:place,count:'5',language:'vi',format:'json'});
  const r=await fetch(u.toString(),{cache:'no-store'});if(!r.ok)throw new Error(`GEOCODE_${r.status}`);
  const data=await r.json();const p=data?.results?.[0];if(!p)return null;
  return {lat:p.latitude,lon:p.longitude,label:[p.name,p.admin1,p.country].filter(Boolean).join(', ')};
}

async function devicePosition(){
  if(!featureAllowsGeolocation()||!navigator.geolocation)throw new Error('DEVICE_LOCATION_DISABLED');
  const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:600000}));
  return {lat:p.coords.latitude,lon:p.coords.longitude,label:'vị trí hiện tại của bạn'};
}

function cachedLocation(){
  try{const c=JSON.parse(sessionStorage.getItem(LOCATION_KEY)||'null');return c&&Date.now()-c.at<45*60*1000?c:null}catch{return null}
}
function saveLocation(loc){try{sessionStorage.setItem(LOCATION_KEY,JSON.stringify({...loc,at:Date.now()}))}catch{}}

function weatherDescription(code){
  const c=Number(code);
  if(c===0)return 'trời quang'; if([1,2,3].includes(c))return 'có mây'; if([45,48].includes(c))return 'có sương mù';
  if([51,53,55,56,57].includes(c))return 'có mưa phùn'; if([61,63,65,66,67].includes(c))return 'có mưa';
  if([80,81,82].includes(c))return 'có mưa rào'; if([95,96,99].includes(c))return 'có dông'; return 'thời tiết biến đổi';
}

async function forecast(loc){
  const u=new URL('https://api.open-meteo.com/v1/forecast');
  u.search=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lon),current:'temperature_2m,apparent_temperature,precipitation,rain,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,rain_sum',timezone:'auto',forecast_days:'2'});
  const r=await fetch(u.toString(),{cache:'no-store'});if(!r.ok)throw new Error(`WEATHER_${r.status}`);return {data:await r.json(),url:u.toString()};
}

async function resolveWeatherLocation(text){
  const explicit=explicitPlaceFromWeather(text);if(explicit){const loc=await geocode(explicit);if(loc)return loc;throw new Error('PLACE_NOT_FOUND')}
  const cached=cachedLocation();if(cached)return cached;
  while(true){
    const choice=await askLocation();if(!choice)throw new Error('LOCATION_CANCELLED');
    if(choice.kind==='device'){
      try{const loc=await devicePosition();saveLocation(loc);return loc}catch{render('Trình duyệt hiện chưa cho phép vị trí thiết bị. Hãy nhập địa điểm để tôi dự báo chính xác.');continue}
    }
    const loc=await geocode(choice.value);if(loc){saveLocation(loc);return loc}
    render(`Không xác định chắc chắn địa điểm “${choice.value}”. Hãy nhập rõ hơn, ví dụ quận/huyện và tỉnh/thành.`);
  }
}

export async function handleWeather(text){
  if(!isWeatherQuery(text)||busy)return false;
  busy=true;
  const status=document.getElementById('v19Status');if(status)status.textContent='Đang lấy dự báo thời tiết…';
  try{
    const loc=await resolveWeatherLocation(text);
    const {data,url}=await forecast(loc);const cur=data.current||{},daily=data.daily||{};
    const prob=Number(daily.precipitation_probability_max?.[0]??0),sum=Number(daily.precipitation_sum?.[0]??0),rain=Number(daily.rain_sum?.[0]??0);
    const min=Number(daily.temperature_2m_min?.[0]),max=Number(daily.temperature_2m_max?.[0]);const nowRain=Number(cur.rain||0)>0.05||Number(cur.precipitation||0)>0.05;
    let verdict=prob>=60||rain>0.5?'Có khả năng mưa đáng kể':prob>=35||sum>0.2?'Có khả năng mưa':prob>=20?'Khả năng mưa thấp':'Khả năng mưa thấp';if(nowRain)verdict='Hiện đang có mưa hoặc mưa rất gần khu vực này';
    render(`${verdict} tại ${loc.label}. Xác suất mưa tối đa hôm nay khoảng ${Math.round(prob)}%, lượng mưa dự kiến ${sum.toFixed(1)} mm. Hiện tại ${weatherDescription(cur.weather_code)}, khoảng ${cur.temperature_2m??'—'}°C; nhiệt độ hôm nay khoảng ${min.toFixed(0)}–${max.toFixed(0)}°C.`,{url});
    return true;
  }catch(error){
    const code=String(error?.message||error);
    if(code==='LOCATION_CANCELLED')render('Đã hủy yêu cầu vị trí. Tôi chưa thể trả lời “có mưa không” khi chưa biết khu vực. Bạn có thể hỏi lại kèm địa điểm.');
    else if(code==='PLACE_NOT_FOUND')render('Tôi chưa xác định được địa điểm trong câu hỏi. Hãy ghi rõ quận/huyện và tỉnh/thành.');
    else render('Tôi chưa lấy được dự báo thời tiết lúc này. Tôi sẽ không thay thế bằng các bài viết chỉ có từ khóa “mưa”.');
    return true;
  }finally{busy=false}
}

function installTextInterceptors(){
  window.addEventListener('click',async event=>{
    const send=event.target?.closest?.('#send');if(!send)return;const input=document.getElementById('msg');const text=input?.value?.trim()||'';if(!isWeatherQuery(text))return;
    event.preventDefault();event.stopImmediatePropagation();if(input)input.value='';await handleWeather(text);
  },true);
  window.addEventListener('keydown',async event=>{
    if(event.target?.id!=='msg'||event.key!=='Enter'||!(event.ctrlKey||event.metaKey))return;const text=event.target.value?.trim()||'';if(!isWeatherQuery(text))return;
    event.preventDefault();event.stopImmediatePropagation();event.target.value='';await handleWeather(text);
  },true);
}

export function patchVoice(){
  const voice=window.AIOfficeV19?.voice;if(!voice||voice.__weatherBridgePatched)return;
  const previous=voice.dispatchEvent?.bind(voice);if(!previous)return;
  voice.dispatchEvent=event=>{
    if(event?.type==='transcript'){
      const text=String(event?.detail?.text||'').trim();if(text&&isWeatherQuery(text)){const input=document.getElementById('msg');if(input)input.value=text;handleWeather(text).catch(console.error);return true}
    }
    return previous(event);
  };
  voice.__weatherBridgePatched=true;
}

injectModal();installTextInterceptors();
window.AIOfficeWeatherBridge={version:VERSION,handleWeather,patchVoice,isWeatherQuery};
