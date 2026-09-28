"use client"

// ---------------------------------------------------------------------------
// Unlock Page Modal
// Allows viewers to enter a password to obtain editor permissions on a
// protected document. Includes 3-attempt lockout warning and lockout state.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useSquig } from "@/lib/store"
import { Lock as LockIcon, LockKey as LockKeyIcon, WarningCircle as WarningCircleIcon, X as XIcon, ShieldCheck as ShieldCheckIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export function UnlockModal() {
  const open = useSquig((s) => s.unlockModalOpen)
  const fileName = useSquig((s) => s.fileName)
  const attemptsLeft = useSquig((s) => s.unlockAttemptsLeft)
  const isLocked = useSquig((s) => s.isLocked)
  const unlockPage = useSquig((s) => s.unlockPage)
  const setUnlockModalOpen = useSquig((s) => s.setUnlockModalOpen)

  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || isLocked) return
    setLoading(true)
    setError(null)
    try {
      const ok = await unlockPage(password)
      if (!ok) {
        setError("Incorrect password")
        setPassword("")
      } else {
        setPassword("")
        setUnlockModalOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onPointerDown={() => setUnlockModalOpen(false)}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <LockIcon size={16} weight="duotone" />
            </div>
            <div>
              <h2 className="text-title font-medium text-foreground">Protected Document</h2>
              <p className="text-label text-muted-foreground truncate max-w-[260px]">{fileName}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setUnlockModalOpen(false)}
            aria-label="Close dialog"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleUnlock} className="flex flex-col gap-4 p-5">
          <div className="rounded-chrome-md bg-muted/60 p-3.5 text-xs text-muted-foreground leading-relaxed flex gap-2.5 items-start">
            <ShieldCheckIcon size={18} weight="duotone" className="shrink-0 text-foreground mt-0.5" />
            <span>
              This document is in <strong>Read-Only</strong> mode. Enter the document password to unlock editing permissions.
            </span>
          </div>

          {isLocked ? (
            <div className="flex items-center gap-2.5 rounded-chrome-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <WarningCircleIcon size={18} weight="fill" className="shrink-0" />
              <span>Editing is locked for this session due to 3 consecutive failed password attempts.</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Document Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter password…"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(null)
                    }}
                    disabled={loading || isLocked}
                    className="h-9 w-full rounded-chrome-sm border border-border/80 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center justify-between text-xs text-destructive">
                  <span>{error}</span>
                  {attemptsLeft !== undefined && attemptsLeft > 0 && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} remaining
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-chrome-sm text-xs"
              onClick={() => setUnlockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!password || loading || isLocked}
              className="h-8 gap-1.5 rounded-chrome-sm text-xs font-medium"
            >
              <LockKeyIcon size={14} weight="bold" />
              {loading ? "Unlocking…" : "Unlock Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
