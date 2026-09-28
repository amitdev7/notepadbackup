// ---------------------------------------------------------------------------
// Zenithsui — Server-Side Connected Databases Manager (BYOD)
// Secure registry, connection testing, schema provisioning, and migration engine
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"
import { encryptCredentials, decryptCredentials, maskSensitiveCredentials } from "./database-crypto"
import type {
  ConnectedDatabaseRecord,
  ClientConnectedDatabase,
  ConnectionTestResult,
  DatabaseProviderType,
  WorkspaceMigrationResult,
  MigrationCounts,
  SupabaseConnectionConfig,
  PostgresConnectionConfig,
} from "./database-types"
import { SupabaseProvider } from "./data-providers/supabase-provider"
import { PostgresProvider } from "./data-providers/postgres-provider"
import { ZenithsuiCloudProvider } from "./data-providers/zenithsui-cloud-provider"
import {
  getProviderForDatabase,
  invalidateProvider,
} from "./data-providers/registry"
import {
  getAllWorkspaces,
  saveWorkspaceRecord,
  getBoardsForWorkspace,
} from "./server-workspaces"

const DB_SNAPSHOT_FILE = "connected_databases.json"
const registry = new Map<string, ConnectedDatabaseRecord>()
let isHydrated = false

function hydrate() {
  if (isHydrated) return
  isHydrated = true

  const saved = readJsonSnapshot<ConnectedDatabaseRecord[]>(DB_SNAPSHOT_FILE, [])
  if (saved && saved.length > 0) {
    for (const r of saved) {
      registry.set(r.id, r)
    }
  }

  // Seed default Zenithsui Cloud database if missing
  if (!registry.has("zenithsui-cloud") && !registry.has("primary-db")) {
    const cloudDb: ConnectedDatabaseRecord = {
      id: "zenithsui-cloud",
      ownerUserId: "system",
      provider: "zenithsui-cloud",
      displayName: "Zenithsui Community Cloud",
      description: "Default fast cloud storage for collaborative wireframes and scratchpads.",
      status: "connected",
      configurationMetadata: {
        engine: "Zenithsui Native Cloud Store",
        schemaVersion: 1,
        tablesCount: 5,
        status: "operational",
      },
      assignedWorkspaceIds: ["personal-workspace"],
      isDefault: true,
      createdAt: Date.now() - 30 * 86400000,
      updatedAt: Date.now(),
      lastTestedAt: Date.now(),
    }
    registry.set("zenithsui-cloud", cloudDb)
  }

  // Seed Nezuko's Box (Supabase preset) if missing
  if (!registry.has("nezukos-box")) {
    const nezukoDb: ConnectedDatabaseRecord = {
      id: "nezukos-box",
      ownerUserId: "system",
      provider: "supabase",
      displayName: "Nezuko's Box (Supabase)",
      description: "Pre-configured Supabase project with real-time sync and asset store.",
      status: "connected",
      configurationMetadata: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
        schemaVersion: 1,
        tablesCount: 5,
        status: "operational",
      },
      assignedWorkspaceIds: [],
      isDefault: false,
      createdAt: Date.now() - 14 * 86400000,
      updatedAt: Date.now(),
      lastTestedAt: Date.now(),
    }
    registry.set("nezukos-box", nezukoDb)
  }

  persist()
}

export function persist(): void {
  try {
    writeJsonSnapshot(DB_SNAPSHOT_FILE, Array.from(registry.values()))
  } catch (err) {
    console.warn("[ConnectedDatabases] Failed to persist databases snapshot:", err)
  }
}

export function getConnectedDatabaseRecord(id: string): ConnectedDatabaseRecord | null {
  hydrate()
  return registry.get(id) || null
}

/**
 * List all connected databases for the user, safely stripping credentials
 */
