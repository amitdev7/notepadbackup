import fs from 'node:fs';
const content = fs.readFileSync('components/chrome/version-history-panel.tsx', 'utf8');
console.log(content.slice(0, 1000));
