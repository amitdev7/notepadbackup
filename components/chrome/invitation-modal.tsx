"use client"

// ---------------------------------------------------------------------------
// Invitation Modal
// Appears when user opens an invitation link (?invite=<token>).
// Allows the recipient to review the team details and accept/decline.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react"
import { useSquig } from "@/lib/store"
import { getInvitationByTokenClient, respondInvitationClient } from "@/lib/teams"
import {
  UsersThree as TeamsIcon,
  Check as CheckIcon,
  X as XIcon,
  Clock as ClockIcon,
  WarningCircle as WarningIcon,
} from "@phosphor-icons/react"

export function InvitationModal() {
  const token = useSquig((s) => s.invitationModalToken)
  const st = useSquig.getState

  const [invitation, setInvitation] = useState<{
    id: string
    teamId: string
    teamName: string
    recipientEmail: string
    role: string
    inviterName: string
    status: string
    expiresAt: number
    isExpired: boolean
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    // Check URL parameters for ?invite=<token>
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const inviteParam = urlParams.get("invite")
      if (inviteParam && !token) {
        st().setInvitationModalToken(inviteParam)
      }
    }
  }, [token, st])

  const loadInvitation = useCallback(async (invToken: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getInvitationByTokenClient(invToken)
      if (res.success && res.invitation) {
        setInvitation(res.invitation)
      } else {
        setError(res.error || "Invitation not found or has expired.")
      }
    } catch {
      setError("Network error loading invitation.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      void loadInvitation(token)
    }
  }, [token, loadInvitation])

  if (!token) return null

  const handleClose = () => {
    st().setInvitationModalToken(null)
    // Clean URL query param without full reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("invite")
      window.history.replaceState({}, document.title, url.pathname)
    }
  }

  const handleRespond = async (action: "accept" | "decline") => {
    setProcessing(true)
    setError(null)
    try {
      const res = await respondInvitationClient(
        token,
        action,
        userName.trim() || undefined,
        invitation?.recipientEmail
      )
      if (res.success) {
        if (action === "accept") {
          st().setNotice(`Joined team "${invitation?.teamName}"!`)
          await st().fetchTeams()
          if (res.teamId) {
            await st().switchTeam(res.teamId)
          }
        } else {
          st().setNotice("Invitation declined.")
        }
        handleClose()
      } else {
        setError(res.error || `Failed to ${action} invitation.`)
      }
    } catch {
      setError("Network error responding to invitation.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onPointerDown={handleClose}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-muted text-[var(--sq-ink)]">
              <TeamsIcon size={16} weight="duotone" />
            </div>
            <div>
              <h2 className="text-title font-medium text-foreground">Team Invitation</h2>
              <p className="text-label text-muted-foreground">
                You have been invited to collaborate
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-5">
          {loading ? (
            <div className="py-8 text-center text-label text-muted-foreground">
              Loading invitation details…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <WarningIcon size={32} className="text-amber-500" />
              <div className="text-label font-medium text-foreground">{error}</div>
              <button
                type="button"
                onClick={handleClose}
                className="h-ctl rounded-chrome-sm border border-border bg-background px-4 text-label font-medium text-foreground hover:bg-accent"
              >
                Close
              </button>
            </div>
          ) : invitation ? (
            <>
              <div className="rounded-chrome-md border border-border/70 bg-accent/20 p-4">
                <div className="text-label text-muted-foreground">
                  <strong>{invitation.inviterName}</strong> invited you to join:
                </div>
                <div className="mt-1 text-title font-medium text-foreground">
                  {invitation.teamName}
                </div>
                <div className="mt-3 flex items-center gap-2 text-micro text-muted-foreground">
                  <span>Role: <strong className="uppercase">{invitation.role}</strong></span>
                  <span>•</span>
                  <span>Sent to: {invitation.recipientEmail}</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-label font-medium text-foreground">
                  Your Display Name <span className="text-micro text-muted-foreground">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-label text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleRespond("decline")}
                  className="h-ctl rounded-chrome-sm border border-border bg-background px-3 text-label font-medium text-foreground hover:bg-accent"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleRespond("accept")}
                  className="h-ctl flex items-center gap-1.5 rounded-chrome-sm bg-[var(--sq-ink)] px-4 text-label font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  <CheckIcon size={14} weight="bold" />
                  {processing ? "Joining..." : "Accept Invitation"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
