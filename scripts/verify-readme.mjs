import fs from "node:fs";
import path from "node:path";

const readme = fs.readFileSync("README.md", "utf8");

// 1. File links
const fileLinkRegex = /\[(?:[^\]]+)\]\(([^)#]+)(?:#[^)]*)?\)/g;
let match;
let fileErrors = 0;
while ((match = fileLinkRegex.exec(readme)) !== null) {
  const target = match[1];
  if (!target || target.startsWith("http") || target.startsWith("mailto:") || target.startsWith("file:")) continue;
  const resolved = path.resolve(".", target);
  if (!fs.existsSync(resolved)) {
    console.error("Broken file link in README.md: " + target);
    fileErrors++;
  }
}

// 2. Img sources
const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
while ((match = imgRegex.exec(readme)) !== null) {
  const src = match[1];
  if (!src || src.startsWith("http")) continue;
  const resolved = path.resolve(".", src);
  if (!fs.existsSync(resolved)) {
    console.error("Broken img src in README.md: " + src);
    fileErrors++;
  }
}

// 3. Anchors
const headers = [];
const headerRegex = /^#{1,6}\s+(.+)$/gm;
let hMatch;
while ((hMatch = headerRegex.exec(readme)) !== null) {
  const slug = hMatch[1].toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  headers.push(slug);
}

const anchorRegex = /\[(?:[^\]]+)\]\(#([^)]+)\)/g;
let anchorErrors = 0;
while ((match = anchorRegex.exec(readme)) !== null) {
  const anchor = match[1];
  if (!headers.includes(anchor)) {
    console.warn("Unmatched anchor: #" + anchor);
    anchorErrors++;
  }
}

console.log("File link errors: " + fileErrors);
console.log("Unmatched anchor errors: " + anchorErrors);

if (fileErrors > 0 || anchorErrors > 0) {
  process.exit(1);
} else {
  console.log("✓ README.md has 100% valid file links, images, and anchor targets!");
}
