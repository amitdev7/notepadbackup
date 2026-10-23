import fs from 'node:fs';
const content = fs.readFileSync('public/sw.js', 'utf8');
const lines = content.split('\n');
for (let i = 42; i < 50; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
