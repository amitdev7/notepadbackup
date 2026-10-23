import fs from 'node:fs';
const content = fs.readFileSync('components/shell/settings-dialog.tsx', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('case "wifi":'));
for (let i = idx; i < idx + 25; i++) {
  console.log(i + 1, lines[i]);
}
