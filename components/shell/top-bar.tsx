"use client"

// ---------------------------------------------------------------------------
// Zenithsui Minimal Top Bar
//
// Minimalist floating bar replacing the old permanent top-left stack:
// - Subtle centered document title with inline rename
// - Unobtrusive cloud/local save sync indicator
// - Compact Share action, Wi-Fi publishing trigger, notifications & auth avatar
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import { useWifiSessionStore } from "@/lib/lan/session"
import { SyncIndicator } from "@/components/chrome/sync-indicator"
import { NotificationsPanel } from "@/components/chrome/notifications-panel"
import { AuthCorner } from "@/components/chrome/auth-corner"
import { ShareNetwork, WifiHigh, Bell, PencilSimple, SlidersHorizontal } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function TopBar() {
  const fileName = useSquig((s) => s.fileName)
  const setFileName = useSquig((s) => s.setFileName)
  const effectiveRole = useSquig((s) => s.effectiveRole)
  const isViewer = effectiveRole === "viewer"
  const setShareOpen = useSquig((s) => s.setShareOpen)
  const pagePopoverOpen = useShellStore((s) => s.pagePopoverOpen)
  const togglePagePopover = useShellStore((s) => s.togglePagePopover)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(fileName)
  const [prevFileName, setPrevFileName] = useState(fileName)
  const [notifsOpen, setNotifsOpen] = useState(false)
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
    <>
      <header className="pointer-events-none fixed top-3 inset-x-0 z-30 flex items-center justify-between px-2 sm:px-6 gap-2">
        {/* Left: Intentionally empty on desktop to give canvas maximum breathing space */}
        <div className="hidden md:block md:w-48 pointer-events-none" />

        {/* Center: Subtle Document Title + Inline Sync Indicator */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/60 shadow-xs shadow-stone-900/5 min-w-0">
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

          {/* Cloud / Local Save Indicator */}
          <SyncIndicator />
        </div>

        {/* Right: Actions (View Only, Wi-Fi, Share, Notifications, Auth) */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-1 rounded-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/60 shadow-xs shadow-stone-900/5 shrink-0">
          {isViewer && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Viewer
            </span>
          )}

          {/* Wi-Fi Publishing */}
          <button
            type="button"
            onClick={() => useWifiSessionStore.getState().openPublishDialog()}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Publish on local Wi-Fi router"
            aria-label="Publish on local Wi-Fi router"
          >
            <WifiHigh size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Wi-Fi</span>
          </button>

          {/* Share Action */}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            title="Share drawing with collaborators"
            aria-label="Share drawing with collaborators"
          >
            <ShareNetwork size={14} weight="bold" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Share</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setNotifsOpen(!notifsOpen)}
            className="p-1.5 rounded-full text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Sharing notifications"
            aria-label="Sharing notifications"
            aria-expanded={notifsOpen}
          >
            <Bell size={15} aria-hidden="true" />
          </button>

          {/* Page Settings Toggle Button */}
          <button
            type="button"
            data-dock-page-btn
            onClick={togglePagePopover}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium transition-all select-none cursor-pointer",
              pagePopoverOpen
                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
            )}
            title="Page & Canvas Settings"
            aria-label="Toggle Page and Canvas Settings"
            aria-expanded={pagePopoverOpen}
          >
            <SlidersHorizontal size={14} weight={pagePopoverOpen ? "bold" : "regular"} aria-hidden="true" />
            <span>Page</span>
          </button>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-0.5 shrink-0" />

          {/* Auth Corner Avatar */}
          <AuthCorner />
        </div>
      </header>

      {/* Notifications Drawer */}
      <NotificationsPanel isOpen={notifsOpen} onClose={() => setNotifsOpen(false)} />
    </>
  )
}
