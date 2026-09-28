// ---------------------------------------------------------------------------
// Server-Side Teams & Workspace Management Engine
// ---------------------------------------------------------------------------

import { randomBytes } from "crypto"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"
import type {
  TeamRecord,
  TeamRole,
  TeamMember,
  TeamInvitation,
  TeamClientSummary,
} from "./team-types"

export type {
  TeamRecord,
  TeamRole,
  TeamMember,
  TeamInvitation,
  TeamClientSummary,
}

// In-memory server storage for teams and invitations
const serverTeamRegistry = new Map<string, TeamRecord>()

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return base || `team-${randomBytes(3).toString("hex")}`
}

/**
 * Persist teams registry to disk snapshot.
 */
export function persistTeams(): void {
  try {
    writeJsonSnapshot("teams.json", Array.from(serverTeamRegistry.values()))
  } catch (err) {
    console.warn("[Teams] Failed to persist teams:", err)
  }
}

function initDefaultTeams() {
  if (serverTeamRegistry.size === 0) {
    // Attempt hydration from persistent snapshot first
    const saved = readJsonSnapshot<TeamRecord[]>("teams.json", [])
    if (saved && saved.length > 0) {
      for (const t of saved) {
        serverTeamRegistry.set(t.id, t)
      }
      return
    }

    // 1. Product Design Team (contains primary-db and nezukos-box)
    serverTeamRegistry.set("team-design", {
      id: "team-design",
      name: "Product Design Team",
      slug: "product-design-team",
      description: "Core product design team for wireframing, architecture, and UI flows.",
      ownerId: "owner_nezuko",
      databaseIds: ["nezukos-box", "primary-db"],
      createdAt: Date.now() - 30 * 86400000,
      updatedAt: Date.now() - 2 * 86400000,
      members: [
        {
          userId: "owner_nezuko",
          name: "Workspace Admin",
          email: "admin@zenithsui.com",
          role: "owner",
          joinedAt: Date.now() - 30 * 86400000,
        },
        {
          userId: "team_editor_1",
          name: "Design Lead",
          email: "designer@zenithsui.com",
          role: "admin",
          joinedAt: Date.now() - 20 * 86400000,
        },
        {
          userId: "team_member_jordan",
          name: "Jordan (UI Designer)",
          email: "jordan@zenithsui.com",
          role: "member",
          joinedAt: Date.now() - 10 * 86400000,
        },
        {
          userId: "team_viewer_chris",
          name: "Chris (Stakeholder)",
          email: "chris@zenithsui.com",
          role: "viewer",
          joinedAt: Date.now() - 5 * 86400000,
        },
      ],
      invitations: [],
    })

    // 2. Client Project Team
    serverTeamRegistry.set("team-client", {
      id: "team-client",
      name: "Client Project Workspace",
      slug: "client-project",
      description: "Dedicated collaboration space for client reviews and shared mockups.",
      ownerId: "owner_primary",
      databaseIds: [],
      createdAt: Date.now() - 15 * 86400000,
      updatedAt: Date.now() - 1 * 86400000,
      members: [
        {
          userId: "owner_primary",
          name: "Community Admin",
          email: "community@zenithsui.com",
          role: "owner",
          joinedAt: Date.now() - 15 * 86400000,
        },
      ],
      invitations: [],
    })

    persistTeams()
  }
}

// Ensure default teams are initialized
initDefaultTeams()

/**
 * Get a team record by ID or slug
 */
export function getTeam(teamIdOrSlug: string): TeamRecord | null {
  initDefaultTeams()
  if (serverTeamRegistry.has(teamIdOrSlug)) {
    return serverTeamRegistry.get(teamIdOrSlug)!
  }
  for (const team of serverTeamRegistry.values()) {
    if (team.slug === teamIdOrSlug) {
      return team
    }
  }
  return null
}

export const getTeamRecord = getTeam

/**
 * List all raw team records
 */
export function listTeamRecords(): TeamRecord[] {
  initDefaultTeams()
  return Array.from(serverTeamRegistry.values())
}

/**
 * List all teams accessible to a given user
 */
