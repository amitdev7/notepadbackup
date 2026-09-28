// ---------------------------------------------------------------------------
// Server-Side Version History Engine for Shared Pages
// ---------------------------------------------------------------------------

import type { PageVersion, PageVersionDoc, PageVersionMeta } from "./version-types"
import type { ServerStoredDoc } from "@/lib/server-documents"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"
import { getRawDoc, getStore } from "@/lib/server-documents"
import { saveSupabaseDoc, getSupabase } from "@/lib/supabase-server"
import { verifyEditToken } from "@/lib/security"
import { getExistingRoom } from "./server-realtime"
import type { SquigNode } from "./types"
import type { Look } from "./theme"

// Global in-memory version store: dbId -> (fileId -> PageVersion[])
const globalVersionStores: Record<string, Map<string, PageVersion[]>> = {}

function versionsSnapshotFile(dbId: string): string {
  return `versions_${dbId}.json`
}

function ensureVersionStoreLoaded(dbId: string): void {
  if (globalVersionStores[dbId]) return
  const saved = readJsonSnapshot<Record<string, PageVersion[]>>(versionsSnapshotFile(dbId), {})
  const fileMap = new Map<string, PageVersion[]>()
  if (saved && typeof saved === "object") {
    for (const [fileId, versions] of Object.entries(saved)) {
      if (Array.isArray(versions)) fileMap.set(fileId, versions)
    }
  }
  globalVersionStores[dbId] = fileMap
}

function persistVersionStore(dbId: string): void {
  try {
    const fileMap = globalVersionStores[dbId]
    if (!fileMap) return
    writeJsonSnapshot(versionsSnapshotFile(dbId), Object.fromEntries(fileMap.entries()))
  } catch (err) {
    console.warn(`[Versions] Failed to persist versions for ${dbId}:`, err)
  }
}

export function getVersionsForFile(dbId: string, fileId: string): PageVersion[] {
  ensureVersionStoreLoaded(dbId)
  const fileMap = globalVersionStores[dbId]
  if (!fileMap.has(fileId)) {
    fileMap.set(fileId, [])
  }
  return fileMap.get(fileId)!
}

/**
 * Permanently drop all versions for a deleted file and persist the store.
 * Safe to call when none exist.
 */
export function deleteVersionsForFile(dbId: string, fileId: string): boolean {
  ensureVersionStoreLoaded(dbId)
  const fileMap = globalVersionStores[dbId]
  if (!fileMap.has(fileId)) return false
  fileMap.delete(fileId)
  persistVersionStore(dbId)
  return true
}

/**
 * Creates a deterministic content hash/signature to prevent creating
 * duplicate versions if no meaningful nodes/properties changed.
 */
function computeDocSignature(doc: {
  name?: string
  nodes?: Record<string, unknown>
  order?: string[]
  look?: unknown
}): string {
  try {
    const keys = Object.keys(doc.nodes || {}).sort()
    const orderStr = (doc.order || []).join(",")
    const lookStr = JSON.stringify(doc.look || {})
    const nameStr = doc.name || ""
    const nodesSummary = keys
      .map((k) => {
        const n = (doc.nodes || {})[k] as Record<string, unknown>
        if (!n) return ""
        return `${k}:${n.type}:${n.x},${n.y},${n.w},${n.h}:${n.text || ""}:${n.kind || ""}`
      })
      .join("|")
    return `${nameStr}##${orderStr}##${lookStr}##${nodesSummary}`
  } catch {
    return JSON.stringify(doc)
  }
}

/**
 * Append or initialize a version for a document upon a committed save.
 */
