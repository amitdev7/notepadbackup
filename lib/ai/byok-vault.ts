// ---------------------------------------------------------------------------
// Zenith AI — Server-Side BYOK Vault & Credential Store Facade
// ---------------------------------------------------------------------------

import type { AIProviderId, BYOKConfig } from "./types"
import { ProviderCredentialService, type ClientSafeProviderState, type ConnectionTestResult } from "./credential-service"

export class BYOKVault {
  /**
   * Saves a provider API key and optional custom endpoint to the secure server vault.
   */
  static async saveKey(
    providerId: AIProviderId,
    apiKey?: string,
    customEndpoint?: string,
    defaultModel?: string,
    isDefault?: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const res = await ProviderCredentialService.saveCredential({
      providerId,
      apiKey,
      customEndpoint,
      defaultModel,
      isDefault,
    })
    return { success: res.success, error: res.error }
  }

  /**
   * Deletes a configured key from the vault.
   */
  static deleteKey(providerId: AIProviderId): boolean {
    return ProviderCredentialService.deleteCredential(providerId)
  }

  /**
   * Retrieves effective credentials for a provider.
   */
  static getEffectiveCredentials(providerId: AIProviderId): {
    apiKey?: string
    customEndpoint?: string
    defaultModel?: string
    source: "byok" | "env" | "none"
  } {
    return ProviderCredentialService.getEffectiveCredentials(providerId)
  }

  /**
   * Returns a list of configured providers with MASKED keys (safe for UI).
   */
  static listConfiguredKeys(): BYOKConfig[] {
    const list = ProviderCredentialService.listCredentials()
    return list.map((c) => ({
      providerId: c.providerId,
      maskedKey: c.maskedKey,
      customEndpoint: c.customEndpoint,
      updatedAt: c.updatedAt,
    }))
  }

  /**
   * Returns complete client-safe metadata for all providers.
   */
  static listClientSafeProviders(): ClientSafeProviderState[] {
    return ProviderCredentialService.getClientSafeProviders()
  }

  /**
   * Tests a provider API key with a fast health-check request.
   */
  static async testConnection(
    providerId: AIProviderId,
    apiKey?: string,
    customEndpoint?: string,
    modelId?: string
  ): Promise<ConnectionTestResult> {
    return ProviderCredentialService.testConnection({
      providerId,
      apiKey,
      customEndpoint,
      modelId,
    })
  }
}
