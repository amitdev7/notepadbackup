import fs from 'node:fs';
console.log('--- public/sw.js ---');
console.log(fs.readFileSync('public/sw.js', 'utf8').slice(0, 500));
console.log('--- public/service-worker.js ---');
console.log(fs.readFileSync('public/service-worker.js', 'utf8').slice(0, 500));
