import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/voice/xiaozhi-voice-fabric.js', import.meta.url), 'utf8');

const required = [
  ['continuous SpeechRecognition', /continuous\s*=\s*true/],
  ['interim recognition', /interimResults\s*=\s*true/],
  ['barge-in', /voice_barge_in/],
  ['echo suppression', /likelyEcho\s*\(/],
  ['speech cancellation', /speechSynthesis\?\.cancel|speechSynthesis\.cancel/],
  ['network online recovery', /addEventListener\('online'/],
  ['network offline fallback', /network_offline/],
  ['reconnect backoff', /2\s*\*\*\s*n/],
  ['reconnect cap', /reconnectMaxMs/],
  ['heartbeat ping', /type:'ping'/],
  ['heartbeat timeout', /heartbeat_timeout/],
  ['pong watchdog', /lastPongAt/],
  ['auto resume after TTS', /resumeListeningAfterSpeech/],
  ['browser fallback', /webkitSpeechRecognition|SpeechRecognition/],
  ['explicit interrupt', /type:'interrupt'/]
];

for (const [label, pattern] of required) {
  assert.match(source, pattern, `XiaoZhi client contract missing: ${label}`);
}

assert.match(source, /echoSimilarity\(text,this\.currentSpeech\)>=0\.72/, 'echo similarity threshold must remain explicit');
assert.match(source, /Date\.now\(\)-this\.lastPongAt>45000/, 'heartbeat stale threshold must remain bounded');
assert.match(source, /setInterval\([^]*20000\)/, 'heartbeat interval must remain approximately 20 seconds');

console.log('xiaozhi-client-contract-v24: continuity/barge-in/echo/reconnect/heartbeat PASS');
