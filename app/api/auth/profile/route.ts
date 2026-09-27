import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedUser,
  updateUserProfile,
} from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { displayName, avatarColor } = body

    const result = await updateUserProfile({
      userId: user.id,
      displayName,
      avatarColor,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: result.user })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
