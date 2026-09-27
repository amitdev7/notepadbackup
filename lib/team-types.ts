// ---------------------------------------------------------------------------
// Zenithsui Teams & Shared Workspaces - Data Models and Role Definitions
// ---------------------------------------------------------------------------

export type TeamRole = "owner" | "admin" | "member" | "viewer"

export interface TeamMember {
  userId: string
  name: string
  email?: string
  role: TeamRole
  joinedAt: number
  avatarUrl?: string
}

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked"

export interface TeamInvitation {
  id: string
  teamId: string
  teamName: string
  recipientEmail: string
  role: TeamRole
  inviterId: string
  inviterName: string
  token: string
  status: InvitationStatus
  createdAt: number
  expiresAt: number
}

export interface TeamRecord {
  id: string
  name: string
  slug: string
  description?: string
  ownerId: string
  databaseIds: string[]
  members: TeamMember[]
  invitations: TeamInvitation[]
  createdAt: number
  updatedAt: number
}

export interface TeamClientSummary {
  id: string
  name: string
  slug: string
  description?: string
  role: TeamRole
  memberCount: number
  databaseCount: number
  isOwner: boolean
  createdAt: number
}