export async function createPageVersion(
  dbId: string,
  fileId: string,
  doc: ServerStoredDoc,
  label?: string,
  createdBy?: string,
  restoredFromVersion?: number
): Promise<PageVersion> {
  const versions = getVersionsForFile(dbId, fileId)
  const currentSignature = computeDocSignature(doc)

  if (versions.length > 0 && !restoredFromVersion) {
    const latest = versions[versions.length - 1]
    const latestSignature = computeDocSignature(latest.doc)
    if (latestSignature === currentSignature) {
      // Content unchanged; return latest version without unnecessary duplicate
      return latest
    }
  }

  const nextVersionNumber = versions.length > 0 ? versions[versions.length - 1].version + 1 : 1
  const versionId = `ver_${fileId}_v${nextVersionNumber}_${Date.now()}`

  const snapshotDoc: PageVersionDoc = {
    id: doc.id,
    name: doc.name || "untitled scribbles",
    nodes: JSON.parse(JSON.stringify(doc.nodes || {})) as Record<string, SquigNode>,
    order: Array.isArray(doc.order) ? [...doc.order] : [],
    look: doc.look ? (JSON.parse(JSON.stringify(doc.look)) as Look) : undefined,
    updatedAt: doc.updatedAt || Date.now(),
    hasPassword: !!doc.passwordHash || !!doc.hasPassword,
  }

  const newVersion: PageVersion = {
    id: versionId,
    pageId: fileId,
    dbId,
    version: nextVersionNumber,
    createdAt: Date.now(),
    createdBy: createdBy || "User",
    label: label || (nextVersionNumber === 1 ? "Initial version" : "Autosave"),
    restoredFromVersion,
    doc: snapshotDoc,
  }

  versions.push(newVersion)
  persistVersionStore(dbId)

  // Persist to Supabase if connected
  if (dbId === "nezukos-box") {
    const supabase = getSupabase()
    if (supabase) {
      try {
        await supabase.from("zenithsui_versions").upsert({
          id: newVersion.id,
          page_id: fileId,
          db_id: dbId,
          version: newVersion.version,
          created_at: newVersion.createdAt,
          created_by: newVersion.createdBy,
          label: newVersion.label,
          doc: snapshotDoc,
        })
      } catch (err) {
        console.warn(`[Supabase] Version upsert error for ${fileId}:`, err)
      }
    }
  }

  return newVersion
}

/**
 * List all saved versions for a document.
 */
export async function listPageVersions(dbId: string, fileId: string): Promise<PageVersionMeta[]> {
  const versions = getVersionsForFile(dbId, fileId)

  // If no versions recorded yet, create an initial v1 from current doc if it exists
  if (versions.length === 0) {
    const raw = await getRawDoc(dbId, fileId)
    if (raw) {
      await createPageVersion(dbId, fileId, raw, "Initial version")
    }
  }

  // Also query Supabase if dbId is nezukos-box
  if (dbId === "nezukos-box") {
    const supabase = getSupabase()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("zenithsui_versions")
          .select("id, page_id, db_id, version, created_at, created_by, label, doc")
          .eq("page_id", fileId)
          .order("version", { ascending: false })

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            pageId: row.page_id || fileId,
            dbId: row.db_id || dbId,
            version: row.version,
            createdAt: typeof row.created_at === "number" ? row.created_at : Date.parse(String(row.created_at)) || Date.now(),
            createdBy: row.created_by || "User",
            label: row.label || `Version ${row.version}`,
            nodeCount: row.doc?.order?.length || Object.keys(row.doc?.nodes || {}).length || 0,
          }))
        }
      } catch (err) {
        console.warn(`[Supabase] Failed to list remote versions for ${fileId}:`, err)
      }
    }
  }

  return versions
    .map((v) => ({
      id: v.id,
      pageId: v.pageId,
      dbId: v.dbId,
      version: v.version,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      label: v.label,
      restoredFromVersion: v.restoredFromVersion,
      nodeCount: v.doc.order?.length || Object.keys(v.doc.nodes || {}).length || 0,
    }))
    .sort((a, b) => b.version - a.version)
}

/**
 * Get a specific version snapshot.
 */
