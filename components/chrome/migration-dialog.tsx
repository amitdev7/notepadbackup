"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/lib/auth-store"
import { findUnmigratedLocalDocuments, migrateLocalDocumentsToCloud, type LocalDocCandidate } from "@/lib/cloud/migration"
import { Button } from "@/components/ui/button"
import { CloudArrowUp, Check, X } from "@phosphor-icons/react"

export function MigrationDialog() {
  const { state } = useAuthStore()
  const [candidates, setCandidates] = useState<LocalDocCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    if (state === "authenticated") {
      findUnmigratedLocalDocuments().then((docs) => {
        if (docs.length > 0) {
          setCandidates(docs)
          setSelectedIds(new Set(docs.map((d) => d.id)))
          setIsOpen(true)
        }
      })
    }
  }, [state])

  if (!isOpen || candidates.length === 0) return null

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleImport = async (all = false) => {
    setMigrating(true)
    const toImport = all ? candidates.map((c) => c.id) : Array.from(selectedIds)
    await migrateLocalDocumentsToCloud(toImport)
    setMigrating(false)
    setIsOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-muted p-2 text-foreground">
              <CloudArrowUp size={20} />
            </div>
            <div>
              <h2 id="migration-dialog-title" className="font-serif text-base font-medium">
                Local drawings found
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {candidates.length} drawing{candidates.length === 1 ? "" : "s"} stored on this device.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Skip migration"
          >
            <X size={16} />
          </button>
        </div>

        <div className="my-4 max-h-48 overflow-y-auto divide-y divide-border/40 rounded-lg border border-border/60 bg-muted/20">
          {candidates.map((c) => (
            <label
              key={c.id}
              className="flex items-center justify-between p-2.5 hover:bg-muted/40 cursor-pointer select-none text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => handleToggle(c.id)}
                  className="rounded border-border text-foreground focus:ring-1 focus:ring-foreground"
                />
                <span className="font-medium truncate">{c.name}</span>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                {c.nodeCount} node{c.nodeCount === 1 ? "" : "s"}
              </span>
            </label>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mb-4">
          Importing backs up your drawings to your account so you can access them anywhere. Local copies remain safe.
        </p>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-xs text-muted-foreground"
          >
            Keep Local
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={migrating || selectedIds.size === 0}
              onClick={() => handleImport(false)}
              className="text-xs"
            >
              Import Selected ({selectedIds.size})
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={migrating}
              onClick={() => handleImport(true)}
              className="text-xs"
            >
              Import All
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

