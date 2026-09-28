"use client"

// ---------------------------------------------------------------------------
// Zenith AI — Study Copilot Panel
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react"
import {
  SparkleIcon,
  XIcon,
  GearIcon,
  TrashIcon,
  PaperPlaneRightIcon,
  StopIcon,
  CheckCircleIcon,
  CaretDownIcon,
  CardsIcon,
  TreeStructureIcon,
  GitForkIcon,
  TableIcon,
  LightbulbIcon,
  GraduationCapIcon,
  LightningIcon,
} from "@phosphor-icons/react"
import ReactMarkdown from "react-markdown"
import { useZenithAI } from "@/lib/ai/ai-store"
import { STUDENT_ACTIONS } from "@/lib/ai/student-mode"
import { AI_PROVIDERS, getAllModels } from "@/lib/ai/model-registry"
import { useSquig } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { StudentModeAction } from "@/lib/ai/types"
import { cleanVisibleAIOutput } from "@/lib/ai/action-schema"

export function ZenithAIPanel() {
  const {
    isOpen,
    setOpen,
    setSettingsOpen,
    openConnectModal,
    providers,
    messages,
    isStreaming,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
    activeStudentAction,
    setActiveStudentAction,
    sendMessage,
    stopStreaming,
    clearMessages,
    applyProposal,
    discardProposal,
    activeProposal,
  } = useZenithAI()

  const { selection } = useSquig()
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "study" | "diagram" | "revision">("all")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Provider readiness check (checks ready status, system keys, or defaults)
  const isProviderReady = (p: any) =>
    p &&
    p.enabled &&
    (p.normalizedStatus === "READY" || p.lastStatus === "READY" || p.lastStatus === "connected") &&
    p.isConfigured

  const readyProviders = providers.filter(isProviderReady)
  const hasReadyProvider = readyProviders.length > 0
  const activeReadyProvider = readyProviders.find((p) => p.providerId === selectedProvider) || readyProviders[0]

  // Auto-sync selected provider with an active ready provider — only when the
  // ready set itself changes. Re-running on every fetch round-trip steals a
  // deliberate (even unready) choice back, so a stable list means hands off.
  const autoSyncKeyRef = useRef("")
  useEffect(() => {
    const key = readyProviders.map((p) => p.providerId).join(",")
    if (autoSyncKeyRef.current === key) return
    autoSyncKeyRef.current = key
    if (!activeReadyProvider) return
    if (selectedProvider !== activeReadyProvider.providerId) {
      setSelectedProvider(activeReadyProvider.providerId)
      if (activeReadyProvider.defaultModel) {
        setSelectedModel(activeReadyProvider.defaultModel)
      }
    }
  }, [readyProviders, activeReadyProvider, selectedProvider, setSelectedProvider, setSelectedModel])

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  if (!isOpen) return null

  const filteredActions = STUDENT_ACTIONS.filter((act) => activeTab === "all" || act.category === activeTab)

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input)
    setInput("")
  }

  const handleActionClick = (actionId: StudentModeAction) => {
    if (isStreaming) return
    if (!hasReadyProvider) {
      setSettingsOpen(true)
      return
    }
    setActiveStudentAction(actionId)
    const def = STUDENT_ACTIONS.find((a) => a.id === actionId)
    if (def) {
      const prompt = selection.length > 0
        ? `Please apply "${def.label}" to the ${selection.length} selected object(s) on the canvas.`
        : `Please execute "${def.label}".`
      sendMessage(prompt, actionId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside
      id="zenith-ai-panel"
      aria-label="Zenith AI Study Copilot"
      className="fixed right-2 sm:right-4 top-14 sm:top-16 bottom-16 sm:bottom-4 z-40 flex w-[380px] max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-32px)] flex-col rounded-chrome-md border border-border bg-[var(--sq-paper)] shadow-2xl backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-[var(--sq-ink)] text-[var(--sq-paper)]">
            <SparkleIcon weight="fill" className="size-4 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-foreground">Zenith AI</h2>
            <p className="text-[10px] text-muted-foreground">Study Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="zenith-ai-clear-btn"
            title="Clear conversation"
            onClick={clearMessages}
            className="flex size-7 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <TrashIcon className="size-3.5" />
          </button>
          <button
            id="zenith-ai-settings-btn"
            title="Provider & BYOK Settings"
            onClick={() => setSettingsOpen(true)}
            className="flex size-7 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <GearIcon className="size-3.5" />
          </button>
          <button
            id="zenith-ai-close-btn"
            title="Close panel (⌘J)"
            onClick={() => setOpen(false)}
            className="flex size-7 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Model & Selection context bar */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-1.5 text-[11px]">
        {hasReadyProvider && activeReadyProvider ? (
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 hover:text-[var(--sq-ink)] transition-colors group cursor-pointer"
            title="Change model or configure API keys"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium text-foreground group-hover:underline">
              {AI_PROVIDERS[activeReadyProvider.providerId]?.name || "OpenAI"}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
              {activeReadyProvider.defaultModel || selectedModel}
            </span>
          </button>
        ) : (
          <button
            onClick={() => openConnectModal("openai")}
            className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            title="Click to connect an AI provider"
          >
            <span className="size-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span className="font-medium text-[11px]">No AI Provider Connected</span>
          </button>
        )}
        {selection.length > 0 && (
          <div className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
            <span>{selection.length} selected</span>
          </div>
        )}
      </div>

      {/* Action Category Tabs */}
      <div className="flex gap-1 border-b border-border/40 bg-muted/20 px-2 py-1">
        {(["all", "study", "diagram", "revision"] as const).map((tab) => (
          <button
            key={tab}
            id={`zenith-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-chrome-xs px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-[var(--sq-ink)] text-[var(--sq-paper)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Quick Action Ribbon */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border/40 p-2 no-scrollbar">
        {filteredActions.map((act) => (
          <button
            key={act.id}
            id={`zenith-action-${act.id}`}
            title={act.description}
            onClick={() => handleActionClick(act.id)}
            className="flex shrink-0 items-center gap-1 rounded-chrome-xs border border-border/60 bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-[var(--sq-ink)] hover:bg-accent"
          >
            {act.category === "diagram" ? (
              <TreeStructureIcon className="size-3 text-indigo-500" />
            ) : act.category === "revision" ? (
              <CardsIcon className="size-3 text-emerald-500" />
            ) : (
              <GraduationCapIcon className="size-3 text-amber-500" />
            )}
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-1 rounded-chrome-sm p-2.5 text-xs leading-relaxed",
              msg.role === "user"
                ? "ml-6 bg-muted/60 text-foreground border border-border/50"
                : "mr-2 bg-background border border-border shadow-xs text-foreground"
            )}
          >
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>{msg.role === "user" ? "You" : "Zenith AI"}</span>
              {msg.studentAction && (
                <span className="rounded bg-accent px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {msg.studentAction}
                </span>
              )}
            </div>

            <div className="prose prose-xs dark:prose-invert max-w-none text-xs">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "")
                    const lang = (match?.[1] || "").toLowerCase()
                    const contentStr = String(children || "")
                    if (
                      lang.includes("zenith") ||
                      lang.includes("action") ||
                      contentStr.includes('"tool"') ||
                      contentStr.includes('"nodeType"') ||
                      contentStr.includes('"parameters"') ||
                      contentStr.includes('"add_text"') ||
                      contentStr.includes('"createNode"')
                    ) {
                      return null
                    }
                    return <code className={className} {...props}>{children}</code>
                  },
                }}
              >
                {cleanVisibleAIOutput(msg.content)}
              </ReactMarkdown>
            </div>


            {/* Canvas Action Proposals — every one, not just the first */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {msg.actions.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="rounded-chrome-xs border border-amber-500/30 bg-amber-500/5 p-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-medium text-amber-700 dark:text-amber-300">
                      <span>⚡ Proposed Canvas Objects</span>
                      <span className="text-[10px]">{proposal.actionCount.total} items</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{proposal.summary}</p>
                    {msg.actionsApplied ? (
                      <div className="mt-2 flex items-center justify-between rounded-chrome-xs bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                        <span className="flex items-center gap-1">
                          <CheckCircleIcon weight="fill" className="size-3.5 text-emerald-600" />
                          Applied to canvas
                        </span>
                        <button
                          id="zenith-undo-proposal-btn"
                          onClick={() => useSquig.getState().undo()}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                          title="Undo canvas application (⌘Z)"
                        >
                          Undo (⌘Z)
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          id="zenith-apply-proposal-btn"
                          onClick={() => applyProposal(proposal)}
                          className="flex items-center gap-1 rounded-chrome-xs bg-[var(--sq-ink)] px-2.5 py-1 text-[11px] font-medium text-[var(--sq-paper)] hover:opacity-90"
                        >
                          <CheckCircleIcon className="size-3.5" />
                          <span>Apply to Canvas</span>
                        </button>
                        <button
                          id="zenith-discard-proposal-btn"
                          onClick={() => discardProposal(proposal.id)}
                          className="rounded-chrome-xs border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Prompt when No Provider is Connected */}
        {!hasReadyProvider && (
          <div className="rounded-chrome-sm border border-dashed border-amber-500/50 bg-amber-500/5 p-3 text-center">
            <div className="mx-auto mb-1.5 flex size-7 items-center justify-center rounded-chrome-xs bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <SparkleIcon weight="fill" className="size-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">
              Configure or Connect an AI Provider
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
              Choose from 100+ AI models including free tiers on OpenRouter, Gemini, Groq, or OpenAI.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
              <button
                id="connect-openrouter-btn"
                onClick={() => openConnectModal("openrouter")}
                className="flex items-center justify-center gap-1 rounded-chrome-xs bg-[var(--sq-ink)] px-2.5 py-1 text-[11px] font-medium text-[var(--sq-paper)] hover:opacity-90 transition-opacity"
              >
                <span>Connect OpenRouter (Free Models)</span>
              </button>
              <button
                id="connect-gemini-btn"
                onClick={() => openConnectModal("gemini")}
                className="flex items-center justify-center gap-1 rounded-chrome-xs border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
              >
                <span>Google Gemini</span>
              </button>
              <button
                id="connect-groq-btn"
                onClick={() => openConnectModal("groq")}
                className="flex items-center justify-center gap-1 rounded-chrome-xs border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
              >
                <span>Groq</span>
              </button>
              <button
                id="connect-chatgpt-btn"
                onClick={() => openConnectModal("openai")}
                className="flex items-center justify-center gap-1 rounded-chrome-xs border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
              >
                <span>ChatGPT</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-border/80 p-2.5 bg-background/50">
        <div className="relative flex items-center">
          <textarea
            id="zenith-ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Zenith AI or request diagrams..."
            rows={2}
            className="w-full resize-none rounded-chrome-sm border border-border bg-background px-3 py-2 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
          />
          <div className="absolute right-2 bottom-2">
            {isStreaming ? (
              <button
                id="zenith-ai-stop-btn"
                onClick={stopStreaming}
                title="Stop streaming"
                className="flex size-6 items-center justify-center rounded-chrome-xs bg-red-500 text-white hover:bg-red-600"
              >
                <StopIcon weight="fill" className="size-3.5" />
              </button>
            ) : (
              <button
                id="zenith-ai-send-btn"
                onClick={handleSend}
                disabled={!input.trim()}
                title="Send message (Enter)"
                className="flex size-6 items-center justify-center rounded-chrome-xs bg-[var(--sq-ink)] text-[var(--sq-paper)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PaperPlaneRightIcon weight="fill" className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>⌘J to toggle</span>
        </div>
      </div>
    </aside>
  )
}

