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
  const [isBlobLoading, setIsBlobLoading] = useState<boolean>(true)
  const [blobError, setBlobError] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [fullText, setFullText] = useState<string | null>(null)
  const [csvFilter, setCsvFilter] = useState<string>("")
  const [copied, setCopied] = useState<boolean>(false)
  const [mdViewMode, setMdViewMode] = useState<"formatted" | "raw">("formatted")

  // Resolve document blob
  const loadBlob = useCallback(() => {
    if (!node) {
      setDocBlob(null)
      setIsBlobLoading(false)
      setBlobError(null)
      return
    }
    let mounted = true
    setIsBlobLoading(true)
    setBlobError(null)

    getDocumentBlob(node)
      .then((blob) => {
        if (!mounted) return
        if (blob && blob.size > 0) {
          setDocBlob(blob)
          setIsBlobLoading(false)
          setBlobError(null)
          try {
            const url = URL.createObjectURL(blob)
            setObjectUrl(url)
          } catch { }
        } else {
          setDocBlob(null)
          setIsBlobLoading(false)
          setBlobError("The PDF document payload could not be located in local or cloud storage.")
        }
      })
      .catch((err) => {
        if (!mounted) return
        console.error("Failed to load document blob in modal:", err)
        setDocBlob(null)
        setIsBlobLoading(false)
        setBlobError(err instanceof Error ? err.message : "Failed to load document.")
      })

    return () => {
      mounted = false
    }
  }, [node])

  useEffect(() => {
    const cleanup = loadBlob()
    return () => {
      cleanup?.()
    }
  }, [loadBlob])

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
  const sizeLabel = node?.sizeBytes
    ? node.sizeBytes >= 1024 * 1024
      ? `${(node.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(node.sizeBytes / 1024)} KB`
    : null

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
            isLoadingBlob={isBlobLoading}
            blobError={blobError}
            onRetry={loadBlob}
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
            {/* Markdown mode toggle */}
            {(extension === "md" || extension === "markdown") && fullText && (
              <div className="flex items-center rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setMdViewMode("formatted")}
                  className={cn(
                    "px-2.5 py-1 transition-colors font-medium",
                    mdViewMode === "formatted"
                      ? "bg-[var(--sq-shade)] text-[var(--sq-ink)] font-semibold"
                      : "hover:bg-[var(--sq-shade)]/50 opacity-70"
                  )}
                >
                  Formatted
                </button>
                <button
                  type="button"
                  onClick={() => setMdViewMode("raw")}
                  className={cn(
                    "px-2.5 py-1 transition-colors font-medium",
                    mdViewMode === "raw"
                      ? "bg-[var(--sq-shade)] text-[var(--sq-ink)] font-semibold"
                      : "hover:bg-[var(--sq-shade)]/50 opacity-70"
                  )}
                >
                  Raw
                </button>
              </div>
            )}

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

          {/* Markdown Viewer */}
          {(extension === "md" || extension === "markdown") && fullText !== null && (
            <div className="w-full h-full overflow-auto p-6 leading-relaxed select-text bg-[var(--sq-paper)]">
              {mdViewMode === "formatted" ? (
                <div className="max-w-3xl mx-auto py-2">
                  <SimpleMarkdown content={fullText} />
                </div>
              ) : (
                <pre className="font-mono text-xs whitespace-pre-wrap break-words">{fullText}</pre>
              )}
            </div>
          )}

          {/* Code & Text Viewer (JSON, TXT, etc.) */}
          {fullText !== null &&
            extension !== "csv" &&
            extension !== "tsv" &&
            extension !== "md" &&
            extension !== "markdown" && (
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

// ---------------------------------------------------------------------------
// Lightweight, Safe React Markdown Renderer (Zero unsafe HTML injection)
// ---------------------------------------------------------------------------

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-3 p-3 rounded-md bg-[var(--sq-shade)]/60 border border-[var(--sq-border)] font-mono text-xs overflow-x-auto whitespace-pre leading-normal"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-xl font-bold mt-4 mb-2 border-b border-[var(--sq-border)] pb-1">
          {renderInline(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-bold mt-3 mb-1.5 border-b border-[var(--sq-border)]/60 pb-1">
          {renderInline(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-semibold mt-2.5 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      )
    } else if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={i} className="text-sm font-semibold mt-2 mb-1">
          {renderInline(line.slice(5))}
        </h4>
      )
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-4 border-[var(--sq-border)] pl-3 my-2 italic opacity-80"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      )
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc my-0.5 leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      )
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+\.)\s(.*)/)
      elements.push(
        <li key={i} className="ml-4 list-decimal my-0.5 leading-relaxed">
          {renderInline(match ? match[2] : line)}
        </li>
      )
    } else if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={i} className="my-3 border-[var(--sq-border)]" />)
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(
        <p key={i} className="my-1 leading-relaxed">
          {renderInline(line)}
        </p>
      )
    }
  }

  // Handle trailing unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key="code-final"
        className="my-3 p-3 rounded-md bg-[var(--sq-shade)]/60 border border-[var(--sq-border)] font-mono text-xs overflow-x-auto whitespace-pre leading-normal"
      >
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    )
  }

  return <div className="space-y-0.5 text-xs sm:text-sm">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }
    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>)
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 rounded bg-[var(--sq-shade)]/60 font-mono text-[11px] border border-[var(--sq-border)]"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    lastIdx = match.index + token.length
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx))
  }

  return parts.length > 0 ? parts : text
}
