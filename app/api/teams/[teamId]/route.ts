import { NextRequest, NextResponse } from "next/server"
import {
  getTeam,
  checkTeamAccess,
  updateTeam,
  deleteTeam,
} from "@/lib/server-teams"
import { getAuthenticatedUser } from "@/lib/server-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/teams/[teamId] - Get team details
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const user = await getAuthenticatedUser(req)
  const userId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

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
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      ownerId: team.ownerId,
      databaseIds: team.databaseIds,
      members: team.members,
      invitations: access.role === "owner" || access.role === "admin" ? team.invitations : [],
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      currentUserRole: access.role,
    },
  })
}

/**
 * PUT /api/teams/[teamId] - Update team settings
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const user = await getAuthenticatedUser(req)
  const userId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const result = updateTeam(teamId, userId, {
      name: body.name,
      description: body.description,
      slug: body.slug,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to update team" }, { status: 400 })
    }

    return NextResponse.json({ success: true, team: result.team })
  } catch (err) {
    console.error("[PUT /api/teams/[teamId]] Error:", err)
    return NextResponse.json({ error: "Internal error updating team" }, { status: 500 })
  }
}

/**
 * DELETE /api/teams/[teamId] - Delete team
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const user = await getAuthenticatedUser(req)
  const userId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const result = deleteTeam(teamId, userId)
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to delete team" }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}

