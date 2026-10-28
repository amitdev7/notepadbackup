"use client"

// ---------------------------------------------------------------------------
// Zenithsui Files Popover & Document Manager
//
// Apple-inspired dropdown document manager:
// 1. See all saved canvases with quick filter
// 2. Create new canvas with 1 click (+ New Canvas)
// 3. Switch between canvases with active indicators
// 4. In-place delete or export
// 5. Shows real-time save / Wi-Fi sync status
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { relativeTime, readFile, saveFile, type FileMeta, type StoredDoc } from "@/lib/files"
import { exportDoc, importDoc, exportExcalidrawDoc } from "@/lib/file-io"
import {
  FolderSimple,
  Plus,
  Check,
  Trash,
  Copy,
  CaretDown,
  DownloadSimple,
  FolderOpen,
  WifiHigh,
  Clock,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

function duplicateStoredDoc(stored: StoredDoc, name: string): StoredDoc {
  return {
    ...stored,
    id: `doc_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`,
    name: `${name} (Copy)`,
    updatedAt: Date.now(),
  }
}

export function FilesPopover() {
  const [isOpen, setIsOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileSearch, setFileSearch] = useState("")
  const popoverRef = useRef<HTMLDivElement>(null)

  const docId = useSquig((s) => s.docId)
  const files = useSquig((s) => s.files)
  const wifiAutoSync = useShellStore((s) => s.preferences.wifiAutoSync)

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setDeletingId(null)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false)
        setDeletingId(null)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // Reset deleting state after 3s timeout
  useEffect(() => {
    if (!deletingId) return
    const t = setTimeout(() => setDeletingId(null), 3000)
    return () => clearTimeout(t)
  }, [deletingId])

  const handleCreateNew = () => {
    useSquig.getState().newFile()
    setIsOpen(false)
  }

  const handleOpenFile = (id: string) => {
    useSquig.getState().openFile(id)
    setIsOpen(false)
  }

  const handleDeleteFile = (e: React.MouseEvent, file: FileMeta) => {
    e.stopPropagation()
    if (deletingId === file.id) {
      useSquig.getState().deleteFile(file.id)
      setDeletingId(null)
    } else {
      setDeletingId(file.id)
    }
  }

  const handleDuplicateFile = useCallback((e: React.MouseEvent, file: FileMeta) => {
    e.stopPropagation()
    const stored = readFile(file.id)
    if (!stored) return
    const copyDoc = duplicateStoredDoc(stored, file.name)
    const newFiles = saveFile(copyDoc)
    useSquig.setState({ files: newFiles })
  }, [])

  const filteredFiles = useMemo(() => {
    if (!fileSearch.trim()) return files
    const q = fileSearch.toLowerCase().trim()
    return files.filter((f) => f.name.toLowerCase().includes(q))
  }, [files, fileSearch])

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* Trigger Button: "Files" */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Manage canvas files"
        className={cn(
          "group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all select-none cursor-pointer outline-none",
          "focus-visible:ring-2 focus-visible:ring-blue-500/50",
          isOpen
            ? "bg-stone-200/90 dark:bg-stone-700/90 text-stone-900 dark:text-white shadow-2xs"
            : "text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/80"
        )}
      >
        <FolderSimple
          size={14}
          weight="fill"
          className="text-blue-500 shrink-0 group-hover:scale-110 transition-transform"
          aria-hidden="true"
        />
        <span>Files</span>
        <CaretDown
          size={10}
          weight="bold"
          className={cn(
            "text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
        {/* Subtle active sync dot */}
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            wifiAutoSync ? "bg-emerald-500 animate-pulse-subtle" : "bg-emerald-600/70"
          )}
          title={wifiAutoSync ? "Auto-saved and synced over Wi-Fi" : "Auto-saved locally in browser"}
        />
      </button>

      {/* Dropdown Menu / Popover */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[min(92vw,22rem)] max-w-sm rounded-2xl apple-glass-panel shadow-2xl z-50 p-2.5 text-stone-900 dark:text-stone-100 text-xs animate-popover-enter font-sans overflow-hidden">
          {/* Top celestial accent gradient matching visionOS Clouds */}
          <div className="h-1 -mx-2.5 -mt-2.5 mb-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 opacity-90" />
          {/* Header with New Canvas Action */}
          <div className="flex items-center justify-between pb-2 mb-2 px-1 border-b border-stone-200/60 dark:border-stone-800/60">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-900 dark:text-white">Canvas Files</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                {files.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCreateNew}
              className="tactile-btn flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0071E3] active:bg-[#0062C4] text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              <Plus size={12} weight="bold" />
              <span>New Canvas</span>
            </button>
          </div>

          {/* Quick Search if more than 3 files */}
          {files.length > 3 && (
            <div className="relative mb-2 px-1">
              <MagnifyingGlass size={13} className="absolute left-3 top-2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Search canvases…"
                className="w-full pl-7 pr-6 py-1.5 rounded-xl text-xs bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
              />
              {fileSearch && (
                <button
                  type="button"
                  onClick={() => setFileSearch("")}
                  className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Files List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
            {filteredFiles.length === 0 ? (
              <div className="py-6 text-center text-stone-400 dark:text-stone-500">
                {fileSearch ? "No matching canvases." : "No saved canvases yet."}
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isCurrent = file.id === docId
                const isDeleting = deletingId === file.id

                return (
                  <div
                    key={file.id}
                    onClick={() => handleOpenFile(file.id)}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer select-none transition-all duration-150 hover:translate-x-0.5",
                      isCurrent
                        ? "bg-[#007AFF]/12 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#0A84FF] shadow-2xs font-semibold"
                        : "hover:bg-stone-100 dark:hover:bg-stone-800/60 text-stone-800 dark:text-stone-200"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isCurrent ? (
                        <Check size={13} weight="bold" className="text-[#007AFF] dark:text-[#0A84FF] shrink-0" />
                      ) : (
                        <div className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-700 shrink-0 ml-1" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-medium text-xs", isCurrent && "font-semibold")}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1 font-mono">
                          <Clock size={10} />
                          <span>{relativeTime(file.updatedAt)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Quick File Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateFile(e, file)}
                        title="Duplicate canvas"
                        aria-label={`Duplicate ${file.name}`}
                        className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <Copy size={12} />
                      </button>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFile(e, file)}
                          title={isDeleting ? "Click again to confirm delete" : "Delete canvas"}
                          aria-label={isDeleting ? "Confirm delete" : "Delete canvas"}
                          className={cn(
                            "p-1.5 rounded-lg transition-all shrink-0 cursor-pointer",
                            isDeleting
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 animate-badge-pop"
                              : "hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-rose-600"
                          )}
                        >
                          <Trash size={12} weight={isDeleting ? "fill" : "regular"} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Disk Actions */}
          <div className="pt-2 mt-1.5 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-1">
            <button
              type="button"
              onClick={() => {
                importDoc()
                setIsOpen(false)
              }}
              className="tactile-btn flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              <FolderOpen size={13} />
              <span>Open file</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportDoc()
                setIsOpen(false)
              }}
              className="tactile-btn flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              title="Export as native .zenithsui document"
            >
              <DownloadSimple size={13} />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportExcalidrawDoc()
                setIsOpen(false)
              }}
              className="tactile-btn flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
              title="Export as Universal Sketch (.sketch) file"
            >
              <DownloadSimple size={13} />
              <span>.sketch</span>
            </button>
          </div>

          {/* Wi-Fi & Auto-Save Status Footer */}
          <div className="mt-1.5 pt-1.5 border-t border-stone-100/60 dark:border-stone-800/60 flex items-center justify-between px-2 text-[10px] text-stone-400 dark:text-stone-500">
            {wifiAutoSync ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <WifiHigh size={12} weight="bold" className="animate-pulse-subtle" />
                <span>Same Wi-Fi Sync Active</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Local Storage Active</span>
              </span>
            )}
            <span className="font-mono">Auto-saving</span>
          </div>
        </div>
      )}
    </div>
  )
}
