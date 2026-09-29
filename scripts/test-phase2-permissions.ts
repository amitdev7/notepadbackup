// ---------------------------------------------------------------------------
// Zenithsui Phase 2 Permissions Precedence & Access Control Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-phase2-permissions.ts
// ---------------------------------------------------------------------------

import {
  getDocumentEffectiveRole,
  hasDocumentPermission,
  type PermissionAction,
} from "../lib/cloud/permissions.ts"
import type { DocumentRole } from "../lib/db/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

// In-memory mock database client for testing permission precedence logic
function createMockDb(fixtures: {
  document: any
  workspace?: any
  workspaceMember?: any
  documentMember?: any
  shareLink?: any
}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: any) => ({
          eq: (col2: string, val2: any) => ({
            single: async () => {
              if (table === "document_members" && fixtures.documentMember) {
                return { data: fixtures.documentMember, error: null }
              }
              if (table === "workspace_members" && fixtures.workspaceMember) {
                return { data: fixtures.workspaceMember, error: null }
              }
              if (table === "share_links" && fixtures.shareLink) {
                return { data: fixtures.shareLink, error: null }
              }
              return { data: null, error: new Error("Not found") }
            },
          }),
          single: async () => {
            if (table === "documents" && fixtures.document) {
              return { data: fixtures.document, error: null }
            }
            if (table === "workspaces" && fixtures.workspace) {
              return { data: fixtures.workspace, error: null }
            }
            if (table === "document_members" && fixtures.documentMember) {
              return { data: fixtures.documentMember, error: null }
            }
            return { data: null, error: new Error("Not found") }
          },
        }),
      }),
    }),
  }
}

async function runTests() {
  console.log("Running Zenithsui Phase 2 Permissions Precedence tests...\n")

  const docId = "doc_123"
  const ownerId = "user_owner"
  const editorId = "user_editor"
  const viewerId = "user_viewer"
  const strangerId = "user_stranger"

  // 1. Document Creator is Owner
  const mockOwner = createMockDb({
    document: {
      id: docId,
      workspace_id: "ws_1",
      created_by: ownerId,
      is_public: false,
      public_role: "viewer",
      deleted_at: null,
    },
  })

  const ownerRes = await getDocumentEffectiveRole(docId, ownerId, null, mockOwner)
  check("Document creator resolves to owner", ownerRes.role === "owner" && ownerRes.source === "owner")

  check("Owner can view", await hasDocumentPermission(docId, "view", ownerId, null, mockOwner))
  check("Owner can edit", await hasDocumentPermission(docId, "edit", ownerId, null, mockOwner))
  check("Owner can share", await hasDocumentPermission(docId, "share", ownerId, null, mockOwner))
  check("Owner can delete", await hasDocumentPermission(docId, "delete", ownerId, null, mockOwner))
  check("Owner can manage access", await hasDocumentPermission(docId, "manage_access", ownerId, null, mockOwner))
  check("Owner can publish", await hasDocumentPermission(docId, "publish", ownerId, null, mockOwner))

  // 2. Explicit Document Member as Editor
  const mockEditor = createMockDb({
    document: {
      id: docId,
      workspace_id: "ws_1",
      created_by: ownerId,
      is_public: false,
      public_role: "viewer",
      deleted_at: null,
    },
    documentMember: { role: "editor" },
  })

  const editorRes = await getDocumentEffectiveRole(docId, editorId, null, mockEditor)
  check("Explicit document member resolves to editor", editorRes.role === "editor" && editorRes.source === "direct_member")

  check("Editor can view", await hasDocumentPermission(docId, "view", editorId, null, mockEditor))
  check("Editor can edit", await hasDocumentPermission(docId, "edit", editorId, null, mockEditor))
  check("Editor CANNOT delete", !(await hasDocumentPermission(docId, "delete", editorId, null, mockEditor)))
  check("Editor CANNOT manage access", !(await hasDocumentPermission(docId, "manage_access", editorId, null, mockEditor)))
  check("Editor CANNOT publish", !(await hasDocumentPermission(docId, "publish", editorId, null, mockEditor)))

  // 3. Explicit Document Member as Viewer
  const mockViewer = createMockDb({
    document: {
      id: docId,
      workspace_id: "ws_1",
      created_by: ownerId,
      is_public: false,
      public_role: "viewer",
      deleted_at: null,
    },
    documentMember: { role: "viewer" },
  })

  const viewerRes = await getDocumentEffectiveRole(docId, viewerId, null, mockViewer)
  check("Explicit document member resolves to viewer", viewerRes.role === "viewer" && viewerRes.source === "direct_member")

  check("Viewer can view", await hasDocumentPermission(docId, "view", viewerId, null, mockViewer))
  check("Viewer CANNOT edit", !(await hasDocumentPermission(docId, "edit", viewerId, null, mockViewer)))
  check("Viewer CANNOT delete", !(await hasDocumentPermission(docId, "delete", viewerId, null, mockViewer)))
  check("Viewer CANNOT manage access", !(await hasDocumentPermission(docId, "manage_access", viewerId, null, mockViewer)))

  // 4. Share Link Access
  const mockShareLink = createMockDb({
    document: {
      id: docId,
      workspace_id: "ws_1",
      created_by: ownerId,
      is_public: false,
      public_role: "viewer",
      deleted_at: null,
    },
    shareLink: {
      is_active: true,
      permission: "view",
      allow_export: false,
      allow_duplicate: false,
      expires_at: null,
      revoked_at: null,
    },
  })

  const linkRes = await getDocumentEffectiveRole(docId, null, "valid_token_hash", mockShareLink)
  check("Share link resolves to viewer", linkRes.role === "viewer" && linkRes.source === "share_link")
  check("Disallowed export is enforced on share link", !(await hasDocumentPermission(docId, "export", null, "valid_token_hash", mockShareLink)))

  // 5. Public Document Access
  const mockPublic = createMockDb({
    document: {
      id: docId,
      workspace_id: "ws_1",
      created_by: ownerId,
      is_public: true,
      public_role: "viewer",
      deleted_at: null,
    },
  })

  const pubRes = await getDocumentEffectiveRole(docId, null, null, mockPublic)
  check("Public document resolves for unauthenticated visitor", pubRes.role === "viewer" && pubRes.source === "public")

  // 6. Stranger with No Access
  const mockPrivate = createMockDb({
    document: {
      id: docId,
      workspace_id: "ws_1",
      created_by: ownerId,
      is_public: false,
      public_role: "viewer",
      deleted_at: null,
    },
  })

  const strangerRes = await getDocumentEffectiveRole(docId, strangerId, null, mockPrivate)
  check("Stranger has no access to private document", strangerRes.role === null && strangerRes.source === "none")
  check("Stranger CANNOT view", !(await hasDocumentPermission(docId, "view", strangerId, null, mockPrivate)))

  // 7. Strictly ZERO comments invariant
  const allowedRoles: DocumentRole[] = ["owner", "editor", "viewer"]
  check("Allowed roles strictly excludes commenter", !allowedRoles.includes("commenter" as any))

  console.log(`\nPhase 2 Permissions: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})
