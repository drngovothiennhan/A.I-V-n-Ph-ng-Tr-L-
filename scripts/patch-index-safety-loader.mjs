import { readFile, writeFile } from 'node:fs/promises';

const path='index.html';
const marker='/src/research-safety-bootstrap-v263.js?v=263-hotfix';
const tag=`<script type="module" src="${marker}"></script>`;
const html=await readFile(path,'utf8');

if(html.includes(marker)){
  console.log('index safety loader already present');
  process.exit(0);
}
if(!html.includes('</body>'))throw new Error('index.html missing </body>');
const next=html.replace('</body>',`${tag}</body>`);
await writeFile(path,next,'utf8');
console.log('index safety loader injected');
