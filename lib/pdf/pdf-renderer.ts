"use client"

// ---------------------------------------------------------------------------
// Zenithsui PDF Engine — High-DPI Canvas Rendering & Thumbnail Generator
//
// Zero-iframe, genuine PDF.js pipeline.
// Provides:
// 1. Safe, client-only initialization of pdfjs-dist with local worker
// 2. High-DPI canvas rendering for single pages with rotation & zoom
// 3. First-page thumbnail generation & caching
// 4. Memory-safe document disposal & render cancellation
// 5. In-document text extraction for search
// ---------------------------------------------------------------------------

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist"

let pdfjsLibInstance: typeof import("pdfjs-dist") | null = null

/**
 * Initializes and retrieves the client-side pdfjs-dist instance with local worker.
 * Never executes during SSR / Next.js static prerendering.
 */
export async function getPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be initialized in the browser environment.")
  }

  if (!pdfjsLibInstance) {
    const lib = await import("pdfjs-dist")
    if (lib.GlobalWorkerOptions) {
      // Local worker copied to public directory for 100% offline reliability
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
    }
    pdfjsLibInstance = lib
  }

  return pdfjsLibInstance
}

/**
 * Loads a PDF document from a Blob, ArrayBuffer, or URL into a PDFDocumentProxy.
 */
export async function loadPdfDocument(source: Blob | ArrayBuffer | string): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs()

  if (source instanceof Blob) {
    const buffer = await source.arrayBuffer()
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      cMapPacked: true,
    })
    return loadingTask.promise
  }

  if (source instanceof ArrayBuffer) {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(source),
      cMapPacked: true,
    })
    return loadingTask.promise
  }

  if (typeof source === "string") {
    const loadingTask = pdfjs.getDocument({
      url: source,
      cMapPacked: true,
    })
    return loadingTask.promise
  }

  throw new Error("Invalid PDF source provided to loadPdfDocument.")
}

export interface RenderPageOptions {
  scale?: number
  rotation?: number
  targetWidth?: number
  targetHeight?: number
  maxPixelRatio?: number
}

export interface ActiveRenderTask {
  cancel: () => void
  promise: Promise<void>
}

/**
 * Renders a specific page of a PDF document directly onto an HTML5 canvas.
 * Implements high-DPI scaling, alpha background filling, and render task cancellation.
 */
export function renderPdfPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  options: RenderPageOptions = {}
): ActiveRenderTask {
  const dpr = Math.min(window.devicePixelRatio || 1, options.maxPixelRatio || 2)
  const rotation = options.rotation || 0

  const unscaledViewport = page.getViewport({ scale: 1, rotation })
  let scale = options.scale || 1

  if (options.targetWidth && !options.scale) {
    scale = options.targetWidth / unscaledViewport.width
  } else if (options.targetHeight && !options.scale) {
    scale = options.targetHeight / unscaledViewport.height
  }

  const viewport = page.getViewport({ scale: scale * dpr, rotation })

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
  canvas.style.height = `${Math.floor(viewport.height / dpr)}px`

  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) {
    throw new Error("Unable to obtain 2d canvas context for PDF rendering.")
  }

  // Paint crisp paper background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const renderTask = page.render({
    canvas,
    canvasContext: ctx,
    viewport,
  })

  return {
    cancel: () => {
      try {
        renderTask.cancel()
      } catch {
        // Ignored if already completed
      }
    },
    promise: renderTask.promise,
  }
}

/**
 * Safely cleans up and destroys a PDF document instance.
 */
export function destroyPdfDocument(doc: PDFDocumentProxy | null | undefined): void {
  if (!doc) return
  try {
    if (doc.loadingTask && typeof doc.loadingTask.destroy === "function") {
      doc.loadingTask.destroy()
    } else if (typeof (doc as any).destroy === "function") {
      ;(doc as any).destroy()
    } else if (typeof doc.cleanup === "function") {
      doc.cleanup()
    }
  } catch {
    // Ignored during disposal
  }
}

/**
 * Generates a high-quality thumbnail of the first page of a PDF.
 * Returns the data URL, total page count, and natural dimensions.
 */
export async function generatePdfThumbnail(
  source: Blob | ArrayBuffer,
  maxDimension = 480
): Promise<{
  thumbnailUrl: string
  pageCount: number
  naturalW: number
  naturalH: number
}> {
  const doc = await loadPdfDocument(source)
  try {
    const pageCount = doc.numPages
    const firstPage = await doc.getPage(1)
    const unscaledViewport = firstPage.getViewport({ scale: 1 })

    const scale = Math.min(
      maxDimension / Math.max(unscaledViewport.width, unscaledViewport.height),
      2.0
    )
    const viewport = firstPage.getViewport({ scale })

    const canvas = document.createElement("canvas")
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) {
      throw new Error("Failed to create thumbnail canvas context.")
    }

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await firstPage.render({
      canvas,
      canvasContext: ctx,
      viewport,
    }).promise

    let thumbnailUrl: string
    try {
      thumbnailUrl = canvas.toDataURL("image/webp", 0.85)
    } catch {
      thumbnailUrl = canvas.toDataURL("image/png")
    }

    return {
      thumbnailUrl,
      pageCount,
      naturalW: Math.round(unscaledViewport.width),
      naturalH: Math.round(unscaledViewport.height),
    }
  } finally {
    destroyPdfDocument(doc)
  }
}

/**
 * Extracts raw textual content from a PDF page for search and copy features.
 */
export async function extractPdfPageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent()
  return content.items
    .map((item: any) => item.str || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}