import { NextResponse, type NextRequest } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { put } from "@vercel/blob"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// POST /api/blob/upload — Vercel Blob uploads for signed-in users only.
//
// Blob URLs are public, so this is for shareable media; private document
// attachments go to the private Supabase bucket via
// /api/assets/signed-upload-url instead. Every path is forced under the
// caller's own namespace and sanitized, so a client can't overwrite someone
// else's object or climb out with "../".
// ---------------------------------------------------------------------------

const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/tab-separated-values",
  "application/json",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

/** "<userId>/<safe-name>" — the client only gets to choose the last segment */
function namespaced(userId: string, raw: unknown): string {
  const name =
    String(raw ?? "")
      .split(/[\\/]/)
      .pop()!
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[^\w.\- ()]+/g, "_")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 180) || `${Date.now()}.bin`
  return `uploads/${userId}/${name}`
}

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return data.user.id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fail(503, "Blob storage is not configured")

  const userId = await currentUserId()
  if (!userId) return fail(401, "Authentication required")

  const contentType = request.headers.get("content-type") || ""

  // Case 1: client-side upload token flow from @vercel/blob/client
  if (contentType.includes("application/json")) {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return fail(400, "Invalid JSON")
    }

    if (body.type === "blob.generate-client-token") {
      try {
        const jsonResponse = await handleUpload({
          body: body as unknown as HandleUploadBody,
          request,
          onBeforeGenerateToken: async (pathname) => {
            if (!pathname.startsWith(`uploads/${userId}/`) || pathname.includes("..")) {
              throw new Error("Uploads must target your own folder")
            }
            return { allowedContentTypes: ALLOWED_CONTENT_TYPES, maximumSizeInBytes: MAX_BYTES }
          },
          onUploadCompleted: async () => {},
        })
        return NextResponse.json(jsonResponse)
      } catch (err: unknown) {
        return fail(400, err instanceof Error ? err.message : "Client token generation failed")
      }
    }

    // Direct JSON upload: { pathname, content }
    if (typeof body.pathname === "string" && typeof body.content === "string") {
      if (body.content.length > MAX_BYTES) return fail(413, "Content too large")
      try {
        const blob = await put(namespaced(userId, body.pathname), body.content, {
          access: "public",
          contentType: "text/plain",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: true,
        })
        return NextResponse.json({ ok: true, blob })
      } catch {
        return fail(500, "Upload failed")
      }
    }
    return fail(400, "Unsupported request body")
  }

  // Case 2: multipart form upload
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData()
      const file = formData.get("file")
      if (!(file instanceof File)) return fail(400, "No file provided in form data")
      if (file.size <= 0 || file.size > MAX_BYTES) return fail(413, "File is empty or too large")
      if (!ALLOWED_CONTENT_TYPES.includes(file.type)) return fail(415, "Unsupported file type")

      const blob = await put(namespaced(userId, formData.get("pathname") || file.name), file, {
        access: "public",
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      })
      return NextResponse.json({ ok: true, blob })
    } catch {
      return fail(500, "Form upload failed")
    }
  }

  return fail(400, "Unsupported request format")
}
