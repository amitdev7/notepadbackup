// ---------------------------------------------------------------------------
// Zenithsui IndexedDB Storage Engine (zenithsui-db v1)
// ---------------------------------------------------------------------------

export const DB_NAME = "zenithsui-db"
export const DB_VERSION = 1

export const STORES = {
  DOCUMENTS: "documents",
  SYNC_QUEUE: "sync_queue",
  ASSET_BLOBS: "asset_blobs",
  APP_STATE: "app_state",
} as const

let dbInstance: IDBDatabase | null = null

export function openZenithsuiDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser"))
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 1. Documents store
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: "id" })
        docStore.createIndex("by_updatedAt", "updatedAt", { unique: false })
        docStore.createIndex("by_syncStatus", "syncStatus", { unique: false })
        docStore.createIndex("by_deleted", "deletedAt", { unique: false })
      }

      // 2. Offline sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" })
        queueStore.createIndex("by_docId", "docId", { unique: false })
        queueStore.createIndex("by_createdAt", "createdAt", { unique: false })
      }

      // 3. Binary asset blobs store
      if (!db.objectStoreNames.contains(STORES.ASSET_BLOBS)) {
        const blobStore = db.createObjectStore(STORES.ASSET_BLOBS, { keyPath: "hash" })
        blobStore.createIndex("by_createdAt", "createdAt", { unique: false })
      }

      // 4. App state store (preferences, active workspace, etc.)
      if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
        db.createObjectStore(STORES.APP_STATE, { keyPath: "key" })
      }
    }

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result
      dbInstance.onclose = () => {
        dbInstance = null
      }
      resolve(dbInstance)
    }

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

/** Execute a transaction with promise wrapper */
export async function withTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openZenithsuiDb()
  const tx = db.transaction(storeNames, mode)

  return new Promise<T>((resolve, reject) => {
    let result: T

    Promise.resolve()
      .then(() => callback(tx))
      .then((res) => {
        result = res
      })
      .catch((err) => {
        tx.abort()
        reject(err)
      })

    tx.oncomplete = () => {
      resolve(result)
    }

    tx.onerror = () => {
      reject(tx.error)
    }

    tx.onabort = () => {
      reject(tx.error || new Error("Transaction aborted"))
    }
  })
}

