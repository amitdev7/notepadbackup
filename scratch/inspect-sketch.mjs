import fs from 'node:fs';
const content = fs.readFileSync('components/canvas/sketch.tsx', 'utf8');
console.log('Lines in sketch.tsx:', content.split('\n').length);
// Check memoization or caching in sketch.tsx
const cacheMatches = [...content.matchAll(/(cache|memo|useMemo|React\.memo)/gi)].map(m => m[0]);
console.log('Cache / memo matches in sketch.tsx:', cacheMatches.length);
