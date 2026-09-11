import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const vercel=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
const researchEntry=await readFile(new URL('../api/research.ts',import.meta.url),'utf8');

const researchRewrite=(vercel.rewrites||[]).find(row=>row?.source==='/api/research');
assert.equal(researchRewrite,undefined,'/api/research must not be pinned to a legacy implementation in vercel.json');
assert.match(researchEntry,/import v31 from '\.\/research-v31\.js'/,'stable /api/research entrypoint must use research-v31');
assert.match(researchEntry,/export default v31/,'stable /api/research entrypoint must export v31');

console.log('vercel-research-route-v39: stable /api/research resolves through v31 entrypoint PASS');
