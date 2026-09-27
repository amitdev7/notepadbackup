"use client"

// ---------------------------------------------------------------------------
// Floating Top Banner when previewing a historical version snapshot.
// ---------------------------------------------------------------------------

import { useSquig } from "@/lib/store"
import {
  ArrowCounterClockwise as RestoreIcon,
  X as XIcon,
  Eye as EyeIcon,
} from "@phosphor-icons/react"

export function VersionPreviewBanner() {
  const previewVersion = useSquig((s) => s.previewVersion)
  const isRestoring = useSquig((s) => s.isRestoringVersion)
  const st = useSquig.getState

  if (!previewVersion) return null

  const handleRestore = async () => {
    await st().restoreVersion(previewVersion.version)
  }

  const handleExit = () => {
    st().exitVersionPreview()
  }

  const handleOpenHistory = () => {
    void st().openVersionHistory()
  }

  const exactDate = new Date(previewVersion.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center gap-3 rounded-full border border-blue-500/40 bg-background/95 px-4 py-2 shadow-popup backdrop-blur-sm">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <EyeIcon size={16} weight="bold" />
          <span className="text-xs font-semibold">
            Previewing Version {previewVersion.version}
          </span>
        </div>

        <span className="text-micro text-muted-foreground hidden sm:inline">
          ({exactDate})
        </span>

        <div className="h-3.5 w-px bg-border" />

        <button
          type="button"
          onClick={handleOpenHistory}
          className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          History…
        </button>

        <button
          type="button"
          onClick={handleRestore}
          disabled={isRestoring}
          className="flex items-center gap-1.5 rounded-full bg-[var(--sq-ink)] px-3 py-1 text-xs font-medium text-[var(--sq-bg)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RestoreIcon size={12} weight="bold" />
          <span>{isRestoring ? "Restoring…" : "Restore Version"}</span>
        </button>

        <button
          type="button"
          onClick={handleExit}
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Exit preview and return to live canvas"
        >
          <XIcon size={13} weight="bold" />
        </button>
      </div>
    </div>
  )
}
