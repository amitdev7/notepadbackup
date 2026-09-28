// ---------------------------------------------------------------------------
// Zenith AI — /api/ai/usage Endpoint (Usage Telemetry & Logs)
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { AIUsageTracker } from "@/lib/ai/usage-tracker"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const stats = AIUsageTracker.getAggregatedStats()
    const recentLogs = AIUsageTracker.getRecentLogs(30)
    return NextResponse.json({ stats, recentLogs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to get usage stats." }, { status: 500 })
  }
}
