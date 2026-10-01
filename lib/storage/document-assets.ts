"use client"

// ---------------------------------------------------------------------------
// Zenithsui Document Attachment & Asset Storage Engine
//
// Handles local-first persistence in IndexedDB (STORES.ASSET_BLOBS),
// binary PDF parsing, text/JSON/CSV preview extraction, file validation,
// thumbnail generation, and secure downloads.
// ---------------------------------------------------------------------------

import { openZenithsuiDb, STORES, withTransaction } from "./db"
import { computeBlobHash, cacheAssetBlob, getAssetBlob } from "../cloud/assets"
import { generatePdfThumbnail } from "../pdf/pdf-renderer"
import type { DocumentNode } from "../types"

export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024 // 50MB limit

export interface DocumentAssetResult {
  assetId: string
  hash: string
  name: string
  mimeType: string
  extension: string
  sizeBytes: number
  pageCount?: number
  textContent?: string
  localUrl: string
  thumbnailUrl?: string
}

/** In-memory cache of active ObjectURLs to prevent memory leaks */
const activeObjectUrls = new Map<string, string>()

/**
 * Normalizes and sanitizes document filenames:
 * Removes malicious path traversal, control chars, and keeps clean human names.
 */
export function sanitizeDocumentFilename(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return "untitled_document"
  // Remove null bytes and control characters
  let clean = rawName.replace(/[\x00-\x1f\x7f]/g, "").trim()
  // Remove directory traversal characters (.. / \ :)
  clean = clean.replace(/^[./\\]+/, "").replace(/[/\\:]+/g, "_")
  // Trim spaces and dots
  clean = clean.trim()
  if (!clean || clean === "." || clean === "..") return "untitled_document"
  // Limit length
  if (clean.length > 180) {
    const ext = clean.split(".").pop() || ""
    const base = clean.slice(0, 170)
    clean = ext ? `${base}.${ext}` : base
  }
  return clean
}

/**
 * Infers normalized MIME type from filename extension when browser MIME is missing or generic.
 */
export function inferMimeType(filename: string, declaredType?: string): { mimeType: string; extension: string } {
  const parts = filename.split(".")
  const ext = (parts.length > 1 ? parts.pop() || "" : "").toLowerCase()

  if (declaredType && declaredType !== "application/octet-stream" && declaredType !== "") {
    return { mimeType: declaredType, extension: ext || "bin" }
  }

  const MIME_MAP: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    json: "application/json",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  }

  return {
    mimeType: MIME_MAP[ext] || declaredType || "application/octet-stream",
    extension: ext || "bin",
  }
}

/**
 * Pure binary PDF inspection:
 * Validates %PDF- header and calculates page count without any external heavy libraries.
 */
export function extractPdfInfo(buffer: ArrayBuffer): { valid: boolean; pageCount: number; title?: string } {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 8) return { valid: false, pageCount: 1 }

  // %PDF-
  const isPdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d

  if (!isPdf) return { valid: false, pageCount: 1 }

  // Decode text chunks to look for /Count in /Pages dictionary or count /Type /Page
  let pageCount = 1
  try {
    const text = new TextDecoder("latin1").decode(bytes)

    // Strategy 1: Look for /Count (\d+) in /Type /Pages
    const pagesMatch = text.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/)
    if (pagesMatch && pagesMatch[1]) {
      const parsed = parseInt(pagesMatch[1], 10)
      if (parsed > 0 && parsed < 20000) {
        pageCount = parsed
      }
    } else {
      // Strategy 2: Count occurrences of /Type\s*\/Page\b (not /Pages)
      const pageMatches = text.match(/\/Type\s*\/Page\b/g)
      if (pageMatches && pageMatches.length > 0) {
        pageCount = pageMatches.length
      }
    }

    // Extract title if present: /Title (My Document) or /Title <HEX>
    let title: string | undefined
    const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/)
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim()
    }

    return { valid: true, pageCount: Math.max(1, pageCount), title }
  } catch {
    return { valid: true, pageCount: 1 }
  }
}

/**
 * Extracts a safe text preview snippet for TXT, JSON, CSV, MD files (up to 64KB).
 */
export async function extractTextPreview(file: Blob, mimeType: string): Promise<string | undefined> {
  const isTextual =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "text/csv" ||
    mimeType === "text/markdown"

  if (!isTextual) return undefined

  try {
    const slice = file.slice(0, 65536) // max 64KB for snippet
    const rawText = await slice.text()

    if (mimeType === "application/json") {
      try {
        const obj = JSON.parse(rawText)
        return JSON.stringify(obj, null, 2).slice(0, 4000)
      } catch {
        return rawText.slice(0, 4000)
      }
    }

    return rawText.slice(0, 4000)
  } catch {
    return undefined
  }
}

