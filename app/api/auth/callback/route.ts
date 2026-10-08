import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

function sanitizeRedirectPath(path: string | null): string {
  if (!path || typeof path !== "string") return "/"
  // Strictly prevent protocol-relative URLs, Windows path separators, schemes, and control characters
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes(":") ||
    /[\x00-\x1F\s]/.test(path)
  ) {
    return "/"
  }
  return path
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = sanitizeRedirectPath(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=could_not_authenticate`)
}
