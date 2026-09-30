"use client"

import { useState, use, useEffect } from "react"
import { useAuthStore } from "@/lib/auth-store"
import { syncThemeToDOM, useShellStore } from "@/lib/shell-store"
import { acceptInvitationAction } from "@/lib/actions/invitations"
import { EnvelopeSimple, Check, WarningCircle, ArrowRight } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params)
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    syncThemeToDOM(useShellStore.getState().preferences.themeMode)
  }, [])

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await acceptInvitationAction(token)
      setAccepted(true)
      setTimeout(() => {
        if (res?.documentId) {
          window.location.href = `/?doc=${res.documentId}`
        } else {
          window.location.href = "/"
        }
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-[#f8f6f0] dark:bg-[#0E1015] p-4 text-[#18181b] dark:text-stone-100">
      <div className="w-full max-w-md rounded-2xl border border-[#e4e0d4] dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl text-center space-y-6">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400">
          <EnvelopeSimple size={28} />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#2563eb] dark:text-blue-400 uppercase">
            Zenithsui Invitation
          </span>
          <h1 className="font-sans text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">You&apos;ve Been Invited</h1>
          <p className="text-xs text-[#71717a] dark:text-stone-400">
            You have received an invitation to collaborate on a Zenithsui canvas wireframe.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/60 text-left">
            <WarningCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {accepted ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <Check size={20} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Invitation accepted! Redirecting to workspace...</span>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="w-full h-10 font-mono text-xs"
            >
              {loading ? "Accepting..." : "Accept Invitation"} <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
