import fs from 'node:fs';
const content = fs.readFileSync('components/shell/settings-dialog.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 2754; i < 2772; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
