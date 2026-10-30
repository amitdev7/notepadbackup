import { openZenithsuiDb, STORES, withTransaction } from "./db"
import type { SquigDoc, DocumentViewState } from "../types"

export type LocalSyncStatus =
  | "local-only"
  | "saved-locally"
  | "syncing"
  | "synced"
  | "offline"
  | "conflict"
  | "error"

export interface StoredLocalDoc {
  id: string
  name: string
  doc: SquigDoc
  cloudId?: string | null
  baseRevision: number
  serverRevision: number
  syncStatus: LocalSyncStatus
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  syncError?: string | null
  viewState?: DocumentViewState
}

const syncChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("zenithsui_sync")
    : null

export function notifyDocChanged(docId: string, action: "save" | "delete" | "sync") {
  syncChannel?.postMessage({ docId, action, timestamp: Date.now() })
}

export function onCrossTabDocChange(
  callback: (message: { docId: string; action: string; timestamp: number }) => void
) {
  if (!syncChannel) return () => { }
  const handler = (event: MessageEvent) => {
    callback(event.data)
  }
  syncChannel.addEventListener("message", handler)
  return () => syncChannel.removeEventListener("message", handler)
}

export async function saveLocalDocument(docRecord: StoredLocalDoc): Promise<void> {
  await withTransaction(STORES.DOCUMENTS, "readwrite", (tx) => {
    const store = tx.objectStore(STORES.DOCUMENTS)
    store.put(docRecord)
  })
  notifyDocChanged(docRecord.id, "save")
}

export async function getLocalDocument(id: string): Promise<StoredLocalDoc | null> {
  try {
    const db = await openZenithsuiDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DOCUMENTS, "readonly")
      const store = tx.objectStore(STORES.DOCUMENTS)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function listLocalDocuments(includeDeleted = false): Promise<StoredLocalDoc[]> {
  try {
    const db = await openZenithsuiDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DOCUMENTS, "readonly")
      const store = tx.objectStore(STORES.DOCUMENTS)
      const req = store.getAll()

      req.onsuccess = () => {
        const all = (req.result as StoredLocalDoc[]) || []
        const filtered = includeDeleted ? all : all.filter((d) => !d.deletedAt)
        filtered.sort((a, b) => b.updatedAt - a.updatedAt)
        resolve(filtered)
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function softDeleteLocalDocument(id: string): Promise<void> {
  const existing = await getLocalDocument(id)
  if (!existing) return

  existing.deletedAt = Date.now()
  existing.updatedAt = Date.now()
  await saveLocalDocument(existing)
  notifyDocChanged(id, "delete")
}

export async function permanentlyDeleteLocalDocument(id: string): Promise<void> {
  await withTransaction(STORES.DOCUMENTS, "readwrite", (tx) => {
    const store = tx.objectStore(STORES.DOCUMENTS)
    store.delete(id)
  })
  notifyDocChanged(id, "delete")
}

export async function restoreLocalDocument(id: string): Promise<void> {
  const existing = await getLocalDocument(id)
  if (!existing) return

  existing.deletedAt = null
  existing.updatedAt = Date.now()
  await saveLocalDocument(existing)
  notifyDocChanged(id, "save")
}

export async function duplicateLocalDocument(id: string): Promise<StoredLocalDoc | null> {
  const existing = await getLocalDocument(id)
  if (!existing) return null

  const newId = `doc_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`
  const clone: StoredLocalDoc = {
    ...existing,
    id: newId,
    name: `${existing.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    syncStatus: "local-only",
  }
  await saveLocalDocument(clone)
  notifyDocChanged(newId, "save")
  return clone
}


