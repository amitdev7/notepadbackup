"use client"

// ---------------------------------------------------------------------------
// Zenithsui PDF Canvas Viewer & Renderer Component
//
// Powered by Mozilla PDF.js.
// Features:
// - True high-DPI vector rendering onto HTML5 canvas (no iframes, no browser plugin bugs)
// - Page navigation, direct page entry
// - Smooth zoom (fit-width, fit-page, custom scale from 25% to 400%)
// - 90-degree page rotation
// - Cancelable render tasks to prevent race conditions during rapid navigation
// - Text extraction & search with match navigation
// - Optional page thumbnails sidebar
// - Memory-safe document cleanup
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist"
import {
  loadPdfDocument,
  renderPdfPageToCanvas,
  extractPdfPageText,
  destroyPdfDocument,
  type ActiveRenderTask,
} from "@/lib/pdf/pdf-renderer"
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsIn,
  ArrowsOut,
  ArrowsClockwise,
  SidebarSimple,
  DownloadSimple,
  ArrowSquareOut,
  X,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface PdfCanvasViewerProps {
  blob: Blob | null
  documentName: string
  initialPage?: number
  onPageChange?: (page: number, total: number) => void
  onDownload?: () => void
  onOpenExternal?: () => void
  onClose?: () => void
}

