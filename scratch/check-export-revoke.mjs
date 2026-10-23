import fs from 'node:fs';
const content = fs.readFileSync('lib/export-image.ts', 'utf8');
const lines = content.split('\n');
for (let i = 288; i < 305; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
for (let i = 370; i < lines.length; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
