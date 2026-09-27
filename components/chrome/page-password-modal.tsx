"use client"

// ---------------------------------------------------------------------------
// Page Password Settings Modal
// Allows document owners and editors to set, update, or remove password
// protection for the active document.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useSquig } from "@/lib/store"
import { Shield as ShieldIcon, Key as KeyIcon, Trash as TrashIcon, X as XIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export function PagePasswordModal() {
  const open = useSquig((s) => s.passwordModalOpen)
  const fileName = useSquig((s) => s.fileName)
  const hasPassword = useSquig((s) => s.hasPassword)
  const setPagePassword = useSquig((s) => s.setPagePassword)
  const removePagePassword = useSquig((s) => s.removePagePassword)
  const setPasswordModalOpen = useSquig((s) => s.setPasswordModalOpen)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      setError("Please provide a password")
      return
    }
    if (newPassword.length < 3) {
      setError("Password must be at least 3 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await setPagePassword(newPassword, currentPassword || undefined)
      if (!res.success) {
        setError(res.error || "Failed to set password")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await removePagePassword(currentPassword || undefined)
      if (!res.success) {
        setError(res.error || "Failed to remove password")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onPointerDown={() => setPasswordModalOpen(false)}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-primary/10 text-primary">
              <ShieldIcon size={16} weight="duotone" />
            </div>
            <div>
              <h2 className="text-title font-medium text-foreground">Password Protection</h2>
              <p className="text-label text-muted-foreground truncate max-w-[260px]">{fileName}</p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setPasswordModalOpen(false)}
            aria-label="Close dialog"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4 p-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {hasPassword
              ? "This document currently requires a password to edit. Viewers can see the page in read-only mode."
              : "Set a password to restrict editing permissions. Shared viewers will be in read-only mode until unlocked."}
          </p>

          {hasPassword && (
            <div className="flex flex-col gap-1.5">
              <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                Current Password (if set)
              </label>
              <input
                type="password"
                placeholder="Enter current password…"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                className="h-9 w-full rounded-chrome-sm border border-border/80 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
              {hasPassword ? "New Password" : "Set Password"}
            </label>
            <input
              type="password"
              placeholder="Enter new password…"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setError(null)
              }}
              disabled={loading}
              className="h-9 w-full rounded-chrome-sm border border-border/80 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Repeat password…"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError(null)
              }}
              disabled={loading}
              className="h-9 w-full rounded-chrome-sm border border-border/80 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            {hasPassword ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-chrome-sm text-xs text-destructive hover:bg-destructive/10"
                onClick={handleRemove}
                disabled={loading}
              >
                <TrashIcon size={14} />
                Remove Lock
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-chrome-sm text-xs"
                onClick={() => setPasswordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newPassword || loading}
                className="h-8 gap-1.5 rounded-chrome-sm text-xs font-medium"
              >
                <KeyIcon size={14} weight="bold" />
                {loading ? "Saving…" : "Save Password"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
