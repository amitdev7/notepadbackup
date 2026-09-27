// ---------------------------------------------------------------------------
// Zenith AI — Groq Provider Adapter
// Ultra-fast low-latency inference powered by Groq LPUs
// ---------------------------------------------------------------------------

import { OpenAIProvider } from "./openai"
import type { AIProviderId } from "../types"
import type { ProviderTestResult } from "./base"

export class GroqProvider extends OpenAIProvider {
  override readonly providerId: AIProviderId = "groq"
  override readonly name: string = "Groq"

  protected override getEndpoint(customEndpoint?: string): string {
    return customEndpoint || "https://api.groq.com/openai/v1/chat/completions"
  }

  override async testConnection(apiKey: string, customEndpoint?: string): Promise<ProviderTestResult> {
    const startTime = Date.now()
    const endpoint = this.getEndpoint(customEndpoint)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      })

      const latencyMs = Date.now() - startTime
      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        return {
          success: false,
          providerId: "groq",
          model: "llama-3.1-8b-instant",
          latencyMs,
          error: `HTTP ${res.status}: ${errText}`,
        }
      }

      return {
        success: true,
        providerId: "groq",
        model: "llama-3.1-8b-instant",
        latencyMs,
      }
    } catch (err: any) {
      return {
        success: false,
        providerId: "groq",
        model: "llama-3.1-8b-instant",
        latencyMs: Date.now() - startTime,
        error: err.message || String(err),
      }
    }
  }
}
