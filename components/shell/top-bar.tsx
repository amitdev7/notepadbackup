"use client"

// ---------------------------------------------------------------------------
// Zenithsui Minimal Top Bar
//
// Apple-inspired frosted glass capsule:
// - Centered document title with inline rename
// - Real-time sync/save status pill with pulse indicator
// - Interactive "Files" popover to create, open, and switch canvases
// - Automatic background Wi-Fi mesh synchronization
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react"
import { useSquig } from "@/lib/store"
import { useWifiAutoSync } from "@/lib/lan/auto-sync"
import { FilesPopover } from "@/components/chrome/files-popover"
import { useSyncStore } from "@/lib/sync/engine"
import { PencilSimple, Check } from "@phosphor-icons/react"

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
  const saveFlash = useSquig((s) => s.saveFlash)
  const syncStatus = useSyncStore((s) => s.status)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (saveFlash > 0) {
      setJustSaved(true)
      const t = setTimeout(() => setJustSaved(false), 2000)
      return () => clearTimeout(t)
    }
  }, [saveFlash])

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
    <header className="pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 z-30 flex items-center justify-center px-2 sm:px-6 animate-topbar-enter">
      {/* Center: Frosted Glass Capsule */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full apple-glass-pill min-w-0 max-w-[calc(100vw-1rem)] transition-all duration-200 gpu-accelerated select-none shadow-xl">
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
            className="text-xs font-semibold text-stone-900 dark:text-stone-100 bg-white/80 dark:bg-black/50 backdrop-blur-md ring-2 ring-blue-500/50 border border-blue-400/60 rounded-lg px-2 py-0.5 min-w-[80px] max-w-[130px] sm:max-w-[260px] text-center transition-all duration-150 animate-popover-enter shadow-inner outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="group tactile-press flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white transition-colors truncate cursor-pointer outline-none"
            title="Click to rename document"
            aria-label={`Rename document: ${fileName}`}
          >
            <span className="truncate max-w-[95px] xs:max-w-[140px] sm:max-w-[240px] md:max-w-[320px]">{fileName}</span>
            <PencilSimple
              size={11}
              className="text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 group-hover:scale-110"
              aria-hidden="true"
            />
          </button>
        )}

        <div className="h-3 w-px bg-stone-200/80 dark:bg-stone-700/80 mx-0.5 shrink-0" />

        {/* Live Status Indicator Pill */}
        <div
          className="flex items-center gap-1.5 text-[10px] text-stone-400 dark:text-stone-500 font-mono select-none px-1"
          title={
            syncStatus === "syncing"
              ? "Synchronizing changes..."
              : syncStatus === "synced"
                ? "All changes saved and synced"
                : syncStatus === "conflict"
                  ? "Conflict detected"
                  : syncStatus === "error"
                    ? "Storage or sync error"
                    : "Saved locally"
          }
          aria-live="polite"
        >
          {syncStatus === "syncing" ? (
            <>
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.85)]" aria-hidden="true" />
              <span className="hidden sm:inline text-blue-600 dark:text-blue-400">syncing</span>
            </>
          ) : syncStatus === "conflict" ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">conflict</span>
            </>
          ) : syncStatus === "error" ? (
            <>
              <span className="size-1.5 rounded-full bg-red-500" aria-hidden="true" />
              <span className="text-red-500 hidden sm:inline">save error</span>
            </>
          ) : justSaved ? (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)] transition-all" aria-hidden="true" />
              <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline flex items-center gap-0.5">
                <Check size={10} weight="bold" /> saved
              </span>
            </>
          ) : (
            <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" aria-hidden="true" />
          )}
        </div>

        {/* Files Dropdown & Canvas Manager */}
        <FilesPopover />

        {isViewer && (
          <span className="animate-badge-pop px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 uppercase tracking-wider ml-1">
            Viewer
          </span>
        )}
      </div>
    </header>
  )
}
