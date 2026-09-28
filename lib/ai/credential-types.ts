// ---------------------------------------------------------------------------
// Zenith AI — Credential & Provider Type Definitions (Client & Server Safe)
// ---------------------------------------------------------------------------

import type { AIProviderId } from "./types"

export type ProviderNormalizedStatus =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "VERIFYING"
  | "READY"
  | "EXPIRED"
  | "REVOKED"
  | "INVALID"
  | "INVALID_CREDENTIAL"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "BILLING_REQUIRED"
  | "MODEL_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "ERROR"

export interface StoredCredential {
  id: string
  userId: string
  teamId?: string
  providerId: AIProviderId
  name?: string
  encryptedApiKey?: string // Encrypted with AES-256-GCM (server only)
  maskedKey?: string // Safe hint for UI display
  customEndpoint?: string
  organizationId?: string
  defaultModel?: string
  enabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
  lastTestedAt?: string
  lastStatus?: ProviderNormalizedStatus | "connected" | "error" | "untested"
  lastError?: string
  latencyMs?: number
  source: "byok" | "env"
}

export interface ClientSafeProviderState {
  id: string
  providerId: AIProviderId
  name: string
  description: string
  website: string
  supportsCustomEndpoint: boolean
  requiresApiKey: boolean
  isConfigured: boolean
  source: "byok" | "env" | "none"
  maskedKey?: string
  customEndpoint?: string
  defaultModel: string
  enabled: boolean
  isDefault: boolean
  lastTestedAt?: string
  lastStatus: ProviderNormalizedStatus | "connected" | "error" | "untested" | "not_configured"
  normalizedStatus?: ProviderNormalizedStatus
  lastError?: string
  latencyMs?: number
  systemKeyAvailable?: boolean
  models: Array<{
    id: string
    name: string
    contextWindow: number
    capabilities: any
    pricing?: any
    isFree?: boolean
  }>
}

export interface ConnectionTestResult {
  success: boolean
  status:
    | ProviderNormalizedStatus
    | "connected"
    | "invalid_key"
    | "unauthorized"
    | "rate_limited"
    | "invalid_endpoint"
    | "unsupported_model"
    | "provider_error"
  latencyMs?: number
  error?: string
  modelTested?: string
}

export interface SaveCredentialParams {
  userId?: string
  teamId?: string
  providerId: AIProviderId
  apiKey?: string
  customEndpoint?: string
  organizationId?: string
  defaultModel?: string
  enabled?: boolean
  isDefault?: boolean
  name?: string
}

export interface UpdateCredentialParams {
  name?: string
  customEndpoint?: string
  defaultModel?: string
  enabled?: boolean
  isDefault?: boolean
}
