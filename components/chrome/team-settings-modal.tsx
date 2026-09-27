"use client"

// ---------------------------------------------------------------------------
// Team Settings & Member Management Dialog
// Full management for team members, roles, invitations, databases & settings.
// Strictly matches Zenithsui design system & aesthetic tokens.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react"
import { useSquig } from "@/lib/store"
import {
  getTeamDetailsClient,
  updateTeamClient,
  deleteTeamClient,
  addTeamMemberClient,
  updateTeamMemberRoleClient,
  removeTeamMemberClient,
  inviteTeamMemberClient,
  revokeTeamInvitationClient,
  type TeamDetailResponse,
} from "@/lib/teams"
import { AVAILABLE_DATABASES } from "@/lib/database"
import type { TeamRole, TeamMember, TeamInvitation } from "@/lib/team-types"
import {
  UsersThree as TeamsIcon,
  UserPlus as UserPlusIcon,
  X as XIcon,
  Trash as TrashIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  ShieldCheck as ShieldIcon,
  EnvelopeSimple as EmailIcon,
  Database as DatabaseIcon,
  Gear as GearIcon,
  Link as LinkIcon,
  ArrowsClockwise as RefreshIcon,
} from "@phosphor-icons/react"

type TabKind = "members" | "invitations" | "databases" | "settings"

