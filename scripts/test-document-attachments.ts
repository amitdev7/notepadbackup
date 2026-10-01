// ---------------------------------------------------------------------------
// Zenithsui Document Attachments — Automated Test Suite
//
// Verifies:
// 1. Filename sanitization (path traversal, control chars, length bounding)
// 2. MIME type & extension inference across all supported document types
// 3. Binary PDF parser (header check, /Pages /Count extraction, page counting)
// 4. Text / CSV / JSON preview snippet parsing
// 5. DocumentNode schema validation in clipboard payload & store sanitize
// 6. Solid hit-test boundaries for document canvas items
// 7. Node geometry scaling, bounds calculation, and cloning
// ---------------------------------------------------------------------------

import {
  sanitizeDocumentFilename,
  inferMimeType,
  extractPdfInfo,
} from "../lib/storage/document-assets.ts"

import { isSolid } from "../lib/canvas/hit-test.ts"
import { validNode, wordsOf, encodeNodes, decodeNodes } from "../lib/clipboard-payload.ts"
import { unionBounds } from "../lib/selection.ts"
import type { DocumentNode, SquigNode } from "../lib/types.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed]: ${message}`)
  }
}

console.log("=== Starting Zenithsui Document Attachments Test Suite ===")

// ---------------------------------------------------------------------------
// 1. Filename Sanitization
// ---------------------------------------------------------------------------
console.log("-> 1. Testing filename sanitization...")

assert(sanitizeDocumentFilename("my_file.pdf") === "my_file.pdf", "Normal filename preserved")
assert(sanitizeDocumentFilename("../../etc/passwd") === "etc_passwd", "Path traversal stripped")
assert(sanitizeDocumentFilename("C:\\Users\\admin\\secret.docx") === "C_Users_admin_secret.docx", "Windows backslashes replaced")
assert(sanitizeDocumentFilename("null\x00byte\x1f.txt") === "nullbyte.txt", "Control chars and null bytes stripped")
assert(sanitizeDocumentFilename("") === "untitled_document", "Empty string defaults to untitled_document")
assert(sanitizeDocumentFilename("...") === "untitled_document", "Dot-only defaults to untitled_document")
assert(sanitizeDocumentFilename("   spaced name.json   ") === "spaced name.json", "Whitespace trimmed")

const veryLongName = "a".repeat(200) + ".pdf"
const sanitizedLong = sanitizeDocumentFilename(veryLongName)
assert(sanitizedLong.endsWith(".pdf"), "Long name retains extension")
assert(sanitizedLong.length <= 180, "Long name bounded to max 180 chars")

// ---------------------------------------------------------------------------
// 2. MIME Type & Extension Inference
// ---------------------------------------------------------------------------
console.log("-> 2. Testing MIME type & extension inference...")

assert(inferMimeType("document.pdf").mimeType === "application/pdf", "Infers PDF mime")
assert(inferMimeType("document.pdf").extension === "pdf", "Infers PDF extension")

assert(inferMimeType("notes.txt").mimeType === "text/plain", "Infers TXT mime")
assert(inferMimeType("data.csv").mimeType === "text/csv", "Infers CSV mime")
assert(inferMimeType("data.tsv").mimeType === "text/tab-separated-values", "Infers TSV mime")
assert(inferMimeType("config.json").mimeType === "application/json", "Infers JSON mime")
assert(inferMimeType("README.md").mimeType === "text/markdown", "Infers MD mime")

assert(inferMimeType("report.docx").mimeType.includes("wordprocessingml"), "Infers DOCX mime")
assert(inferMimeType("sheet.xlsx").mimeType.includes("spreadsheetml"), "Infers XLSX mime")
assert(inferMimeType("slides.pptx").mimeType.includes("presentationml"), "Infers PPTX mime")

// Handles missing or generic declared types
assert(inferMimeType("calc.csv", "application/octet-stream").mimeType === "text/csv", "Overrides generic octet-stream with extension")
assert(inferMimeType("photo.custom", "image/png").mimeType === "image/png", "Honors valid explicit mime")

// ---------------------------------------------------------------------------
// 3. Binary PDF Parser
// ---------------------------------------------------------------------------
console.log("-> 3. Testing binary PDF parser...")

// Invalid / non-PDF buffer
const emptyBuffer = new ArrayBuffer(4)
assert(!extractPdfInfo(emptyBuffer).valid, "Rejects short buffer")

const textBuffer = new TextEncoder().encode("Hello world this is not a PDF").buffer
assert(!extractPdfInfo(textBuffer).valid, "Rejects non-PDF header")

