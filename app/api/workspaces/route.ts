import { NextRequest, NextResponse } from "next/server"
import {
  listWorkspacesForUser,
  createWorkspaceRecord,
  importWorkspaceBackupPackage,
} from "@/lib/server-workspaces"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"
  const workspaces = listWorkspacesForUser(userId)
  return NextResponse.json({ workspaces })
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"
  try {
    const body = await req.json()

    // Import backup package workflow
    if (body.backupPackage) {
      const restored = importWorkspaceBackupPackage(body.backupPackage, userId, body.name)
      if (!restored) {
        return NextResponse.json({ error: "Invalid workspace backup package" }, { status: 400 })
      }
      return NextResponse.json({ success: true, workspace: restored })
    }

    // Normal workspace creation
    const { name, description } = body
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 })
    }

    const ws = createWorkspaceRecord(name, userId, "Workspace Admin", undefined, description)
    return NextResponse.json({ success: true, workspace: ws })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create workspace" }, { status: 500 })
  }
}
