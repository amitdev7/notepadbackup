"use client"

import { useState } from "react"
import { useAuthStore } from "@/lib/auth-store"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, GoogleLogo, EnvelopeSimple, Lock, ArrowLeft } from "@phosphor-icons/react"

export function AuthDialog() {
  const { isAuthDialogOpen, authDialogView, closeAuthDialog, openAuthDialog, initialize } = useAuthStore()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  if (!isAuthDialogOpen) return null

  const handleOAuth = async (provider: "google") => {
    setLoading(true)
    setMessage(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/api/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to initiate sign in"
      setMessage({ type: "error", text: errorMsg })
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = getSupabaseBrowserClient()

    try {
      if (authDialogView === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        await initialize()
        closeAuthDialog()
      } else if (authDialogView === "sign-up") {
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/api/auth/callback`,
          },
        })
        if (error) throw error
        if (data.session) {
          await initialize()
          closeAuthDialog()
        } else {
          setMessage({
            type: "success",
            text: "Check your email for the confirmation link to complete registration.",
          })
        }
      } else if (authDialogView === "reset-password") {
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/api/auth/callback?next=/account/update-password`,
        })
        if (error) throw error
        setMessage({
          type: "success",
          text: "Password reset link sent to your email.",
        })
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Authentication error"
      setMessage({ type: "error", text: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthDialog()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeAuthDialog()
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl text-card-foreground">
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            {authDialogView !== "sign-in" && (
              <button
                type="button"
                onClick={() => openAuthDialog("sign-in")}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                aria-label="Back to sign in"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 id="auth-dialog-title" className="font-serif text-lg tracking-tight">
              {authDialogView === "sign-in" && "Sign in to Zenithsui"}
              {authDialogView === "sign-up" && "Create your account"}
              {authDialogView === "reset-password" && "Reset password"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAuthDialog}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {message && (
          <div
            className={`my-3 p-2.5 rounded text-xs ${
              message.type === "error"
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="py-4 space-y-4">
          {authDialogView !== "reset-password" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2 h-9 text-xs"
                onClick={() => handleOAuth("google")}
                disabled={loading}
              >
                <GoogleLogo size={16} weight="bold" />
                Continue with Google
              </Button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <span className="relative bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  or
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5" htmlFor="email-input">
                <EnvelopeSimple size={14} /> Email
              </label>
              <Input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-9 text-xs"
              />
            </div>

            {authDialogView !== "reset-password" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5" htmlFor="password-input">
                    <Lock size={14} /> Password
                  </label>
                  {authDialogView === "sign-in" && (
                    <button
                      type="button"
                      onClick={() => openAuthDialog("reset-password")}
                      className="text-[11px] text-muted-foreground hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <Input
                  id="password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-xs"
                />
              </div>
            )}

            <Button type="submit" className="w-full h-9 text-xs mt-2" disabled={loading}>
              {loading ? "Processing…" : authDialogView === "sign-in" ? "Sign in" : authDialogView === "sign-up" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {authDialogView === "sign-in" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => openAuthDialog("sign-up")}
                  className="text-foreground underline underline-offset-2"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => openAuthDialog("sign-in")}
                  className="text-foreground underline underline-offset-2"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

