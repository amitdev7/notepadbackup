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

  return (
    <span
      role="status"
      aria-live="polite"
      onClick={clickAction}
      className={`inline-flex items-center gap-1 text-[11px] font-sans text-muted-foreground/70 select-none ${
        clickAction ? "cursor-pointer hover:text-foreground" : ""
      }`}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </span>
  )
}

