// ---------------------------------------------------------------------------
// Zenith AI — Multi-Provider Router, Streaming Engine & Fallback Chain
// ---------------------------------------------------------------------------

import { GoogleGenAI } from "@google/genai"
import type { AIProviderId, RoutingMode, StudentModeAction } from "./types"
import { AI_PROVIDERS } from "./model-registry"
import { ProviderCredentialService } from "./credential-service"
import { AIUsageTracker } from "./usage-tracker"
import { normalizeAIError } from "./error-normalizer"
import { AccountSecurityBoundary } from "./account-boundary"
import { AIOrchestrator } from "./orchestrator"

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onComplete: (fullText: string, metadata?: Record<string, any>) => void
  onError: (error: Error) => void
}

/**
 * Resolve a preferred model id against the registry: the preferred provider
 * keeps it when it lists it, otherwise the first provider (preferred first)
 * that lists a candidate wins. Never returns a model no provider declares.
 */
function pickRegistryModel(
  preferredProvider: AIProviderId,
  candidates: string[]
): { providerId: AIProviderId; modelId: string } | null {
  const ordered = [
    AI_PROVIDERS[preferredProvider],
    ...Object.values(AI_PROVIDERS).filter((m) => m.id !== preferredProvider),
  ].filter(Boolean)
  for (const modelId of candidates) {
    for (const meta of ordered) {
      if (meta.models.some((m) => m.id === modelId)) {
        return { providerId: meta.id, modelId }
      }
    }
  }
  const fallback = ordered[0]
  const firstModel = fallback?.models[0]?.id
  if (fallback && firstModel) return { providerId: fallback.id, modelId: firstModel }
  return null
}

export class AIRouter {
  /**
   * Validates and selects the effective model based on registry metadata.
   * Ensures no provider/model mismatch occurs.
   */
  static selectEffectiveModel(
    preferredProvider: AIProviderId,
    preferredModel: string,
    mode: RoutingMode = "manual"
  ): { providerId: AIProviderId; modelId: string } {
    const providerMeta = AI_PROVIDERS[preferredProvider] || AI_PROVIDERS.openai
    const validModel = providerMeta.models.some((m) => m.id === preferredModel)
      ? preferredModel
      : providerMeta.models[0]?.id || "gpt-4o"

    if (mode === "manual") {
      return { providerId: providerMeta.id, modelId: validModel }
    }

    if (mode === "fastest") {
      const fast = pickRegistryModel(preferredProvider, ["llama-3.1-8b-instant", "gemini-3.8-flash", "gpt-4o-mini"])
      if (fast) return fast
    }

    if (mode === "best-reasoning") {
      const smart = pickRegistryModel(preferredProvider, ["llama-3.3-70b-versatile", "gemini-2.5-pro", "o3-mini"])
      if (smart) return smart
    }

    if (mode === "cheapest") {
      const cheap = pickRegistryModel(preferredProvider, ["llama-3.1-8b-instant", "gemini-3.8-flash", "gpt-4o-mini"])
      if (cheap) return cheap
    }

    if (mode === "best-available" || mode === "document-analysis") {
      // Largest context window among READY providers wins; documents need room.
      try {
        const ready = ProviderCredentialService.getClientSafeProviders().filter(
          (p) => p.enabled && p.isConfigured
        )
        let best: { providerId: AIProviderId; modelId: string } | null = null
        let bestCtx = -1
        for (const p of ready) {
          const meta = AI_PROVIDERS[p.providerId as AIProviderId]
          if (!meta) continue
          for (const m of meta.models) {
            const ctx = (m as any).contextWindow ?? 0
            if (ctx > bestCtx) {
              bestCtx = ctx
              best = { providerId: meta.id, modelId: m.id }
            }
          }
        }
        if (best) return best
      } catch {
        /* fall through to manual */
      }
    }

    return { providerId: providerMeta.id, modelId: validModel }
  }

