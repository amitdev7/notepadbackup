"use client"

// ---------------------------------------------------------------------------
// Zenithsui PDF Document Service (Canonical Resolution & Shared In-Memory Cache)
//
// Unifies the data loading, caching, and document lifecycle for:
// - PdfCanvasItem (canvas card preview & page stepper)
// - PdfCanvasViewer (full-screen modal viewer)
//
// Invariants:
// 1. Local-first binary priority (IndexedDB STORES.ASSET_BLOBS)
// 2. Strict magic-byte validation (%PDF-) before passing to PDF.js
// 3. Shared in-memory caching to prevent duplicate parsing between preview and viewer
// 4. Clean resource disposal without memory leaks
// ---------------------------------------------------------------------------

import type { PDFDocumentProxy } from "pdfjs-dist"
import type { DocumentNode } from "../types"
import { getDocumentBlob } from "../storage/document-assets"
import { loadPdfDocument, destroyPdfDocument } from "./pdf-renderer"

export interface ResolvedPdfDocument {
  doc: PDFDocumentProxy
  blob: Blob
  pageCount: number
  source: "local-memory" | "local-indexeddb" | "cloud"
}

interface CacheEntry {
  doc: PDFDocumentProxy
  blob: Blob
  lastAccessed: number
  refCount: number
}

class PdfDocumentServiceManager {
  private cache = new Map<string, CacheEntry>()
  private inFlight = new Map<string, Promise<ResolvedPdfDocument>>()
  private readonly MAX_CACHED_DOCS = 5

  /**
   * Resolves a DocumentNode into a verified PDFDocumentProxy and Blob.
   * Leverages shared in-memory caching and deduplicates simultaneous requests.
   */
  async resolveDocument(node: DocumentNode): Promise<ResolvedPdfDocument> {
    const key = node.assetId || node.src
    if (!key) {
      throw new Error("Document node is missing assetId and src identity.")
    }

    // 1. Check in-memory cache
    const existing = this.cache.get(key)
    if (existing) {
      existing.lastAccessed = Date.now()
      return {
        doc: existing.doc,
        blob: existing.blob,
        pageCount: existing.doc.numPages,
        source: "local-memory",
      }
    }

    // 2. Deduplicate simultaneous loads for the same document
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!
    }

    const loadPromise = (async () => {
      // 3. Retrieve binary blob through local-first resolution pipeline
      const blob = await getDocumentBlob(node)
      if (!blob || blob.size === 0) {
        throw new Error("No binary document data available in local or cloud storage.")
      }

      // 4. Validate binary PDF signature (%PDF-)
      const headerBytes = new Uint8Array(await blob.slice(0, 5).arrayBuffer())
      const isPdfHeader =
        headerBytes[0] === 0x25 && // %
        headerBytes[1] === 0x50 && // P
        headerBytes[2] === 0x44 && // D
        headerBytes[3] === 0x46 && // F
        headerBytes[4] === 0x2d    // -

      if (!isPdfHeader) {
        throw new Error("File content is not a valid PDF document (missing %PDF- header).")
      }

      // 5. Load through PDF.js
      const doc = await loadPdfDocument(blob)

      // 6. Evict oldest cache entries if exceeding max cache
      this.evictOldestIfNeeded()

      // 7. Store in shared cache
      this.cache.set(key, {
        doc,
        blob,
        lastAccessed: Date.now(),
        refCount: 1,
      })

      return {
        doc,
        blob,
        pageCount: doc.numPages,
        source: "local-indexeddb" as const,
      }
    })().finally(() => {
      this.inFlight.delete(key)
    })

    this.inFlight.set(key, loadPromise)
    return loadPromise
  }

  /**
   * Safely evicts and cleans up a specific cached document.
   */
  evict(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      destroyPdfDocument(entry.doc)
      this.cache.delete(key)
    }
  }

  /**
   * Cleans up all cached PDF documents (e.g. on workspace change or memory pressure).
   */
  clear(): void {
    for (const [key, entry] of this.cache.entries()) {
      destroyPdfDocument(entry.doc)
    }
    this.cache.clear()
    this.inFlight.clear()
  }

  private evictOldestIfNeeded() {
    if (this.cache.size < this.MAX_CACHED_DOCS) return

    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.evict(oldestKey)
    }
  }
}

/** Singleton instance of the PDF Document Service */
export const pdfDocumentService = new PdfDocumentServiceManager()

