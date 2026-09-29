import { NextResponse } from "next/server"
import { createClient } from "../../../lib/supabase/server"
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../../lib/cloud/notifications"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const notifications = await listNotifications(user.id, 50)
  return NextResponse.json({ ok: true, data: notifications })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { notificationId, markAll } = body

  if (markAll) {
    const success = await markAllNotificationsRead(user.id)
    return NextResponse.json({ ok: success })
  }

  if (notificationId) {
    const success = await markNotificationRead(notificationId, user.id)
    return NextResponse.json({ ok: success })
  }

  return NextResponse.json({ ok: false, error: "Missing notificationId or markAll flag" }, { status: 400 })
}
