// ---------------------------------------------------------------------------
// Zenithsui Local-to-Cloud Migration Assistant
// ---------------------------------------------------------------------------

import { listLocalDocuments, getLocalDocument, type StoredLocalDoc } from "../storage/documents"
import { getSupabaseBrowserClient } from "../supabase/client"
import { useAuthStore } from "../auth-store"

export interface LocalDocCandidate {
  id: string
  name: string
  nodeCount: number
  updatedAt: number
}

export async function findUnmigratedLocalDocuments(): Promise<LocalDocCandidate[]> {
  const localDocs = await listLocalDocuments(false)
  const unmigrated: LocalDocCandidate[] = []

  for (const doc of localDocs) {
    if (!doc.cloudId && doc.syncStatus !== "synced") {
      const nodeCount = Object.keys(doc.doc?.nodes || {}).length
      unmigrated.push({
        id: doc.id,
        name: doc.name || doc.doc.fileName || "Untitled",
        nodeCount,
        updatedAt: doc.updatedAt,
      })
    }
  }

  return unmigrated
}

export async function migrateLocalDocumentsToCloud(
  docIds: string[],
  workspaceId?: string
): Promise<{ successCount: number; failedCount: number }> {
  const supabase = getSupabaseBrowserClient()
  const user = useAuthStore.getState().user
  if (!user) throw new Error("Must be signed in to migrate documents")

  let successCount = 0
  let failedCount = 0

  let targetWorkspaceId = workspaceId
  if (!targetWorkspaceId) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle()
    targetWorkspaceId = ws?.id
  }

  for (const id of docIds) {
    try {
      const localDoc = await getLocalDocument(id)
      if (!localDoc) continue

      const payload: any = {
        name: localDoc.name,
        document_json: {
          nodes: localDoc.doc.nodes,
          order: localDoc.doc.order,
          look: { grid: false, theme: "paper" },
        },
        schema_version: 1,
        revision: 1,
        created_by: user.id,
        updated_by: user.id,
      }
      if (targetWorkspaceId) {
        payload.workspace_id = targetWorkspaceId
      }

      const { data, error } = await supabase
        .from("documents")
        .insert(payload)
        .select()
        .single()

      if (error || !data) {
        failedCount++
        continue
      }

      // Add owner membership
      await supabase.from("document_members").insert({
        document_id: data.id,
        user_id: user.id,
        role: "owner",
        created_by: user.id,
      })

      // Update local doc with cloud ID and mark as synced
      localDoc.cloudId = data.id
      localDoc.baseRevision = 1
      localDoc.serverRevision = 1
      localDoc.syncStatus = "synced"
      localDoc.updatedAt = Date.now()

      const { saveLocalDocument } = await import("../storage/documents")
      await saveLocalDocument(localDoc)

      successCount++
    } catch {
      failedCount++
    }
  }

  return { successCount, failedCount }
}

