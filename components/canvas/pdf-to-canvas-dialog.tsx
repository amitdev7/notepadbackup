"use client"

// ---------------------------------------------------------------------------
// Zenithsui PDF-to-Canvas Modal Dialog
//
// Interactive configuration modal for importing and exploding PDF documents
// page-by-page into canvas ImageNodes with smart grid layout and grouping.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useId, useCallback } from "react"
import { useSquig } from "@/lib/store"
import type { DocumentNode } from "@/lib/types"
import {
  extractPdfToCanvas,
  parsePageRange,
  type PdfToCanvasOptions,
} from "@/lib/pdf/pdf-to-canvas"
import { extractPdfInfo } from "@/lib/storage/document-assets"
import {
  FilePdf,
  X,
  UploadSimple,
  SquaresFour,
  Check,
  SpinnerGap,
  Sparkle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface PdfToCanvasDialogState {
  open: boolean
  node?: DocumentNode | null
  file?: File | null
}

export function PdfToCanvasDialog() {
  const dialogState = useSquig((s) => s.pdfToCanvasDialog)
  const setDialogState = useSquig((s) => s.setPdfToCanvasDialog)

  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [rangeMode, setRangeMode] = useState<"all" | "custom">("all")
  const [customRange, setCustomRange] = useState<string>("")
  const [columns, setColumns] = useState<number>(4)
  const [scale, setScale] = useState<number>(2.0)
  const [groupPages, setGroupPages] = useState<boolean>(true)
  const [embedMode, setEmbedMode] = useState<boolean>(false)

  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progressText, setProgressText] = useState<string>("")
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const customRangeInputId = useId()

  const node = dialogState?.node || null

  // Initialize state when dialog opens
  useEffect(() => {
    if (!dialogState?.open) {
      setActiveFile(null)
      setIsProcessing(false)
      setErrorMsg(null)
      setProgressPercent(0)
      return
    }

    if (dialogState.file) {
      setActiveFile(dialogState.file)
      dialogState.file.arrayBuffer().then((buf) => {
        const info = extractPdfInfo(buf)
        setTotalPages(info.pageCount || 1)
      })
    } else if (dialogState.node) {
      setTotalPages(dialogState.node.pageCount || 1)
    }
  }, [dialogState])

  const handleClose = useCallback(() => {
    if (isProcessing) {
      abortControllerRef.current?.abort()
    }
    setDialogState(null)
  }, [isProcessing, setDialogState])

  // Escape key handler
  useEffect(() => {
    if (!dialogState?.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) handleClose()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [dialogState?.open, isProcessing, handleClose])

  if (!dialogState?.open) return null

  const displayName =
    node?.name || activeFile?.name || "Choose or Drop a PDF Document"

  const targetPageCount =
    rangeMode === "all"
      ? totalPages
      : parsePageRange(customRange, totalPages).length

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setActiveFile(f)
      setErrorMsg(null)
      f.arrayBuffer().then((buf) => {
        const info = extractPdfInfo(buf)
        setTotalPages(info.pageCount || 1)
      })
    }
  }

  const handleStartExtraction = async () => {
    const source = node || activeFile
    if (!source) {
      setErrorMsg("Please select a PDF document first.")
      return
    }

    setIsProcessing(true)
    setErrorMsg(null)
    setProgressPercent(0)
    setProgressText("Initializing extraction...")

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const opts: PdfToCanvasOptions = {
        renderScale: scale,
        columns,
        gap: 48,
        groupPages,
        pageRange: rangeMode === "all" ? "all" : customRange,
        embedMode,
        signal: controller.signal,
        onProgress: (curr, total, text) => {
          setProgressText(text)
          setProgressPercent(Math.round((curr / Math.max(1, total)) * 100))
        },
      }

      await extractPdfToCanvas(source, opts)
      handleClose()
    } catch (err) {
      if (controller.signal.aborted) {
        setProgressText("Cancelled")
      } else {
        console.error("PDF-to-Canvas failed:", err)
        setErrorMsg(err instanceof Error ? err.message : "Failed to extract PDF pages.")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PDF to Canvas"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) handleClose()
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden bg-[var(--sq-paper)] text-[var(--sq-ink)] border border-[var(--sq-border)] shadow-2xl flex flex-col animate-in zoom-in-95 duration-150"
        style={{
          boxShadow: "0 20px 40px rgba(0,0,0,0.25), 3px 3px 0px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-13 px-4 flex items-center justify-between border-b border-[var(--sq-border)] bg-[var(--sq-shade)]/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-[var(--sq-paper)] border border-[var(--sq-border)] text-[var(--sq-ink)]">
              <SquaresFour size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">PDF to Canvas</h2>
              <p className="text-[10px] opacity-65 font-mono">Convert pages into spatial canvas nodes</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-[var(--sq-shade)] text-[var(--sq-ink)] transition-colors disabled:opacity-30"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Document Source Card */}
          <div className="p-3.5 rounded-lg border border-[var(--sq-border)] bg-[var(--sq-shade)]/20 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 mr-2">
              <div className="p-2 rounded bg-[var(--sq-paper)] border border-[var(--sq-border)] text-red-600 dark:text-red-400 shrink-0">
                <FilePdf size={24} weight="bold" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate max-w-[280px]" title={displayName}>
                  {displayName}
                </div>
                <div className="text-[10px] opacity-65 font-mono mt-0.5">
                  {totalPages > 1 ? `${totalPages} total pages` : "PDF document"}
                </div>
              </div>
            </div>

            {!node && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={handleFilePicked}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold rounded border border-[var(--sq-border)] bg-[var(--sq-paper)] hover:bg-[var(--sq-shade)] transition-colors shrink-0"
                >
                  <UploadSimple size={13} className="inline mr-1" />
                  {activeFile ? "Change" : "Browse"}
                </button>
              </>
            )}
          </div>

          {/* Configuration Options */}
          <div className="space-y-3.5 pt-1">
            {/* 1. Page Range */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 opacity-90">Page Selection</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRangeMode("all")}
                  disabled={isProcessing}
                  className={cn(
                    "p-2 rounded-md border text-left flex items-center justify-between transition-colors",
                    rangeMode === "all"
                      ? "border-[var(--sq-ink)] bg-[var(--sq-shade)]/60 font-semibold"
                      : "border-[var(--sq-border)] hover:bg-[var(--sq-shade)]/30 opacity-70"
                  )}
                >
                  <span>All Pages ({totalPages})</span>
                  {rangeMode === "all" && <Check size={14} className="text-[var(--sq-ink)]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setRangeMode("custom")}
                  disabled={isProcessing}
                  className={cn(
                    "p-2 rounded-md border text-left flex items-center justify-between transition-colors",
                    rangeMode === "custom"
                      ? "border-[var(--sq-ink)] bg-[var(--sq-shade)]/60 font-semibold"
                      : "border-[var(--sq-border)] hover:bg-[var(--sq-shade)]/30 opacity-70"
                  )}
                >
                  <span>Custom Range</span>
                  {rangeMode === "custom" && <Check size={14} className="text-[var(--sq-ink)]" />}
                </button>
              </div>

              {rangeMode === "custom" && (
                <div className="mt-2">
                  <label htmlFor={customRangeInputId} className="sr-only">
                    Custom page range
                  </label>
                  <input
                    id={customRangeInputId}
                    type="text"
                    disabled={isProcessing}
                    placeholder="e.g. 1-5, 8, 11-12"
                    value={customRange}
                    onChange={(e) => setCustomRange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-md border border-[var(--sq-border)] bg-[var(--sq-paper)] outline-hidden focus:ring-1 focus:ring-[var(--sq-select)]"
                  />
                  <div className="text-[10px] opacity-60 font-mono mt-1">
                    Extracts {targetPageCount} selected page{targetPageCount === 1 ? "" : "s"}.
                  </div>
                </div>
              )}
            </div>

            {/* 2. Grid Columns */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold opacity-90">Layout Columns</label>
                <span className="text-[11px] font-mono opacity-65">{columns} per row</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[2, 3, 4, 5].map((col) => (
                  <button
                    key={col}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setColumns(col)}
                    className={cn(
                      "py-1.5 rounded-md border font-mono text-center transition-colors",
                      columns === col
                        ? "border-[var(--sq-ink)] bg-[var(--sq-shade)]/60 font-bold"
                        : "border-[var(--sq-border)] hover:bg-[var(--sq-shade)]/30 opacity-70"
                    )}
                  >
                    {col} cols
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Resolution Quality */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold opacity-90">Render Quality</label>
                <span className="text-[11px] font-mono opacity-65">
                  {scale === 1.5 ? "Standard (1.5x)" : scale === 2.0 ? "Crisp (2.0x)" : "Ultra (3.0x)"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { val: 1.5, label: "1.5x Fast" },
                  { val: 2.0, label: "2.0x Crisp" },
                  { val: 3.0, label: "3.0x Ultra" },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setScale(item.val)}
                    className={cn(
                      "py-1.5 rounded-md border font-mono text-center transition-colors",
                      scale === item.val
                        ? "border-[var(--sq-ink)] bg-[var(--sq-shade)]/60 font-bold"
                        : "border-[var(--sq-border)] hover:bg-[var(--sq-shade)]/30 opacity-70"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Options: Auto-group & Local Storage */}
            <div className="space-y-2 pt-1 border-t border-[var(--sq-border)]">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <div>
                  <div className="text-xs font-semibold">Group extracted pages</div>
                  <div className="text-[10px] opacity-60">Allows moving all pages together on the canvas</div>
                </div>
                <input
                  type="checkbox"
                  disabled={isProcessing}
                  checked={groupPages}
                  onChange={(e) => setGroupPages(e.target.checked)}
                  className="rounded border-[var(--sq-border)] accent-[var(--sq-ink)] scale-110"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-1">
                <div>
                  <div className="text-xs font-semibold">Local-first asset caching</div>
                  <div className="text-[10px] opacity-60">Stores images in IndexedDB to keep canvas JSON light</div>
                </div>
                <input
                  type="checkbox"
                  disabled={isProcessing}
                  checked={!embedMode}
                  onChange={(e) => setEmbedMode(!e.target.checked)}
                  className="rounded border-[var(--sq-border)] accent-[var(--sq-ink)] scale-110"
                />
              </label>
            </div>
          </div>

          {/* Progress Bar (when active) */}
          {isProcessing && (
            <div className="p-3 rounded-lg border border-[var(--sq-border)] bg-[var(--sq-shade)]/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="truncate flex items-center gap-1.5">
                  <SpinnerGap size={14} className="animate-spin text-[var(--sq-ink)]" />
                  {progressText}
                </span>
                <span className="font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--sq-border)] overflow-hidden">
                <div
                  className="h-full bg-[var(--sq-ink)] transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded-md border border-red-500/40 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-5 flex items-center justify-between border-t border-[var(--sq-border)] bg-[var(--sq-shade)]/20 shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleClose}
            className="px-3 py-1.5 rounded-md text-xs border border-[var(--sq-border)] hover:bg-[var(--sq-shade)] transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isProcessing || (!node && !activeFile)}
            onClick={handleStartExtraction}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold bg-[var(--sq-ink)] text-[var(--sq-paper)] hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <SpinnerGap size={14} className="animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Sparkle size={14} weight="bold" />
                <span>Import {targetPageCount} Pages to Canvas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
