// ---------------------------------------------------------------------------
// Zenithsui Local Network Identity & Wi-Fi Publishing Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-lan.ts
// ---------------------------------------------------------------------------

import {
  generatePairingPin,
  validatePairingPin,
  generatePairingToken,
  computeNetworkId,
} from "../lib/lan/identity.ts"
import { LanTransportManager } from "../lib/lan/transport.ts"
import type { ZenithsuiNetworkMessage } from "../lib/lan/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

async function runTests() {
  console.log("Running Zenithsui LAN & Wi-Fi Publishing tests...\n")

  // 1. Crockford Base32 PIN generation and validation
  const pin1 = generatePairingPin()
  check("Pairing PIN has correct format (XXXX-XX)", /^[0-9A-Z]{4}-[0-9A-Z]{2}$/.test(pin1), pin1)
  check("Pairing PIN passes validation", validatePairingPin(pin1))

  // Test invalid PINs
  check("Invalid PIN length fails", !validatePairingPin("123"))
  check("Excluded letters like I, L, O fail validation", !validatePairingPin("IOUL-12"))

  // 2. Cryptographic session pairing token
  const token = generatePairingToken()
  check("Pairing token is 64 hex characters (256-bit)", token.length === 64 && /^[0-9a-f]{64}$/.test(token))

  // 3. Network Identity derivation
  const networkId = await computeNetworkId("test_gateway_fingerprint_123")
  check("Network ID starts with lan_ prefix", networkId.startsWith("lan_"))
  check("Network ID is deterministic", networkId === (await computeNetworkId("test_gateway_fingerprint_123")))

  // 4. Role Enforcement on Wi-Fi Transport
  const viewerOp: ZenithsuiNetworkMessage = {
    type: "doc_op",
    nodeId: "node_1",
    op: "upsert",
    senderPeerId: "peer_phone_1",
  }

  const editorOp: ZenithsuiNetworkMessage = {
    type: "doc_op",
    nodeId: "node_1",
    op: "upsert",
    senderPeerId: "peer_laptop_2",
  }

  const viewerAllowed = LanTransportManager.validateIncomingMessage(viewerOp, "viewer")
  const editorAllowed = LanTransportManager.validateIncomingMessage(editorOp, "editor")

  check("Viewer role doc_op mutation is rejected by host", !viewerAllowed)
  check("Editor role doc_op mutation is accepted by host", editorAllowed)

  console.log(`\nLAN & Wi-Fi Publishing: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})

