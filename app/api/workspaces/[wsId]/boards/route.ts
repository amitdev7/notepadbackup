import { NextRequest, NextResponse } from "next/server"
import {
  listBoardsInWorkspace,
  createBoardInWorkspace,
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
    return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 })
  }

  const boards = listBoardsInWorkspace(wsId, userId)
  return NextResponse.json({ workspaceId: wsId, boards, role })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const role = getWorkspaceUserRole(wsId, userId)
  if (role !== "owner" && role !== "editor") {
    return NextResponse.json({ error: "Editor role required to create board" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, description } = body || {}
    const newBoard = createBoardInWorkspace(wsId, name || "Untitled Board", userId, description)
    return NextResponse.json({ success: true, board: newBoard })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create board" }, { status: 500 })
  }
}
