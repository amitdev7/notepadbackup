"use client"

// ---------------------------------------------------------------------------
// PDF renderer — parses PDF files and renders pages to data URL previews.
// Uses pdfjs-dist on the client with lazy loading and memory caching.
// ---------------------------------------------------------------------------

let pdfjsLib: typeof import("pdfjs-dist") | null = null

async function getPdfJs() {
  if (typeof window === "undefined") return null
  if (pdfjsLib) return pdfjsLib
  try {
    const pdfjs = await import("pdfjs-dist")
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
    }
    pdfjsLib = pdfjs
    return pdfjs
  } catch (err) {
    console.warn("Could not load pdfjs-dist", err)
    return null
  }
}

/** Cache of rendered page data URLs keyed by `${pdfSrcOrHash}_p${pageNumber}` */
const pageRenderCache = new Map<string, string>()

/** Maximum dimension for placed/rendered preview thumbnail */
const MAX_PREVIEW_EDGE = 1200

export interface PdfDocumentInfo {
  pageCount: number
  naturalW: number
  naturalH: number
  aspectRatio: number
}

/** Check if a blob or byte array begins with '%PDF-' header signature */
export function isValidPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false
  // %PDF- is [0x25, 0x50, 0x44, 0x46, 0x2D]
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/** Convert a data URI to Uint8Array safely */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf(";base64,")
  if (base64Index !== -1) {
    const base64 = dataUrl.slice(base64Index + 8)
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  return new Uint8Array()
}

/** Get basic PDF metadata and first page dimensions */
export async function getPdfInfo(srcOrBytes: string | Uint8Array): Promise<PdfDocumentInfo | null> {
  const pdfjs = await getPdfJs()
  if (!pdfjs) return null

  try {
    const data = typeof srcOrBytes === "string" ? dataUrlToBytes(srcOrBytes) : srcOrBytes
    if (!isValidPdfHeader(data)) {
      return null
    }

    const loadingTask = pdfjs.getDocument({
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
      useSystemFonts: true,
    })
    const doc = await loadingTask.promise
    const pageCount = doc.numPages || 1
    const firstPage = await doc.getPage(1)
    const viewport = firstPage.getViewport({ scale: 1.0 })
    const naturalW = Math.round(viewport.width)
    const naturalH = Math.round(viewport.height)

    return {
      pageCount,
      naturalW,
      naturalH,
      aspectRatio: naturalW / Math.max(1, naturalH),
    }
  } catch (err) {
    console.error("Failed to parse PDF info:", err)
    return null
  }
}

/** Render a specific 1-based page of a PDF document to a data URL */
export async function renderPdfPage(
  srcOrBytes: string | Uint8Array,
  pageNumber = 1,
  cacheKey?: string
): Promise<string | null> {
  const key = cacheKey ? `${cacheKey}_p${pageNumber}` : null
  if (key && pageRenderCache.has(key)) {
    return pageRenderCache.get(key)!
  }

  const pdfjs = await getPdfJs()
  if (!pdfjs) return null

  try {
    const data = typeof srcOrBytes === "string" ? dataUrlToBytes(srcOrBytes) : srcOrBytes
    if (!isValidPdfHeader(data)) return null

    const loadingTask = pdfjs.getDocument({
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
      useSystemFonts: true,
    })
    const doc = await loadingTask.promise
    const safePageNumber = Math.max(1, Math.min(doc.numPages, pageNumber))
    const page = await doc.getPage(safePageNumber)

    const unscaledViewport = page.getViewport({ scale: 1.0 })
    const maxDim = Math.max(unscaledViewport.width, unscaledViewport.height)
    const scale = Math.min(2.0, MAX_PREVIEW_EDGE / Math.max(1, maxDim))
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // White background for transparent PDF pages
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Render page
    const renderContext = {
      canvasContext: ctx,
      viewport,
    }
    // @ts-expect-error pdfjs render typing
    await page.render(renderContext).promise

    const dataUrl = canvas.toDataURL("image/png", 0.9)
    if (key) {
      pageRenderCache.set(key, dataUrl)
    }
    return dataUrl
  } catch (err) {
    console.error(`Failed to render PDF page ${pageNumber}:`, err)
    return null
  }
}

/** Render a thumbnail preview for rail navigation */
export async function renderPdfThumbnail(
  srcOrBytes: string | Uint8Array,
  pageNumber = 1,
  cacheKey?: string
): Promise<string | null> {
  return renderPdfPage(srcOrBytes, pageNumber, cacheKey)
}

