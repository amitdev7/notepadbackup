import { NextResponse, type NextRequest } from "next/server"

function isPrivateOrLoopback(octet1: number, octet2: number): boolean {
  if (octet1 === 127) return true // Loopback
  if (octet1 === 0) return true   // Current network
  if (octet1 === 10) return true  // 10.0.0.0/8
  if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true // 172.16.0.0/12
  if (octet1 === 192 && octet2 === 168) return true // 192.168.0.0/16
  if (octet1 === 169 && octet2 === 254) return true // 169.254.0.0/16 (Link-local / cloud metadata)
  return false
}

export function isDisallowedHost(hostname: string): boolean {
  let lower = hostname.toLowerCase().trim()

  // Strip enclosing brackets for IPv6
  if (lower.startsWith("[") && lower.endsWith("]")) {
    lower = lower.slice(1, -1)
  }

  // Common metadata and loopback names
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower === "::" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "metadata.google.internal" ||
    lower === "instance-data"
  ) {
    return true
  }

  // IPv6 link-local, private ULA, and IPv4-mapped IPv6
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.replace("::ffff:", "")
    return isDisallowedHost(v4)
  }

  // Single 32-bit int representation
  if (/^\d+$/.test(lower)) {
    const num = parseInt(lower, 10)
    if (num >= 0 && num <= 4294967295) {
      const o1 = (num >>> 24) & 255
      const o2 = (num >>> 16) & 255
      return isPrivateOrLoopback(o1, o2)
    }
  }

  // Hex format
  if (/^0x[0-9a-f]+$/i.test(lower)) {
    const num = parseInt(lower, 16)
    if (num >= 0 && num <= 4294967295) {
      const o1 = (num >>> 24) & 255
      const o2 = (num >>> 16) & 255
      return isPrivateOrLoopback(o1, o2)
    }
  }

  // Dotted decimal / octal representation
  const parts = lower.split(".")
  if (parts.length === 4) {
    const octets = parts.map((p) => {
      if (p.startsWith("0x") || p.startsWith("0X")) return parseInt(p, 16)
      if (p.startsWith("0") && p.length > 1) return parseInt(p, 8)
      return parseInt(p, 10)
    })
    if (octets.every((o) => !isNaN(o) && o >= 0 && o <= 255)) {
      return isPrivateOrLoopback(octets[0], octets[1])
    }
  }

  return false
}

async function handleAssetProxy(request: NextRequest, isHead = false) {
  const { searchParams } = new URL(request.url)
  const initialUrl = searchParams.get("url")

  if (!initialUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  let currentUrl = initialUrl
  let redirectsFollowed = 0
  const MAX_REDIRECTS = 3

  try {
    const forwardHeaders: Record<string, string> = {
      Accept: request.headers.get("accept") || "*/*",
      "User-Agent": "Zenithsui-Asset-Proxy/1.0",
    }

    const rangeHeader = request.headers.get("range")
    if (rangeHeader) {
      forwardHeaders["Range"] = rangeHeader
    }

    let upstreamResponse: Response | null = null

    while (redirectsFollowed <= MAX_REDIRECTS) {
      let parsed: URL
      try {
        parsed = new URL(currentUrl)
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return NextResponse.json({ error: "Invalid protocol; only http and https allowed" }, { status: 400 })
      }

      if (isDisallowedHost(parsed.hostname)) {
        return NextResponse.json({ error: "Target host not permitted" }, { status: 403 })
      }

      upstreamResponse = await fetch(currentUrl, {
        method: isHead ? "HEAD" : "GET",
        headers: forwardHeaders,
        redirect: "manual",
      })

      // Check if redirect
      if ([301, 302, 303, 307, 308].includes(upstreamResponse.status)) {
        const location = upstreamResponse.headers.get("location")
        if (!location) {
          return NextResponse.json({ error: "Redirect missing location header" }, { status: 502 })
        }
        // Resolve relative redirects against current URL
        currentUrl = new URL(location, currentUrl).toString()
        redirectsFollowed++
        continue
      }

      break
    }

    if (!upstreamResponse) {
      return NextResponse.json({ error: "Failed to fetch upstream response" }, { status: 502 })
    }

    if (redirectsFollowed > MAX_REDIRECTS) {
      return NextResponse.json({ error: "Too many redirects" }, { status: 508 })
    }

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

