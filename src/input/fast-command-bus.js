const QUEUE_KEY = 'ai-office-v17-offline-command-queue';

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}
function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-100)));
}

export class FastCommandBus extends EventTarget {
  constructor({ endpoint = '/api/proxy?op=chief' } = {}) {
    super();
    this.endpoint = endpoint;
    this.active = null;
    this.sequence = 0;
    window.addEventListener('online', () => this.flush());
  }

  cancel(reason = 'superseded') {
    if (this.active) {
      this.active.abort(reason);
      this.active = null;
    }
  }

  async send(message, extra = {}) {
    const text = String(message || '').trim();
    if (!text) throw new Error('EMPTY_COMMAND');

    if (!navigator.onLine) {
      const q = readQueue();
      q.push({ id: crypto.randomUUID?.() || `${Date.now()}`, message: text, extra, at: new Date().toISOString() });
      writeQueue(q);
      this.dispatchEvent(new CustomEvent('queued', { detail: { message: text } }));
      return { queued: true };
    }

    this.cancel();
    const controller = new AbortController();
    this.active = controller;
    const seq = ++this.sequence;
    const started = performance.now();
    this.dispatchEvent(new CustomEvent('start', { detail: { seq, message: text } }));

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chief', message: text, ...extra }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      this.dispatchEvent(new CustomEvent('result', {
        detail: { seq, data, latencyMs: Math.round(performance.now() - started) }
      }));
      return data;
    } finally {
      if (this.active === controller) this.active = null;
    }
  }

  async flush() {
    if (!navigator.onLine) return;
    const queue = readQueue();
    if (!queue.length) return;
    writeQueue([]);
    for (const item of queue) {
      try { await this.send(item.message, { ...item.extra, replayedFromOffline: true }); }
      catch {
        const rest = readQueue();
        rest.unshift(item);
        writeQueue(rest);
        break;
      }
    }
  }
}
