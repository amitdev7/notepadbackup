import { NextRequest, NextResponse } from "next/server"
import {
  getTeam,
  checkTeamAccess,
  createTeamInvitation,
  revokeTeamInvitation,
} from "@/lib/server-teams"
import type { TeamRole } from "@/lib/team-types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/teams/[teamId]/invitations - List active team invitations (admin/owner)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkTeamAccess(teamId, userId, "admin")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Access denied" }, { status: 403 })
  }

  const team = getTeam(teamId)
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    invitations: team.invitations,
  })
}

/**
 * POST /api/teams/[teamId]/invitations - Create invitation
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"
  const userName = req.headers.get("x-user-name") || "Team Administrator"

  try {
    const body = await req.json()
    const { email, role } = body

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 })
    }

    const validRoles: TeamRole[] = ["owner", "admin", "member", "viewer"]
    const targetRole = validRoles.includes(role) ? role : "member"

    const result = createTeamInvitation(teamId, userId, userName, email, targetRole)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to create invitation" }, { status: 400 })
    }

    return NextResponse.json({ success: true, invitation: result.invitation }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/teams/[teamId]/invitations] Error:", err)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}

/**
 * DELETE /api/teams/[teamId]/invitations - Revoke invitation
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required." }, { status: 400 })
    }

    const result = revokeTeamInvitation(teamId, userId, invitationId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to revoke invitation" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/teams/[teamId]/invitations] Error:", err)
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 })
  }
}