/** Render a PDF page at custom scale/DPR for crystal-clear presentation/smart board viewing */
export async function renderPdfPageHighRes(
  srcOrBytes: string | Uint8Array,
  pageNumber = 1,
  desiredWidth = 1600
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const pdfjs = await getPdfJs()
  if (!pdfjs) return null

  try {
    const data = typeof srcOrBytes === "string" ? dataUrlToBytes(srcOrBytes) : srcOrBytes
    if (!isValidPdfHeader(data)) return null

    const loadingTask = pdfjs.getDocument({
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
      useSystemFonts: true,
    })
    const doc = await loadingTask.promise
    const safePageNumber = Math.max(1, Math.min(doc.numPages, pageNumber))
    const page = await doc.getPage(safePageNumber)

    const unscaled = page.getViewport({ scale: 1.0 })
    const scale = Math.max(1.0, desiredWidth / Math.max(1, unscaled.width))
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // @ts-expect-error pdfjs render typing
    await page.render({ canvasContext: ctx, viewport }).promise

    return {
      dataUrl: canvas.toDataURL("image/png", 0.92),
      width: canvas.width,
      height: canvas.height,
    }
  } catch (err) {
    console.error("renderPdfPageHighRes failed:", err)
    return null
  }
}

/** Extract text items with bounding coordinates from a PDF page */
export async function extractPdfPageText(
  srcOrBytes: string | Uint8Array,
  pageNumber = 1
): Promise<{ text: string; items: { str: string; x: number; y: number; w: number; h: number }[] } | null> {
  const pdfjs = await getPdfJs()
  if (!pdfjs) return null

  try {
    const data = typeof srcOrBytes === "string" ? dataUrlToBytes(srcOrBytes) : srcOrBytes
    if (!isValidPdfHeader(data)) return null

    const loadingTask = pdfjs.getDocument({
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
    })
    const doc = await loadingTask.promise
    const safePageNumber = Math.max(1, Math.min(doc.numPages, pageNumber))
    const page = await doc.getPage(safePageNumber)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1.0 })

    const items: { str: string; x: number; y: number; w: number; h: number }[] = []
    let fullText = ""

    for (const item of textContent.items as any[]) {
      if (!item.str) continue
      fullText += item.str + " "
      const tx = item.transform
      const x = tx[4] / viewport.width
      const y = (viewport.height - tx[5] - (item.height || 12)) / viewport.height
      const w = (item.width || 0) / viewport.width
      const h = (item.height || 12) / viewport.height
      items.push({ str: item.str, x, y, w, h })
    }

    return { text: fullText.trim(), items }
  } catch (err) {
    console.error("extractPdfPageText failed:", err)
    return null
  }
}

/** Search document text across all pages */
export async function searchPdfText(
  srcOrBytes: string | Uint8Array,
  query: string
): Promise<{ pageNumber: number; matches: number }[]> {
  if (!query || query.trim().length === 0) return []
  const pdfjs = await getPdfJs()
  if (!pdfjs) return []

  try {
    const data = typeof srcOrBytes === "string" ? dataUrlToBytes(srcOrBytes) : srcOrBytes
    if (!isValidPdfHeader(data)) return []

    const loadingTask = pdfjs.getDocument({
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
    })
    const doc = await loadingTask.promise
    const results: { pageNumber: number; matches: number }[] = []
    const lowerQuery = query.toLowerCase()

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      let count = 0
      for (const item of content.items as any[]) {
        if (item.str && item.str.toLowerCase().includes(lowerQuery)) {
          count++
        }
      }
      if (count > 0) {
        results.push({ pageNumber: p, matches: count })
      }
    }

    return results
  } catch {
    return []
  }
}

/** Construct a PdfNode from a File object */
export async function pdfNodeFrom(file: File, filename?: string): Promise<any | null> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  if (!isValidPdfHeader(bytes)) return null

  const info = await getPdfInfo(bytes)
  if (!info) return null

  const previewSrc = (await renderPdfPage(bytes, 1)) || ""
  const { storePdfAttachment } = await import("./pdf-attachment-store")
  const attachmentId = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Convert to base64
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const dataUrl = `data:application/pdf;base64,${btoa(binary)}`

  await storePdfAttachment(attachmentId, dataUrl, filename || file.name)

  const defaultW = 320
  const defaultH = Math.round(defaultW / (info.aspectRatio || 0.77))

  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: "pdf",
    name: filename || file.name || "Document.pdf",
    fileSize: file.size,
    src: dataUrl,
    attachmentId,
    pageCount: info.pageCount,
    currentPage: 1,
    previewSrc,
    naturalW: info.naturalW,
    naturalH: info.naturalH,
    x: 100,
    y: 100,
    w: defaultW,
    h: defaultH,
    seed: Math.floor(Math.random() * 10000),
    annotationsByPage: {},
  }
}

/** Trigger download of the original PDF */
export async function downloadOriginalPdf(srcOrAttachmentId: string, filename = "document.pdf") {
  let downloadUrl = srcOrAttachmentId
  if (!srcOrAttachmentId.startsWith("data:") && !srcOrAttachmentId.startsWith("http")) {
    const { getStoredPdfAttachment } = await import("./pdf-attachment-store")
    const stored = await getStoredPdfAttachment(srcOrAttachmentId)
    if (stored) {
      downloadUrl = stored
    } else {
      downloadUrl = `/api/attachments/${encodeURIComponent(srcOrAttachmentId)}`
    }
  }

  const a = document.createElement("a")
  a.href = downloadUrl
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
