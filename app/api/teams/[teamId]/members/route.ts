import { NextRequest, NextResponse } from "next/server"
import {
  getTeam,
  checkTeamAccess,
  addOrUpdateTeamMember,
  changeTeamMemberRole,
  removeTeamMember,
} from "@/lib/server-teams"
import type { TeamRole } from "@/lib/team-types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/teams/[teamId]/members - List team members
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const access = checkTeamAccess(teamId, userId, "viewer")
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason || "Access denied" }, { status: 403 })
  }

  const team = getTeam(teamId)
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    members: team.members,
    currentUserRole: access.role,
  })
}

/**
 * POST /api/teams/[teamId]/members - Add/Update a team member directly
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { name, email, role, targetUserId } = body

    const validRoles: TeamRole[] = ["owner", "admin", "member", "viewer"]
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 })
    }

    const result = addOrUpdateTeamMember(teamId, userId, {
      userId: targetUserId,
      name: name || "Team Member",
      email,
      role,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to add member" }, { status: 400 })
    }

    return NextResponse.json({ success: true, members: result.members })
  } catch (err) {
    console.error("[POST /api/teams/[teamId]/members] Error:", err)
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 })
  }
}

/**
 * PUT /api/teams/[teamId]/members - Change member role
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { targetUserId, role } = body

    const validRoles: TeamRole[] = ["owner", "admin", "member", "viewer"]
    if (!targetUserId || !role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Valid targetUserId and role required." }, { status: 400 })
    }

    const result = changeTeamMemberRole(teamId, userId, targetUserId, role)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to change role" }, { status: 400 })
    }

    return NextResponse.json({ success: true, members: result.members })
  } catch (err) {
    console.error("[PUT /api/teams/[teamId]/members] Error:", err)
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
  }
}

/**
 * DELETE /api/teams/[teamId]/members - Remove member from team
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required." }, { status: 400 })
    }

    const result = removeTeamMember(teamId, userId, targetUserId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to remove member" }, { status: 400 })
    }

    return NextResponse.json({ success: true, members: result.members })
  } catch (err) {
    console.error("[DELETE /api/teams/[teamId]/members] Error:", err)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}
