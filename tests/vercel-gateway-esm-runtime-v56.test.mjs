import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const gateways = [
  ['proxy-gateway.ts', 'proxy'],
  ['research-gateway.ts', 'research'],
  ['drive-brain-gateway.ts', 'drive-brain'],
  ['image-gateway.ts', 'image'],
  ['ingest-gateway.ts', 'ingest']
];

for (const [file, target] of gateways) {
  const source = await readFile(new URL(`../api/${file}`, import.meta.url), 'utf8');
  const expected = new RegExp(`from ['"]\\./${target.replace('-', '\\-')}\\.js['"]`);
  const unsafe = new RegExp(`from ['"]\\./${target.replace('-', '\\-')}['"]`);
  assert.match(source, expected, `${file} must use explicit .js ESM specifier for Vercel Node runtime`);
  assert.doesNotMatch(source, unsafe, `${file} must never emit an extensionless ESM import`);
}

console.log('vercel-gateway-esm-runtime-v56: 5 gateway imports use explicit .js specifiers PASS');