export async function getPageVersion(
  dbId: string,
  fileId: string,
  versionNumberOrId: number | string
): Promise<PageVersion | null> {
  const versions = getVersionsForFile(dbId, fileId)
  const match = versions.find((v) =>
    typeof versionNumberOrId === "number" ? v.version === versionNumberOrId : v.id === versionNumberOrId
  )

  if (match) return match

  if (dbId === "nezukos-box") {
    const supabase = getSupabase()
    if (supabase) {
      try {
        let query = supabase.from("zenithsui_versions").select("*").eq("page_id", fileId)
        if (typeof versionNumberOrId === "number") {
          query = query.eq("version", versionNumberOrId)
        } else {
          query = query.eq("id", versionNumberOrId)
        }
        const { data, error } = await query.maybeSingle()
        if (!error && data) {
          return {
            id: data.id,
            pageId: data.page_id || fileId,
            dbId: data.db_id || dbId,
            version: data.version,
            createdAt: typeof data.created_at === "number" ? data.created_at : Date.parse(String(data.created_at)) || Date.now(),
            createdBy: data.created_by,
            label: data.label,
            doc: data.doc as PageVersionDoc,
          }
        }
      } catch (err) {
        console.warn(`[Supabase] Read version error for ${fileId}:`, err)
      }
    }
  }

  return null
}

/**
 * Restore a version snapshot as a brand new version (preserving all prior versions).
 * Server validates permissions, builds new version M, updates storage, and broadcasts to collaborators.
 */
export async function restorePageVersion(
  dbId: string,
  fileId: string,
  versionNumber: number,
  editToken?: string,
  createdBy?: string
): Promise<{
  success: boolean
  newVersion?: PageVersion
  restoredDoc?: ServerStoredDoc
  error?: string
}> {
  // 1. Permission check
  const rawDoc = await getRawDoc(dbId, fileId)
  if (!rawDoc) {
    return { success: false, error: "Document not found" }
  }

  if (rawDoc.hasPassword || rawDoc.passwordHash) {
    const verification = verifyEditToken(editToken || "", dbId, fileId)
    if (!verification.valid) {
      return {
        success: false,
        error: "Document is password-protected. Valid edit token required to restore.",
      }
    }
  }

  // 2. Locate target version
  const targetVersion = await getPageVersion(dbId, fileId, versionNumber)
  if (!targetVersion) {
    return { success: false, error: `Version ${versionNumber} not found` }
  }

  // 3. Construct restored document
  const restoredDoc: ServerStoredDoc = {
    id: fileId,
    name: targetVersion.doc.name,
    nodes: JSON.parse(JSON.stringify(targetVersion.doc.nodes || {})),
    order: Array.isArray(targetVersion.doc.order) ? [...targetVersion.doc.order] : [],
    look: targetVersion.doc.look ? JSON.parse(JSON.stringify(targetVersion.doc.look)) : undefined,
    updatedAt: Date.now(),
    dbId,
    hasPassword: rawDoc.hasPassword,
    passwordHash: rawDoc.passwordHash,
    passwordSalt: rawDoc.passwordSalt,
    ownerSessionId: rawDoc.ownerSessionId,
  }

  // 4. Save to Database
  if (dbId === "nezukos-box") {
    await saveSupabaseDoc(restoredDoc)
  } else {
    const store = getStore(dbId)
    store.set(fileId, restoredDoc)
  }

  // 5. Create NEW version (preserving all intermediate history)
  const newVersion = await createPageVersion(
    dbId,
    fileId,
    restoredDoc,
    `Restored from version ${versionNumber}`,
    createdBy || "User",
    versionNumber
  )

  // 6. Update active realtime room if one exists and broadcast to all connected clients
  const room = getExistingRoom(dbId, fileId)
  if (room) {
    room.doc = restoredDoc
    room.revision += 1
    // Broadcast full document sync event
    room.broadcast("restore", {
      type: "restore",
      dbId,
      fileId,
      revision: room.revision,
      version: newVersion.version,
      restoredFromVersion: versionNumber,
      doc: {
        id: restoredDoc.id,
        name: restoredDoc.name,
        nodes: restoredDoc.nodes,
        order: restoredDoc.order,
        look: restoredDoc.look,
        updatedAt: restoredDoc.updatedAt,
      },
    })
  }

  return {
    success: true,
    newVersion,
    restoredDoc,
  }
}
