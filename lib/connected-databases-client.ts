// ---------------------------------------------------------------------------
// Zenithsui — Connected Databases Client SDK
// Client-side API caller for BYOD (Supabase, PostgreSQL, Zenithsui Cloud)
// ---------------------------------------------------------------------------

import type {
  ClientConnectedDatabase,
  ConnectionTestResult,
  WorkspaceMigrationResult,
  DatabaseProviderType,
} from "./database-types"

export async function fetchConnectedDatabases(): Promise<ClientConnectedDatabase[]> {
  try {
    const res = await fetch("/api/databases")
    if (!res.ok) {
      throw new Error(`Failed to fetch connected databases (${res.status})`)
    }
    const data = await res.json()
    return data.databases || []
  } catch (err) {
    console.warn("[ConnectedDatabasesClient] fetch error:", err)
    return []
  }
}

export async function saveConnectedDatabaseClient(params: {
  id?: string
  provider: DatabaseProviderType
  displayName: string
  description?: string
  credentials?: Record<string, unknown>
  assignToWorkspaceId?: string
}): Promise<{
  success: boolean
  database?: ClientConnectedDatabase
  testResult?: ConnectionTestResult
  error?: string
}> {
  try {
    const res = await fetch("/api/databases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.testResult?.error || "Failed to save connected database",
        testResult: data.testResult,
        database: data.database,
      }
    }
    return data
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error while saving database",
    }
  }
}

export async function testConnectedDatabaseClient(
  id: string,
  credentials?: Record<string, unknown>
): Promise<ConnectionTestResult> {
  try {
    const res = await fetch(`/api/databases/${encodeURIComponent(id)}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentials }),
    })
    const data = await res.json()
    return data
  } catch (err: any) {
    return {
      success: false,
      provider: "zenithsui-cloud",
      status: "failed",
      schemaStatus: "missing",
      tablesFound: [],
      error: err.message || "Network error testing connection",
    }
  }
}

export async function initializeDatabaseSchemaClient(
  id: string
): Promise<{ success: boolean; version?: number; error?: string }> {
  try {
    const res = await fetch(`/api/databases/${encodeURIComponent(id)}/initialize`, {
      method: "POST",
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to initialize schema" }
  }
}

export async function disconnectDatabaseClient(
  id: string
): Promise<{ success: boolean; error?: string; assignedWorkspacesCount?: number }> {
  try {
    const res = await fetch(`/api/databases/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to disconnect database" }
  }
}

export async function assignDatabaseToWorkspaceClient(
  workspaceId: string,
  databaseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/database`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ databaseId }),
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to assign database" }
  }
}

export async function migrateWorkspaceToDatabaseClient(
  workspaceId: string,
  targetDatabaseId: string
): Promise<WorkspaceMigrationResult> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/database/migrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetDatabaseId }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Migration failed")
  }
  return data.result
}

