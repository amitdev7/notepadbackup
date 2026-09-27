import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

export const dynamic = "force-dynamic"

function getAttachmentsDir(): string {
  const base = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "/tmp" : process.cwd()
  return path.join(base, ".zenithsui_data", "attachments")
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const safeId = path.basename(id)
  const dir = getAttachmentsDir()
  const filePath = path.join(dir, safeId)
  const metaPath = path.join(dir, `${safeId}.meta.json`)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  let mimeType = "application/octet-stream"
  let name = safeId
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
      if (meta.mimeType) mimeType = meta.mimeType
      if (meta.name) name = meta.name
    } catch {}
  }

  const fileBuffer = fs.readFileSync(filePath)
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
      "Cache-Control": "public, max-age=86400",
    },
  })
}
