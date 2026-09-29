"use client"

import { create } from "zustand"
import type { User } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "./supabase/client"
import type { ProfileRecord, WorkspaceRecord } from "./db/types"

export type AuthState = "loading" | "authenticated" | "unauthenticated" | "offline-authenticated"

const AUTH_CACHE_KEY = "zenithsui:auth:cache:v1"

interface CachedAuth {
  user: {
    id: string
    email: string
    user_metadata?: Record<string, unknown>
  } | null
  profile: ProfileRecord | null
  workspace: WorkspaceRecord | null
  cachedAt: number
}

interface AuthStore {
  state: AuthState
  user: User | null
  profile: ProfileRecord | null
  workspace: WorkspaceRecord | null
  isAuthDialogOpen: boolean
  authDialogView: "sign-in" | "sign-up" | "reset-password"

  // Actions
  initialize: () => Promise<void>
  openAuthDialog: (view?: "sign-in" | "sign-up" | "reset-password") => void
  closeAuthDialog: () => void
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

function readCachedAuth(): CachedAuth | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedAuth
  } catch {
    return null
  }
}

function writeCachedAuth(data: CachedAuth | null) {
  if (typeof window === "undefined") return
  try {
    if (!data) {
      localStorage.removeItem(AUTH_CACHE_KEY)
    } else {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data))
    }
  } catch {
    // Ignore quota or private browsing errors
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: "loading",
  user: null,
  profile: null,
  workspace: null,
  isAuthDialogOpen: false,
  authDialogView: "sign-in",

  openAuthDialog: (view = "sign-in") => {
    set({ isAuthDialogOpen: true, authDialogView: view })
  },

  closeAuthDialog: () => {
    set({ isAuthDialogOpen: false })
  },

  initialize: async () => {
    // 1. Read cached auth to populate instantly without blocking UI
    const cached = readCachedAuth()
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true

    if (cached?.user) {
      set({
        state: isOnline ? "authenticated" : "offline-authenticated",
        user: cached.user as unknown as User,
        profile: cached.profile,
        workspace: cached.workspace,
      })
    }

    // 2. Fetch fresh session from Supabase
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        if (!isOnline && cached?.user) {
          set({ state: "offline-authenticated" })
          return
        }
        writeCachedAuth(null)
        set({ state: "unauthenticated", user: null, profile: null, workspace: null })
        return
      }

      const user = session.user

      // Fetch user profile and personal workspace
      const [profileRes, workspaceRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("workspaces").select("*").eq("owner_id", user.id).maybeSingle(),
      ])

      const profile = (profileRes.data as ProfileRecord | null) || null
      const workspace = (workspaceRes.data as WorkspaceRecord | null) || null

      writeCachedAuth({
        user: { id: user.id, email: user.email || "", user_metadata: user.user_metadata },
        profile,
        workspace,
        cachedAt: Date.now(),
      })

      set({
        state: "authenticated",
        user,
        profile,
        workspace,
      })

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === "SIGNED_OUT" || !newSession) {
          writeCachedAuth(null)
          set({ state: "unauthenticated", user: null, profile: null, workspace: null })
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const freshUser = newSession.user
          set({ state: "authenticated", user: freshUser })
        }
      })
    } catch {
      // Network error or offline
      if (cached?.user) {
        set({ state: "offline-authenticated" })
      } else {
        set({ state: "unauthenticated" })
      }
    }
  },

  signOut: async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // Ignore network errors on sign out
    } finally {
      writeCachedAuth(null)
      set({
        state: "unauthenticated",
        user: null,
        profile: null,
        workspace: null,
        isAuthDialogOpen: false,
      })
    }
  },

  refreshSession: async () => {
    await get().initialize()
  },
}))

