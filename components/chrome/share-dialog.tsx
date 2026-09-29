"use client"

import { useState, useEffect } from "react"
import { useSquig } from "@/lib/store"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import {
  X,
  Copy,
  Check,
  ShareNetwork,
  Lock,
  Globe,
  Users,
  EnvelopeSimple,
  ArrowClockwise,
  Trash,
  Key,
  Eye,
  PencilSimple,
  WarningCircle,
  QrCode,
  ArrowSquareOut,
  ShieldCheck,
  Link as LinkIcon,
} from "@phosphor-icons/react"
import {
  createShareLinkAction,
  rotateShareLinkAction,
  revokeShareLinkAction,
  revokeAllShareLinksAction,
  updateDocumentMemberRoleAction,
  removeDocumentMemberAction,
  transferOwnershipAction,
  publishDocumentAction,
  unpublishDocumentAction,
} from "@/lib/actions/sharing"
import {
  createInvitationsAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "@/lib/actions/invitations"
import { parseEmailList } from "@/lib/cloud/invitations"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  cloudDocId?: string
}

export function ShareDialog({ isOpen, onClose, cloudDocId }: ShareDialogProps) {
  const fileName = useSquig((s) => s.fileName)
  const { user, openAuthDialog } = useAuthStore()

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"collaborate" | "publish">("collaborate")

  // Link creation options
  const [permission, setPermission] = useState<"view" | "edit">("view")
  const [linkLabel, setLinkLabel] = useState("")
  const [requirePassword, setRequirePassword] = useState(false)
  const [password, setPassword] = useState("")
  const [allowExport, setAllowExport] = useState(true)
  const [allowDuplicate, setAllowDuplicate] = useState(true)
  const [expiration, setExpiration] = useState<string>("never") // never, 3600, 86400, 604800, 2592000

  // Direct email invite state
  const [inviteEmails, setInviteEmails] = useState("")
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer")

  // Public publishing state
  const [isPublic, setIsPublic] = useState(false)
  const [publicSlug, setPublicSlug] = useState("")
  const [publicRole, setPublicRole] = useState<"viewer" | "editor">("viewer")

  // Data lists
  const [members, setMembers] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [isOwner, setIsOwner] = useState(true)

  // Status & feedback
  const [activeCreatedUrl, setActiveCreatedUrl] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showQr, setShowQr] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false)

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Fetch document share data
  useEffect(() => {
    if (!isOpen || !cloudDocId) return

    async function loadData() {
      try {
        const [linksRes, invitesRes] = await Promise.all([
          fetch(`/api/share?documentId=${cloudDocId}`).then((r) => r.json()),
          fetch(`/api/invitations?documentId=${cloudDocId}`).then((r) => r.json()),
        ])

        if (linksRes.ok) setLinks(linksRes.data || [])
        if (invitesRes.ok) setInvitations(invitesRes.data || [])
      } catch {
        // Fallback for offline or unauthenticated mode
      }
    }
    loadData()
  }, [isOpen, cloudDocId])

  if (!isOpen) return null

  const handleCopy = (text: string, id = "main") => {
    navigator.clipboard.writeText(text)
    setCopiedLink(id)
    setNotice("Link copied to clipboard")
    setTimeout(() => {
      setCopiedLink(null)
      setNotice(null)
    }, 2500)
  }

  // Create cryptographic share link
  const handleCreateLink = async () => {
    if (!user) {
      openAuthDialog("sign-in")
      return
    }
    if (!cloudDocId) {
      setError("Please save document to cloud first.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const expiresInSec =
        expiration === "never" ? null : parseInt(expiration, 10)

      const result = await createShareLinkAction(cloudDocId, {
        permission,
        name: linkLabel.trim() || null,
        password: requirePassword ? password : null,
        expiresInSeconds: expiresInSec,
        allowExport,
        allowDuplicate,
      })

      const fullUrl = `${window.location.origin}${result.shareUrl}`
      setActiveCreatedUrl(fullUrl)
      setLinks((prev) => [result.link, ...prev])
      setNotice("Share link created successfully")
      setTimeout(() => setNotice(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to create share link")
    } finally {
      setLoading(false)
    }
  }

  // Send invitations
  const handleSendInvites = async () => {
    if (!user) {
      openAuthDialog("sign-in")
      return
    }
    if (!cloudDocId) return

    const parsed = parseEmailList(inviteEmails)
    if (parsed.length === 0) {
      setError("Please enter valid email addresses.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const results = await createInvitationsAction(cloudDocId, parsed, inviteRole)
      setInvitations((prev) => [...results.map((r) => r.invitation), ...prev])
      setInviteEmails("")
      setNotice(`Sent ${results.length} invitation(s)`)
      setTimeout(() => setNotice(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to send invitations")
    } finally {
      setLoading(false)
    }
  }

  // Rotate a link
  const handleRotateLink = async (linkId: string) => {
    if (!cloudDocId) return
    setLoading(true)
    try {
      const rotated = await rotateShareLinkAction(cloudDocId, linkId)
      setLinks((prev) => prev.map((l) => (l.id === linkId ? rotated.link : l)))
      setNotice("Link rotated; previous URL is now invalid")
      setTimeout(() => setNotice(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to rotate link")
    } finally {
      setLoading(false)
    }
  }

  // Revoke a link
  const handleRevokeLink = async (linkId: string) => {
    if (!cloudDocId) return
    setLoading(true)
    try {
      await revokeShareLinkAction(cloudDocId, linkId)
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, is_active: false, revoked_at: new Date().toISOString() } : l))
      )
      setNotice("Share link revoked")
      setTimeout(() => setNotice(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to revoke link")
    } finally {
      setLoading(false)
    }
  }

  // Revoke all links
  const handleRevokeAll = async () => {
    if (!cloudDocId) return
    if (!confirm("Are you sure you want to revoke ALL share links? All existing shared links will immediately stop working.")) return

    setLoading(true)
    try {
      await revokeAllShareLinksAction(cloudDocId)
      setLinks((prev) => prev.map((l) => ({ ...l, is_active: false, revoked_at: new Date().toISOString() })))
      setNotice("All share links have been revoked")
      setTimeout(() => setNotice(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to revoke all links")
    } finally {
      setLoading(false)
    }
  }

  // Public publishing toggle
  const handleTogglePublish = async () => {
    if (!cloudDocId) return
    setLoading(true)
    try {
      if (isPublic) {
        await unpublishDocumentAction(cloudDocId)
        setIsPublic(false)
        setNotice("Document unpublished from the public web")
      } else {
        const res = await publishDocumentAction(cloudDocId, publicSlug || null, publicRole)
        setIsPublic(true)
        setPublicSlug(res.publicSlug)
        setNotice(`Document published at /p/${res.publicSlug}`)
      }
      setTimeout(() => setNotice(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update publishing state")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card p-6 shadow-2xl text-card-foreground overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ShareNetwork size={18} className="text-muted-foreground" />
            <h2 id="share-dialog-title" className="font-serif text-base font-semibold truncate">
              Share &ldquo;{fileName}&rdquo;
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Offline Notice */}
        {isOffline && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <WarningCircle size={16} />
            <span>You are offline. Share settings cannot be modified until you reconnect.</span>
          </div>
        )}

        {/* Status Notice */}
        {notice && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <Check size={16} />
            <span>{notice}</span>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <WarningCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b border-border pb-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("collaborate")}
            className={`pb-1 transition-colors ${
              activeTab === "collaborate"
                ? "border-b-2 border-primary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Collaborators &amp; Links
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("publish")}
            className={`pb-1 transition-colors ${
              activeTab === "publish"
                ? "border-b-2 border-primary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Publish to Web
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6">
          {activeTab === "collaborate" ? (
            <>
              {/* Section 1: Invite People Directly */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1.5">
                  <EnvelopeSimple size={14} /> Invite People
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="email@example.com, colleague@work.com"
                    disabled={isOffline || loading}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                    disabled={isOffline || loading}
                    aria-label="Invitation permission"
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleSendInvites}
                    disabled={isOffline || loading || !inviteEmails.trim()}
                    className="h-8 text-xs font-mono"
                  >
                    Send Invite
                  </Button>
                </div>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <span className="text-[11px] font-mono text-muted-foreground">Pending Invitations ({invitations.length})</span>
                  <div className="space-y-1.5">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <EnvelopeSimple size={14} className="text-muted-foreground" />
                          <span className="font-mono">{inv.email}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {inv.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(`${window.location.origin}/invite/${inv.token_hash}`, inv.id)}
                            className="text-xs text-muted-foreground hover:text-foreground p-1"
                            title="Copy invite URL"
                          >
                            {copiedLink === inv.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Create Share Link */}
              <div className="space-y-3 pt-3 border-t border-border/50">
                <label className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1.5">
                  <LinkIcon size={14} /> Create Share Link
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">Access Level</span>
                    <select
                      value={permission}
                      onChange={(e) => setPermission(e.target.value as "view" | "edit")}
                      aria-label="Access Level"
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="view">Viewer (Can pan, zoom, inspect)</option>
                      <option value="edit">Editor (Can edit nodes and drawings)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">Expiration</span>
                    <select
                      value={expiration}
                      onChange={(e) => setExpiration(e.target.value)}
                      aria-label="Link Expiration"
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="never">Never expires</option>
                      <option value="3600">1 hour</option>
                      <option value="86400">1 day</option>
                      <option value="604800">7 days</option>
                      <option value="2592000">30 days</option>
                    </select>
                  </div>
                </div>

                {/* Optional Controls */}
                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirePassword}
                      onChange={(e) => setRequirePassword(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="font-sans">Require password</span>
                  </label>

                  {requirePassword && (
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a secure password..."
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  )}

                  <div className="flex gap-6 pt-1 text-muted-foreground">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowExport}
                        onChange={(e) => setAllowExport(e.target.checked)}
                        className="rounded border-input"
                      />
                      <span>Allow export (PNG/SVG)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDuplicate}
                        onChange={(e) => setAllowDuplicate(e.target.checked)}
                        className="rounded border-input"
                      />
                      <span>Allow duplicate</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleCreateLink}
                    disabled={isOffline || loading || (requirePassword && !password)}
                    className="w-full h-8 text-xs font-mono"
                  >
                    Generate Secure Link
                  </Button>
                </div>

                {activeCreatedUrl && (
                  <div className="mt-2 p-2.5 rounded-md border border-primary/30 bg-primary/5 flex items-center justify-between">
                    <span className="text-xs font-mono truncate text-primary mr-2">
                      {activeCreatedUrl}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(activeCreatedUrl, "active")}
                      className="h-7 text-xs font-mono shrink-0"
                    >
                      {copiedLink === "active" ? <Check size={14} className="text-emerald-500 mr-1" /> : <Copy size={14} className="mr-1" />}
                      Copy
                    </Button>
                  </div>
                )}
              </div>

              {/* Active Links List */}
              {links.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">Active Share Links ({links.filter(l => l.is_active).length})</span>
                    <button
                      type="button"
                      onClick={handleRevokeAll}
                      className="text-[11px] font-mono text-destructive hover:underline"
                    >
                      Revoke all links
                    </button>
                  </div>

                  <div className="space-y-2">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className={`flex items-center justify-between rounded-md border p-2.5 text-xs ${
                          link.is_active ? "border-border bg-card" : "border-border/30 bg-muted/10 opacity-60"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{link.name || "Share Link"}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {link.permission}
                            </span>
                            {!link.is_active && (
                              <span className="text-[10px] font-mono text-destructive">Revoked</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Used {link.use_count || 0} times • {link.expires_at ? `Expires ${new Date(link.expires_at).toLocaleDateString()}` : "Never expires"}
                          </div>
                        </div>

                        {link.is_active && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRotateLink(link.id)}
                              title="Regenerate link (revokes previous)"
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              <ArrowClockwise size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeLink(link.id)}
                              title="Revoke link"
                              className="p-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Publish to Web Tab */
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Public Web Publishing</h3>
                    <p className="text-xs text-muted-foreground">
                      Make this document publicly viewable on the web at a readable URL.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isPublic ? "destructive" : "default"}
                    onClick={handleTogglePublish}
                    disabled={isOffline || loading}
                    className="text-xs font-mono"
                  >
                    {isPublic ? "Unpublish" : "Publish to Web"}
                  </Button>
                </div>

                {isPublic && (
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <span className="text-xs font-mono text-muted-foreground">Public URL</span>
                    <div className="flex items-center justify-between rounded-md bg-muted/40 p-2 text-xs font-mono">
                      <span className="truncate text-foreground">
                        {window.location.origin}/p/{publicSlug || "published-doc"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(`${window.location.origin}/p/${publicSlug}`, "pub")}
                          className="h-7 px-2 text-xs"
                        >
                          {copiedLink === "pub" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </Button>
                        <a
                          href={`/p/${publicSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                          title="Open public page"
                        >
                          <ArrowSquareOut size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={14} /> Server-enforced permissions
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs font-mono">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
