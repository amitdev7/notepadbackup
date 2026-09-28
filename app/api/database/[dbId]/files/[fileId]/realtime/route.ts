import { NextRequest, NextResponse } from "next/server"
import { getOrCreateRoom, getExistingRoom, type RoomSubscriber } from "@/lib/server-realtime"
import type {
  ClientMutatePayload,
  Collaborator,
  ServerInitMessage,
} from "@/lib/collaboration-types"
import { verifyEditToken } from "@/lib/security"
import { checkDatabaseAccess, getEffectiveUserRole } from "@/lib/database-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Real-time SSE Stream Endpoint & Delta Catchup API
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const url = new URL(req.url)
  const sinceParam = url.searchParams.get("since")
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || url.searchParams.get("clientId") || "anonymous"

  const dbAccess = checkDatabaseAccess(dbId, userId, "viewer")
  if (!dbAccess.allowed) {
    return NextResponse.json({ error: dbAccess.reason || "Access denied" }, { status: 403 })
  }

  // Fast delta catchup request (polling / reconnection sync)
  if (sinceParam !== null) {
    const sinceRev = parseInt(sinceParam, 10)
    const room = await getOrCreateRoom(dbId, fileId)
    if (!isNaN(sinceRev)) {
      const missed = room.getMissedPatches(sinceRev)
      if (missed !== null) {
        return NextResponse.json({
          fullSync: false,
          revision: room.revision,
          patches: missed,
        })
      }
    }
    // Full sync needed
    return NextResponse.json({
      fullSync: true,
      revision: room.revision,
      doc: {
        id: room.doc.id,
        name: room.doc.name,
        nodes: room.doc.nodes,
        order: room.doc.order,
        updatedAt: room.doc.updatedAt,
        look: room.doc.look,
        dbId: room.dbId,
        hasPassword: !!room.doc.hasPassword || !!room.doc.passwordHash,
      },
    })
  }

  // Real-time Server-Sent Events (SSE) Stream
  const clientId = req.headers.get("x-session-id") || url.searchParams.get("clientId") || `client_${Date.now()}`
  const editToken = req.headers.get("x-zenithsui-edit-token") || url.searchParams.get("token") || ""
  const room = await getOrCreateRoom(dbId, fileId)

  // Determine client role combining database role + page password
  const dbRole = getEffectiveUserRole(dbId, userId)
  let role: "owner" | "editor" | "viewer" = dbRole || "editor"

  if (dbRole === "viewer") {
    role = "viewer"
  } else if (room.doc.hasPassword || room.doc.passwordHash) {
    const tokenCheck = verifyEditToken(editToken, dbId, fileId)
    if (tokenCheck.valid) {
      role = dbRole === "owner" ? "owner" : "editor"
    } else {
      role = "viewer"
    }
  }

  const collaborator: Collaborator = {
    id: clientId,
    role,
    connectedAt: Date.now(),
    lastActive: Date.now(),
  }

  const encoder = new TextEncoder()
  let cleanupSubscriber: (() => void) | null = null
  let heartbeatTimer: NodeJS.Timeout | null = null

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch {
          // Stream might be closed
        }
      }

      // Send initial document state
      const initMsg: ServerInitMessage = {
        type: "init",
        dbId,
        fileId,
        revision: room.revision,
        doc: {
          id: room.doc.id,
          name: room.doc.name,
          nodes: room.doc.nodes as Record<string, unknown>,
          order: room.doc.order,
          updatedAt: room.doc.updatedAt,
          look: room.doc.look,
          dbId: room.dbId,
          hasPassword: !!room.doc.hasPassword || !!room.doc.passwordHash,
        } as unknown as ServerInitMessage["doc"],
        collaborators: room.getCollaborators(),
        role,
        hasPassword: !!room.doc.hasPassword || !!room.doc.passwordHash,
      }
      sendEvent("init", initMsg)

      // Register subscriber
      const subscriber: RoomSubscriber = {
        clientId,
        collaborator,
        editToken,
        send: sendEvent,
        close: () => {
          try {
            controller.close()
          } catch {
            // ignore
          }
        },
      }

      room.addSubscriber(subscriber)

      cleanupSubscriber = () => {
        room.removeSubscriber(clientId)
      }

      // Periodic heartbeat keepalive
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"))
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer)
        }
      }, 15000)
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (cleanupSubscriber) cleanupSubscriber()
    },
  })

  // Hook abort signal
  req.signal.addEventListener("abort", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (cleanupSubscriber) cleanupSubscriber()
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

/**
 * Real-time Mutation Ingestion Endpoint
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const dbAccess = checkDatabaseAccess(dbId, userId, "editor")
  if (!dbAccess.allowed) {
    return NextResponse.json(
      { error: dbAccess.reason || "Forbidden", locked: true, code: "UNAUTHORIZED" },
      { status: 403 }
    )
  }

  try {
    const body = (await req.json()) as ClientMutatePayload
    const editToken = req.headers.get("x-zenithsui-edit-token") || ""
    const clientId = req.headers.get("x-session-id") || body.clientId || "anonymous"

    const room = getExistingRoom(dbId, fileId) || (await getOrCreateRoom(dbId, fileId))

    const result = room.applyOps(clientId, body.ops, editToken)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Forbidden", locked: true, code: "UNAUTHORIZED" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      revision: result.revision,
    })
  } catch (err) {
    console.error("[Realtime POST] Error applying mutation:", err)
    return NextResponse.json({ error: "Internal error processing mutation" }, { status: 500 })
  }
}

