import { NextRequest, NextResponse } from "next/server"
import {
  listFavoritesInWorkspace,
  toggleFavoriteInWorkspace,
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

  const favorites = listFavoritesInWorkspace(wsId)
  return NextResponse.json({ favorites })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ wsId: string }> }
) {
  const { wsId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "owner_nezuko"

  const role = getWorkspaceUserRole(wsId, userId)
  if (!role) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const { itemId } = await req.json()
    if (!itemId) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 })
    }
    const isFavorite = toggleFavoriteInWorkspace(wsId, itemId)
    return NextResponse.json({ success: true, isFavorite })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update favorite" }, { status: 500 })
  }
}
