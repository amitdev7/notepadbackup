// ---------------------------------------------------------------------------
// Zenithsui — Server-Side Shared Document Store (cycle-free).
// Owns ServerStoredDoc/ServerFileMeta types + per-database in-memory maps
// with JSON-snapshot persistence. Imported by API routes, providers, and
// server engines. Must NOT import values from "@/app/api/**".
// ---------------------------------------------------------------------------

import { readJsonSnapshot, writeJsonSnapshot } from "@/lib/server-storage"
import type { ServerStoredDoc as SupaDoc } from "@/lib/supabase-server"
import { getRawSupabaseDoc, updateSupabaseDocPassword } from "@/lib/supabase-server"

export interface ServerStoredDoc {
  id: string
  name: string
  nodes: Record<string, unknown>
  order: string[]
  updatedAt: number
  dbId?: string
  look?: unknown
  hasPassword?: boolean
  passwordHash?: string
  passwordSalt?: string
  ownerSessionId?: string
}

export interface ServerFileMeta {
  id: string
  name: string
  updatedAt: number
  dbId?: string
  hasPassword?: boolean
}

// Global in-memory storage per database ID for the server runtime.
const databaseStores: Record<string, Map<string, ServerStoredDoc>> = {}

function getDbStorageFilename(dbId: string): string {
  const safe = dbId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return `db_files_${safe}.json`
}

export function persistDbFiles(dbId: string): void {
  try {
    const store = databaseStores[dbId]
    if (store) {
      writeJsonSnapshot(getDbStorageFilename(dbId), Array.from(store.values()))
    }
  } catch (err) {
    console.warn(`[DatabaseFiles] Failed to persist files for ${dbId}:`, err)
  }
}

export function getStore(dbId: string): Map<string, ServerStoredDoc> {
  if (!databaseStores[dbId]) {
    databaseStores[dbId] = new Map()
    // Attempt to hydrate from snapshot
    const saved = readJsonSnapshot<ServerStoredDoc[]>(getDbStorageFilename(dbId), [])
    if (saved && saved.length > 0) {
      for (const doc of saved) {
        databaseStores[dbId].set(doc.id, doc)
      }
    } else if (dbId === "primary-db") {
      // Seed initial demo file for primary database
      const seedDoc: ServerStoredDoc = {
        id: "shared-welcome-doc",
        name: "Zenithsui Shared Starter",
        nodes: {
          w1: {
            id: "w1",
            type: "text",
            text: "Welcome to the Shared Database!\nWireframes created here are shared with everyone connected to this database.",
            x: 80,
            y: 100,
            w: 480,
            h: 90,
            seed: 42,
            size: "large",
          },
          w2: {
            id: "w2",
            type: "component",
            kind: "button",
            props: { label: "Shared Wireframe", variant: "primary", size: "default" },
            x: 80,
            y: 220,
            w: 160,
            h: 40,
            seed: 43,
          },
        },
        order: ["w1", "w2"],
        updatedAt: Date.now() - 3600000,
        dbId: "primary-db",
        look: {
          theme: "sketch",
          paper: "subtle",
          font: "hand",
          grid: true,
        },
      }
      databaseStores[dbId].set(seedDoc.id, seedDoc)
      persistDbFiles(dbId)
    }
  }
  return databaseStores[dbId]
}

export async function getRawDoc(dbId: string, fileId: string): Promise<ServerStoredDoc | null> {
  if (dbId === "nezukos-box") {
    const supaDoc = await getRawSupabaseDoc(fileId)
    if (supaDoc) return supaDoc
  }
  const store = getStore(dbId)
  const storeDoc = store.get(fileId)
  if (storeDoc) return storeDoc

  // Check connected database provider
  try {
    const { getProviderForDatabase } = await import("@/lib/data-providers/registry")
    const provider = await getProviderForDatabase(dbId)
    if (provider) {
      const providerDoc = await provider.readDocument(dbId, fileId)
      if (providerDoc) return providerDoc
    }
  } catch {
    // ignore
  }

  // Check workspace boards across all workspaces
  try {
    const { findBoardByIdAcrossWorkspaces } = await import("@/lib/server-workspaces")
    const board = findBoardByIdAcrossWorkspaces(fileId)
    if (board) {
      return {
        id: board.id,
        name: board.name,
        nodes: board.nodes as Record<string, unknown>,
        order: board.order,
        updatedAt: board.updatedAt,
        dbId,
        look: board.look,
      }
    }
  } catch {
    // ignore
  }

  return null
}

export async function updateDocPassword(
  dbId: string,
  fileId: string,
  passwordHash?: string,
  passwordSalt?: string,
  hasPassword = false
): Promise<boolean> {
  if (dbId === "nezukos-box") {
    return updateSupabaseDocPassword(fileId, passwordHash, passwordSalt, hasPassword)
  }
  const store = getStore(dbId)
  const doc = store.get(fileId)
  if (!doc) return false
  doc.passwordHash = passwordHash
  doc.passwordSalt = passwordSalt
  doc.hasPassword = hasPassword
  doc.updatedAt = Date.now()
  store.set(fileId, doc)
  persistDbFiles(dbId)
  return true
}
