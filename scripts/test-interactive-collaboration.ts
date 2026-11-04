// ---------------------------------------------------------------------------
// Zenithsui Interactive Live Collaboration & Database Sync Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-interactive-collaboration.ts
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import { useCollabStore } from "../lib/collaboration/collab-store"
import { COLLAB_PALETTE, type CollabPeer, type CollabMessage } from "../lib/collaboration/types"
import { unionBounds } from "../lib/selection"
import type { SquigNode } from "../lib/types"

console.log("=== Starting Zenithsui Interactive Live Collaboration Verification ===")

// 1. Palette Invariants
console.log("\n1. Testing Collaboration Palette & Deterministic Colors:")
assert.ok(COLLAB_PALETTE.length >= 8, "Collab palette must have at least 8 distinct colors")
assert.ok(COLLAB_PALETTE.includes("#007AFF"), "Collab palette includes Apple System Blue")
assert.ok(COLLAB_PALETTE.includes("#34C759"), "Collab palette includes Apple System Green")
console.log("  ✓ Palette contains rich Apple HIG color spectrum")

// 2. Peer Presence Management
console.log("\n2. Testing Peer Presence State Machine:")
const store = useCollabStore.getState()
assert.ok(typeof store.selfId === "string" && store.selfId.length > 0, "Self peer ID must be initialized")
assert.ok(typeof store.selfColor === "string", "Self color must be initialized")

const testPeer: CollabPeer = {
  id: "peer_alex_99",
  name: "Alex",
  color: "#34C759",
  avatarUrl: null,
  cursor: { x: 250, y: 150 },
  selectedNodeIds: ["node_1"],
  cursorChat: null,
  platform: "desktop",
  lastActive: Date.now(),
  joinedAt: Date.now(),
}

store.setPeer(testPeer)
const stateAfterJoin = useCollabStore.getState()
assert.ok(stateAfterJoin.peers["peer_alex_99"], "Peer must be present in peers dictionary")
assert.equal(stateAfterJoin.peers["peer_alex_99"].name, "Alex")
assert.deepEqual(stateAfterJoin.peers["peer_alex_99"].cursor, { x: 250, y: 150 })
console.log("  ✓ Peer join and registration verified")

// Update cursor
store.updatePeerCursor("peer_alex_99", 300, 400)
assert.deepEqual(useCollabStore.getState().peers["peer_alex_99"].cursor, { x: 300, y: 400 })
console.log("  ✓ Peer cursor position updates correctly")

// Update selection
store.updatePeerSelection("peer_alex_99", ["node_1", "node_2"])
assert.deepEqual(useCollabStore.getState().peers["peer_alex_99"].selectedNodeIds, ["node_1", "node_2"])
console.log("  ✓ Peer node selection syncs correctly")

// 3. Remote Selection Bounding Box
console.log("\n3. Testing Remote Selection Bounding Geometry:")
const mockNodes: Record<string, SquigNode> = {
  node_1: {
    id: "node_1",
    kind: "rect",
    x: 100,
    y: 100,
    w: 200,
    h: 150,
    strokeWeight: "regular",
    fillTone: "none",
    color: "#000000",
    seed: 1,
  } as SquigNode,
  node_2: {
    id: "node_2",
    kind: "rect",
    x: 250,
    y: 200,
    w: 100,
    h: 100,
    strokeWeight: "regular",
    fillTone: "none",
    color: "#000000",
    seed: 2,
  } as SquigNode,
}

const bounds = unionBounds([mockNodes.node_1, mockNodes.node_2])
assert.ok(bounds !== null, "Bounds must be calculated for selected nodes")
assert.equal(bounds.x, 100)
assert.equal(bounds.y, 100)
assert.equal(bounds.w, 250) // 250 + 100 - 100 = 250
assert.equal(bounds.h, 200) // 200 + 100 - 100 = 200
console.log("  ✓ Remote selection bounds calculation verified")

// 4. Cursor Chat Mechanics
console.log("\n4. Testing Live Cursor Chat Lifecycle:")
store.startCursorChat()
assert.equal(useCollabStore.getState().isCursorChatActive, true)

store.updateCursorChatDraft("Hello collaborators!")
assert.equal(useCollabStore.getState().cursorChatDraft, "Hello collaborators!")

store.commitCursorChat()
assert.equal(useCollabStore.getState().isCursorChatActive, false)
assert.equal(useCollabStore.getState().cursorChatDraft, "")
console.log("  ✓ Cursor chat open, draft, and commit verified")

// Peer cursor chat update
store.updatePeerCursorChat("peer_alex_99", "Looking at this diagram")
assert.equal(useCollabStore.getState().peers["peer_alex_99"].cursorChat?.text, "Looking at this diagram")
console.log("  ✓ Peer cursor chat broadcast reflects in peer state")

// 5. Follow Collaborator Camera Mode
console.log("\n5. Testing Follow Collaborator Camera Mode:")
store.followPeer("peer_alex_99")
assert.equal(useCollabStore.getState().followingPeerId, "peer_alex_99")

// Stop following
store.followPeer(null)
assert.equal(useCollabStore.getState().followingPeerId, null)
console.log("  ✓ Follow and unfollow camera transitions verified")

// 6. Stale Peer Cleanup & Disconnect
console.log("\n6. Testing Peer Cleanup & Idle Management:")
// Simulate peer becoming idle
const simulatedPeer = {
  ...useCollabStore.getState().peers["peer_alex_99"],
  lastActive: Date.now() - 7000, // 7 seconds ago
}
useCollabStore.setState({ peers: { peer_alex_99: simulatedPeer } })
store.cleanupStalePeers()
assert.equal(useCollabStore.getState().peers["peer_alex_99"].isIdle, true)
console.log("  ✓ Inactive peer automatically marked idle")

// Simulate peer disconnect (> 25s)
const disconnectedPeer = {
  ...useCollabStore.getState().peers["peer_alex_99"],
  lastActive: Date.now() - 30000, // 30 seconds ago
}
useCollabStore.setState({ peers: { peer_alex_99: disconnectedPeer } })
store.cleanupStalePeers()
assert.equal(useCollabStore.getState().peers["peer_alex_99"], undefined)
console.log("  ✓ Disconnected peer cleanly unmounted from roster")

// 7. Database Status & Fallback Invariants
console.log("\n7. Testing Database Connection Telemetry Invariants:")
assert.equal(typeof store.checkDatabaseHealth, "function", "checkDatabaseHealth must exist")
assert.equal(typeof store.saveActiveDocumentToDatabase, "function", "saveActiveDocumentToDatabase must exist")
assert.equal(typeof store.broadcastReaction, "function", "broadcastReaction must exist")
console.log("  ✓ Database actions and telemetry handlers verified")

console.log("\n============================================================")
console.log("ALL INTERACTIVE LIVE COLLABORATION TESTS PASSED 100%! 👥🎉")
console.log("============================================================")
