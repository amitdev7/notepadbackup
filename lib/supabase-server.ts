import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"

const SUPABASE_URL = process.env.SUPABASE_URL || "https://prcodeitlnlqqjxykvmr.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByY29kZWl0bG5scXFqeHlrdm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwOTUxMTUsImV4cCI6MjEwMzY3MTExNX0.pHHxmoyqePhKl8cO1y9vChlmUnGJIwFkY-nmxdsFjIw"

let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    return supabaseInstance
  } catch (err) {
    console.error("[Supabase] Failed to initialize client:", err)
    return null
  }
}

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

const fallbackSupabaseMemoryStore = new Map<string, ServerStoredDoc>()

// Helper to persist fallback store to disk for server restarts
function persistNezukoDiskStore(): void {
  try {
    writeJsonSnapshot("db_files_nezukos_box.json", Array.from(fallbackSupabaseMemoryStore.values()))
  } catch (err) {
    console.warn("[Supabase] Failed to persist Nezuko store to disk:", err)
  }
}

// Hydrate from disk
function initNezukoStore(): void {
  if (fallbackSupabaseMemoryStore.size > 0) return
  const saved = readJsonSnapshot<ServerStoredDoc[]>("db_files_nezukos_box.json", [])
  if (saved && saved.length > 0) {
    for (const doc of saved) {
      fallbackSupabaseMemoryStore.set(doc.id, doc)
    }
  }
  if (!fallbackSupabaseMemoryStore.has(initialSeedDoc.id)) {
    fallbackSupabaseMemoryStore.set(initialSeedDoc.id, initialSeedDoc)
  }
}

// Seed initial document for Nezuko's Box
const initialSeedDoc: ServerStoredDoc = {
  id: "nezuko-starter-doc",
  name: "Nezuko's Box Canvas",
  nodes: {
    n1: {
      id: "n1",
      type: "text",
      text: "⛩️ Nezuko's Box — Central Database\nConnected to Supabase. Shared assets and wireframes are stored here.",
      x: 90,
      y: 100,
      w: 520,
      h: 90,
      seed: 88,
      size: "large",
    },
    n2: {
      id: "n2",
      type: "component",
      kind: "card",
      props: {
        title: "Database Connected",
        description: "prcodeitlnlqqjxykvmr.supabase.co",
      },
      x: 90,
      y: 220,
      w: 320,
      h: 120,
      seed: 89,
    },
    n3: {
      id: "n3",
      type: "component",
      kind: "button",
      props: { label: "Nezuko's Box Asset Storage", variant: "primary", size: "default" },
      x: 90,
      y: 360,
      w: 240,
      h: 42,
      seed: 90,
    },
  },
  order: ["n1", "n2", "n3"],
  updatedAt: Date.now() - 1800000,
  dbId: "nezukos-box",
  look: {
    theme: "sketch",
    paper: "subtle",
    font: "hand",
    grid: true,
  },
}

initNezukoStore()

/**
 * Fetch all documents stored in Supabase for Nezuko's Box
 */
