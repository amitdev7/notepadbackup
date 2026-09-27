import { NextRequest, NextResponse } from "next/server"
import {
  listTrashItems,
  restoreItemFromTrash,
  permanentlyDeleteItem,
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

  const trash = listTrashItems(wsId)
  return NextResponse.json({ trash })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const role = getWorkspaceUserRole(wsId, userId)
  if (role !== "owner" && role !== "editor") {
    return NextResponse.json({ error: "Editor permission required for trash management" }, { status: 403 })
  }

  try {
    const { action, itemId } = await req.json()
    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    if (action === "restore") {
      const ok = restoreItemFromTrash(wsId, itemId)
      return NextResponse.json({ success: ok })
    }

    if (action === "delete_permanent") {
      if (role !== "owner") {
        return NextResponse.json({ error: "Owner permission required to permanently delete items" }, { status: 403 })
      }
      const ok = permanentlyDeleteItem(wsId, itemId)
      return NextResponse.json({ success: ok })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process trash action" }, { status: 500 })
  }
}
