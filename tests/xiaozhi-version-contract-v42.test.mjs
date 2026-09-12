import fs from 'node:fs';
import assert from 'node:assert/strict';

const provider = fs.readFileSync('api/provider-check.ts', 'utf8');
const health = fs.readFileSync('api/health.ts', 'utf8');
const bridge = fs.readFileSync('src/voice-render-bridge-v23.js', 'utf8');
const legacy = fs.readFileSync('api/ws-xiaozhi.ts', 'utf8');

assert.match(bridge, /VERSION='2\.3-render-xiaozhi-direct'/, 'client bridge must remain voice render v2.3');
assert.match(bridge, /wss:\/\/ai-office-xiaozhi-gateway\.onrender\.com\/xiaozhi\/v1\//, 'client must connect directly to the authenticated Render gateway');
assert.doesNotMatch(bridge, /\/api\/ws-xiaozhi/, 'current client must never route voice through the retired Vercel websocket bridge');
assert.match(health, /voiceRenderVersion: '2\.3'/, 'health must advertise voice render v2.3');
assert.match(provider, /const XIAOZHI_VOICE_RENDER_VERSION = '2\.3'/, 'provider check must use the same voice render version');
assert.match(provider, /voiceRenderVersion: XIAOZHI_VOICE_RENDER_VERSION/);
assert.doesNotMatch(provider, /voiceRenderVersion:\s*'3\.0'/, 'provider telemetry must not advertise a nonexistent v3.0 bridge');

assert.match(legacy, /LEGACY_VERCEL_WS_BRIDGE_RETIRED/, 'legacy Vercel websocket route must fail closed');
assert.match(legacy, /status\(410\)/, 'retired legacy websocket route must return Gone');
assert.match(legacy, /browserFallback:\s*true/, 'retired route must preserve browser fallback guidance');
assert.match(legacy, /ai-office-xiaozhi-gateway\.onrender\.com\/xiaozhi\/v1\//, 'retired route must point to the canonical Render voice gateway');
assert.doesNotMatch(legacy, /WebSocketServer|new WebSocket\(|XIAOZHI_WS_TOKEN|XIAOZHI_TOKEN|Authorization\s*=/, 'retired Vercel route must not open an upstream or read server voice tokens');

console.log('xiaozhi version telemetry contract: direct Render v2.3 + retired legacy Vercel bridge PASS');
