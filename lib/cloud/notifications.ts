// ---------------------------------------------------------------------------
// Zenithsui Sharing Notifications Service
//
// In-app sharing notifications for invitations, access updates, and link expiration.
//
// CRITICAL INVARIANT: ZERO comment notifications!
// Allowed types: invite_received, access_changed, access_removed, invite_accepted, link_expiring.
// ---------------------------------------------------------------------------

import type {
  NotificationRecord,
  NotificationPreferencesRecord,
  SharingNotificationType,
} from "../db/types"
import { createClient as createServerClient } from "../supabase/server"

export interface DispatchNotificationOptions {
  userId: string
  documentId?: string | null
  actorId?: string | null
  type: SharingNotificationType
  data?: Record<string, unknown>
}

/**
 * Dispatches an in-app sharing notification if user preference permits it.
 */
export async function dispatchSharingNotification(
  options: DispatchNotificationOptions,
  client?: any
): Promise<NotificationRecord | null> {
  const supabase = client ?? (await createServerClient())

  // Check user preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", options.userId)
    .maybeSingle()

  if (prefs) {
    const prefKey = `in_app_${options.type}` as keyof NotificationPreferencesRecord
    if (prefs[prefKey] === false) {
      return null // User opted out of this notification type
    }
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: options.userId,
      document_id: options.documentId || null,
      actor_id: options.actorId || null,
      type: options.type,
      data: options.data || {},
      is_read: false,
    })
    .select("*")
    .single()

  if (error || !data) {
    return null
  }

  return data as NotificationRecord
}

/**
 * Lists notifications for a user, sorted descending by creation time.
 */
export async function listNotifications(
  userId: string,
  limit = 30,
  client?: any
): Promise<NotificationRecord[]> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as NotificationRecord[]
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string,
  client?: any
): Promise<boolean> {
  const supabase = client ?? (await createServerClient())

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)

  return !error
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsRead(
  userId: string,
  client?: any
): Promise<boolean> {
  const supabase = client ?? (await createServerClient())

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  return !error
}

/**
 * Fetches notification preferences for a user, creating default preferences if missing.
 */
export async function getNotificationPreferences(
  userId: string,
  client?: any
): Promise<NotificationPreferencesRecord> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (data) return data as NotificationPreferencesRecord

  // Create defaults
  const defaults: Partial<NotificationPreferencesRecord> & { user_id: string } = {
    user_id: userId,
    email_invite_received: true,
    email_access_changed: true,
    email_access_removed: true,
    email_invite_accepted: true,
    email_link_expiring: true,
    in_app_invite_received: true,
    in_app_access_changed: true,
    in_app_access_removed: true,
    in_app_invite_accepted: true,
    in_app_link_expiring: true,
  }

  const { data: created } = await supabase
    .from("notification_preferences")
    .upsert(defaults)
    .select("*")
    .single()

  return (created || defaults) as NotificationPreferencesRecord
}

/**
 * Updates notification preferences for a user.
 */
export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferencesRecord>,
  client?: any
): Promise<NotificationPreferencesRecord> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from("notification_preferences")
    .update({
      ...prefs,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Failed to update notification preferences: ${error?.message}`)
  }

  return data as NotificationPreferencesRecord
}
