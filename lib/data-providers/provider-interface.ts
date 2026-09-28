// ---------------------------------------------------------------------------
// Zenithsui — Data Provider Interface
// Abstract contract for Zenithsui Cloud, Supabase, and PostgreSQL storage engines
// ---------------------------------------------------------------------------

import type {
  DatabaseProviderType,
  ConnectionTestResult,
  SchemaDetectionResult,
} from "@/lib/database-types"
import type { WorkspaceRecord, BoardRecord } from "@/lib/workspace-types"
import type { ServerStoredDoc, ServerFileMeta } from "@/lib/server-documents"
import type { PageShare } from "@/lib/server-share"
import type { PageVersion, PageVersionMeta } from "@/lib/version-types"

export interface DataProvider {
  readonly id: string
  readonly providerType: DatabaseProviderType

  /**
   * Test network connection and measure latency
   */
  testConnection(): Promise<ConnectionTestResult>

  /**
   * Detect whether zenithsui_* tables exist and their migration version
   */
  detectSchema(): Promise<SchemaDetectionResult>

  /**
   * Safely create/update the Zenithsui schema without dropping user tables
   */
  initializeSchema(): Promise<{ success: boolean; version: number; error?: string }>

  // --- Workspaces ---
  readWorkspace(workspaceId: string): Promise<WorkspaceRecord | null>
  writeWorkspace(workspace: WorkspaceRecord): Promise<void>
  listWorkspaces?(userId?: string): Promise<WorkspaceRecord[]>

  // --- Boards ---
  listBoards(workspaceId: string): Promise<BoardRecord[]>
  readBoard(workspaceId: string, boardId: string): Promise<BoardRecord | null>
  writeBoard(workspaceId: string, board: BoardRecord): Promise<void>
  deleteBoard(workspaceId: string, boardId: string): Promise<void>

  // --- Shared Document Files ---
  listDocuments(dbId: string): Promise<ServerFileMeta[]>
  readDocument(dbId: string, fileId: string): Promise<ServerStoredDoc | null>
  writeDocument(dbId: string, doc: ServerStoredDoc): Promise<void>
  deleteDocument(dbId: string, fileId: string): Promise<void>

  // --- Shares ---
  readShare(dbId: string, fileId: string): Promise<PageShare | null>
  readShareByPublicId(publicId: string): Promise<PageShare | null>
  writeShare(share: PageShare): Promise<void>
  deleteShare(dbId: string, fileId: string): Promise<void>

  // --- Version History ---
  listVersions(dbId: string, fileId: string): Promise<PageVersionMeta[]>
  readVersion(dbId: string, fileId: string, versionNumber: number): Promise<PageVersion | null>
  writeVersion(version: PageVersion): Promise<void>

  // --- Graceful Teardown ---
  close(): Promise<void>
}
