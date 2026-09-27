import { NextRequest, NextResponse } from "next/server"
import {
  getTeam,
  checkTeamAccess,
  attachDatabaseToTeam,
  detachDatabaseFromTeam,
} from "@/lib/server-teams"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/teams/[teamId]/databases - List databases belonging to team
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
    databaseIds: team.databaseIds,
  })
}

/**
 * POST /api/teams/[teamId]/databases - Attach or detach database
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { action, dbId } = body

    if (!dbId || typeof dbId !== "string") {
      return NextResponse.json({ error: "dbId is required." }, { status: 400 })
    }

    if (action === "detach") {
      const result = detachDatabaseFromTeam(teamId, dbId, userId)
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to detach database" }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    // Default attach
    const result = attachDatabaseToTeam(teamId, dbId, userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to attach database" }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[POST /api/teams/[teamId]/databases] Error:", err)
    return NextResponse.json({ error: "Failed to update team databases" }, { status: 500 })
  }
}
