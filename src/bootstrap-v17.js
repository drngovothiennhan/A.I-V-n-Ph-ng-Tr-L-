// Stable entrypoint retained for index.html compatibility.
// Runtime modules are loaded sequentially so later policy layers cannot be present-but-inactive.
const BOOT_CHAIN = [
  './bootstrap-v18.js',
  './knowledge-router-v20.js',
  './interaction-runtime-v22.js',
  './interaction-control-v21.js'
];

for (const modulePath of BOOT_CHAIN) {
  await import(modulePath);
}

window.AIOfficeV22?.attachAfterV21?.();
const status=document.getElementById('v19Status');
if(status) status.textContent='Interaction v2.2 · Voice/Intent/Action Orchestrator ON';
