import fs from 'node:fs';
const content = fs.readFileSync('components/shell/settings-dialog.tsx', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('export function SettingsDialog'));
for (let i = idx; i < idx + 30; i++) {
  console.log(i + 1, lines[i]);
}