export async function listConnectedDatabases(
  _userId?: string
): Promise<ClientConnectedDatabase[]> {
  hydrate()
  const workspaces = getAllWorkspaces()
  const wsMap = new Map<string, string>()
  for (const ws of workspaces) {
    wsMap.set(ws.id, ws.name)
  }

  const results: ClientConnectedDatabase[] = []

  for (const record of registry.values()) {
    let maskedCreds: Record<string, unknown> | undefined = undefined

    if (record.encryptedCredentials) {
      try {
        const raw = decryptCredentials<Record<string, unknown>>(record.encryptedCredentials)
        maskedCreds = maskSensitiveCredentials(record.provider, raw)
      } catch {
        // ignore decryption error during listing
      }
    }

    const assignedNames = record.assignedWorkspaceIds
      .map((id) => wsMap.get(id) || id)
      .filter(Boolean)

    results.push({
      id: record.id,
      ownerUserId: record.ownerUserId,
      provider: record.provider,
      displayName: record.displayName,
      description: record.description,
      status: record.status,
      hasCredentials: !!record.encryptedCredentials,
      maskedCredentials: maskedCreds,
      configurationMetadata: record.configurationMetadata,
      assignedWorkspaceIds: record.assignedWorkspaceIds,
      assignedWorkspaceNames: assignedNames,
      isDefault: record.isDefault,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastTestedAt: record.lastTestedAt,
      lastError: record.lastError,
    })
  }

  return results.sort((a, b) => {
    if (a.isDefault) return -1
    if (b.isDefault) return 1
    return b.updatedAt - a.updatedAt
  })
}

export function listConnectedDatabasesServer(): ConnectedDatabaseRecord[] {
  hydrate()
  return Array.from(registry.values())
}

/**
 * Connect or update an external database (Supabase or PostgreSQL)
 */
export async function saveConnectedDatabase(params: {
  id?: string
  ownerUserId: string
  provider: DatabaseProviderType
  displayName: string
  description?: string
  credentials?: Record<string, unknown>
  assignToWorkspaceId?: string
}): Promise<{ success: boolean; database: ClientConnectedDatabase; testResult: ConnectionTestResult }> {
  hydrate()
  const id = params.id || `db_${params.provider}_${nanoid(8)}`
  const existing = registry.get(id)

  let encryptedCreds = existing?.encryptedCredentials
  let rawCredsToTest: Record<string, unknown> | undefined

  if (params.credentials && Object.keys(params.credentials).length > 0) {
    encryptedCreds = encryptCredentials(params.credentials)
    rawCredsToTest = params.credentials
  } else if (existing?.encryptedCredentials) {
    try {
      rawCredsToTest = decryptCredentials(existing.encryptedCredentials)
    } catch {
      // ignore
    }
  }

  // Invalidate any existing provider cache
  await invalidateProvider(id)

  // Run live connection test
  let testResult: ConnectionTestResult
  if (params.provider === "zenithsui-cloud") {
    const provider = new ZenithsuiCloudProvider(id)
    testResult = await provider.testConnection()
  } else if (params.provider === "supabase" && rawCredsToTest) {
    const config: SupabaseConnectionConfig = {
      supabaseUrl: (rawCredsToTest.supabaseUrl as string) || "",
      supabaseKey: (rawCredsToTest.supabaseKey as string) || "",
    }
    const provider = new SupabaseProvider(id, config)
    testResult = await provider.testConnection()
  } else if (params.provider === "postgres" && rawCredsToTest) {
    const config: PostgresConnectionConfig = {
      host: rawCredsToTest.host as string,
      port: rawCredsToTest.port ? Number(rawCredsToTest.port) : 5432,
      database: rawCredsToTest.database as string,
      user: rawCredsToTest.user as string,
      password: rawCredsToTest.password as string,
      ssl: rawCredsToTest.ssl as any,
      connectionString: rawCredsToTest.connectionString as string,
    }
    const provider = new PostgresProvider(id, config)
    testResult = await provider.testConnection()
    await provider.close()
  } else {
    testResult = {
      success: false,
      provider: params.provider,
      status: "untested",
      schemaStatus: "missing",
      tablesFound: [],
      error: "No credentials provided to test connection",
    }
  }

  const assigned = new Set(existing?.assignedWorkspaceIds || [])
  if (params.assignToWorkspaceId) {
    assigned.add(params.assignToWorkspaceId)
  }

  const record: ConnectedDatabaseRecord = {
    id,
    ownerUserId: params.ownerUserId || existing?.ownerUserId || "user",
    provider: params.provider,
    displayName: params.displayName.trim() || `${params.provider.toUpperCase()} Database`,
    description: params.description?.trim() || existing?.description || "",
    status: testResult.status,
    encryptedCredentials: encryptedCreds,
    configurationMetadata: {
      ...(existing?.configurationMetadata || {}),
      ...(testResult.safeMetadata || {}),
      tablesCount: testResult.tablesFound.length,
      tablesFound: testResult.tablesFound,
      schemaVersion: testResult.schemaVersion || 1,
      lastLatencyMs: testResult.latencyMs,
    },
    assignedWorkspaceIds: Array.from(assigned),
    isDefault: existing?.isDefault ?? false,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
    lastTestedAt: Date.now(),
    lastError: testResult.error,
  }

  registry.set(id, record)
  persist()

  // If assignToWorkspaceId was specified, update that workspace
  if (params.assignToWorkspaceId) {
    await assignDatabaseToWorkspace(params.assignToWorkspaceId, id, params.ownerUserId)
  }

  const clientList = await listConnectedDatabases(params.ownerUserId)
  const clientSummary = clientList.find((c) => c.id === id)!

  return {
    success: testResult.success,
    database: clientSummary,
    testResult,
  }
}