export function listUserTeams(userId: string): TeamClientSummary[] {
  initDefaultTeams()
  const results: TeamClientSummary[] = []

  for (const team of serverTeamRegistry.values()) {
    // Check if user is explicit member or owner
    const member = team.members.find(
      (m) => m.userId === userId || (m.email && m.email === userId)
    )

    // For open/demo environments, any user can participate in default teams as editor/member
    // unless strictly restricted
    let role: TeamRole | null = member ? member.role : null
    if (!role && team.ownerId === userId) {
      role = "owner"
    }

    // Default fallback: If user has no specific membership in public demo teams, grant "member" role
    if (!role && (team.id === "team-design" || team.id === "team-client")) {
      role = "member"
    }

    if (role) {
      results.push({
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        role,
        memberCount: team.members.length,
        databaseCount: team.databaseIds.length,
        isOwner: role === "owner",
        createdAt: team.createdAt,
      })
    }
  }

  return results
}

/**
 * Check a user's role in a team
 */
export function getUserTeamRole(teamId: string, userId: string): TeamRole | null {
  const team = getTeam(teamId)
  if (!team) return null

  if (team.ownerId === userId) return "owner"

  const member = team.members.find(
    (m) => m.userId === userId || (m.email && m.email === userId)
  )
  if (member) return member.role

  // Default demo access for seeded teams
  if (team.id === "team-design" || team.id === "team-client") {
    return "member"
  }

  return null
}

/**
 * Check if a user has at least the required role in a team
 */
export function checkTeamAccess(
  teamId: string,
  userId: string,
  requiredRole: TeamRole
): { allowed: boolean; role: TeamRole | null; reason?: string } {
  const role = getUserTeamRole(teamId, userId)
  if (!role) {
    return { allowed: false, role: null, reason: "Access denied. You are not a member of this team." }
  }

  const roleRank: Record<TeamRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
  }

  if (roleRank[role] >= roleRank[requiredRole]) {
    return { allowed: true, role }
  }

  return {
    allowed: false,
    role,
    reason: `Insufficient team permissions. '${requiredRole}' role required (your role: '${role}').`,
  }
}

/**
 * Create a new team
 */
export function createTeam(
  name: string,
  description: string,
  ownerId: string,
  ownerName: string,
  ownerEmail?: string
): TeamRecord {
  initDefaultTeams()
  const teamId = `team-${Date.now()}-${randomBytes(3).toString("hex")}`
  let slug = generateSlug(name)

  // Ensure unique slug
  let counter = 1
  while (getTeam(slug)) {
    slug = `${generateSlug(name)}-${counter}`
    counter++
  }

  const newTeam: TeamRecord = {
    id: teamId,
    name: name.trim() || "Untitled Team",
    slug,
    description: description.trim() || "Team workspace for collaborative design.",
    ownerId,
    databaseIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    members: [
      {
        userId: ownerId,
        name: ownerName || "Team Owner",
        email: ownerEmail,
        role: "owner",
        joinedAt: Date.now(),
      },
    ],
    invitations: [],
  }

  serverTeamRegistry.set(teamId, newTeam)
  persistTeams()
  return newTeam
}

/**
 * Update team information (Requires admin or owner)
 */
export function updateTeam(
  teamId: string,
  requesterUserId: string,
  updates: { name?: string; description?: string; slug?: string }
): { success: boolean; team?: TeamRecord; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  if (updates.name && updates.name.trim()) {
    team.name = updates.name.trim()
  }

  if (updates.description !== undefined) {
    team.description = updates.description.trim()
  }

  if (updates.slug && updates.slug.trim() && updates.slug !== team.slug) {
    const desiredSlug = generateSlug(updates.slug)
    const existing = getTeam(desiredSlug)
    if (existing && existing.id !== team.id) {
      return { success: false, error: "Slug is already in use by another team." }
    }
    team.slug = desiredSlug
  }

  team.updatedAt = Date.now()
  persistTeams()
  return { success: true, team }
}

/**
 * Delete a team (Requires owner)
 */
export function deleteTeam(
  teamId: string,
  requesterUserId: string
): { success: boolean; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "owner")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  serverTeamRegistry.delete(team.id)
  persistTeams()
  return { success: true }
}

