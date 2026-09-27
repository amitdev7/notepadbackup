// ---------------------------------------------------------------------------
// Zenithsui — PostgreSQL BYOD Data Provider
// Direct PostgreSQL connection pooling with schema isolation (zenithsui_* tables)
// ---------------------------------------------------------------------------

import { Pool, type PoolConfig } from "pg"
import type { DataProvider } from "./provider-interface"
import type {
  ConnectionTestResult,
  SchemaDetectionResult,
  DatabaseProviderType,
  PostgresConnectionConfig,
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

export class PostgresProvider implements DataProvider {
  readonly id: string
  readonly providerType: DatabaseProviderType = "postgres"
  private pool: Pool
  private config: PostgresConnectionConfig
  private isClosed = false

  constructor(id: string, config: PostgresConnectionConfig) {
    this.id = id
    this.config = config

    const poolConfig: PoolConfig = {
      max: 5,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
    }

    if (config.connectionString && config.connectionString.trim().length > 0) {
      poolConfig.connectionString = config.connectionString
    } else {
      poolConfig.host = config.host || "localhost"
      poolConfig.port = config.port || 5432
      poolConfig.database = config.database || "postgres"
      poolConfig.user = config.user || "postgres"
      poolConfig.password = config.password || ""
    }

    if (config.ssl === true || config.ssl === "require") {
      poolConfig.ssl = { rejectUnauthorized: false }
    } else if (config.ssl === false || config.ssl === "disable") {
      poolConfig.ssl = false
    }

    this.pool = new Pool(poolConfig)
    this.pool.on("error", (err) => {
      console.warn(`[PostgresProvider:${this.id}] Unexpected pool client error:`, err.message)
    })
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now()
    try {
      const res = await this.pool.query(
        "SELECT NOW() as now, current_database() as db, current_user as usr, version() as ver;"
      )
      const latencyMs = Date.now() - start
      const dbInfo = res.rows[0] || {}

      const schemaCheck = await this.detectSchema()
      const status =
        schemaCheck.status === "initialized"
          ? "connected"
          : schemaCheck.status === "missing"
          ? "schema_missing"
          : "needs_migration"

      return {
        success: true,
        provider: "postgres",
        status,
        latencyMs,
        schemaStatus: schemaCheck.status,
        schemaVersion: schemaCheck.version,
        tablesFound: schemaCheck.tables,
        safeMetadata: {
          databaseName: dbInfo.db,
          currentUser: dbInfo.usr,
          serverVersion: dbInfo.ver ? String(dbInfo.ver).split(" ")[0] + " " + String(dbInfo.ver).split(" ")[1] : "PostgreSQL",
          tablesFound: schemaCheck.tables,
          missingTables: schemaCheck.missingTables,
        },
      }
    } catch (err: any) {
      return {
        success: false,
        provider: "postgres",
        status: "failed",
        latencyMs: Date.now() - start,
        schemaStatus: "missing",
        tablesFound: [],
        error: err.message || "Failed to connect to PostgreSQL instance",
      }
    }
  }

  async detectSchema(): Promise<SchemaDetectionResult> {
    try {
      const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = ANY($1::text[]);
      `
      const res = await this.pool.query(query, [REQUIRED_TABLES])
      const foundTables = res.rows.map((r) => r.table_name as string)
      const missingTables = REQUIRED_TABLES.filter((t) => !foundTables.includes(t))

      let version = 0
      if (foundTables.includes("zenithsui_workspaces")) {
        try {
          const migRes = await this.pool.query(
            "SELECT MAX(version) as max_v FROM zenithsui_schema_migrations;"
          )
          version = migRes.rows[0]?.max_v ? Number(migRes.rows[0].max_v) : 1
        } catch {
          version = 1
        }
      }

      if (foundTables.length === REQUIRED_TABLES.length) {
        return {
          status: "initialized",
          version,
          tables: foundTables,
          missingTables: [],
        }
      }

      if (foundTables.length > 0) {
        return {
          status: "needs_migration",
          version,
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
    } catch (err: any) {
      return {
        status: "missing",
        version: 0,
        tables: [],
        missingTables: REQUIRED_TABLES,
        error: err.message,
      }
    }
  }

  async initializeSchema(): Promise<{ success: boolean; version: number; error?: string }> {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN;")

      await client.query(`
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
        VALUES (1, 'zenithsui_core_v1', (extract(epoch from now()) * 1000)::bigint)
        ON CONFLICT (version) DO NOTHING;
      `)

      await client.query("COMMIT;")
      return { success: true, version: 1 }
    } catch (err: any) {
      await client.query("ROLLBACK;")
      return { success: false, version: 0, error: err.message }
    } finally {
      client.release()
    }
  }

  // --- Workspaces ---
  async readWorkspace(workspaceId: string): Promise<WorkspaceRecord | null> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_workspaces WHERE id = $1 LIMIT 1;",
      [workspaceId]
    )
    if (res.rows.length === 0) return null
    return res.rows[0].data as WorkspaceRecord
  }

  async writeWorkspace(workspace: WorkspaceRecord): Promise<void> {
    const query = `
      INSERT INTO zenithsui_workspaces (id, name, slug, description, owner_id, database_id, data, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        database_id = EXCLUDED.database_id,
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at;
    `
    await this.pool.query(query, [
      workspace.id,
      workspace.name,
      workspace.slug || null,
      workspace.description || null,
      workspace.ownerId,
      workspace.databaseId || this.id,
      JSON.stringify(workspace),
      workspace.createdAt,
      workspace.updatedAt,
    ])
  }

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_workspaces ORDER BY updated_at DESC;"
    )
    return res.rows.map((r) => r.data as WorkspaceRecord)
  }

  // --- Boards ---
  async listBoards(workspaceId: string): Promise<BoardRecord[]> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_boards WHERE workspace_id = $1 ORDER BY updated_at DESC;",
      [workspaceId]
    )
    return res.rows.map((r) => r.data as BoardRecord)
  }

  async readBoard(workspaceId: string, boardId: string): Promise<BoardRecord | null> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_boards WHERE id = $1 LIMIT 1;",
      [boardId]
    )
    if (res.rows.length === 0) return null
    return res.rows[0].data as BoardRecord
  }

  async writeBoard(workspaceId: string, board: BoardRecord): Promise<void> {
    const query = `
      INSERT INTO zenithsui_boards (id, workspace_id, name, data, in_trash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        name = EXCLUDED.name,
        data = EXCLUDED.data,
        in_trash = EXCLUDED.in_trash,
        updated_at = EXCLUDED.updated_at;
    `
    await this.pool.query(query, [
      board.id,
      workspaceId,
      board.name,
      JSON.stringify(board),
      !!board.inTrash,
      board.createdAt,
      board.updatedAt,
    ])
  }

  async deleteBoard(workspaceId: string, boardId: string): Promise<void> {
    await this.pool.query("DELETE FROM zenithsui_boards WHERE id = $1;", [boardId])
  }

  // --- Documents ---
  async listDocuments(dbId: string): Promise<ServerFileMeta[]> {
    const res = await this.pool.query(
      "SELECT id, name, updated_at, has_password FROM zenithsui_files WHERE db_id = $1 ORDER BY updated_at DESC;",
      [dbId]
    )
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      updatedAt: Number(r.updated_at),
      dbId,
      hasPassword: !!r.has_password,
    }))
  }

  async readDocument(dbId: string, fileId: string): Promise<ServerStoredDoc | null> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_files WHERE id = $1 LIMIT 1;",
      [fileId]
    )
    if (res.rows.length === 0) return null
    return res.rows[0].data as ServerStoredDoc
  }

  async writeDocument(dbId: string, doc: ServerStoredDoc): Promise<void> {
    const query = `
      INSERT INTO zenithsui_files (id, db_id, name, data, has_password, password_hash, password_salt, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        db_id = EXCLUDED.db_id,
        name = EXCLUDED.name,
        data = EXCLUDED.data,
        has_password = EXCLUDED.has_password,
        password_hash = EXCLUDED.password_hash,
        password_salt = EXCLUDED.password_salt,
        updated_at = EXCLUDED.updated_at;
    `
    await this.pool.query(query, [
      doc.id,
      dbId,
      doc.name,
      JSON.stringify(doc),
      !!doc.hasPassword || !!doc.passwordHash,
      doc.passwordHash || null,
      doc.passwordSalt || null,
      Date.now(),
      doc.updatedAt || Date.now(),
    ])
  }

  async deleteDocument(dbId: string, fileId: string): Promise<void> {
    await this.pool.query("DELETE FROM zenithsui_files WHERE id = $1;", [fileId])
  }

  // --- Shares ---
  async readShare(dbId: string, fileId: string): Promise<PageShare | null> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_shares WHERE db_id = $1 AND file_id = $2 LIMIT 1;",
      [dbId, fileId]
    )
    if (res.rows.length === 0) return null
    return res.rows[0].data as PageShare
  }

  async readShareByPublicId(publicId: string): Promise<PageShare | null> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_shares WHERE public_id = $1 LIMIT 1;",
      [publicId]
    )
    if (res.rows.length === 0) return null
    return res.rows[0].data as PageShare
  }

  async writeShare(share: PageShare): Promise<void> {
    const query = `
      INSERT INTO zenithsui_shares (id, public_id, db_id, file_id, mode, enabled, data, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        public_id = EXCLUDED.public_id,
        db_id = EXCLUDED.db_id,
        file_id = EXCLUDED.file_id,
        mode = EXCLUDED.mode,
        enabled = EXCLUDED.enabled,
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at;
    `
    await this.pool.query(query, [
      share.id,
      share.publicId,
      share.dbId,
      share.fileId,
      share.mode,
      share.enabled,
      JSON.stringify(share),
      share.createdAt,
      share.updatedAt,
    ])
  }

  async deleteShare(dbId: string, fileId: string): Promise<void> {
    await this.pool.query("DELETE FROM zenithsui_shares WHERE db_id = $1 AND file_id = $2;", [
      dbId,
      fileId,
    ])
  }

  // --- Version History ---
  async listVersions(dbId: string, fileId: string): Promise<PageVersionMeta[]> {
    const res = await this.pool.query(
      "SELECT id, db_id, file_id, version, created_at, data FROM zenithsui_versions WHERE db_id = $1 AND file_id = $2 ORDER BY version DESC;",
      [dbId, fileId]
    )
    return res.rows.map((r) => {
      const vDoc = (r.data as PageVersion)?.doc
      return {
        id: r.id,
        pageId: r.file_id,
        dbId: r.db_id,
        version: r.version,
        createdAt: Number(r.created_at),
        nodeCount: Object.keys(vDoc?.nodes || {}).length,
      }
    })
  }

  async readVersion(dbId: string, fileId: string, versionNumber: number): Promise<PageVersion | null> {
    const res = await this.pool.query(
      "SELECT data FROM zenithsui_versions WHERE db_id = $1 AND file_id = $2 AND version = $3 LIMIT 1;",
      [dbId, fileId, versionNumber]
    )
    if (res.rows.length === 0) return null
    return res.rows[0].data as PageVersion
  }

  async writeVersion(version: PageVersion): Promise<void> {
    const query = `
      INSERT INTO zenithsui_versions (id, db_id, file_id, version, data, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data;
    `
    await this.pool.query(query, [
      version.id,
      version.dbId,
      version.pageId,
      version.version,
      JSON.stringify(version),
      version.createdAt,
    ])
  }

  async close(): Promise<void> {
    if (!this.isClosed) {
      this.isClosed = true
      try {
        await this.pool.end()
      } catch (err) {
        console.warn(`[PostgresProvider:${this.id}] Error closing pool:`, err)
      }
    }
  }
}
