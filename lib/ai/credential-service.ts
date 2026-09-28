// ---------------------------------------------------------------------------
// Zenith AI — Secure Provider Credential Store & Lifecycle Service
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import type { AIProviderId } from "./types"
import { SecretEncryptionService } from "./encryption"
import { validateCustomEndpoint, maskApiKey } from "./security-audit"
import { AI_PROVIDERS } from "./model-registry"
import { readJsonSnapshot, writeJsonSnapshot } from "@/lib/server-storage"
import type {
  StoredCredential,
  ClientSafeProviderState,
  ConnectionTestResult,
  SaveCredentialParams,
  UpdateCredentialParams,
  ProviderNormalizedStatus,
} from "./credential-types"
import { normalizeAIError } from "./error-normalizer"

export type {
  StoredCredential,
  ClientSafeProviderState,
  ConnectionTestResult,
  SaveCredentialParams,
  UpdateCredentialParams,
}

// In-memory server-side persistent store (keyed by userId -> Array<StoredCredential>)
const credentialStore: Map<string, StoredCredential[]> = new Map()

let credentialsHydrated = false

function hydrateCredentials(): void {
  if (credentialsHydrated) return
  credentialsHydrated = true
  try {
    const data = readJsonSnapshot<Record<string, StoredCredential[]>>("ai_credentials.json", {})
    if (data && typeof data === "object") {
      for (const [uId, list] of Object.entries(data)) {
        if (Array.isArray(list)) {
          credentialStore.set(uId, list)
        }
      }
    }
  } catch (err) {
    console.warn("[Zenith AI] Failed to hydrate credentials from disk snapshot:", err)
  }
}

function persistCredentials(): void {
  try {
    const obj: Record<string, StoredCredential[]> = {}
    for (const [uId, list] of credentialStore.entries()) {
      obj[uId] = list
    }
    writeJsonSnapshot("ai_credentials.json", obj)
  } catch (err) {
    console.warn("[Zenith AI] Failed to persist credentials to disk snapshot:", err)
  }
}

// Default global user ID for single-tenant / local session
const DEFAULT_USER_ID = "zenith_default_user"

export class ProviderCredentialService {
  /**
   * Returns all stored credentials for a user.
   */
  static listCredentials(userId: string = DEFAULT_USER_ID): StoredCredential[] {
    hydrateCredentials()
    return credentialStore.get(userId) || []
  }

  /**
   * Retrieves a credential by its ID.
   */
  static getCredentialById(id: string, userId: string = DEFAULT_USER_ID): StoredCredential | undefined {
    const list = this.listCredentials(userId)
    return list.find((c) => c.id === id)
  }

  /**
   * Retrieves a credential by provider ID.
   */
  static getCredentialByProvider(providerId: AIProviderId, userId: string = DEFAULT_USER_ID): StoredCredential | undefined {
    const list = this.listCredentials(userId)
    return list.find((c) => c.providerId === providerId)
  }

  /**
   * Retrieves the effective decrypted credentials (API key + endpoint + defaultModel).
   * Checks BYOK store first, then falls back to server environment variables.
   */
  static getEffectiveCredentials(
    providerId: AIProviderId,
    userId: string = DEFAULT_USER_ID
  ): {
    apiKey?: string
    customEndpoint?: string
    organizationId?: string
    defaultModel?: string
    source: "byok" | "env" | "none"
    enabled: boolean
  } {
    const effectiveUserId = userId || DEFAULT_USER_ID
    const stored = this.getCredentialByProvider(providerId, effectiveUserId)
    const meta = AI_PROVIDERS[providerId]
    const requiresKey = meta?.requiresApiKey ?? true

    if (stored) {
      if (!stored.enabled) {
        return { source: "byok", enabled: false }
      }

      let decryptedKey: string | undefined
      if (stored.encryptedApiKey) {
        try {
          decryptedKey = SecretEncryptionService.decryptFromString(stored.encryptedApiKey)
        } catch (e) {
          console.error(`[Zenith AI Credential Decryption Failed] for provider: ${providerId}`)
        }
      }

      if (decryptedKey || (!requiresKey && stored.customEndpoint)) {
        return {
          apiKey: decryptedKey,
          customEndpoint: stored.customEndpoint,
          organizationId: stored.organizationId,
          defaultModel: stored.defaultModel,
          source: stored.source || "byok",
          enabled: true,
        }
      }
    }

    // Fall back to server environment variables if available
    let envKey: string | undefined
    if (providerId === "gemini") {
      envKey = process.env.GEMINI_API_KEY
    } else if (providerId === "openai") {
      envKey = process.env.OPENAI_API_KEY
    } else if (providerId === "groq") {
      envKey = process.env.GROQ_API_KEY
    } else if (providerId === "anthropic") {
      envKey = process.env.ANTHROPIC_API_KEY
    } else if (providerId === "deepseek") {
      envKey = process.env.DEEPSEEK_API_KEY
    } else if (providerId === "perplexity") {
      envKey = process.env.PERPLEXITY_API_KEY
    } else if (providerId === "openrouter") {
      envKey = process.env.OPENROUTER_API_KEY
    }

    if (envKey && envKey.trim()) {
      const meta = AI_PROVIDERS[providerId]
      const defaultModel = stored?.defaultModel || meta?.models[0]?.id || (providerId === "gemini" ? "gemini-3.8-flash" : "default")
      return {
        apiKey: envKey.trim(),
        defaultModel,
        source: "env",
        enabled: stored ? stored.enabled : true,
      }
    }

    return { source: "none", enabled: false }
  }

