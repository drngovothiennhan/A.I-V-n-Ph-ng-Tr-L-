function normalizeSpeech(text='') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
}

function echoSimilarity(candidate='', spoken='') {
  const a=normalizeSpeech(candidate).split(' ').filter(x=>x.length>2);
  const b=new Set(normalizeSpeech(spoken).split(' ').filter(x=>x.length>2));
  if (!a.length || !b.size) return 0;
  return a.reduce((n,w)=>n+(b.has(w)?1:0),0)/a.length;
}

export class XiaozhiVoiceFabric extends EventTarget {
  constructor({wsUrl=null,language='vi-VN',reconnectBaseMs=800,reconnectMaxMs=15000}={}) {
    super();
    this.wsUrl=wsUrl;
    this.language=language;
    this.reconnectBaseMs=reconnectBaseMs;
    this.reconnectMaxMs=reconnectMaxMs;
    this.ws=null;
    this.manualClose=false;
    this.reconnectAttempt=0;
    this.reconnectTimer=null;
    this.heartbeat=null;
    this.lastPongAt=0;
    this.recognition=null;
    this.recognitionActive=false;
    this.state='idle';
    this.speaking=false;
    this.currentSpeech='';
    this.resumeListeningAfterSpeech=false;
    this.onlineHandler=()=>{
      if(this.manualClose||!this.wsUrl)return;
      if(this.ws&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.ws.readyState))return;
      if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
      this.reconnectAttempt=0;
      this.connect();
    };
    window.addEventListener('online',this.onlineHandler);
    window.addEventListener('offline',()=>{
      if(!this.manualClose)this.emitState('fallback',{reason:'network_offline'});
    });
    this.initBrowserFallback();
  }

  emitState(state,detail={}) {
    this.state=state;
    this.dispatchEvent(new CustomEvent('state',{detail:{state,...detail}}));
  }

  likelyEcho(text='') {
    const n=normalizeSpeech(text);
    if (!this.speaking || n.length<4 || !this.currentSpeech) return false;
    if (normalizeSpeech(this.currentSpeech).includes(n) && n.split(' ').length<=8) return true;
    return echoSimilarity(text,this.currentSpeech)>=0.72;
  }

  cancelSpeech({keepListening=true,reason='barge_in'}={}) {
    if (!this.speaking && !window.speechSynthesis?.speaking) return false;
    try { window.speechSynthesis?.cancel(); } catch {}
    this.speaking=false;
    this.currentSpeech='';
    this.dispatchEvent(new CustomEvent('interrupt',{detail:{reason}}));
    if (!keepListening) this.stopBrowserListening();
    else if (!this.recognitionActive) setTimeout(()=>this.startBrowserListening(),80);
    return true;
  }

  initBrowserFallback() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return;
    const r=new SR();
    r.lang=this.language;
    r.continuous=true;
    r.interimResults=true;
    r.onstart=()=>{this.recognitionActive=true;if(!this.speaking)this.emitState('browser-listening',{provider:'browser'})};
    r.onresult=(event)=>{
      let interim='',finalText='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const text=event.results[i][0]?.transcript||'';
        if(event.results[i].isFinal)finalText+=text;else interim+=text;
      }
      if(interim){
        if(this.speaking&&this.likelyEcho(interim))return;
        if(this.speaking)this.cancelSpeech({keepListening:true,reason:'voice_barge_in'});
        this.dispatchEvent(new CustomEvent('partial',{detail:{text:interim,provider:'browser'}}));
      }
      if(finalText){
        if(this.speaking&&this.likelyEcho(finalText))return;
        if(this.speaking)this.cancelSpeech({keepListening:true,reason:'voice_barge_in'});
        this.dispatchEvent(new CustomEvent('transcript',{detail:{text:finalText,provider:'browser'}}));
      }
    };
    r.onerror=(event)=>this.dispatchEvent(new CustomEvent('error',{detail:{provider:'browser',error:event.error}}));
    r.onend=()=>{
      this.recognitionActive=false;
      if(this.speaking&&this.resumeListeningAfterSpeech){setTimeout(()=>this.startBrowserListening(),100);return}
      if(this.state==='browser-listening')this.emitState('idle');
    };
    this.recognition=r;
  }

  connect() {
    if(!this.wsUrl){this.emitState('fallback',{reason:'xiaozhi_not_configured'});return false}
    if(this.ws&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.ws.readyState))return true;
    if(this.reconnectTimer){clearTimeout(this.reconnectTimer);this.reconnectTimer=null;}
    if(!navigator.onLine){this.emitState('fallback',{reason:'network_offline'});return false;}
    this.manualClose=false;this.emitState('connecting');
    const ws=new WebSocket(this.wsUrl);ws.binaryType='arraybuffer';this.ws=ws;
    ws.onopen=()=>{this.reconnectAttempt=0;this.lastPongAt=Date.now();this.emitState('connected',{provider:'xiaozhi'});this.startHeartbeat();ws.send(JSON.stringify({type:'hello',client:'ai-office-pwa',language:this.language}))};
    ws.onmessage=(event)=>{
      if(typeof event.data==='string'){
        let msg;try{msg=JSON.parse(event.data)}catch{msg={type:'text',text:event.data}}
        if(msg.type==='pong'){this.lastPongAt=Date.now();return;}
        if(msg.type==='ping'){
          this.lastPongAt=Date.now();
          if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'pong',at:Date.now()}));
          return;
        }
        if(msg.type==='partial')this.dispatchEvent(new CustomEvent('partial',{detail:{text:msg.text||'',provider:'xiaozhi'}}));
        else if(msg.type==='transcript')this.dispatchEvent(new CustomEvent('transcript',{detail:{text:msg.text||'',provider:'xiaozhi'}}));
        else if(msg.type==='assistant')this.dispatchEvent(new CustomEvent('assistant',{detail:msg}));
        else this.dispatchEvent(new CustomEvent('message',{detail:msg}));
      }else this.dispatchEvent(new CustomEvent('audio',{detail:{data:event.data,provider:'xiaozhi'}}));
    };
    ws.onerror=()=>this.dispatchEvent(new CustomEvent('error',{detail:{provider:'xiaozhi',error:'websocket'}}));
    ws.onclose=()=>{this.stopHeartbeat();this.ws=null;if(this.manualClose){this.emitState('idle');return}this.emitState('fallback',{reason:'xiaozhi_disconnected'});this.scheduleReconnect()};
    return true;
  }

  scheduleReconnect(){
    if(this.manualClose||!this.wsUrl||this.reconnectTimer)return;
    const n=Math.min(this.reconnectAttempt++,8);
    const wait=Math.min(this.reconnectMaxMs,this.reconnectBaseMs*(2**n))+Math.floor(Math.random()*300);
    this.reconnectTimer=setTimeout(()=>{
      this.reconnectTimer=null;
      if(this.manualClose)return;
      if(navigator.onLine)this.connect();
    },wait);
  }
  startHeartbeat(){
    this.stopHeartbeat();
    this.lastPongAt=Date.now();
    this.heartbeat=setInterval(()=>{
      if(this.ws?.readyState!==WebSocket.OPEN)return;
      if(Date.now()-this.lastPongAt>45000){try{this.ws.close(4000,'heartbeat_timeout')}catch{}return;}
      this.ws.send(JSON.stringify({type:'ping',at:Date.now()}));
    },20000);
  }
  stopHeartbeat(){if(this.heartbeat)clearInterval(this.heartbeat);this.heartbeat=null}
  close(){this.manualClose=true;this.stopHeartbeat();if(this.reconnectTimer)clearTimeout(this.reconnectTimer);this.reconnectTimer=null;if(this.ws)this.ws.close(1000,'client_close');this.ws=null;this.emitState('idle')}

  startBrowserListening(){
    if(!this.recognition){this.emitState('unavailable',{reason:'speech_recognition_unsupported'});return false}
    if(this.recognitionActive)return true;
    try{this.recognition.start();return true}catch{return false}
  }

  stopBrowserListening(){
    try{this.recognition?.stop()}catch{}
    this.recognitionActive=false;
    if(this.state==='browser-listening')this.emitState('idle');
  }

  interrupt(options={}){
    if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({type:'interrupt'}));
    const keepListening=Boolean(options?.keepListening);
    this.cancelSpeech({keepListening,reason:'user_interrupt'});
    if(!keepListening)this.stopBrowserListening();
    return true;
  }

  speak(text,{bargeIn=true,resumeListening=true,rate=1.02}={}){
    const value=String(text||'').trim();
    if(!value||!('speechSynthesis'in window))return false;
    window.speechSynthesis.cancel();
    this.currentSpeech=value;
    this.speaking=true;
    this.resumeListeningAfterSpeech=Boolean(resumeListening);
    const u=new SpeechSynthesisUtterance(value);u.lang=this.language;u.rate=rate;
    const finish=()=>{this.speaking=false;this.currentSpeech='';this.dispatchEvent(new CustomEvent('speech-end'));if(this.resumeListeningAfterSpeech&&!this.recognitionActive)setTimeout(()=>this.startBrowserListening(),160)};
    u.onstart=()=>{this.dispatchEvent(new CustomEvent('speech-start'));this.emitState('speaking',{provider:'browser-tts'});if(bargeIn&&!this.recognitionActive)setTimeout(()=>this.startBrowserListening(),120)};
    u.onend=finish;u.onerror=finish;
    window.speechSynthesis.speak(u);
    return true;
  }
}
