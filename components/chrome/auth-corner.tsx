"use client"

import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { User, SignOut, CloudCheck, WifiSlash } from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export function AuthCorner() {
  const { state, user, profile, workspace, openAuthDialog, signOut } = useAuthStore()

  if (state === "loading") {
    return (
      <div className="h-7 w-7 rounded-full bg-muted/30 animate-pulse border border-border/50" />
    )
  }

  if (state === "unauthenticated") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openAuthDialog("sign-in")}
        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground font-sans"
      >
        Sign in
      </Button>
    )
  }

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User"
  const isOffline = state === "offline-authenticated"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" />}>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-border/60 bg-background/80 hover:bg-muted/50 transition-colors cursor-pointer select-none"
          title={isOffline ? "Offline authenticated" : "Connected to Zenithsui Cloud"}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-4 h-4 rounded-full object-cover"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px]">
              <User size={10} />
            </div>
          )}
          <span className="max-w-[100px] truncate font-sans text-xs">{displayName}</span>
          {isOffline ? (
            <WifiSlash size={12} className="text-amber-500" />
          ) : (
            <CloudCheck size={12} className="text-muted-foreground" />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 text-xs font-sans">
        <DropdownMenuLabel className="font-normal text-muted-foreground text-[11px] truncate">
          {user?.email}
        </DropdownMenuLabel>
        {workspace && (
          <DropdownMenuLabel className="font-normal text-muted-foreground text-[10px] truncate">
            Workspace: {workspace.name}
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/dashboard"
            }
          }}
          className="cursor-pointer"
        >
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer gap-2">
          <SignOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

