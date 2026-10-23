import fs from 'node:fs';
const content = fs.readFileSync('components/canvas/canvas.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 1880; i < 1940; i++) {
  console.log(i + 1, lines[i]);
}
