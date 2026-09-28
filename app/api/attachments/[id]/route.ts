import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { getAttachment } from "@/lib/server-attachments"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Pre-unification uploads lived as bare `<id>` + `<id>.meta.json` files. */
async function getLegacyAttachment(id: string): Promise<{ buffer: Buffer; mimeType: string; name: string } | null> {
  try {
    const safeId = path.basename(id)
    const base = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "/tmp" : process.cwd()
    const altBase = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? os.tmpdir() : process.cwd()
    for (const root of [base, altBase]) {
      const dir = path.join(root, ".zenithsui_data", "attachments")
      const filePath = path.join(dir, safeId)
      if (!fs.existsSync(filePath)) continue
      let mimeType = "application/octet-stream"
      let name = safeId
      const metaPath = path.join(dir, `${safeId}.meta.json`)
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
          if (meta.mimeType) mimeType = meta.mimeType
          if (meta.name) name = meta.name
        } catch { /* ignore corrupt meta */ }
      }
      return { buffer: fs.readFileSync(filePath), mimeType, name }
    }
  } catch { /* ignore */ }
  return null
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const att = await getAttachment(id).catch(() => null)
  if (att) {
    return new NextResponse(new Uint8Array(att.buffer), {
      status: 200,
      headers: {
        "Content-Type": att.meta.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(att.meta.filename || id)}"`,
        "Cache-Control": "public, max-age=86400",
      },
    })
  }

  const legacy = await getLegacyAttachment(id)
  if (!legacy) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }
  return new NextResponse(new Uint8Array(legacy.buffer), {
    status: 200,
    headers: {
      "Content-Type": legacy.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(legacy.name)}"`,
      "Cache-Control": "public, max-age=86400",
    },
  })
}
