import { NextRequest, NextResponse } from "next/server"
import { resolvePublicShare } from "@/lib/server-share"
import { getOrCreateRoom, getExistingRoom, type RoomSubscriber } from "@/lib/server-realtime"
import type {
  ClientMutatePayload,
  Collaborator,
  ServerInitMessage,
} from "@/lib/collaboration-types"
import { verifyEditToken } from "@/lib/security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Real-time SSE Stream Endpoint for Shared Pages (/p/<publicId>)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params
  const url = new URL(req.url)
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || url.searchParams.get("clientId") || "anonymous"

  const resolve = await resolvePublicShare(publicId, userId)
  if (!resolve.allowed || !resolve.payload) {
    return NextResponse.json(
      { error: resolve.error || "Access denied" },
      { status: resolve.status }
    )
  }

  const { dbId, fileId, mode } = resolve.payload
  const sinceParam = url.searchParams.get("since")

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
  const clientId = req.headers.get("x-session-id") || url.searchParams.get("clientId") || `share_viewer_${Date.now()}`
  const editToken = req.headers.get("x-zenithsui-edit-token") || url.searchParams.get("token") || ""
  const room = await getOrCreateRoom(dbId, fileId)

  // Determine role:
  // - public-view: strictly "viewer"
  // - password-edit: "editor" ONLY if valid edit token provided, otherwise "viewer"
  // - private: depends on token or user role
  let role: "owner" | "editor" | "viewer" = "viewer"
  if (mode === "password-edit" || mode === "public-view" || mode === "private") {
    if (editToken) {
      const tokenCheck = verifyEditToken(editToken, dbId, fileId)
      if (tokenCheck.valid) {
        role = tokenCheck.role === "owner" ? "owner" : "editor"
      }
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
 * Real-time Mutation Ingestion for Password-unlocked Editors via Shared Link
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params
  const userId = req.headers.get("x-user-id") || req.headers.get("x-session-id") || "anonymous"

  const resolve = await resolvePublicShare(publicId, userId)
  if (!resolve.allowed || !resolve.payload) {
    return NextResponse.json(
      { error: resolve.error || "Access denied", locked: true, code: "UNAUTHORIZED" },
      { status: resolve.status }
    )
  }

  const { dbId, fileId, mode } = resolve.payload

  // In public-view mode, mutations are strictly rejected!
  if (mode === "public-view") {
    return NextResponse.json(
      { error: "Public view mode is strictly read-only.", locked: true, code: "READ_ONLY" },
      { status: 403 }
    )
  }

  try {
    const body = (await req.json()) as ClientMutatePayload
    const editToken = req.headers.get("x-zenithsui-edit-token") || ""
    const clientId = req.headers.get("x-session-id") || body.clientId || "anonymous"

    // Verify edit token
    const tokenCheck = verifyEditToken(editToken, dbId, fileId)
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { error: "Valid edit token required to modify document.", locked: true, code: "UNAUTHORIZED" },
        { status: 403 }
      )
    }

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
    console.error("[Share Realtime POST] Error applying mutation:", err)
    return NextResponse.json({ error: "Internal error processing mutation" }, { status: 500 })
  }
}

