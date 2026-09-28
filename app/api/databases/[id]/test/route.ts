import { NextRequest, NextResponse } from "next/server"
import { testConnectedDatabase } from "@/lib/server-connected-databases"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const body = await req.json().catch(() => ({}))
    const result = await testConnectedDatabase(id, body?.credentials)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        schemaStatus: "missing",
        tablesFound: [],
        error: err.message || "Failed to execute connection test",
      },
      { status: 500 }
    )
  }
}
