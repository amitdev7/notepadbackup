import { NextRequest, NextResponse } from "next/server"
import {
  authenticateUser,
  AUTH_COOKIE_NAME,
} from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      )
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1"
    const result = await authenticateUser(username, password, ip)

    if (!result.success || !result.token) {
      return NextResponse.json(
        { success: false, error: result.error, locked: result.locked },
        { status: result.locked ? 429 : 401 }
      )
    }

    const res = NextResponse.json({
      success: true,
      user: result.user,
    })

    // Set HTTP-only session cookie for 30 days
    res.cookies.set(AUTH_COOKIE_NAME, result.token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    })

    return res
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

