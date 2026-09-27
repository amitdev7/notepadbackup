import { NextRequest, NextResponse } from "next/server"
import {
  calculateStorageSummary,
  getWorkspaceUserRole,
} from "@/lib/server-workspaces"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const role = getWorkspaceUserRole(wsId, userId)
  if (!role) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const storage = calculateStorageSummary(wsId)
  return NextResponse.json({ workspaceId: wsId, storage })
}
