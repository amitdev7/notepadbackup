"use client"

// ---------------------------------------------------------------------------
// Version History Modal & Panel for Zenithsui.
// Allows browsing previous snapshots, previewing them non-destructively,
// creating manual checkpoints, and restoring historical versions.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react"
import { useSquig } from "@/lib/store"
import {
  ClockCounterClockwise as HistoryIcon,
  ArrowsClockwise as RefreshIcon,
  Eye as EyeIcon,
  ArrowCounterClockwise as RestoreIcon,
  BookmarkSimple as BookmarkIcon,
  X as XIcon,
  Lock as LockIcon,
  WarningCircle as WarningIcon,
  Sparkle as SparkleIcon,
} from "@phosphor-icons/react"
import type { PageVersionMeta } from "@/lib/version-types"

function formatRelativeTime(ts: number): string {
  const now = Date.now()
  const diff = Math.max(0, now - ts)
  const secs = Math.floor(diff / 1000)
  if (secs < 30) return "just now"
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function formatExactTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function VersionHistoryModal() {
  const open = useSquig((s) => s.versionHistoryOpen)
  if (!open) return null
  return <VersionHistoryDialog />
}

function VersionHistoryDialog() {
  const versions = useSquig((s) => s.versions)
  const isLoading = useSquig((s) => s.isLoadingVersions)
  const isRestoring = useSquig((s) => s.isRestoringVersion)
  const previewVersion = useSquig((s) => s.previewVersion)
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const isReadOnly = useSquig((s) => s.isReadOnly)
  const fileName = useSquig((s) => s.fileName)
  const docId = useSquig((s) => s.docId)

  const st = useSquig.getState

  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<PageVersionMeta | null>(null)
  const [snapshotLabel, setSnapshotLabel] = useState("")
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")

  useEffect(() => {
    void st().fetchVersions()
  }, [st])

  const handleClose = () => {
    st().closeVersionHistory()
  }

  const handlePreview = async (v: PageVersionMeta) => {
    await st().previewVersionById(v.version)
    // Close modal so user can view preview banner & canvas
    st().closeVersionHistory()
  }

  const handleConfirmRestore = async () => {
    if (!confirmRestoreVersion) return
    const targetVersion = confirmRestoreVersion.version
    const success = await st().restoreVersion(targetVersion)
    if (success) {
      setConfirmRestoreVersion(null)
    }
  }

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDbId) return
    setIsCreatingSnapshot(true)
    try {
      const token = localStorage.getItem(`zenithsui_edit_token:${selectedDbId}:${docId}`) || ""
      const res = await fetch(`/api/database/${encodeURIComponent(selectedDbId)}/files/${encodeURIComponent(docId)}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zenithsui-edit-token": token,
        },
        body: JSON.stringify({
          action: "snapshot",
          label: snapshotLabel.trim() || "Manual checkpoint",
        }),
      })
      if (res.ok) {
        setSnapshotLabel("")
        setShowCreateForm(false)
        await st().fetchVersions()
        st().setNotice("Checkpoint saved to version history")
      } else {
        const data = await res.json()
        st().setNotice(data.error || "Failed to create snapshot")
      }
    } catch {
      st().setNotice("Error saving checkpoint")
    } finally {
      setIsCreatingSnapshot(false)
    }
  }

  const filteredVersions = versions.filter((v) => {
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    return (
      `version ${v.version}`.includes(q) ||
      (v.label && v.label.toLowerCase().includes(q)) ||
      (v.reason && v.reason.toLowerCase().includes(q))
    )
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onPointerDown={handleClose}
    >
      <div className="absolute inset-0 bg-foreground/15 backdrop-blur-[2px]" />
      
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-chrome-sm bg-[var(--sq-ink)]/10 text-[var(--sq-ink)]">
              <HistoryIcon size={18} weight="bold" />
            </div>
            <div>
              <h2 className="font-sans text-sm font-semibold text-foreground flex items-center gap-2">
                Version History
                <span className="rounded-chrome-xs bg-muted px-1.5 py-0.5 text-micro font-normal text-muted-foreground">
                  {fileName}
                </span>
              </h2>
              <p className="text-micro text-muted-foreground">
                Review, preview, and restore previous snapshots of this page.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => st().fetchVersions()}
              disabled={isLoading}
              className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh version list"
            >
              <RefreshIcon size={14} weight="bold" className={isLoading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <XIcon size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Restore Confirmation Screen */}
        {confirmRestoreVersion && (
          <div className="p-6 flex flex-col gap-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <WarningIcon size={20} weight="bold" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Restore to Version {confirmRestoreVersion.version}?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will restore the page to its state from{" "}
                  <strong className="font-medium text-foreground">
                    {formatExactTime(confirmRestoreVersion.createdAt)}
                  </strong>
                  . A brand-new version will be created for the restored state, so all prior version history remains intact.
                </p>
              </div>
            </div>

            {isReadOnly && (
              <div className="rounded-chrome-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <LockIcon size={14} weight="bold" />
                <span>This page is currently read-only. You will be prompted for the edit password.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreVersion(null)}
                disabled={isRestoring}
                className="rounded-chrome-sm border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex items-center gap-1.5 rounded-chrome-sm bg-[var(--sq-ink)] px-3.5 py-1.5 text-xs font-medium text-[var(--sq-bg)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshIcon size={13} weight="bold" className="animate-spin" />
                    Restoring…
                  </>
                ) : (
                  <>
                    <RestoreIcon size={13} weight="bold" />
                    Confirm Restore
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Toolbar: Search + Create Checkpoint */}
        {!confirmRestoreVersion && (
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-5 py-2.5">
            <input
              type="text"
              placeholder="Search versions by label or date…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="h-7 w-56 rounded-chrome-sm border border-border/70 bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-[var(--sq-ink)]"
            />

            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                disabled={isReadOnly}
                className="flex items-center gap-1.5 rounded-chrome-sm border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <BookmarkIcon size={13} weight="bold" />
                <span>Save Checkpoint</span>
              </button>
            ) : null}
          </div>
        )}

        {/* Create Manual Checkpoint Form */}
        {showCreateForm && !confirmRestoreVersion && (
          <form onSubmit={handleCreateSnapshot} className="border-b border-border/70 bg-accent/30 p-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <SparkleIcon size={13} weight="bold" className="text-amber-500" />
                Name this checkpoint snapshot
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Before hero layout changes"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  autoFocus
                  className="h-8 flex-1 rounded-chrome-sm border border-border bg-background px-2.5 text-xs text-foreground outline-none focus:border-[var(--sq-ink)]"
                />
                <button
                  type="submit"
                  disabled={isCreatingSnapshot}
                  className="h-8 rounded-chrome-sm bg-[var(--sq-ink)] px-3 text-xs font-medium text-[var(--sq-bg)] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isCreatingSnapshot ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setSnapshotLabel("")
                  }}
                  className="h-8 rounded-chrome-sm border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Version List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50 p-2">
          {isLoading && versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshIcon size={24} weight="bold" className="animate-spin mb-2" />
              <p className="text-xs">Loading page version history…</p>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <HistoryIcon size={28} weight="light" className="mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No versions found</p>
              <p className="text-xs max-w-xs mt-1">
                {filterQuery
                  ? "No versions match your search query."
                  : "Edits to shared database pages automatically generate version checkpoints."}
              </p>
            </div>
          ) : (
            filteredVersions.map((v, index) => {
              const isLatest = index === 0
              const isCurrentPreview = previewVersion?.version === v.version

              return (
                <div
                  key={v.id || v.version}
                  className={`group flex items-center justify-between rounded-chrome-sm p-3 transition-colors ${
                    isCurrentPreview
                      ? "bg-blue-500/10 border border-blue-500/30"
                      : isLatest
                      ? "bg-accent/40 hover:bg-accent/70"
                      : "hover:bg-accent/40"
                  }`}
                >
                  {/* Left: Version Info */}
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-chrome-xs text-xs font-bold ${
                        isLatest
                          ? "bg-[var(--sq-ink)] text-[var(--sq-bg)]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      v{v.version}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans text-xs font-semibold text-foreground">
                          {v.label || `Version ${v.version}`}
                        </span>

                        {isLatest && (
                          <span className="rounded-chrome-xs bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                            Current Live
                          </span>
                        )}

                        {isCurrentPreview && (
                          <span className="rounded-chrome-xs bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <EyeIcon size={10} weight="bold" />
                            Previewing
                          </span>
                        )}

                        {v.restoredFromVersion ? (
                          <span className="rounded-chrome-xs bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-medium text-purple-700 dark:text-purple-300">
                            Restored from v{v.restoredFromVersion}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 text-micro text-muted-foreground mt-0.5">
                        <span title={formatExactTime(v.createdAt)} className="cursor-help underline decoration-dotted">
                          {formatRelativeTime(v.createdAt)}
                        </span>
                        <span>•</span>
                        <span>{v.nodeCount} {v.nodeCount === 1 ? "layer" : "layers"}</span>
                        {v.reason && v.reason !== v.label && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{v.reason}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-90 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handlePreview(v)}
                      className={`flex items-center gap-1 rounded-chrome-xs px-2 py-1 text-xs font-medium transition-colors ${
                        isCurrentPreview
                          ? "bg-blue-500 text-white"
                          : "border border-border/80 bg-background text-foreground hover:bg-accent"
                      }`}
                      title="Preview this version on canvas"
                    >
                      <EyeIcon size={12} weight="bold" />
                      <span>{isCurrentPreview ? "Previewing" : "Preview"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmRestoreVersion(v)}
                      className="flex items-center gap-1 rounded-chrome-xs border border-border/80 bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-[var(--sq-ink)] hover:text-[var(--sq-bg)] transition-colors"
                      title="Restore canvas to this version"
                    >
                      <RestoreIcon size={12} weight="bold" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-5 py-3 text-micro text-muted-foreground">
          <span>{versions.length} total recorded snapshots</span>
          <span>Restoring creates a new snapshot without erasing past history</span>
        </div>
      </div>
    </div>
  )
}
