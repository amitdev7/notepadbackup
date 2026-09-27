// ---------------------------------------------------------------------------
// Zenithsui — Supabase BYOD Data Provider
// Connects to external Supabase projects via @supabase/supabase-js
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { DataProvider } from "./provider-interface"
import type {
  ConnectionTestResult,
  SchemaDetectionResult,
  DatabaseProviderType,
  SupabaseConnectionConfig,
} from "@/lib/database-types"
import type { WorkspaceRecord, BoardRecord } from "@/lib/workspace-types"
import type { ServerStoredDoc, ServerFileMeta } from "@/lib/server-documents"
import type { PageShare } from "@/lib/server-share"
import type { PageVersion, PageVersionMeta } from "@/lib/version-types"

const REQUIRED_TABLES = [
  "zenithsui_workspaces",
  "zenithsui_boards",
  "zenithsui_files",
  "zenithsui_shares",
  "zenithsui_versions",
]

export class SupabaseProvider implements DataProvider {
  readonly id: string
  readonly providerType: DatabaseProviderType = "supabase"
  private client: SupabaseClient
  private config: SupabaseConnectionConfig
  private localFallback = new Map<string, any>()

  constructor(id: string, config: SupabaseConnectionConfig) {
    this.id = id
    this.config = config
    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      // Test basic REST connectivity
      const response = await fetch(`${this.config.supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: this.config.supabaseKey,
          Authorization: `Bearer ${this.config.supabaseKey}`,
        },
      })

      const latencyMs = Date.now() - start

      if (!response.ok && response.status !== 404) {
        // 401 / 403 / 500
        return {
          success: false,
          provider: "supabase",
          status: "failed",
          latencyMs,
          schemaStatus: "missing",
          tablesFound: [],
          error: `HTTP ${response.status}: Failed to authenticate with Supabase URL and Key`,
        }
      }

      // Check schema status
      const schemaCheck = await this.detectSchema()
      const status =
        schemaCheck.status === "initialized"
          ? "connected"
          : schemaCheck.status === "missing"
          ? "schema_missing"
          : "needs_migration"

      return {
        success: true,
        provider: "supabase",
        status,
        latencyMs,
        schemaStatus: schemaCheck.status,
        schemaVersion: schemaCheck.version,
        tablesFound: schemaCheck.tables,
        safeMetadata: {
          supabaseUrl: this.config.supabaseUrl,
          tablesFound: schemaCheck.tables,
          missingTables: schemaCheck.missingTables,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: "supabase",
        status: "failed",
        latencyMs: Date.now() - start,
        schemaStatus: "missing",
        tablesFound: [],
        error: err.message || "Failed to reach Supabase endpoint",
      }
    }
  }

  async detectSchema(): Promise<SchemaDetectionResult> {
    const foundTables: string[] = []
    const missingTables: string[] = []

    for (const table of REQUIRED_TABLES) {
      try {
        const { error } = await this.client.from(table).select("*", { count: "exact", head: true })
        if (!error) {
          foundTables.push(table)
        } else {
          // If table does not exist (PGRST205 or similar PostgREST relation missing code)
          missingTables.push(table)
        }
      } catch {
        missingTables.push(table)
      }
    }

    if (foundTables.length === REQUIRED_TABLES.length) {
      return {
        status: "initialized",
        version: 1,
        tables: foundTables,
        missingTables: [],
      }
    }

    if (foundTables.length > 0) {
      return {
        status: "needs_migration",
        version: 0,
        tables: foundTables,
        missingTables,
      }
    }

    return {
      status: "missing",
      version: 0,
      tables: [],
      missingTables: REQUIRED_TABLES,
    }
  }

  async initializeSchema(): Promise<{ success: boolean; version: number; error?: string }> {
    // Generate the standard SQL DDL required for Supabase
    const ddl = `
      -- Zenithsui Schema Migration v1 for Supabase
      CREATE TABLE IF NOT EXISTS zenithsui_schema_migrations (
        version INT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS zenithsui_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        description TEXT,
        owner_id TEXT,
        database_id TEXT,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS zenithsui_boards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        in_trash BOOLEAN DEFAULT false,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_zenithsui_boards_ws ON zenithsui_boards(workspace_id);

      CREATE TABLE IF NOT EXISTS zenithsui_files (
        id TEXT PRIMARY KEY,
        db_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        has_password BOOLEAN DEFAULT false,
        password_hash TEXT,
        password_salt TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_zenithsui_files_db ON zenithsui_files(db_id);

      CREATE TABLE IF NOT EXISTS zenithsui_shares (
        id TEXT PRIMARY KEY,
        public_id TEXT UNIQUE NOT NULL,
        db_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_zenithsui_shares_public ON zenithsui_shares(public_id);

      CREATE TABLE IF NOT EXISTS zenithsui_versions (
        id TEXT PRIMARY KEY,
        db_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        version INT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_zenithsui_versions_file ON zenithsui_versions(db_id, file_id);

      INSERT INTO zenithsui_schema_migrations (version, name, applied_at)
      VALUES (1, 'zenithsui_core_v1', extract(epoch from now())::bigint * 1000)
      ON CONFLICT (version) DO NOTHING;
    `

    // Attempt to invoke rpc or direct SQL if extensions are installed
    try {
      const { error } = await this.client.rpc("exec_sql", { query: ddl })
      if (!error) {
        return { success: true, version: 1 }
      }
    } catch {
      // ignore
    }

    // Check if tables already exist or if local fallback should be primed
    const check = await this.detectSchema()
    if (check.status === "initialized") {
      return { success: true, version: 1 }
    }

    // Return friendly instruction containing SQL if Supabase project requires pasting into SQL Editor
    return {
      success: false,
      version: 0,
      error:
        "Please run the Zenithsui setup SQL script in your Supabase SQL Editor to create the zenithsui_* tables.",
    }
  }

  // --- Workspaces ---
  async readWorkspace(workspaceId: string): Promise<WorkspaceRecord | null> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_workspaces")
        .select("data")
        .eq("id", workspaceId)
        .single()

      if (!error && data?.data) {
        return data.data as WorkspaceRecord
      }
    } catch {
      // fallback
    }
    return this.localFallback.get(`ws:${workspaceId}`) || null
  }

  async writeWorkspace(workspace: WorkspaceRecord): Promise<void> {
    this.localFallback.set(`ws:${workspace.id}`, workspace)
    try {
      await this.client.from("zenithsui_workspaces").upsert({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        owner_id: workspace.ownerId,
        database_id: workspace.databaseId,
        data: workspace,
        created_at: workspace.createdAt,
        updated_at: workspace.updatedAt,
      })
    } catch (err) {
      console.warn("[SupabaseProvider] Write workspace failed, kept in cache:", err)
    }
  }

  // --- Boards ---
  async listBoards(workspaceId: string): Promise<BoardRecord[]> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_boards")
        .select("data")
        .eq("workspace_id", workspaceId)

      if (!error && data && data.length > 0) {
        return data.map((row) => row.data as BoardRecord)
      }
    } catch {
      // fallback
    }

    const fallbackList: BoardRecord[] = []
    for (const [k, v] of this.localFallback.entries()) {
      if (k.startsWith(`board:${workspaceId}:`)) {
        fallbackList.push(v)
      }
    }
    return fallbackList
  }

  async readBoard(workspaceId: string, boardId: string): Promise<BoardRecord | null> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_boards")
        .select("data")
        .eq("id", boardId)
        .single()

      if (!error && data?.data) {
        return data.data as BoardRecord
      }
    } catch {
      // fallback
    }
    return this.localFallback.get(`board:${workspaceId}:${boardId}`) || null
  }

  async writeBoard(workspaceId: string, board: BoardRecord): Promise<void> {
    this.localFallback.set(`board:${workspaceId}:${board.id}`, board)
    try {
      await this.client.from("zenithsui_boards").upsert({
        id: board.id,
        workspace_id: workspaceId,
        name: board.name,
        data: board,
        in_trash: !!board.inTrash,
        created_at: board.createdAt,
        updated_at: board.updatedAt,
      })
    } catch (err) {
      console.warn("[SupabaseProvider] Write board failed, kept in cache:", err)
    }
  }

  async deleteBoard(workspaceId: string, boardId: string): Promise<void> {
    this.localFallback.delete(`board:${workspaceId}:${boardId}`)
    try {
      await this.client.from("zenithsui_boards").delete().eq("id", boardId)
    } catch (err) {
      console.warn("[SupabaseProvider] Delete board failed:", err)
    }
  }

  // --- Documents ---
  async listDocuments(dbId: string): Promise<ServerFileMeta[]> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_files")
        .select("id, name, updated_at, has_password")
        .eq("db_id", dbId)

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          updatedAt: Number(row.updated_at),
          dbId,
          hasPassword: !!row.has_password,
        }))
      }
    } catch {
      // fallback
    }
    return []
  }

  async readDocument(dbId: string, fileId: string): Promise<ServerStoredDoc | null> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_files")
        .select("data")
        .eq("id", fileId)
        .single()

      if (!error && data?.data) {
        return data.data as ServerStoredDoc
      }
    } catch {
      // fallback
    }
    return this.localFallback.get(`file:${dbId}:${fileId}`) || null
  }

  async writeDocument(dbId: string, doc: ServerStoredDoc): Promise<void> {
    this.localFallback.set(`file:${dbId}:${doc.id}`, doc)
    try {
      await this.client.from("zenithsui_files").upsert({
        id: doc.id,
        db_id: dbId,
        name: doc.name,
        data: doc,
        has_password: !!doc.hasPassword || !!doc.passwordHash,
        password_hash: doc.passwordHash || null,
        password_salt: doc.passwordSalt || null,
        created_at: Date.now(),
        updated_at: doc.updatedAt || Date.now(),
      })
    } catch (err) {
      console.warn("[SupabaseProvider] Write document failed, kept in cache:", err)
    }
  }

  async deleteDocument(dbId: string, fileId: string): Promise<void> {
    this.localFallback.delete(`file:${dbId}:${fileId}`)
    try {
      await this.client.from("zenithsui_files").delete().eq("id", fileId)
    } catch (err) {
      console.warn("[SupabaseProvider] Delete document failed:", err)
    }
  }

  // --- Shares ---
  async readShare(dbId: string, fileId: string): Promise<PageShare | null> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_shares")
        .select("data")
        .eq("db_id", dbId)
        .eq("file_id", fileId)
        .single()

      if (!error && data?.data) {
        return data.data as PageShare
      }
    } catch {
      // fallback
    }
    return this.localFallback.get(`share:${dbId}:${fileId}`) || null
  }

  async readShareByPublicId(publicId: string): Promise<PageShare | null> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_shares")
        .select("data")
        .eq("public_id", publicId)
        .single()

      if (!error && data?.data) {
        return data.data as PageShare
      }
    } catch {
      // fallback
    }

    for (const [, v] of this.localFallback.entries()) {
      if (v?.publicId === publicId) {
        return v as PageShare
      }
    }
    return null
  }

  async writeShare(share: PageShare): Promise<void> {
    this.localFallback.set(`share:${share.dbId}:${share.fileId}`, share)
    try {
      await this.client.from("zenithsui_shares").upsert({
        id: share.id,
        public_id: share.publicId,
        db_id: share.dbId,
        file_id: share.fileId,
        mode: share.mode,
        enabled: share.enabled,
        data: share,
        created_at: share.createdAt,
        updated_at: share.updatedAt,
      })
    } catch (err) {
      console.warn("[SupabaseProvider] Write share failed, kept in cache:", err)
    }
  }

  async deleteShare(dbId: string, fileId: string): Promise<void> {
    this.localFallback.delete(`share:${dbId}:${fileId}`)
    try {
      await this.client
        .from("zenithsui_shares")
        .delete()
        .eq("db_id", dbId)
        .eq("file_id", fileId)
    } catch (err) {
      console.warn("[SupabaseProvider] Delete share failed:", err)
    }
  }

  // --- Version History ---
  async listVersions(dbId: string, fileId: string): Promise<PageVersionMeta[]> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_versions")
        .select("id, file_id, db_id, version, created_at, data")
        .eq("db_id", dbId)
        .eq("file_id", fileId)
        .order("version", { ascending: false })

      if (!error && data) {
        return data.map((row) => {
          const vDoc = (row.data as PageVersion)?.doc
          return {
            id: row.id,
            pageId: row.file_id,
            dbId: row.db_id,
            version: row.version,
            createdAt: Number(row.created_at),
            nodeCount: Object.keys(vDoc?.nodes || {}).length,
          }
        })
      }
    } catch {
      // fallback
    }
    return []
  }

  async readVersion(dbId: string, fileId: string, versionNumber: number): Promise<PageVersion | null> {
    try {
      const { data, error } = await this.client
        .from("zenithsui_versions")
        .select("data")
        .eq("db_id", dbId)
        .eq("file_id", fileId)
        .eq("version", versionNumber)
        .single()

      if (!error && data?.data) {
        return data.data as PageVersion
      }
    } catch {
      // fallback
    }
    return null
  }

  async writeVersion(version: PageVersion): Promise<void> {
    try {
      await this.client.from("zenithsui_versions").upsert({
        id: version.id,
        db_id: version.dbId,
        file_id: version.pageId,
        version: version.version,
        data: version,
        created_at: version.createdAt,
      })
    } catch (err) {
      console.warn("[SupabaseProvider] Write version failed:", err)
    }
  }

  async close(): Promise<void> {
    // Supabase JS client doesn't hold open persistent socket unless realtime is subscribed
  }
}
