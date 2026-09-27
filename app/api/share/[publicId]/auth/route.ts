import { NextRequest, NextResponse } from "next/server"
import { verifySharePassword } from "@/lib/server-share"

export const dynamic = "force-dynamic"

function getClientKey(req: NextRequest, publicId: string): string {
  // Rate-limit keyed by client IP + publicId (not client-supplied session alone).
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown-ip"
  return `${ip}:${publicId}`
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params
  const rateKey = getClientKey(req, publicId)

  try {
    const body = await req.json()
    const password = body?.password as string | undefined

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const result = await verifySharePassword(publicId, password, rateKey)

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
