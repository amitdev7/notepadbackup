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
import { useShellStore } from "@/lib/shell-store"
import { FilesPopover } from "@/components/chrome/files-popover"
import { ViewMenu } from "@/components/shell/view-menu"
import { TopBarClock } from "@/components/shell/top-bar-clock"
import { useSyncStore } from "@/lib/sync/engine"
import { PencilSimple, Check } from "@phosphor-icons/react"
import { useTranslation } from "@/lib/i18n/use-translation"

export function TopBar() {
  // Automatically detects same Wi-Fi network and keeps canvas in sync across all devices
  useWifiAutoSync()
  const { t } = useTranslation()

  const fileName = useSquig((s) => s.fileName)
  const setFileName = useSquig((s) => s.setFileName)
  const effectiveRole = useSquig((s) => s.effectiveRole)
  const isViewer = effectiveRole === "viewer"
  const showToolbar = useShellStore((s) => s.preferences.showToolbar ?? true)
  const showToolbarViewMenu = useShellStore((s) => s.preferences.showToolbarViewMenu ?? true)
  const showTimeInTopBar = useShellStore((s) => (s.preferences.clockSettings?.enabled ?? true) && (s.preferences.clockSettings?.showInTopBar ?? true))
  const toggleToolbar = useShellStore((s) => s.toggleToolbar)

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

  if (!showToolbar) {
    return (
      <div
        className="fixed top-0 inset-x-0 h-3 z-30 group flex items-center justify-center pointer-events-auto"
        title="Hover to reveal toolbar (⌘⇧T)"
      >
        <button
          type="button"
          onClick={toggleToolbar}
          aria-label="Show top toolbar (⌘⇧T)"
          className="opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-2 transition-all duration-200 apple-glass-pill px-3 py-1 rounded-full text-[10px] font-semibold text-stone-700 dark:text-stone-300 shadow-md cursor-pointer flex items-center gap-1.5"
        >
          <span>{t("show_toolbar")}</span>
          <kbd className="font-mono text-[9px] text-stone-400">⌘⇧T</kbd>
        </button>
      </div>
    )
  }

  return (
    <header className="pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 z-30 flex items-center justify-center px-2 sm:px-6 animate-topbar-enter">
      {/* Center: Frosted Glass Capsule */}
      <div className="pointer-events-auto relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full apple-glass-pill min-w-0 max-w-[calc(100vw-1rem)] transition-[background-color,border-color,box-shadow,opacity] duration-200 select-none shadow-xl">
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
            className="text-xs font-semibold text-foreground bg-background/95 backdrop-blur-md ring-2 ring-[var(--ui-accent,#007AFF)]/50 border border-[var(--ui-accent,#007AFF)]/60 rounded-xl px-2.5 py-0.5 min-w-[80px] max-w-[130px] sm:max-w-[260px] text-center transition-all duration-150 animate-popover-enter shadow-inner outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="group tactile-press flex items-center gap-1.5 text-xs font-semibold text-foreground/90 hover:text-foreground transition-colors truncate cursor-pointer outline-none"
            title={t("rename_document")}
            aria-label={`${t("rename_document")}: ${fileName}`}
          >
            <span className="truncate max-w-[95px] xs:max-w-[140px] sm:max-w-[240px] md:max-w-[320px]">{fileName}</span>
            <PencilSimple
              size={11}
              className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 group-hover:scale-110"
              aria-hidden="true"
            />
          </button>
        )}

        <div className="h-3 w-px bg-border/80 mx-0.5 shrink-0" />

        {/* Live Status Indicator Pill */}
        <div
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono select-none px-1"
          title={
            syncStatus === "syncing"
              ? t("status_syncing")
              : syncStatus === "synced"
                ? t("status_saved")
                : syncStatus === "conflict"
                  ? t("status_conflict")
                  : syncStatus === "error"
                    ? t("status_error")
                    : t("status_saved_locally")
          }
          aria-live="polite"
        >
          {syncStatus === "syncing" ? (
            <>
              <span className="size-1.5 rounded-full bg-[var(--ui-accent,#007AFF)] animate-ios-pulse-halo shadow-[0_0_8px_rgba(37,99,235,0.85)]" aria-hidden="true" />
              <span className="hidden sm:inline text-[var(--ui-accent,#007AFF)]">{t("status_syncing")}</span>
            </>
          ) : syncStatus === "conflict" ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">{t("status_conflict")}</span>
            </>
          ) : syncStatus === "error" ? (
            <>
              <span className="size-1.5 rounded-full bg-destructive" aria-hidden="true" />
              <span className="text-destructive hidden sm:inline">{t("status_error")}</span>
            </>
          ) : justSaved ? (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)] animate-ios-save-halo" aria-hidden="true" />
              <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline-flex items-center gap-0.5">
                <Check size={10} weight="bold" className="animate-lottie-check" /> {t("status_saved")}
              </span>
            </>
          ) : (
            <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
          )}
        </div>

        {/* Files Dropdown & Canvas Manager */}
        <FilesPopover />

        {/* Real-Time Clock & Location Detection */}
        {showTimeInTopBar && (
          <>
            <div className="h-3 w-px bg-border/80 mx-0.5 shrink-0" />
            <TopBarClock />
          </>
        )}

        {showToolbarViewMenu && (
          <>
            <div className="h-3 w-px bg-border/80 mx-0.5 shrink-0" />
            <ViewMenu />
          </>
        )}

        {isViewer && (
          <span className="animate-badge-pop px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 uppercase tracking-wider ml-1">
            {t("viewer_badge")}
          </span>
        )}
      </div>
    </header>
  )
}
