import fs from 'node:fs';
const content = fs.readFileSync('components/shell/settings-dialog.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 1095; i < 1116; i++) {
  console.log(i + 1, lines[i]);
}
