"use client"

// ---------------------------------------------------------------------------
// Zenithsui PDF-to-Canvas Engine
//
// Converts multi-page PDF documents page-by-page directly into canvas objects
// (as individual ImageNodes).
//
// Features:
// 1. Page-by-Page Extraction: Converts pages to high-DPI image nodes.
// 2. Smart Grid Layout: Configurable columns, gaps, and world positioning.
// 3. Native Zenithsui Grouping: Auto-groups extracted pages under [PDF Name].
// 4. Dual Storage Modes: Local-first IndexedDB asset storage (default) or data URLs.
// 5. Page Range Filtering: Extract all pages, single page, or custom range (e.g. "1-5").
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import type { DocumentNode, ImageNode, SquigNode } from "../types"
import { useSquig } from "../store"
import { loadPdfDocument, destroyPdfDocument } from "./pdf-renderer"
import { getDocumentBlob } from "../storage/document-assets"
import { cacheAssetBlob } from "../cloud/assets"

export interface PdfToCanvasOptions {
  /** Resolution scale for rendered pages (1.0 = standard, 2.0 = crisp, 3.0 = ultra). Default: 2.0 */
  renderScale?: number
  /** Number of grid columns for page layout. Default: 4 */
  columns?: number
  /** Spacing between page nodes in world units. Default: 48 */
  gap?: number
  /** Whether to bind extracted pages into a native Zenithsui group. Default: true */
  groupPages?: boolean
  /** Page range expression ("all", "1-5", "1, 3, 5-8"). Default: "all" */
  pageRange?: string
  /** True: inline data URLs; False: IndexedDB asset blob cache (local-first, lightweight JSON). Default: false */
  embedMode?: boolean
  /** Starting world position [x, y]. If omitted, computes placement to right of existing content or near viewport */
  startPos?: [number, number]
  /** Progress callback */
  onProgress?: (current: number, total: number, statusText: string) => void
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

export interface PdfToCanvasResult {
  nodeIds: string[]
  groupId?: string
  pageCount: number
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

/**
 * Parses page range strings like "all", "1-5", "1, 3, 5-10", or "2" into sorted page numbers.
 */
export function parsePageRange(rangeStr: string | undefined, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === "all" || rangeStr.trim() === "") {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = new Set<number>()
  const parts = rangeStr.split(/[,;\s]+/)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-")
      const start = Math.max(1, parseInt(startStr, 10) || 1)
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages)
      const low = Math.min(start, end)
      const high = Math.max(start, end)
      for (let p = low; p <= high; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p)
      }
    } else {
      const p = parseInt(trimmed, 10)
      if (p >= 1 && p <= totalPages) pages.add(p)
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b)
  return sorted.length > 0 ? sorted : Array.from({ length: totalPages }, (_, i) => i + 1)
}

/**
 * Extracts pages from a PDF source (Blob, File, ArrayBuffer, or DocumentNode)
 * and inserts them onto the Zenithsui canvas as a structured, grouped grid of ImageNodes.
 */
