"use client"

import { useAuthStore } from "@/lib/auth-store"
import { useSquig } from "@/lib/store"
import { Buildings, CaretDown, Plus } from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export function WorkspaceSwitcher() {
  const { workspace, state } = useAuthStore()

  if (state !== "authenticated" && state !== "offline-authenticated") {
    return null
  }

  const workspaceName = workspace?.name || "Personal Workspace"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" />}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors select-none">
          <Buildings size={14} />
          <span className="max-w-[120px] truncate font-medium">{workspaceName}</span>
          <CaretDown size={10} className="text-muted-foreground/60" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 text-xs font-sans">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer font-medium">
          {workspaceName} (Personal)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            useSquig.getState().setNotice("Team workspace invitations will be available soon.")
          }}
          className="cursor-pointer gap-2 text-muted-foreground"
        >
          <Plus size={12} />
          Create Team Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

