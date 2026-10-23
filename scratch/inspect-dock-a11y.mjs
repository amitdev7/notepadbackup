import fs from 'node:fs';
const content = fs.readFileSync('components/shell/bottom-dock.tsx', 'utf8');
console.log('Lines in bottom-dock.tsx:', content.split('\n').length);
// Check aria labels
const buttonMatches = [...content.matchAll(/<button[^>]*>/g)].map(m => m[0]);
console.log('Total buttons in bottom-dock:', buttonMatches.length);
const buttonsWithoutAria = buttonMatches.filter(b => !b.includes('aria-label') && !b.includes('title'));
console.log('Buttons missing aria-label/title in bottom-dock:', buttonsWithoutAria.length);