export async function listSupabaseFiles(): Promise<ServerFileMeta[]> {
  const supabase = getSupabase()
  if (!supabase) {
    return Array.from(fallbackSupabaseMemoryStore.values())
      .map((d) => ({
        id: d.id,
        name: d.name,
        updatedAt: d.updatedAt,
        dbId: "nezukos-box",
        hasPassword: !!d.passwordHash || !!d.hasPassword,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  try {
    // Try to query zenithsui_files table first
    const { data, error } = await supabase
      .from("zenithsui_files")
      .select("id, name, updated_at, has_password")
      .order("updated_at", { ascending: false })

    if (!error && Array.isArray(data)) {
      if (data.length === 0 && fallbackSupabaseMemoryStore.size > 0) {
        return Array.from(fallbackSupabaseMemoryStore.values())
          .map((d) => ({
            id: d.id,
            name: d.name,
            updatedAt: d.updatedAt,
            dbId: "nezukos-box",
            hasPassword: !!d.passwordHash || !!d.hasPassword,
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt)
      }
      return data.map((row: { id: string; name: string; updated_at?: number | string; has_password?: boolean }) => ({
        id: row.id,
        name: row.name,
        updatedAt: typeof row.updated_at === "number" ? row.updated_at : Date.parse(String(row.updated_at)) || Date.now(),
        dbId: "nezukos-box",
        hasPassword: !!row.has_password || !!fallbackSupabaseMemoryStore.get(row.id)?.passwordHash,
      }))
    }
  } catch (err) {
    console.warn("[Supabase] Query error, using fallback memory store:", err)
  }

  return Array.from(fallbackSupabaseMemoryStore.values())
    .map((d) => ({
      id: d.id,
      name: d.name,
      updatedAt: d.updatedAt,
      dbId: "nezukos-box",
      hasPassword: !!d.passwordHash || !!d.hasPassword,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Read single document from Supabase (stripped of sensitive security fields for client consumption)
 */
export async function readSupabaseDoc(fileId: string): Promise<ServerStoredDoc | null> {
  const raw = await getRawSupabaseDoc(fileId)
  if (!raw) return null
  // Return client-safe copy without raw hash or salt
  return {
    id: raw.id,
    name: raw.name,
    nodes: raw.nodes,
    order: raw.order,
    updatedAt: raw.updatedAt,
    dbId: "nezukos-box",
    look: raw.look,
    hasPassword: !!raw.passwordHash || !!raw.hasPassword,
  }
}

/**
 * Internal getter for the raw document containing password hashes for server-side auth verification.
 */
export async function getRawSupabaseDoc(fileId: string): Promise<ServerStoredDoc | null> {
  const supabase = getSupabase()
  if (!supabase) {
    return fallbackSupabaseMemoryStore.get(fileId) ?? null
  }

  try {
    const { data, error } = await supabase
      .from("zenithsui_files")
      .select("*")
      .eq("id", fileId)
      .maybeSingle()

    if (!error && data) {
      const fallback = fallbackSupabaseMemoryStore.get(fileId)
      return {
        id: data.id,
        name: data.name,
        nodes: typeof data.nodes === "object" ? data.nodes : {},
        order: Array.isArray(data.order) ? data.order : [],
        updatedAt: typeof data.updated_at === "number" ? data.updated_at : Date.parse(String(data.updated_at)) || Date.now(),
        look: data.look,
        dbId: "nezukos-box",
        hasPassword: !!data.has_password || !!fallback?.hasPassword || !!fallback?.passwordHash,
        passwordHash: data.password_hash || fallback?.passwordHash,
        passwordSalt: data.password_salt || fallback?.passwordSalt,
      }
    }
  } catch (err) {
    console.warn(`[Supabase] Read error for ${fileId}:`, err)
  }

  return fallbackSupabaseMemoryStore.get(fileId) ?? null
}

/**
 * Save / Upsert document to Supabase
 */
export async function saveSupabaseDoc(doc: ServerStoredDoc): Promise<ServerFileMeta[]> {
  const existing = fallbackSupabaseMemoryStore.get(doc.id)
  const merged: ServerStoredDoc = {
    ...doc,
    dbId: "nezukos-box",
    passwordHash: doc.passwordHash ?? existing?.passwordHash,
    passwordSalt: doc.passwordSalt ?? existing?.passwordSalt,
    hasPassword: doc.hasPassword ?? existing?.hasPassword ?? !!existing?.passwordHash,
  }
  fallbackSupabaseMemoryStore.set(doc.id, merged)
  persistNezukoDiskStore()

  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from("zenithsui_files").upsert({
        id: doc.id,
        name: doc.name,
        nodes: doc.nodes,
        order: doc.order,
        updated_at: doc.updatedAt || Date.now(),
        look: doc.look,
        db_id: "nezukos-box",
        has_password: merged.hasPassword,
        password_hash: merged.passwordHash,
        password_salt: merged.passwordSalt,
      })
    } catch (err) {
      console.warn(`[Supabase] Upsert error for ${doc.id}:`, err)
    }
  }

  return listSupabaseFiles()
}

/**
 * Update password security credentials for a document
 */
export async function updateSupabaseDocPassword(
  fileId: string,
  passwordHash?: string,
  passwordSalt?: string,
  hasPassword = false
): Promise<boolean> {
  const existing = await getRawSupabaseDoc(fileId)
  if (!existing) return false

  existing.passwordHash = passwordHash
  existing.passwordSalt = passwordSalt
  existing.hasPassword = hasPassword
  fallbackSupabaseMemoryStore.set(fileId, existing)
  persistNezukoDiskStore()

  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from("zenithsui_files").upsert({
        id: fileId,
        name: existing.name,
        nodes: existing.nodes,
        order: existing.order,
        updated_at: Date.now(),
        look: existing.look,
        db_id: "nezukos-box",
        has_password: hasPassword,
        password_hash: passwordHash || null,
        password_salt: passwordSalt || null,
      })
    } catch (err) {
      console.warn(`[Supabase] Password update error for ${fileId}:`, err)
    }
  }
  return true
}

/**
 * Delete document from Supabase
 */
export async function deleteSupabaseDoc(fileId: string): Promise<ServerFileMeta[]> {
  fallbackSupabaseMemoryStore.delete(fileId)
  persistNezukoDiskStore()

  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from("zenithsui_files").delete().eq("id", fileId)
    } catch (err) {
      console.warn(`[Supabase] Delete error for ${fileId}:`, err)
    }
  }

  return listSupabaseFiles()
}