/**
 * Test connection for an existing connected database record
 */
export async function testConnectedDatabase(
  id: string,
  testCreds?: Record<string, unknown>
): Promise<ConnectionTestResult> {
  hydrate()
  const record = registry.get(id)
  if (!record && !testCreds) {
    return {
      success: false,
      provider: "zenithsui-cloud",
      status: "failed",
      schemaStatus: "missing",
      tablesFound: [],
      error: "Database not found",
    }
  }

  const providerType = testCreds?.provider
    ? (testCreds.provider as DatabaseProviderType)
    : record!.provider

  let rawCreds: Record<string, unknown> | undefined = testCreds
  if (!rawCreds && record?.encryptedCredentials) {
    try {
      rawCreds = decryptCredentials(record.encryptedCredentials)
    } catch (err: any) {
      return {
        success: false,
        provider: providerType,
        status: "failed",
        schemaStatus: "missing",
        tablesFound: [],
        error: "Failed to decrypt credentials: " + err.message,
      }
    }
  }

  let testResult: ConnectionTestResult
  if (providerType === "zenithsui-cloud") {
    const p = new ZenithsuiCloudProvider(id)
    testResult = await p.testConnection()
  } else if (providerType === "supabase" && rawCreds) {
    const config: SupabaseConnectionConfig = {
      supabaseUrl: (rawCreds.supabaseUrl as string) || (record?.configurationMetadata?.supabaseUrl as string) || "",
      supabaseKey: (rawCreds.supabaseKey as string) || "",
    }
    const p = new SupabaseProvider(id, config)
    testResult = await p.testConnection()
  } else if (providerType === "postgres" && rawCreds) {
    const config: PostgresConnectionConfig = {
      host: rawCreds.host as string,
      port: rawCreds.port ? Number(rawCreds.port) : 5432,
      database: rawCreds.database as string,
      user: rawCreds.user as string,
      password: rawCreds.password as string,
      ssl: rawCreds.ssl as any,
      connectionString: rawCreds.connectionString as string,
    }
    const p = new PostgresProvider(id, config)
    testResult = await p.testConnection()
    await p.close()
  } else {
    testResult = {
      success: false,
      provider: providerType,
      status: "untested",
      schemaStatus: "missing",
      tablesFound: [],
      error: "No credentials available for connection test",
    }
  }

  if (record) {
    record.status = testResult.status
    record.lastTestedAt = Date.now()
    record.lastError = testResult.error
    if (testResult.latencyMs !== undefined) {
      record.configurationMetadata.lastLatencyMs = testResult.latencyMs
    }
    if (testResult.tablesFound) {
      record.configurationMetadata.tablesFound = testResult.tablesFound
      record.configurationMetadata.tablesCount = testResult.tablesFound.length
    }
    record.updatedAt = Date.now()
    persist()
  }

  return testResult
}

