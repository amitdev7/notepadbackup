// ---------------------------------------------------------------------------
// Zenith AI — Client State & Store
// ---------------------------------------------------------------------------

import { create } from "zustand"
import { nanoid } from "nanoid"
import type { AIMessage, AIProviderId, RoutingMode, StudentModeAction, CanvasActionProposal } from "./types"
import type { ClientSafeProviderState, ConnectionTestResult } from "./credential-types"
import { AI_PROVIDERS, getModelMeta } from "./model-registry"
import { extractActionProposals } from "./action-schema"
import { AIActionExecutor } from "./action-executor"
import { useSquig } from "../store"
import { AIContextBuilder } from "./context-builder"

interface ZenithAIState {
  isOpen: boolean
  isSettingsOpen: boolean
  isConnectModalOpen: boolean
  connectModalProvider: AIProviderId | null
  messages: AIMessage[]
  isStreaming: boolean
  selectedProvider: AIProviderId
  selectedModel: string
  routingMode: RoutingMode
  activeStudentAction: StudentModeAction | null
  activeProposal: CanvasActionProposal | null
  abortController: AbortController | null

  // Providers list state (populated safely from /api/ai/providers, never contains raw API keys)
  providers: ClientSafeProviderState[]
  isLoadingProviders: boolean
  providersError: string | null

  // Actions
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  setSettingsOpen: (open: boolean) => void
  openConnectModal: (providerId?: AIProviderId) => void
  closeConnectModal: () => void
  resetForUserSwitch: () => void
  setSelectedProvider: (providerId: AIProviderId) => void
  setSelectedModel: (modelId: string) => void
  setRoutingMode: (mode: RoutingMode) => void
  setActiveStudentAction: (action: StudentModeAction | null) => void
  clearMessages: () => void
  stopStreaming: () => void
  applyProposal: (proposal: CanvasActionProposal) => void
  discardProposal: (proposalId: string) => void
  sendMessage: (content: string, studentActionOverride?: StudentModeAction) => Promise<void>

  // Provider Credential Operations (all raw keys sent directly to secure server API and masked)
  fetchProviders: () => Promise<void>
  saveProviderKey: (params: {
    providerId: AIProviderId
    apiKey?: string
    customEndpoint?: string
    organizationId?: string
    defaultModel?: string
    enabled?: boolean
    isDefault?: boolean
    name?: string
  }) => Promise<{ success: boolean; error?: string; verification?: ConnectionTestResult }>
  updateProvider: (
    id: string,
    updates: {
      enabled?: boolean
      isDefault?: boolean
      defaultModel?: string
      name?: string
      customEndpoint?: string
    }
  ) => Promise<{ success: boolean; error?: string }>
  deleteProviderKey: (idOrProviderId: string) => Promise<{ success: boolean; error?: string }>
  testProviderConnection: (params: {
    providerId: AIProviderId
    apiKey?: string
    customEndpoint?: string
    modelId?: string
  }) => Promise<ConnectionTestResult>
}

