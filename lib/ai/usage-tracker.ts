// ---------------------------------------------------------------------------
// Zenith AI — Usage, Telemetry & Cost Tracker
// ---------------------------------------------------------------------------

import type { AIProviderId, AIUsageRecord } from "./types"
import { getModelMeta } from "./model-registry"

interface AggregatedUsage {
  totalRequests: number
  totalTokens: number
  totalCostUsd: number
  providers: Record<
    AIProviderId,
    {
      requestCount: number
      totalTokens: number
      estimatedCostUsd: number
    }
  >
}

// In-memory usage log
const usageLogs: AIUsageRecord[] = []
const rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map()

export class AIUsageTracker {
  /**
   * Records an AI request and updates usage telemetry.
   */
  static record(
    providerId: AIProviderId,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    status: "success" | "error" = "success",
    errorMessage?: string
  ): void {
    const meta = getModelMeta(providerId, modelId)
    let estimatedCostUsd = 0

    if (meta.pricing) {
      const inCost = (inputTokens / 1_000_000) * meta.pricing.inputPerMillionUsd
      const outCost = (outputTokens / 1_000_000) * meta.pricing.outputPerMillionUsd
      estimatedCostUsd = inCost + outCost
    }

    usageLogs.push({
      timestamp: Date.now(),
      providerId,
      modelId,
      inputTokens,
      outputTokens,
      latencyMs,
      estimatedCostUsd,
      status,
      errorMessage,
    })

    // Keep log buffer bounded to latest 1,000 entries
    if (usageLogs.length > 1000) {
      usageLogs.shift()
    }
  }

  /**
   * Checks if an IP / user identifier has exceeded the per-minute request rate limit.
   * Normalizes proxy chains ("a, b, c" → "a") so each client gets one bucket.
   */
  static checkRateLimit(rawIdentifier: string, limitPerMinute = 60): { allowed: boolean; remaining: number } {
    const identifier = (rawIdentifier || "anonymous").split(",")[0].trim() || "anonymous"
    const now = Date.now()
    const record = rateLimitMap.get(identifier)

    if (!record || now > record.resetAt) {
      rateLimitMap.set(identifier, { count: 1, resetAt: now + 60000 })
      return { allowed: true, remaining: limitPerMinute - 1 }
    }

    if (record.count >= limitPerMinute) {
      return { allowed: false, remaining: 0 }
    }

    record.count += 1
    return { allowed: true, remaining: limitPerMinute - record.count }
  }

  /**
   * Retrieves aggregated usage statistics.
   */
  static getAggregatedStats(): AggregatedUsage {
    let totalRequests = 0
    let totalTokens = 0
    let totalCostUsd = 0
    const providers: Record<string, { requestCount: number; totalTokens: number; estimatedCostUsd: number }> = {}

    for (const log of usageLogs) {
      totalRequests += 1
      const tokens = log.inputTokens + log.outputTokens
      totalTokens += tokens
      totalCostUsd += log.estimatedCostUsd

      if (!providers[log.providerId]) {
        providers[log.providerId] = { requestCount: 0, totalTokens: 0, estimatedCostUsd: 0 }
      }
      providers[log.providerId].requestCount += 1
      providers[log.providerId].totalTokens += tokens
      providers[log.providerId].estimatedCostUsd += log.estimatedCostUsd
    }

    return {
      totalRequests,
      totalTokens,
      totalCostUsd,
      providers: providers as any,
    }
  }

  static getRecentLogs(limit = 50): AIUsageRecord[] {
    return usageLogs.slice(-limit)
  }
}
