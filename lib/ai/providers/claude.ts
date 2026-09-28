// ---------------------------------------------------------------------------
// Zenith AI — Anthropic Claude Provider Adapter
// Official Claude API (claude-3-7-sonnet, claude-3-5-haiku) with streaming
// ---------------------------------------------------------------------------

import { BaseAIProvider, type ProviderTestResult } from "./base"
import type { AIRequest, AIResponse, AIStreamChunk, AIProviderId } from "../types"

export class ClaudeProvider extends BaseAIProvider {
  readonly providerId: AIProviderId = "anthropic"
  readonly name = "Anthropic Claude"

  private getEndpoint(customEndpoint?: string): string {
    return customEndpoint || "https://api.anthropic.com/v1/messages"
  }

  async generate(request: AIRequest, apiKey: string): Promise<AIResponse> {
    const startTime = Date.now()
    const endpoint = this.getEndpoint(request.customEndpoint)
    const model = request.model || "claude-3-7-sonnet-20250219"

    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }))

    const payload: any = {
      model,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
    }

    if (request.systemPrompt) {
      payload.system = request.systemPrompt
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Claude API error (${res.status}): ${errText || res.statusText}`)
    }

    const data = await res.json()
    const rawText = Array.isArray(data.content)
      ? data.content.filter((c: any) => c && c.type === "text" && typeof c.text === "string").map((c: any) => c.text).join("") || ""
      : ""
    const { cleanText, reasoningText, citations, actions } = this.parseActionsAndCitations(rawText)
    const latencyMs = Date.now() - startTime

    const promptTokens = data.usage?.input_tokens || Math.max(1, Math.round(rawText.length / 4))
    const completionTokens = data.usage?.output_tokens || Math.max(1, Math.round(rawText.length / 4))

    return {
      id: data.id || `anthropic-${Date.now()}`,
      text: cleanText,
      reasoningText,
      provider: "anthropic",
      model,
      citations,
      actions,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        estimatedCostUsd: (promptTokens * 0.003 + completionTokens * 0.015) / 1000,
      },
    }
  }

  async generateStream(
    request: AIRequest,
    apiKey: string,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    const startTime = Date.now()
    const endpoint = this.getEndpoint(request.customEndpoint)
    const model = request.model || "claude-3-7-sonnet-20250219"

    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }))

    const payload: any = {
      model,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      stream: true,
    }

    if (request.systemPrompt) {
      payload.system = request.systemPrompt
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Claude stream failed (${res.status}): ${errText || res.statusText}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let accumulatedText = ""
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith("data:")) continue
        const dataStr = trimmed.replace(/^data:\s*/, "")

        try {
          const parsed = JSON.parse(dataStr)
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            accumulatedText += parsed.delta.text
            onChunk({ text: parsed.delta.text, done: false })
          }
        } catch {
          // non-JSON SSE lines
        }
      }
    }

    const { cleanText, reasoningText, citations, actions } = this.parseActionsAndCitations(accumulatedText)
    const latencyMs = Date.now() - startTime

    const promptTokens = Math.max(1, Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / 4))
    const completionTokens = Math.max(1, Math.round(accumulatedText.length / 4))

    const finalResponse: AIResponse = {
      id: `anthropic-${Date.now()}`,
      text: cleanText,
      reasoningText,
      provider: "anthropic",
      model,
      citations,
      actions,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        estimatedCostUsd: (promptTokens * 0.003 + completionTokens * 0.015) / 1000,
      },
    }

    onChunk({ done: true, citations, actions })
    return finalResponse
  }

  async testConnection(apiKey: string, customEndpoint?: string): Promise<ProviderTestResult> {
    const startTime = Date.now()
    const endpoint = this.getEndpoint(customEndpoint)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      })

      const latencyMs = Date.now() - startTime
      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        return {
          success: false,
          providerId: "anthropic",
          model: "claude-3-5-haiku-20241022",
          latencyMs,
          error: `HTTP ${res.status}: ${errText}`,
        }
      }

      return {
        success: true,
        providerId: "anthropic",
        model: "claude-3-5-haiku-20241022",
        latencyMs,
      }
    } catch (err: any) {
      return {
        success: false,
        providerId: "anthropic",
        model: "claude-3-5-haiku-20241022",
        latencyMs: Date.now() - startTime,
        error: err.message || String(err),
      }
    }
  }
}
