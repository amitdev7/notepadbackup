import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  const now = Date.now()
  const headers = request.headers

  // 1. Inspect native Vercel / Cloudflare edge geolocation headers
  const vercelCity = headers.get("x-vercel-ip-city")
  const vercelCountry = headers.get("x-vercel-ip-country")
  const vercelRegion = headers.get("x-vercel-ip-country-region")
  const vercelTimezone = headers.get("x-vercel-ip-timezone")

  const cfCity = headers.get("cf-ipcity")
  const cfCountry = headers.get("cf-ipcountry")
  const cfTimezone = headers.get("cf-timezone")

  let city = vercelCity ? decodeURIComponent(vercelCity) : cfCity ? decodeURIComponent(cfCity) : null
  let country = vercelCountry ? decodeURIComponent(vercelCountry) : cfCountry ? decodeURIComponent(cfCountry) : null
  let region = vercelRegion ? decodeURIComponent(vercelRegion) : null
  let timezone = vercelTimezone || cfTimezone || null
  let source: "headers" | "ip" | "fallback" = "headers"

  // 2. If running locally in development without edge headers, query lightweight public IP lookup
  if (!city && !country) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 2000)

      // Query freeipapi (HTTPS, no auth token required, high rate limit for personal projects)
      const res = await fetch("https://freeipapi.com/api/json", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      })
      clearTimeout(timer)

      if (res.ok) {
        const data = await res.json()
        if (data && (data.cityName || data.countryName)) {
          city = data.cityName || null
          country = data.countryName || null
          region = data.regionName || null
          timezone = data.timeZone || timezone
          source = "ip"
        }
      }
    } catch {
      // Offline or network error: return clean payload with fallback source
      source = "fallback"
    }
  }

  return NextResponse.json(
    {
      ok: true,
      timestamp: now,
      timezone: timezone || "UTC",
      location: {
        city: city || null,
        region: region || null,
        country: country || null,
        countryCode: vercelCountry || cfCountry || null,
        source,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  )
}
