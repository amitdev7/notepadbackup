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
    isDefault?: boolean,
    userId?: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await ProviderCredentialService.saveCredential({
      providerId,
      apiKey,
      customEndpoint,
      defaultModel,
      isDefault,
      userId,
      name,
    })
    return { success: res.success, error: res.error }
  }

  /**
   * Deletes a configured key from the vault.
   */
  static deleteKey(providerId: AIProviderId, userId?: string): boolean {
    return ProviderCredentialService.deleteCredential(providerId, userId)
  }

  /**
   * Retrieves effective credentials for a provider.
   */
  static getEffectiveCredentials(providerId: AIProviderId, userId?: string): {
    apiKey?: string
    customEndpoint?: string
    defaultModel?: string
    source: "byok" | "env" | "none"
  } {
    return ProviderCredentialService.getEffectiveCredentials(providerId, userId)
  }

  /**
   * Returns a list of configured providers with MASKED keys (safe for UI).
   */
  static listConfiguredKeys(userId?: string): BYOKConfig[] {
    const list = ProviderCredentialService.listCredentials(userId)
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
  static listClientSafeProviders(userId?: string): ClientSafeProviderState[] {
    return ProviderCredentialService.getClientSafeProviders(userId)
  }

  /**
   * Tests a provider API key with a fast health-check request.
   */
  static async testConnection(
    providerId: AIProviderId,
    apiKey?: string,
    customEndpoint?: string,
    modelId?: string,
    userId?: string
  ): Promise<ConnectionTestResult> {
    return ProviderCredentialService.testConnection({
      providerId,
      apiKey,
      customEndpoint,
      modelId,
      userId,
    })
  }
}
