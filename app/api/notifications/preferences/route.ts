import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../../../lib/cloud/notifications"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const prefs = await getNotificationPreferences(user.id)
  return NextResponse.json({ ok: true, data: prefs })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  try {
    const updated = await updateNotificationPreferences(user.id, body)
    return NextResponse.json({ ok: true, data: updated })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
