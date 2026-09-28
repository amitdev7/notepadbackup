import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { saveAttachment } from "@/lib/server-attachments"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const id = `att-${randomBytes(8).toString("hex")}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const meta = await saveAttachment(id, buffer, {
      filename: file.name || "attachment",
      contentType: file.type || "application/octet-stream",
    })

    return NextResponse.json({
      success: true,
      attachment: {
        id: meta.id,
        name: meta.filename,
        fileSize: meta.sizeBytes,
        mimeType: meta.contentType,
        url: `/api/attachments/${meta.id}`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload attachment" }, { status: 500 })
  }
}
