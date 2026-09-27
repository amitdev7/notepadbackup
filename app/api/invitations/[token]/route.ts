import { NextRequest, NextResponse } from "next/server"
import {
  getInvitationByToken,
  acceptTeamInvitation,
  declineTeamInvitation,
} from "@/lib/server-teams"
import { getAuthenticatedUser } from "@/lib/server-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/invitations/[token] - View public details of an invitation
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const inv = getInvitationByToken(token)

  if (!inv) {
    return NextResponse.json({ error: "Invalid invitation link." }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    invitation: {
      id: inv.id,
      teamId: inv.teamId,
      teamName: inv.teamName,
      recipientEmail: inv.recipientEmail,
      role: inv.role,
      inviterName: inv.inviterName,
      status: inv.status,
      expiresAt: inv.expiresAt,
      isExpired: Date.now() > inv.expiresAt || inv.status === "expired",
    },
  })
}

/**
 * POST /api/invitations/[token] - Accept or decline an invitation
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const user = await getAuthenticatedUser(req)
  const userId = user ? user.id : req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  try {
    const body = await req.json()
    const { action, name, email } = body // action: 'accept' | 'decline'

    if (action === "decline") {
      const result = declineTeamInvitation(token)
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to decline invitation" }, { status: 400 })
      }
      return NextResponse.json({ success: true, declined: true })
    }

    if (action === "accept") {
      const memberName = user ? user.displayName : name || "New Member"
      const result = acceptTeamInvitation(token, userId, memberName, email)
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to accept invitation" }, { status: 400 })
      }
      return NextResponse.json({ success: true, accepted: true, teamId: result.teamId })
    }

    return NextResponse.json({ error: "Invalid action. Use 'accept' or 'decline'." }, { status: 400 })
  } catch (err) {
    console.error("[POST /api/invitations/[token]] Error:", err)
    return NextResponse.json({ error: "Internal error processing invitation" }, { status: 500 })
  }
}