  /**
   * Generates a streaming or synchronous response with intelligent fallback.
   * Never fakes success.
   */
  static async executeChat({
    providerId,
    modelId,
    messages,
    studentAction,
    canvasContext,
    userId,
    callbacks,
  }: {
    providerId: AIProviderId
    modelId: string
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
    studentAction?: StudentModeAction
    canvasContext?: string
    userId: string
    pdfDataUrl?: string
    callbacks?: StreamCallbacks
  }): Promise<{ text: string; providerUsed: AIProviderId; modelUsed: string }> {
    const start = Date.now()
    const effectiveProvider = providerId
    const effectiveModel = modelId

    // 0. Enforce Account Security Boundary
    // Intercept account-sensitive requests before calling any external LLM
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
    const userInput = lastUserMsg?.content || ""
    const accountCheck = AccountSecurityBoundary.checkRequest(userInput)

    if (accountCheck.isRestrictedAccountAction) {
      const guidanceText = accountCheck.safeGuidanceMessage || "This action involves sensitive account settings. Please manage this directly in your Settings menu."
      if (callbacks?.onChunk) {
        callbacks.onChunk(guidanceText)
      }
      if (callbacks?.onComplete) {
        callbacks.onComplete(guidanceText)
      }
      return {
        text: guidanceText,
        providerUsed: effectiveProvider,
        modelUsed: effectiveModel,
      }
    }

    // 1. Build rich orchestrator prompt with tool registry, asset memory, and canvas context
    const intent = AIOrchestrator.classifyIntent(userInput, Boolean(canvasContext), studentAction)
    const systemInstruction = AIOrchestrator.buildOrchestratorPrompt({
      userInput,
      intent,
      canvasContext,
      studentAction,
    })

    // 2. Execute primary provider request
    try {
      const res = await this.callProvider(effectiveProvider, effectiveModel, systemInstruction, messages, userId, callbacks)
      AIUsageTracker.record(
        effectiveProvider,
        effectiveModel,
        Math.round(systemInstruction.length / 4 + 100),
        Math.round(res.length / 4),
        Date.now() - start,
        "success"
      )
      return { text: res, providerUsed: effectiveProvider, modelUsed: effectiveModel }
    } catch (primaryErr: any) {
      const normalized = normalizeAIError(primaryErr, effectiveProvider, primaryErr.status)

      // Check if fallback is eligible:
      // 5xx / timeout / network failures OR 404 model not found are eligible for fallback.
      if (normalized.canFallback || primaryErr?.status === 404 || String(primaryErr?.message || "").includes("not found")) {
        // Every READY provider is a candidate — not just the big four.
        let candidateChain: AIProviderId[] = []
        try {
          candidateChain = ProviderCredentialService.getClientSafeProviders(userId)
            .filter((p) => p.enabled && p.isConfigured && p.providerId !== effectiveProvider)
            .map((p) => p.providerId as AIProviderId)
        } catch {
          candidateChain = []
        }
        if (!candidateChain.length) {
          candidateChain = (["openai", "gemini", "groq", "anthropic"] as AIProviderId[]).filter(
            (p) => p !== effectiveProvider
          )
        }

        for (const fallbackTarget of candidateChain) {
          const targetCreds = ProviderCredentialService.getEffectiveCredentials(fallbackTarget, userId)

          // Only fallback if secondary provider is configured, enabled, and ready
          if (targetCreds.source !== "none" && targetCreds.enabled) {
            try {
              const targetMeta = AI_PROVIDERS[fallbackTarget]
              const fallbackModel = targetMeta?.models[0]?.id || "gpt-4o"
              const res = await this.callProvider(fallbackTarget, fallbackModel, systemInstruction, messages, userId, callbacks)
              AIUsageTracker.record(
                fallbackTarget,
                fallbackModel,
                Math.round(systemInstruction.length / 4 + 100),
                Math.round(res.length / 4),
                Date.now() - start,
                "success"
              )
              return { text: res, providerUsed: fallbackTarget, modelUsed: fallbackModel }
            } catch {
              // Try next candidate in chain or bubble up original error
              continue
            }
          }
        }
      }

      AIUsageTracker.record(effectiveProvider, effectiveModel, 0, 0, Date.now() - start, "error", normalized.friendlyMessage)
      throw new Error(normalized.friendlyMessage)
    }
  }

