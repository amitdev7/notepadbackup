"use client"

import { useState } from "react"
import { Lock, WarningCircle } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface SharePasswordModalProps {
  token: string
  onSuccess: () => void
}

export function SharePasswordModal({ token, onSuccess }: SharePasswordModalProps) {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || "Incorrect password")
        return
      }

      onSuccess()
    } catch {
      setError("Network error while verifying password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
            <Lock size={24} />
          </div>
          <h2 className="font-sans text-base font-semibold tracking-tight">Protected Document</h2>
          <p className="text-xs text-muted-foreground">
            This document is password protected. Enter the password below to view the canvas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password..."
            disabled={loading}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              <WarningCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading || !password.trim()} className="w-full h-9 font-mono text-xs">
            {loading ? "Verifying..." : "Unlock Document"}
          </Button>
        </form>
      </div>
    </div>
  )
}