export function PdfCanvasViewer({
  blob,
  documentName,
  initialPage = 1,
  onPageChange,
  onDownload,
  onOpenExternal,
  onClose,
}: PdfCanvasViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [pageInput, setPageInput] = useState<string>(String(initialPage))
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [fitMode, setFitMode] = useState<"custom" | "width" | "page">("width")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [searchResults, setSearchResults] = useState<{ page: number; count: number }[]>([])
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1)
  const [isSearching, setIsSearching] = useState<boolean>(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeTaskRef = useRef<ActiveRenderTask | null>(null)

  // 1. Load PDF Document from Blob
  useEffect(() => {
    if (!blob) {
      setLoadError("No document data available.")
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setLoadError(null)

    loadPdfDocument(blob)
      .then((doc) => {
        if (!isMounted) {
          destroyPdfDocument(doc)
          return
        }
        setPdfDoc(doc)
        setPageCount(doc.numPages)
        const initial = Math.max(1, Math.min(doc.numPages, initialPage))
        setCurrentPage(initial)
        setPageInput(String(initial))
        setIsLoading(false)
        onPageChange?.(initial, doc.numPages)
      })
      .catch((err) => {
        if (!isMounted) return
        console.error("Failed to parse PDF document:", err)
        setLoadError(
          err instanceof Error
            ? `Unable to read PDF file: ${err.message}`
            : "The PDF file is corrupted or unsupported."
        )
        setIsLoading(false)
      })

    return () => {
      isMounted = false
      if (pdfDoc) {
        destroyPdfDocument(pdfDoc)
      }
    }
  }, [blob])

  // 2. Render Page to Canvas whenever currentPage, scale, rotation, or fitMode changes
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return

    // Cancel in-flight render task if user switched page rapidly
    if (activeTaskRef.current) {
      activeTaskRef.current.cancel()
      activeTaskRef.current = null
    }

    setIsRenderingPage(true)

    try {
      const page = await pdfDoc.getPage(currentPage)
      const containerWidth = containerRef.current.clientWidth - 48
      const containerHeight = containerRef.current.clientHeight - 48

      let computedScale = scale

      if (fitMode === "width" && containerWidth > 100) {
        const unscaled = page.getViewport({ scale: 1, rotation })
        computedScale = Math.max(0.3, Math.min(containerWidth / unscaled.width, 3.0))
      } else if (fitMode === "page" && containerHeight > 100 && containerWidth > 100) {
        const unscaled = page.getViewport({ scale: 1, rotation })
        const scaleW = containerWidth / unscaled.width
        const scaleH = containerHeight / unscaled.height
        computedScale = Math.max(0.3, Math.min(Math.min(scaleW, scaleH), 3.0))
      }

      const task = renderPdfPageToCanvas(page, canvasRef.current, {
        scale: computedScale,
        rotation,
        maxPixelRatio: 2.5,
      })

      activeTaskRef.current = task
      await task.promise
      activeTaskRef.current = null
      setIsRenderingPage(false)
    } catch (err: any) {
      // Ignore normal task cancellation
      if (err?.name === "RenderingCancelledException") {
        return
      }
      console.warn("PDF page render warning:", err)
      setIsRenderingPage(false)
    }
  }, [pdfDoc, currentPage, scale, rotation, fitMode])

  useEffect(() => {
    renderCurrentPage()
  }, [renderCurrentPage])

  // 3. Navigation Controls
  const goToPage = useCallback(
    (target: number) => {
      const p = Math.max(1, Math.min(pageCount, target))
      setCurrentPage(p)
      setPageInput(String(p))
      onPageChange?.(p, pageCount)
    },
    [pageCount, onPageChange]
  )

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  const handleNextPage = useCallback(() => {
    if (currentPage < pageCount) goToPage(currentPage + 1)
  }, [currentPage, pageCount, goToPage])

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(pageInput, 10)
    if (!isNaN(parsed)) {
      goToPage(parsed)
    } else {
      setPageInput(String(currentPage))
    }
  }

  // 4. Zoom Controls
  const handleZoomIn = () => {
    setFitMode("custom")
    setScale((prev) => Math.min(4.0, Number((prev * 1.25).toFixed(2))))
  }

  const handleZoomOut = () => {
    setFitMode("custom")
    setScale((prev) => Math.max(0.25, Number((prev / 1.25).toFixed(2))))
  }

  const handleFitWidth = () => {
    setFitMode("width")
  }

  const handleFitPage = () => {
    setFitMode("page")
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // 5. In-Document Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdfDoc || !searchQuery.trim()) return

    setIsSearching(true)
    const q = searchQuery.toLowerCase().trim()
    const matches: { page: number; count: number }[] = []

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const text = await extractPdfPageText(page)
        const count = (text.toLowerCase().match(new RegExp(q, "g")) || []).length
        if (count > 0) {
          matches.push({ page: i, count })
        }
      }

      setSearchResults(matches)
      if (matches.length > 0) {
        setCurrentResultIndex(0)
        goToPage(matches[0].page)
      } else {
        setCurrentResultIndex(-1)
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleNextSearchResult = () => {
    if (searchResults.length === 0) return
    const nextIdx = (currentResultIndex + 1) % searchResults.length
    setCurrentResultIndex(nextIdx)
    goToPage(searchResults[nextIdx].page)
  }

  const handlePrevSearchResult = () => {
    if (searchResults.length === 0) return
    const prevIdx = (currentResultIndex - 1 + searchResults.length) % searchResults.length
    setCurrentResultIndex(prevIdx)
    goToPage(searchResults[prevIdx].page)
  }

  // 6. Keyboard navigation & isolation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow user to type inside inputs without interception
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault()
        e.stopPropagation()
        handlePrevPage()
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault()
        e.stopPropagation()
        handleNextPage()
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        e.stopPropagation()
        handleZoomIn()
      } else if (e.key === "-") {
        e.preventDefault()
        e.stopPropagation()
        handleZoomOut()
      } else if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [handlePrevPage, handleNextPage, onClose])

  return (
    <div className="w-full h-full flex flex-col bg-[var(--sq-paper)] text-[var(--sq-ink)] overflow-hidden select-none">
      {/* 1. Top Header & Action Bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/30 shrink-0">
        <div className="flex items-center gap-3 min-w-0 mr-4">
          <button
            type="button"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={cn(
              "p-1.5 rounded border border-[var(--sq-border)] transition-colors",
              showThumbnails
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                : "bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
            )}
            title="Toggle thumbnail sidebar"
          >
            <SidebarSimple size={16} />
          </button>
          <div className="min-w-0">
            <h2 className="font-bold text-sm truncate leading-tight">{documentName}</h2>
            <div className="text-[10px] opacity-65 flex items-center gap-2 font-mono">
              <span className="uppercase font-semibold">PDF</span>
              <span>• {pageCount} pages</span>
              {rotation > 0 && <span>• {rotation}° rotation</span>}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenExternal && (
            <button
              type="button"
              onClick={onOpenExternal}
              className="p-1.5 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors"
              title="Open externally in browser tab"
            >
              <ArrowSquareOut size={16} />
            </button>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] transition-colors font-medium"
              title="Download original PDF bytes"
            >
              <DownloadSimple size={14} />
              <span>Download</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors ml-1"
              title="Close viewer (Escape)"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Secondary Navigation & Zoom Toolbar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/15 shrink-0 text-xs">
        {/* Page flipping */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-[var(--sq-shade)] disabled:opacity-30 transition-colors"
            title="Previous page (Left arrow)"
          >
            <CaretLeft size={16} />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 font-mono text-xs">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput(String(currentPage))}
              className="w-10 px-1 py-0.5 text-center rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] text-xs font-mono outline-hidden focus:ring-1 focus:ring-[var(--sq-select)]"
            />
            <span className="opacity-60">/ {pageCount}</span>
          </form>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= pageCount}
            className="p-1 rounded hover:bg-[var(--sq-shade)] disabled:opacity-30 transition-colors"
            title="Next page (Right arrow)"
          >
            <CaretRight size={16} />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
            title="Zoom out (-)"
          >
            <MagnifyingGlassMinus size={16} />
          </button>
          <span className="font-mono text-[11px] w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors"
            title="Zoom in (+)"
          >
            <MagnifyingGlassPlus size={16} />
          </button>

          <div className="h-4 w-px bg-[var(--sq-border)] mx-1" />

          <button
            type="button"
            onClick={handleFitWidth}
            className={cn(
              "px-2 py-0.5 rounded border border-[var(--sq-border)] transition-colors text-[11px]",
              fitMode === "width"
                ? "bg-[var(--sq-shade)] font-bold"
                : "bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)]"
            )}
            title="Fit to width"
          >
            <ArrowsIn size={12} className="inline mr-1" /> Width
          </button>

          <button
            type="button"
            onClick={handleFitPage}
            className={cn(
              "px-2 py-0.5 rounded border border-[var(--sq-border)] transition-colors text-[11px]",
              fitMode === "page"
                ? "bg-[var(--sq-shade)] font-bold"
                : "bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)]"
            )}
            title="Fit whole page"
          >
            <ArrowsOut size={12} className="inline mr-1" /> Page
          </button>

          <button
            type="button"
            onClick={handleRotate}
            className="p-1 rounded hover:bg-[var(--sq-shade)] transition-colors ml-1"
            title="Rotate 90° clockwise"
          >
            <ArrowsClockwise size={16} />
          </button>
        </div>

        {/* Document Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search in PDF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-36 pl-6 pr-2 py-0.5 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] text-[11px] outline-hidden focus:ring-1 focus:ring-[var(--sq-select)]"
            />
            <MagnifyingGlass
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50"
            />
          </div>

          {isSearching && <CircleNotch size={14} className="animate-spin opacity-60" />}

          {searchResults.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] font-mono">
              <span className="opacity-60 px-1">
                {currentResultIndex + 1}/{searchResults.length}
              </span>
              <button
                type="button"
                onClick={handlePrevSearchResult}
                className="p-0.5 rounded hover:bg-[var(--sq-shade)]"
              >
                <CaretLeft size={12} />
              </button>
              <button
                type="button"
                onClick={handleNextSearchResult}
                className="p-0.5 rounded hover:bg-[var(--sq-shade)]"
              >
                <CaretRight size={12} />
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 3. Main Stage & Sidebar */}
      <div className="flex-1 min-h-0 relative flex overflow-hidden bg-stone-100 dark:bg-stone-900/60">
        {/* Thumbnails Sidebar */}
        {showThumbnails && pdfDoc && (
          <div className="w-44 border-r border-[var(--sq-border)] bg-[var(--sq-paper)] overflow-y-auto p-3 flex flex-col gap-3 shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 px-1">
              Pages ({pageCount})
            </div>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-md border text-center transition-all",
                  currentPage === p
                    ? "border-[var(--sq-ink)] bg-[var(--sq-shade)]/60 ring-2 ring-[var(--sq-select)]"
                    : "border-[var(--sq-border)] hover:border-[var(--sq-ink)]/50 bg-[var(--sq-paper)]"
                )}
              >
                <div className="w-24 h-32 bg-white rounded-xs shadow-xs border border-stone-200 flex items-center justify-center text-xs text-stone-400 font-mono">
                  {p}
                </div>
                <span className="text-[10px] font-mono font-semibold">Page {p}</span>
              </button>
            ))}
          </div>
        )}

        {/* Center Canvas Display Area */}
        <div
          ref={containerRef}
          className="flex-1 h-full overflow-auto p-6 flex flex-col items-center justify-start relative"
        >
          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--sq-paper)]/80 backdrop-blur-xs z-20">
              <CircleNotch size={32} className="animate-spin text-[var(--sq-ink)]" />
              <p className="text-xs font-mono font-medium">Initializing PDF Engine...</p>
            </div>
          )}

          {/* Load Error Card */}
          {loadError && (
            <div className="m-auto p-8 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 max-w-md text-center shadow-lg">
              <WarningCircle size={40} className="mx-auto mb-3 text-red-600 dark:text-red-400" />
              <h3 className="font-bold text-sm mb-1">Unable to Open PDF</h3>
              <p className="text-xs opacity-80 mb-4">{loadError}</p>
              <div className="flex items-center justify-center gap-2">
                {onDownload && (
                  <button
                    type="button"
                    onClick={onDownload}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Download Original
                  </button>
                )}
                {onOpenExternal && (
                  <button
                    type="button"
                    onClick={onOpenExternal}
                    className="px-3 py-1.5 rounded text-xs border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    Open Externally
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Genuine PDF Canvas */}
          {!loadError && (
            <div className="relative shadow-2xl rounded-xs overflow-hidden transition-all duration-150">
              {isRenderingPage && (
                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <CircleNotch size={24} className="animate-spin text-[var(--sq-ink)]" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="block bg-white shadow-md rounded-xs border border-stone-300"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}