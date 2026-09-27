// ---------------------------------------------------------------------------
// Database Access Control, Membership, and Role-Based Authorization
//
// Roles:
//   - "owner": Full access. Can create/edit/delete pages, manage members, and configure database.
//   - "editor": Can create, edit, save pages, upload attachments, and create versions.
//   - "viewer": Read-only access. Can view pages, download exports, and view versions.
// ---------------------------------------------------------------------------

import { getTeamForDatabase, getUserTeamRole } from "./server-teams"
import { readJsonSnapshot, writeJsonSnapshot } from "./server-storage"

export type DatabaseRole = "owner" | "editor" | "viewer"

export interface DatabaseMember {
  userId: string
  email?: string
  name: string
  role: DatabaseRole
  addedAt: number
}

export interface DatabaseRecord {
  id: string
  name: string
  description: string
  ownerId: string
  members: DatabaseMember[]
  isPublic?: boolean
  teamId?: string
  createdAt: number
}

// In-memory registry of database records and membership on the server.
const serverDatabaseRegistry = new Map<string, DatabaseRecord>()

export function persistDatabases(): void {
  try {
    writeJsonSnapshot("databases.json", Array.from(serverDatabaseRegistry.values()))
  } catch (err) {
    console.warn("[DatabaseAuth] Failed to persist databases:", err)
  }
}

// Initialize default databases with owners and members
function initDefaultDatabases() {
  if (serverDatabaseRegistry.size === 0) {
    const saved = readJsonSnapshot<DatabaseRecord[]>("databases.json", [])
    if (saved && saved.length > 0) {
      for (const d of saved) {
        serverDatabaseRegistry.set(d.id, d)
      }
      return
    }
  }

  if (!serverDatabaseRegistry.has("nezukos-box")) {
    serverDatabaseRegistry.set("nezukos-box", {
      id: "nezukos-box",
      name: "Nezuko's Box",
      description: "Central database and asset storage for collaborative wireframes.",
      ownerId: "owner_nezuko",
      createdAt: Date.now() - 30 * 86400000,
      isPublic: true,
      members: [
        {
          userId: "owner_nezuko",
          name: "Workspace Admin",
          email: "admin@zenithsui.com",
          role: "owner",
          addedAt: Date.now() - 30 * 86400000,
        },
        {
          userId: "team_editor_1",
          name: "Design Lead",
          email: "designer@zenithsui.com",
          role: "editor",
          addedAt: Date.now() - 15 * 86400000,
        },
      ],
    })
  }

  if (!serverDatabaseRegistry.has("primary-db")) {
    serverDatabaseRegistry.set("primary-db", {
      id: "primary-db",
      name: "Zenithsui Community Cloud",
      description: "Shared workspace database for collaborative wireframes and community files.",
      ownerId: "owner_primary",
      createdAt: Date.now() - 14 * 86400000,
      isPublic: true,
      members: [
        {
          userId: "owner_primary",
          name: "Community Admin",
          email: "community@zenithsui.com",
          role: "owner",
          addedAt: Date.now() - 14 * 86400000,
        },
      ],
    })
  }

  if (!serverDatabaseRegistry.has("zenithsui-cloud")) {
    serverDatabaseRegistry.set("zenithsui-cloud", {
      id: "zenithsui-cloud",
      name: "Zenithsui Community Cloud",
      description: "Default fast cloud storage for collaborative wireframes and scratchpads.",
      ownerId: "owner_primary",
      createdAt: Date.now() - 14 * 86400000,
      isPublic: true,
      members: [
        {
          userId: "owner_primary",
          name: "Community Admin",
          email: "community@zenithsui.com",
          role: "owner",
          addedAt: Date.now() - 14 * 86400000,
        },
      ],
    })
  }
}

// Ensure default databases are seeded
initDefaultDatabases()

/**
 * Get an existing database record. Unknown/unconfigured dbIds return null (DENY by default).
 */
export function getDatabaseRecord(dbId: string): DatabaseRecord | null {
  initDefaultDatabases()
  const record = serverDatabaseRegistry.get(dbId)
  if (record) return record
  // Unknown/unconfigured dbIds default DENY — no auto-created public records.
  return null
}

/**
 * Determine the effective role for a given user in a database
 * Follows hierarchy: Team Role -> Database Member Role -> Public/Personal Default
 */
