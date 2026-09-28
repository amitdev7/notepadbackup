"use client"

// ---------------------------------------------------------------------------
// Zenithsui Teams Client API
// ---------------------------------------------------------------------------

import type {
  TeamRecord,
  TeamRole,
  TeamMember,
  TeamInvitation,
  TeamClientSummary,
} from "./team-types"
import { getClientSessionId } from "./database"

export interface TeamDetailResponse {
  id: string
  name: string
  slug: string
  description?: string
  ownerId: string
  databaseIds: string[]
  members: TeamMember[]
  invitations: TeamInvitation[]
  currentUserRole: TeamRole
  createdAt: number
  updatedAt: number
}

/**
 * Fetch all teams the current user has access to
 */
export async function listTeamsClient(): Promise<TeamClientSummary[]> {
  try {
    const res = await fetch("/api/teams", {
      method: "GET",
      headers: {
        "x-session-id": getClientSessionId(),
      },
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.teams)) {
        return data.teams as TeamClientSummary[]
      }
    }
  } catch (err) {
    console.warn("[TeamsClient] Failed to list teams:", err)
  }
  return []
}

/**
 * Get detailed information about a team (members, settings, invitations)
 */
export async function getTeamDetailsClient(teamId: string): Promise<TeamDetailResponse | null> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, {
      method: "GET",
      headers: {
        "x-session-id": getClientSessionId(),
      },
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.team) {
        return data.team as TeamDetailResponse
      }
    }
  } catch (err) {
    console.warn(`[TeamsClient] Failed to get team details for ${teamId}:`, err)
  }
  return null
}

/**
 * Create a new team
 */
export async function createTeamClient(
  name: string,
  description?: string
): Promise<{ success: boolean; team?: TeamRecord; error?: string }> {
  try {
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ name, description }),
    })
    const data = await res.json()
    if (res.ok && data.success && data.team) {
      return { success: true, team: data.team }
    }
    return { success: false, error: data.error || "Failed to create team" }
  } catch {
    return { success: false, error: "Network error creating team" }
  }
}

/**
 * Update team information (name, description, slug)
 */
export async function updateTeamClient(
  teamId: string,
  updates: { name?: string; description?: string; slug?: string }
): Promise<{ success: boolean; team?: TeamRecord; error?: string }> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (res.ok && data.success && data.team) {
      return { success: true, team: data.team }
    }
    return { success: false, error: data.error || "Failed to update team" }
  } catch {
    return { success: false, error: "Network error updating team" }
  }
}

/**
 * Delete a team (Requires Owner)
 */
export async function deleteTeamClient(teamId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, {
      method: "DELETE",
      headers: {
        "x-session-id": getClientSessionId(),
      },
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true }
    }
    return { success: false, error: data.error || "Failed to delete team" }
  } catch {
    return { success: false, error: "Network error deleting team" }
  }
}

/**
 * Add or direct-invite member
 */
export async function addTeamMemberClient(
  teamId: string,
  member: { name: string; email?: string; role: TeamRole }
): Promise<{ success: boolean; members?: TeamMember[]; error?: string }> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify(member),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, members: data.members }
    }
    return { success: false, error: data.error || "Failed to add member" }
  } catch {
    return { success: false, error: "Network error adding member" }
  }
}

/**
 * Change member role in team
 */
export async function updateTeamMemberRoleClient(
  teamId: string,
  targetUserId: string,
  role: TeamRole
): Promise<{ success: boolean; members?: TeamMember[]; error?: string }> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/members`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ targetUserId, role }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, members: data.members }
    }
    return { success: false, error: data.error || "Failed to change role" }
  } catch {
    return { success: false, error: "Network error updating member role" }
  }
}

/**
 * Remove member from team
 */
export async function removeTeamMemberClient(
  teamId: string,
  targetUserId: string
): Promise<{ success: boolean; members?: TeamMember[]; error?: string }> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/members`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ targetUserId }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, members: data.members }
    }
    return { success: false, error: data.error || "Failed to remove member" }
  } catch {
    return { success: false, error: "Network error removing member" }
  }
}

/**
 * Send an email invitation
 */
export async function inviteTeamMemberClient(
  teamId: string,
  email: string,
  role: TeamRole
): Promise<{ success: boolean; invitation?: TeamInvitation; error?: string }> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    if (res.ok && data.success && data.invitation) {
      return { success: true, invitation: data.invitation }
    }
    return { success: false, error: data.error || "Failed to create invitation" }
  } catch {
    return { success: false, error: "Network error creating invitation" }
  }
}

/**
 * Revoke invitation
 */
export async function revokeTeamInvitationClient(
  teamId: string,
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/invitations`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ invitationId }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true }
    }
    return { success: false, error: data.error || "Failed to revoke invitation" }
  } catch {
    return { success: false, error: "Network error revoking invitation" }
  }
}

/**
 * Fetch invitation details by token
 */
export async function getInvitationByTokenClient(token: string): Promise<{
  success: boolean
  invitation?: {
    id: string
    teamId: string
    teamName: string
    recipientEmail: string
    role: TeamRole
    inviterName: string
    status: string
    expiresAt: number
    isExpired: boolean
  }
  error?: string
}> {
  try {
    const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
      method: "GET",
      cache: "no-store",
    })
    const data = await res.json()
    if (res.ok && data.success && data.invitation) {
      return { success: true, invitation: data.invitation }
    }
    return { success: false, error: data.error || "Invitation not found" }
  } catch {
    return { success: false, error: "Network error resolving invitation" }
  }
}

/**
 * Accept or decline an invitation
 */
export async function respondInvitationClient(
  token: string,
  action: "accept" | "decline",
  name?: string,
  email?: string
): Promise<{ success: boolean; teamId?: string; error?: string }> {
  try {
    const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getClientSessionId(),
      },
      body: JSON.stringify({ action, name, email }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      return { success: true, teamId: data.teamId }
    }
    return { success: false, error: data.error || `Failed to ${action} invitation` }
  } catch {
    return { success: false, error: `Network error responding to invitation` }
  }
}
