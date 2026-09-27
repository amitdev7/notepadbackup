import { NextRequest, NextResponse } from "next/server"
import { readSupabaseDoc, deleteSupabaseDoc } from "@/lib/supabase-server"
import {
  getStore,
  getRawDoc,
  persistDbFiles,
  type ServerFileMeta,
} from "@/lib/server-documents"
import type { StoredAttachmentMeta } from "@/lib/server-attachments"
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

  // Fan out deletion to provider + related data. Each step is isolated so one
  // failure never blocks the remaining cleanup.
  try {
    const { getProviderForDatabase } = await import("@/lib/data-providers/registry")
    const provider = await getProviderForDatabase(dbId)
    if (provider) {
      await provider.deleteDocument(dbId, fileId)
    }
  } catch (err) {
    console.warn(`[DatabaseFiles] Provider delete failed for ${dbId}/${fileId}:`, err)
  }

  try {
    const versionsMod = await import("@/lib/server-versions")
    const clearVersions =
      (versionsMod as unknown as Record<string, unknown>).deleteVersionsForFile ||
      (versionsMod as unknown as Record<string, unknown>).clearVersionsForFile
    if (typeof clearVersions === "function") {
      await (clearVersions as (dbId: string, fileId: string) => unknown)(dbId, fileId)
    } else {
      const versions = versionsMod.getVersionsForFile(dbId, fileId)
      if (Array.isArray(versions)) versions.length = 0
    }
  } catch (err) {
    console.warn(`[DatabaseFiles] Version cleanup failed for ${dbId}/${fileId}:`, err)
  }

  try {
    const shareMod = await import("@/lib/server-share")
    const clearShare =
      (shareMod as unknown as Record<string, unknown>).deletePageShare ||
      (shareMod as unknown as Record<string, unknown>).removePageShare ||
      (shareMod as unknown as Record<string, unknown>).clearPageShare
    if (typeof clearShare === "function") {
      await (clearShare as (dbId: string, fileId: string) => unknown)(dbId, fileId)
    } else if (typeof shareMod.revokePageShare === "function") {
      try {
        await shareMod.revokePageShare(dbId, fileId, userId)
      } catch {
        // share may not exist — ignore
      }
    }
  } catch (err) {
    console.warn(`[DatabaseFiles] Share cleanup failed for ${dbId}/${fileId}:`, err)
  }

  try {
    const attachMod = await import("@/lib/server-attachments")
    const clearAttachments =
      (attachMod as unknown as Record<string, unknown>).deleteAttachmentsForFile ||
      (attachMod as unknown as Record<string, unknown>).removeAttachmentsForFile ||
      (attachMod as unknown as Record<string, unknown>).clearAttachmentsForFile
    if (typeof clearAttachments === "function") {
      await (clearAttachments as (dbId: string, fileId: string) => unknown)(dbId, fileId)
    } else if (typeof attachMod.getAttachmentMeta === "function") {
      // No bulk delete API: best-effort — remove the attachment keyed by fileId if present.
      const meta = (await attachMod.getAttachmentMeta(fileId).catch(() => null)) as StoredAttachmentMeta | null
      if (meta) {
        const deleteOne =
          (attachMod as unknown as Record<string, unknown>).deleteAttachment ||
          (attachMod as unknown as Record<string, unknown>).removeAttachment
        if (typeof deleteOne === "function") {
          await (deleteOne as (id: string) => unknown)(fileId)
        }
      }
    }
  } catch (err) {
    console.warn(`[DatabaseFiles] Attachment cleanup failed for ${dbId}/${fileId}:`, err)
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

  return NextResponse.json({
    success: true,
    dbId,
    fileId,
    files,
  })
}

