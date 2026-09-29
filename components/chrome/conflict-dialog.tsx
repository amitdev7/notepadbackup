"use client"

import { useState } from "react"
import { useSyncStore } from "@/lib/sync/engine"
import { Button } from "@/components/ui/button"
import { WarningCircle, Copy, CloudArrowDown, CheckCircle, ArrowCounterClockwise } from "@phosphor-icons/react"

export function ConflictDialog() {
  const conflictInfo = useSyncStore((s) => s.conflictInfo)
  const resolveConflict = useSyncStore((s) => s.resolveConflict)
  const [resolving, setResolving] = useState(false)

  if (!conflictInfo) return null

  const handleResolve = async (resolution: "save_as_copy" | "keep_mine" | "use_cloud") => {
    setResolving(true)
    try {
      await resolveConflict(resolution)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shrink-0">
            <WarningCircle size={24} />
          </div>
          <div className="space-y-1">
            <h2 id="conflict-dialog-title" className="text-base font-semibold">
              Sync Conflict Detected
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The document <span className="font-medium text-foreground">“{conflictInfo.docName}”</span> was
              modified on another device (revision #{conflictInfo.serverRevision}) while you were editing locally
              (revision #{conflictInfo.localRevision}).
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={resolving}
            onClick={() => handleResolve("save_as_copy")}
            className="w-full flex items-start gap-3 p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group disabled:opacity-50"
          >
            <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary shrink-0">
              <Copy size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Save as Copy (Recommended)
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Save your local edits into a new document copy and update this file to the latest cloud version.
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={resolving}
            onClick={() => handleResolve("use_cloud")}
            className="w-full flex items-start gap-3 p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group disabled:opacity-50"
          >
            <div className="mt-0.5 rounded-md bg-muted p-1.5 text-foreground shrink-0">
              <CloudArrowDown size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Use Cloud Version
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Discard your local unsynced edits and replace with the newer version from the cloud.
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={resolving}
            onClick={() => handleResolve("keep_mine")}
            className="w-full flex items-start gap-3 p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group disabled:opacity-50"
          >
            <div className="mt-0.5 rounded-md bg-muted p-1.5 text-foreground shrink-0">
              <CheckCircle size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                Keep Local Edits
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Force overwrite the cloud document with your local changes.
              </div>
            </div>
          </button>
        </div>

        {resolving && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ArrowCounterClockwise className="animate-spin" size={14} />
            <span>Resolving conflict…</span>
          </div>
        )}
      </div>
    </div>
  )
}

