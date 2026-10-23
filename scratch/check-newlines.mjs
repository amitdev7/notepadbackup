import fs from 'node:fs';
const content = fs.readFileSync('lib/export-image.ts', 'utf8');
const lines = content.split(/\r?\n/);
console.log('Line 296:', JSON.stringify(lines[295]));
console.log('Line 297:', JSON.stringify(lines[296]));
console.log('Line 298:', JSON.stringify(lines[297]));
console.log('Has CRLF?', content.includes('\r\n'));
