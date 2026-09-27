import { NextRequest, NextResponse } from "next/server"
import { verifyEditToken } from "@/lib/security"
import { getRawDoc } from "../../route"
import {
  saveAttachment,
  getAttachmentDataUrl,
  getAttachmentMeta,
} from "@/lib/server-attachments"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const attachmentId = req.nextUrl.searchParams.get("attachmentId")
  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachmentId parameter" }, { status: 400 })
  }

  const safeAttachmentId = attachmentId.replace(/[^a-zA-Z0-9_-]/g, "_")
  const dataUrl = await getAttachmentDataUrl(safeAttachmentId)
  if (!dataUrl) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  const meta = await getAttachmentMeta(safeAttachmentId)

  return NextResponse.json({
    attachmentId: safeAttachmentId,
    dataUrl,
    contentType: meta?.contentType || "application/pdf",
    updatedAt: meta?.uploadedAt || Date.now(),
    dbId,
    fileId,
  })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params

  const rawDoc = await getRawDoc(dbId, fileId)
  if (rawDoc && (rawDoc.hasPassword || rawDoc.passwordHash)) {
    const token = req.headers.get("x-zenithsui-edit-token") || ""
    const check = verifyEditToken(token, dbId, fileId)
    if (!check.valid) {
      return NextResponse.json(
        { error: "Password-protected document. Valid edit token required to upload attachments.", locked: true },
        { status: 403 }
      )
    }
  }

  try {
    const body = await req.json()
    const { attachmentId, dataUrl, contentType, filename } = body
    if (!attachmentId || !dataUrl) {
      return NextResponse.json({ error: "Missing attachmentId or dataUrl" }, { status: 400 })
    }

    const safeAttachmentId = attachmentId.replace(/[^a-zA-Z0-9_-]/g, "_")
    const meta = await saveAttachment(safeAttachmentId, dataUrl, {
      contentType: contentType || "application/pdf",
      filename: filename || `${safeAttachmentId}.pdf`,
      dbId,
      fileId,
    })

    return NextResponse.json({ success: true, attachmentId: safeAttachmentId, meta })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to store attachment"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