  /**
   * Internal provider dispatcher.
   */
  private static async callProvider(
    providerId: AIProviderId,
    modelId: string,
    systemInstruction: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    userId: string,
    callbacks?: StreamCallbacks
  ): Promise<string> {
    const creds = ProviderCredentialService.getEffectiveCredentials(providerId, userId)

    // 1. Google Gemini
    if (providerId === "gemini") {
      const key = creds.apiKey
      if (!key) {
        throw new Error("Google Gemini is not connected. Please connect your Gemini API key in Settings.")
      }

      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })

      // Normalize model ID to avoid 404s
      const targetModel =
        modelId && modelId !== "gemini-3.6-flash" && modelId !== "gemini-2.5-flash"
          ? modelId
          : "gemini-3.8-flash"

      // Format history for Gemini
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))

      if (callbacks?.onChunk) {
        let stream: any
        try {
          stream = await ai.models.generateContentStream({
            model: targetModel,
            contents,
            config: {
              systemInstruction,
            },
          })
        } catch (firstErr: any) {
          if (targetModel !== "gemini-3.7-flash") {
            stream = await ai.models.generateContentStream({
              model: "gemini-3.7-flash",
              contents,
              config: {
                systemInstruction,
              },
            })
          } else {
            throw firstErr
          }
        }

        let accumulated = ""
        for await (const chunk of stream) {
          const chunkText = chunk.text || ""
          if (chunkText) {
            accumulated += chunkText
            callbacks.onChunk(chunkText)
          }
        }
        callbacks.onComplete(accumulated)
        return accumulated
      } else {
        let response: any
        try {
          response = await ai.models.generateContent({
            model: targetModel,
            contents,
            config: {
              systemInstruction,
            },
          })
        } catch (firstErr: any) {
          if (targetModel !== "gemini-3.7-flash") {
            response = await ai.models.generateContent({
              model: "gemini-3.7-flash",
              contents,
              config: {
                systemInstruction,
              },
            })
          } else {
            throw firstErr
          }
        }
        const text = response.text || ""
        callbacks?.onComplete?.(text)
        return text
      }
    }

    // 2. OpenAI / ChatGPT
    if (providerId === "openai") {
      if (!creds.apiKey) {
        throw new Error("ChatGPT / OpenAI is not connected. Please connect your OpenAI API key in Settings.")
      }

      const openAIMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ]

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
      }
      if (creds.organizationId) {
        headers["OpenAI-Organization"] = creds.organizationId
      }

      const endpoint = creds.customEndpoint
        ? `${creds.customEndpoint.replace(/\/$/, "")}/chat/completions`
        : "https://api.openai.com/v1/chat/completions"

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelId || "gpt-4o",
          messages: openAIMessages,
          stream: !!callbacks?.onChunk,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        const error = new Error(errJson?.error?.message || `OpenAI error (${res.status})`)
        ;(error as any).status = res.status
        throw error
      }

      // Streaming response handling
      if (callbacks?.onChunk && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""
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
            const dataStr = trimmed.slice(5).trim()
            if (dataStr === "[DONE]") continue
            try {
              const parsed = JSON.parse(dataStr)
              const token = parsed.choices?.[0]?.delta?.content || ""
              if (token) {
                accumulated += token
                callbacks.onChunk(token)
              }
            } catch {
              // Ignore non-JSON chunks
            }
          }
        }
        callbacks.onComplete(accumulated)
        return accumulated
      } else {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ""
        callbacks?.onComplete?.(text)
        return text
      }
    }

    // 3. Groq (Ultra-fast LPU inference with streaming)
    if (providerId === "groq") {
      if (!creds.apiKey) {
        throw new Error("Groq is not connected. Please connect your Groq API key in Settings.")
      }

      const groqMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ]

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
      }

      const endpoint = creds.customEndpoint
        ? `${creds.customEndpoint.replace(/\/$/, "")}/chat/completions`
        : "https://api.groq.com/openai/v1/chat/completions"

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelId || "llama-3.3-70b-versatile",
          messages: groqMessages,
          stream: !!callbacks?.onChunk,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        const rawErrMsg = errJson?.error?.message || `Groq error (${res.status})`
        const error = new Error(rawErrMsg)
        ;(error as any).status = res.status
        throw error
      }

      // Streaming response handling
      if (callbacks?.onChunk && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""
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
            const dataStr = trimmed.slice(5).trim()
            if (dataStr === "[DONE]") continue
            try {
              const parsed = JSON.parse(dataStr)
              const token = parsed.choices?.[0]?.delta?.content || ""
              if (token) {
                accumulated += token
                callbacks.onChunk(token)
              }
            } catch {
              // Ignore non-JSON chunks
            }
          }
        }
        callbacks.onComplete(accumulated)
        return accumulated
      } else {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ""
        callbacks?.onComplete?.(text)
        return text
      }
    }

    // 4. Anthropic Claude
    if (providerId === "anthropic") {
      if (!creds.apiKey) {
        throw new Error("Anthropic Claude is not connected. Please connect your Anthropic API key in Settings.")
      }

      const claudeMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

      const claudeModel = modelId && modelId.startsWith("claude") ? modelId : "claude-3-7-sonnet-20250219"

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": creds.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: claudeModel,
          system: systemInstruction,
          messages: claudeMessages,
          max_tokens: 4096,
          stream: !!callbacks?.onChunk,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        const error = new Error(`Anthropic error (${res.status}): ${errText}`)
        ;(error as any).status = res.status
        throw error
      }

      if (callbacks?.onChunk && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""
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
            const dataStr = trimmed.slice(5).trim()
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const token = parsed.delta.text
                accumulated += token
                callbacks.onChunk(token)
              }
            } catch {
              // ignore
            }
          }
        }
        callbacks.onComplete(accumulated)
        return accumulated
      } else {
        const data = await res.json()
        const text = data.content?.[0]?.text || ""
        callbacks?.onComplete?.(text)
        return text
      }
    }

    // 5. Other custom / OpenAI-compatible providers (DeepSeek, Perplexity, etc.)
    let endpoint = "https://api.openai.com/v1/chat/completions"
    const extraHeaders: Record<string, string> = {}
    if (providerId === "deepseek") endpoint = "https://api.deepseek.com/chat/completions"
    if (providerId === "perplexity") endpoint = "https://api.perplexity.ai/chat/completions"
    if (providerId === "openrouter") {
      endpoint = "https://openrouter.ai/api/v1/chat/completions"
      extraHeaders["HTTP-Referer"] =
        process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://zenithsui.sh"
      extraHeaders["X-Title"] = "zenithsui"
    }
    if (providerId === "azure") {
      // Azure needs a deployment URL, never the generic OpenAI one.
      const base = (creds.customEndpoint || "").replace(/\/$/, "")
      if (!base || /your-resource/i.test(base)) {
        throw new Error("Azure OpenAI endpoint is not configured. Add your deployment URL in Settings.")
      }
      endpoint = /\/chat\/completions(\?|$)/.test(base) ? base : `${base}/chat/completions?api-version=2024-02-15-preview`
    } else if (providerId === "huggingface") {
      const base = (creds.customEndpoint || "https://api-inference.huggingface.co/models").replace(/\/$/, "")
      endpoint = `${base}/${encodeURIComponent(modelId)}`
    } else if (creds.customEndpoint) {
      const trimmed = creds.customEndpoint.replace(/\/$/, "")
      endpoint = /\/chat\/completions(\?|$)/.test(trimmed) ? trimmed : `${trimmed}/chat/completions`
    }

    if (!creds.apiKey) {
      throw new Error(`${providerId} API key is not configured. Please add your key in Settings.`)
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemInstruction },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: !!callbacks?.onChunk,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      const error = new Error(errJson?.error?.message || `${providerId} error (${res.status})`)
      ;(error as any).status = res.status
      throw error
    }

    if (callbacks?.onChunk && res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""
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
          const dataStr = trimmed.slice(5).trim()
          if (dataStr === "[DONE]") continue
          try {
            const parsed = JSON.parse(dataStr)
            const token = parsed.choices?.[0]?.delta?.content || ""
            if (token) {
              accumulated += token
              callbacks.onChunk(token)
            }
          } catch {
            // Ignore non-JSON chunks
          }
        }
      }
      callbacks.onComplete(accumulated)
      return accumulated
    } else {
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || ""
      callbacks?.onComplete?.(text)
      return text
    }
  }
}
