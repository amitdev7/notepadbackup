import fs from 'node:fs';

const filePath = 'public/sw.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = 'if (event.request.method !== "GET" || url.pathname.startsWith("/api/assets/signed-upload-url")) {\r\n    return\r\n  }';
const replacement = 'if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {\r\n    return\r\n  }';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated sw.js to skip all /api/ requests!');
} else {
  console.error('Target not found in sw.js');
  process.exit(1);
}
