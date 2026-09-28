// ---------------------------------------------------------------------------
// Zenithsui — Data Provider Registry & Factory
// Resolves and caches live DataProvider instances per database ID and workspace
// ---------------------------------------------------------------------------

import type { DataProvider } from "./provider-interface"
import { ZenithsuiCloudProvider } from "./zenithsui-cloud-provider"
import { SupabaseProvider } from "./supabase-provider"
import { PostgresProvider } from "./postgres-provider"
import { getConnectedDatabaseRecord } from "@/lib/server-connected-databases"
import { decryptCredentials } from "@/lib/database-crypto"
import type {
  SupabaseConnectionConfig,
  PostgresConnectionConfig,
} from "@/lib/database-types"

const activeProviders = new Map<string, DataProvider>()
const defaultCloudProvider = new ZenithsuiCloudProvider("zenithsui-cloud")

/**
 * Get or instantiate a DataProvider for the specified database ID.
 */
export async function getProviderForDatabase(dbId: string): Promise<DataProvider> {
  if (!dbId || dbId === "zenithsui-cloud" || dbId === "primary-db") {
    return defaultCloudProvider
  }

  const cached = activeProviders.get(dbId)
  if (cached) {
    return cached
  }

  // Load database record from connected databases
  const record = getConnectedDatabaseRecord(dbId)
  if (!record) {
    // If it's a known legacy or cloud database ID, fallback to cloud provider
    return defaultCloudProvider
  }

  if (record.provider === "zenithsui-cloud") {
    const p = new ZenithsuiCloudProvider(record.id)
    activeProviders.set(dbId, p)
    return p
  }

  if (!record.encryptedCredentials) {
    return defaultCloudProvider
  }

  try {
    const rawCreds = decryptCredentials<Record<string, unknown>>(record.encryptedCredentials)

    if (record.provider === "supabase") {
      const config: SupabaseConnectionConfig = {
        supabaseUrl: (rawCreds.supabaseUrl as string) || (record.configurationMetadata.supabaseUrl as string) || "",
        supabaseKey: (rawCreds.supabaseKey as string) || "",
      }
      const provider = new SupabaseProvider(record.id, config)
      activeProviders.set(dbId, provider)
      return provider
    }

    if (record.provider === "postgres") {
      const config: PostgresConnectionConfig = {
        host: rawCreds.host as string,
        port: rawCreds.port ? Number(rawCreds.port) : 5432,
        database: rawCreds.database as string,
        user: rawCreds.user as string,
        password: rawCreds.password as string,
        ssl: rawCreds.ssl as any,
        connectionString: rawCreds.connectionString as string,
      }
      const provider = new PostgresProvider(record.id, config)
      activeProviders.set(dbId, provider)
      return provider
    }
  } catch (err) {
    console.warn(`[Registry] Failed to initialize provider for database ${dbId}:`, err)
  }

  return defaultCloudProvider
}

/**
 * Invalidate and close a cached provider instance (e.g. after credential change or disconnect)
 */
export async function invalidateProvider(dbId: string): Promise<void> {
  const existing = activeProviders.get(dbId)
  if (existing) {
    activeProviders.delete(dbId)
    try {
      await existing.close()
    } catch (err) {
      console.warn(`[Registry] Error closing provider ${dbId}:`, err)
    }
  }
}

/**
 * Close all active provider instances (graceful shutdown)
 */
export async function closeAllProviders(): Promise<void> {
  for (const [id, provider] of activeProviders.entries()) {
    try {
      await provider.close()
    } catch (err) {
      console.warn(`[Registry] Error closing provider ${id}:`, err)
    }
  }
  activeProviders.clear()
}