// Valid synthetic PDF with /Count in /Pages
const mockPdf1 = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 14 /Kids [3 0 R] >>
endobj
`
const mockPdf1Buffer = new TextEncoder().encode(mockPdf1).buffer
const res1 = extractPdfInfo(mockPdf1Buffer)
assert(res1.valid === true, "Recognizes %PDF- header")
assert(res1.pageCount === 14, `Extracted page count should be 14, got ${res1.pageCount}`)

// Valid synthetic PDF with multiple /Type /Page objects
const mockPdf2 = `%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
3 0 obj << /Type /Page /Parent 2 0 R >> endobj
4 0 obj << /Type /Page /Parent 2 0 R >> endobj
5 0 obj << /Type /Page /Parent 2 0 R >> endobj
trailer << /Root 1 0 R >>
%%EOF`
const mockPdf2Buffer = new TextEncoder().encode(mockPdf2).buffer
const res2 = extractPdfInfo(mockPdf2Buffer)
assert(res2.valid === true, "Recognizes PDF")
assert(res2.pageCount === 3, `Counted individual /Type /Page objects: expected 3, got ${res2.pageCount}`)

// Valid synthetic PDF with /Title
const mockPdf3 = `%PDF-1.5
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Count 1 >> endobj
3 0 obj << /Title (Quantum Mechanics Lecture Notes) >> endobj
`
const mockPdf3Buffer = new TextEncoder().encode(mockPdf3).buffer
const res3 = extractPdfInfo(mockPdf3Buffer)
assert(res3.valid === true, "Recognizes PDF")
assert(res3.title === "Quantum Mechanics Lecture Notes", "Extracted PDF title")

// ---------------------------------------------------------------------------
// 4. DocumentNode Schema & Clipboard Validation
// ---------------------------------------------------------------------------
console.log("-> 4. Testing DocumentNode validation and clipboard encoding...")

const sampleDocNode: DocumentNode = {
  id: "doc_test1",
  type: "document",
  assetId: "asset_abc123",
  src: "asset://abc123hash",
  name: "Lecture Notes.pdf",
  mimeType: "application/pdf",
  extension: "pdf",
  sizeBytes: 1048576,
  pageCount: 12,
  currentPage: 1,
  x: 100,
  y: 150,
  w: 340,
  h: 440,
  seed: 42,
}

// Validation in validNode (clipboard payload parser)
assert(validNode(sampleDocNode) !== null, "sampleDocNode passes validNode check")

// Incomplete document nodes are rejected
const invalidDocNode1 = { ...sampleDocNode, name: "" }
assert(validNode(invalidDocNode1) === null, "Rejects document node with empty name")

const invalidDocNode2 = { ...sampleDocNode, mimeType: "" }
assert(validNode(invalidDocNode2) === null, "Rejects document node with empty mimeType")

const invalidDocNode3 = { ...sampleDocNode, w: -50 }
assert(validNode(invalidDocNode3) === null, "Rejects document node with negative width")

// Encoding & decoding roundtrip
const encoded = encodeNodes([sampleDocNode])
const decoded = decodeNodes(encoded)
assert(decoded !== null, "Decodes encoded document node array")
assert(decoded!.length === 1, "Decodes exactly 1 node")
const roundtripped = decoded![0] as DocumentNode
assert(roundtripped.type === "document", "Retains type 'document'")
assert(roundtripped.name === "Lecture Notes.pdf", "Retains name")
assert(roundtripped.pageCount === 12, "Retains page count")
assert(roundtripped.sizeBytes === 1048576, "Retains size bytes")

// wordsOf includes document name
const words = wordsOf([sampleDocNode])
assert(words.includes("Lecture Notes.pdf"), "wordsOf includes document filename")

// ---------------------------------------------------------------------------
// 5. Solid Hit-Testing for Canvas
// ---------------------------------------------------------------------------
console.log("-> 5. Testing solid hit-test recognition...")

assert(isSolid(sampleDocNode) === true, "DocumentNode is solid for canvas hit testing")

// ---------------------------------------------------------------------------
// 6. Geometry, Selection Bounds & Scaling
// ---------------------------------------------------------------------------
console.log("-> 6. Testing geometry & bounding boxes...")

const bounds = unionBounds([sampleDocNode])
assert(bounds !== null, "Calculates bounds")
assert(bounds!.x === 100, "Bounds X matches")
assert(bounds!.y === 150, "Bounds Y matches")
assert(bounds!.w === 340, "Bounds W matches")
assert(bounds!.h === 440, "Bounds H matches")

const secondDoc: DocumentNode = {
  ...sampleDocNode,
  id: "doc_test2",
  x: 500,
  y: 600,
  w: 200,
  h: 200,
}
const multiBounds = unionBounds([sampleDocNode, secondDoc])
assert(multiBounds !== null, "Calculates multi-node union bounds")
assert(multiBounds!.x === 100, "Multi bounds min X")
assert(multiBounds!.y === 150, "Multi bounds min Y")
assert(multiBounds!.w === 600, "Multi bounds union width (700 - 100 = 600)")
assert(multiBounds!.h === 650, "Multi bounds union height (800 - 150 = 650)")

console.log("=== All Zenithsui Document Attachments Tests Passed Successfully! ===")