/**
 * Add or direct-invite a member to a team (Requires admin or owner)
 */
export function addOrUpdateTeamMember(
  teamId: string,
  requesterUserId: string,
  member: { userId?: string; email?: string; name: string; role: TeamRole }
): { success: boolean; members?: TeamMember[]; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  // Admins cannot grant "owner" role
  if (member.role === "owner" && access.role !== "owner") {
    return { success: false, error: "Only team owners can assign the Owner role." }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  const targetId = member.userId || `user_${Date.now()}_${randomBytes(3).toString("hex")}`
  const existingIdx = team.members.findIndex(
    (m) => m.userId === targetId || (member.email && m.email === member.email)
  )

  if (existingIdx >= 0) {
    team.members[existingIdx].role = member.role
    team.members[existingIdx].name = member.name || team.members[existingIdx].name
    if (member.email) team.members[existingIdx].email = member.email
  } else {
    team.members.push({
      userId: targetId,
      name: member.name || "Team Member",
      email: member.email,
      role: member.role,
      joinedAt: Date.now(),
    })
  }

  team.updatedAt = Date.now()
  persistTeams()
  return { success: true, members: [...team.members] }
}

/**
 * Change a team member's role (Requires admin or owner)
 */
export function changeTeamMemberRole(
  teamId: string,
  requesterUserId: string,
  targetUserId: string,
  newRole: TeamRole
): { success: boolean; members?: TeamMember[]; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  if (newRole === "owner" && access.role !== "owner") {
    return { success: false, error: "Only team owners can promote members to Owner." }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  const member = team.members.find((m) => m.userId === targetUserId)
  if (!member) {
    return { success: false, error: "Member not found in team" }
  }

  // Prevent demoting the last owner
  if (member.role === "owner" && newRole !== "owner") {
    const ownerCount = team.members.filter((m) => m.role === "owner").length
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot demote the only team owner. Transfer ownership first." }
    }
  }

  member.role = newRole
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true, members: [...team.members] }
}

/**
 * Remove a member from a team (Requires admin or owner)
 */
export function removeTeamMember(
  teamId: string,
  requesterUserId: string,
  targetUserId: string
): { success: boolean; members?: TeamMember[]; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  const memberIdx = team.members.findIndex((m) => m.userId === targetUserId)
  if (memberIdx === -1) {
    return { success: false, error: "Member not found in team" }
  }

  const targetMember = team.members[memberIdx]

  // Admins cannot remove owners or other admins
  if (targetMember.role === "owner" && access.role !== "owner") {
    return { success: false, error: "Only team owners can remove other owners." }
  }

  if (targetMember.role === "owner") {
    const ownerCount = team.members.filter((m) => m.role === "owner").length
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot remove the only team owner." }
    }
  }

  team.members.splice(memberIdx, 1)
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true, members: [...team.members] }
}

/**
 * Transfer team ownership to another member (Requires owner)
 */
export function transferTeamOwnership(
  teamId: string,
  requesterUserId: string,
  newOwnerUserId: string
): { success: boolean; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "owner")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  const newOwner = team.members.find((m) => m.userId === newOwnerUserId)
  if (!newOwner) {
    return { success: false, error: "Target user is not a member of this team." }
  }

  newOwner.role = "owner"
  team.ownerId = newOwnerUserId
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true }
}

/**
 * Create a team invitation
 */
export function createTeamInvitation(
  teamId: string,
  requesterUserId: string,
  requesterName: string,
  recipientEmail: string,
  role: TeamRole
): { success: boolean; invitation?: TeamInvitation; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  if (role === "owner" && access.role !== "owner") {
    return { success: false, error: "Only team owners can invite new owners." }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  // Check if recipient is already a member
  const existingMember = team.members.find((m) => m.email === recipientEmail)
  if (existingMember) {
    return { success: false, error: `${recipientEmail} is already a member of this team.` }
  }

  const token = randomBytes(24).toString("hex")
  const invitation: TeamInvitation = {
    id: `inv_${Date.now()}_${randomBytes(4).toString("hex")}`,
    teamId: team.id,
    teamName: team.name,
    recipientEmail: recipientEmail.trim().toLowerCase(),
    role,
    inviterId: requesterUserId,
    inviterName: requesterName || "Team Administrator",
    token,
    status: "pending",
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 86400000, // 7 days expiration
  }

  team.invitations.push(invitation)
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true, invitation }
}