export const useZenithAI = create<ZenithAIState>((set, get) => ({
  isOpen: false,
  isSettingsOpen: false,
  isConnectModalOpen: false,
  connectModalProvider: null,
  messages: [
    {
      id: "welcome_msg",
      role: "assistant",
      content:
        "Hello! I am **Zenith AI**, your Study Copilot. Ask me questions, request step-by-step problem solving, generate flashcards, or create mind maps and flowcharts directly on your canvas.",
      timestamp: Date.now(),
    },
  ],
  isStreaming: false,
  selectedProvider: "gemini",
  selectedModel: "gemini-3.8-flash",
  routingMode: "manual",
  activeStudentAction: null,
  activeProposal: null,
  abortController: null,

  providers: [],
  isLoadingProviders: false,
  providersError: null,

  setOpen: (open) => {
    set({ isOpen: open })
    if (open) {
      get().fetchProviders()
    }
  },
  toggleOpen: () => {
    const next = !get().isOpen
    set({ isOpen: next })
    if (next) {
      get().fetchProviders()
    }
  },
  setSettingsOpen: (open) => {
    set({ isSettingsOpen: open })
    if (open) {
      get().fetchProviders()
    }
  },

  openConnectModal: (providerId = "openai") => {
    set({ isConnectModalOpen: true, connectModalProvider: providerId })
  },
  closeConnectModal: () => {
    set({ isConnectModalOpen: false, connectModalProvider: null })
  },

  resetForUserSwitch: () => {
    const { abortController } = get()
    if (abortController) abortController.abort()
    set({
      providers: [],
      isLoadingProviders: false,
      providersError: null,
      isStreaming: false,
      abortController: null,
      activeProposal: null,
      isConnectModalOpen: false,
      connectModalProvider: null,
      selectedProvider: "openai",
      selectedModel: "gpt-4o",
      messages: [
        {
          id: "welcome_msg",
          role: "assistant",
          content:
            "Hello! I am **Zenith AI**, your Study Copilot. Ask me questions, request step-by-step problem solving, generate flashcards, or create mind maps and flowcharts directly on your canvas.",
          timestamp: Date.now(),
        },
      ],
    })
    get().fetchProviders()
  },

  setSelectedProvider: (providerId) => {
    const meta = AI_PROVIDERS[providerId]
    const state = get()
    const configuredProvider = state.providers.find((p) => p.providerId === providerId)
    const defaultModel = configuredProvider?.defaultModel || meta?.models[0]?.id || "gpt-4o"
    set({ selectedProvider: providerId, selectedModel: defaultModel })
  },

  setSelectedModel: (modelId) => set({ selectedModel: modelId }),
  setRoutingMode: (mode) => set({ routingMode: mode }),
  setActiveStudentAction: (action) => set({ activeStudentAction: action }),

  clearMessages: () =>
    set({
      messages: [
        {
          id: nanoid(),
          role: "assistant",
          content: "Conversation cleared. What topic or diagram would you like to explore?",
          timestamp: Date.now(),
        },
      ],
      activeProposal: null,
    }),

  stopStreaming: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ isStreaming: false, abortController: null })
    }
  },

  applyProposal: (proposal) => {
    const res = AIActionExecutor.applyProposal(proposal)
    if (res.success) {
      set((s) => ({
        activeProposal: null,
        messages: s.messages.map((m) =>
          m.actions?.some((a) => a.id === proposal.id) ? { ...m, actionsApplied: true } : m
        ),
      }))
    }
  },

  discardProposal: (proposalId) => {
    set((s) => ({
      activeProposal: s.activeProposal?.id === proposalId ? null : s.activeProposal,
    }))
  },

  fetchProviders: async () => {
    set({ isLoadingProviders: true, providersError: null })
    try {
      const res = await fetch("/api/ai/providers")
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load providers.`)
      const data = await res.json()
      const providers: ClientSafeProviderState[] = data.providers || []

      // Determine currently ready providers
      const isReady = (p: ClientSafeProviderState) =>
        p.enabled &&
        (p.normalizedStatus === "READY" || p.lastStatus === "READY" || p.lastStatus === "connected") &&
        p.isConfigured

      const readyList = providers.filter(isReady)
      const currentSelectedReady = readyList.some((p) => p.providerId === get().selectedProvider)

      let newSelectedProvider = get().selectedProvider
      let newSelectedModel = get().selectedModel

      if (!currentSelectedReady && readyList.length > 0) {
        const defaultReady = readyList.find((p) => p.isDefault) || readyList[0]
        newSelectedProvider = defaultReady.providerId
        newSelectedModel = defaultReady.defaultModel || AI_PROVIDERS[newSelectedProvider]?.models[0]?.id || (newSelectedProvider === "gemini" ? "gemini-3.8-flash" : "gpt-4o")
      }

      set({
        providers,
        isLoadingProviders: false,
        selectedProvider: newSelectedProvider,
        selectedModel: newSelectedModel,
      })
    } catch (err: any) {
      set({ isLoadingProviders: false, providersError: err.message || "Failed to load providers" })
    }
  },

  saveProviderKey: async (params) => {
    try {
      const res = await fetch("/api/ai/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to save key." }
      }

      if (data.providers) {
        set({ providers: data.providers })
      } else {
        await get().fetchProviders()
      }

      // If this provider is verified as READY, auto-select it
      if (data.verification?.success) {
        get().setSelectedProvider(params.providerId)
      }

      return { success: true, verification: data.verification }
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to save key." }
    }
  },

  updateProvider: async (id, updates) => {
    try {
      const res = await fetch(`/api/ai/providers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update provider." }
      }

      if (data.providers) {
        set({ providers: data.providers })
      } else {
        await get().fetchProviders()
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update provider." }
    }
  },

  deleteProviderKey: async (idOrProviderId) => {
    try {
      const res = await fetch(`/api/ai/providers/${encodeURIComponent(idOrProviderId)}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to delete key." }
      }

      if (data.providers) {
        set({ providers: data.providers })
      } else {
        await get().fetchProviders()
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to delete key." }
    }
  },

  testProviderConnection: async (params) => {
    try {
      const res = await fetch(`/api/ai/providers/${encodeURIComponent(params.providerId)}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      // Refresh provider list status in background
      get().fetchProviders()
      return data
    } catch (err: any) {
      return {
        success: false,
        status: "ERROR",
        error: err.message || "Connection test failed.",
      }
    }
  },

  sendMessage: async (content: string, studentActionOverride?: StudentModeAction) => {
    let state = get()
    if (!content.trim() || state.isStreaming) return

    // If providers list is not loaded yet, fetch it
    if (state.providers.length === 0) {
      await get().fetchProviders()
      state = get()
    }

    // Provider readiness check
    const isReady = (p: ClientSafeProviderState) =>
      p.enabled &&
      (p.normalizedStatus === "READY" || p.lastStatus === "READY" || p.lastStatus === "connected") &&
      p.isConfigured

    const readyProvider =
      state.providers.find((p) => p.providerId === state.selectedProvider && isReady(p)) ||
      state.providers.find(isReady) ||
      state.providers.find((p) => p.providerId === "gemini")

    if (!readyProvider) {
      const userMsgId = nanoid()
      const errorMsgId = nanoid()
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: userMsgId,
            role: "user",
            content: content.trim(),
            timestamp: Date.now(),
          },
          {
            id: errorMsgId,
            role: "assistant",
            content:
              "⚠️ No AI provider is currently connected. Please open Settings (or click Connect) to connect Google Gemini, OpenAI, Groq, or OpenRouter.",
            timestamp: Date.now(),
            isError: true,
          },
        ],
      }))
      return
    }

    const effectiveProviderId = readyProvider.providerId
    const effectiveModelId =
      readyProvider.models?.some((m) => m.id === state.selectedModel)
        ? state.selectedModel
        : readyProvider.defaultModel || readyProvider.models?.[0]?.id || "gemini-3.8-flash"

    // Keep store synchronized with the effective ready provider
    if (state.selectedProvider !== effectiveProviderId) {
      set({ selectedProvider: effectiveProviderId, selectedModel: effectiveModelId })
    }

    const studentAction = studentActionOverride || state.activeStudentAction || undefined
    const userMsgId = nanoid()
    const assistantMsgId = nanoid()

    const userMessage: AIMessage = {
      id: userMsgId,
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
      studentAction,
    }

    const assistantMessage: AIMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      provider: effectiveProviderId,
      model: effectiveModelId,
      isStreaming: true,
    }

    set((s) => ({
      messages: [...s.messages, userMessage, assistantMessage],
      isStreaming: true,
      activeStudentAction: null,
    }))

    // Extract canvas context
    const squigState = useSquig.getState()
    const canvasContext = AIContextBuilder.buildContextPrompt(
      squigState.nodes,
      squigState.selection,
      { fileName: squigState.fileName }
    )

    const controller = new AbortController()
    set({ abortController: controller })

    try {
      // Check offline status
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        set((s) => ({
          isStreaming: false,
          abortController: null,
          messages: s.messages.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: "⚠️ **Zenith AI is unavailable offline.** Normal local canvas editing continues as normal.",
                  isStreaming: false,
                  isError: true,
                }
              : m
          ),
        }))
        return
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          providerId: effectiveProviderId,
          modelId: effectiveModelId,
          routingMode: state.routingMode,
          studentAction,
          canvasContext,
          messages: [
            ...state.messages.filter((m) => !m.isError).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: content.trim() },
          ],
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: "AI request failed" }))
        throw new Error(errJson.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      const rawText = data.text || ""

      // Extract canvas action proposals
      const { cleanText, proposals } = extractActionProposals(rawText)

      set((s) => ({
        isStreaming: false,
        abortController: null,
        activeProposal: proposals.length > 0 ? proposals[0] : s.activeProposal,
        messages: s.messages.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: cleanText,
                provider: data.providerUsed || s.selectedProvider,
                model: data.modelUsed || s.selectedModel,
                isStreaming: false,
                actions: proposals.length > 0 ? proposals : undefined,
              }
            : m
        ),
      }))
    } catch (err: any) {
      if (err.name === "AbortError") {
        return
      }

      set((s) => ({
        isStreaming: false,
        abortController: null,
        messages: s.messages.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `⚠️ **Error:** ${err.message || "Failed to generate response."}`,
                isStreaming: false,
                isError: true,
              }
            : m
        ),
      }))
    }
  },
}))

