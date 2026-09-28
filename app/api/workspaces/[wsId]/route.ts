import { NextRequest, NextResponse } from "next/server"
import {
  getWorkspaceById,
  updateWorkspaceRecord,
  deleteWorkspaceRecord,
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

  const ws = getWorkspaceById(wsId)
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

  return NextResponse.json({ workspace: ws, role })
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const role = getWorkspaceUserRole(wsId, userId)
  if (role !== "owner") {
    return NextResponse.json({ error: "Owner role required to update workspace" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const updated = updateWorkspaceRecord(wsId, body)
    if (!updated) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, workspace: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update workspace" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const role = getWorkspaceUserRole(wsId, userId)
  if (role !== "owner") {
    return NextResponse.json({ error: "Owner role required to delete workspace" }, { status: 403 })
  }

  const ok = deleteWorkspaceRecord(wsId)
  if (!ok) {
    return NextResponse.json({ error: "Cannot delete personal workspace or workspace not found" }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
