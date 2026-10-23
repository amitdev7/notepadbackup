import fs from 'node:fs';

const filePath = 'lib/export-image.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target1 = '  a.click()\r\n  URL.revokeObjectURL(url)\r\n}';
const replacement1 = '  a.click()\r\n  setTimeout(() => URL.revokeObjectURL(url), 5000)\r\n}';

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
} else {
  console.error('Target 1 not found in lib/export-image.ts');
  process.exit(1);
}

const target2 = '  a.click()\r\n  URL.revokeObjectURL(url)\r\n}';
if (content.includes(target2)) {
  content = content.replace(target2, replacement1);
} else {
  console.error('Target 2 not found in lib/export-image.ts');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated lib/export-image.ts to safely defer URL.revokeObjectURL!');
