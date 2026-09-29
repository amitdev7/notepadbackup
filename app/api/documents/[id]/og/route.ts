import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await context.params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from("documents")
    .select("name, is_public, updated_at")
    .eq("id", documentId)
    .single()

  const title = doc?.name || "Zenithsui Wireframe"

  // Render SVG OpenGraph card in Zenithsui risograph aesthetic
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#f8f6f0" />
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e4e0d4" stroke-width="1" />
    </pattern>
    <rect width="1200" height="630" fill="url(#grid)" />
    <rect x="80" y="80" width="1040" height="470" rx="16" fill="#ffffff" stroke="#18181b" stroke-width="3" />
    <text x="140" y="240" font-family="monospace, sans-serif" font-size="24" font-weight="600" fill="#2563eb" letter-spacing="4">ZENITHSUI // WIREFRAME</text>
    <text x="140" y="340" font-family="sans-serif" font-size="56" font-weight="700" fill="#18181b">${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
    <text x="140" y="420" font-family="monospace, sans-serif" font-size="20" fill="#71717a">Collaborative Infinite-Canvas Prototype</text>
  </svg>`

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": doc?.is_public
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "private, no-store",
    },
  })
}
