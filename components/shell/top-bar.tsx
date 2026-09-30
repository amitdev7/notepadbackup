"use client"

// ---------------------------------------------------------------------------
// Zenithsui Minimal Top Bar
//
// - Centered document title with inline rename
// - "Files" popover to create new canvas, view saved canvases, and switch files
// - Background automatic Wi-Fi sync across any device on the same Wi-Fi
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react"
import { useSquig } from "@/lib/store"
import { useWifiAutoSync } from "@/lib/lan/auto-sync"
import { FilesPopover } from "@/components/chrome/files-popover"
import { PencilSimple } from "@phosphor-icons/react"

export function TopBar() {
  // Automatically detects same Wi-Fi network and keeps canvas in sync across all devices
  useWifiAutoSync()

  const fileName = useSquig((s) => s.fileName)
  const setFileName = useSquig((s) => s.setFileName)
  const effectiveRole = useSquig((s) => s.effectiveRole)
  const isViewer = effectiveRole === "viewer"

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(fileName)
  const [prevFileName, setPrevFileName] = useState(fileName)
  const inputRef = useRef<HTMLInputElement>(null)

  if (prevFileName !== fileName) {
    setPrevFileName(fileName)
    setTitleDraft(fileName)
  }

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditingTitle])

  const commitTitle = () => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== fileName) {
      setFileName(trimmed)
    } else {
      setTitleDraft(fileName)
    }
    setIsEditingTitle(false)
  }

  return (
    <header className="pointer-events-none fixed top-3 inset-x-0 z-30 flex items-center justify-center px-2 sm:px-6">
      {/* Center: Document Title + Files Popover */}
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border border-stone-200/70 dark:border-stone-800/70 shadow-xs shadow-stone-900/5 min-w-0">
        {isEditingTitle ? (
          <input
            ref={inputRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle()
              if (e.key === "Escape") {
                setTitleDraft(fileName)
                setIsEditingTitle(false)
              }
            }}
            aria-label="Document title"
            className="text-xs font-medium text-stone-900 dark:text-stone-100 bg-transparent outline-none border-b border-blue-500 px-1 py-0.5 min-w-[80px] max-w-[180px] sm:max-w-[240px] text-center"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="group flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white transition-colors truncate"
            title="Click to rename document"
            aria-label={`Rename document: ${fileName}`}
          >
            <span className="truncate max-w-[120px] sm:max-w-[280px]">{fileName}</span>
            <PencilSimple size={11} className="text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
          </button>
        )}

        <div className="h-3 w-px bg-stone-200 dark:bg-stone-700 mx-0.5 shrink-0" />

        {/* Files Dropdown & Canvas Manager */}
        <FilesPopover />

        {isViewer && (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 uppercase tracking-wider ml-1">
            Viewer
          </span>
        )}
      </div>
    </header>
  )
}
