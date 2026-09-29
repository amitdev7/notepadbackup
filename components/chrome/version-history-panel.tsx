"use client"

import { useState, useEffect } from "react"
import { useSquig } from "@/lib/store"
import { listVersionSnapshots, restoreVersionSnapshot, type DocumentVersionRecord } from "@/lib/cloud/versions"
import { Button } from "@/components/ui/button"
import { ClockCounterClockwise, X, ArrowCounterClockwise, Copy, Check } from "@phosphor-icons/react"

interface VersionHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  cloudDocId?: string
}

export function VersionHistoryPanel({ isOpen, onClose, cloudDocId }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DocumentVersionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const loadDoc = useSquig((s) => s.loadDoc)
  const fileName = useSquig((s) => s.fileName)

  useEffect(() => {
    let active = true
    if (isOpen && cloudDocId) {
      queueMicrotask(() => {
        if (active) setLoading(true)
      })
      listVersionSnapshots(cloudDocId)
        .then((data) => {
          if (active) setVersions(data)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    return () => {
      active = false
    }
  }, [isOpen, cloudDocId])

  if (!isOpen) return null

  const handleRestore = async (version: DocumentVersionRecord) => {
    if (!cloudDocId) return
    setRestoringId(version.id)
    try {
      const snapshot = await restoreVersionSnapshot(cloudDocId, version.id)
      loadDoc(
        JSON.stringify({
          fileName: fileName || "Untitled",
          nodes: snapshot.nodes || {},
          order: snapshot.order || [],
        })
      )
      onClose()
    } finally {
      setRestoringId(null)
    }
  }

  const handleSaveAsCopy = (version: DocumentVersionRecord) => {
    const copyName = `${fileName} (${version.label || "Copy"})`
    loadDoc(
      JSON.stringify({
        fileName: copyName,
        nodes: version.snapshot.nodes || {},
        order: version.snapshot.order || [],
      })
    )
    onClose()
  }


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-history-title"
      className="fixed inset-y-0 right-0 z-40 w-80 border-l border-border bg-card/95 backdrop-blur-sm p-4 shadow-xl flex flex-col"
    >
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={18} className="text-muted-foreground" />
          <h2 id="version-history-title" className="font-sans text-xs font-semibold tracking-tight">
            Version History
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          aria-label="Close history"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-2">
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-6">Loading timeline…</div>
        ) : versions.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">
            No snapshots yet. Saved cloud revisions will appear here.
          </div>
        ) : (
          versions.map((ver) => (
            <div
              key={ver.id}
              className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{ver.label || `Version ${ver.version_number}`}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(ver.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {Object.keys(ver.snapshot?.nodes || {}).length} node{Object.keys(ver.snapshot?.nodes || {}).length === 1 ? "" : "s"}
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={restoringId === ver.id}
                  onClick={() => handleRestore(ver)}
                  className="h-6 text-[10px] gap-1 px-2"
                >
                  <ArrowCounterClockwise size={12} />
                  {restoringId === ver.id ? "Restoring…" : "Restore"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveAsCopy(ver)}
                  className="h-6 text-[10px] gap-1 px-2"
                >
                  <Copy size={12} />
                  Save as Copy
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

