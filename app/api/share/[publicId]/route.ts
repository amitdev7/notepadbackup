import { NextRequest, NextResponse } from "next/server"
import { resolvePublicShare, savePublicShareSnapshot } from "@/lib/server-share"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const result = await resolvePublicShare(publicId, userId)

  if (!result.allowed) {
    return NextResponse.json(
      { error: result.error || "Access denied" },
      { status: result.status }
    )
  }

  return NextResponse.json({
    success: true,
    ...result.payload,
  })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params
    const body = await req.json().catch(() => ({}))
    const { doc, mode } = body

    if (!doc || typeof doc !== "object") {
      return NextResponse.json({ error: "Missing document payload" }, { status: 400 })
    }

    const saved = await savePublicShareSnapshot(publicId, doc, mode || "public-view")
    return NextResponse.json({ success: saved })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    )
  }
}
