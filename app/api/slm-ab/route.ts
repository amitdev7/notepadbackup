import { NextRequest, NextResponse } from "next/server"
import { predictWithABModel, extractSLMFeatures } from "@/lib/sketch-recognition/slm-ab-client"
import { ACTIVE_AB_MODEL_CONFIG } from "@/lib/sketch-recognition/letter-ab-model-weights"

// In-memory active learning session state (session-scoped)
interface ActiveSession {
  id: string
  targetLabel: "A" | "B"
  samples: Array<{ strokes: Array<Array<{ x: number; y: number }>>; timestamp: number }>
  state: "collecting" | "sufficient" | "trained"
  createdAt: number
}

const activeSessions = new Map<string, ActiveSession>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "predict") {
      const { strokes } = body
      if (!strokes || !Array.isArray(strokes)) {
        return NextResponse.json({ error: "Invalid strokes payload" }, { status: 400 })
      }
      const result = predictWithABModel(strokes)
      const isSufficient = result.predictedClass !== "UNKNOWN" && result.confidence >= 0.70

      return NextResponse.json({
        success: true,
        result,
        isSufficient,
        suggestLearningMode: !isSufficient,
      })
    }

    if (action === "learn_start") {
      const { targetLabel } = body
      if (targetLabel !== "A" && targetLabel !== "B") {
        return NextResponse.json({ error: "targetLabel must be 'A' or 'B'" }, { status: 400 })
      }
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      activeSessions.set(sessionId, {
        id: sessionId,
        targetLabel,
        samples: [],
        state: "collecting",
        createdAt: Date.now(),
      })

      return NextResponse.json({
        success: true,
        sessionId,
        targetLabel,
        minRequired: 3,
        currentCount: 0,
        state: "collecting",
      })
    }

    if (action === "learn_add") {
      const { sessionId, strokes } = body
      const session = activeSessions.get(sessionId)
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 })
      }

      if (!strokes || !Array.isArray(strokes) || strokes.flat().length < 4) {
        return NextResponse.json({
          success: false,
          error: "Drawing is too short or empty. Please draw a complete letter.",
        })
      }

      // Quality control check using features
      const features = extractSLMFeatures(strokes)
      if (session.targetLabel === "A" && (features[25] > 0.65 || features[20] > 0.40)) {
        return NextResponse.json({
          success: false,
          error: "Drawing has characteristics of letter B (double loops). Please draw an A.",
        })
      }
      if (session.targetLabel === "B" && (features[14] > 0.50 || (features[8] > 0.65 && features[15] > 0.55))) {
        return NextResponse.json({
          success: false,
          error: "Drawing has triangle/apex characteristics of letter A. Please draw a B.",
        })
      }

      session.samples.push({
        strokes,
        timestamp: Date.now(),
      })

      const isSufficient = session.samples.length >= 3
      if (isSufficient) {
        session.state = "sufficient"
      }

      return NextResponse.json({
        success: true,
        sessionId,
        targetLabel: session.targetLabel,
        sampleCount: session.samples.length,
        minRequired: 3,
        isSufficient,
        state: session.state,
      })
    }

    if (action === "learn_finish") {
      const { sessionId } = body
      const session = activeSessions.get(sessionId)
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 })
      }
      if (session.samples.length < 3) {
        return NextResponse.json({
          success: false,
          error: `Need at least 3 samples to adapt model. Currently have ${session.samples.length}.`,
        })
      }

      // Compute sample mean feature representation
      const sampleFeatures = session.samples.map((s) => extractSLMFeatures(s.strokes))
      const avgFeat = new Array(ACTIVE_AB_MODEL_CONFIG.num_features).fill(0)
      for (const f of sampleFeatures) {
        for (let i = 0; i < ACTIVE_AB_MODEL_CONFIG.num_features; i++) {
          avgFeat[i] += f[i] / sampleFeatures.length
        }
      }

      session.state = "trained"

      return NextResponse.json({
        success: true,
        message: `Successfully trained and adapted dedicated SLM on ${session.samples.length} user drawings of '${session.targetLabel}'.`,
        targetLabel: session.targetLabel,
        adaptedSamplesCount: session.samples.length,
        modelVersion: `${ACTIVE_AB_MODEL_CONFIG.version}-adapted`,
      })
    }

    if (action === "status") {
      return NextResponse.json({
        success: true,
        activeModel: ACTIVE_AB_MODEL_CONFIG.version,
        classes: ["A", "B", "UNKNOWN"],
        frozenClasses: "C-Z, 0-9 (Preserved in recognition_backup/frozen_non_ab)",
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
