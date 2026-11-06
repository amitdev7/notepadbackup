import { NextResponse, type NextRequest } from "next/server"
import { isDisallowedHost } from "@/app/api/assets/proxy/route"
import { checkFrameRestriction } from "@/lib/media/frame-security"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl.trim())
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  // SSRF Protection
  if (isDisallowedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Forbidden host" }, { status: 403 })
  }

  // First check known restricted patterns
  const knownCheck = checkFrameRestriction(targetUrl)
  if (knownCheck.isRestricted) {
    return NextResponse.json({
      canEmbed: false,
      reason: knownCheck.reason,
      siteName: knownCheck.siteName,
      helpTip: knownCheck.helpTip,
      accentGradient: knownCheck.accentGradient,
      brandColor: knownCheck.brandColor,
    })
  }

  // Fast network header preflight check
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    let res: Response
    try {
      res = await fetch(targetUrl, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Zenithsui-Embed-Checker/1.0",
        },
        redirect: "follow",
      })
    } catch {
      // Fallback to GET with Range if HEAD is unsupported by the remote server
      const getController = new AbortController()
      const getTimeout = setTimeout(() => getController.abort(), 3500)
      res = await fetch(targetUrl, {
        method: "GET",
        signal: getController.signal,
        headers: {
          "User-Agent": "Zenithsui-Embed-Checker/1.0",
          Range: "bytes=0-1024",
        },
        redirect: "follow",
      })
      clearTimeout(getTimeout)
    } finally {
      clearTimeout(timeout)
    }

    const xfo = res.headers.get("x-frame-options")?.toUpperCase()
    const csp = res.headers.get("content-security-policy")?.toLowerCase()

    let canEmbed = true
    let reason = ""

    if (xfo === "DENY" || xfo === "SAMEORIGIN") {
      canEmbed = false
      reason = `Site specifies X-Frame-Options: ${xfo}`
    } else if (csp && csp.includes("frame-ancestors")) {
      const match = csp.match(/frame-ancestors\s+([^;]+)/)
      if (match && !match[1].includes("*")) {
        canEmbed = false
        reason = "Site specifies strict Content-Security-Policy (frame-ancestors)"
      }
    }

    return NextResponse.json({
      canEmbed,
      reason,
      siteName: parsed.hostname.replace(/^www\./, ""),
      status: res.status,
    })
  } catch (err: unknown) {
    // If request fails or times out, allow iframe to attempt normal render
    return NextResponse.json({
      canEmbed: true,
      reason: "Preflight timed out or failed to connect",
      networkError: String(err),
    })
  }
}
