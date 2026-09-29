"use client"

import { useState, use } from "react"
import { useAuthStore } from "@/lib/auth-store"
import { acceptInvitationAction } from "@/lib/actions/invitations"
import { EnvelopeSimple, Check, WarningCircle, ArrowRight } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params)
  const { user, openAuthDialog } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  const handleAccept = async () => {
    if (!user) {
      openAuthDialog("sign-in")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await acceptInvitationAction(token)
      setAccepted(true)
      setTimeout(() => {
        window.location.href = "/"
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-[#f8f6f0] p-4 text-[#18181b]">
      <div className="w-full max-w-md rounded-2xl border border-[#e4e0d4] bg-white p-8 shadow-xl text-center space-y-6">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]">
          <EnvelopeSimple size={28} />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#2563eb] uppercase">
            Zenithsui Invitation
          </span>
          <h1 className="font-serif text-2xl font-bold">You&apos;ve Been Invited</h1>
          <p className="text-xs text-[#71717a]">
            You have received an invitation to collaborate on a Zenithsui canvas wireframe.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200 text-left">
            <WarningCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {accepted ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs text-emerald-700 border border-emerald-200">
            <Check size={20} className="text-emerald-600" />
            <span className="font-medium">Invitation accepted! Redirecting to workspace...</span>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {user ? (
              <Button
                onClick={handleAccept}
                disabled={loading}
                className="w-full h-10 font-mono text-xs"
              >
                {loading ? "Accepting..." : "Accept Invitation"} <ArrowRight size={14} className="ml-1" />
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => openAuthDialog("sign-in")}
                  className="w-full h-10 font-mono text-xs"
                >
                  Sign in to Accept Invitation
                </Button>
                <p className="text-[11px] text-[#a1a1aa] font-mono">
                  Sign in or create a free account to join this document.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
