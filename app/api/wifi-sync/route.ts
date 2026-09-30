import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import crypto from "node:crypto"

/**
 * Extracts a normalized Wi-Fi / Local Network identifier.
 * - On public Wi-Fi (e.g. deployed on Vercel), all devices behind the same Wi-Fi router share the same public NAT IP.
 * - On local development / LAN, devices on the same private subnet (e.g. 192.168.1.X) share the same subnet prefix.
 */
function getNetworkKey(request: NextRequest): { networkKey: string; ip: string } {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim()

  const rawIp = forwardedFor || realIp || cfConnectingIp || "127.0.0.1"

  let normalizedKey = rawIp

  // Handle IPv6 localhost
  if (rawIp === "::1" || rawIp === "127.0.0.1" || rawIp === "localhost") {
    normalizedKey = "local_dev_network"
  } else if (rawIp.startsWith("192.168.")) {
    // Local Wi-Fi subnet: 192.168.X
    const parts = rawIp.split(".")
    normalizedKey = `lan_${parts[0]}.${parts[1]}.${parts[2]}`
  } else if (rawIp.startsWith("10.")) {
    // 10.X.X subnet
    const parts = rawIp.split(".")
    normalizedKey = `lan_${parts[0]}.${parts[1]}`
  }

  // Hash the network identifier so raw IPs are never stored or exposed
  const hash = crypto.createHash("sha256").update(`zenithsui_wifi_${normalizedKey}`).digest("hex").slice(0, 24)
  return { networkKey: `wifi_${hash}`, ip: rawIp }
}

export async function GET(request: NextRequest) {
  try {
    const { networkKey, ip } = getNetworkKey(request)
    const supabase = await getSupabaseServerClient()

    const { data, error } = await (supabase.from("wifi_canvas_sessions" as any) as any)
      .select("*")
      .eq("network_key", networkKey)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      networkKey,
      clientIp: ip.startsWith("127.") || ip === "::1" ? "Localhost / LAN" : "Wi-Fi Router IP",
      session: data || null,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { networkKey } = getNetworkKey(request)
    const body = await request.json()
    const { docId, fileName, nodes, order, version } = body

    if (!docId) {
      return NextResponse.json({ ok: false, error: "Missing docId" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await (supabase.from("wifi_canvas_sessions" as any) as any)
      .upsert(
        {
          network_key: networkKey,
          doc_id: docId,
          file_name: fileName || "Untitled Canvas",
          nodes: nodes || {},
          order_list: order || [],
          version: typeof version === "number" ? version : 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "network_key" }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, session: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