/**
 * Initialize Zenithsui schema (zenithsui_* tables) on the target external database
 */
export async function initializeConnectedDatabaseSchema(
  id: string
): Promise<{ success: boolean; version: number; error?: string }> {
  hydrate()
  const record = registry.get(id)
  if (!record) {
    return { success: false, version: 0, error: "Database record not found" }
  }

  const provider = await getProviderForDatabase(id)
  const result = await provider.initializeSchema()

  if (result.success) {
    record.status = "connected"
    record.configurationMetadata.schemaVersion = result.version
    record.lastError = undefined
    persist()
  } else {
    record.lastError = result.error
    persist()
  }

  return result
}

/**
 * Disconnect an external database.
 * Safeguard: Checks if any active workspaces still use it.
 */
export async function disconnectDatabase(
  id: string,
  _userId: string
): Promise<{ success: boolean; error?: string; assignedWorkspacesCount?: number }> {
  hydrate()
  const record = registry.get(id)
  if (!record) {
    return { success: false, error: "Database not found" }
  }

  if (record.isDefault || record.id === "zenithsui-cloud") {
    return { success: false, error: "The default Zenithsui Cloud database cannot be disconnected." }
  }

  // Check if any workspaces are currently assigned to this database
  const workspaces = getAllWorkspaces()
  const dependentWorkspaces = workspaces.filter((w) => w.databaseId === id)

  if (dependentWorkspaces.length > 0) {
    return {
      success: false,
      error: `Cannot disconnect: ${dependentWorkspaces.length} workspace(s) currently rely on this database. Please migrate or reassign them to Zenithsui Cloud first.`,
      assignedWorkspacesCount: dependentWorkspaces.length,
    }
  }

  // Invalidate provider pool
  await invalidateProvider(id)

  registry.delete(id)
  persist()

  return { success: true }
}

/**
 * Assign a connected database to a workspace
 */
export async function assignDatabaseToWorkspace(
  workspaceId: string,
  databaseId: string,
  _userId: string
): Promise<{ success: boolean; error?: string }> {
  hydrate()
  const record = registry.get(databaseId)
  if (!record) {
    return { success: false, error: "Target database not found" }
  }

  const workspaces = getAllWorkspaces()
  const ws = workspaces.find((w) => w.id === workspaceId)
  if (!ws) {
    return { success: false, error: "Workspace not found" }
  }

  const oldDbId = ws.databaseId || "zenithsui-cloud"
  if (oldDbId === databaseId) {
    return { success: true }
  }

  // Remove workspace from old database assigned list
  const oldDb = registry.get(oldDbId)
  if (oldDb) {
    oldDb.assignedWorkspaceIds = oldDb.assignedWorkspaceIds.filter((id) => id !== workspaceId)
  }

  // Add to new database assigned list
  if (!record.assignedWorkspaceIds.includes(workspaceId)) {
    record.assignedWorkspaceIds.push(workspaceId)
  }

  // Update workspace record
  ws.databaseId = databaseId
  ws.updatedAt = Date.now()
  saveWorkspaceRecord(ws)
  persist()

  return { success: true }
}

/**
 * Migrate all workspace data (boards, documents, favorites, trash, shares) from its
 * current storage provider to a target connected database provider.
 * Follows strict verification and rollback safety.
 */