/**
 * Saves an uploaded or dropped document to local-first IndexedDB asset storage.
 */
export async function saveDocumentAsset(
  file: File | Blob,
  rawName: string
): Promise<DocumentAssetResult> {
  const name = sanitizeDocumentFilename(rawName)
  const { mimeType, extension } = inferMimeType(name, file.type)
  const sizeBytes = file.size

  if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `File exceeds maximum attachment limit of ${Math.round(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024))} MB.`
    )
  }

  // 1. Compute SHA-256 hash for content deduplication & stable identity
  const hash = await computeBlobHash(file)
  const assetId = `asset_${hash.slice(0, 16)}`

  // 2. Cache in IndexedDB (STORES.ASSET_BLOBS)
  await cacheAssetBlob(file, assetId)

  // 3. Extract metadata
  let pageCount: number | undefined
  let textContent: string | undefined
  let thumbnailUrl: string | undefined

  if (mimeType === "application/pdf" || extension === "pdf") {
    if (typeof window !== "undefined") {
      try {
        const thumb = await generatePdfThumbnail(file, 480)
        thumbnailUrl = thumb.thumbnailUrl
        pageCount = thumb.pageCount
      } catch (err) {
        console.warn("PDF thumbnail generation notice:", err)
      }
    }
    if (!pageCount) {
      const buffer = await file.slice(0, Math.min(sizeBytes, 5 * 1024 * 1024)).arrayBuffer()
      const pdfInfo = extractPdfInfo(buffer)
      pageCount = pdfInfo.pageCount
    }
  } else {
    textContent = await extractTextPreview(file, mimeType)
  }

  // 4. Generate local object URL for instant UI rendering
  const localUrl = URL.createObjectURL(file)
  activeObjectUrls.set(assetId, localUrl)

  return {
    assetId,
    hash,
    name,
    mimeType,
    extension,
    sizeBytes,
    pageCount,
    textContent,
    localUrl,
    thumbnailUrl,
  }
}

/**
 * Resolves a DocumentNode's underlying Blob from local IndexedDB or remote URL.
 */
export async function getDocumentBlob(node: DocumentNode): Promise<Blob | null> {
  // Case 1: "asset://<hash>" from local IndexedDB
  if (node.src && node.src.startsWith("asset://")) {
    const hash = node.src.replace("asset://", "")
    const blob = await getAssetBlob(hash)
    if (blob) return blob
  }

  // Case 2: assetId matches in IndexedDB
  if (node.assetId) {
    const hash = node.assetId.replace(/^asset_/, "")
    const blob = await getAssetBlob(hash)
    if (blob) return blob
  }

  // Case 3: Remote URL
  if (node.src && (node.src.startsWith("http://") || node.src.startsWith("https://") || node.src.startsWith("/"))) {
    try {
      const res = await fetch(node.src)
      if (res.ok) {
        return await res.blob()
      }
    } catch {
      // Fallback through asset proxy
      try {
        const proxyRes = await fetch(`/api/assets/proxy?url=${encodeURIComponent(node.src)}`)
        if (proxyRes.ok) {
          return await proxyRes.blob()
        }
      } catch {}
    }
  }

  return null
}

/**
 * Resolves a live playable/renderable ObjectURL for a DocumentNode.
 */
export async function getDocumentObjectUrl(node: DocumentNode): Promise<string | null> {
  // If we already have a cached live ObjectURL, return it
  if (node.assetId && activeObjectUrls.has(node.assetId)) {
    return activeObjectUrls.get(node.assetId)!
  }

  const blob = await getDocumentBlob(node)
  if (!blob) return node.src || null

  const url = URL.createObjectURL(blob)
  if (node.assetId) {
    activeObjectUrls.set(node.assetId, url)
  }
  return url
}

/**
 * Triggers a real browser download for a DocumentNode.
 */
export async function downloadDocument(node: DocumentNode): Promise<void> {
  const blob = await getDocumentBlob(node)
  const downloadUrl = blob ? URL.createObjectURL(blob) : node.src
  if (!downloadUrl) {
    throw new Error("Document content is unavailable for download.")
  }

  const a = document.createElement("a")
  a.href = downloadUrl
  a.download = node.name || "document"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  if (blob) {
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000)
  }
}

/**
 * Cleans up allocated ObjectURLs on unmount/session teardown.
 */
export function revokeDocumentUrl(assetId: string): void {
  const url = activeObjectUrls.get(assetId)
  if (url) {
    URL.revokeObjectURL(url)
    activeObjectUrls.delete(assetId)
  }
}

