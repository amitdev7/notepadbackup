import { NextRequest, NextResponse } from "next/server"
import {
  recoverAccountWithCode,
  AUTH_COOKIE_NAME,
} from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, recoveryCode, newPassword } = body

    if (!username || !recoveryCode || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Username, recovery code, and new password are required." },
        { status: 400 }
      )
    }

    const result = await recoverAccountWithCode({ username, recoveryCode, newPassword })

    if (!result.success || !result.token) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    const res = NextResponse.json({
      success: true,
      user: result.user,
    })

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
