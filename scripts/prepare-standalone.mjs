// ---------------------------------------------------------------------------
// Zenithsui Desktop — Standalone Asset Preparation
//
// Copies public/ and .next/static/ into .next/standalone/
// as required by Next.js standalone output for self-contained execution.
// ---------------------------------------------------------------------------

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

const standaloneDir = path.join(rootDir, ".next", "standalone")
const staticSrc = path.join(rootDir, ".next", "static")
const staticDest = path.join(standaloneDir, ".next", "static")
const publicSrc = path.join(rootDir, "public")
const publicDest = path.join(standaloneDir, "public")

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

if (!fs.existsSync(standaloneDir)) {
  console.error("[prepare-standalone] .next/standalone not found. Run 'pnpm build' first.")
  process.exit(1)
}

console.log("[prepare-standalone] Copying .next/static into .next/standalone/.next/static...")
copyDirRecursive(staticSrc, staticDest)

console.log("[prepare-standalone] Copying public into .next/standalone/public...")
copyDirRecursive(publicSrc, publicDest)

console.log("[prepare-standalone] Standalone assets ready for offline desktop packaging.")
