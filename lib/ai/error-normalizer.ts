// ---------------------------------------------------------------------------
// Zenith AI — Provider Error Normalizer
// ---------------------------------------------------------------------------

import type { AIProviderId } from "./types"
import type { ProviderNormalizedStatus } from "./credential-types"

export type NormalizedAIErrorCode =
  | "AUTH_REQUIRED"
  | "AI_NOT_CONNECTED"
  | "PROVIDER_NOT_READY"
  | "INVALID_CREDENTIAL"
  | "AUTHORIZATION_EXPIRED"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "BILLING_REQUIRED"
  | "MODEL_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "AI_DISABLED"
  | "REQUEST_INVALID"
  | "INTERNAL_ERROR"

export interface NormalizedAIError {
  status: ProviderNormalizedStatus
  code?: NormalizedAIErrorCode
  friendlyMessage: string
  canFallback: boolean
  httpStatus: number
  providerName: string
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openrouter: "OpenRouter",
  openai: "ChatGPT / OpenAI",
  gemini: "Google Gemini",
  groq: "Groq",
  anthropic: "Anthropic Claude",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  huggingface: "HuggingFace",
  azure: "Azure OpenAI",
  "openai-compatible": "Custom OpenAI Provider",
  custom: "Custom Gateway",
}

/**
 * Normalizes raw HTTP errors, status codes, and exception messages into clean,
 * user-friendly error objects with appropriate fallback flags.
 *
 * Rules:
 * - 402 / Insufficient Balance -> BILLING_REQUIRED (no fallback, no auto-retry)
 * - 429 -> RATE_LIMITED (no auto-retry spam)
 * - 401 / 403 -> INVALID_CREDENTIAL (no fallback)
 * - 404 / unsupported model -> MODEL_UNAVAILABLE
 * - 5xx -> PROVIDER_ERROR (eligible for fallback if secondary provider is READY)
 * - Timeout / Network -> TIMEOUT / NETWORK_ERROR (eligible for fallback)
 */
export function normalizeAIError(
  error: any,
  providerId: AIProviderId = "gemini",
  httpStatusCode?: number
): NormalizedAIError {
  const providerName = PROVIDER_DISPLAY_NAMES[providerId] || "AI Provider"
  const rawMsg = String(error?.message || error || "").toLowerCase()
  const status = httpStatusCode || error?.status || error?.statusCode || 0

  // 1. Quota / Billing / Insufficient Balance (402 or explicit text)
  if (
    status === 402 ||
    rawMsg.includes("402") ||
    rawMsg.includes("insufficient balance") ||
    rawMsg.includes("insufficient_quota") ||
    rawMsg.includes("quota exceeded") ||
    rawMsg.includes("credit") ||
    rawMsg.includes("billing") ||
    rawMsg.includes("exceeded your current quota")
  ) {
    return {
      status: "BILLING_REQUIRED",
      code: "BILLING_REQUIRED",
      friendlyMessage: `This ${providerName} account cannot process requests because its available balance or quota is insufficient. Connect another provider or update your provider billing settings.`,
      canFallback: false,
      httpStatus: 402,
      providerName,
    }
  }

  // 2. Authentication / Invalid Credential / Expired (401, 403)
  if (
    status === 401 ||
    status === 403 ||
    rawMsg.includes("401") ||
    rawMsg.includes("403") ||
    rawMsg.includes("unauthorized") ||
    rawMsg.includes("invalid api key") ||
    rawMsg.includes("invalid_api_key") ||
    rawMsg.includes("incorrect api key") ||
    rawMsg.includes("forbidden") ||
    rawMsg.includes("permission denied") ||
    rawMsg.includes("api_key_invalid") ||
    rawMsg.includes("bad_api_key")
  ) {
    return {
      status: "INVALID_CREDENTIAL",
      code: "INVALID_CREDENTIAL",
      friendlyMessage: `The API key for ${providerName} is invalid, expired, or lacks necessary permissions. Please reconnect or update your credentials in Settings.`,
      canFallback: false,
      httpStatus: 401,
      providerName,
    }
  }

  // 3. Rate Limit Exceeded (429)
  if (
    status === 429 ||
    rawMsg.includes("429") ||
    rawMsg.includes("rate limit") ||
    rawMsg.includes("too many requests") ||
    rawMsg.includes("resource exhausted")
  ) {
    return {
      status: "RATE_LIMITED",
      code: "RATE_LIMITED",
      friendlyMessage: `${providerName} rate limit reached. Please wait a moment before sending another request.`,
      canFallback: false,
      httpStatus: 429,
      providerName,
    }
  }

  // 4. Model Unavailable / Not Found (404)
  if (
    status === 404 ||
    rawMsg.includes("404") ||
    rawMsg.includes("model not found") ||
    rawMsg.includes("model_not_found") ||
    rawMsg.includes("does not exist") ||
    rawMsg.includes("not supported") ||
    rawMsg.includes("decommissioned")
  ) {
    return {
      status: "MODEL_UNAVAILABLE",
      code: "MODEL_UNAVAILABLE",
      friendlyMessage: `The selected model is currently unavailable on ${providerName}. Please choose another model in Settings.`,
      canFallback: false,
      httpStatus: 404,
      providerName,
    }
  }

  // 5. Network Failure / Connection Refused
  if (
    rawMsg.includes("fetch failed") ||
    rawMsg.includes("network error") ||
    rawMsg.includes("econnrefused") ||
    rawMsg.includes("enotfound") ||
    rawMsg.includes("connection reset")
  ) {
    return {
      status: "NETWORK_ERROR",
      code: "NETWORK_ERROR",
      friendlyMessage: `Unable to connect to ${providerName}. Please check your network connection or verify the custom endpoint.`,
      canFallback: true,
      httpStatus: 503,
      providerName,
    }
  }

  // 6. Timeout
  if (
    rawMsg.includes("timeout") ||
    rawMsg.includes("timed out") ||
    rawMsg.includes("abort") ||
    rawMsg.includes("deadline exceeded")
  ) {
    return {
      status: "TIMEOUT",
      code: "TIMEOUT",
      friendlyMessage: `The request to ${providerName} timed out. Please try again.`,
      canFallback: true,
      httpStatus: 504,
      providerName,
    }
  }

  // 7. Server Error (5xx)
  if (status >= 500 && status <= 599) {
    return {
      status: "PROVIDER_ERROR",
      code: "PROVIDER_ERROR",
      friendlyMessage: `${providerName} is experiencing a temporary service outage (HTTP ${status}). Please try again shortly.`,
      canFallback: true,
      httpStatus: status,
      providerName,
    }
  }

  // Generic fallback
  return {
    status: "ERROR",
    code: "INTERNAL_ERROR",
    friendlyMessage: `Failed to communicate with ${providerName}. Please check your connection and configuration.`,
    canFallback: false,
    httpStatus: status || 500,
    providerName,
  }
}

