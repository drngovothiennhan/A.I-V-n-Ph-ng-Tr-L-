import fs from 'node:fs';
import assert from 'node:assert/strict';

const provider = fs.readFileSync('api/provider-check.ts', 'utf8');
const health = fs.readFileSync('api/health.ts', 'utf8');
const bridge = fs.readFileSync('src/voice-render-bridge-v23.js', 'utf8');

assert.match(bridge, /VERSION='2\.3-render-xiaozhi-direct'/, 'client bridge must remain voice render v2.3');
assert.match(health, /voiceRenderVersion: '2\.3'/, 'health must advertise voice render v2.3');
assert.match(provider, /const XIAOZHI_VOICE_RENDER_VERSION = '2\.3'/, 'provider check must use the same voice render version');
assert.match(provider, /voiceRenderVersion: XIAOZHI_VOICE_RENDER_VERSION/);
assert.doesNotMatch(provider, /voiceRenderVersion:\s*'3\.0'/, 'provider telemetry must not advertise a nonexistent v3.0 bridge');

console.log('xiaozhi version telemetry contract: PASS');
