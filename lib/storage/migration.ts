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

  try {
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
        name: meta.name || legacyDoc.name || "Untitled",
        doc: {
          fileName: meta.name || legacyDoc.name || "Untitled",
          nodes: legacyDoc.nodes,
          order: legacyDoc.order,
        },
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

    // Migrate any legacy Excalidraw elements stored in browser localStorage
    try {
      const rawExcalidraw = localStorage.getItem("excalidraw")
      if (rawExcalidraw) {
        const parsed = JSON.parse(rawExcalidraw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const legacyExId = "legacy_excalidraw_import"
          const existing = await getLocalDocument(legacyExId)
          if (!existing) {
            const convertedNodes: Record<string, any> = {}
            const order: string[] = []
            for (const el of parsed) {
              if (el && el.id && !el.isDeleted) {
                convertedNodes[el.id] = {
                  id: el.id,
                  type: el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond" ? "shape" : el.type || "shape",
                  shape: el.type || "rectangle",
                  x: el.x || 0,
                  y: el.y || 0,
                  w: el.width || 100,
                  h: el.height || 100,
                  rotation: el.angle || 0,
                  color: el.strokeColor || "#000000",
                  text: el.text || "",
                }
                order.push(el.id)
              }
            }
            if (order.length > 0) {
              await saveLocalDocument({
                id: legacyExId,
                name: "Recovered Excalidraw Canvas",
                doc: {
                  fileName: "Recovered Excalidraw Canvas",
                  nodes: convertedNodes,
                  order,
                },
                baseRevision: 1,
                serverRevision: 1,
                syncStatus: "local-only",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                deletedAt: null,
              })
              count++
            }
          }
        }
      }
    } catch {
      // ignore corrupt legacy entries
    }

    // Mark migration complete in app_state and localStorage flag
    localStorage.setItem(MIGRATION_FLAG_KEY, "true")
    await withTransaction(STORES.APP_STATE, "readwrite", (tx) => {
      tx.objectStore(STORES.APP_STATE).put({ key: "migrated_from_localstorage", value: true, at: Date.now() })
    })

    return { migratedCount: count, alreadyMigrated: false }
  } catch (err) {
    console.warn("Storage migration skipped or unavailable", err)
    return { migratedCount: 0, alreadyMigrated: false }
  }
}

