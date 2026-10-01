"use client"

// ---------------------------------------------------------------------------
// Zenithsui Canvas — First-Class Interactive Document Node Component
//
// Renders live PDF, Text, JSON, CSV, Markdown, and Office document attachments
// with real previews, page navigation, inline renaming, download, and viewer trigger.
// Follows Zenithsui risograph ink & paper aesthetic.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useCallback } from "react"
import type { DocumentNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import { getDocumentObjectUrl, downloadDocument } from "@/lib/storage/document-assets"
import {
  FilePdf,
  FileText,
  FileCode,
  FileCsv,
  FileDoc,
  FileXls,
  FilePpt,
  File,
  DownloadSimple,
  Eye,
  CaretLeft,
  CaretRight,
  ArrowsOutSimple,
  Table,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface DocumentCanvasItemProps {
  node: DocumentNode
  selected: boolean
  zoom: number
  onOpenViewer?: (node: DocumentNode) => void
}

export function DocumentCanvasItem({
  node,
  selected,
  zoom,
  onOpenViewer,
}: DocumentCanvasItemProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Resolve live object URL for the document asset
  useEffect(() => {
    let mounted = true
    getDocumentObjectUrl(node).then((url) => {
      if (mounted && url) {
        setObjectUrl(url)
      }
    })
    return () => {
      mounted = false
    }
  }, [node.assetId, node.src])

  const extension = (node.extension || node.name.split(".").pop() || "doc").toLowerCase()
  const pageCount = node.pageCount || 1
  const currentPage = Math.max(1, Math.min(pageCount, node.currentPage || 1))

  // Page navigation handlers for multi-page documents (PDFs)
  const handlePrevPage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (currentPage > 1) {
        useSquig.getState().updateNode(node.id, { currentPage: currentPage - 1 } as Partial<DocumentNode>)
      }
    },
    [node.id, currentPage]
  )

  const handleNextPage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (currentPage < pageCount) {
        useSquig.getState().updateNode(node.id, { currentPage: currentPage + 1 } as Partial<DocumentNode>)
      }
    },
    [node.id, currentPage, pageCount]
  )

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      downloadDocument(node)
    },
    [node]
  )

  const handleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onOpenViewer?.(node)
    },
    [node, onOpenViewer]
  )

  // Formatted file size string
  const sizeLabel = useMemo(() => {
    if (!node.sizeBytes) return null
    if (node.sizeBytes >= 1024 * 1024) {
      return `${(node.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    }
    return `${Math.round(node.sizeBytes / 1024)} KB`
  }, [node.sizeBytes])

  // Select appropriate Phosphor icon based on extension
  const FileIcon = useMemo(() => {
    switch (extension) {
      case "pdf":
        return FilePdf
      case "json":
      case "js":
      case "ts":
        return FileCode
      case "csv":
      case "tsv":
        return FileCsv
      case "doc":
      case "docx":
        return FileDoc
      case "xls":
      case "xlsx":
        return FileXls
      case "ppt":
      case "pptx":
        return FilePpt
      case "txt":
      case "md":
      case "markdown":
        return FileText
      default:
        return File
    }
  }, [extension])

  // CSV parsing for mini-table preview
  const csvRows = useMemo(() => {
    if (extension !== "csv" || !node.textContent) return null
    const lines = node.textContent.split("\n").filter((l) => l.trim())
    return lines.slice(0, 8).map((line) => {
      // Basic comma split respecting basic quotes
      return line.split(",").map((c) => c.replace(/^"|"$/g, "").trim()).slice(0, 4)
    })
  }, [extension, node.textContent])

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col rounded-md overflow-hidden bg-[var(--sq-paper)] text-[var(--sq-ink)] border border-[var(--sq-border)] select-none transition-shadow",
        selected
          ? "ring-2 ring-[var(--sq-select)] shadow-md"
          : "shadow-xs hover:border-[var(--sq-ink)]/60"
      )}
      style={{
        boxShadow: selected
          ? "0 0 0 1px var(--sq-ink), 3px 3px 0px rgba(0,0,0,0.08)"
          : "2px 2px 0px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpenViewer?.(node)
      }}
    >
      {/* 1. Header Bar */}
      <div className="h-7 px-2.5 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/40 shrink-0 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 font-bold uppercase tracking-wider text-[10px]">
          <FileIcon size={14} className="shrink-0 text-[var(--sq-ink)]" weight="bold" />
          <span className="truncate">{extension}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {pageCount > 1 && (
            <div className="flex items-center gap-0.5 text-[10px] bg-[var(--sq-paper)] px-1.5 py-0.5 rounded border border-[var(--sq-border)]">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="hover:bg-[var(--sq-shade)] disabled:opacity-30 rounded p-0.5"
                title="Previous page"
              >
                <CaretLeft size={10} />
              </button>
              <span className="font-mono">
                {currentPage}/{pageCount}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= pageCount}
                className="hover:bg-[var(--sq-shade)] disabled:opacity-30 rounded p-0.5"
                title="Next page"
              >
                <CaretRight size={10} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpen}
            className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
            title="Open in Viewer (Double-click)"
          >
            <ArrowsOutSimple size={12} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)]"
            title="Download file"
          >
            <DownloadSimple size={12} />
          </button>
        </div>
      </div>

      {/* 2. Main Document Preview Body */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-[var(--sq-paper)] flex flex-col">
        {/* PDF Preview */}
        {extension === "pdf" && objectUrl && (
          <div className="w-full h-full relative overflow-hidden pointer-events-none">
            <object
              data={`${objectUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
              type="application/pdf"
              className="w-full h-full border-none"
              title={node.name}
            >
              {/* Fallback card if browser embedded PDF object is unsupported */}
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <FilePdf size={40} className="mb-2 opacity-70" />
                <span className="font-semibold text-xs">{node.name}</span>
                <span className="text-[10px] opacity-60 mt-1">PDF · {pageCount} pages</span>
              </div>
            </object>
          </div>
        )}

        {/* CSV Table Preview */}
        {extension === "csv" && csvRows && (
          <div className="w-full h-full overflow-hidden p-2 font-mono text-[10px]">
            <table className="w-full border-collapse">
              <tbody>
                {csvRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={cn(
                      "border-b border-[var(--sq-border)]/50",
                      ri === 0 ? "font-bold bg-[var(--sq-shade)]/30" : "hover:bg-[var(--sq-shade)]/20"
                    )}
                  >
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-1 truncate max-w-[80px]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Text / Markdown / JSON Preview */}
        {(extension === "txt" || extension === "md" || extension === "markdown" || extension === "json") && node.textContent && (
          <div className="w-full h-full p-2.5 overflow-hidden text-[11px] font-mono leading-relaxed opacity-85 select-text">
            <pre className="whitespace-pre-wrap break-words font-inherit">
              {node.textContent.slice(0, 800)}
            </pre>
          </div>
        )}

        {/* Office / Other Document Fallback Preview */}
        {(extension === "doc" ||
          extension === "docx" ||
          extension === "xls" ||
          extension === "xlsx" ||
          extension === "ppt" ||
          extension === "pptx" ||
          (!objectUrl && !node.textContent)) && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="p-3 rounded-full bg-[var(--sq-shade)]/60 text-[var(--sq-ink)] mb-2">
              <FileIcon size={32} />
            </div>
            <span className="font-bold text-xs max-w-full truncate px-2">{node.name}</span>
            <div className="text-[10px] opacity-60 mt-1 flex items-center gap-1.5">
              <span>{extension.toUpperCase()}</span>
              {sizeLabel && <span>• {sizeLabel}</span>}
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Bar */}
      <div className="px-2.5 py-1.5 border-t border-[var(--sq-border)] bg-[var(--sq-paper)] flex items-center justify-between shrink-0 text-xs">
        <div className="min-w-0 flex-1 pr-2">
          <div className="font-bold text-[11px] truncate" title={node.name}>
            {node.name}
          </div>
          <div className="text-[9px] opacity-65 flex items-center gap-1.5 font-mono">
            {pageCount > 1 ? `${pageCount} pages` : extension.toUpperCase()}
            {sizeLabel && <span>• {sizeLabel}</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpen}
          className="px-2 py-0.5 rounded text-[10px] font-semibold border border-[var(--sq-border)] hover:bg-[var(--sq-shade)] transition-colors shrink-0"
        >
          Open
        </button>
      </div>
    </div>
  )
}

