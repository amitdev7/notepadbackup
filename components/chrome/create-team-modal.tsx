"use client"

// ---------------------------------------------------------------------------
// Create Team Modal
// Dialog to create a new collaborative team workspace.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useSquig } from "@/lib/store"
import { createTeamClient } from "@/lib/teams"
import {
  UsersThree as TeamsIcon,
  X as XIcon,
  Plus as PlusIcon,
} from "@phosphor-icons/react"

export function CreateTeamModal() {
  const open = useSquig((s) => s.createTeamModalOpen)
  const st = useSquig.getState

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleClose = () => {
    setName("")
    setDescription("")
    setError(null)
    setLoading(false)
    st().setCreateTeamModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please provide a team name.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await createTeamClient(name.trim(), description.trim())
      if (res.success && res.team) {
        await st().fetchTeams()
        await st().switchTeam(res.team.id)
        st().setNotice(`Created team "${res.team.name}"`)
        handleClose()
      } else {
        setError(res.error || "Failed to create team.")
      }
    } catch {
      setError("A network error occurred.")
    } finally {
      setLoading(false)
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
              <h2 className="text-title font-medium text-foreground">Create New Team</h2>
              <p className="text-label text-muted-foreground">
                Collaborate with team members on shared databases & pages
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {error && (
            <div className="rounded-chrome-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-label text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-label font-medium text-foreground">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Design Systems, Marketing, Frontend Core"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-label text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-label font-medium text-foreground">
              Description <span className="text-micro text-muted-foreground">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="What does this team work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-chrome-sm border border-border bg-background px-3 py-2 text-label text-foreground placeholder:text-muted-foreground focus:border-[var(--sq-ink)] focus:outline-none resize-none"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-ctl rounded-chrome-sm border border-border bg-background px-3 text-label font-medium text-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="h-ctl flex items-center gap-1.5 rounded-chrome-sm bg-[var(--sq-ink)] px-4 text-label font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              <PlusIcon size={14} weight="bold" />
              {loading ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
