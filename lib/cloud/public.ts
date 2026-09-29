// ---------------------------------------------------------------------------
// Zenithsui Public Web Publishing Service (`/p/[slug]`)
//
// Explicit opt-in publishing, custom slug validation, sanitized public payloads,
// and immediate unpublishing (410 Gone / 404).
//
// INVARIANT: ZERO comments! Roles: owner, editor, viewer.
// ---------------------------------------------------------------------------

import { slugify, isValidSlug, isReservedSlug, generateUniqueSlug } from "../slug"
import { createClient as createServerClient } from "../supabase/server"

export interface PublishDocumentOptions {
  documentId: string
  actorId: string
  slug?: string | null
  publicRole?: "viewer" | "editor"
}

export interface PublishDocumentResult {
  isPublic: boolean
  publicSlug: string
  publicUrl: string
  publicRole: "viewer" | "editor"
  publishedAt: string
}

export interface ResolvedPublicDocument {
  found: boolean
  isPublished: boolean
  document?: {
    id: string
    name: string
    document_json: any
    schema_version: number
    revision: number
    updated_at: string
    public_role: "viewer" | "editor"
  }
  error?: string
}

/**
 * Publishes a document to the public web with custom or auto-generated slug.
 */
export async function publishDocument(
  options: PublishDocumentOptions,
  client?: any
): Promise<PublishDocumentResult> {
  const supabase = client ?? (await createServerClient())

  // Fetch document title
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, name, public_slug, created_by")
    .eq("id", options.documentId)
    .single()

  if (docError || !doc) {
    throw new Error("Document not found.")
  }

  let finalSlug = options.slug ? slugify(options.slug) : (doc.public_slug || slugify(doc.name))

  if (!isValidSlug(finalSlug) || isReservedSlug(finalSlug)) {
    finalSlug = generateUniqueSlug(doc.name)
  }

  // Ensure slug uniqueness
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("public_slug", finalSlug)
    .neq("id", options.documentId)
    .maybeSingle()

  if (existing) {
    finalSlug = generateUniqueSlug(finalSlug)
  }

  const publishedAt = new Date().toISOString()
  const publicRole = options.publicRole || "viewer"

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      is_public: true,
      public_slug: finalSlug,
      public_role: publicRole,
      published_at: publishedAt,
    })
    .eq("id", options.documentId)

  if (updateError) {
    throw new Error(`Failed to publish document: ${updateError.message}`)
  }

  return {
    isPublic: true,
    publicSlug: finalSlug,
    publicUrl: `/p/${finalSlug}`,
    publicRole,
    publishedAt,
  }
}

/**
 * Unpublishes a document immediately.
 */
export async function unpublishDocument(
  documentId: string,
  actorId: string,
  client?: any
): Promise<boolean> {
  const supabase = client ?? (await createServerClient())

  const { error } = await supabase
    .from("documents")
    .update({
      is_public: false,
      published_at: null,
    })
    .eq("id", documentId)

  return !error
}

/**
 * Resolves a public document by slug for public viewers (`/p/[slug]`).
 * Sanitizes internal fields, workspace info, and creator identity.
 */
export async function resolvePublicDocument(
  slug: string,
  client?: any
): Promise<ResolvedPublicDocument> {
  const supabase = client ?? (await createServerClient())

  const cleanSlug = slug.toLowerCase().trim()
  if (!isValidSlug(cleanSlug) || isReservedSlug(cleanSlug)) {
    return { found: false, isPublished: false, error: "Invalid document slug." }
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, name, document_json, schema_version, revision, updated_at, is_public, public_role, deleted_at")
    .eq("public_slug", cleanSlug)
    .maybeSingle()

  if (error || !doc || doc.deleted_at) {
    return { found: false, isPublished: false, error: "Document not found." }
  }

  if (!doc.is_public) {
    return { found: true, isPublished: false, error: "This document is no longer published." }
  }

  return {
    found: true,
    isPublished: true,
    document: {
      id: doc.id,
      name: doc.name,
      document_json: doc.document_json,
      schema_version: doc.schema_version,
      revision: doc.revision,
      updated_at: doc.updated_at,
      public_role: doc.public_role,
    },
  }
}