export function getEffectiveUserRole(dbId: string, userId: string): DatabaseRole | null {
  const db = getDatabaseRecord(dbId)
  if (!db) return null
  
  // 1. Check if database belongs to a team
  const team = getTeamForDatabase(dbId)
  if (team) {
    const teamRole = getUserTeamRole(team.id, userId)
    if (!teamRole) {
      // User is not a member of the owning team -> Access Denied
      return null
    }

    // Check if user has an explicit database member override
    const dbMember = db.members.find((m) => m.userId === userId || (m.email && m.email === userId))
    if (dbMember) {
      return dbMember.role
    }

    // Inherit from team role:
    if (teamRole === "owner") return "owner"
    if (teamRole === "admin") return "owner"
    if (teamRole === "member") return "editor"
    if (teamRole === "viewer") return "viewer"
  }

  // 2. Direct database member check
  const member = db.members.find((m) => m.userId === userId || (m.email && m.email === userId))
  if (member) {
    return member.role
  }

  // 3. Direct owner check
  if (db.ownerId === userId) {
    return "owner"
  }

  // 4. Default permission for public databases without explicit membership
  if (db.isPublic) {
    return "editor"
  }

  return null
}

/**
 * Check if user has required role
 */
export function checkDatabaseAccess(
  dbId: string,
  userId: string,
  requiredRole: "viewer" | "editor" | "owner"
): { allowed: boolean; role: DatabaseRole | null; reason?: string } {
  const role = getEffectiveUserRole(dbId, userId)
  if (!role) {
    return { allowed: false, role: null, reason: "Access denied. You are not a member of this database." }
  }

  if (requiredRole === "viewer") {
    return { allowed: true, role }
  }

  if (requiredRole === "editor") {
    if (role === "editor" || role === "owner") {
      return { allowed: true, role }
    }
    return { allowed: false, role, reason: "Edit access denied. Viewer role cannot modify database pages." }
  }

  if (requiredRole === "owner") {
    if (role === "owner") {
      return { allowed: true, role }
    }
    return { allowed: false, role, reason: "Owner access required to manage database members or configuration." }
  }

  return { allowed: false, role, reason: "Invalid role requirement." }
}

/**
 * Add a member to a database (Requires owner role)
 */
export function addDatabaseMember(
  dbId: string,
  requesterUserId: string,
  newMember: { email?: string; name: string; role: DatabaseRole; userId?: string }
): { success: boolean; members?: DatabaseMember[]; error?: string } {
  const access = checkDatabaseAccess(dbId, requesterUserId, "owner")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const db = getDatabaseRecord(dbId)
  if (!db) {
    return { success: false, error: "Database not found or access denied." }
  }
  const targetUserId = newMember.userId || `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  // Check if member already exists
  const existingIdx = db.members.findIndex(
    (m) => m.userId === targetUserId || (newMember.email && m.email === newMember.email)
  )

  if (existingIdx >= 0) {
    // Update existing member
    db.members[existingIdx].role = newMember.role
    db.members[existingIdx].name = newMember.name || db.members[existingIdx].name
    if (newMember.email) db.members[existingIdx].email = newMember.email
  } else {
    db.members.push({
      userId: targetUserId,
      email: newMember.email,
      name: newMember.name || "Team Member",
      role: newMember.role,
      addedAt: Date.now(),
    })
  }

  persistDatabases()
  return { success: true, members: [...db.members] }
}

/**
 * Update member role (Requires owner role)
 */
export function updateDatabaseMemberRole(
  dbId: string,
  requesterUserId: string,
  targetUserId: string,
  newRole: DatabaseRole
): { success: boolean; members?: DatabaseMember[]; error?: string } {
  const access = checkDatabaseAccess(dbId, requesterUserId, "owner")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const db = getDatabaseRecord(dbId)
  if (!db) {
    return { success: false, error: "Database not found or access denied." }
  }
  const member = db.members.find((m) => m.userId === targetUserId)
  if (!member) {
    return { success: false, error: "Member not found in database." }
  }

  // Prevent demoting the last owner
  if (member.role === "owner" && newRole !== "owner") {
    const ownerCount = db.members.filter((m) => m.role === "owner").length
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot demote the only database owner. Promote another member first." }
    }
  }

  member.role = newRole
  persistDatabases()
  return { success: true, members: [...db.members] }
}

/**
 * Remove a member from database (Requires owner role)
 */
export function removeDatabaseMember(
  dbId: string,
  requesterUserId: string,
  targetUserId: string
): { success: boolean; members?: DatabaseMember[]; error?: string } {
  const access = checkDatabaseAccess(dbId, requesterUserId, "owner")
  if (!access.allowed) {
    return { success: false, error: access.reason }
  }

  const db = getDatabaseRecord(dbId)
  if (!db) {
    return { success: false, error: "Database not found or access denied." }
  }
  const memberIndex = db.members.findIndex((m) => m.userId === targetUserId)
  if (memberIndex === -1) {
    return { success: false, error: "Member not found in database." }
  }

  // Prevent deleting the last owner
  const member = db.members[memberIndex]
  if (member.role === "owner") {
    const ownerCount = db.members.filter((m) => m.role === "owner").length
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot remove the only database owner." }
    }
  }

  db.members.splice(memberIndex, 1)
  persistDatabases()
  return { success: true, members: [...db.members] }
}
