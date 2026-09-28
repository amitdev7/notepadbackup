"use client"

// ---------------------------------------------------------------------------
// Team Switcher Component
// Enables switching between Teams and Personal workspaces, displaying
// member roles, and triggering Team Settings & Create Team modals.
// Styled seamlessly with Zenithsui UI tokens.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { useSquig } from "@/lib/store"
import {
  UsersThree as TeamsIcon,
  User as UserIcon,
  CaretDown as CaretDownIcon,
  Check as CheckIcon,
  Gear as GearIcon,
  Plus as PlusIcon,
  ShieldCheck as ShieldIcon,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TeamSwitcher() {
  const teams = useSquig((s) => s.teams)
  const currentTeamId = useSquig((s) => s.currentTeamId)
  const currentTeamDetails = useSquig((s) => s.currentTeamDetails)
  const st = useSquig.getState

  const activeTeam = teams.find((t) => t.id === currentTeamId) || null
  const currentRole = activeTeam?.role || currentTeamDetails?.currentUserRole || (currentTeamId ? "member" : null)

  const handleSelectTeam = async (teamId: string | null) => {
    await st().switchTeam(teamId)
  }

  const roleBadge = (role: string) => {
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
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Workspace & Team Context"
        className="flex items-center gap-1.5 rounded-chrome-xs border border-border/80 bg-background/80 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {activeTeam ? (
            <TeamsIcon size={13} weight="duotone" className="text-[var(--sq-ink)]" />
          ) : (
            <UserIcon size={13} weight="duotone" className="text-muted-foreground" />
          )}
          <span className="max-w-[120px] truncate text-xs font-medium">
            {activeTeam ? activeTeam.name : "Personal"}
          </span>
          {currentRole && activeTeam && (
            <span
              className={`rounded-chrome-xs border px-1 py-0.2 text-[10px] font-medium uppercase tracking-wider ${roleBadge(
                currentRole
              )}`}
            >
              {currentRole}
            </span>
          )}
        </div>
        <CaretDownIcon size={10} weight="bold" className="text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        <div className="px-2.5 py-1.5 text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Workspaces & Teams
        </div>

        {/* Personal Workspace */}
        <DropdownMenuItem onClick={() => handleSelectTeam(null)}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon size={14} className="text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-row font-medium">Personal Workspace</span>
                <span className="text-micro text-muted-foreground">Local & private drawings</span>
              </div>
            </div>
            {currentTeamId === null && <CheckIcon size={14} weight="bold" className="text-[var(--sq-ink)]" />}
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2.5 py-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Teams ({teams.length})
        </div>

        {teams.map((t) => {
          const isCurrent = currentTeamId === t.id
          return (
            <DropdownMenuItem key={t.id} onClick={() => handleSelectTeam(t.id)}>
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <TeamsIcon size={14} className="shrink-0 text-[var(--sq-ink)]" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-row font-medium">{t.name}</span>
                    <span className="text-micro text-muted-foreground">
                      {t.memberCount} member{t.memberCount === 1 ? "" : "s"} • {t.databaseCount} db
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-chrome-xs border px-1 py-0.2 text-[9px] font-medium uppercase ${roleBadge(
                      t.role
                    )}`}
                  >
                    {t.role}
                  </span>
                  {isCurrent && <CheckIcon size={14} weight="bold" className="text-[var(--sq-ink)]" />}
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        {/* Manage current team if selected */}
        {activeTeam && (
          <DropdownMenuItem onClick={() => st().setTeamSettingsModalOpen(true)}>
            <span className="flex items-center gap-2">
              <GearIcon size={14} className="text-muted-foreground" />
              Team Settings & Members
            </span>
          </DropdownMenuItem>
        )}

        {/* Create new team */}
        <DropdownMenuItem onClick={() => st().setCreateTeamModalOpen(true)}>
          <span className="flex items-center gap-2 font-medium text-[var(--sq-ink)]">
            <PlusIcon size={14} weight="bold" />
            Create new team…
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