export function TeamSettingsModal() {
  const open = useSquig((s) => s.teamSettingsModalOpen)
  const currentTeamId = useSquig((s) => s.currentTeamId)
  const currentTeamDetails = useSquig((s) => s.currentTeamDetails)
  const st = useSquig.getState

  const [activeTab, setActiveTab] = useState<TabKind>("members")
  const [details, setDetails] = useState<TeamDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Settings form
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [slug, setSlug] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)

  // Member invitation form
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("member")
  const [inviteName, setInviteName] = useState("")
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Attach database state
  const [attachingDb, setAttachingDb] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null)
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false)

  const isOwner = details?.currentUserRole === "owner"
  const isAdmin = details?.currentUserRole === "admin" || isOwner
  const canManage = isAdmin

  const loadTeam = useCallback(async (teamId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getTeamDetailsClient(teamId)
      if (res) {
        setDetails(res)
        setName(res.name)
        setDescription(res.description || "")
        setSlug(res.slug)
      } else {
        setError("Failed to load team information.")
      }
    } catch {
      setError("Network error loading team.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && currentTeamId) {
      void loadTeam(currentTeamId)
    }
  }, [open, currentTeamId, loadTeam])

  if (!open || !currentTeamId) return null

  const handleClose = () => {
    setError(null)
    setNotice(null)
    st().setTeamSettingsModalOpen(false)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSavingSettings(true)
    setError(null)
    setNotice(null)
    try {
      const res = await updateTeamClient(currentTeamId, {
        name: name.trim(),
        description: description.trim(),
        slug: slug.trim(),
      })
      if (res.success) {
        setNotice("Team settings updated successfully.")
        await st().fetchTeams()
        await loadTeam(currentTeamId)
      } else {
        setError(res.error || "Failed to update team settings.")
      }
    } catch {
      setError("Failed to save settings.")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleRoleChange = async (memberUserId: string, newRole: TeamRole) => {
    try {
      const res = await updateTeamMemberRoleClient(currentTeamId, memberUserId, newRole)
      if (res.success && details) {
        setDetails({ ...details, members: res.members || details.members })
        setNotice("Member role updated.")
      } else {
        setError(res.error || "Failed to update role.")
      }
    } catch {
      setError("Network error updating role.")
    }
  }

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    setMemberToRemove(null)
    try {
      const res = await removeTeamMemberClient(currentTeamId, memberUserId)
      if (res.success && details) {
        setDetails({
          ...details,
          members: details.members.filter((m) => m.userId !== memberUserId),
        })
        setNotice(`Removed ${memberName} from team.`)
        await st().fetchTeams()
      } else {
        setError(res.error || "Failed to remove member.")
      }
    } catch {
      setError("Network error removing member.")
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setError(null)
    setNotice(null)
    try {
      const res = await inviteTeamMemberClient(currentTeamId, inviteEmail.trim(), inviteRole)
      if (res.success && res.invitation) {
        setNotice(`Invitation generated for ${inviteEmail.trim()}`)
        setInviteEmail("")
        await loadTeam(currentTeamId)
      } else {
        setError(res.error || "Failed to create invitation.")
      }
    } catch {
      setError("Network error creating invitation.")
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      const res = await revokeTeamInvitationClient(currentTeamId, invitationId)
      if (res.success && details) {
        setDetails({
          ...details,
          invitations: details.invitations.filter((i) => i.id !== invitationId),
        })
        setNotice("Invitation revoked.")
      } else {
        setError(res.error || "Failed to revoke invitation.")
      }
    } catch {
      setError("Network error revoking invitation.")
    }
  }

  const copyInviteLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}/?invite=${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setNotice("Invitation link copied to clipboard!")
    setTimeout(() => setCopiedToken(null), 2500)
  }

  const handleDeleteTeam = async () => {
    setConfirmDeleteTeam(false)
    try {
      const res = await deleteTeamClient(currentTeamId)
      if (res.success) {
        st().setNotice(`Deleted team "${details?.name}"`)
        await st().fetchTeams()
        await st().switchTeam(null)
        handleClose()
      } else {
        setError(res.error || "Failed to delete team.")
      }
    } catch {
      setError("Network error deleting team.")
    }
  }

  const roleColorBadge = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30"
      case "admin":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"
      case "member":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      case "viewer":
        return "bg-muted text-muted-foreground border-border/70"
      default:
        return "bg-muted text-muted-foreground border-border/70"
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onPointerDown={handleClose}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-muted text-[var(--sq-ink)]">
              <TeamsIcon size={16} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-title font-medium text-foreground">
                  {details ? details.name : "Team Settings"}
                </h2>
                {details?.currentUserRole && (
                  <span
                    className={`rounded-chrome-xs border px-1.5 py-0.2 text-[10px] font-medium uppercase tracking-wider ${roleColorBadge(
                      details.currentUserRole
                    )}`}
                  >
                    {details.currentUserRole}
                  </span>
                )}
              </div>
              <p className="text-label text-muted-foreground">
                Manage members, roles, permissions, and workspace databases
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

        {/* Navigation Tabs */}
        <div className="flex shrink-0 border-b border-border/70 bg-muted/20 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`border-b-2 px-3 py-2 text-label font-medium transition-colors ${
              activeTab === "members"
                ? "border-[var(--sq-ink)] text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Members ({details?.members.length || 0})
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab("invitations")}
              className={`border-b-2 px-3 py-2 text-label font-medium transition-colors ${
                activeTab === "invitations"
                  ? "border-[var(--sq-ink)] text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Invitations ({details?.invitations.length || 0})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("databases")}
            className={`border-b-2 px-3 py-2 text-label font-medium transition-colors ${
              activeTab === "databases"
                ? "border-[var(--sq-ink)] text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Databases ({details?.databaseIds.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`border-b-2 px-3 py-2 text-label font-medium transition-colors ${
              activeTab === "settings"
                ? "border-[var(--sq-ink)] text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Settings
          </button>
        </div>

        {/* Notice & Error banners */}
        {error && (
          <div className="mx-5 mt-4 rounded-chrome-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-label text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {notice && (
          <div className="mx-5 mt-4 rounded-chrome-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-label text-emerald-600 dark:text-emerald-400">
            {notice}
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          {/* TAB 1: MEMBERS */}
          {activeTab === "members" && (
            <div className="flex flex-col gap-5">
              {/* Quick Invite Row for Admins */}
              {canManage && (
                <div className="rounded-chrome-md border border-border/70 bg-accent/20 p-3.5">
                  <div className="mb-2 text-label font-medium text-foreground">
                    Add Team Member
                  </div>
                  <form onSubmit={handleSendInvite} className="flex flex-wrap items-center gap-2">
                    <input
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="min-w-[200px] flex-1 rounded-chrome-sm border border-border bg-background px-3 py-1.5 text-label text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                      className="rounded-chrome-sm border border-border bg-background px-2.5 py-1.5 text-label text-foreground focus:border-[var(--sq-ink)] focus:outline-none"
                    >
                      <option value="viewer">Viewer (Read-only)</option>
                      <option value="member">Member (Can edit)</option>
                      <option value="admin">Admin (Can manage team)</option>
                      {isOwner && <option value="owner">Owner (Full control)</option>}
                    </select>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="h-ctl flex items-center gap-1.5 rounded-chrome-sm bg-[var(--sq-ink)] px-3 text-label font-medium text-background hover:opacity-90 disabled:opacity-50"
                    >
                      <UserPlusIcon size={14} weight="bold" />
                      {inviting ? "Inviting..." : "Invite"}
                    </button>
                  </form>
                </div>
              )}

              {/* Members List */}
              <div>
                <div className="mb-2 text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Active Members
                </div>
                <div className="divide-y divide-border/60 rounded-chrome-md border border-border/70">
                  {details?.members.map((member) => {
                    const isSelf = member.userId === details.ownerId // or current user
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 transition-colors hover:bg-accent/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-muted font-sans text-xs font-semibold text-foreground">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-row font-medium text-foreground">
                                {member.name}
                              </span>
                              {member.userId === details.ownerId && (
                                <span className="rounded-chrome-xs border border-amber-500/30 bg-amber-500/10 px-1 py-0.2 text-[9px] font-medium text-amber-600 uppercase">
                                  Owner
                                </span>
                              )}
                            </div>
                            <span className="text-micro text-muted-foreground">
                              {member.email || "User ID: " + member.userId} • Joined{" "}
                              {new Date(member.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canManage && member.userId !== details.ownerId ? (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.userId, e.target.value as TeamRole)
                                }
                                className="rounded-chrome-sm border border-border bg-background px-2 py-1 text-micro text-foreground focus:border-[var(--sq-ink)] focus:outline-none"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                                {isOwner && <option value="owner">Owner</option>}
                              </select>
                              {memberToRemove?.id === member.userId ? (
                                <div className="flex items-center gap-1.5 text-micro">
                                  <span className="text-red-600 font-medium">Remove?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member.userId, member.name)}
                                    className="text-red-600 font-semibold hover:underline"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMemberToRemove(null)}
                                    className="text-muted-foreground hover:underline"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  title="Remove member"
                                  onClick={() => setMemberToRemove({ id: member.userId, name: member.name })}
                                  className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                >
                                  <TrashIcon size={14} />
                                </button>
                              )}
                            </>
                          ) : (
                            <span
                              className={`rounded-chrome-xs border px-1.5 py-0.5 text-micro font-medium uppercase ${roleColorBadge(
                                member.role
                              )}`}
                            >
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVITATIONS */}
          {activeTab === "invitations" && canManage && (
            <div className="flex flex-col gap-4">
              <div className="text-label text-muted-foreground">
                Pending invitations to join <strong>{details?.name}</strong>. Share the link directly or let recipients accept via email.
              </div>

              {details?.invitations.length === 0 ? (
                <div className="rounded-chrome-md border border-dashed border-border/80 p-8 text-center text-label text-muted-foreground">
                  No pending invitations. Use the invite form to invite new members.
                </div>
              ) : (
                <div className="divide-y divide-border/60 rounded-chrome-md border border-border/70">
                  {details?.invitations.map((inv) => {
                    const isCopied = copiedToken === inv.token
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3.5 transition-colors hover:bg-accent/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-chrome-sm bg-muted text-muted-foreground">
                            <EmailIcon size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-row font-medium text-foreground">
                                {inv.recipientEmail}
                              </span>
                              <span
                                className={`rounded-chrome-xs border px-1.5 py-0.2 text-[9px] font-medium uppercase ${roleColorBadge(
                                  inv.role
                                )}`}
                              >
                                {inv.role}
                              </span>
                            </div>
                            <span className="text-micro text-muted-foreground">
                              Invited by {inv.inviterName} • Expires{" "}
                              {new Date(inv.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyInviteLink(inv.token)}
                            className="flex h-ctl items-center gap-1 rounded-chrome-sm border border-border bg-background px-2.5 text-micro font-medium text-foreground hover:bg-accent"
                          >
                            {isCopied ? (
                              <>
                                <CheckIcon size={12} weight="bold" className="text-emerald-600" />
                                Copied
                              </>
                            ) : (
                              <>
                                <CopyIcon size={12} />
                                Copy Link
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                            title="Revoke invitation"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATABASES */}
          {activeTab === "databases" && (
            <div className="flex flex-col gap-4">
              <div className="text-label text-muted-foreground">
                Databases associated with this team workspace. All team members can access pages within these databases according to their team permissions.
              </div>

              <div className="flex flex-col gap-2">
                {AVAILABLE_DATABASES.map((db) => {
                  const isAttached = details?.databaseIds.includes(db.id)
                  return (
                    <div
                      key={db.id}
                      className="flex items-center justify-between rounded-chrome-md border border-border/70 p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-chrome-sm bg-muted text-[var(--sq-ink)]">
                          <DatabaseIcon size={16} weight="duotone" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-row font-medium text-foreground">{db.name}</span>
                            {db.badge && (
                              <span className="rounded-chrome-xs border border-border/80 bg-muted px-1.5 py-0.2 text-micro text-muted-foreground">
                                {db.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-micro text-muted-foreground">{db.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAttached ? (
                          <span className="inline-flex items-center gap-1 rounded-chrome-xs bg-emerald-500/10 px-2 py-0.5 text-micro font-medium text-emerald-600">
                            <CheckIcon size={11} weight="bold" />
                            Connected to Team
                          </span>
                        ) : (
                          <span className="text-micro text-muted-foreground">Available</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6">
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-label font-medium text-foreground">
                    Team Name
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-label text-foreground focus:border-[var(--sq-ink)] focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-label font-medium text-foreground">
                    Team URL Slug
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-label text-foreground focus:border-[var(--sq-ink)] focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-label font-medium text-foreground">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    disabled={!canManage}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-label text-foreground focus:border-[var(--sq-ink)] focus:outline-none resize-none disabled:opacity-60"
                  />
                </div>

                {canManage && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSettings || !name.trim()}
                      className="h-ctl rounded-chrome-sm bg-[var(--sq-ink)] px-4 text-label font-medium text-background hover:opacity-90 disabled:opacity-50"
                    >
                      {savingSettings ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>

              {/* Danger Zone: Team Owner Only */}
              {isOwner && (
                <div className="mt-4 rounded-chrome-md border border-red-500/30 bg-red-500/5 p-4">
                  <div className="text-row font-medium text-red-600 dark:text-red-400">
                    Delete Team Workspace
                  </div>
                  <p className="mt-1 text-label text-muted-foreground">
                    Permanently delete this team, its memberships, and workspace associations. Drawings remain in individual databases.
                  </p>
                  <div className="mt-3 flex justify-end">
                    {confirmDeleteTeam ? (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-medium text-xs">Permanently delete team?</span>
                        <button
                          type="button"
                          onClick={handleDeleteTeam}
                          className="h-ctl flex items-center gap-1 rounded-chrome-sm bg-red-600 text-white px-3 text-label font-medium hover:bg-red-700"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTeam(false)}
                          className="h-ctl rounded-chrome-sm px-3 text-label text-muted-foreground hover:bg-accent"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTeam(true)}
                        className="h-ctl flex items-center gap-1.5 rounded-chrome-sm border border-red-500/40 bg-red-500/10 px-3 text-label font-medium text-red-600 hover:bg-red-500/20"
                      >
                        <TrashIcon size={14} />
                        Delete Team
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-5 py-3 text-micro text-muted-foreground">
          <span>Team ID: {details?.id}</span>
          <button
            type="button"
            className="h-ctl rounded-chrome-sm px-3 text-label font-medium text-foreground hover:bg-accent"
            onClick={handleClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
