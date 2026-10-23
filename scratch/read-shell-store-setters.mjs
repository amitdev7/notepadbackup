import fs from 'node:fs';
const content = fs.readFileSync('lib/shell-store.ts', 'utf8');
const lines = content.split('\n');
for (let i = 270; i < 350; i++) {
  console.log(i + 1, lines[i]);
}
