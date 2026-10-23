import fs from 'node:fs';
const content = fs.readFileSync('components/canvas/canvas.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('useSquig(') || l.includes('useSquig.getState()')) {
    console.log(i + 1, l.trim());
  }
});
