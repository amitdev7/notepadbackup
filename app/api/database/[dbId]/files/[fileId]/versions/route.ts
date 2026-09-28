import { NextRequest, NextResponse } from "next/server"
import { listPageVersions, getPageVersion, restorePageVersion, createPageVersion } from "@/lib/server-versions"
import { getRawDoc } from "@/lib/server-documents"
import { verifyEditToken } from "@/lib/security"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const url = new URL(req.url)
  const versionParam = url.searchParams.get("version")
  const versionIdParam = url.searchParams.get("versionId")

  // Ensure file exists
  const rawDoc = await getRawDoc(dbId, fileId)
  if (!rawDoc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  if (versionParam) {
    const versionNum = parseInt(versionParam, 10)
    if (isNaN(versionNum)) {
      return NextResponse.json({ error: "Invalid version number" }, { status: 400 })
    }
    const version = await getPageVersion(dbId, fileId, versionNum)
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }
    return NextResponse.json({ dbId, fileId, version })
  }

  if (versionIdParam) {
    const version = await getPageVersion(dbId, fileId, versionIdParam)
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }
    return NextResponse.json({ dbId, fileId, version })
  }

  const versions = await listPageVersions(dbId, fileId)
  return NextResponse.json({ dbId, fileId, versions })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  try {
    const body = await req.json()
    const action = body?.action as string | undefined

    if (action === "restore") {
      const versionNumber = Number(body?.versionNumber)
      if (!versionNumber || isNaN(versionNumber)) {
        return NextResponse.json({ error: "Valid versionNumber required to restore" }, { status: 400 })
      }

      const editToken = req.headers.get("x-zenithsui-edit-token") || body?.editToken || ""
      const sessionId = req.headers.get("x-session-id") || "user"

      const result = await restorePageVersion(dbId, fileId, versionNumber, editToken, sessionId)
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to restore version" }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        dbId,
        fileId,
        newVersion: result.newVersion,
        doc: {
          id: result.restoredDoc?.id,
          name: result.restoredDoc?.name,
          nodes: result.restoredDoc?.nodes,
          order: result.restoredDoc?.order,
          look: result.restoredDoc?.look,
          updatedAt: result.restoredDoc?.updatedAt,
        },
      })
    }

    if (action === "snapshot") {
      const editToken = req.headers.get("x-zenithsui-edit-token") || ""
      const rawDoc = await getRawDoc(dbId, fileId)
      if (!rawDoc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 })
      }

      if (rawDoc.hasPassword || rawDoc.passwordHash) {
        const verification = verifyEditToken(editToken, dbId, fileId)
        if (!verification.valid) {
          return NextResponse.json({ error: "Edit permission required" }, { status: 403 })
        }
      }

      const label = (body?.label as string) || "Manual snapshot"
      const version = await createPageVersion(dbId, fileId, rawDoc, label)
      return NextResponse.json({ success: true, dbId, fileId, version })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("[Versions API] POST error:", err)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
