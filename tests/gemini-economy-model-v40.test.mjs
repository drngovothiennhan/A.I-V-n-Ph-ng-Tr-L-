import fs from 'node:fs';
import assert from 'node:assert/strict';

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const envExample = fs.readFileSync('.env.example', 'utf8');
const research = fs.readFileSync('api/research-v28.js', 'utf8');
const health = fs.readFileSync('api/health.ts', 'utf8');

assert.equal(vercel.env?.AI_OFFICE_GEMINI_MODEL, 'gemini-3.8-flash', 'primary Gemini route must remain 3.8 Flash');
assert.equal(vercel.env?.AI_OFFICE_GEMINI_ECONOMY_MODEL, 'gemini-3.5-flash-lite', 'economy route must use the low-cost Flash-Lite model');
assert.notEqual(vercel.env?.AI_OFFICE_GEMINI_ECONOMY_MODEL, vercel.env?.AI_OFFICE_GEMINI_MODEL, 'economy route must not collapse into the primary model');
assert.match(envExample, /AI_OFFICE_GEMINI_ECONOMY_MODEL=gemini-3\.5-flash-lite/);
assert.match(research, /function economyModel\(\)\{return process\.env\.AI_OFFICE_GEMINI_ECONOMY_MODEL\|\|DEFAULT_ECONOMY_MODEL\}/);
assert.match(research, /costTier:primary\?'reasoning':'economy'/);
assert.match(health, /const DEFAULT_GEMINI_ECONOMY_MODEL = 'gemini-3\.5-flash-lite'/);
assert.match(health, /economyModel: economyModel\(\)/);

console.log('gemini economy route contract: PASS');