/**
 * Revoke an invitation (Requires admin or owner)
 */
export function revokeTeamInvitation(
  teamId: string,
  requesterUserId: string,
  invitationId: string
): { success: boolean; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  const inv = team.invitations.find((i) => i.id === invitationId)
  if (!inv) {
    return { success: false, error: "Invitation not found" }
  }

  inv.status = "revoked"
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true }
}

/**
 * Look up invitation by secure token
 */
export function getInvitationByToken(token: string): TeamInvitation | null {
  initDefaultTeams()
  for (const team of serverTeamRegistry.values()) {
    const inv = team.invitations.find((i) => i.token === token)
    if (inv) {
      if (inv.status === "pending" && Date.now() > inv.expiresAt) {
        inv.status = "expired"
        persistTeams()
      }
      return inv
    }
  }
  return null
}

/**
 * Accept a team invitation
 */
export function acceptTeamInvitation(
  token: string,
  userId: string,
  userName: string,
  userEmail?: string
): { success: boolean; teamId?: string; error?: string } {
  const inv = getInvitationByToken(token)
  if (!inv) {
    return { success: false, error: "Invitation not found or invalid token." }
  }

  if (inv.status === "expired" || Date.now() > inv.expiresAt) {
    inv.status = "expired"
    persistTeams()
    return { success: false, error: "This invitation has expired." }
  }

  if (inv.status === "revoked") {
    return { success: false, error: "This invitation was revoked by the team administrator." }
  }

  if (inv.status === "accepted") {
    return { success: false, error: "This invitation has already been accepted." }
  }

  const team = getTeam(inv.teamId)
  if (!team) {
    return { success: false, error: "The team associated with this invitation no longer exists." }
  }

  // Add user to team members
  const existingIdx = team.members.findIndex((m) => m.userId === userId || m.email === inv.recipientEmail)
  if (existingIdx >= 0) {
    team.members[existingIdx].role = inv.role
    team.members[existingIdx].name = userName || team.members[existingIdx].name
  } else {
    team.members.push({
      userId,
      name: userName || "New Member",
      email: userEmail || inv.recipientEmail,
      role: inv.role,
      joinedAt: Date.now(),
    })
  }

  inv.status = "accepted"
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true, teamId: team.id }
}

/**
 * Decline a team invitation
 */
export function declineTeamInvitation(token: string): { success: boolean; error?: string } {
  const inv = getInvitationByToken(token)
  if (!inv) {
    return { success: false, error: "Invitation not found" }
  }
  inv.status = "revoked"
  persistTeams()
  return { success: true }
}

/**
 * Find which team owns or contains a database
 */
export function getTeamForDatabase(dbId: string): TeamRecord | null {
  initDefaultTeams()
  for (const team of serverTeamRegistry.values()) {
    if (team.databaseIds.includes(dbId)) {
      return team
    }
  }
  return null
}

/**
 * Attach a database to a team (Requires admin or owner)
 */
export function attachDatabaseToTeam(
  teamId: string,
  dbId: string,
  requesterUserId: string
): { success: boolean; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  // Detach from any prior team first
  for (const t of serverTeamRegistry.values()) {
    t.databaseIds = t.databaseIds.filter((id) => id !== dbId)
  }

  team.databaseIds.push(dbId)
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true }
}

/**
 * Detach a database from a team (Requires admin or owner)
 */
export function detachDatabaseFromTeam(
  teamId: string,
  dbId: string,
  requesterUserId: string
): { success: boolean; error?: string } {
  const access = checkTeamAccess(teamId, requesterUserId, "admin")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const team = getTeam(teamId)
  if (!team) {
    return { success: false, error: "Team not found" }
  }

  team.databaseIds = team.databaseIds.filter((id) => id !== dbId)
  team.updatedAt = Date.now()
  persistTeams()
  return { success: true }
}
