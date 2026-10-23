import fs from 'node:fs';
const content = fs.readFileSync('lib/sync/engine.ts', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < 60; i++) {
  console.log(i + 1, lines[i]);
}
