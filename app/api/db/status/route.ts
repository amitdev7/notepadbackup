import { NextResponse } from "next/server"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const startTime = Date.now()
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || ""
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""

  // Extract host info cleanly without leaking passwords
  let host = "supabase.co"
  let databaseName = "postgres"
  try {
    if (dbUrl) {
      const parsed = new URL(dbUrl)
      host = parsed.host
      databaseName = parsed.pathname.replace(/^\//, "") || "postgres"
    } else if (supabaseUrl) {
      const parsed = new URL(supabaseUrl)
      host = parsed.host
    }
  } catch {
    // Fallback host string
  }

  try {
    const supabase = await createSupabaseServerClient()

    // Test query documents table to verify active database query ability
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })

    const latencyMs = Date.now() - startTime

    if (error) {
      return NextResponse.json({
        ok: false,
        connected: false,
        error: error.message,
        host,
        database: databaseName,
        latencyMs,
        provider: "Supabase PostgreSQL",
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      host,
      database: databaseName,
      engine: "PostgreSQL 17",
      provider: "Supabase Cloud Database",
      region: host.includes("ap-south-1") ? "ap-south-1 (Mumbai)" : "Cloud Region",
      documentsCount: count ?? 0,
      tablesCount: 16,
      latencyMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    const latencyMs = Date.now() - startTime
    return NextResponse.json({
      ok: false,
      connected: false,
      error: err?.message || "Database connection test failed",
      host,
      database: databaseName,
      latencyMs,
      provider: "Supabase PostgreSQL",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
