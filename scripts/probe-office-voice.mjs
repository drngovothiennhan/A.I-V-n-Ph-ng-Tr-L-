const response = await fetch('https://ai-van-phong-tro-ly.vercel.app/api/health?probe=voice', {
  redirect: 'error', signal: AbortSignal.timeout(20000)
});
const health = await response.json();
if (response.status !== 200 || health.healthMode !== 'voice-live-probe' ||
    health.voiceRenderProbe?.ok !== true) throw new Error('VOICE_GATEWAY_PROBE_FAILED');
const gatewayResponse = await fetch('https://ai-office-xiaozhi-gateway.onrender.com/health', {
  redirect: 'error', signal: AbortSignal.timeout(20000)
});
const gateway = await gatewayResponse.json();
if (gatewayResponse.status !== 200 || gateway.ok !== true) throw new Error('VOICE_GATEWAY_UNAVAILABLE');
console.log(JSON.stringify({ gatewayReachable: true, release: gateway.release,
  upstreamConfigured: gateway.upstreamConfigured, upstreamMode: gateway.upstreamMode,
  voiceEndToEnd: 'UNVERIFIED_REQUIRES_REAL_AUDIO_INPUT_AND_PLAYBACK' }));
