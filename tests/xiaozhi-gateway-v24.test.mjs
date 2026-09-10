import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';

const PORT = 18761;
const ORIGIN = 'https://ai-van-phong-tro-ly.vercel.app';
const child = spawn(process.execPath, ['services/xiaozhi-render/server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(PORT),
    XIAOZHI_WS_TOKEN: 'test-gateway-token',
    XIAOZHI_PROTOCOL_VERSION: '1',
    XIAOZHI_UPSTREAM_WS_URL: '',
    XIAOZHI_UPSTREAM_TOKEN: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';
child.stdout.on('data', chunk => { stdout += chunk.toString(); });
child.stderr.on('data', chunk => { stderr += chunk.toString(); });

async function waitForStarted() {
  const started = Date.now();
  while (!stdout.includes('"event":"started"')) {
    if (child.exitCode !== null) throw new Error(`gateway exited early: ${stderr || stdout}`);
    if (Date.now() - started > 6000) throw new Error(`gateway start timeout: ${stderr || stdout}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

function openClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/xiaozhi/v1/`, {
      headers: { Origin: ORIGIN },
      handshakeTimeout: 3000,
      perMessageDeflate: false
    });
    const timer = setTimeout(() => reject(new Error('client open timeout')), 3500);
    ws.once('open', () => { clearTimeout(timer); resolve(ws); });
    ws.once('error', reject);
  });
}

try {
  await waitForStarted();

  const health = await fetch(`http://127.0.0.1:${PORT}/health`);
  assert.equal(health.status, 200);
  const h = await health.json();
  assert.equal(h.ok, true);
  assert.equal(h.release, 'xiaozhi-render-gateway-1.2.0');
  assert.equal(h.upstreamConfigured, false);
  assert.equal(h.upstreamMode, 'browser-fallback-transport');
  assert.equal(h.protocolProfile, 'xiaozhi-websocket-v1-compatible');

  const ws = await openClient();
  const messages = [];
  ws.on('message', data => {
    try { messages.push(JSON.parse(data.toString())); } catch {}
  });

  ws.send(JSON.stringify({ type: 'hello', client: 'qa', language: 'vi-VN' }));
  ws.send(JSON.stringify({ type: 'ping', at: Date.now() }));
  ws.send(JSON.stringify({ type: 'question', text: 'không được echo thành trả lời A.I' }));
  ws.send(JSON.stringify({ type: 'interrupt' }));

  await new Promise(resolve => setTimeout(resolve, 350));

  assert.ok(messages.some(m => m.type === 'hello' && m.transport === 'websocket'));
  assert.ok(messages.some(m => m.type === 'pong'));
  assert.ok(messages.some(m => m.type === 'interrupt' && m.ok === true));
  assert.ok(messages.some(m => m.type === 'provider' && m.upstreamConnected === false));
  assert.ok(!messages.some(m => m.type === 'message' && m.echo), 'fallback gateway must never echo user content as AI output');

  ws.close(1000, 'qa_complete');
  console.log('xiaozhi-gateway-v24: live fallback transport and no-fake-echo PASS');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 2500);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}
