"use client"

// ---------------------------------------------------------------------------
// Zenith AI — In-Website AI Provider Settings & BYOK Vault Management Modal
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react"
import {
  XIcon,
  KeyIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  LightningIcon,
  CpuIcon,
  TrashIcon,
  ArrowClockwiseIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  PencilSimpleIcon,
  StarIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  ShieldCheckIcon,
  GlobeIcon,
  SparkleIcon,
  InfoIcon,
  ChatCircleTextIcon,
  BrainIcon,
  FilePdfIcon,
  WrenchIcon,
  BracketsCurlyIcon,
  EyeClosedIcon,
} from "@phosphor-icons/react"
import { useZenithAI } from "@/lib/ai/ai-store"
import { AI_PROVIDERS, getModelMeta } from "@/lib/ai/model-registry"
import type { AIProviderId, RoutingMode } from "@/lib/ai/types"
import type { ClientSafeProviderState, ConnectionTestResult } from "@/lib/ai/credential-types"

interface UsageStatsData {
  totalRequests?: number
  totalTokens?: number
  totalCostUsd?: number
}

export function ZenithAISettingsModal() {
  const {
    isSettingsOpen,
    setSettingsOpen,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
    routingMode,
    setRoutingMode,
    providers,
    isLoadingProviders,
    fetchProviders,
    saveProviderKey,
    updateProvider,
    deleteProviderKey,
    testProviderConnection,
  } = useZenithAI()

  const [activeTab, setActiveTab] = useState<"providers" | "routing" | "usage" | "security">("providers")

  // Add / Edit form state
  const [isEditing, setIsEditing] = useState(false)
  const [editingProviderId, setEditingProviderId] = useState<AIProviderId>("gemini")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [customEndpointInput, setCustomEndpointInput] = useState("")
  const [customModelInput, setCustomModelInput] = useState("")
  const [orgIdInput, setOrgIdInput] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isFormDefault, setIsFormDefault] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  // Testing state
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    providerId: string
    result: ConnectionTestResult
  } | null>(null)

  // Deletion confirm modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Telemetry stats
  const [usageStats, setUsageStats] = useState<UsageStatsData | null>(null)

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/usage")
      if (res.ok) {
        const data = await res.json()
        setUsageStats(data.stats)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (isSettingsOpen) {
      void fetchProviders()
      void fetchUsage()
    }
  }, [isSettingsOpen, fetchProviders, fetchUsage])

  if (!isSettingsOpen) return null

  // Open Edit Form for a specific provider
  const handleOpenEdit = (pId: AIProviderId) => {
    const existing = providers.find((p) => p.providerId === pId)
    setEditingProviderId(pId)
    setApiKeyInput("")
    setCustomEndpointInput(existing?.customEndpoint || (AI_PROVIDERS[pId]?.supportsCustomEndpoint ? AI_PROVIDERS[pId].defaultEndpoint || "" : ""))
    setCustomModelInput(existing?.defaultModel || AI_PROVIDERS[pId]?.models[0]?.id || "")
    setOrgIdInput("")
    setShowPassword(false)
    setIsFormDefault(existing?.isDefault || false)
    setFormError(null)
    setTestResult(null)
    setIsEditing(true)
  }

  // Handle Save in Add/Edit Form
  const handleSaveForm = async () => {
    setFormSaving(true)
    setFormError(null)

    const meta = AI_PROVIDERS[editingProviderId]
    if (!apiKeyInput.trim() && meta.requiresApiKey) {
      setFormError(`API Key is required for ${meta.name}.`)
      setFormSaving(false)
      return
    }

    const res = await saveProviderKey({
      providerId: editingProviderId,
      apiKey: apiKeyInput.trim() || undefined,
      customEndpoint: customEndpointInput.trim() || undefined,
      defaultModel: customModelInput.trim() || undefined,
      organizationId: orgIdInput.trim() || undefined,
      isDefault: isFormDefault,
      enabled: true,
    })

    setFormSaving(false)

    if (res.success) {
      const savedKey = apiKeyInput.trim() || undefined
      const savedEndpoint = customEndpointInput.trim() || undefined
      const savedModel = customModelInput.trim() || undefined
      setIsEditing(false)
      setApiKeyInput("")
      setCustomEndpointInput("")
      setFormError(null)
      // Auto trigger live test with the values just saved (state is already
      // cleared above, so pass them explicitly).
      handleTestSingleProvider(editingProviderId, savedKey, savedEndpoint, savedModel)
    } else {
      setFormError(res.error || "Failed to save API key.")
    }
  }

  // Handle Test Connection — explicit drafts win (edit view); otherwise the
  // stored credential is tested, never a stale sibling form's leftovers.
  const handleTestSingleProvider = async (pId: AIProviderId, draftKey?: string, draftEndpoint?: string, draftModel?: string) => {
    const testingStored = draftKey === undefined && draftEndpoint === undefined && draftModel === undefined
    setTestingProviderId(pId)
    const res = await testProviderConnection({
      providerId: pId,
      apiKey: testingStored ? undefined : draftKey || (apiKeyInput.trim() ? apiKeyInput.trim() : undefined),
      customEndpoint: testingStored ? undefined : draftEndpoint || (customEndpointInput.trim() ? customEndpointInput.trim() : undefined),
      modelId: testingStored ? undefined : draftModel || customModelInput || undefined,
    })
    setTestResult({ providerId: pId, result: res })
    setTestingProviderId(null)
  }

  // Handle Set Default Provider
  const handleSetDefault = async (p: ClientSafeProviderState) => {
    await updateProvider(p.id, { isDefault: true })
    setSelectedProvider(p.providerId)
    setSelectedModel(p.defaultModel)
  }

  // Handle Toggle Enabled
  const handleToggleEnabled = async (p: ClientSafeProviderState) => {
    await updateProvider(p.id, { enabled: !p.enabled })
  }

  // Handle Change Default Model
  const handleChangeModel = async (p: ClientSafeProviderState, newModelId: string) => {
    await updateProvider(p.id, { defaultModel: newModelId })
    if (selectedProvider === p.providerId) {
      setSelectedModel(newModelId)
    }
  }

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return
    await deleteProviderKey(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  const currentProviderMeta = AI_PROVIDERS[editingProviderId]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        id="zenith-ai-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zenith-ai-settings-title"
        className="flex w-full max-w-2xl flex-col rounded-chrome-md border border-border bg-[var(--sq-paper)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-xs bg-[var(--sq-ink)] text-[var(--sq-paper)]">
              <KeyIcon className="size-4" weight="bold" />
            </div>
            <div>
              <h3 id="zenith-ai-settings-title" className="text-sm font-bold text-foreground">
                AI Provider Settings & BYOK Vault
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Configure your own AI provider keys safely. Keys are encrypted with AES-256-GCM server-side.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="flex size-7 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Close settings"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border/70 bg-muted/20 px-4 pt-2">
          {[
            { id: "providers", label: "AI Providers & Keys", icon: KeyIcon },
            { id: "routing", label: "Smart Routing", icon: CpuIcon },
            { id: "usage", label: "Usage & Cost", icon: LightningIcon },
            { id: "security", label: "Security & Offline", icon: ShieldCheckIcon },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setIsEditing(false)
                }}
                className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-[var(--sq-ink)] text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[72vh] overflow-y-auto space-y-4">
          {/* TAB 1: AI PROVIDERS & KEYS */}
          {activeTab === "providers" && !isEditing && (
            <div className="space-y-4">
              {/* Top Banner Action */}
              <div className="flex items-center justify-between rounded-chrome-sm border border-border/80 bg-muted/30 p-3">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Connected AI Providers</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Zenith AI can route through Google Gemini, OpenAI, Claude, DeepSeek, Perplexity, Azure, or local Ollama.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenEdit("gemini")}
                  className="flex items-center gap-1.5 rounded-chrome-xs bg-[var(--sq-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--sq-paper)] hover:opacity-90 transition-opacity"
                >
                  <PlusIcon className="size-3.5" weight="bold" />
                  <span>Configure Provider</span>
                </button>
              </div>

              {/* Provider Cards List */}
              <div className="space-y-3">
                {providers.map((p) => {
                  const meta = AI_PROVIDERS[p.providerId]
                  const isCurrentDefault = p.isDefault
                  const isCurrentlySelected = selectedProvider === p.providerId
                  const isTestingThis = testingProviderId === p.providerId
                  const hasTestRes = testResult?.providerId === p.providerId ? testResult.result : null

                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col rounded-chrome-sm border p-3.5 transition-all ${
                        isCurrentDefault
                          ? "border-[var(--sq-ink)]/80 bg-accent/20 shadow-xs"
                          : p.isConfigured
                          ? "border-border/80 bg-background"
                          : "border-border/50 bg-muted/10 opacity-80"
                      }`}
                    >
                      {/* Top Row: Name + Status Badges + Quick Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">{p.name}</span>
                          
                          {/* Default Badge */}
                          {isCurrentDefault && (
                            <span className="flex items-center gap-1 rounded-chrome-xs bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                              <StarIcon className="size-3 text-amber-500" weight="fill" />
                              Default
                            </span>
                          )}

                          {/* Status Badge */}
                          {p.isConfigured ? (
                            p.normalizedStatus === "READY" || p.lastStatus === "READY" || p.lastStatus === "connected" ? (
                              <span className="flex items-center gap-1 rounded-chrome-xs bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircleIcon className="size-3 text-emerald-500" weight="fill" />
                                Status: Ready
                                {p.latencyMs ? ` (${p.latencyMs}ms)` : ""}
                              </span>
                            ) : p.normalizedStatus === "INVALID" ? (
                              <span className="flex items-center gap-1 rounded-chrome-xs bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
                                <WarningCircleIcon className="size-3 text-red-500" weight="fill" />
                                Status: Invalid Key
                              </span>
                            ) : p.normalizedStatus === "BILLING_REQUIRED" ? (
                              <span className="flex items-center gap-1 rounded-chrome-xs bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                <WarningCircleIcon className="size-3 text-amber-500" weight="fill" />
                                Status: Billing Required (402)
                              </span>
                            ) : p.normalizedStatus === "RATE_LIMITED" ? (
                              <span className="flex items-center gap-1 rounded-chrome-xs bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                <WarningCircleIcon className="size-3 text-amber-500" weight="fill" />
                                Status: Rate Limited (429)
                              </span>
                            ) : !p.enabled ? (
                              <span className="rounded-chrome-xs bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Status: Disabled
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-chrome-xs bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircleIcon className="size-3 text-emerald-500" weight="fill" />
                                Status: Connected
                              </span>
                            )
                          ) : (
                            <span className="rounded-chrome-xs bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              Status: Not connected
                            </span>
                          )}
                        </div>

                        {/* Actions Right */}
                        <div className="flex items-center gap-1.5">
                          {p.isConfigured && (
                            <>
                              <button
                                onClick={() => handleTestSingleProvider(p.providerId)}
                                disabled={isTestingThis}
                                className="flex items-center gap-1 rounded-chrome-xs border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                                title="Test live API connection"
                              >
                                <ArrowClockwiseIcon className={`size-3 ${isTestingThis ? "animate-spin" : ""}`} />
                                <span>{isTestingThis ? "Testing…" : "Test"}</span>
                              </button>

                              {!isCurrentDefault && p.enabled && (
                                <button
                                  onClick={() => handleSetDefault(p)}
                                  className="rounded-chrome-xs border border-border/80 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  title="Set as global default provider"
                                >
                                  Set Default
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleEnabled(p)}
                                className="text-muted-foreground hover:text-foreground p-1"
                                title={p.enabled ? "Disable provider" : "Enable provider"}
                              >
                                {p.enabled ? (
                                  <ToggleRightIcon className="size-4 text-[var(--sq-ink)]" weight="fill" />
                                ) : (
                                  <ToggleLeftIcon className="size-4" />
                                )}
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleOpenEdit(p.providerId)}
                            className="flex items-center gap-1 rounded-chrome-xs border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                            title={p.isConfigured ? "Change API Key / Configuration" : `Connect ${p.name}`}
                          >
                            <PencilSimpleIcon className="size-3" />
                            <span>
                              {p.isConfigured
                                ? "Change"
                                : p.providerId === "openai"
                                ? "Connect ChatGPT"
                                : p.providerId === "gemini"
                                ? "Connect Gemini"
                                : p.providerId === "groq"
                                ? "Connect Groq"
                                : `Connect ${p.name}`}
                            </span>
                          </button>

                          {p.isConfigured && (
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="flex items-center gap-1 rounded-chrome-xs px-2 py-1 text-[11px] text-red-600 hover:bg-red-500/10 transition-colors"
                              title="Disconnect provider"
                            >
                              <TrashIcon className="size-3" />
                              <span>Disconnect</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description & Masked Key */}
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>

                      {p.maskedKey && (
                        <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Key:</span>
                          <span className="bg-muted/40 px-1.5 py-0.5 rounded-chrome-xs">{p.maskedKey}</span>
                          {p.customEndpoint && (
                            <span className="text-muted-foreground/70 truncate text-[10px]">
                              Endpoint: {p.customEndpoint}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Model Selector & Capabilities */}
                      {p.isConfigured && (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground">Model:</span>
                            <select
                              value={p.defaultModel}
                              onChange={(e) => handleChangeModel(p, e.target.value)}
                              className="rounded-chrome-xs border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground focus:outline-none"
                            >
                              {p.models.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.isFree ? "🎁 [FREE] " : ""}{m.name} ({Math.round(m.contextWindow / 1000)}k ctx)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Capabilities Chips */}
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {(() => {
                              const activeModel = p.models.find((m) => m.id === p.defaultModel) || p.models[0]
                              const caps = activeModel?.capabilities || {}
                              return (
                                <>
                                  {caps.chat && <span className="bg-muted/50 px-1 rounded">Chat</span>}
                                  {caps.streaming && <span className="bg-muted/50 px-1 rounded">Stream</span>}
                                  {caps.vision && <span className="bg-muted/50 px-1 rounded">Vision</span>}
                                  {caps.tools && <span className="bg-muted/50 px-1 rounded">Canvas Tools</span>}
                                  {caps.reasoning && <span className="bg-muted/50 px-1 rounded">Reasoning</span>}
                                  {caps.webSearch && <span className="bg-muted/50 px-1 rounded">Web Citations</span>}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Live Test Outcome Banner */}
                      {hasTestRes && (
                        <div
                          className={`mt-2 flex items-center gap-2 rounded-chrome-xs p-2 text-xs ${
                            hasTestRes.success
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-red-500/10 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {hasTestRes.success ? (
                            <>
                              <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
                              <span>Connection verified! Latency: {hasTestRes.latencyMs}ms ({hasTestRes.modelTested})</span>
                            </>
                          ) : (
                            <>
                              <WarningCircleIcon className="size-4 shrink-0 text-red-500" />
                              <span className="truncate">Failed: {hasTestRes.error}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* EDIT / ADD FORM VIEW */}
          {activeTab === "providers" && isEditing && (
            <div className="space-y-4 rounded-chrome-sm border border-border bg-background p-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <KeyIcon className="size-4 text-[var(--sq-ink)]" weight="bold" />
                  <h4 className="text-xs font-bold text-foreground">
                    Configure {currentProviderMeta?.name} API Key
                  </h4>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {/* Provider Picker */}
              <div>
                <label className="text-xs font-medium text-foreground">Select AI Provider</label>
                <select
                  value={editingProviderId}
                  onChange={(e) => handleOpenEdit(e.target.value as AIProviderId)}
                  className="mt-1 w-full rounded-chrome-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  {Object.values(AI_PROVIDERS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">{currentProviderMeta?.description}</p>
              </div>

              {/* Secret API Key Input with Show/Hide toggle */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    {currentProviderMeta?.name} API Secret Key
                  </label>
                  <a
                    href={editingProviderId === "groq" ? "https://console.groq.com/keys" : currentProviderMeta?.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-500 hover:underline"
                  >
                    Get API key ↗
                  </a>
                </div>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      editingProviderId === "groq"
                        ? "gsk_..."
                        : editingProviderId === "openai"
                        ? "sk-proj-..."
                        : `Enter your ${currentProviderMeta?.name} API key...`
                    }
                    className="w-full rounded-chrome-sm border border-border bg-background px-2.5 py-1.5 pr-8 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showPassword ? "Hide key" : "Show key"}
                  >
                    {showPassword ? <EyeSlashIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  🔒 Encrypted server-side using AES-256-GCM. Never visible in plaintext to the browser after saving.
                </p>
              </div>

              {/* Custom Endpoint Input (for OpenAI-compatible / Azure / Ollama) */}
              {currentProviderMeta?.supportsCustomEndpoint && (
                <div>
                  <label className="text-xs font-medium text-foreground">Custom Base URL / Endpoint</label>
                  <input
                    type="text"
                    value={customEndpointInput}
                    onChange={(e) => setCustomEndpointInput(e.target.value)}
                    placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                    className="mt-1 w-full rounded-chrome-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Protected by SSRF guards blocking internal metadata/loopback addresses.
                  </p>
                </div>
              )}

              {/* Default Model Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Default Model</label>
                  {(currentProviderMeta?.models || []).filter((m) => m.isFree).length > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Free tier models available
                    </span>
                  )}
                </div>
                <select
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  className="mt-1 w-full rounded-chrome-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  {currentProviderMeta?.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.isFree ? "🎁 [FREE] " : ""}{m.name} ({Math.round(m.contextWindow / 1000)}k ctx)
                    </option>
                  ))}
                </select>
              </div>

              {/* Is Default Checkbox */}
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isFormDefault}
                  onChange={(e) => setIsFormDefault(e.target.checked)}
                  className="rounded-chrome-xs"
                />
                <span>Set as primary default provider for Zenith AI</span>
              </label>

              {/* Form Error Banner */}
              {formError && (
                <div className="flex items-center gap-2 rounded-chrome-xs bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
                  <WarningCircleIcon className="size-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <button
                  onClick={() => handleTestSingleProvider(editingProviderId, apiKeyInput, customEndpointInput)}
                  disabled={testingProviderId === editingProviderId || (!apiKeyInput && currentProviderMeta.requiresApiKey)}
                  className="flex items-center gap-1.5 rounded-chrome-xs border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  <ArrowClockwiseIcon className={`size-3.5 ${testingProviderId === editingProviderId ? "animate-spin" : ""}`} />
                  <span>{testingProviderId === editingProviderId ? "Testing Connection..." : "Test Connection"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-chrome-xs border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveForm}
                    disabled={formSaving}
                    className="rounded-chrome-xs bg-[var(--sq-ink)] px-4 py-1.5 text-xs font-semibold text-[var(--sq-paper)] hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {formSaving ? "Saving..." : "Save Key to Vault"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SMART ROUTING */}
          {activeTab === "routing" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Smart routing automatically dispatches requests across your configured providers based on prompt demands.
              </p>
              {[
                {
                  id: "manual",
                  label: "Manual (Selected Model Only)",
                  desc: "Always route exclusively to your explicitly chosen model and provider.",
                  icon: StarIcon,
                },
                {
                  id: "fastest",
                  label: "Fastest / Low-Latency",
                  desc: "Dispatches to ultra-fast models (Gemini 2.5 Flash, GPT-4o mini, Claude 3.5 Haiku).",
                  icon: LightningIcon,
                },
                {
                  id: "cheapest",
                  label: "Cheapest / Cost Optimized",
                  desc: "Prioritizes minimum token cost across your configured providers.",
                  icon: CpuIcon,
                },
                {
                  id: "best-reasoning",
                  label: "Deep Reasoning & STEM Math",
                  desc: "Routes to high-depth chain-of-thought models (Gemini 2.5 Pro, DeepSeek-R1, o3-mini, Claude 3.7 Sonnet).",
                  icon: BrainIcon,
                },
                {
                  id: "document-analysis",
                  label: "Document & PDF Analysis (High Context)",
                  desc: "Optimized for large canvas diagrams and 1M+ context window ingestion.",
                  icon: FilePdfIcon,
                },
              ].map((mode) => {
                const Icon = mode.icon
                return (
                  <label
                    key={mode.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-chrome-xs border p-3 transition-colors ${
                      routingMode === mode.id
                        ? "border-[var(--sq-ink)] bg-accent/30 shadow-xs"
                        : "border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="routingMode"
                      value={mode.id}
                      checked={routingMode === mode.id}
                      onChange={() => setRoutingMode(mode.id as RoutingMode)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Icon className="size-3.5 text-[var(--sq-ink)]" />
                        <span>{mode.label}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{mode.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* TAB 3: USAGE & COST */}
          {activeTab === "usage" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-chrome-sm border border-border/80 bg-muted/20 p-3 text-center">
                  <div className="text-[11px] text-muted-foreground">Total Requests</div>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    {usageStats?.totalRequests || 0}
                  </div>
                </div>
                <div className="rounded-chrome-sm border border-border/80 bg-muted/20 p-3 text-center">
                  <div className="text-[11px] text-muted-foreground">Total Tokens Processed</div>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    {usageStats?.totalTokens ? Math.round(usageStats.totalTokens).toLocaleString() : 0}
                  </div>
                </div>
                <div className="rounded-chrome-sm border border-border/80 bg-muted/20 p-3 text-center">
                  <div className="text-[11px] text-muted-foreground">Estimated Provider Cost</div>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    ${usageStats?.totalCostUsd ? usageStats.totalCostUsd.toFixed(4) : "0.0000"}
                  </div>
                </div>
              </div>

              {/* Provider Breakdown */}
              <div className="rounded-chrome-sm border border-border/80 bg-background p-3.5 space-y-2">
                <h5 className="text-xs font-semibold text-foreground">Telemetry & Privacy Notice</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Token estimates and latency logs are aggregated in-memory on the Zenithsui server.
                  Private messages, canvas wireframes, and secret API keys are never stored in telemetry records.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & OFFLINE */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div className="rounded-chrome-sm border border-border/80 bg-background p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" weight="fill" />
                  <h4 className="text-xs font-bold text-foreground">Zenithsui BYOK Vault Security Model</h4>
                </div>
                <ul className="space-y-2 text-[11px] text-muted-foreground list-disc list-inside leading-relaxed">
                  <li>
                    <strong className="text-foreground">AES-256-GCM Encryption at Rest:</strong> All provider keys are encrypted with 96-bit random IVs and authenticated tags server-side.
                  </li>
                  <li>
                    <strong className="text-foreground">Zero Plaintext Exposure:</strong> Browser client code, localStorage, Zustand state, page documents, and JSON exports never receive your unmasked API keys.
                  </li>
                  <li>
                    <strong className="text-foreground">SSRF & Injection Protection:</strong> Custom OpenAI-compatible endpoints are strictly validated against loopback, link-local metadata (169.254.169.254), and private internal networks.
                  </li>
                  <li>
                    <strong className="text-foreground">Offline Resilience:</strong> If your internet connection drops, Zenithsui canvas drawing and local documents remain 100% functional. When online, AI requests resume securely.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/10">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            <span>Server Vault Active</span>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-chrome-xs bg-[var(--sq-ink)] px-4 py-1.5 text-xs font-semibold text-[var(--sq-paper)] hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete Confirmation Sub-Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-chrome-md border border-border bg-[var(--sq-paper)] p-4 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <WarningCircleIcon className="size-5" weight="bold" />
              <h4 className="text-xs font-bold">Remove API Key</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to remove this API key from your secure vault? This will permanently purge the credential.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-chrome-xs border border-border px-3 py-1 text-xs text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-chrome-xs bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                Remove Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
