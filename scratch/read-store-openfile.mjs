import fs from 'node:fs';
const content = fs.readFileSync('lib/store.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('openFile: (id) =>'));
for (let i = idx; i < idx + 65; i++) {
  console.log(i + 1, lines[i]);
}
