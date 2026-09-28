// ---------------------------------------------------------------------------
// Zenithsui — Connected Databases / Bring Your Own Database (BYOD) Types
// ---------------------------------------------------------------------------

export type DatabaseProviderType = "zenithsui-cloud" | "supabase" | "postgres"

export type DatabaseConnectionStatus =
  | "connected"
  | "failed"
  | "untested"
  | "schema_missing"
  | "needs_migration"
  | "offline"

export interface SupabaseConnectionConfig {
  supabaseUrl: string
  supabaseKey: string // Anon or Service Role key
  schema?: string // optional custom schema, defaults to public
}

export interface PostgresConnectionConfig {
  host?: string
  port?: number
  database?: string
  user?: string
  password?: string
  ssl?: boolean | "require" | "disable"
  connectionString?: string
  schema?: string // optional schema/namespace
}

export type DatabaseCredentials =
  | ({ provider: "supabase" } & SupabaseConnectionConfig)
  | ({ provider: "postgres" } & PostgresConnectionConfig)
  | ({ provider: "zenithsui-cloud" })

export interface ConnectedDatabaseRecord {
  id: string
  ownerUserId: string
  provider: DatabaseProviderType
  displayName: string
  description?: string
  status: DatabaseConnectionStatus
  encryptedCredentials?: string // Encrypted AES-256-GCM string (server-side only)
  configurationMetadata: {
    host?: string
    port?: number
    databaseName?: string
    username?: string
    supabaseUrl?: string
    schemaVersion?: number
    tablesCount?: number
    lastLatencyMs?: number
    sslMode?: string
    tablesFound?: string[]
    [key: string]: unknown
  }
  assignedWorkspaceIds: string[]
  isDefault?: boolean
  createdAt: number
  updatedAt: number
  lastTestedAt?: number
  lastError?: string
}

/**
 * Client-safe connected database summary (NEVER contains encryptedCredentials or raw secrets)
 */
export interface ClientConnectedDatabase {
  id: string
  ownerUserId: string
  provider: DatabaseProviderType
  displayName: string
  description?: string
  status: DatabaseConnectionStatus
  hasCredentials: boolean
  maskedCredentials?: Record<string, unknown>
  configurationMetadata: {
    host?: string
    port?: number
    databaseName?: string
    username?: string
    supabaseUrl?: string
    schemaVersion?: number
    tablesCount?: number
    lastLatencyMs?: number
    sslMode?: string
    tablesFound?: string[]
    [key: string]: unknown
  }
  assignedWorkspaceIds: string[]
  assignedWorkspaceNames?: string[]
  isDefault?: boolean
  createdAt: number
  updatedAt: number
  lastTestedAt?: number
  lastError?: string
}

export interface ConnectionTestResult {
  success: boolean
  provider: DatabaseProviderType
  status: DatabaseConnectionStatus
  latencyMs?: number
  schemaStatus: "missing" | "initialized" | "needs_migration" | "incompatible"
  schemaVersion?: number
  tablesFound: string[]
  error?: string
  safeMetadata?: Record<string, unknown>
}

export interface SchemaDetectionResult {
  status: "missing" | "initialized" | "needs_migration" | "incompatible"
  version?: number
  tables: string[]
  missingTables?: string[]
  error?: string
}

export interface MigrationCounts {
  boards: number
  documents: number
  nodes: number
  favorites: number
  trash: number
  shares: number
}

export interface WorkspaceMigrationResult {
  success: boolean
  workspaceId: string
  workspaceName: string
  sourceDatabaseId: string
  targetDatabaseId: string
  migratedAt: number
  counts: MigrationCounts
  verified: boolean
  error?: string
}
