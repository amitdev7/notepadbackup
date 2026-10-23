import fs from 'node:fs';
const content = fs.readFileSync('components/shell/settings-dialog.tsx', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('case "wifi":'));
for (let i = idx - 40; i < idx + 5; i++) {
  if (lines[i].includes('function ') || lines[i].includes('const ') || lines[i].includes('export ')) {
    console.log(i + 1, lines[i]);
  }
}
