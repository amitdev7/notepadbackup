// ---------------------------------------------------------------------------
// Non-destructive localStorage to IndexedDB Migration Bridge
// ---------------------------------------------------------------------------

import { listFiles, readFile, type FileMeta } from "../files"
import { saveLocalDocument, getLocalDocument, type StoredLocalDoc } from "./documents"
import { openZenithsuiDb, STORES, withTransaction } from "./db"

const MIGRATION_FLAG_KEY = "zenithsui:migrated_to_idb:v1"

export async function migrateLocalStorageToIndexedDB(): Promise<{
  migratedCount: number
  alreadyMigrated: boolean
}> {
  if (typeof window === "undefined") {
    return { migratedCount: 0, alreadyMigrated: false }
  }

  // Check if we already migrated
  const alreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === "true"
  if (alreadyMigrated) {
    return { migratedCount: 0, alreadyMigrated: true }
  }

  const legacyFiles: FileMeta[] = listFiles()
  let count = 0

  for (const meta of legacyFiles) {
    const existing = await getLocalDocument(meta.id)
    if (existing) continue

    const legacyDoc = readFile(meta.id)
    if (!legacyDoc) continue

    const localRecord: StoredLocalDoc = {
      id: meta.id,
      name: meta.name || legacyDoc.fileName || "Untitled",
      doc: legacyDoc,
      baseRevision: 1,
      serverRevision: 1,
      syncStatus: "local-only",
      createdAt: meta.updatedAt || Date.now(),
      updatedAt: meta.updatedAt || Date.now(),
      deletedAt: null,
    }

    await saveLocalDocument(localRecord)
    count++
  }

  // Mark migration complete in app_state and localStorage flag
  localStorage.setItem(MIGRATION_FLAG_KEY, "true")
  await withTransaction(STORES.APP_STATE, "readwrite", (tx) => {
    tx.objectStore(STORES.APP_STATE).put({ key: "migrated_from_localstorage", value: true, at: Date.now() })
  })

  return { migratedCount: count, alreadyMigrated: false }
}

