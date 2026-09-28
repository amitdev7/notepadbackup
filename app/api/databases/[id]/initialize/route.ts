import { NextRequest, NextResponse } from "next/server"
import { initializeConnectedDatabaseSchema } from "@/lib/server-connected-databases"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const result = await initializeConnectedDatabaseSchema(id)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, version: 0, error: err.message || "Schema initialization failed" },
      { status: 500 }
    )
  }
}
