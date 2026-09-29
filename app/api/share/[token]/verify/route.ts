import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "../../../../../lib/supabase/server"
import { hashShareToken, verifySharePassword } from "../../../../../lib/security/share-crypto"
import {
  createShareSessionToken,
  getShareSessionCookieName,
  checkSharePasswordRateLimit,
  recordSharePasswordAttempt,
} from "../../../../../lib/security/share-session"

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 })
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
  const rateLimitKey = `${clientIp}:${token}`

  // 1. Check rate limit
  const rateLimitCheck = checkSharePasswordRateLimit(rateLimitKey)
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many failed attempts. Please retry in ${rateLimitCheck.retryAfterSeconds} seconds.`,
      },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { password } = body

  if (!password || typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Password is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const tokenHash = await hashShareToken(token)

  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("id, document_id, password_hash, password_salt, is_active, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .single()

  if (linkError || !link || !link.password_hash || !link.password_salt) {
    recordSharePasswordAttempt(rateLimitKey, false)
    return NextResponse.json({ ok: false, error: "Invalid share link or password" }, { status: 401 })
  }

  // Verify PBKDF2 hash
  const matches = await verifySharePassword(password, link.password_hash, link.password_salt)

  if (!matches) {
    const attemptResult = recordSharePasswordAttempt(rateLimitKey, false)
    return NextResponse.json(
      {
        ok: false,
        error: "Incorrect password",
        remainingAttempts: attemptResult.remainingAttempts,
      },
      { status: 401 }
    )
  }

  // Password correct: reset rate limit & issue session token
  recordSharePasswordAttempt(rateLimitKey, true)
  const sessionToken = await createShareSessionToken(link.id)

  const cookieStore = await cookies()
  const cookieName = getShareSessionCookieName(link.id)

  cookieStore.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  })

  return NextResponse.json({ ok: true })
}
