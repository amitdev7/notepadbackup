import { NextRequest, NextResponse } from "next/server"
import {
  listConnectedDatabases,
  saveConnectedDatabase,
} from "@/lib/server-connected-databases"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "user"
  try {
    const databases = await listConnectedDatabases(userId)
    return NextResponse.json({ databases })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list connected databases" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "user"
  try {
    const body = await req.json()
    const { id, provider, displayName, description, credentials, assignToWorkspaceId } = body

    if (!provider || !["supabase", "postgres", "zenithsui-cloud"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider specified" }, { status: 400 })
    }

    if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 })
    }

    const result = await saveConnectedDatabase({
      id,
      ownerUserId: userId,
      provider,
      displayName: displayName.trim(),
      description: typeof description === "string" ? description.trim() : undefined,
      credentials,
      assignToWorkspaceId,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save connected database" },
      { status: 500 }
    )
  }
}
