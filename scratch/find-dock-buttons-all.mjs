import fs from 'node:fs';
const content = fs.readFileSync('components/shell/bottom-dock.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('<button') || (l.includes('button') && l.includes('className'))) {
    console.log(i + 1, l);
  }
});
