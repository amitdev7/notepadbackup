import { NextRequest, NextResponse } from "next/server"
import { listUserTeams, createTeam } from "@/lib/server-teams"
import { getAuthenticatedUser } from "@/lib/server-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/teams - List all teams the current user belongs to
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  const userId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"
  try {
    const teams = listUserTeams(userId)
    return NextResponse.json({ success: true, teams })
  } catch (err) {
    console.error("[GET /api/teams] Error:", err)
    return NextResponse.json({ error: "Failed to list teams" }, { status: 500 })
  }
}

/**
 * POST /api/teams - Create a new team
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  const userId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"
  try {
    const body = await req.json()
    const { name, description, ownerName, ownerEmail } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Team name is required." }, { status: 400 })
    }

    const displayName = user ? user.displayName : ownerName || "Team Owner"

    const team = createTeam(
      name.trim(),
      typeof description === "string" ? description.trim() : "",
      userId,
      displayName,
      ownerEmail
    )

    return NextResponse.json({ success: true, team }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/teams] Error:", err)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}


