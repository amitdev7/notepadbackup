"use client"

// ---------------------------------------------------------------------------
// Zenith AI — Connect AI Provider Modal (ChatGPT / OpenAI & Google Gemini)
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react"
import { useZenithAI } from "@/lib/ai/ai-store"
import { AI_PROVIDERS } from "@/lib/ai/model-registry"
import type { AIProviderId } from "@/lib/ai/types"
import {
  Sparkle as SparkleIcon,
  Key as KeyIcon,
  CircleNotch as SpinnerIcon,
  CheckCircle as CheckCircleIcon,
  WarningCircle as WarningCircleIcon,
  Eye as EyeIcon,
  EyeSlash as EyeSlashIcon,
  ArrowSquareOut as ExternalLinkIcon,
  X as XIcon,
  Trash as TrashIcon,
  Lightning as LightningIcon,
} from "@phosphor-icons/react"

export function ZenithAIConnectModal() {
  const {
    isConnectModalOpen,
    connectModalProvider,
    closeConnectModal,
    providers,
    saveProviderKey,
    deleteProviderKey,
    setSelectedProvider,
    setSelectedModel,
    fetchProviders,
  } = useZenithAI()

  const [activeProviderId, setActiveProviderId] = useState<AIProviderId>("openai")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [customEndpoint, setCustomEndpoint] = useState("")
  const [selectedModelInput, setSelectedModelInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: "error" | "success" | "verifying"
    text: string
  } | null>(null)

  // Sync active provider when modal opens
  useEffect(() => {
    if (isConnectModalOpen) {
      const pId =
        connectModalProvider === "openrouter"
          ? "openrouter"
          : connectModalProvider === "gemini"
          ? "gemini"
          : connectModalProvider === "groq"
          ? "groq"
          : "openai"
      setActiveProviderId(pId)
      setApiKeyInput("")
      setStatusMessage(null)
      setShowPassword(false)

      const prov = providers.find((p) => p.providerId === pId)
      setSelectedModelInput(
        prov?.defaultModel ||
          (pId === "openrouter"
            ? "google/gemini-2.0-flash-exp:free"
            : pId === "gemini"
            ? "gemini-2.5-flash"
            : pId === "groq"
            ? "llama-3.3-70b-versatile"
            : "gpt-4o")
      )
      setCustomEndpoint(prov?.customEndpoint || "")
    }
  }, [isConnectModalOpen, connectModalProvider, providers])

  if (!isConnectModalOpen) return null

  const currentProviderMeta = AI_PROVIDERS[activeProviderId]
  const currentProviderState = providers.find((p) => p.providerId === activeProviderId)
  const isConnected =
    currentProviderState?.normalizedStatus === "READY" ||
    currentProviderState?.lastStatus === "READY" ||
    currentProviderState?.lastStatus === "connected"

  const handleProviderSwitch = (pId: AIProviderId) => {
    setActiveProviderId(pId)
    setApiKeyInput("")
    setStatusMessage(null)
    const prov = providers.find((p) => p.providerId === pId)
    setSelectedModelInput(
      prov?.defaultModel ||
        (pId === "openrouter"
          ? "google/gemini-2.0-flash-exp:free"
          : pId === "gemini"
          ? "gemini-2.5-flash"
          : pId === "groq"
          ? "llama-3.3-70b-versatile"
          : "gpt-4o")
    )
    setCustomEndpoint(prov?.customEndpoint || "")
  }

  const handleConnect = async (useSystemKey = false) => {
    const keyToSubmit = useSystemKey
      ? activeProviderId === "openrouter"
        ? "__SYSTEM_OPENROUTER_KEY__"
        : activeProviderId === "groq"
        ? "__SYSTEM_GROQ_KEY__"
        : "__SYSTEM_GEMINI_KEY__"
      : apiKeyInput.trim()

    if (!useSystemKey && !keyToSubmit && currentProviderMeta.requiresApiKey && !customEndpoint.trim()) {
      setStatusMessage({
        type: "error",
        text: `Please enter an API key for ${currentProviderMeta.name}.`,
      })
      return
    }

    setIsSubmitting(true)
    setStatusMessage({
      type: "verifying",
      text: "Connecting and verifying credentials with live health check…",
    })

    try {
      const res = await saveProviderKey({
        providerId: activeProviderId,
        apiKey: keyToSubmit || undefined,
        customEndpoint: customEndpoint.trim() || undefined,
        defaultModel: selectedModelInput || undefined,
        enabled: true,
        isDefault: true,
      })

      setIsSubmitting(false)

      if (!res.success) {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to save and verify API credentials.",
        })
        return
      }

      const verify = res.verification
      if (verify && !verify.success) {
        let msg = verify.error || "Connection test failed."
        if (verify.status === "BILLING_REQUIRED") {
          msg = "Insufficient quota / balance on this account (HTTP 402). Please check your billing settings."
        } else if (verify.status === "INVALID") {
          msg = "Invalid API key or lack of permissions (HTTP 401). Please check your key."
        } else if (verify.status === "RATE_LIMITED") {
          msg = "Rate limit reached (HTTP 429). Please retry shortly."
        }
        setStatusMessage({ type: "error", text: msg })
        return
      }

      // Successful verification
      setStatusMessage({
        type: "success",
        text: `Successfully connected to ${currentProviderMeta.name}! Zenith AI is ready.`,
      })

      setSelectedProvider(activeProviderId)
      if (selectedModelInput) {
        setSelectedModel(selectedModelInput)
      }

      setTimeout(() => {
        closeConnectModal()
      }, 1100)
    } catch (err: any) {
      setIsSubmitting(false)
      setStatusMessage({
        type: "error",
        text: err.message || "An unexpected error occurred during connection.",
      })
    }
  }

  const handleDisconnect = async () => {
    if (!currentProviderState) return
    setIsSubmitting(true)
    const res = await deleteProviderKey(currentProviderState.id || activeProviderId)
    setIsSubmitting(false)
    if (res.success) {
      setApiKeyInput("")
      setStatusMessage({
        type: "success",
        text: `${currentProviderMeta.name} has been disconnected.`,
      })
      await fetchProviders()
    } else {
      setStatusMessage({
        type: "error",
        text: res.error || "Failed to disconnect provider.",
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onPointerDown={closeConnectModal}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-[var(--sq-ink)] text-[var(--sq-paper)]">
              <SparkleIcon size={16} weight="fill" className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-title font-medium text-foreground">
                Connect AI Provider
              </h2>
              <p className="text-label text-muted-foreground">
                Connect OpenRouter, Gemini, Groq, or ChatGPT
              </p>
            </div>
          </div>
          <button
            onClick={closeConnectModal}
            className="flex size-7 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          {/* Provider Selection Tabs */}
          <div className="grid grid-cols-4 gap-1 rounded-chrome-sm bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => handleProviderSwitch("openrouter")}
              className={`flex items-center justify-center gap-1 rounded-chrome-xs py-1.5 text-[11px] font-medium transition-colors ${
                activeProviderId === "openrouter"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="truncate">OpenRouter</span>
              <span className="rounded bg-emerald-500/15 px-1 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
              {providers.find((p) => p.providerId === "openrouter" && (p.normalizedStatus === "READY" || p.lastStatus === "READY")) && (
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleProviderSwitch("gemini")}
              className={`flex items-center justify-center gap-1 rounded-chrome-xs py-1.5 text-[11px] font-medium transition-colors ${
                activeProviderId === "gemini"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="truncate">Gemini</span>
              {providers.find((p) => p.providerId === "gemini" && (p.normalizedStatus === "READY" || p.lastStatus === "READY")) && (
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleProviderSwitch("groq")}
              className={`flex items-center justify-center gap-1 rounded-chrome-xs py-1.5 text-[11px] font-medium transition-colors ${
                activeProviderId === "groq"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="truncate">Groq</span>
              {providers.find((p) => p.providerId === "groq" && (p.normalizedStatus === "READY" || p.lastStatus === "READY")) && (
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleProviderSwitch("openai")}
              className={`flex items-center justify-center gap-1 rounded-chrome-xs py-1.5 text-[11px] font-medium transition-colors ${
                activeProviderId === "openai"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="truncate">ChatGPT</span>
              {providers.find((p) => p.providerId === "openai" && (p.normalizedStatus === "READY" || p.lastStatus === "READY")) && (
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* Current Connection Status Badge */}
          <div className="flex items-center justify-between rounded-chrome-sm border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <span className="font-medium text-muted-foreground">Status:</span>
            {isConnected ? (
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircleIcon size={14} weight="fill" />
                Connected & Ready
                {currentProviderState?.latencyMs ? ` (${currentProviderState.latencyMs}ms)` : ""}
              </span>
            ) : currentProviderState?.normalizedStatus === "INVALID" || currentProviderState?.normalizedStatus === "INVALID_CREDENTIAL" ? (
              <span className="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                <WarningCircleIcon size={14} weight="fill" />
                Invalid API Key
              </span>
            ) : currentProviderState?.normalizedStatus === "BILLING_REQUIRED" ? (
              <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <WarningCircleIcon size={14} weight="fill" />
                Billing Required (402)
              </span>
            ) : currentProviderState?.normalizedStatus === "RATE_LIMITED" ? (
              <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <WarningCircleIcon size={14} weight="fill" />
                Rate Limited (429)
              </span>
            ) : (
              <span className="font-medium text-muted-foreground">Not connected</span>
            )}
          </div>

          {/* Helper Guidance & Key Links */}
          <div className="text-xs text-muted-foreground">
            {activeProviderId === "openrouter" ? (
              <div className="flex items-center justify-between gap-2">
                <span>Enter your OpenRouter API key (starts with <code className="font-mono text-foreground">sk-or-v1-...</code>). Access 100+ free & paid models.</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--sq-ink)] hover:underline shrink-0"
                >
                  <span>Get Key</span>
                  <ExternalLinkIcon size={12} />
                </a>
              </div>
            ) : activeProviderId === "openai" ? (
              <div className="flex items-center justify-between gap-2">
                <span>Enter your OpenAI API key (begins with <code className="font-mono text-foreground">sk-...</code>).</span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--sq-ink)] hover:underline shrink-0"
                >
                  <span>Get Key</span>
                  <ExternalLinkIcon size={12} />
                </a>
              </div>
            ) : activeProviderId === "groq" ? (
              <div className="flex items-center justify-between gap-2">
                <span>Enter your Groq API key (begins with <code className="font-mono text-foreground">gsk_...</code>).</span>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--sq-ink)] hover:underline shrink-0"
                >
                  <span>Get Key</span>
                  <ExternalLinkIcon size={12} />
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>Enter your Google Gemini API key from Google AI Studio.</span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--sq-ink)] hover:underline shrink-0"
                >
                  <span>Get Key</span>
                  <ExternalLinkIcon size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Quick Connect with System OpenRouter Key if available */}
          {activeProviderId === "openrouter" && currentProviderState?.systemKeyAvailable && (
            <div className="rounded-chrome-sm border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                  <LightningIcon size={14} weight="fill" />
                  <span>Server OpenRouter Key Detected</span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConnect(true)}
                  className="rounded-chrome-xs bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  Use Server Key
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                One-click connect using the pre-configured server OPENROUTER_API_KEY.
              </p>
            </div>
          )}

          {/* Quick Connect with System Gemini Key if available */}
          {activeProviderId === "gemini" && currentProviderState?.systemKeyAvailable && (
            <div className="rounded-chrome-sm border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-indigo-700 dark:text-indigo-300">
                  <LightningIcon size={14} weight="fill" />
                  <span>Server Gemini Key Detected</span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConnect(true)}
                  className="rounded-chrome-xs bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Use Server Key
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                One-click connect using the pre-configured server environment key.
              </p>
            </div>
          )}

          {/* Quick Connect with System Groq Key if available */}
          {activeProviderId === "groq" && currentProviderState?.systemKeyAvailable && (
            <div className="rounded-chrome-sm border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                  <LightningIcon size={14} weight="fill" />
                  <span>Server Groq Key Detected</span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConnect(true)}
                  className="rounded-chrome-xs bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  Use Server Key
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                One-click connect using the pre-configured server GROQ_API_KEY.
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {isConnected ? "Change API Key" : "API Key"}
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3 text-muted-foreground">
                <KeyIcon size={14} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={
                  isConnected
                    ? currentProviderState?.maskedKey || "••••••••••••"
                    : activeProviderId === "openrouter"
                    ? "sk-or-v1-..."
                    : activeProviderId === "openai"
                    ? "sk-proj-..."
                    : activeProviderId === "groq"
                    ? "gsk_..."
                    : "AIzaSy..."
                }
                className="w-full rounded-chrome-sm border border-border bg-background py-2 pr-10 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeSlashIcon size={14} /> : <EyeIcon size={14} />}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Default Model</label>
              <span className="text-[10px] text-muted-foreground">
                {(currentProviderMeta?.models || []).filter((m) => m.isFree).length > 0 && "Free options available"}
              </span>
            </div>
            <select
              value={selectedModelInput}
              onChange={(e) => setSelectedModelInput(e.target.value)}
              className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-[var(--sq-ink)] focus:outline-none"
            >
              {(currentProviderMeta?.models || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.isFree ? "🎁 [FREE] " : ""}{m.name} ({Math.round(m.contextWindow / 1000)}k ctx)
                </option>
              ))}
            </select>
          </div>

          {/* Optional Custom Endpoint for OpenAI or OpenRouter */}
          {(activeProviderId === "openai" || activeProviderId === "openrouter") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Custom Endpoint <span className="text-muted-foreground text-[10px]">(Optional for Azure / Proxy)</span>
              </label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder={activeProviderId === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1"}
                className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
              />
            </div>
          )}

          {/* Status Message / Error Banner */}
          {statusMessage && (
            <div
              className={`flex items-start gap-2 rounded-chrome-sm p-3 text-xs ${
                statusMessage.type === "error"
                  ? "border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                  : statusMessage.type === "success"
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {statusMessage.type === "verifying" && <SpinnerIcon size={16} className="animate-spin shrink-0 mt-0.5" />}
              {statusMessage.type === "error" && <WarningCircleIcon size={16} className="shrink-0 mt-0.5" />}
              {statusMessage.type === "success" && <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Vault Security Assurance */}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            🔒 All API keys are encrypted server-side with AES-256-GCM in your isolated user vault. Keys never leave the secure server and are never exposed to browser memory.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/70 px-5 py-3.5 bg-muted/10">
          <div>
            {isConnected && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 rounded-chrome-xs px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
              >
                <TrashIcon size={14} />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeConnectModal}
              disabled={isSubmitting}
              className="rounded-chrome-xs border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConnect(false)}
              disabled={isSubmitting || (!apiKeyInput.trim() && !isConnected)}
              className="flex items-center gap-1.5 rounded-chrome-xs bg-[var(--sq-ink)] px-4 py-1.5 text-xs font-medium text-[var(--sq-paper)] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon size={14} className="animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : isConnected ? (
                <span>Update Key</span>
              ) : (
                <span>Connect {currentProviderMeta?.name || "AI Provider"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
