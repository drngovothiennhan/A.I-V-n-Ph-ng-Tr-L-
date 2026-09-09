export class XiaozhiVoiceFabric extends EventTarget {
  constructor({
    wsUrl = null,
    language = 'vi-VN',
    reconnectBaseMs = 800,
    reconnectMaxMs = 15000
  } = {}) {
    super();
    this.wsUrl = wsUrl;
    this.language = language;
    this.reconnectBaseMs = reconnectBaseMs;
    this.reconnectMaxMs = reconnectMaxMs;
    this.ws = null;
    this.manualClose = false;
    this.reconnectAttempt = 0;
    this.heartbeat = null;
    this.recognition = null;
    this.state = 'idle';
    this.initBrowserFallback();
  }

  emitState(state, detail = {}) {
    this.state = state;
    this.dispatchEvent(new CustomEvent('state', { detail: { state, ...detail } }));
  }

  initBrowserFallback() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = this.language;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      let interim = '', finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += text;
        else interim += text;
      }
      if (interim) this.dispatchEvent(new CustomEvent('partial', { detail: { text: interim, provider: 'browser' } }));
      if (finalText) this.dispatchEvent(new CustomEvent('transcript', { detail: { text: finalText, provider: 'browser' } }));
    };
    r.onerror = (event) => this.dispatchEvent(new CustomEvent('error', { detail: { provider: 'browser', error: event.error } }));
    r.onend = () => { if (this.state === 'browser-listening') this.emitState('idle'); };
    this.recognition = r;
  }

  connect() {
    if (!this.wsUrl) {
      this.emitState('fallback', { reason: 'xiaozhi_not_configured' });
      return false;
    }
    if (this.ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) return true;
    this.manualClose = false;
    this.emitState('connecting');
    const ws = new WebSocket(this.wsUrl);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.emitState('connected', { provider: 'xiaozhi' });
      this.startHeartbeat();
      ws.send(JSON.stringify({ type: 'hello', client: 'ai-office-pwa', language: this.language }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        let msg;
        try { msg = JSON.parse(event.data); } catch { msg = { type: 'text', text: event.data }; }
        if (msg.type === 'partial') this.dispatchEvent(new CustomEvent('partial', { detail: { text: msg.text || '', provider: 'xiaozhi' } }));
        else if (msg.type === 'transcript') this.dispatchEvent(new CustomEvent('transcript', { detail: { text: msg.text || '', provider: 'xiaozhi' } }));
        else if (msg.type === 'assistant') this.dispatchEvent(new CustomEvent('assistant', { detail: msg }));
        else if (msg.type === 'pong') {/* heartbeat acknowledged */}
        else this.dispatchEvent(new CustomEvent('message', { detail: msg }));
      } else {
        this.dispatchEvent(new CustomEvent('audio', { detail: { data: event.data, provider: 'xiaozhi' } }));
      }
    };

    ws.onerror = () => this.dispatchEvent(new CustomEvent('error', { detail: { provider: 'xiaozhi', error: 'websocket' } }));
    ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      if (this.manualClose) {
        this.emitState('idle');
        return;
      }
      this.emitState('fallback', { reason: 'xiaozhi_disconnected' });
      this.scheduleReconnect();
    };
    return true;
  }

  scheduleReconnect() {
    if (this.manualClose || !this.wsUrl) return;
    const n = Math.min(this.reconnectAttempt++, 8);
    const wait = Math.min(this.reconnectMaxMs, this.reconnectBaseMs * (2 ** n)) + Math.floor(Math.random() * 300);
    setTimeout(() => { if (!this.manualClose && navigator.onLine) this.connect(); }, wait);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'ping', at: Date.now() }));
    }, 20000);
  }

  stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  close() {
    this.manualClose = true;
    this.stopHeartbeat();
    if (this.ws) this.ws.close(1000, 'client_close');
    this.ws = null;
    this.emitState('idle');
  }

  startBrowserListening() {
    if (!this.recognition) {
      this.emitState('unavailable', { reason: 'speech_recognition_unsupported' });
      return false;
    }
    try {
      this.recognition.start();
      this.emitState('browser-listening', { provider: 'browser' });
      return true;
    } catch {
      return false;
    }
  }

  stopBrowserListening() {
    try { this.recognition?.stop(); } catch {}
    if (this.state === 'browser-listening') this.emitState('idle');
  }

  interrupt() {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'interrupt' }));
    this.stopBrowserListening();
    window.speechSynthesis?.cancel();
    this.dispatchEvent(new CustomEvent('interrupt'));
  }

  speak(text) {
    const value = String(text || '').trim();
    if (!value || !('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(value);
    u.lang = this.language;
    window.speechSynthesis.speak(u);
    return true;
  }
}
