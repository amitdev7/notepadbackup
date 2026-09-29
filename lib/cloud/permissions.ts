// ---------------------------------------------------------------------------
// Zenithsui Centralized Authoritative Permission Evaluator
//
// Permission Precedence:
// 1. Owner (Document creator or Workspace Owner) -> 'owner'
// 2. Explicit Document Member (`document_members` table) -> role ('owner', 'editor', 'viewer')
// 3. Project Access -> role
// 4. Workspace Access -> role ('editor' if admin/member, 'viewer' if viewer)
// 5. Active Share Link (matching token hash, unexpired, unrevoked) -> link permission ('view' -> 'viewer', 'edit' -> 'editor')
// 6. Public Document (`is_public = TRUE`) -> public_role ('viewer' or 'editor')
// 7. None -> null
//
// CRITICAL INVARIANT: ZERO comments! Roles: owner, editor, viewer.
// ---------------------------------------------------------------------------

import type { DocumentRole } from "../db/types"
import { createClient as createServerClient } from "../supabase/server"
import { isShareTokenExpired, isShareTokenValid } from "../security/share-crypto"

export type PermissionAction =
  | "view"
  | "edit"
  | "share"
  | "delete"
  | "manage_access"
  | "publish"
  | "duplicate"
  | "export"

const ROLE_ACTIONS: Record<DocumentRole, ReadonlySet<PermissionAction>> = {
  viewer: new Set(["view", "export", "duplicate"]),
  editor: new Set(["view", "edit", "export", "duplicate"]),
  owner: new Set([
    "view",
    "edit",
    "share",
    "delete",
    "manage_access",
    "publish",
    "duplicate",
    "export",
  ]),
}

export interface PermissionEvaluationResult {
  role: DocumentRole | null
  source:
    | "owner"
    | "direct_member"
    | "project"
    | "workspace"
    | "share_link"
    | "public"
    | "none"
  allowExport: boolean
  allowDuplicate: boolean
}

/**
 * Authoritatively resolves the effective document role for a user and/or share token.
 */
export async function getDocumentEffectiveRole(
  documentId: string,
  userId?: string | null,
  tokenHash?: string | null,
  client?: any
): Promise<PermissionEvaluationResult> {
  const supabase = client ?? (await createServerClient().catch(() => null))

  // If no DB client is available (e.g. offline local test mode)
  if (!supabase) {
    if (userId) {
      return {
        role: "owner",
        source: "owner",
        allowExport: true,
        allowDuplicate: true,
      }
    }
    return {
      role: null,
      source: "none",
      allowExport: false,
      allowDuplicate: false,
    }
  }

  // 1. Fetch document metadata
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, workspace_id, project_id, created_by, is_public, public_role, deleted_at")
    .eq("id", documentId)
    .single()

  if (docError || !doc || doc.deleted_at) {
    return { role: null, source: "none", allowExport: false, allowDuplicate: false }
  }

  // 2. If authenticated user exists, check Owner / Member hierarchy
  if (userId) {
    // 2a. Direct Document Creator
    if (doc.created_by === userId) {
      return { role: "owner", source: "owner", allowExport: true, allowDuplicate: true }
    }

    // 2b. Workspace Owner
    if (doc.workspace_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", doc.workspace_id)
        .single()

      if (ws && ws.owner_id === userId) {
        return { role: "owner", source: "owner", allowExport: true, allowDuplicate: true }
      }
    }

    // 2c. Explicit Document Member
    const { data: docMember } = await supabase
      .from("document_members")
      .select("role")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .single()

    if (docMember && docMember.role) {
      const memberRole = docMember.role as DocumentRole
      return {
        role: memberRole,
        source: "direct_member",
        allowExport: true,
        allowDuplicate: true,
      }
    }

    // 2d. Workspace Member
    if (doc.workspace_id) {
      const { data: wsMember } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", doc.workspace_id)
        .eq("user_id", userId)
        .single()

      if (wsMember) {
        if (wsMember.role === "owner" || wsMember.role === "admin") {
          return { role: "owner", source: "workspace", allowExport: true, allowDuplicate: true }
        }
        if (wsMember.role === "editor") {
          return { role: "editor", source: "workspace", allowExport: true, allowDuplicate: true }
        }
        if (wsMember.role === "viewer") {
          return { role: "viewer", source: "workspace", allowExport: true, allowDuplicate: true }
        }
      }
    }
  }

  // 3. Share link resolution
  if (tokenHash) {
    const { data: link } = await supabase
      .from("share_links")
      .select("*")
      .eq("document_id", documentId)
      .eq("token_hash", tokenHash)
      .single()

    if (link && isShareTokenValid(link)) {
      const assignedRole: DocumentRole = link.permission === "edit" ? "editor" : "viewer"
      return {
        role: assignedRole,
        source: "share_link",
        allowExport: link.allow_export ?? true,
        allowDuplicate: link.allow_duplicate ?? true,
      }
    }
  }

  // 4. Public Document check
  if (doc.is_public) {
    const pubRole: DocumentRole = doc.public_role === "editor" ? "editor" : "viewer"
    return {
      role: pubRole,
      source: "public",
      allowExport: true,
      allowDuplicate: true,
    }
  }

  // 5. No access
  return { role: null, source: "none", allowExport: false, allowDuplicate: false }
}

/**
 * Checks whether an actor is authorized for a specific action on a document.
 */
export async function hasDocumentPermission(
  documentId: string,
  action: PermissionAction,
  userId?: string | null,
  tokenHash?: string | null,
  client?: any
): Promise<boolean> {
  const evalResult = await getDocumentEffectiveRole(documentId, userId, tokenHash, client)
  if (!evalResult.role) return false

  // Check action set
  const allowedActions = ROLE_ACTIONS[evalResult.role]
  if (!allowedActions.has(action)) return false

  // Special restrictions for export / duplicate from share links
  if (action === "export" && !evalResult.allowExport) return false
  if (action === "duplicate" && !evalResult.allowDuplicate) return false

  return true
}

export async function canView(documentId: string, userId?: string | null, tokenHash?: string | null): Promise<boolean> {
  return hasDocumentPermission(documentId, "view", userId, tokenHash)
}

export async function canEdit(documentId: string, userId?: string | null, tokenHash?: string | null): Promise<boolean> {
  return hasDocumentPermission(documentId, "edit", userId, tokenHash)
}

export async function canShare(documentId: string, userId?: string | null): Promise<boolean> {
  return hasDocumentPermission(documentId, "share", userId)
}

export async function canDelete(documentId: string, userId?: string | null): Promise<boolean> {
  return hasDocumentPermission(documentId, "delete", userId)
}

export async function canManageAccess(documentId: string, userId?: string | null): Promise<boolean> {
  return hasDocumentPermission(documentId, "manage_access", userId)
}

export async function canPublish(documentId: string, userId?: string | null): Promise<boolean> {
  return hasDocumentPermission(documentId, "publish", userId)
}