  /**
   * Adds or updates a provider credential securely.
   * Performs input validation, SSRF checks, AES-256-GCM encryption, and creates safe masked hint.
   */
  static async saveCredential({
    userId = DEFAULT_USER_ID,
    providerId,
    apiKey,
    customEndpoint,
    organizationId,
    defaultModel,
    enabled = true,
    isDefault = false,
    name,
  }: {
    userId?: string
    providerId: AIProviderId
    apiKey?: string
    customEndpoint?: string
    organizationId?: string
    defaultModel?: string
    enabled?: boolean
    isDefault?: boolean
    name?: string
  }): Promise<{ success: boolean; credential?: StoredCredential; error?: string }> {
    const meta = AI_PROVIDERS[providerId]
    if (!meta) {
      return { success: false, error: `Unsupported provider identifier: ${providerId}` }
    }

    // Validate endpoint SSRF safety if custom endpoint provided
    if (customEndpoint) {
      const val = validateCustomEndpoint(customEndpoint)
      if (!val.valid) {
        return { success: false, error: val.error }
      }
    }

    // Allow connecting using server system key for Gemini or Groq if requested
    let trimmedKey = apiKey?.trim()
    let isSystemEnvKey = false
    if (providerId === "gemini" && trimmedKey === "__SYSTEM_GEMINI_KEY__") {
      if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: "System Gemini key is not configured on the server." }
      }
      trimmedKey = process.env.GEMINI_API_KEY
      isSystemEnvKey = true
    } else if (providerId === "groq" && trimmedKey === "__SYSTEM_GROQ_KEY__") {
      if (!process.env.GROQ_API_KEY) {
        return { success: false, error: "System Groq key is not configured on the server." }
      }
      trimmedKey = process.env.GROQ_API_KEY
      isSystemEnvKey = true
    } else if (providerId === "openrouter" && trimmedKey === "__SYSTEM_OPENROUTER_KEY__") {
      if (!process.env.OPENROUTER_API_KEY) {
        return { success: false, error: "System OpenRouter key is not configured on the server." }
      }
      trimmedKey = process.env.OPENROUTER_API_KEY
      isSystemEnvKey = true
    }

    // Ensure API key is provided if provider strictly requires one
    if (!trimmedKey && meta.requiresApiKey && !customEndpoint) {
      return { success: false, error: `API key is required for ${meta.name}.` }
    }

    // Encrypt API key
    let encryptedApiKey: string | undefined
    let masked: string | undefined
    if (trimmedKey) {
      encryptedApiKey = SecretEncryptionService.encryptToString(trimmedKey)
      masked = isSystemEnvKey ? "•••••••••••• (Server Environment)" : maskApiKey(trimmedKey)
    }

    const now = new Date().toISOString()
    const userCredentials = this.listCredentials(userId)
    const existingIndex = userCredentials.findIndex((c) => c.providerId === providerId)

    // If marked as default, clear default status on others
    if (isDefault) {
      userCredentials.forEach((c) => (c.isDefault = false))
    }

    const chosenModel =
      defaultModel && meta.models.some((m) => m.id === defaultModel)
        ? defaultModel
        : meta.models[0]?.id || "default"

    let credential: StoredCredential

    if (existingIndex >= 0) {
      const existing = userCredentials[existingIndex]
      credential = {
        ...existing,
        name: name || existing.name,
        encryptedApiKey: encryptedApiKey || existing.encryptedApiKey,
        maskedKey: masked || existing.maskedKey,
        customEndpoint: customEndpoint !== undefined ? customEndpoint.trim() : existing.customEndpoint,
        organizationId: organizationId || existing.organizationId,
        defaultModel: chosenModel,
        enabled,
        isDefault: isDefault || existing.isDefault,
        source: isSystemEnvKey ? "env" : "byok",
        updatedAt: now,
      }
      userCredentials[existingIndex] = credential
    } else {
      credential = {
        id: `cred_${providerId}_${nanoid(8)}`,
        userId,
        providerId,
        name: name || meta.name,
        encryptedApiKey,
        maskedKey: masked,
        customEndpoint: customEndpoint?.trim(),
        organizationId,
        defaultModel: chosenModel,
        enabled,
        isDefault: isDefault || userCredentials.length === 0, // First added is default
        createdAt: now,
        updatedAt: now,
        lastStatus: "untested",
        source: isSystemEnvKey ? "env" : "byok",
      }
      userCredentials.push(credential)
    }

    credentialStore.set(userId, userCredentials)
    persistCredentials()

    return { success: true, credential }
  }

  /**
   * Updates an existing credential (e.g. toggle enabled, change model, set as default).
   */
  static updateCredential(
    id: string,
    updates: Partial<Pick<StoredCredential, "enabled" | "isDefault" | "defaultModel" | "name" | "customEndpoint">>,
    userId: string = DEFAULT_USER_ID
  ): { success: boolean; error?: string } {
    const list = this.listCredentials(userId)
    const index = list.findIndex((c) => c.id === id)
    if (index === -1) {
      // Settings UI addresses never-configured (env-only) providers as
      // `prov_<providerId>` — materialize a keyless preference row for them
      // (the key itself still comes from the server environment at call time)
      // so toggles, models, and defaults actually stick.
      const m = /^prov_(.+)$/.exec(id)
      const meta = m ? AI_PROVIDERS[m[1] as AIProviderId] : undefined
      if (meta) {
        if (updates.isDefault) {
          list.forEach((c) => (c.isDefault = false))
        }
        const now = new Date().toISOString()
        list.push({
          id: `cred_${meta.id}_${nanoid(8)}`,
          userId,
          providerId: meta.id,
          name: typeof updates.name === "string" && updates.name ? updates.name : meta.name,
          customEndpoint: updates.customEndpoint,
          defaultModel: updates.defaultModel || meta.models[0]?.id || "default",
          enabled: typeof updates.enabled === "boolean" ? updates.enabled : true,
          isDefault: !!updates.isDefault,
          createdAt: now,
          updatedAt: now,
          lastStatus: "untested",
          source: "byok",
        } as StoredCredential)
        credentialStore.set(userId, list)
        persistCredentials()
        return { success: true }
      }
      return { success: false, error: "Credential not found." }
    }

    if (updates.isDefault) {
      list.forEach((c) => (c.isDefault = false))
    }

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    credentialStore.set(userId, list)
    persistCredentials()
    return { success: true }
  }

  /**
   * Deletes and purges a credential from the vault.
   */
  static deleteCredential(idOrProviderId: string, userId: string = DEFAULT_USER_ID): boolean {
    const list = this.listCredentials(userId)
    const filtered = list.filter((c) => c.id !== idOrProviderId && c.providerId !== idOrProviderId)
    const changed = filtered.length !== list.length
    credentialStore.set(userId, filtered)
    if (changed) {
      persistCredentials()
    }
    return changed
  }

  /**
   * Generates a complete client-safe representation of all providers in the registry.
   * This is sent to the UI settings page and NEVER contains raw API keys.
   */
  static getClientSafeProviders(userId: string = DEFAULT_USER_ID): ClientSafeProviderState[] {
    const effectiveUserId = userId || DEFAULT_USER_ID
    const storedList = this.listCredentials(effectiveUserId)
    const results: ClientSafeProviderState[] = []

    // Ensure OpenAI, Gemini, and Groq are first in order
    const orderedProviderIds: AIProviderId[] = ["openai", "gemini", "groq", ...((Object.keys(AI_PROVIDERS) as AIProviderId[]).filter(
      (p) => p !== "openai" && p !== "gemini" && p !== "groq"
    ))]

    // Check which system keys exist on the server
    const hasSystemGemini = !!process.env.GEMINI_API_KEY
    const hasSystemOpenAI = !!process.env.OPENAI_API_KEY
    const hasSystemGroq = !!process.env.GROQ_API_KEY
    const hasSystemAnthropic = !!process.env.ANTHROPIC_API_KEY
    const hasSystemDeepseek = !!process.env.DEEPSEEK_API_KEY
    const hasSystemPerplexity = !!process.env.PERPLEXITY_API_KEY
    const hasSystemOpenRouter = !!process.env.OPENROUTER_API_KEY

    // Check if user has any default provider explicitly set
    const userHasDefault = storedList.some((c) => c.isDefault && c.enabled)

    for (const pId of orderedProviderIds) {
      const meta = AI_PROVIDERS[pId]
      if (!meta) continue
      const stored = storedList.find((c) => c.providerId === pId)
      const effective = this.getEffectiveCredentials(pId, effectiveUserId)

      const systemKeyAvailable =
        (pId === "gemini" && hasSystemGemini) ||
        (pId === "openai" && hasSystemOpenAI) ||
        (pId === "groq" && hasSystemGroq) ||
        (pId === "anthropic" && hasSystemAnthropic) ||
        (pId === "deepseek" && hasSystemDeepseek) ||
        (pId === "perplexity" && hasSystemPerplexity) ||
        (pId === "openrouter" && hasSystemOpenRouter)

      const hasValidKey = !!effective.apiKey || (!meta.requiresApiKey && !!effective.customEndpoint)
      const isConfigured = effective.source !== "none" && hasValidKey
      let normalizedStatus: ProviderNormalizedStatus = "NOT_CONNECTED"

      if (stored) {
        if (!hasValidKey) {
          normalizedStatus = "NOT_CONNECTED"
        } else if (!stored.enabled) {
          normalizedStatus = "NOT_CONNECTED"
        } else if (stored.lastStatus === "connected" || stored.lastStatus === "READY") {
          normalizedStatus = "READY"
        } else if (stored.lastStatus === "error" || stored.lastStatus === "INVALID") {
          normalizedStatus = "INVALID"
        } else if (stored.lastStatus && stored.lastStatus !== "untested") {
          normalizedStatus = stored.lastStatus as ProviderNormalizedStatus
        } else {
          normalizedStatus = "CONNECTED"
        }
      } else if (isConfigured && effective.source === "env") {
        normalizedStatus = "READY"
      }

      const enabled = stored ? stored.enabled : (isConfigured && effective.source === "env")
      // Auto-default to Gemini if server key exists and user hasn't explicitly set another default
      const isDefault = stored ? stored.isDefault : (!userHasDefault && pId === "gemini" && hasSystemGemini)

      results.push({
        id: stored?.id || `prov_${pId}`,
        providerId: pId,
        name: meta.name,
        description: meta.description,
        website: meta.website,
        supportsCustomEndpoint: !!meta.supportsCustomEndpoint,
        requiresApiKey: meta.requiresApiKey,
        isConfigured,
        source: stored ? (hasValidKey ? (stored.source || "byok") : "none") : (isConfigured ? "env" : "none"),
        maskedKey: stored?.maskedKey || (isConfigured && effective.source === "env" ? "•••••••••••• (Server Key Active)" : undefined),
        customEndpoint: stored?.customEndpoint || (meta.supportsCustomEndpoint ? meta.defaultEndpoint : undefined),
        defaultModel: stored?.defaultModel || meta.models[0]?.id || "default",
        enabled,
        isDefault,
        lastTestedAt: stored?.lastTestedAt || (isConfigured && effective.source === "env" ? new Date().toISOString() : undefined),
        lastStatus: normalizedStatus,
        normalizedStatus,
        lastError: stored?.lastError,
        latencyMs: stored?.latencyMs,
        systemKeyAvailable,
        models: meta.models.map((m) => ({
          id: m.id,
          name: m.name,
          contextWindow: m.contextWindow,
          capabilities: m.capabilities,
          pricing: m.pricing,
        })),
      })
    }

    return results
  }

  /**
   * Tests connection to an AI provider with live server-side verification.
   * Returns safe status and latency measurements.
   */
  static async testConnection({
    providerId,
    apiKey,
    customEndpoint,
    modelId,
    userId = DEFAULT_USER_ID,
  }: {
    providerId: AIProviderId
    apiKey?: string
    customEndpoint?: string
    modelId?: string
    userId?: string
  }): Promise<ConnectionTestResult> {
    const meta = AI_PROVIDERS[providerId]
    if (!meta) {
      return {
        success: false,
        status: "ERROR",
        error: `Unknown provider: ${providerId}`,
      }
    }

    // Determine credentials to test (draft from client or stored)
    let keyToTest = apiKey?.trim()
    let endpointToTest = customEndpoint?.trim()

    if (keyToTest === "__SYSTEM_GEMINI_KEY__" && providerId === "gemini") {
      keyToTest = process.env.GEMINI_API_KEY
    } else if (keyToTest === "__SYSTEM_GROQ_KEY__" && providerId === "groq") {
      keyToTest = process.env.GROQ_API_KEY
    } else if (keyToTest === "__SYSTEM_OPENROUTER_KEY__" && providerId === "openrouter") {
      keyToTest = process.env.OPENROUTER_API_KEY
    }

    if (!keyToTest) {
      const eff = this.getEffectiveCredentials(providerId, userId)
      keyToTest = eff.apiKey
      if (!endpointToTest) endpointToTest = eff.customEndpoint
    }

    if (!keyToTest && meta.requiresApiKey) {
      return {
        success: false,
        status: "NOT_CONNECTED",
        error: `No API key provided or configured for ${meta.name}.`,
      }
    }

    if (endpointToTest) {
      const val = validateCustomEndpoint(endpointToTest)
      if (!val.valid) {
        return {
          success: false,
          status: "INVALID",
          error: val.error,
        }
      }
    }

    const testModel = modelId || meta.models[0]?.id || "gemini-3.7-flash"
    const start = Date.now()

    try {
      // 1. Google Gemini Live Health Check
      if (providerId === "gemini") {
        const { GoogleGenAI } = await import("@google/genai")
        const ai = new GoogleGenAI({ apiKey: keyToTest! })
        const targetModel = modelId || "gemini-3.8-flash"
        let response
        let finalModel = targetModel

        try {
          response = await ai.models.generateContent({
            model: targetModel,
            contents: "ping",
          })
        } catch (firstErr: any) {
          // If gemini-3.8-flash hits temporary 429 or 404, fallback to gemini-3.7-flash
          if (targetModel !== "gemini-3.7-flash") {
            finalModel = "gemini-3.7-flash"
            response = await ai.models.generateContent({
              model: "gemini-3.7-flash",
              contents: "ping",
            })
          } else {
            throw firstErr
          }
        }

        if (response && response.text !== undefined) {
          const latency = Date.now() - start
          this.recordTestOutcome(providerId, "READY", latency, undefined, userId)
          return {
            success: true,
            status: "READY",
            latencyMs: latency,
            modelTested: finalModel,
          }
        }
        throw new Error("Empty response from Google Gemini API.")
      }

      // 2. OpenAI / ChatGPT Live Health Check
      if (providerId === "openai") {
        const res = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${keyToTest || ""}`,
          },
        })

        const latency = Date.now() - start

        if (res.ok) {
          this.recordTestOutcome(providerId, "READY", latency, undefined, userId)
          return {
            success: true,
            status: "READY",
            latencyMs: latency,
            modelTested: testModel,
          }
        }

        const errData = await res.json().catch(() => ({}))
        const normalized = normalizeAIError(errData?.error?.message || "OpenAI error", "openai", res.status)
        this.recordTestOutcome(providerId, normalized.status, latency, normalized.friendlyMessage, userId)
        return {
          success: false,
          status: normalized.status,
          latencyMs: latency,
          error: normalized.friendlyMessage,
          modelTested: testModel,
        }
      }

      // 3. Anthropic Claude Live Health Check
      if (providerId === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keyToTest || "",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: testModel.includes("claude") ? testModel : "claude-3-5-haiku-20241022",
            max_tokens: 5,
            messages: [{ role: "user", content: "ping" }],
          }),
        })

        const latency = Date.now() - start

        if (res.ok) {
          this.recordTestOutcome(providerId, "READY", latency, undefined, userId)
          return {
            success: true,
            status: "READY",
            latencyMs: latency,
            modelTested: testModel,
          }
        }

        const errText = await res.text()
        const normalized = normalizeAIError(errText, "anthropic", res.status)
        this.recordTestOutcome(providerId, normalized.status, latency, normalized.friendlyMessage, userId)
        return {
          success: false,
          status: normalized.status,
          latencyMs: latency,
          error: normalized.friendlyMessage,
          modelTested: testModel,
        }
      }

      // 4. Groq Live Health Check
      if (providerId === "groq") {
        const groqEndpoint = endpointToTest
          ? `${endpointToTest.replace(/\/$/, "")}/chat/completions`
          : "https://api.groq.com/openai/v1/chat/completions"
        const groqModel =
          testModel.includes("llama") || testModel.includes("groq") || testModel.includes("qwen") || testModel.includes("gpt-oss")
            ? testModel
            : "llama-3.1-8b-instant"

        const res = await fetch(groqEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyToTest || ""}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        })

        const latency = Date.now() - start

        if (res.ok) {
          this.recordTestOutcome(providerId, "READY", latency, undefined, userId)
          return {
            success: true,
            status: "READY",
            latencyMs: latency,
            modelTested: groqModel,
          }
        }

        const errText = await res.text().catch(() => "")
        const normalized = normalizeAIError(errText, "groq", res.status)
        this.recordTestOutcome(providerId, normalized.status, latency, normalized.friendlyMessage, userId)
        return {
          success: false,
          status: normalized.status,
          latencyMs: latency,
          error: normalized.friendlyMessage,
          modelTested: groqModel,
        }
      }

      // 5. Other endpoints / custom endpoints
      let targetEndpoint = "https://api.openai.com/v1/chat/completions"
      let reqHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keyToTest || ""}`,
      }

      if (providerId === "deepseek") {
        targetEndpoint = "https://api.deepseek.com/chat/completions"
      } else if (providerId === "perplexity") {
        targetEndpoint = "https://api.perplexity.ai/chat/completions"
      } else if (providerId === "openrouter") {
        targetEndpoint = "https://openrouter.ai/api/v1/chat/completions"
        reqHeaders = {
          ...reqHeaders,
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://zenithsui.sh",
          "X-Title": "zenithsui",
        }
      } else if (providerId === "azure") {
        const base = (endpointToTest || "").replace(/\/$/, "")
        if (base && !/your-resource/i.test(base)) {
          targetEndpoint = /\/chat\/completions(\?|$)/.test(base)
            ? base
            : `${base}/chat/completions?api-version=2024-02-15-preview`
        }
      } else if (providerId === "huggingface") {
        targetEndpoint = `https://api-inference.huggingface.co/models/${testModel}`
        reqHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keyToTest || ""}`,
        }
      } else if (endpointToTest) {
        const trimmed = endpointToTest.replace(/\/$/, "")
        targetEndpoint = /\/chat\/completions(\?|$)/.test(trimmed)
          ? trimmed
          : `${trimmed}/chat/completions`
      }

      const res = await fetch(targetEndpoint, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      })

      const latency = Date.now() - start

      if (res.ok) {
        this.recordTestOutcome(providerId, "READY", latency, undefined, userId)
        return {
          success: true,
          status: "READY",
          latencyMs: latency,
          modelTested: testModel,
        }
      }

      const errText = await res.text()
      const normalized = normalizeAIError(errText, providerId, res.status)
      this.recordTestOutcome(providerId, normalized.status, latency, normalized.friendlyMessage, userId)
      return {
        success: false,
        status: normalized.status,
        latencyMs: latency,
        error: normalized.friendlyMessage,
        modelTested: testModel,
      }
    } catch (err: any) {
      const latency = Date.now() - start
      const normalized = normalizeAIError(err, providerId)
      this.recordTestOutcome(providerId, normalized.status, latency, normalized.friendlyMessage, userId)
      return {
        success: false,
        status: normalized.status,
        latencyMs: latency,
        error: normalized.friendlyMessage,
        modelTested: testModel,
      }
    }
  }

  /**
   * Internal helper to record test outcomes in memory.
   * Never persists phantom rows for env-only providers: a health check must
   * not mint credentials (or steal `isDefault`) in the vault file.
   */
  private static recordTestOutcome(
    providerId: AIProviderId,
    status: ProviderNormalizedStatus,
    latencyMs: number,
    error?: string,
    userId: string = DEFAULT_USER_ID
  ) {
    const effectiveUserId = userId || DEFAULT_USER_ID
    const list = this.listCredentials(effectiveUserId)
    const cred = list.find((c) => c.providerId === providerId)
    const now = new Date().toISOString()
    if (cred) {
      cred.lastTestedAt = now
      cred.lastStatus = status
      cred.latencyMs = latencyMs
      cred.lastError = error
      persistCredentials()
    }
    // No stored row and no persist: env-only providers are evaluated live
    // from process.env on every read, so there is nothing to record.
  }
}
