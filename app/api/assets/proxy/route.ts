import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    const parsed = new URL(targetUrl)
    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 })
    }

    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        Accept: "image/*",
      },
    })

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamResponse.statusText}` },
        { status: upstreamResponse.status }
      )
    }

    const contentType = upstreamResponse.headers.get("content-type") || "image/png"
    const buffer = await upstreamResponse.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Proxy failed: ${err.message}` }, { status: 500 })
  }
}
