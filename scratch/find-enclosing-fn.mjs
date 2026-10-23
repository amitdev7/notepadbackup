import fs from 'node:fs';
const content = fs.readFileSync('components/shell/settings-dialog.tsx', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('case "wifi":'));
for (let i = idx; i >= 0; i--) {
  if (lines[i].includes('function ') || lines[i].includes('const ') && lines[i].includes('=>')) {
    console.log(`Found enclosing at line ${i + 1}: ${lines[i]}`);
    break;
  }
}
