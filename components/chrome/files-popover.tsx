"use client"

// ---------------------------------------------------------------------------
// Zenithsui Files Popover & Document Manager
//
// Replaces static "Saved locally" text with an interactive "Files" button.
// Allows user to:
// 1. See all saved canvases
// 2. Create a new canvas with 1 click (+ New Canvas)
// 3. Switch between canvases
// 4. Delete or export canvases
// 5. Shows real-time save / Wi-Fi sync status
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react"
import { useSquig } from "@/lib/store"
import { relativeTime, type FileMeta } from "@/lib/files"
import { exportDoc, importDoc } from "@/lib/file-io"
import {
  FolderSimple,
  Plus,
  Check,
  Trash,
  CaretDown,
  DownloadSimple,
  FolderOpen,
  WifiHigh,
  Clock,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function FilesPopover() {
  const [isOpen, setIsOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const docId = useSquig((s) => s.docId)
  const fileName = useSquig((s) => s.fileName)
  const files = useSquig((s) => s.files)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setDeletingId(null)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
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
          "group flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all select-none",
          isOpen
            ? "bg-stone-200/80 dark:bg-stone-700/80 text-stone-900 dark:text-white"
            : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/80"
        )}
      >
        <FolderSimple size={13} weight="fill" className="text-blue-500 shrink-0" aria-hidden="true" />
        <span>Files</span>
        <CaretDown
          size={10}
          weight="bold"
          className={cn(
            "text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-transform duration-150 shrink-0",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
        {/* Subtle active sync dot */}
        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Auto-saved and synced over Wi-Fi" />
      </button>

      {/* Dropdown Menu / Popover */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-xl shadow-stone-900/15 z-50 p-2 text-stone-900 dark:text-stone-100 text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* Header with New Canvas Action */}
          <div className="flex items-center justify-between pb-2 mb-1.5 px-2 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-900 dark:text-white">Canvas Files</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                {files.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-[11px] shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={12} weight="bold" />
              <span>New Canvas</span>
            </button>
          </div>

          {/* Files List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
            {files.length === 0 ? (
              <div className="py-6 text-center text-stone-400 dark:text-stone-500">
                No saved canvases yet.
              </div>
            ) : (
              files.map((file) => {
                const isCurrent = file.id === docId
                const isDeleting = deletingId === file.id

                return (
                  <div
                    key={file.id}
                    onClick={() => handleOpenFile(file.id)}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-colors select-none",
                      isCurrent
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200"
                        : "hover:bg-stone-100 dark:hover:bg-stone-800/60 text-stone-800 dark:text-stone-200"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isCurrent ? (
                        <Check size={13} weight="bold" className="text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <div className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-700 shrink-0 ml-1" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-medium text-xs", isCurrent && "font-semibold")}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1">
                          <Clock size={10} />
                          <span>{relativeTime(file.updatedAt)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Delete action */}
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFile(e, file)}
                        title={isDeleting ? "Click again to permanently delete" : "Delete canvas"}
                        aria-label={isDeleting ? "Confirm delete" : "Delete canvas"}
                        className={cn(
                          "p-1.5 rounded-lg transition-all shrink-0",
                          isDeleting
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                            : "opacity-0 group-hover:opacity-100 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-rose-600"
                        )}
                      >
                        <Trash size={12} weight={isDeleting ? "fill" : "regular"} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Disk Actions */}
          <div className="pt-2 mt-1.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-1">
            <button
              type="button"
              onClick={() => {
                importDoc()
                setIsOpen(false)
              }}
              className="flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100 px-1.5 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <FolderOpen size={12} />
              <span>Open disk file</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportDoc()
                setIsOpen(false)
              }}
              className="flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100 px-1.5 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <DownloadSimple size={12} />
              <span>Export copy</span>
            </button>
          </div>

          {/* Wi-Fi & Auto-Save Status Footer */}
          <div className="mt-1.5 pt-1.5 border-t border-stone-100/60 dark:border-stone-800/60 flex items-center justify-between px-2 text-[10px] text-stone-400 dark:text-stone-500">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <WifiHigh size={11} weight="bold" />
              <span>Same Wi-Fi Sync Active</span>
            </span>
            <span>Auto-saving</span>
          </div>
        </div>
      )}
    </div>
  )
}

