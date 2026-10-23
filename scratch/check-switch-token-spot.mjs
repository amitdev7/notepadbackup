import fs from 'node:fs';
const content = fs.readFileSync('lib/store.ts', 'utf8');
const lines = content.split('\n');
for (let i = 420; i < 435; i++) {
  console.log(i + 1, lines[i]);
}
