import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const tsconfig = JSON.parse(await readFile(new URL('../tsconfig.json', import.meta.url), 'utf8'));
assert.equal(tsconfig?.compilerOptions?.moduleResolution, 'Bundler', 'Vercel API TypeScript must use bundler module resolution');
assert.equal(tsconfig?.compilerOptions?.noCheck, true, 'plain-JS-style API handlers must not fail build on incidental inferred TypeScript shapes');
assert.equal(tsconfig?.compilerOptions?.skipLibCheck, true, 'dependency declarations must not block runtime build');
assert.deepEqual(tsconfig?.include, ['api/**/*.ts'], 'noCheck scope must stay limited to API TypeScript runtime files');

const gateways = [
  ['drive-brain-gateway.ts','driveBrain','./drive-brain.js'],
  ['research-gateway.ts','research','./research.js'],
  ['proxy-gateway.ts','proxy','./proxy.js'],
  ['image-gateway.ts','image','./image.js'],
  ['ingest-gateway.ts','ingest','./ingest.js']
];

for (const [file, symbol, specifier] of gateways) {
  const source = await readFile(new URL(`../api/${file}`, import.meta.url), 'utf8');
  assert.match(source, new RegExp(`import\\s+${symbol}\\s+from\\s+['\"]${specifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}['\"]`), `${file}: runtime-safe canonical handler import missing`);
  assert.doesNotMatch(source, /from\s+['"][^'"]+\.ts['"]/, `${file}: .ts-suffixed import must not return`);
  assert.match(source, new RegExp(`return\\s+${symbol}\\(req,\\s*res\\)`), `${file}: gateway must still delegate to canonical handler`);
}

console.log('vercel-typescript-build-v56: explicit .js API gateway import compatibility contract PASS');
