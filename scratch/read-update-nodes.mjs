import fs from 'node:fs';
const content = fs.readFileSync('lib/store.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('updateNodes:'));
console.log('Found updateNodes at line:', idx + 1);
for (let i = idx; i < Math.min(lines.length, idx + 40); i++) {
  console.log(i + 1, lines[i]);
}
