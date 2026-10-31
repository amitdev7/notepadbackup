"use client"

// ---------------------------------------------------------------------------
// Zenithsui Expired Elements Archive Storage Engine
//
// Manages local-first persistence for expired canvas elements:
// - IndexedDB object store (STORES.EXPIRED_ELEMENTS)
// - Synchronous in-memory caching for 0ms reactivity
// - LocalStorage fallback mirror for SSR, tests, and instant hydration
// - Event subscription for reactive UI dialog updates
// ---------------------------------------------------------------------------

import type { ExpiredElementRecord } from "../types"
import { openZenithsuiDb, STORES, withTransaction } from "./db"

const LOCAL_STORAGE_ARCHIVE_KEY = "zenithsui:expired_archive:v1"

/** Synchronous in-memory cache of archived elements */
let archiveCache: ExpiredElementRecord[] = []
let cacheHydrated = false
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb()
    } catch {
      // ignore subscriber error
    }
  })
}

export function subscribeExpiredArchive(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Synchronous local storage read */
function readLocalStorageArchive(): ExpiredElementRecord[] {
  if (typeof window === "undefined" || !window.localStorage) return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ARCHIVE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ExpiredElementRecord[]) : []
  } catch {
    return []
  }
}

/** Synchronous local storage write */
function writeLocalStorageArchive(records: ExpiredElementRecord[]): void {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    localStorage.setItem(LOCAL_STORAGE_ARCHIVE_KEY, JSON.stringify(records))
  } catch {
    // quota exceeded or private mode
  }
}

/** Ensure in-memory cache is hydrated */
function ensureHydrated() {
  if (!cacheHydrated) {
    archiveCache = readLocalStorageArchive()
    cacheHydrated = true
  }
}

/**
 * Save new expired element records to the archive.
 * Updates in-memory cache, local storage, and IndexedDB atomically.
 */
export async function saveExpiredRecords(records: ExpiredElementRecord[]): Promise<void> {
  if (!records.length) return
  ensureHydrated()

  // Prepend to cache (newest first)
  const existingIds = new Set(archiveCache.map((r) => r.archiveId))
  const newItems = records.filter((r) => !existingIds.has(r.archiveId))
  archiveCache = [...newItems, ...archiveCache]
  writeLocalStorageArchive(archiveCache)
  notifyListeners()

  if (typeof window === "undefined" || !window.indexedDB) return

  try {
    await withTransaction(STORES.EXPIRED_ELEMENTS, "readwrite", (tx) => {
      const store = tx.objectStore(STORES.EXPIRED_ELEMENTS)
      for (const rec of newItems) {
        store.put(rec)
      }
    })
  } catch (err) {
    console.warn("[zenithsui-archive] IndexedDB save error, preserved in localStorage fallback:", err)
  }
}

/**
 * List all expired element records, optionally filtered by source documentId.
 */
export async function listExpiredRecords(documentId?: string): Promise<ExpiredElementRecord[]> {
  ensureHydrated()

  if (typeof window !== "undefined" && window.indexedDB) {
    try {
      const db = await openZenithsuiDb()
      const tx = db.transaction(STORES.EXPIRED_ELEMENTS, "readonly")
      const store = tx.objectStore(STORES.EXPIRED_ELEMENTS)

      const idbRecords: ExpiredElementRecord[] = await new Promise((resolve, reject) => {
        let req: IDBRequest
        if (documentId) {
          const index = store.index("by_documentId")
          req = index.getAll(IDBKeyRange.only(documentId))
        } else {
          req = store.getAll()
        }
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })

      if (idbRecords.length > 0) {
        // Merge with memory cache
        const map = new Map<string, ExpiredElementRecord>()
        for (const r of idbRecords) map.set(r.archiveId, r)
        for (const r of archiveCache) map.set(r.archiveId, r)
        archiveCache = Array.from(map.values()).sort((a, b) => b.archivedAt - a.archivedAt)
        writeLocalStorageArchive(archiveCache)
      }
    } catch (err) {
      console.warn("[zenithsui-archive] IndexedDB list error, using cache:", err)
    }
  }

  const list = documentId ? archiveCache.filter((r) => r.documentId === documentId) : archiveCache
  return list.sort((a, b) => b.archivedAt - a.archivedAt)
}

/**
 * Retrieve a single expired element record by its archive ID.
 */
export async function getExpiredRecord(archiveId: string): Promise<ExpiredElementRecord | null> {
  ensureHydrated()
  const found = archiveCache.find((r) => r.archiveId === archiveId)
  if (found) return found

  if (typeof window === "undefined" || !window.indexedDB) return null

  try {
    const db = await openZenithsuiDb()
    const tx = db.transaction(STORES.EXPIRED_ELEMENTS, "readonly")
    const store = tx.objectStore(STORES.EXPIRED_ELEMENTS)
    return await new Promise((resolve) => {
      const req = store.get(archiveId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Permanently delete a record from the archive.
 */
export async function deleteExpiredRecord(archiveId: string): Promise<void> {
  ensureHydrated()
  archiveCache = archiveCache.filter((r) => r.archiveId !== archiveId)
  writeLocalStorageArchive(archiveCache)
  notifyListeners()

  if (typeof window === "undefined" || !window.indexedDB) return

  try {
    await withTransaction(STORES.EXPIRED_ELEMENTS, "readwrite", (tx) => {
      tx.objectStore(STORES.EXPIRED_ELEMENTS).delete(archiveId)
    })
  } catch (err) {
    console.warn("[zenithsui-archive] IndexedDB delete error:", err)
  }
}

/**
 * Clear all expired records (or for a specific document).
 */
export async function clearExpiredRecords(documentId?: string): Promise<void> {
  ensureHydrated()
  if (documentId) {
    archiveCache = archiveCache.filter((r) => r.documentId !== documentId)
  } else {
    archiveCache = []
  }
  writeLocalStorageArchive(archiveCache)
  notifyListeners()

  if (typeof window === "undefined" || !window.indexedDB) return

  try {
    await withTransaction(STORES.EXPIRED_ELEMENTS, "readwrite", (tx) => {
      const store = tx.objectStore(STORES.EXPIRED_ELEMENTS)
      if (documentId) {
        const index = store.index("by_documentId")
        const req = index.openCursor(IDBKeyRange.only(documentId))
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          }
        }
      } else {
        store.clear()
      }
    })
  } catch (err) {
    console.warn("[zenithsui-archive] IndexedDB clear error:", err)
  }
}

/** Synchronous count of archived elements from memory cache */
export function getSynchronousExpiredCount(documentId?: string): number {
  ensureHydrated()
  if (documentId) {
    return archiveCache.filter((r) => r.documentId === documentId).length
  }
  return archiveCache.length
}
