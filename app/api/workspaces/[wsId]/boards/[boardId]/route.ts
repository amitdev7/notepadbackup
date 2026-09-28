import { NextRequest, NextResponse } from "next/server"
import {
  getBoardRecord,
  saveBoardRecord,
  renameBoardInWorkspace,
  duplicateBoardInWorkspace,
  moveBoardToTrash,
  getDocumentPermission,
} from "@/lib/server-workspaces"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ wsId: string; boardId: string }> }
) {
  const { wsId, boardId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const perm = getDocumentPermission(wsId, boardId, userId)
  if (!perm.allowed) {
    return NextResponse.json({ error: perm.reason || "Access denied" }, { status: 403 })
  }

  const board = getBoardRecord(wsId, boardId)
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 })
  }

  return NextResponse.json({ board, permissionRole: perm.role })
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ wsId: string; boardId: string }> }
) {
  const { wsId, boardId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const perm = getDocumentPermission(wsId, boardId, userId)
  if (!perm.allowed || perm.role === "viewer") {
    return NextResponse.json({ error: "Editor permission required to save board" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const saved = saveBoardRecord(wsId, {
      ...body,
      id: boardId,
      workspaceId: wsId,
    })
    return NextResponse.json({ success: true, board: saved })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save board" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ wsId: string; boardId: string }> }
) {
  const { wsId, boardId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const perm = getDocumentPermission(wsId, boardId, userId)
  if (!perm.allowed || perm.role === "viewer") {
    return NextResponse.json({ error: "Editor permission required to modify board" }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (body.action === "duplicate") {
      const copy = duplicateBoardInWorkspace(wsId, boardId)
      if (!copy) return NextResponse.json({ error: "Failed to duplicate board" }, { status: 400 })
      return NextResponse.json({ success: true, board: copy })
    }

    if (body.name) {
      const ok = renameBoardInWorkspace(wsId, boardId, body.name)
      if (!ok) return NextResponse.json({ error: "Board not found" }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "No valid action provided" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update board" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ wsId: string; boardId: string }> }
) {
  const { wsId, boardId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const perm = getDocumentPermission(wsId, boardId, userId)
  if (!perm.allowed || perm.role === "viewer") {
    return NextResponse.json({ error: "Editor permission required to delete board" }, { status: 403 })
  }

  const ok = moveBoardToTrash(wsId, boardId, userId)
  if (!ok) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
