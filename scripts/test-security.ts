// ---------------------------------------------------------------------------
// Security Hardening, Input Sanitization & Backend Enforcement Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-security.ts
// ---------------------------------------------------------------------------

import {
  assertBackendPermission,
  checkPairingRateLimit,
  enforceBackendDocumentMutation,
  generateSecureToken,
  hasBackendPermission,
  hasNonFiniteNumber,
  hasScriptInjection,
  hashToken,
  isFiniteNumber,
  isSafeLink,
  isTrustedImageSrc,
  PairingRateLimiter,
  recordPairingAttempt,
  resetPairingRateLimit,
  SecurityPermissionError,
  timingSafeEqual,
  validateIncomingDocumentPayload,
  validateSecureNode,
  verifyTokenHash,
} from "../lib/security/sanitize.ts"
import type {
  ArrowNode,
  ComponentNode,
  DrawNode,
  ImageNode,
  ShapeNode,
  TextNode,
} from "../lib/types.ts"

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
  console.log("Running Zenithsui Security & Sanitization tests...\n")

  // -- 1. Finite numbers and NaN / Infinity rejection -------------------------
  {
    check("isFiniteNumber detects regular numbers", isFiniteNumber(42) && isFiniteNumber(0) && isFiniteNumber(-10.5))
    check("isFiniteNumber rejects NaN", !isFiniteNumber(NaN))
    check("isFiniteNumber rejects Infinity", !isFiniteNumber(Infinity) && !isFiniteNumber(-Infinity))
    check("isFiniteNumber rejects non-numbers", !isFiniteNumber("42") && !isFiniteNumber(null) && !isFiniteNumber(undefined))

    check("hasNonFiniteNumber finds NaN in nested object", hasNonFiniteNumber({ a: 1, b: { c: NaN } }))
    check("hasNonFiniteNumber finds Infinity in array", hasNonFiniteNumber([1, 2, [3, Infinity]]))
    check("hasNonFiniteNumber returns false for clean data", !hasNonFiniteNumber({ x: 10, y: 20, points: [[0, 0], [10, 10]] }))

    const validRect: ShapeNode = {
      id: "rect-1",
      type: "shape",
      shape: "rect",
      fill: "none",
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      seed: 42,
    }

    check("validateSecureNode accepts valid rectangle", validateSecureNode(validRect) !== null)
    check("validateSecureNode rejects NaN in x coordinate", validateSecureNode({ ...validRect, x: NaN }) === null)
    check("validateSecureNode rejects Infinity in width", validateSecureNode({ ...validRect, w: Infinity }) === null)
    check("validateSecureNode rejects -Infinity in height", validateSecureNode({ ...validRect, h: -Infinity }) === null)
    check("validateSecureNode rejects NaN seed", validateSecureNode({ ...validRect, seed: NaN }) === null)
    check("validateSecureNode rejects Infinity seed", validateSecureNode({ ...validRect, seed: Infinity }) === null)

    const validDraw: DrawNode = {
      id: "draw-1",
      type: "draw",
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      seed: 1,
      points: [[0, 0], [10, 20], [30, 40]],
    }
    check("validateSecureNode accepts valid draw node", validateSecureNode(validDraw) !== null)
    check(
      "validateSecureNode rejects draw node with NaN coordinate in points",
      validateSecureNode({ ...validDraw, points: [[0, 0], [NaN, 20]] }) === null
    )
    check(
      "validateSecureNode rejects draw node with Infinity coordinate in points",
      validateSecureNode({ ...validDraw, points: [[0, 0], [10, Infinity]] }) === null
    )

    const validArrow: ArrowNode = {
      id: "arrow-1",
      type: "arrow",
      x: 0,
      y: 0,
      w: 50,
      h: 50,
      seed: 1,
      head: true,
      points: [[0, 0], [50, 50]],
    }
    check("validateSecureNode accepts valid arrow node", validateSecureNode(validArrow) !== null)
    check(
      "validateSecureNode rejects arrow with NaN points",
      validateSecureNode({ ...validArrow, points: [[0, NaN], [50, 50]] }) === null
    )

    const validComp: ComponentNode = {
      id: "btn-1",
      type: "component",
      kind: "button",
      props: { label: "Click", count: 3 },
      x: 0,
      y: 0,
      w: 80,
      h: 30,
      seed: 1,
    }
    check("validateSecureNode accepts valid component", validateSecureNode(validComp) !== null)
    check(
      "validateSecureNode rejects component with NaN in props",
      validateSecureNode({ ...validComp, props: { label: "Click", count: NaN } }) === null
    )
  }

  // -- 2. Script injection and XSS mitigation in text and link fields ---------
  {
    check("hasScriptInjection catches <script>", hasScriptInjection("<script>alert(1)</script>"))
    check("hasScriptInjection catches </script>", hasScriptInjection("something</script>"))
    check("hasScriptInjection catches <SCRIPT> uppercase", hasScriptInjection("<SCRIPT SRC='x'></SCRIPT>"))
    check("hasScriptInjection catches inline onerror handler", hasScriptInjection("<img src=x onerror=alert(1)>"))
    check("hasScriptInjection catches inline onload handler", hasScriptInjection("<svg onload=alert(1)>"))
    check("hasScriptInjection catches iframe embed", hasScriptInjection("<iframe src='evil.com'></iframe>"))
    check("hasScriptInjection catches object embed", hasScriptInjection("<object data='evil.swf'></object>"))
    check("hasScriptInjection catches javascript: URI", hasScriptInjection("javascript:alert(1)"))
    check("hasScriptInjection catches obfuscated javascript: URI", hasScriptInjection("java\tscript:alert(1)"))
    check("hasScriptInjection catches HTML entity encoded javascript: URI", hasScriptInjection("&#106;avascript:alert(1)"))
    check("hasScriptInjection catches data:text/html URI", hasScriptInjection("data:text/html;base64,PHNjcmlwdD4="))

    check("hasScriptInjection does NOT flag legitimate text with math symbols", !hasScriptInjection("Value: x < 5 && y > 10"))
    check("hasScriptInjection does NOT flag legitimate UI label", !hasScriptInjection("Sign in to Zenithsui (v2)"))

    check("isSafeLink permits https link", isSafeLink("https://zenithsui.dev/spec"))
    check("isSafeLink permits http link", isSafeLink("http://localhost:3000"))
    check("isSafeLink permits mailto link", isSafeLink("mailto:support@zenithsui.dev"))
    check("isSafeLink permits anchor reference", isSafeLink("#section-canvas"))
    check("isSafeLink permits relative path", isSafeLink("/workspace/doc-1"))
    check("isSafeLink rejects javascript: link", !isSafeLink("javascript:alert(1)"))
    check("isSafeLink rejects data:text/html link", !isSafeLink("data:text/html,<script>alert(1)</script>"))
    check("isSafeLink rejects file: link", !isSafeLink("file:///etc/passwd"))
    check("isSafeLink rejects empty or whitespace link", !isSafeLink("   "))

    const textNode: TextNode = {
      id: "txt-1",
      type: "text",
      text: "Normal wireframe text",
      fontSize: 16,
      x: 0,
      y: 0,
      w: 120,
      h: 24,
      seed: 1,
    }

    check("validateSecureNode accepts benign text node", validateSecureNode(textNode) !== null)
    check(
      "validateSecureNode rejects text node with <script> tag",
      validateSecureNode({ ...textNode, text: "<script>alert(1)</script>" }) === null
    )
    check(
      "validateSecureNode rejects text node with SVG onload handler",
      validateSecureNode({ ...textNode, text: "<svg onload=alert(1)>" }) === null
    )
    check(
      "validateSecureNode rejects text node with NaN fontSize",
      validateSecureNode({ ...textNode, fontSize: NaN }) === null
    )
    check(
      "validateSecureNode accepts text node with safe https link",
      validateSecureNode({ ...textNode, link: "https://example.com" }) !== null
    )
    check(
      "validateSecureNode rejects text node with javascript: link",
      validateSecureNode({ ...textNode, link: "javascript:alert(1)" }) === null
    )
    check(
      "validateSecureNode rejects text node with obfuscated javascript: link",
      validateSecureNode({ ...textNode, link: "java\0script:alert(1)" }) === null
    )
  }

  // -- 3. Trusted image URL schemes policy -----------------------------------
  {
    check(
      "isTrustedImageSrc accepts data:image/png",
      isTrustedImageSrc("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
    )
    check(
      "isTrustedImageSrc accepts data:image/jpeg",
      isTrustedImageSrc("data:image/jpeg;base64,/9j/4AAQSkZJRg==")
    )
    check(
      "isTrustedImageSrc accepts data:image/webp",
      isTrustedImageSrc("data:image/webp;base64,UklGRiQAAABXRUJQVlA4")
    )
    check(
      "isTrustedImageSrc accepts asset:// protocol",
      isTrustedImageSrc("asset://uploads/wireframe-header.png")
    )
    check(
      "isTrustedImageSrc accepts asset:// with uuid",
      isTrustedImageSrc("asset://d5f1-8a9c-44e2/photo.jpg")
    )
    check(
      "isTrustedImageSrc rejects external https: image URL",
      !isTrustedImageSrc("https://untrusted-host.com/tracker.png")
    )
    check(
      "isTrustedImageSrc rejects http: image URL",
      !isTrustedImageSrc("http://192.168.1.50/asset.jpg")
    )
    check(
      "isTrustedImageSrc rejects file: URL",
      !isTrustedImageSrc("file:///C:/secrets.png")
    )
    check(
      "isTrustedImageSrc rejects javascript: pseudo-URL",
      !isTrustedImageSrc("javascript:alert(1)")
    )
    check(
      "isTrustedImageSrc rejects asset:// with path traversal (..)",
      !isTrustedImageSrc("asset://uploads/../../etc/passwd")
    )
    check(
      "isTrustedImageSrc rejects SVG data URI carrying script injection",
      !isTrustedImageSrc("data:image/svg+xml;utf8,<svg onload=alert(1)></svg>")
    )

    const validImg: ImageNode = {
      id: "img-1",
      type: "image",
      src: "data:image/png;base64,AAA",
      naturalW: 100,
      naturalH: 80,
      x: 0,
      y: 0,
      w: 100,
      h: 80,
      seed: 1,
    }

    check("validateSecureNode accepts valid data:image node", validateSecureNode(validImg) !== null)
    check(
      "validateSecureNode accepts asset:// image node",
      validateSecureNode({ ...validImg, src: "asset://diagrams/screen.png" }) !== null
    )
    check(
      "validateSecureNode rejects external https image node",
      validateSecureNode({ ...validImg, src: "https://evil.com/img.png" }) === null
    )
    check(
      "validateSecureNode rejects image with NaN natural dimensions",
      validateSecureNode({ ...validImg, naturalW: NaN }) === null
    )
  }

  // -- 4. WebCrypto SHA-256 token hashing and constant-time comparison ------
  {
    const token = "zenithsui_pair_test_token_12345"
    const hash = await hashToken(token)
    check("hashToken produces 64-char hex SHA-256 digest", typeof hash === "string" && hash.length === 64)

    // Known SHA-256 test vector: SHA-256("hello") = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    const knownHash = await hashToken("hello")
    check("hashToken matches standard SHA-256 test vector", knownHash === "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")

    const verifySuccess = await verifyTokenHash(token, hash)
    check("verifyTokenHash returns true for valid token and hash", verifySuccess === true)

    const verifyFailure = await verifyTokenHash("wrong_token", hash)
    check("verifyTokenHash returns false for incorrect token", verifyFailure === false)

    check("timingSafeEqual returns true for identical strings", timingSafeEqual("secret123", "secret123"))
    check("timingSafeEqual returns false for different strings", !timingSafeEqual("secret123", "secret999"))
    check("timingSafeEqual returns false for different lengths", !timingSafeEqual("abc", "abcd"))

    const secureToken = generateSecureToken(16)
    check("generateSecureToken returns requested byte length in hex (32 chars for 16 bytes)", secureToken.length === 32)
  }

  // -- 5. Pairing code brute-force protection rate limiter --------------------
  {
    resetPairingRateLimit("client-ip-1")
    const customLimiter = new PairingRateLimiter({ maxAttempts: 5, windowMs: 60_000 })
    const baseTime = 1_000_000

    // First 5 attempts should all be allowed
    for (let i = 1; i <= 5; i++) {
      const res = customLimiter.recordAttempt("test-peer", baseTime + i * 1000)
      check(`Pairing attempt ${i} of 5 is allowed`, res.allowed === true)
      check(`Remaining attempts correctly decremented to ${5 - i}`, res.remainingAttempts === 5 - i)
    }

    // 6th attempt within the 60s window must be blocked
    const blockedRes = customLimiter.recordAttempt("test-peer", baseTime + 10_000)
    check("6th pairing attempt within 60s is blocked", blockedRes.allowed === false)
    check("Blocked result has remainingAttempts 0", blockedRes.remainingAttempts === 0)
    check("Blocked result specifies retryAfterSeconds > 0", blockedRes.retryAfterSeconds > 0)

    // Another client identifier must NOT be blocked (rate limit isolation)
    const otherClientRes = customLimiter.recordAttempt("other-peer", baseTime + 11_000)
    check("Different peer identifier is not affected by first peer rate limit", otherClientRes.allowed === true)

    // After windowMs (60s) has elapsed from first attempt, new attempt is allowed
    const afterWindowRes = customLimiter.recordAttempt("test-peer", baseTime + 65_000)
    check("Attempt after 60s window expiration is allowed", afterWindowRes.allowed === true)

    // Reset allows immediate retry
    customLimiter.reset("test-peer")
    const resetRes = customLimiter.recordAttempt("test-peer", baseTime + 66_000)
    check("Reset clears rate limit history immediately", resetRes.allowed === true && resetRes.remainingAttempts === 4)

    // Global helper check
    const r1 = recordPairingAttempt("global-peer")
    check("recordPairingAttempt global helper records attempt", r1.allowed === true)
    const rCheck = checkPairingRateLimit("global-peer")
    check("checkPairingRateLimit inspects without consuming", rCheck.remainingAttempts === r1.remainingAttempts)
    resetPairingRateLimit("global-peer")
  }

  // -- 6. Backend permission enforcement & zero frontend trust ----------------
  {
    // Permission matrix
    check("viewer role has read permission", hasBackendPermission("viewer", "read") === true)
    check("viewer role DOES NOT have write permission", hasBackendPermission("viewer", "write") === false)
    check("viewer role DOES NOT have admin permission", hasBackendPermission("viewer", "admin") === false)
    check("viewer role DOES NOT have delete permission", hasBackendPermission("viewer", "delete") === false)

    check("editor role has read permission", hasBackendPermission("editor", "read") === true)
    check("editor role has write permission", hasBackendPermission("editor", "write") === true)
    check("editor role DOES NOT have admin permission", hasBackendPermission("editor", "admin") === false)

    check("owner role has write, admin, delete permissions",
      hasBackendPermission("owner", "write") &&
      hasBackendPermission("owner", "admin") &&
      hasBackendPermission("owner", "delete")
    )

    // assertBackendPermission behavior
    let threwForViewer = false
    try {
      assertBackendPermission("viewer", "write", "Viewer edit attempt")
    } catch (err) {
      if (err instanceof SecurityPermissionError) {
        threwForViewer = true
        check("SecurityPermissionError has status 403", err.status === 403)
      }
    }
    check("assertBackendPermission throws SecurityPermissionError for unauthorized viewer write", threwForViewer)

    // enforceBackendDocumentMutation strictly enforces backend role and rejects untrusted frontend claims
    const maliciousClientPayload = {
      fileName: "Injected Doc",
      // Attacker injects fake frontend permission claim into payload
      clientClaimedRole: "owner",
      isAdmin: true,
      canEdit: true,
      nodes: {
        node1: {
          id: "node1",
          type: "shape",
          shape: "rect",
          fill: "none",
          x: 0,
          y: 0,
          w: 50,
          h: 50,
          seed: 1,
        },
      },
      order: ["node1"],
    }

    // Backend context for user authenticated only as viewer
    const viewerContext = {
      userId: "user_viewer_42",
      verifiedRole: "viewer" as const,
      docId: "doc_100",
      authenticatedVia: "supabase_session" as const,
    }

    let viewerMutationRejected = false
    try {
      enforceBackendDocumentMutation(maliciousClientPayload, viewerContext)
    } catch (err) {
      if (err instanceof SecurityPermissionError) {
        viewerMutationRejected = true
      }
    }
    check(
      "Frontend claims (clientClaimedRole='owner') are ignored; viewer mutation is rejected with SecurityPermissionError",
      viewerMutationRejected
    )

    // Editor context allows authorized mutation and returns sanitized nodes
    const editorContext = {
      userId: "user_editor_99",
      verifiedRole: "editor" as const,
      docId: "doc_100",
      authenticatedVia: "supabase_session" as const,
    }

    const editorResult = enforceBackendDocumentMutation(maliciousClientPayload, editorContext)
    check("Editor role is permitted to perform mutation", editorResult !== null)
    check("Sanitized payload contains valid nodes", editorResult.nodes["node1"] !== undefined)
    check("Client-claimed role field is absent from sanitized result", (editorResult as any).clientClaimedRole === undefined)
  }

  // -- 7. Incoming Cloud/LAN payload batch sanitization ------------------------
  {
    const dirtyPayload = {
      fileName: 'Project../\\:*?"<>|Canvas',
      nodes: {
        safeNode: {
          id: "safeNode",
          type: "shape",
          shape: "rect",
          fill: "none",
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          seed: 5,
        },
        nanNode: {
          id: "nanNode",
          type: "shape",
          shape: "rect",
          fill: "none",
          x: NaN,
          y: 0,
          w: 100,
          h: 100,
          seed: 5,
        },
        xssNode: {
          id: "xssNode",
          type: "text",
          text: "<script>window.location='https://attacker.com'</script>",
          fontSize: 16,
          x: 0,
          y: 0,
          w: 100,
          h: 20,
          seed: 1,
        },
        badImg: {
          id: "badImg",
          type: "image",
          src: "https://external.com/photo.jpg",
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          seed: 1,
        },
      },
      order: ["safeNode", "nanNode", "xssNode", "badImg"],
    }

    const clean = validateIncomingDocumentPayload(dirtyPayload)
    check("validateIncomingDocumentPayload sanitizes file name", clean?.fileName === "Project_Canvas" || !clean?.fileName.includes(".."))
    check("validateIncomingDocumentPayload keeps safe node", clean?.nodes["safeNode"] !== undefined)
    check("validateIncomingDocumentPayload drops node with NaN coordinates", clean?.nodes["nanNode"] === undefined)
    check("validateIncomingDocumentPayload drops node with script injection", clean?.nodes["xssNode"] === undefined)
    check("validateIncomingDocumentPayload drops image with untrusted external URL", clean?.nodes["badImg"] === undefined)
    check("validateIncomingDocumentPayload filters order list to only keep clean nodes", clean?.order.length === 1 && clean.order[0] === "safeNode")
  }

  // ---------------------------------------------------------------------------
  if (failures.length) {
    console.error(`\n✗ ${failures.length} failed, ${passed} passed\n`)
    for (const f of failures) console.error("  ✗ " + f)
    process.exit(1)
  }
  console.log(`\n✓ All ${passed} security checks passed successfully!`)
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
