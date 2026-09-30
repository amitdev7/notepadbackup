"use client"

import { useSyncStore } from "@/lib/sync/engine"
import { Check, CloudCheck, ArrowsClockwise, WifiSlash, Warning } from "@phosphor-icons/react"

export function SyncIndicator() {
  const { status, triggerSync } = useSyncStore()

  let icon = <Check size={12} className="text-muted-foreground/80" />
  let label = "Saved locally"
  let clickAction: (() => void) | undefined

  if (status === "synced") {
    icon = <CloudCheck size={12} className="text-muted-foreground/80" />
    label = "Synced"
  } else if (status === "syncing") {
    icon = <ArrowsClockwise size={12} className="text-muted-foreground/80 animate-spin" />
    label = "Syncing…"
  } else if (status === "offline") {
    icon = <WifiSlash size={12} className="text-amber-500/80" />
    label = "Offline"
  } else if (status === "conflict") {
    icon = <Warning size={12} className="text-destructive" />
    label = "Conflict"
  } else if (status === "error") {
    icon = <ArrowsClockwise size={12} className="text-amber-600" />
    label = "Retry sync"
    clickAction = triggerSync
  }

  if (clickAction) {
    return (
      <button
        type="button"
        role="status"
        aria-live="polite"
        onClick={clickAction}
        className="inline-flex items-center gap-1 text-[11px] font-sans text-amber-600 hover:text-amber-700 dark:hover:text-amber-400 select-none cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded px-1"
        title={label}
        aria-label="Sync failed. Click or press Enter to retry sync"
      >
        {icon}
        <span>{label}</span>
      </button>
    )
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1 text-[11px] font-sans text-muted-foreground/70 select-none"
      title={label}
    >
      {icon}
      <span>{label}</span>
    </span>
  )
}

