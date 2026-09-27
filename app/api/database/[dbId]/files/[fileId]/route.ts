import { NextRequest, NextResponse } from "next/server"
import { readSupabaseDoc, deleteSupabaseDoc } from "@/lib/supabase-server"
import { getStore, getRawDoc, persistDbFiles, type ServerFileMeta } from "../route"
import { verifyEditToken } from "@/lib/security"
import { checkDatabaseAccess } from "@/lib/database-auth"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkDatabaseAccess(dbId, userId, "viewer")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Access denied to database" }, { status: 403 })
  }

  if (dbId === "nezukos-box") {
    const doc = await readSupabaseDoc(fileId)
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }
    return NextResponse.json({ dbId, fileId, doc })
  }

  const store = getStore(dbId)
  const doc = store.get(fileId)
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // Client-safe copy
  return NextResponse.json({
    dbId,
    fileId,
    doc: {
      id: doc.id,
      name: doc.name,
      nodes: doc.nodes,
      order: doc.order,
      updatedAt: doc.updatedAt,
      dbId: doc.dbId,
      look: doc.look,
      hasPassword: !!doc.passwordHash || !!doc.hasPassword,
    },
  })
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkDatabaseAccess(dbId, userId, "editor")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Edit access required to delete page" }, { status: 403 })
  }

  const rawDoc = await getRawDoc(dbId, fileId)
  if (rawDoc && (rawDoc.hasPassword || rawDoc.passwordHash)) {
    const token = req.headers.get("x-zenithsui-edit-token") || ""
    const check = verifyEditToken(token, dbId, fileId)
    if (!check.valid) {
      return NextResponse.json(
        { error: "Password-protected document. Valid edit token required to delete.", locked: true },
        { status: 403 }
      )
    }
  }

  if (dbId === "nezukos-box") {
    const files = await deleteSupabaseDoc(fileId)
    return NextResponse.json({ success: true, dbId, fileId, files })
  }

  const store = getStore(dbId)
  store.delete(fileId)
  persistDbFiles(dbId)

  const files: ServerFileMeta[] = Array.from(store.values())
    .map((d) => ({
      id: d.id,
      name: d.name,
      updatedAt: d.updatedAt,
      dbId,
      hasPassword: !!d.passwordHash || !!d.hasPassword,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  return NextResponse.json({
    success: true,
    dbId,
    fileId,
    files,
  })
}

