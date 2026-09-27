import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedUser,
  toClientSafeUser,
  destroySession,
  AUTH_COOKIE_NAME,
} from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null })
    }
    return NextResponse.json({ authenticated: true, user: toClientSafeUser(user) })
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, user: null, error: err?.message })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get(AUTH_COOKIE_NAME)
    if (cookie?.value) {
      destroySession(cookie.value)
    }
    const res = NextResponse.json({ success: true })
    res.cookies.set(AUTH_COOKIE_NAME, "", {
      path: "/",
      httpOnly: true,
      expires: new Date(0),
      sameSite: "lax",
    })
    return res
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}
