import { NextResponse, type NextRequest } from "next/server"
import type { CollabMessage, CollabPeer } from "@/lib/collaboration/types"

interface CollabRoom {
  docId: string
  peers: Record<string, CollabPeer>
  messages: Array<CollabMessage & { timestamp: number }>
  lastActivity: number
}

declare global {
  var __zenithsuiCollabRooms: Map<string, CollabRoom> | undefined
}

const rooms = globalThis.__zenithsuiCollabRooms ?? new Map<string, CollabRoom>()
if (!globalThis.__zenithsuiCollabRooms) {
  globalThis.__zenithsuiCollabRooms = rooms
}

function getOrCreateRoom(docId: string): CollabRoom {
  let room = rooms.get(docId)
  if (!room) {
    room = {
      docId,
      peers: {},
      messages: [],
      lastActivity: Date.now(),
    }
    rooms.set(docId, room)
  }
  return room
}

function cleanupRoom(room: CollabRoom) {
  const now = Date.now()
  // Clean up peers inactive for > 20s
  for (const [id, peer] of Object.entries(room.peers)) {
    if (now - peer.lastActive > 20000) {
      delete room.peers[id]
    }
  }
  // Keep messages for last 30s, max 100
  if (room.messages.length > 100) {
    room.messages = room.messages.slice(-100)
  }
  room.messages = room.messages.filter((m) => now - (m.timestamp || now) < 30000)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params
  const { searchParams } = new URL(request.url)
  const since = parseInt(searchParams.get("since") || "0", 10)
  const peerId = searchParams.get("peerId")

  const room = getOrCreateRoom(docId)
  cleanupRoom(room)

  const newMessages = room.messages.filter(
    (m) => (m.timestamp || 0) > since && ("peerId" in m ? m.peerId !== peerId : true)
  )

  return NextResponse.json({
    ok: true,
    peers: Object.values(room.peers),
    messages: newMessages,
    timestamp: Date.now(),
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params
  try {
    const body = await request.json()
    const { peer, message } = body as { peer?: CollabPeer; message?: CollabMessage }

    const room = getOrCreateRoom(docId)
    room.lastActivity = Date.now()

    if (peer && peer.id) {
      room.peers[peer.id] = {
        ...peer,
        lastActive: Date.now(),
      }
    }

    if (message) {
      const msgWithTs = {
        ...message,
        timestamp: Date.now(),
      }
      room.messages.push(msgWithTs)
    }

    cleanupRoom(room)

    return NextResponse.json({
      ok: true,
      peersCount: Object.keys(room.peers).length,
      timestamp: Date.now(),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
  }
}
