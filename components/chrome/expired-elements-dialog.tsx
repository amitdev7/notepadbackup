"use client"

// ---------------------------------------------------------------------------
// Zenithsui Expired Elements Archive Dialog
//
// Workspace modal allowing users to inspect, recover, and permanently delete
// expired canvas elements:
// - Filter by: All, This Document, Today, This Week, Older
// - Search by content preview label or node type
// - Restoration options:
//     * Restore (resets configured duration from now)
//     * Restore as Permanent (strips expiration metadata)
//     * Restore with Custom Duration
// - Permanent physical purge (guarded by confirmation dialog)
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"
import { useSquig } from "@/lib/store"
import { useShellStore } from "@/lib/shell-store"
import type { ExpiredElementRecord } from "@/lib/types"
import {
  listExpiredRecords,
  deleteExpiredRecord,
  clearExpiredRecords,
  subscribeExpiredArchive,
} from "@/lib/storage/expired-archive"
import { restoreExpiredElement } from "@/lib/canvas/expiration-manager"
import { relativeTime } from "@/lib/files"
import { Button } from "@/components/ui/button"
import {
  Archive,
  ArrowCounterClockwise,
  Clock,
  Infinity as InfinityIcon,
  MagnifyingGlass,
  PencilSimple,
  Shapes,
  TextT,
  Trash,
  WarningCircle,
  X,
  Image as ImageIcon,
  ArrowUpRight,
  Note,
  BoundingBox,
  File,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function ExpiredElementsDialog() {
  const open = useShellStore((s) => s.expiredArchiveOpen)
  const setOpen = useShellStore((s) => s.setExpiredArchiveOpen)
  const currentDocId = useSquig((s) => s.docId)
  const currentDocName = useSquig((s) => s.fileName)

  const [records, setRecords] = useState<ExpiredElementRecord[]>([])
  const [filterTab, setFilterTab] = useState<"all" | "doc" | "today" | "week">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<ExpiredElementRecord | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [customRestoreItem, setCustomRestoreItem] = useState<ExpiredElementRecord | null>(null)
  const [customRestoreDuration, setCustomRestoreDuration] = useState(5 * 60 * 1000)
  const [now, setNow] = useState(0)

  // Refresh records whenever dialog opens or storage changes
  useEffect(() => {
    if (!open) return
    const refresh = async () => {
      setNow(Date.now())
      const list = await listExpiredRecords()
      setRecords(list)
    }
    void refresh()
    const unsub = subscribeExpiredArchive(() => void refresh())
    return () => {
      unsub()
      setConfirmDelete(null)
      setConfirmClearAll(false)
      setCustomRestoreItem(null)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDelete) setConfirmDelete(null)
        else if (confirmClearAll) setConfirmClearAll(false)
        else if (customRestoreItem) setCustomRestoreItem(null)
        else setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, confirmDelete, confirmClearAll, customRestoreItem, setOpen])

  if (!open) return null

  const currentTime = now || 0
  const oneDayAgo = currentTime - 24 * 3600 * 1000
  const oneWeekAgo = currentTime - 7 * 24 * 3600 * 1000

  // Filter items
  const filtered = records.filter((r) => {
    // Tab filter
    if (filterTab === "doc" && r.documentId !== currentDocId) return false
    if (filterTab === "today" && r.archivedAt < oneDayAgo) return false
    if (filterTab === "week" && r.archivedAt < oneWeekAgo) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchLabel = r.previewLabel.toLowerCase().includes(q)
      const matchType = r.elementType.toLowerCase().includes(q)
      return matchLabel || matchType
    }
    return true
  })

  const getIconForType = (type: string) => {
    switch (type) {
      case "text":
        return <TextT size={16} className="text-blue-500" />
      case "draw":
        return <PencilSimple size={16} className="text-amber-500" />
      case "shape":
        return <Shapes size={16} className="text-emerald-500" />
      case "image":
        return <ImageIcon size={16} className="text-purple-500" />
      case "arrow":
        return <ArrowUpRight size={16} className="text-indigo-500" />
      case "sticky":
        return <Note size={16} className="text-amber-400" />
      case "frame":
        return <BoundingBox size={16} className="text-stone-500" />
      default:
        return <File size={16} className="text-stone-400" />
    }
  }

  const handleRestore = async (r: ExpiredElementRecord, mode: "original" | "permanent") => {
    await restoreExpiredElement(r.archiveId, { mode })
    const list = await listExpiredRecords()
    setRecords(list)
    useSquig.getState().setNotice(`Restored "${r.previewLabel}" to canvas.`)
  }

  const handleCustomRestore = async () => {
    if (!customRestoreItem) return
    await restoreExpiredElement(customRestoreItem.archiveId, {
      mode: "temporary",
      newDurationMs: customRestoreDuration,
    })
    setCustomRestoreItem(null)
    const list = await listExpiredRecords()
    setRecords(list)
    useSquig.getState().setNotice(`Restored "${customRestoreItem.previewLabel}" with ${Math.round(customRestoreDuration / 60000)}m timer.`)
  }

  const handleDeletePermanent = async (r: ExpiredElementRecord) => {
    await deleteExpiredRecord(r.archiveId)
    setConfirmDelete(null)
    const list = await listExpiredRecords()
    setRecords(list)
  }

  const handleClearAll = async () => {
    await clearExpiredRecords()
    setConfirmClearAll(false)
    setRecords([])
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-scale-fade"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl apple-glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-fade font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Archive size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                Expired Elements Archive
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-muted text-muted-foreground">
                  {records.length}
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Recover elements that automatically expired from your canvas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-5 py-3 border-b border-border/50 bg-muted/20">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/60 border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                filterTab === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("doc")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1",
                filterTab === "doc"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={`Only elements from current file (${currentDocName})`}
            >
              <span>This Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("today")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                filterTab === "today"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("week")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                filterTab === "week"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              This Week
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by preview or type..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-input/80 bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent,#007AFF)]/20 focus:border-[var(--ui-accent,#007AFF)] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List of Expired Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="p-3.5 rounded-2xl bg-muted/50 text-muted-foreground mb-3">
                <Archive size={32} weight="light" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mb-1">
                {records.length === 0 ? "No Expired Elements" : "No Matching Elements"}
              </h3>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                {records.length === 0
                  ? "When elements with expiration timers expire, they are automatically preserved here for recovery."
                  : "Try clearing your search query or switching to the 'All' tab."}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.archiveId}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
              >
                {/* Left: icon + content */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-muted/60 shrink-0 text-muted-foreground">
                    {getIconForType(item.elementType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground truncate">
                        {item.previewLabel}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase">
                        {item.elementType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-mono">
                      <span>Expired {relativeTime(item.archivedAt)}</span>
                      <span>·</span>
                      <span className="truncate max-w-[150px]">
                        {item.documentId === currentDocId ? "Current Canvas" : `Doc ${item.documentId.slice(0, 8)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(item, "permanent")}
                    className="h-7 px-2 text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    title="Restore element to canvas and make it permanent"
                  >
                    <InfinityIcon size={13} />
                    <span>Permanent</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(item, "original")}
                    className="h-7 px-2 text-[11px] gap-1 text-[var(--ui-accent,#007AFF)] hover:bg-[var(--ui-accent,#007AFF)]/10"
                    title="Restore element to canvas with renewed timer"
                  >
                    <ArrowCounterClockwise size={13} />
                    <span>Restore</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCustomRestoreItem(item)}
                    className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Restore with custom duration"
                  >
                    <Clock size={13} />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(item)}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete permanently"
                  >
                    <Trash size={13} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/70 bg-muted/10 text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">
            {filtered.length} of {records.length} archived items
          </span>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmClearAll(true)}
                className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
              >
                Clear Archive
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-8 px-3 text-xs"
            >
              Done
            </Button>
          </div>
        </div>

        {/* Confirmation Modal: Delete Single Item */}
        {confirmDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-scale-fade">
            <div className="w-full max-w-sm p-4 apple-glass-panel border-destructive/30 rounded-2xl shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-destructive">
                <WarningCircle size={20} weight="fill" />
                <h4 className="text-xs font-semibold">Delete Permanently?</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Are you sure you want to permanently delete &quot;{confirmDelete.previewLabel}&quot;?
                This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeletePermanent(confirmDelete)}
                  className="h-8 text-xs"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal: Clear Entire Archive */}
        {confirmClearAll && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-scale-fade">
            <div className="w-full max-w-sm p-4 apple-glass-panel border-destructive/30 rounded-2xl shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-destructive">
                <WarningCircle size={20} weight="fill" />
                <h4 className="text-xs font-semibold">Clear Expired Elements Archive?</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This will permanently delete all {records.length} archived elements.
                This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmClearAll(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleClearAll}
                  className="h-8 text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Custom Duration Restore */}
        {customRestoreItem && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-scale-fade">
            <div className="w-full max-w-sm p-4 apple-glass-panel rounded-2xl shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[var(--ui-accent,#007AFF)]">
                <Clock size={18} weight="bold" />
                <h4 className="text-xs font-semibold">Restore with New Timer</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Choose how long &quot;{customRestoreItem.previewLabel}&quot; should remain active on the canvas:
              </p>

              <div className="grid grid-cols-3 gap-1.5 py-1">
                {[
                  { label: "1 min", val: 60 * 1000 },
                  { label: "5 min", val: 5 * 60 * 1000 },
                  { label: "15 min", val: 15 * 60 * 1000 },
                  { label: "1 hour", val: 60 * 60 * 1000 },
                  { label: "6 hours", val: 6 * 3600 * 1000 },
                  { label: "24 hours", val: 24 * 3600 * 1000 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setCustomRestoreDuration(opt.val)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer",
                      customRestoreDuration === opt.val
                        ? "bg-[var(--ui-accent,#007AFF)] text-white border-[var(--ui-accent,#007AFF)] shadow-xs"
                        : "bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCustomRestoreItem(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomRestore}
                  className="h-8 text-xs"
                >
                  Restore
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
