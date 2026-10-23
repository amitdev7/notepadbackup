import fs from 'node:fs';
const content = fs.readFileSync('components/shell/top-bar.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('Wifi') || l.includes('wifi') || l.includes('AutoSync') || l.includes('auto-sync')) {
    console.log(i + 1, l);
  }
});
