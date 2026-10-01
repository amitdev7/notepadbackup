import { NextResponse, type NextRequest } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") || ""

  // Case 1: Client-side handleUpload flow from @vercel/blob/client
  if (contentType.includes("application/json")) {
    const body = await request.json()

    // If client upload token request
    if (body.type === "blob.generate-client-token") {
      try {
        const jsonResponse = await handleUpload({
          body: body as HandleUploadBody,
          request,
          onBeforeGenerateToken: async () => {
            return {
              allowedContentTypes: [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/svg+xml",
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
              ],
            }
          },
          onUploadCompleted: async () => {},
        })

        return NextResponse.json(jsonResponse)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Client token generation failed"
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    // Direct JSON upload: { pathname: string, content: string, access?: 'public' }
    if (body.pathname && body.content !== undefined) {
      try {
        const blob = await put(body.pathname, body.content, {
          access: body.access || "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
        return NextResponse.json({ ok: true, blob })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed"
        return NextResponse.json({ error: msg }, { status: 500 })
      }
    }
  }

  // Case 2: Multipart form data upload (file upload)
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      const pathname = (formData.get("pathname") as string) || (file ? `uploads/${file.name}` : `uploads/${Date.now()}.bin`)

      if (!file) {
        return NextResponse.json({ error: "No file provided in form data" }, { status: 400 })
      }

      const blob = await put(pathname, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      return NextResponse.json({ ok: true, blob })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Form upload failed"
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unsupported request format" }, { status: 400 })
}

