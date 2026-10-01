"use client"

// ---------------------------------------------------------------------------
// Zenithsui Canvas — Expanded Document Viewer Modal
//
// Full-screen modal overlay for reading, inspecting, and navigating attached
// documents (PDFs, CSVs, JSON, Markdown, Text, and Office files).
// Isolates keyboard navigation (Escape, Arrow keys) and prevents canvas shortcuts.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useCallback } from "react"
import type { DocumentNode } from "@/lib/types"
import { useSquig } from "@/lib/store"
import {
  getDocumentObjectUrl,
  getDocumentBlob,
  downloadDocument,
} from "@/lib/storage/document-assets"
import { PdfCanvasViewer } from "./pdf-canvas-viewer"
import {
  FileText,
  FileCode,
  FileCsv,
  FileDoc,
  FileXls,
  FilePpt,
  File,
  DownloadSimple,
  ArrowSquareOut,
  X,
  MagnifyingGlass,
  Copy,
  Check,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface DocumentViewerModalProps {
  node: DocumentNode | null
  onClose: () => void
}

export function DocumentViewerModal({ node, onClose }: DocumentViewerModalProps) {
  const [docBlob, setDocBlob] = useState<Blob | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [fullText, setFullText] = useState<string | null>(null)
  const [csvFilter, setCsvFilter] = useState<string>("")
  const [copied, setCopied] = useState<boolean>(false)

  // Resolve document blob
  useEffect(() => {
    if (!node) {
      setDocBlob(null)
      return
    }
    let mounted = true
    getDocumentBlob(node).then((blob) => {
      if (mounted) setDocBlob(blob)
    })
    return () => {
      mounted = false
    }
  }, [node])

  // Resolve object URL
  useEffect(() => {
    if (!node) {
      setObjectUrl(null)
      return
    }
    let mounted = true
    getDocumentObjectUrl(node).then((url) => {
      if (mounted) setObjectUrl(url)
    })
    return () => {
      mounted = false
    }
  }, [node])

  // Load full text content for textual files if needed
  useEffect(() => {
    if (!node) {
      setFullText(null)
      return
    }
    const ext = (node.extension || node.name.split(".").pop() || "").toLowerCase()
    const isTextual =
      ["txt", "md", "markdown", "json", "csv", "tsv", "js", "ts", "html", "css"].includes(ext) ||
      (node.mimeType && (node.mimeType.startsWith("text/") || node.mimeType === "application/json"))

    if (isTextual) {
      if (node.textContent && node.textContent.length < 4000 && !node.assetId) {
        setFullText(node.textContent)
      } else {
        getDocumentBlob(node).then((blob) => {
          if (!blob) {
            setFullText(node.textContent || "")
            return
          }
          blob.text().then((txt) => {
            if (ext === "json") {
              try {
                const parsed = JSON.parse(txt)
                setFullText(JSON.stringify(parsed, null, 2))
              } catch {
                setFullText(txt)
              }
            } else {
              setFullText(txt)
            }
          }).catch(() => {
            setFullText(node.textContent || "")
          })
        })
      }
    } else {
      setFullText(null)
    }
  }, [node])

  const extension = useMemo(() => {
    if (!node) return "doc"
    return (node.extension || node.name.split(".").pop() || "doc").toLowerCase()
  }, [node])

  // Copy text content
  const handleCopyText = useCallback(() => {
    const textToCopy = fullText || node?.textContent || ""
    if (!textToCopy) return
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [fullText, node?.textContent])

  // Download document
  const handleDownload = useCallback(() => {
    if (node) {
      downloadDocument(node)
    }
  }, [node])

  // Open in new window/tab
  const handleOpenExternal = useCallback(() => {
    if (objectUrl) {
      window.open(objectUrl, "_blank", "noopener,noreferrer")
    }
  }, [objectUrl])

  // Non-PDF keyboard isolation
  useEffect(() => {
    if (!node || extension === "pdf") return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [node, extension, onClose])

  // Icon selection
  const FileIcon = useMemo(() => {
    switch (extension) {
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

  // Formatted file size string
  const sizeLabel = useMemo(() => {
    if (!node?.sizeBytes) return null
    if (node.sizeBytes >= 1024 * 1024) {
      return `${(node.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    }
    return `${Math.round(node.sizeBytes / 1024)} KB`
  }, [node?.sizeBytes])

  // CSV parsed rows
  const { csvHeaders, csvRows } = useMemo(() => {
    if (extension !== "csv" && extension !== "tsv") {
      return { csvHeaders: [], csvRows: [] }
    }
    const content = fullText || node?.textContent || ""
    if (!content) return { csvHeaders: [], csvRows: [] }

    const delimiter = extension === "tsv" ? "\t" : ","
    const lines = content.split("\n").filter((l) => l.trim())
    if (lines.length === 0) return { csvHeaders: [], csvRows: [] }

    const parseLine = (line: string) => {
      return line.split(delimiter).map((c) => c.replace(/^"|"$/g, "").trim())
    }

    const headers = parseLine(lines[0])
    let rows = lines.slice(1).map(parseLine)

    if (csvFilter.trim()) {
      const q = csvFilter.toLowerCase().trim()
      rows = rows.filter((r) => r.some((cell) => cell.toLowerCase().includes(q)))
    }

    return { csvHeaders: headers, csvRows: rows }
  }, [extension, fullText, node?.textContent, csvFilter])

  if (!node) return null

  // ---------------------------------------------------------------------------
  // Case A: PDF Documents (Genuine High-DPI PDF.js Viewer)
  // ---------------------------------------------------------------------------
  if (extension === "pdf") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Document Viewer: ${node.name}`}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="w-full max-w-6xl h-[92vh] flex flex-col rounded-lg overflow-hidden bg-[var(--sq-paper)] text-[var(--sq-ink)] border border-[var(--sq-border)] shadow-2xl animate-in zoom-in-95 duration-150"
          style={{
            boxShadow: "0 20px 40px rgba(0,0,0,0.3), 4px 4px 0px rgba(0,0,0,0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <PdfCanvasViewer
            blob={docBlob}
            documentName={node.name}
            initialPage={node.currentPage || 1}
            onPageChange={(p, total) => {
              useSquig.getState().updateNode(node.id, {
                currentPage: p,
                pageCount: total,
              } as Partial<DocumentNode>)
            }}
            onDownload={handleDownload}
            onOpenExternal={handleOpenExternal}
            onClose={onClose}
          />
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Case B: Non-PDF Documents (CSV, JSON, Markdown, Text, Office)
  // ---------------------------------------------------------------------------
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Document Viewer: ${node.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-5xl h-[88vh] flex flex-col rounded-lg overflow-hidden bg-[var(--sq-paper)] text-[var(--sq-ink)] border border-[var(--sq-border)] shadow-2xl animate-in zoom-in-95 duration-150"
        style={{
          boxShadow: "0 20px 40px rgba(0,0,0,0.25), 4px 4px 0px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Top Bar */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 mr-4">
            <div className="p-1.5 rounded bg-[var(--sq-paper)] border border-[var(--sq-border)] text-[var(--sq-ink)]">
              <FileIcon size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate leading-tight">{node.name}</h2>
              <div className="text-[10px] opacity-65 flex items-center gap-2 font-mono">
                <span className="uppercase font-semibold">{extension}</span>
                {sizeLabel && <span>• {sizeLabel}</span>}
              </div>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Copy button for textual files */}
            {fullText && (
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] transition-colors"
                title="Copy contents to clipboard"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}

            {/* Open in new tab */}
            {objectUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="p-1.5 rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors"
                title="Open in new browser tab"
              >
                <ArrowSquareOut size={16} />
              </button>
            )}

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] transition-colors font-medium"
              title="Download file to computer"
            >
              <DownloadSimple size={14} />
              <span>Download</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors ml-1"
              title="Close viewer (Escape)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Main Content Area */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-[var(--sq-paper)]">
          {/* CSV / TSV Table Viewer */}
          {(extension === "csv" || extension === "tsv") && (
            <div className="w-full h-full flex flex-col">
              {/* CSV Toolbar */}
              <div className="px-4 py-2 border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <MagnifyingGlass
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50"
                    />
                    <input
                      type="text"
                      placeholder="Filter rows..."
                      value={csvFilter}
                      onChange={(e) => setCsvFilter(e.target.value)}
                      className="pl-8 pr-3 py-1 rounded bg-[var(--sq-paper)] border border-[var(--sq-border)] text-xs font-mono outline-hidden focus:ring-1 focus:ring-[var(--sq-select)] w-56"
                    />
                  </div>
                  <span className="text-[11px] opacity-60 font-mono">
                    {csvRows.length} rows {csvFilter ? "matching filter" : ""}
                  </span>
                </div>
              </div>

              {/* CSV Grid */}
              <div className="flex-1 overflow-auto p-4">
                <table className="w-full border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b-2 border-[var(--sq-border)] bg-[var(--sq-shade)]/40 text-left">
                      <th className="p-2 w-10 text-[10px] opacity-40">#</th>
                      {csvHeaders.map((header, hi) => (
                        <th key={hi} className="p-2 font-bold truncate max-w-[200px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-[var(--sq-border)]/40 hover:bg-[var(--sq-shade)]/30 transition-colors"
                      >
                        <td className="p-2 text-[10px] opacity-40 font-mono">{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-2 truncate max-w-[240px]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {csvRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={csvHeaders.length + 1}
                          className="p-8 text-center opacity-60 italic text-xs"
                        >
                          No matching records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Code & Text Viewer (JSON, TXT, MD, etc.) */}
          {fullText !== null && extension !== "csv" && extension !== "tsv" && (
            <div className="w-full h-full overflow-auto p-6 font-mono text-xs leading-relaxed select-text bg-[var(--sq-paper)]">
              <pre className="whitespace-pre-wrap break-words">{fullText}</pre>
            </div>
          )}

          {/* Office Documents & Fallback */}
          {extension !== "csv" &&
            extension !== "tsv" &&
            fullText === null && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="p-5 rounded-2xl bg-[var(--sq-shade)]/60 text-[var(--sq-ink)] mb-4">
                  <FileIcon size={56} />
                </div>
                <h3 className="font-bold text-base max-w-md truncate px-4">{node.name}</h3>
                <p className="text-xs opacity-65 mt-1 max-w-sm">
                  {extension.toUpperCase()} document ({sizeLabel || "Unknown size"}).
                </p>
                <p className="text-[11px] opacity-50 mt-1 max-w-md">
                  Direct in-browser interactive rendering for this office binary format is limited.
                  Download the file to view in its native desktop or web suite.
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="mt-5 flex items-center gap-2 px-5 py-2 rounded-md bg-[var(--sq-ink)] text-[var(--sq-paper)] text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <DownloadSimple size={16} />
                  <span>Download Document</span>
                </button>
              </div>
            )}
        </div>

        {/* 3. Modal Footer Bar */}
        <div className="h-9 px-4 flex items-center justify-between border-t border-[var(--sq-border)] bg-[var(--sq-shade)]/20 shrink-0 text-[11px] opacity-70">
          <div className="truncate font-mono">
            {node.assetId ? `Asset ID: ${node.assetId}` : "Local attachment"}
          </div>
          <div className="flex items-center gap-3">
            <span>
              Press <kbd className="px-1 py-0.5 rounded border border-[var(--sq-border)] font-mono text-[9px]">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
