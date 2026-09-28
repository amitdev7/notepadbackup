// ---------------------------------------------------------------------------
// Zenithsui — Cloud / Local Storage Provider
// Standard built-in snapshot storage engine
// ---------------------------------------------------------------------------

import type { DataProvider } from "./provider-interface"
import type {
  ConnectionTestResult,
  SchemaDetectionResult,
  DatabaseProviderType,
} from "@/lib/database-types"
import type { WorkspaceRecord, BoardRecord } from "@/lib/workspace-types"
import type { ServerStoredDoc, ServerFileMeta } from "@/lib/server-documents"
import { getStore, getRawDoc, persistDbFiles } from "@/lib/server-documents"
import type { PageShare } from "@/lib/server-share"
import type { PageVersion, PageVersionMeta } from "@/lib/version-types"
import { getVersionsForFile } from "@/lib/server-versions"
import { readJsonSnapshot, writeJsonSnapshot } from "@/lib/server-storage"

export class ZenithsuiCloudProvider implements DataProvider {
  readonly id: string
  readonly providerType: DatabaseProviderType = "zenithsui-cloud"

  constructor(id = "zenithsui-cloud") {
    this.id = id
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now()
    return {
      success: true,
      provider: "zenithsui-cloud",
      status: "connected",
      latencyMs: Date.now() - start + 1,
      schemaStatus: "initialized",
      schemaVersion: 1,
      tablesFound: [
        "zenithsui_workspaces",
        "zenithsui_boards",
        "zenithsui_files",
        "zenithsui_shares",
        "zenithsui_versions",
      ],
      safeMetadata: {
        engine: "Zenithsui Cloud Native Snapshot Store",
        status: "operational",
      },
    }
  }

  async detectSchema(): Promise<SchemaDetectionResult> {
    return {
      status: "initialized",
      version: 1,
      tables: [
        "zenithsui_workspaces",
        "zenithsui_boards",
        "zenithsui_files",
        "zenithsui_shares",
        "zenithsui_versions",
      ],
    }
  }

  async initializeSchema(): Promise<{ success: boolean; version: number; error?: string }> {
    return { success: true, version: 1 }
  }

  // Workspaces
  async readWorkspace(workspaceId: string): Promise<WorkspaceRecord | null> {
    const list = readJsonSnapshot<WorkspaceRecord[]>("workspaces.json", [])
    return list.find((w) => w.id === workspaceId) || null
  }

