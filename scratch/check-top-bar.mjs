import fs from 'node:fs';

const filePath = 'components/shell/top-bar.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Check imports
console.log(content.slice(0, 500));
