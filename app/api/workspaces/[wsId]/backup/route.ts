import { NextRequest, NextResponse } from "next/server"
import {
  exportWorkspaceBackupPackage,
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
  if (role !== "owner" && role !== "editor") {
    return NextResponse.json({ error: "Editor or owner role required to export backup" }, { status: 403 })
  }

  const pkg = exportWorkspaceBackupPackage(wsId)
  if (!pkg) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

  return NextResponse.json({ backup: pkg })
}
