"use client"

// ---------------------------------------------------------------------------
// Trash Modal — workspace document recovery and physical purge.
//
// Shows all soft-deleted documents with original project and deletion timestamp.
// Provides "Restore" (re-enabling document in workspace views) and
// "Delete permanently" (guarded by confirmation dialog).
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"
import { useSquig } from "@/lib/store"
import {
  listTrashDocuments,
  permanentlyDeleteDocument,
  restoreDocument,
  subscribeTrash,
  type TrashItem,
} from "@/lib/cloud/trash"
import { relativeTime } from "@/lib/files"
import { Button } from "@/components/ui/button"
import {
  ArrowCounterClockwiseIcon,
  ClockIcon,
  FolderIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react"

export function TrashDialog() {
  const open = useSquig((s) => s.trashOpen)
  const st = useSquig.getState

  const [items, setItems] = useState<TrashItem[]>([])
  const [confirmDelete, setConfirmDelete] = useState<TrashItem | null>(null)
  const [purging, setPurging] = useState(false)

  // Refresh items whenever dialog opens or storage changes
  useEffect(() => {
    if (!open) {
      setConfirmDelete(null)
      return
    }
    const refresh = () => setItems(listTrashDocuments())
    refresh()
    return subscribeTrash(refresh)
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDelete) {
          setConfirmDelete(null)
        } else {
          st().setTrashOpen(false)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, confirmDelete, st])

  if (!open) return null

  const handleRestore = (item: TrashItem) => {
    restoreDocument(item.id)
    setItems(listTrashDocuments())
  }

  const handleConfirmPermanentDelete = () => {
    if (!confirmDelete) return
    setPurging(true)
    try {
      permanentlyDeleteDocument(confirmDelete.id, "owner")
      setConfirmDelete(null)
      setItems(listTrashDocuments())
    } finally {
      setPurging(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trash-dialog-title"
      data-zenithsui-chrome
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onPointerDown={() => {
        if (!confirmDelete) st().setTrashOpen(false)
      }}
    >
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-foreground/15 backdrop-blur-[2px]" />

      {/* Main modal card */}
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-muted text-muted-foreground">
              <TrashIcon className="size-4" />
            </div>
            <div>
              <h2 id="trash-dialog-title" className="text-title font-medium">
                Trash
              </h2>
              <p className="text-label text-muted-foreground">
                Documents moved to trash can be restored or purged permanently
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close trash modal"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => st().setTrashOpen(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                <TrashIcon className="size-6 stroke-1 opacity-70" />
              </div>
              <h3 className="text-row font-medium text-foreground">Trash is empty</h3>
              <p className="mt-1 max-w-sm text-label text-muted-foreground">
                No soft-deleted documents found in this workspace. When you move a document to trash, it will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="mb-1 flex items-center justify-between px-1 text-label text-muted-foreground">
                <span>{items.length} {items.length === 1 ? "document" : "documents"}</span>
                <span>Original project &amp; deletion time</span>
              </div>
              {items.map((item) => {
                const deletedTs = new Date(item.deleted_at).getTime()
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-chrome-md border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-row font-medium text-foreground">
                          {item.name}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-label text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-chrome-xs border border-border/60 bg-background px-1.5 py-0.5 text-micro text-muted-foreground">
                          <FolderIcon className="size-3" />
                          {item.projectName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-micro">
                          <ClockIcon className="size-3" />
                          {isNaN(deletedTs) ? item.deleted_at : relativeTime(deletedTs)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item)}
                        title="Restore to workspace"
                      >
                        <ArrowCounterClockwiseIcon className="size-3.5" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDelete(item)}
                        title="Permanently purge document"
                      >
                        <TrashIcon className="size-3.5" />
                        Delete permanently
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/70 bg-muted/10 px-5 py-3 text-label text-muted-foreground">
          <span>Soft-deleted documents are hidden from active views.</span>
          <Button variant="ghost" size="sm" onClick={() => st().setTrashOpen(false)}>
            Close
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for Permanent Deletion */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          onPointerDown={(e) => {
            e.stopPropagation()
            setConfirmDelete(null)
          }}
        >
          <div className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" />
          <div
            className="animate-in fade-in zoom-in-95 relative flex w-full max-w-md flex-col overflow-hidden rounded-chrome-lg border border-destructive/30 bg-background p-5 shadow-popup duration-150"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <WarningCircleIcon className="size-5" weight="bold" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="confirm-delete-title" className="text-row font-semibold text-foreground">
                  Permanently delete document?
                </h3>
                <p className="mt-1.5 text-label text-muted-foreground">
                  Are you sure you want to permanently delete &ldquo;
                  <span className="font-medium text-foreground">{confirmDelete.name}</span>
                  &rdquo;?
                </p>
                <p className="mt-1 text-micro text-destructive/90">
                  This action is irreversible. All sketch layers, nodes, and history will be physically purged.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={purging}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={purging}
                onClick={handleConfirmPermanentDelete}
              >
                <TrashIcon className="size-3.5" />
                {purging ? "Purging…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
