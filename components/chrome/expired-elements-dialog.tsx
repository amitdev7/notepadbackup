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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-popover-enter font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/70 dark:border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Archive size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Expired Elements Archive
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-stone-100 dark:bg-stone-800 text-stone-500">
                  {records.length}
                </span>
              </h2>
              <p className="text-[11px] text-stone-500">
                Recover elements that automatically expired from your canvas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-5 py-3 border-b border-stone-100 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-900/40">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-200/60 dark:bg-stone-800/70 text-xs">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                filterTab === "all"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
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
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
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
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
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
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              )}
            >
              This Week
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by preview or type..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* List of Expired Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60 p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 mb-3">
                <Archive size={32} weight="light" />
              </div>
              <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {records.length === 0 ? "No Expired Elements" : "No Matching Elements"}
              </h3>
              <p className="text-[11px] text-stone-500 max-w-sm">
                {records.length === 0
                  ? "When elements with expiration timers expire, they are automatically preserved here for recovery."
                  : "Try clearing your search query or switching to the 'All' tab."}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.archiveId}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
              >
                {/* Left: icon + content */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0">
                    {getIconForType(item.elementType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                        {item.previewLabel}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 uppercase">
                        {item.elementType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400 font-mono">
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
                    className="h-7 px-2 text-[11px] gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    title="Restore element to canvas and make it permanent"
                  >
                    <InfinityIcon size={13} />
                    <span>Permanent</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(item, "original")}
                    className="h-7 px-2 text-[11px] gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    title="Restore element to canvas with renewed timer"
                  >
                    <ArrowCounterClockwise size={13} />
                    <span>Restore</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCustomRestoreItem(item)}
                    className="h-7 px-2 text-[11px] gap-1 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Restore with custom duration"
                  >
                    <Clock size={13} />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(item)}
                    className="h-7 px-2 text-[11px] text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200/70 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/30 text-xs">
          <span className="text-[11px] text-stone-400 font-mono">
            {filtered.length} of {records.length} archived items
          </span>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmClearAll(true)}
                className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-red-600">
                <WarningCircle size={20} weight="fill" />
                <h4 className="text-xs font-semibold">Delete Permanently?</h4>
              </div>
              <p className="text-[11px] text-stone-500">
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
                  className="h-8 text-xs bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal: Clear Entire Archive */}
        {confirmClearAll && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-red-600">
                <WarningCircle size={20} weight="fill" />
                <h4 className="text-xs font-semibold">Clear Expired Elements Archive?</h4>
              </div>
              <p className="text-[11px] text-stone-500">
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
                  className="h-8 text-xs bg-red-600 hover:bg-red-700"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Custom Duration Restore */}
        {customRestoreItem && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock size={18} weight="bold" />
                <h4 className="text-xs font-semibold">Restore with New Timer</h4>
              </div>
              <p className="text-[11px] text-stone-500">
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
                        ? "bg-blue-500 text-white border-blue-500 shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 border-stone-200/60 dark:border-stone-700 text-stone-700 dark:text-stone-300"
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
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
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
