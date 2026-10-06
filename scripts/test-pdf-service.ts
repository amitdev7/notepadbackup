// ---------------------------------------------------------------------------
// Zenithsui PDF Document Service & Pipeline Tests
// ---------------------------------------------------------------------------

import { pdfDocumentService } from "../lib/pdf/pdf-service.ts"
import { cacheAssetBlob } from "../lib/cloud/assets.ts"
import type { DocumentNode } from "../lib/types.ts"
import { parsePageRange } from "../lib/pdf/pdf-to-canvas.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed]: ${message}`)
  }
}

console.log("=== Starting Zenithsui PDF Service & Pipeline Tests ===")

// 1. Rejection of corrupted / non-PDF data
console.log("-> 1. Testing corrupted / non-PDF rejection...")
const fakePdfBlob = new Blob([new TextEncoder().encode("NOT A PDF AT ALL")], { type: "application/pdf" })
const fakeHash = "fake123456789012345678901234567890123456789012345678901234567890"
await cacheAssetBlob(fakePdfBlob, `asset_${fakeHash}`)

const fakeDocNode: DocumentNode = {
  id: "fake_node_1",
  type: "document",
  assetId: `asset_${fakeHash}`,
  src: `asset://${fakeHash}`,
  name: "fake.pdf",
  mimeType: "application/pdf",
  extension: "pdf",
  sizeBytes: fakePdfBlob.size,
  x: 0,
  y: 0,
  w: 300,
  h: 400,
  seed: 123,
}

let caughtError = false
try {
  await pdfDocumentService.resolveDocument(fakeDocNode)
} catch (e: any) {
  caughtError = true
  assert(e.message.includes("missing %PDF- header"), "Accurately rejects files without %PDF- magic bytes")
}
assert(caughtError, "Successfully blocked non-PDF payload from reaching PDF.js engine")

// 2. Missing attachment data error handling
console.log("-> 2. Testing missing attachment handling...")
const missingNode: DocumentNode = {
  id: "missing_node",
  type: "document",
  assetId: "asset_nonexistent_hash_00000000000000000000000000000000000000000",
  src: "asset://nonexistent_hash_00000000000000000000000000000000000000000",
  name: "missing.pdf",
  mimeType: "application/pdf",
  extension: "pdf",
  sizeBytes: 1234,
  x: 0,
  y: 0,
  w: 300,
  h: 400,
  seed: 456,
}

let missingCaught = false
try {
  await pdfDocumentService.resolveDocument(missingNode)
} catch (e: any) {
  missingCaught = true
  assert(e.message.includes("No binary document data available"), "Reports clear binary missing error")
}
assert(missingCaught, "Correctly handles missing binary data without hanging")

// 3. PDF to Canvas page range parser
console.log("-> 3. Testing PDF-to-Canvas page range parser...")

const allPages = parsePageRange("all", 5)
assert(JSON.stringify(allPages) === JSON.stringify([1, 2, 3, 4, 5]), "Parses 'all' pages correctly")

const rangePages = parsePageRange("1-3, 5", 8)
assert(JSON.stringify(rangePages) === JSON.stringify([1, 2, 3, 5]), "Parses compound range correctly")

const clampedPages = parsePageRange("2-10", 4)
assert(JSON.stringify(clampedPages) === JSON.stringify([2, 3, 4]), "Clamps ranges to total page count")

const emptyFallback = parsePageRange("", 3)
assert(JSON.stringify(emptyFallback) === JSON.stringify([1, 2, 3]), "Empty range defaults to all pages")

console.log("=== All Zenithsui PDF Service Tests Passed Successfully! ===")