export async function extractPdfToCanvas(
  source: Blob | File | ArrayBuffer | DocumentNode,
  options: PdfToCanvasOptions = {}
): Promise<PdfToCanvasResult> {
  const renderScale = options.renderScale ?? 2.0
  const columns = Math.max(1, options.columns ?? 4)
  const gap = options.gap ?? 48
  const groupPages = options.groupPages ?? true
  const embedMode = options.embedMode ?? false

  // 1. Resolve PDF source binary and filename
  let binarySource: Blob | ArrayBuffer
  let pdfTitle = "PDF Document"

  if ("type" in source && source.type === "document") {
    // DocumentNode
    const docNode = source as DocumentNode
    pdfTitle = docNode.name.replace(/\.[^/.]+$/, "") || "PDF Document"
    const blob = await getDocumentBlob(docNode)
    if (!blob) {
      throw new Error(`Could not load binary data for "${docNode.name}". Check storage connectivity.`)
    }
    binarySource = blob
  } else if (source instanceof File) {
    pdfTitle = source.name.replace(/\.[^/.]+$/, "") || "PDF Document"
    binarySource = source
  } else if (source instanceof Blob) {
    binarySource = source
  } else {
    binarySource = source as ArrayBuffer
  }

  options.onProgress?.(0, 1, `Opening "${pdfTitle}"...`)

  // 2. Load PDF via PDF.js
  const pdfDoc = await loadPdfDocument(binarySource)
  const totalPages = pdfDoc.numPages

  if (totalPages === 0) {
    destroyPdfDocument(pdfDoc)
    throw new Error("The PDF document contains no pages.")
  }

  // 3. Determine target pages
  const targetPages = parsePageRange(options.pageRange, totalPages)
  const totalToExtract = targetPages.length

  // 4. Calculate starting coordinates
  let startX = 0
  let startY = 0

  if (options.startPos) {
    ;[startX, startY] = options.startPos
  } else if ("type" in source && source.type === "document") {
    // Position to the right of the existing DocumentNode
    const docNode = source as DocumentNode
    startX = docNode.x + docNode.w + 80
    startY = docNode.y
  } else {
    // Find canvas bounds or viewport center
    const st = useSquig.getState()
    const existingNodes = Object.values(st.nodes)

    if (existingNodes.length > 0) {
      const maxX = existingNodes.reduce((max, n) => Math.max(max, n.x + n.w), -Infinity)
      const minY = existingNodes.reduce((min, n) => Math.min(min, n.y), Infinity)
      startX = maxX + 100
      startY = Number.isFinite(minY) ? minY : 0
    } else {
      // Empty canvas: place near viewport center or default offset
      const v = st.viewport
      startX = Math.round(-v.x / v.zoom + 100)
      startY = Math.round(-v.y / v.zoom + 100)
    }
  }

  // 5. Generate Group ID
  const groupId = groupPages ? nanoid(8) : undefined

  const newNodes: ImageNode[] = []
  let groupMinX = Infinity
  let groupMinY = Infinity
  let groupMaxX = -Infinity
  let groupMaxY = -Infinity

  try {
    for (let index = 0; index < targetPages.length; index++) {
      if (options.signal?.aborted) {
        throw new Error("Page extraction cancelled by user.")
      }

      const pageNumber = targetPages[index]
      options.onProgress?.(
        index + 1,
        totalToExtract,
        `Rendering page ${pageNumber} of ${totalPages} (${index + 1}/${totalToExtract})...`
      )

      const page = await pdfDoc.getPage(pageNumber)
      const unscaledViewport = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: renderScale })

      // Create off-screen canvas
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext("2d", { alpha: false })

      if (!ctx) continue

      // Clean white paper background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Render PDF page to canvas
      await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      }).promise

      // Export image
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
      let src = dataUrl

      if (!embedMode) {
        // Cache blob in IndexedDB for lightweight canvas JSON
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.92)
        )
        if (blob) {
          const hash = await cacheAssetBlob(blob, "image/jpeg")
          src = `asset://${hash}`
        }
      }

      // Visual dimensions on infinite canvas
      const visualW = Math.round(unscaledViewport.width)
      const visualH = Math.round(unscaledViewport.height)

      // Grid placement
      const col = index % columns
      const row = Math.floor(index / columns)
      const x = startX + col * (visualW + gap)
      const y = startY + row * (visualH + gap)

      // Track bounding box
      groupMinX = Math.min(groupMinX, x)
      groupMinY = Math.min(groupMinY, y)
      groupMaxX = Math.max(groupMaxX, x + visualW)
      groupMaxY = Math.max(groupMaxY, y + visualH)

      const node: ImageNode = {
        id: nanoid(8),
        type: "image",
        src,
        naturalW: Math.round(viewport.width),
        naturalH: Math.round(viewport.height),
        name: `${pdfTitle} — Page ${pageNumber}`,
        x,
        y,
        w: visualW,
        h: visualH,
        seed: Math.floor(Math.random() * 2 ** 31),
        groupIds: groupId ? [groupId] : undefined,
      }

      newNodes.push(node)
    }

    // 6. Commit to Zenithsui Store
    if (newNodes.length > 0) {
      const st = useSquig.getState()
      st.addNodes(newNodes as SquigNode[], { select: true, checkpoint: true })
      st.setNotice(`Imported ${newNodes.length} pages from "${pdfTitle}"!`)
    }

    return {
      nodeIds: newNodes.map((n) => n.id),
      groupId,
      pageCount: newNodes.length,
      bounds: {
        minX: groupMinX,
        minY: groupMinY,
        maxX: groupMaxX,
        maxY: groupMaxY,
      },
    }
  } finally {
    destroyPdfDocument(pdfDoc)
  }
}
