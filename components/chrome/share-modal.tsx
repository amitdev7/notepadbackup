"use client"

// ---------------------------------------------------------------------------
// Share Page Settings & Permissions Modal
//
// Flow:
//   Create Page -> Click Share -> Choose Access Mode -> Get Share Link -> Send Link
//
// Modes:
//   - Public (View-Only)
//   - Password Protected (View + Password Required to Edit)
//   - Private (Restricted to database members)
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react"
import { useSquig } from "@/lib/store"
import type { ShareMode } from "@/lib/database"
import { cacheLocalShare } from "@/lib/share-payload"
import {
  ShareNetwork as ShareIcon,
  Globe as GlobeIcon,
  LockKey as LockKeyIcon,
  Lock as LockIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  ArrowsClockwise as RegenerateIcon,
  X as XIcon,
  ArrowSquareOut as OpenIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export function ShareModal() {
  const open = useSquig((s) => s.shareModalOpen)
  const fileName = useSquig((s) => s.fileName)
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const shareConfig = useSquig((s) => s.shareConfig)
  const isLoadingShare = useSquig((s) => s.isLoadingShare)
  const setShareModalOpen = useSquig((s) => s.setShareModalOpen)
  const updateShareSettings = useSquig((s) => s.updateShareSettings)
  const revokeShare = useSquig((s) => s.revokeShare)
  const docId = useSquig((s) => s.docId)
  const nodes = useSquig((s) => s.nodes)
  const order = useSquig((s) => s.order)

  const [mode, setMode] = useState<ShareMode>("public-view")
  const [enabled, setEnabled] = useState(true)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

  // Build resilient doc snapshot for local cache fallback only.
  // NOTE: no per-keystroke server sync here — saves happen only on explicit
  // Save/regenerate/revoke actions via the store (updateShareSettings/revokeShare).
  const docSnapshot = useMemo(() => ({
    id: docId,
    name: fileName,
    nodes,
    order,
  }), [docId, fileName, nodes, order])

  // Synchronize local form state with store's shareConfig whenever it updates
  useEffect(() => {
    if (shareConfig) {
      setMode(shareConfig.mode || "public-view")
      setEnabled(shareConfig.enabled !== false)
      if (shareConfig.publicId) {
        cacheLocalShare(shareConfig.publicId, docSnapshot)
      }
    }
  }, [shareConfig, docSnapshot])

  if (!open) return null

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const publicId = shareConfig?.publicId || ""
  // Clean short link — never generate legacy #d= payload fragments
  const shareUrl = publicId ? `${origin}/p/${publicId}` : ""

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleSaveSettings = async (overrideMode?: ShareMode, overrideEnabled?: boolean) => {
    setSaving(true)
    setError(null)
    setSuccessNotice(null)

    const targetMode = overrideMode !== undefined ? overrideMode : mode
    const targetEnabled = overrideEnabled !== undefined ? overrideEnabled : enabled

    if (targetMode === "password-edit" && !shareConfig?.hasPassword && (!password || password.trim().length < 3)) {
      setError("Please provide a password of at least 3 characters for Password Edit mode.")
      setSaving(false)
      return
    }

    try {
      const res = await updateShareSettings({
        mode: targetMode,
        enabled: targetEnabled,
        password: password.trim() ? password.trim() : undefined,
      })

      if (!res.success) {
        setError(res.error || "Failed to update share settings")
      } else {
        setPassword("")
        setSuccessNotice("Share settings saved!")
        setTimeout(() => setSuccessNotice(null), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateId = async () => {
    setShowRegenerateConfirm(false)
    setSaving(true)
    setError(null)
    try {
      const res = await updateShareSettings({
        regenerateId: true,
      })
      if (!res.success) {
        setError(res.error || "Failed to regenerate link")
      } else {
        setSuccessNotice("New share link generated!")
        setTimeout(() => setSuccessNotice(null), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRevokeShare = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await revokeShare()
      if (!res.success) {
        setError(res.error || "Failed to disable sharing")
      } else {
        setEnabled(false)
        setMode("private")
        setSuccessNotice("Sharing disabled. Page is now private.")
        setTimeout(() => setSuccessNotice(null), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Page"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onPointerDown={() => setShareModalOpen(false)}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-primary/10 text-primary">
              <ShareIcon size={16} weight="duotone" />
            </div>
            <div>
              <h2 className="text-title font-medium text-foreground">Share Page</h2>
              <p className="text-label text-muted-foreground truncate max-w-[280px]">{fileName}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setShareModalOpen(false)}
            aria-label="Close dialog"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-4.5 overflow-y-auto p-5 text-sm">
          {!selectedDbId ? (
            <div className="rounded-chrome-sm border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-medium">Shared Database Required</p>
              <p className="mt-1 opacity-90">
                To share pages with public or password access, connect this document to a shared database (such as Nezuko&apos;s Box or Community Cloud).
              </p>
            </div>
          ) : (
            <>
              {/* Access Mode Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Access Permissions
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {/* Public View */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("public-view")
                      setEnabled(true)
                    }}
                    className={`flex flex-col items-start gap-1 rounded-chrome-sm border p-2.5 text-left transition-all ${
                      mode === "public-view" && enabled
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/70 hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs">
                      <GlobeIcon size={14} weight={mode === "public-view" && enabled ? "bold" : "regular"} />
                      <span>Public</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Anyone with link can view (read-only)
                    </span>
                  </button>

                  {/* Password Edit */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("password-edit")
                      setEnabled(true)
                    }}
                    className={`flex flex-col items-start gap-1 rounded-chrome-sm border p-2.5 text-left transition-all ${
                      mode === "password-edit" && enabled
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/70 hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs">
                      <LockKeyIcon size={14} weight={mode === "password-edit" && enabled ? "bold" : "regular"} />
                      <span>Password Edit</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Anyone can view; password required to edit
                    </span>
                  </button>

                  {/* Private */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("private")
                    }}
                    className={`flex flex-col items-start gap-1 rounded-chrome-sm border p-2.5 text-left transition-all ${
                      mode === "private" || !enabled
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/70 hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs">
                      <LockIcon size={14} weight={mode === "private" || !enabled ? "bold" : "regular"} />
                      <span>Private</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Only authorized database members
                    </span>
                  </button>
                </div>
              </div>

              {/* Password Configuration (for password-edit mode) */}
              {mode === "password-edit" && enabled && (
                <div className="flex flex-col gap-1.5 rounded-chrome-sm border border-border/80 bg-accent/30 p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                      Edit Password {shareConfig?.hasPassword ? "(Current password is set)" : "(Required)"}
                    </label>
                  </div>
                  <input
                    type="password"
                    placeholder={shareConfig?.hasPassword ? "Leave blank to keep existing password…" : "Enter edit password (min 3 chars)…"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-8.5 w-full rounded-chrome-sm border border-border/80 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Visitors opening the link can view instantly. Clicking &quot;Unlock Editing&quot; will require this password.
                  </p>
                </div>
              )}

              {/* Share Link Box */}
              {enabled && mode !== "private" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                      Share Link
                    </label>
                    {showRegenerateConfirm ? (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-destructive font-medium">Revoke old URL?</span>
                        <button
                          type="button"
                          onClick={handleRegenerateId}
                          disabled={saving}
                          className="text-destructive font-semibold hover:underline"
                        >
                          Yes, regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRegenerateConfirm(false)}
                          className="text-muted-foreground hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowRegenerateConfirm(true)}
                        disabled={saving}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        title="Generate a new URL and revoke the old one"
                      >
                        <RegenerateIcon size={12} />
                        <span>Regenerate link</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex h-9 flex-1 items-center rounded-chrome-sm border border-border/80 bg-accent/40 px-2.5 font-mono text-xs text-foreground select-all overflow-hidden truncate">
                      {shareUrl || "Generating link…"}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="h-9 gap-1.5 rounded-chrome-sm text-xs shrink-0"
                    >
                      {copied ? <CheckIcon size={14} className="text-emerald-600" /> : <CopyIcon size={14} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </Button>
                    {shareUrl && (
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex size-9 items-center justify-center rounded-chrome-sm border border-border/80 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Open in new tab"
                      >
                        <OpenIcon size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Status Notice & Errors */}
              {error && <p className="text-xs text-destructive">{error}</p>}
              {successNotice && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{successNotice}</p>}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                {enabled && mode !== "private" ? (
                  <button
                    type="button"
                    onClick={handleRevokeShare}
                    disabled={saving}
                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    Disable Public Link
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-chrome-sm text-xs"
                    onClick={() => setShareModalOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveSettings()}
                    disabled={saving || isLoadingShare}
                    className="h-8 gap-1.5 rounded-chrome-sm text-xs font-medium"
                  >
                    <ShareIcon size={14} weight="bold" />
                    {saving ? "Saving…" : "Save & Apply"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
