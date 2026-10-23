import fs from 'node:fs';
const content = fs.readFileSync('components/shell/bottom-dock.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 150; i < 300; i++) {
  if (lines[i].includes('<button') || lines[i].includes('onClick') || lines[i].includes('aria-')) {
    console.log(i + 1, lines[i]);
  }
}
