import { NextResponse, type NextRequest } from "next/server"

function isDisallowedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true
  }
  // IPv4 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
  const ipv4Match = lower.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1], 10)
    const octet2 = parseInt(ipv4Match[2], 10)
    if (octet1 === 10) return true
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true
    if (octet1 === 192 && octet2 === 168) return true
    if (octet1 === 169 && octet2 === 254) return true
    if (octet1 === 127) return true
  }
  return false
}

async function handleAssetProxy(request: NextRequest, isHead = false) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid protocol; only http and https allowed" }, { status: 400 })
  }

  if (isDisallowedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Target host not permitted" }, { status: 403 })
  }

  try {
    const forwardHeaders: Record<string, string> = {
      Accept: request.headers.get("accept") || "*/*",
      "User-Agent": "Zenithsui-Asset-Proxy/1.0",
    }

    const rangeHeader = request.headers.get("range")
    if (rangeHeader) {
      forwardHeaders["Range"] = rangeHeader
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: isHead ? "HEAD" : "GET",
      headers: forwardHeaders,
    })

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamResponse.statusText}` },
        { status: upstreamResponse.status }
      )
    }

    const responseHeaders = new Headers()
    responseHeaders.set(
      "Content-Type",
      upstreamResponse.headers.get("content-type") || "application/octet-stream"
    )
    responseHeaders.set("Access-Control-Allow-Origin", "*")
    responseHeaders.set("Accept-Ranges", "bytes")
    responseHeaders.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")

    const contentLength = upstreamResponse.headers.get("content-length")
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength)
    }

    const contentRange = upstreamResponse.headers.get("content-range")
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange)
    }

    const contentDisposition = upstreamResponse.headers.get("content-disposition")
    if (contentDisposition) {
      responseHeaders.set("Content-Disposition", contentDisposition)
    }

    if (isHead) {
      return new Response(null, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    const buffer = await upstreamResponse.arrayBuffer()
    return new Response(buffer, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy request failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleAssetProxy(request, false)
}

export async function HEAD(request: NextRequest) {
  return handleAssetProxy(request, true)
}