export async function migrateWorkspaceData(
  workspaceId: string,
  targetDatabaseId: string,
  userId: string
): Promise<WorkspaceMigrationResult> {
  hydrate()

  const workspaces = getAllWorkspaces()
  const workspace = workspaces.find((w) => w.id === workspaceId)
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`)
  }

  const targetRecord = registry.get(targetDatabaseId)
  if (!targetRecord) {
    throw new Error(`Target database ${targetDatabaseId} not found`)
  }

  const sourceDatabaseId = workspace.databaseId || "zenithsui-cloud"
  if (sourceDatabaseId === targetDatabaseId) {
    throw new Error("Target database is already the current database for this workspace")
  }

  // Verify target provider is reachable
  const targetProvider = await getProviderForDatabase(targetDatabaseId)
  const testTarget = await targetProvider.testConnection()
  if (!testTarget.success) {
    throw new Error(`Target database connection test failed: ${testTarget.error || "Unreachable"}`)
  }

  // Check / initialize schema on target if needed
  const schemaCheck = await targetProvider.detectSchema()
  if (schemaCheck.status !== "initialized") {
    const initResult = await targetProvider.initializeSchema()
    if (!initResult.success) {
      throw new Error(`Target schema missing or uninitialized: ${initResult.error || "Please run schema setup"}`)
    }
  }

  // 1. Gather all data from source
  const sourceProvider = await getProviderForDatabase(sourceDatabaseId)
  const sourceBoards = getBoardsForWorkspace(workspaceId)

  const counts: MigrationCounts = {
    boards: sourceBoards.filter((b) => !b.inTrash).length,
    documents: 0,
    nodes: 0,
    favorites: sourceBoards.filter((b) => b.isFavorite).length,
    trash: sourceBoards.filter((b) => b.inTrash).length,
    shares: 0,
  }

  // 2. Write workspace record to target provider
  const updatedWs = {
    ...workspace,
    databaseId: targetDatabaseId,
    updatedAt: Date.now(),
  }
  await targetProvider.writeWorkspace(updatedWs)

  // 3. Write each board and its documents to target provider
  for (const board of sourceBoards) {
    const nodeCount = Object.keys(board.nodes || {}).length
    counts.nodes += nodeCount

    const targetBoard = {
      ...board,
      updatedAt: Date.now(),
    }
    await targetProvider.writeBoard(workspaceId, targetBoard)

    // Write underlying doc if shared
    const doc = {
      id: board.id,
      name: board.name,
      nodes: board.nodes || {},
      order: board.order || [],
      updatedAt: board.updatedAt,
      dbId: targetDatabaseId,
      look: board.look,
    }
    await targetProvider.writeDocument(targetDatabaseId, doc as any)
    counts.documents += 1

    // Check and migrate share record if exists
    try {
      const share = await sourceProvider.readShare(sourceDatabaseId, board.id)
      if (share) {
        const migratedShare = {
          ...share,
          dbId: targetDatabaseId,
          updatedAt: Date.now(),
        }
        await targetProvider.writeShare(migratedShare)
        counts.shares += 1
      }
    } catch {
      // share migration is non-blocking
    }
  }

  // 4. Verification step: Read back from target provider
  const verifiedBoards = await targetProvider.listBoards(workspaceId)
  if (verifiedBoards.length < sourceBoards.length) {
    throw new Error(
      `Migration verification failed: expected ${sourceBoards.length} boards on target, but found ${verifiedBoards.length}. Aborting migration to protect data.`
    )
  }

  // 5. Update assignment & pointers
  await assignDatabaseToWorkspace(workspaceId, targetDatabaseId, userId)

  return {
    success: true,
    workspaceId,
    workspaceName: workspace.name,
    sourceDatabaseId,
    targetDatabaseId,
    migratedAt: Date.now(),
    counts,
    verified: true,
  }
}
