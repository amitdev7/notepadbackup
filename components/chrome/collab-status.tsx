"use client"

import { useSquig } from "@/lib/store"
import { Users as UsersIcon, ArrowsClockwise as ArrowsClockwiseIcon, WarningCircle as WarningCircleIcon } from "@phosphor-icons/react"

export function CollabStatusBadge() {
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const collabStatus = useSquig((s) => s.collabStatus)
  const collaborators = useSquig((s) => s.collaborators)

  if (!selectedDbId) return null

  const otherCollaboratorsCount = Math.max(0, collaborators.length - 1)

  return (
    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-chrome-xs text-micro font-medium text-muted-foreground select-none">
      {collabStatus === "synced" && (
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Live real-time sync active">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Synced</span>
        </span>
      )}
      {collabStatus === "syncing" && (
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title="Syncing changes…">
          <ArrowsClockwiseIcon className="size-2.5 animate-spin" weight="bold" />
          <span>Syncing…</span>
        </span>
      )}
      {collabStatus === "reconnecting" && (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Reconnecting to real-time session…">
          <span className="size-1.5 rounded-full bg-amber-500" />
          <span>Reconnecting…</span>
        </span>
      )}
      {collabStatus === "offline" && (
        <span className="flex items-center gap-1 text-muted-foreground" title="Real-time session offline">
          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
          <span>Offline</span>
        </span>
      )}
      {collabStatus === "error" && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400" title="Sync error">
          <WarningCircleIcon className="size-2.5" weight="bold" />
          <span>Sync error</span>
        </span>
      )}

      {/* Other connected collaborators in this room */}
      {otherCollaboratorsCount > 0 && (
        <span
          className="flex items-center gap-1 rounded-chrome-xs bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300 font-mono text-[10px]"
          title={`${collaborators.length} collaborators currently in this room`}
        >
          <UsersIcon className="size-3" weight="bold" />
          <span>{collaborators.length}</span>
        </span>
      )}
    </div>
  )
}
