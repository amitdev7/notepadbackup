import fs from 'node:fs';
const content = fs.readFileSync('components/canvas/canvas.tsx', 'utf8');
console.log('Lines in canvas.tsx:', content.split('\n').length);
// Check Zustand selector in canvas.tsx
const zustandMatches = [...content.matchAll(/useSquig\(([^)]+)\)/g)].map(m => m[1]);
console.log('useSquig calls in canvas.tsx:', zustandMatches);
