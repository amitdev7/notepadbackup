import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { randomBytes } from "crypto"

export const dynamic = "force-dynamic"

function getAttachmentsDir(): string {
  const base = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "/tmp" : process.cwd()
  const dir = path.join(base, ".zenithsui_data", "attachments")
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const id = `att-${randomBytes(8).toString("hex")}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const originalName = file.name || "attachment"
    const mimeType = file.type || "application/octet-stream"

    const dir = getAttachmentsDir()
    const filePath = path.join(dir, id)
    const metaPath = path.join(dir, `${id}.meta.json`)

    fs.writeFileSync(filePath, buffer)
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        id,
        name: originalName,
        fileSize: buffer.length,
        mimeType,
        uploadedAt: Date.now(),
      })
    )

    return NextResponse.json({
      success: true,
      attachment: {
        id,
        name: originalName,
        fileSize: buffer.length,
        mimeType,
        url: `/api/attachments/${id}`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload attachment" }, { status: 500 })
  }
}

