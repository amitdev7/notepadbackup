import fs from 'node:fs';
const content = fs.readFileSync('components/canvas/canvas.tsx', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('function handlePointerMove') || l.includes('const onPointerMove') || l.includes('onPointerMove ='));
console.log('Found onPointerMove at line:', idx + 1);
for (let i = idx; i < Math.min(lines.length, idx + 150); i++) {
  console.log(i + 1, lines[i]);
}
