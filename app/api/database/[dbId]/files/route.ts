import { NextRequest, NextResponse } from "next/server"
import { listSupabaseFiles, saveSupabaseDoc } from "@/lib/supabase-server"
import { verifyEditToken } from "@/lib/security"
import { createPageVersion } from "@/lib/server-versions"
import { checkDatabaseAccess } from "@/lib/database-auth"
import {
  getStore,
  getRawDoc,
  persistDbFiles,
  type ServerStoredDoc,
  type ServerFileMeta,
} from "@/lib/server-documents"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Server-side store for shared database files.
// In production or cloud deployments, this maps directly to your database
// (PostgreSQL, Firestore, Cloud SQL, Supabase, etc.) scoped by database ID (dbId).
//
// Model:
//   Database (dbId) -> Shared Files -> All users connected to dbId
// ---------------------------------------------------------------------------

// Store + types are canonical in lib/server-documents (re-exported here for
// backward compatibility with existing relative imports from sibling routes).
export {
  getStore,
  getRawDoc,
  persistDbFiles,
  updateDocPassword,
} from "@/lib/server-documents"
export type {
  ServerStoredDoc,
  ServerFileMeta,
} from "@/lib/server-documents"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string }> }
) {
  const { dbId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkDatabaseAccess(dbId, userId, "viewer")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Access denied to database" }, { status: 403 })
  }

  if (dbId === "nezukos-box") {
    const files = await listSupabaseFiles()
    return NextResponse.json({ dbId, files })
  }

  const store = getStore(dbId)
  const files: ServerFileMeta[] = Array.from(store.values())
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      updatedAt: doc.updatedAt,
      dbId,
      hasPassword: !!doc.passwordHash || !!doc.hasPassword,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  return NextResponse.json({ dbId, files })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dbId: string }> }
) {
  const { dbId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkDatabaseAccess(dbId, userId, "editor")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Edit access denied" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const doc = body?.doc as ServerStoredDoc | undefined

    if (!doc || !doc.id || typeof doc.name !== "string") {
      return NextResponse.json({ error: "Invalid document payload" }, { status: 400 })
    }

    // Permission check for existing password-protected docs
    const existingDoc = await getRawDoc(dbId, doc.id)
    if (existingDoc && (existingDoc.hasPassword || existingDoc.passwordHash)) {
      const editToken = req.headers.get("x-zenithsui-edit-token") || ""
      const tokenVerification = verifyEditToken(editToken, dbId, doc.id)
      if (!tokenVerification.valid) {
        return NextResponse.json(
          {
            error: "Document is password-protected. Valid edit token required.",
            locked: true,
            needsPassword: true,
          },
          { status: 403 }
        )
      }
    }

    if (dbId === "nezukos-box") {
      const normalized = {
        ...doc,
        dbId: "nezukos-box",
        updatedAt: doc.updatedAt || Date.now(),
        passwordHash: existingDoc?.passwordHash,
        passwordSalt: existingDoc?.passwordSalt,
        hasPassword: existingDoc?.hasPassword ?? !!existingDoc?.passwordHash,
      }
      const files = await saveSupabaseDoc(normalized)
      const store = getStore(dbId)
      store.set(doc.id, normalized)
      persistDbFiles(dbId)
      void createPageVersion("nezukos-box", doc.id, normalized, "Autosave").catch(() => {})
      return NextResponse.json({ success: true, dbId, files })
    }

    const store = getStore(dbId)
    const normalizedDoc: ServerStoredDoc = {
      ...doc,
      dbId,
      updatedAt: doc.updatedAt || Date.now(),
      passwordHash: existingDoc?.passwordHash,
      passwordSalt: existingDoc?.passwordSalt,
      hasPassword: existingDoc?.hasPassword ?? !!existingDoc?.passwordHash,
    }
    store.set(doc.id, normalizedDoc)
    persistDbFiles(dbId)
    void createPageVersion(dbId, doc.id, normalizedDoc, "Autosave").catch(() => {})

    try {
      const { getProviderForDatabase } = await import("@/lib/data-providers/registry")
      const provider = await getProviderForDatabase(dbId)
      if (provider) {
        await provider.writeDocument(dbId, normalizedDoc)
      }
    } catch {
      // fallback to store
    }

    const files: ServerFileMeta[] = Array.from(store.values())
      .map((d) => ({
        id: d.id,
        name: d.name,
        updatedAt: d.updatedAt,
        dbId,
        hasPassword: !!d.passwordHash || !!d.hasPassword,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)

    return NextResponse.json({ success: true, dbId, files })
  } catch {
    return NextResponse.json({ error: "Failed to parse request" }, { status: 500 })
  }
}
