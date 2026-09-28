import { NextRequest, NextResponse } from "next/server"
import { verifySharePassword } from "@/lib/server-share"

export const dynamic = "force-dynamic"

function getSessionId(req: NextRequest): string {
  return (
    req.headers.get("x-session-id") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "zenithsui-share-session"
  )
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params
  const sessionId = getSessionId(req)

  try {
    const body = await req.json()
    const password = body?.password as string | undefined

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const result = await verifySharePassword(publicId, password, sessionId)

    if (!result.success) {
      const status = result.locked ? 429 : 401
      return NextResponse.json(
        {
          error: result.error || "Incorrect password",
          locked: result.locked,
          attemptsLeft: result.attemptsLeft,
        },
        { status }
      )
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      role: "editor",
    })
  } catch (err) {
    console.error("[Share Auth API] Error verifying share password:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
