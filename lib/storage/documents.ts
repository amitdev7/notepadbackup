import { openZenithsuiDb, STORES, withTransaction } from "./db"
import type { SquigDoc } from "../types"

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
  if (!syncChannel) return () => {}
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
  const db = await openZenithsuiDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DOCUMENTS, "readonly")
    const store = tx.objectStore(STORES.DOCUMENTS)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function listLocalDocuments(includeDeleted = false): Promise<StoredLocalDoc[]> {
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
    req.onerror = () => reject(req.error)
  })
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