  async writeWorkspace(workspace: WorkspaceRecord): Promise<void> {
    const list = readJsonSnapshot<WorkspaceRecord[]>("workspaces.json", [])
    const idx = list.findIndex((w) => w.id === workspace.id)
    if (idx >= 0) {
      list[idx] = workspace
    } else {
      list.push(workspace)
    }
    writeJsonSnapshot("workspaces.json", list)
  }

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    return readJsonSnapshot<WorkspaceRecord[]>("workspaces.json", [])
  }

  // Boards
  async listBoards(workspaceId: string): Promise<BoardRecord[]> {
    const list = readJsonSnapshot<BoardRecord[]>(`ws_boards_${workspaceId}.json`, [])
    return list
  }

  async readBoard(workspaceId: string, boardId: string): Promise<BoardRecord | null> {
    const list = readJsonSnapshot<BoardRecord[]>(`ws_boards_${workspaceId}.json`, [])
    return list.find((b) => b.id === boardId) || null
  }

  async writeBoard(workspaceId: string, board: BoardRecord): Promise<void> {
    const list = readJsonSnapshot<BoardRecord[]>(`ws_boards_${workspaceId}.json`, [])
    const idx = list.findIndex((b) => b.id === board.id)
    if (idx >= 0) {
      list[idx] = board
    } else {
      list.push(board)
    }
    writeJsonSnapshot(`ws_boards_${workspaceId}.json`, list)
  }

  async deleteBoard(workspaceId: string, boardId: string): Promise<void> {
    const list = readJsonSnapshot<BoardRecord[]>(`ws_boards_${workspaceId}.json`, [])
    const filtered = list.filter((b) => b.id !== boardId)
    writeJsonSnapshot(`ws_boards_${workspaceId}.json`, filtered)
  }

  // Documents
  async listDocuments(dbId: string): Promise<ServerFileMeta[]> {
    const store = getStore(dbId)
    return Array.from(store.values()).map((doc) => ({
      id: doc.id,
      name: doc.name,
      updatedAt: doc.updatedAt,
      dbId,
      hasPassword: !!doc.passwordHash || !!doc.hasPassword,
    }))
  }

  async readDocument(dbId: string, fileId: string): Promise<ServerStoredDoc | null> {
    return getRawDoc(dbId, fileId)
  }

  async writeDocument(dbId: string, doc: ServerStoredDoc): Promise<void> {
    const store = getStore(dbId)
    store.set(doc.id, doc)
    persistDbFiles(dbId)
  }

  async deleteDocument(dbId: string, fileId: string): Promise<void> {
    const store = getStore(dbId)
    store.delete(fileId)
    persistDbFiles(dbId)
  }

  // Shares
  async readShare(dbId: string, fileId: string): Promise<PageShare | null> {
    const shares = readJsonSnapshot<PageShare[]>("shares.json", [])
    return shares.find((s) => s.dbId === dbId && s.fileId === fileId) || null
  }

  async readShareByPublicId(publicId: string): Promise<PageShare | null> {
    const shares = readJsonSnapshot<PageShare[]>("shares.json", [])
    return shares.find((s) => s.publicId === publicId) || null
  }

  async writeShare(share: PageShare): Promise<void> {
    const shares = readJsonSnapshot<PageShare[]>("shares.json", [])
    const idx = shares.findIndex((s) => s.id === share.id || (s.dbId === share.dbId && s.fileId === share.fileId))
    if (idx >= 0) {
      shares[idx] = share
    } else {
      shares.push(share)
    }
    writeJsonSnapshot("shares.json", shares)
  }

  async deleteShare(dbId: string, fileId: string): Promise<void> {
    const shares = readJsonSnapshot<PageShare[]>("shares.json", [])
    const filtered = shares.filter((s) => !(s.dbId === dbId && s.fileId === fileId))
    writeJsonSnapshot("shares.json", filtered)
  }

  // Version History
  async listVersions(dbId: string, fileId: string): Promise<PageVersionMeta[]> {
    const versions = getVersionsForFile(dbId, fileId)
    return versions.map((v) => ({
      id: v.id,
      pageId: v.pageId,
      dbId: v.dbId,
      version: v.version,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      label: v.label,
      reason: v.reason,
      restoredFromVersion: v.restoredFromVersion,
      nodeCount: Object.keys(v.doc.nodes || {}).length,
    }))
  }

  async readVersion(dbId: string, fileId: string, versionNumber: number): Promise<PageVersion | null> {
    const versions = getVersionsForFile(dbId, fileId)
    return versions.find((v) => v.version === versionNumber) || null
  }

  async writeVersion(version: PageVersion): Promise<void> {
    const versions = getVersionsForFile(version.dbId, version.pageId)
    const idx = versions.findIndex((v) => v.id === version.id)
    if (idx >= 0) {
      versions[idx] = version
    } else {
      versions.unshift(version)
    }
    // Persist via the same snapshot file used by lib/server-versions so versions survive restarts
    // (persistVersionStore there is module-private; getVersionsForFile returns the live store reference)
    try {
      const key = `versions_${version.dbId}.json`
      const saved = readJsonSnapshot<Record<string, PageVersion[]>>(key, {})
      saved[version.pageId] = versions
      writeJsonSnapshot(key, saved)
    } catch (err) {
      console.warn(`[ZenithsuiCloudProvider] Failed to persist version for ${version.pageId}:`, err)
    }
  }

  async close(): Promise<void> {
    // No-op for cloud snapshot store
  }
}
