import fs from 'node:fs';
const content = fs.readFileSync('lib/export-image.ts', 'utf8');
console.log('Lines in export-image.ts:', content.split('\n').length);
console.log(content.slice(0, 1000));
