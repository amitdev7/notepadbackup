"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Full PDF Classroom & Smart Board System
//
// Features:
// - Multi-page navigation & filmstrip thumbnail drawer
// - High-DPI crisp rendering
// - Normalized annotation canvas (pen, highlighter, rough shapes, text)
// - Presenter tools: laser pointer trail, spotlight, magnifier, ruler/grid
// - Whiteboard mode toggle
// - Full-text search with match jump
// - Export annotated slide to PNG & download original PDF
// - Seamless napkin sketch aesthetic with zero coordinate drift
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react"
import { useSquig } from "@/lib/store"
import type { PdfNode, PdfPageAnnotation, PdfStrokeAnnotation, PdfShapeAnnotation, PdfTextAnnotation, PdfImageAnnotation } from "@/lib/types"
import {
  renderPdfPageHighRes,
  renderPdfPage,
  searchPdfText,
  downloadOriginalPdf,
} from "@/lib/pdf-renderer"
import { PdfTextEditorOverlay } from "./pdf-text-editor-overlay"
import rough from "roughjs"
import {
  CaretLeft as PrevIcon,
  CaretRight as NextIcon,
  X as CloseIcon,
  PencilSimple as PenIcon,
  HighlighterCircle as HighlightIcon,
  Eraser as EraserIcon,
  Square as RectIcon,
  Circle as EllipseIcon,
  ArrowUpRight as ArrowIcon,
  Minus as LineIcon,
  TextT as TextIcon,
  Crosshair as LaserIcon,
  Sun as SpotlightIcon,
  MagnifyingGlassPlus as ZoomInIcon,
  MagnifyingGlassMinus as ZoomOutIcon,
  MagnifyingGlass as SearchIcon,
  DownloadSimple as DownloadIcon,
  FileImage as ExportImageIcon,
  Chalkboard as WhiteboardIcon,
  GridFour as GridIcon,
  Ruler as RulerIcon,
  ArrowUUpLeft as UndoIcon,
  ArrowUUpRight as RedoIcon,
  ArrowsOut as MaximizeIcon,
  ArrowsIn as MinimizeIcon,
  Check as CheckIcon,
  ImageSquare as ImageSquareIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

type SmartTool =
  | "select"
  | "pen"
  | "highlighter"
  | "eraser"
  | "rect"
  | "ellipse"
  | "arrow"
  | "line"
  | "text"
  | "laser"
  | "spotlight"
  | "magnifier"

export function PdfClassroomModal() {
  const activeId = useSquig((s) => s.activePdfModalNodeId)
  const setActivePdfModalNodeId = useSquig((s) => s.setActivePdfModalNodeId)
  const node = useSquig((s) => (activeId ? (s.nodes[activeId] as PdfNode | undefined) : undefined))
  const updateNode = useSquig((s) => s.updateNode)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageImage, setPageImage] = useState<string | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const [fitMode, setFitMode] = useState<"width" | "page" | "custom">("width")
  const [activeTool, setActiveTool] = useState<SmartTool>("pen")
  const drawColor = useSquig((s) => s.drawColor)
  const [penColor, setPenColor] = useState(drawColor || "#1e1e1e")

  useEffect(() => {
    if (drawColor) {
      setPenColor(drawColor)
    }
  }, [drawColor])
  const [penWeight, setPenWeight] = useState(2.5)
  const [isWhiteboard, setIsWhiteboard] = useState(false)
  const [showRuler, setShowRuler] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false)
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ pageNumber: number; matches: number }[]>([])

  // Presenter laser & spotlight coordinates
  const [pointerNorm, setPointerNorm] = useState<{ x: number; y: number } | null>(null)
  const [laserPoints, setLaserPoints] = useState<{ x: number; y: number; age: number }[]>([])

  // Annotation drawing state
  const [annotations, setAnnotations] = useState<PdfPageAnnotation[]>([])
  const [undoStack, setUndoStack] = useState<PdfPageAnnotation[][]>([])
  const [redoStack, setRedoStack] = useState<PdfPageAnnotation[][]>([])
  const [drawingStroke, setDrawingStroke] = useState<[number, number][] | null>(null)
  const [drawingShapeStart, setDrawingShapeStart] = useState<[number, number] | null>(null)
  const [drawingShapeCurrent, setDrawingShapeCurrent] = useState<[number, number] | null>(null)
  const [editingText, setEditingText] = useState<{
    id?: string
    x: number
    y: number
    text: string
    fontSize: number
    color: string
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const interactiveLayerRef = useRef<SVGSVGElement>(null)

  // Initialize from node
  useEffect(() => {
    if (node) {
      setPage(node.currentPage || 1)
      setTotalPages(node.pageCount || 1)
      const pageAnn = node.annotationsByPage?.[node.currentPage || 1] || []
      setAnnotations(pageAnn)
      setUndoStack([])
      setRedoStack([])
    }
  }, [node?.id])

  // Sync annotations to node on page change or close
  const persistAnnotations = useCallback(
    (newAnn: PdfPageAnnotation[], targetPage: number) => {
      if (!node) return
      const currentMap = node.annotationsByPage || {}
      updateNode(node.id, {
        currentPage: targetPage,
        annotationsByPage: {
          ...currentMap,
          [targetPage]: newAnn,
        },
      })
    },
    [node, updateNode]
  )

  // Load high-resolution page
  useEffect(() => {
    if (!node?.src) return
    let active = true
    setIsLoadingPage(true)

    renderPdfPageHighRes(node.src, page, 1600).then((res) => {
      if (!active) return
      if (res) {
        setPageImage(res.dataUrl)
      }
      setIsLoadingPage(false)
    })

    // Load annotations for this page
    const pageAnn = node.annotationsByPage?.[page] || []
    setAnnotations(pageAnn)
    setUndoStack([])
    setRedoStack([])

    return () => {
      active = false
    }
  }, [node?.src, page])

  // Pre-fetch thumbnails when drawer opens
  useEffect(() => {
    if (!thumbnailsOpen || !node?.src) return
    const maxToLoad = Math.min(totalPages, 20)
    for (let p = 1; p <= maxToLoad; p++) {
      if (!thumbnailUrls[p]) {
        renderPdfPage(node.src, p, `${node.id}_thumb`).then((url) => {
          if (url) {
            setThumbnailUrls((prev) => ({ ...prev, [p]: url }))
          }
        })
      }
    }
  }, [thumbnailsOpen, node?.src, node?.id, totalPages, thumbnailUrls])

  // Laser pointer fading animation
  useEffect(() => {
    if (activeTool !== "laser") {
      setLaserPoints([])
      return
    }
    const interval = setInterval(() => {
      setLaserPoints((prev) =>
        prev
          .map((pt) => ({ ...pt, age: pt.age + 1 }))
          .filter((pt) => pt.age < 15)
      )
    }, 30)
    return () => clearInterval(interval)
  }, [activeTool])

  // Close modal handler
  const handleClose = () => {
    persistAnnotations(annotations, page)
    setActivePdfModalNodeId(null)
  }

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!activeId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          handleClose()
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (page > 1) {
          persistAnnotations(annotations, page)
          setPage((p) => p - 1)
        }
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (page < totalPages) {
          persistAnnotations(annotations, page)
          setPage((p) => p + 1)
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeId, page, totalPages, annotations, isFullscreen, persistAnnotations])

  if (!activeId || !node) return null

  // Pointer normalized coordinate conversion helper
  const getNormalizedPoint = (e: React.PointerEvent<SVGSVGElement>): [number, number] | null => {
    const svg = interactiveLayerRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return [nx, ny]
  }

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack((r) => [annotations, ...r])
    setUndoStack((u) => u.slice(0, -1))
    setAnnotations(prev)
    persistAnnotations(prev, page)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[0]
    setUndoStack((u) => [...u, annotations])
    setRedoStack((r) => r.slice(1))
    setAnnotations(next)
    persistAnnotations(next, page)
  }

  const commitAnnotation = (newAnn: PdfPageAnnotation) => {
    setUndoStack((u) => [...u, annotations])
    setRedoStack([])
    const updated = [...annotations, newAnn]
    setAnnotations(updated)
    persistAnnotations(updated, page)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle image pasting and file upload onto the Smart Board
  const addImageToPage = useCallback(
    (dataUrl: string, name?: string) => {
      if (!node) return
      const img = new Image()
      img.onload = () => {
        const nw = img.naturalWidth || 800
        const nh = img.naturalHeight || 600
        const aspect = nw / Math.max(1, nh)
        const wNorm = Math.min(0.85, Math.max(0.3, aspect >= 1 ? 0.7 : 0.7 * aspect))
        const hNorm = Math.min(0.85, Math.max(0.3, aspect >= 1 ? 0.7 / aspect : 0.7))
        const newImgAnn: PdfImageAnnotation = {
          id: `ann_img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: "image",
          x: Math.max(0.05, (1 - wNorm) / 2),
          y: Math.max(0.05, (1 - hNorm) / 2),
          w: wNorm,
          h: hNorm,
          src: dataUrl,
          name: name || "Pasted Image",
        }
        commitAnnotation(newImgAnn)
        if (!node.previewSrc) {
          updateNode(node.id, { previewSrc: dataUrl })
        }
      }
      img.src = dataUrl
    },
    [node, commitAnnotation, updateNode]
  )

  useEffect(() => {
    if (!activeId) return
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (!file) continue
          e.preventDefault()
          const reader = new FileReader()
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            if (dataUrl) addImageToPage(dataUrl, file.name)
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [activeId, addImageToPage])

  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) addImageToPage(dataUrl, file.name)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Interactive Layer Pointer Events
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getNormalizedPoint(e)
    if (!pt) return

    if (activeTool === "pen" || activeTool === "highlighter") {
      setDrawingStroke([pt])
    } else if (
      activeTool === "rect" ||
      activeTool === "ellipse" ||
      activeTool === "arrow" ||
      activeTool === "line"
    ) {
      setDrawingShapeStart(pt)
      setDrawingShapeCurrent(pt)
    } else if (activeTool === "text") {
      setEditingText({
        x: pt[0],
        y: pt[1],
        text: "",
        fontSize: 16,
        color: penColor,
      })
    } else if (activeTool === "eraser") {
      // Find closest annotation within threshold
      const [nx, ny] = pt
      const filtered = annotations.filter((ann) => {
        if (ann.type === "stroke") {
          return !ann.points.some(([px, py]) => Math.hypot(px - nx, py - ny) < 0.03)
        }
        if (ann.type === "shape") {
          return !(
            nx >= ann.x - 0.02 &&
            nx <= ann.x + ann.w + 0.02 &&
            ny >= ann.y - 0.02 &&
            ny <= ann.y + ann.h + 0.02
          )
        }
        if (ann.type === "text") {
          return Math.hypot(ann.x - nx, ann.y - ny) >= 0.05
        }
        return true
      })
      if (filtered.length !== annotations.length) {
        setUndoStack((u) => [...u, annotations])
        setAnnotations(filtered)
        persistAnnotations(filtered, page)
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getNormalizedPoint(e)
    if (!pt) return

    setPointerNorm({ x: pt[0], y: pt[1] })

    if (activeTool === "laser") {
      setLaserPoints((prev) => [{ x: pt[0], y: pt[1], age: 0 }, ...prev.slice(0, 25)])
    }

    if (drawingStroke) {
      setDrawingStroke((prev) => (prev ? [...prev, pt] : [pt]))
    } else if (drawingShapeStart) {
      setDrawingShapeCurrent(pt)
    }
  }

  const handlePointerUp = () => {
    if (drawingStroke && drawingStroke.length > 1) {
      const strokeAnn: PdfStrokeAnnotation = {
        id: `s_${Date.now()}`,
        type: "stroke",
        points: drawingStroke,
        color: activeTool === "highlighter" ? "#ffeb3b" : penColor,
        strokeWidth: activeTool === "highlighter" ? 14 : penWeight,
        opacity: activeTool === "highlighter" ? 0.35 : 1,
        isHighlighter: activeTool === "highlighter",
      }
      commitAnnotation(strokeAnn)
      setDrawingStroke(null)
    } else {
      setDrawingStroke(null)
    }

    if (drawingShapeStart && drawingShapeCurrent) {
      const minX = Math.min(drawingShapeStart[0], drawingShapeCurrent[0])
      const minY = Math.min(drawingShapeStart[1], drawingShapeCurrent[1])
      const w = Math.abs(drawingShapeCurrent[0] - drawingShapeStart[0])
      const h = Math.abs(drawingShapeCurrent[1] - drawingShapeStart[1])

      if (w > 0.005 || h > 0.005) {
        const shapeAnn: PdfShapeAnnotation = {
          id: `sh_${Date.now()}`,
          type: "shape",
          kind: activeTool as "rect" | "ellipse" | "arrow" | "line",
          x: minX,
          y: minY,
          w: Math.max(0.01, w),
          h: Math.max(0.01, h),
          color: penColor,
          strokeWidth: penWeight,
        }
        commitAnnotation(shapeAnn)
      }
      setDrawingShapeStart(null)
      setDrawingShapeCurrent(null)
    }
  }

  // Export current slide as PNG
  const handleExportSlide = () => {
    if (!pageImage) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = pageImage
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Draw PDF base page
      if (!isWhiteboard) {
        ctx.drawImage(img, 0, 0)
      } else {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Render annotations using Rough.js on canvas
      const rc = rough.canvas(canvas)
      for (const ann of annotations) {
        if (ann.type === "stroke") {
          ctx.beginPath()
          ctx.strokeStyle = ann.color
          ctx.lineWidth = ann.strokeWidth * (canvas.width / 800)
          ctx.globalAlpha = ann.opacity
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          const pts = ann.points.map(([nx, ny]) => [nx * canvas.width, ny * canvas.height])
          if (pts.length > 0) {
            ctx.moveTo(pts[0][0], pts[0][1])
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i][0], pts[i][1])
            }
            ctx.stroke()
          }
          ctx.globalAlpha = 1
        } else if (ann.type === "image" && ann.src) {
          const annImg = new Image()
          annImg.src = ann.src
          if (annImg.complete) {
            ctx.drawImage(
              annImg,
              ann.x * canvas.width,
              ann.y * canvas.height,
              ann.w * canvas.width,
              ann.h * canvas.height
            )
          }
        } else if (ann.type === "shape") {
          const x = ann.x * canvas.width
          const y = ann.y * canvas.height
          const w = ann.w * canvas.width
          const h = ann.h * canvas.height
          if (ann.kind === "rect") {
            rc.rectangle(x, y, w, h, { stroke: ann.color, strokeWidth: ann.strokeWidth * 1.5, roughness: 1.2 })
          } else if (ann.kind === "ellipse") {
            rc.ellipse(x + w / 2, y + h / 2, w, h, { stroke: ann.color, strokeWidth: ann.strokeWidth * 1.5, roughness: 1.2 })
          } else if (ann.kind === "line") {
            rc.line(x, y, x + w, y + h, { stroke: ann.color, strokeWidth: ann.strokeWidth * 1.5, roughness: 1.2 })
          } else if (ann.kind === "arrow") {
            rc.line(x, y, x + w, y + h, { stroke: ann.color, strokeWidth: ann.strokeWidth * 1.5, roughness: 1.2 })
          }
        } else if (ann.type === "text") {
          ctx.font = `${ann.fontSize * (canvas.width / 800)}px sans-serif`
          ctx.fillStyle = ann.color
          ctx.fillText(ann.text, ann.x * canvas.width, ann.y * canvas.height)
        }
      }

      const link = document.createElement("a")
      link.download = `${node.name.replace(/\.pdf$/i, "")}_p${page}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    }
  }

  // Search execution
  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim() || !node?.src) {
      setSearchResults([])
      return
    }
    const results = await searchPdfText(node.src, q)
    setSearchResults(results)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{
        backgroundColor: "var(--sq-bg)",
        fontFamily: "var(--sq-font)",
        color: "var(--sq-ink)",
      }}
    >
      {/* Top Header Bar */}
      <header
        className="flex h-12 items-center justify-between border-b px-4 shrink-0"
        style={{ borderColor: "var(--sq-border)", backgroundColor: "var(--sq-paper)" }}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm truncate max-w-[240px]">
            {node.name}
          </span>
          <span
            className="rounded border px-2 py-0.5 text-xs"
            style={{ borderColor: "var(--sq-border)", backgroundColor: "var(--sq-bg)" }}
          >
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setThumbnailsOpen((o) => !o)}
            className="text-xs underline hover:opacity-80"
          >
            {thumbnailsOpen ? "Hide Slides" : "All Slides"}
          </button>
        </div>

        {/* Center Smart Board Presentation Mode Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              persistAnnotations(annotations, page)
              setPage((p) => Math.max(1, p - 1))
            }}
            title="Previous Page (Left Arrow)"
          >
            <PrevIcon size={16} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              persistAnnotations(annotations, page)
              setPage((p) => Math.min(totalPages, p + 1))
            }}
            title="Next Page (Right Arrow)"
          >
            <NextIcon size={16} />
          </Button>

          <div className="h-4 w-[1px] mx-1" style={{ backgroundColor: "var(--sq-border)" }} />

          {/* Whiteboard Mode Toggle */}
          <Button
            variant={isWhiteboard ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsWhiteboard((w) => !w)}
            className="gap-1 text-xs"
            title="Switch between PDF Slide and Blank Whiteboard"
          >
            <WhiteboardIcon size={16} />
            <span>{isWhiteboard ? "Whiteboard" : "Slide"}</span>
          </Button>

          {/* Grid & Ruler Toggles */}
          <Button
            variant={showGrid ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowGrid((g) => !g)}
            title="Toggle Math / Graph Grid"
          >
            <GridIcon size={16} />
          </Button>
          <Button
            variant={showRuler ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowRuler((r) => !r)}
            title="Toggle Ruler Measurement Guides"
          >
            <RulerIcon size={16} />
          </Button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            title="Zoom Out"
          >
            <ZoomOutIcon size={16} />
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            title="Zoom In"
          >
            <ZoomInIcon size={16} />
          </Button>

          <div className="h-4 w-[1px] mx-1" style={{ backgroundColor: "var(--sq-border)" }} />

          {/* Search in PDF */}
          <Button
            variant={searchOpen ? "default" : "ghost"}
            size="sm"
            onClick={() => setSearchOpen((s) => !s)}
            title="Search in PDF (⌘F)"
          >
            <SearchIcon size={16} />
          </Button>

          {/* Insert / Paste Image */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadImageFile}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Paste / Insert Image onto Smart Board"
          >
            <ImageSquareIcon size={16} />
          </Button>

          {/* Export Slide */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportSlide}
            title="Export Slide with Annotations (PNG)"
          >
            <ExportImageIcon size={16} />
          </Button>

          {/* Download Original PDF */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadOriginalPdf(node.src, node.name)}
            title="Download Original PDF"
          >
            <DownloadIcon size={16} />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen((f) => !f)}
            title="Toggle Presentation Fullscreen"
          >
            {isFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            title="Close Smart Board (Esc)"
          >
            <CloseIcon size={18} />
          </Button>
        </div>
      </header>

      {/* Search Drawer */}
      {searchOpen && (
        <div
          className="flex items-center gap-2 border-b px-4 py-2 z-10 shrink-0"
          style={{ borderColor: "var(--sq-border)", backgroundColor: "var(--sq-paper)" }}
        >
          <SearchIcon size={16} />
          <input
            type="text"
            placeholder="Search words across all PDF slides…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 rounded border px-2 py-1 text-xs bg-transparent outline-none"
            style={{ borderColor: "var(--sq-border)" }}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-muted-foreground text-[11px]">Matches on:</span>
              {searchResults.map((res) => (
                <button
                  key={res.pageNumber}
                  onClick={() => {
                    persistAnnotations(annotations, page)
                    setPage(res.pageNumber)
                  }}
                  className={`px-2 py-0.5 rounded border text-xs ${
                    page === res.pageNumber ? "font-bold underline" : ""
                  }`}
                  style={{ borderColor: "var(--sq-border)" }}
                >
                  p.{res.pageNumber} ({res.matches})
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
            <CloseIcon size={14} />
          </Button>
        </div>
      )}

      {/* Main Classroom Presentation Stage */}
      <div className="relative flex-1 overflow-auto flex items-center justify-center p-4 bg-dot-grid">
        {/* Stage Container */}
        <div
          ref={containerRef}
          className="relative shadow-2xl transition-transform duration-75 origin-center"
          style={{
            transform: `scale(${zoom})`,
            backgroundColor: "#ffffff",
            maxWidth: fitMode === "width" ? "100%" : undefined,
            border: "1px solid var(--sq-border)",
            borderRadius: "4px",
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "copy"
          }}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file && file.type.startsWith("image/")) {
              const reader = new FileReader()
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string
                if (dataUrl) addImageToPage(dataUrl, file.name)
              }
              reader.readAsDataURL(file)
            }
          }}
        >
          {/* Base PDF Render or Blank Whiteboard */}
          {!isWhiteboard && (pageImage || node.previewSrc) ? (
            <img
              src={pageImage || node.previewSrc}
              alt={`Page ${page}`}
              className="block max-h-[82vh] w-auto pointer-events-none select-none"
              style={{ minWidth: "480px" }}
            />
          ) : (
            <div
              className="w-[850px] h-[600px] bg-white pointer-events-none"
              style={{
                backgroundImage: showGrid
                  ? "radial-gradient(#d1d5db 1px, transparent 1px)"
                  : undefined,
                backgroundSize: "20px 20px",
              }}
            />
          )}

          {/* Grid Overlay for PDF */}
          {!isWhiteboard && showGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(#9ca3af 1.2px, transparent 1.2px)",
                backgroundSize: "24px 24px",
                opacity: 0.6,
              }}
            />
          )}

          {/* Ruler Overlay */}
          {showRuler && (
            <div className="absolute inset-x-0 top-0 h-6 border-b border-blue-400 bg-blue-50/50 flex justify-between px-2 text-[9px] text-blue-800 font-mono pointer-events-none">
              <span>0 cm</span>
              <span>5 cm</span>
              <span>10 cm</span>
              <span>15 cm</span>
              <span>20 cm</span>
            </div>
          )}

          {/* SVG Annotation & Interaction Layer */}
          <svg
            ref={interactiveLayerRef}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Render Existing Annotations */}
            {annotations.map((ann) => {
              if (ann.type === "image" && ann.src) {
                const x = (ann.x ?? 0) * 1000
                const y = (ann.y ?? 0) * 1000
                const w = (ann.w ?? 0.8) * 1000
                const h = (ann.h ?? 0.6) * 1000
                return (
                  <image
                    key={ann.id}
                    href={ann.src}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )
              }
              if (ann.type === "stroke") {
                const d = ann.points.reduce((acc, [nx, ny], idx) => {
                  const x = nx * 1000
                  const y = ny * 1000
                  return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
                }, "")
                return (
                  <path
                    key={ann.id}
                    d={d}
                    fill="none"
                    stroke={ann.color}
                    strokeWidth={ann.strokeWidth * (ann.isHighlighter ? 5 : 2.5)}
                    strokeOpacity={ann.opacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )
              }
              if (ann.type === "shape") {
                const x = ann.x * 1000
                const y = ann.y * 1000
                const w = ann.w * 1000
                const h = ann.h * 1000
                if (ann.kind === "rect") {
                  return (
                    <rect
                      key={ann.id}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="none"
                      stroke={ann.color}
                      strokeWidth={ann.strokeWidth * 2.5}
                      strokeDasharray="4 2"
                    />
                  )
                }
                if (ann.kind === "ellipse") {
                  return (
                    <ellipse
                      key={ann.id}
                      cx={x + w / 2}
                      cy={y + h / 2}
                      rx={w / 2}
                      ry={h / 2}
                      fill="none"
                      stroke={ann.color}
                      strokeWidth={ann.strokeWidth * 2.5}
                    />
                  )
                }
                if (ann.kind === "line" || ann.kind === "arrow") {
                  return (
                    <line
                      key={ann.id}
                      x1={x}
                      y1={y}
                      x2={x + w}
                      y2={y + h}
                      stroke={ann.color}
                      strokeWidth={ann.strokeWidth * 2.5}
                    />
                  )
                }
              }
              if (ann.type === "text") {
                if (editingText?.id === ann.id) return null
                return (
                  <text
                    key={ann.id}
                    x={ann.x * 1000}
                    y={ann.y * 1000}
                    fill={ann.color}
                    fontSize={ann.fontSize * 1.4}
                    fontFamily="var(--sq-font)"
                    fontWeight="bold"
                    className="cursor-pointer select-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingText({
                        id: ann.id,
                        x: ann.x,
                        y: ann.y,
                        text: ann.text,
                        fontSize: ann.fontSize,
                        color: ann.color,
                      })
                    }}
                  >
                    {ann.text}
                  </text>
                )
              }
              return null
            })}

            {/* Currently In-flight Stroke */}
            {drawingStroke && drawingStroke.length > 1 && (
              <path
                d={drawingStroke.reduce((acc, [nx, ny], idx) => {
                  const x = nx * 1000
                  const y = ny * 1000
                  return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
                }, "")}
                fill="none"
                stroke={activeTool === "highlighter" ? "#ffeb3b" : penColor}
                strokeWidth={activeTool === "highlighter" ? 28 : penWeight * 2.5}
                strokeOpacity={activeTool === "highlighter" ? 0.4 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* In-flight Shape Preview */}
            {drawingShapeStart && drawingShapeCurrent && (
              <rect
                x={Math.min(drawingShapeStart[0], drawingShapeCurrent[0]) * 1000}
                y={Math.min(drawingShapeStart[1], drawingShapeCurrent[1]) * 1000}
                width={Math.abs(drawingShapeCurrent[0] - drawingShapeStart[0]) * 1000}
                height={Math.abs(drawingShapeCurrent[1] - drawingShapeStart[1]) * 1000}
                fill="none"
                stroke={penColor}
                strokeWidth={penWeight * 2.5}
                strokeDasharray="6 3"
              />
            )}

            {/* Laser Pointer Trail */}
            {laserPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x * 1000}
                cy={pt.y * 1000}
                r={Math.max(2, 10 - pt.age * 0.6)}
                fill="#ef4444"
                opacity={Math.max(0, 1 - pt.age / 15)}
                style={{ filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.9))" }}
              />
            ))}

            {/* Spotlight Mode Overlay */}
            {activeTool === "spotlight" && pointerNorm && (
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="1000" height="1000" fill="white" />
                <circle cx={pointerNorm.x * 1000} cy={pointerNorm.y * 1000} r="130" fill="black" />
              </mask>
            )}
            {activeTool === "spotlight" && pointerNorm && (
              <rect
                x="0"
                y="0"
                width="1000"
                height="1000"
                fill="rgba(0,0,0,0.65)"
                mask="url(#spotlight-mask)"
                pointerEvents="none"
              />
            )}
          </svg>

          {/* Inline Text Note Editor Overlay */}
          {editingText && (
            <PdfTextEditorOverlay
              initialText={editingText.text}
              x={editingText.x}
              y={editingText.y}
              fontSize={editingText.fontSize}
              color={editingText.color}
              zoom={zoom}
              onCommit={(trimmedText) => {
                if (editingText.id) {
                  const updated = annotations.map((a) =>
                    a.id === editingText.id ? { ...a, text: trimmedText } : a
                  )
                  setUndoStack((u) => [...u, annotations])
                  setRedoStack([])
                  setAnnotations(updated)
                  persistAnnotations(updated, page)
                } else {
                  const textAnn: PdfTextAnnotation = {
                    id: `t_${Date.now()}`,
                    type: "text",
                    x: editingText.x,
                    y: editingText.y,
                    text: trimmedText,
                    fontSize: editingText.fontSize,
                    color: editingText.color,
                  }
                  commitAnnotation(textAnn)
                }
                setEditingText(null)
              }}
              onCancel={() => {
                setEditingText(null)
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom Slides Filmstrip Drawer */}
      {thumbnailsOpen && (
        <div
          className="flex h-28 items-center gap-3 overflow-x-auto border-t px-4 py-2 shrink-0"
          style={{ borderColor: "var(--sq-border)", backgroundColor: "var(--sq-paper)" }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
            <button
              key={pNum}
              onClick={() => {
                persistAnnotations(annotations, page)
                setPage(pNum)
              }}
              className={`relative flex flex-col items-center shrink-0 border rounded p-1 transition-all ${
                page === pNum
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-foreground/40"
              }`}
              style={{ backgroundColor: "var(--sq-bg)" }}
            >
              {thumbnailUrls[pNum] ? (
                <img
                  src={thumbnailUrls[pNum]}
                  alt={`Slide ${pNum}`}
                  className="h-16 w-auto object-contain rounded"
                />
              ) : (
                <div className="h-16 w-12 flex items-center justify-center text-xs text-muted-foreground">
                  p.{pNum}
                </div>
              )}
              <span className="text-[10px] mt-1 font-mono">Slide {pNum}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating Smart Board Bottom Toolbar */}
      <footer
        className="flex h-14 items-center justify-between border-t px-6 shrink-0 z-20"
        style={{ borderColor: "var(--sq-border)", backgroundColor: "var(--sq-paper)" }}
      >
        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            title="Undo Annotation (⌘Z)"
          >
            <UndoIcon size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={redoStack.length === 0}
            onClick={handleRedo}
            title="Redo Annotation (⇧⌘Z)"
          >
            <RedoIcon size={16} />
          </Button>
        </div>

        {/* Primary Interactive Smart Board Tools */}
        <div
          className="flex items-center gap-1 rounded-full border px-2 py-1 shadow-sm"
          style={{ borderColor: "var(--sq-border)", backgroundColor: "var(--sq-bg)" }}
        >
          <button
            onClick={() => setActiveTool("pen")}
            className={`p-1.5 rounded-full ${activeTool === "pen" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Hand-Drawn Pen"
          >
            <PenIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool("highlighter")}
            className={`p-1.5 rounded-full ${activeTool === "highlighter" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Highlighter"
          >
            <HighlightIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool("rect")}
            className={`p-1.5 rounded-full ${activeTool === "rect" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Rectangle"
          >
            <RectIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool("ellipse")}
            className={`p-1.5 rounded-full ${activeTool === "ellipse" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Ellipse / Circle"
          >
            <EllipseIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool("arrow")}
            className={`p-1.5 rounded-full ${activeTool === "arrow" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Arrow"
          >
            <ArrowIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool("line")}
            className={`p-1.5 rounded-full ${activeTool === "line" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Straight Line"
          >
            <LineIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool("text")}
            className={`p-1.5 rounded-full ${activeTool === "text" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Text Note / Sticky Note"
          >
            <TextIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool("eraser")}
            className={`p-1.5 rounded-full ${activeTool === "eraser" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Eraser"
          >
            <EraserIcon size={16} />
          </button>

          <div className="h-4 w-[1px] mx-1 bg-border" />

          {/* Laser Pointer */}
          <button
            onClick={() => setActiveTool("laser")}
            className={`p-1.5 rounded-full ${activeTool === "laser" ? "bg-red-500 text-white" : "hover:bg-muted text-red-500"}`}
            title="Laser Pointer (Presenter Mode)"
          >
            <LaserIcon size={16} />
          </button>

          {/* Spotlight Tool */}
          <button
            onClick={() => setActiveTool("spotlight")}
            className={`p-1.5 rounded-full ${activeTool === "spotlight" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Spotlight Focus Tool"
          >
            <SpotlightIcon size={16} />
          </button>
        </div>

        {/* Color Palette & Stroke Weight Picker */}
        <div className="flex items-center gap-2">
          {["#1e1e1e", "#dc2626", "#2563eb", "#16a34a", "#9333ea"].map((c) => (
            <button
              key={c}
              onClick={() => setPenColor(c)}
              className="h-5 w-5 rounded-full border border-border flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
            >
              {penColor === c && <CheckIcon size={12} color="#ffffff" />}
            </button>
          ))}

          <div className="h-4 w-[1px] mx-1" style={{ backgroundColor: "var(--sq-border)" }} />

          {/* Stroke Width Selector */}
          {[1.5, 2.5, 4].map((w) => (
            <button
              key={w}
              onClick={() => setPenWeight(w)}
              className={`h-6 w-6 rounded border flex items-center justify-center text-[10px] ${
                penWeight === w ? "font-bold bg-muted" : "opacity-60"
              }`}
              style={{ borderColor: "var(--sq-border)" }}
            >
              {w}
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}

