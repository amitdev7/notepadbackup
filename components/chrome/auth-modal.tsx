"use client"

// ---------------------------------------------------------------------------
// Zenithsui — User Account & Authentication Modal
//
// Matches the exact napkin sketch styling:
// - Sign In, Sign Up, Profile, Password Change, and Account Recovery
// - Stores session via secure HTTP-only cookies
// - Automatically updates `currentUser` in `useSquig` store
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react"
import { useSquig } from "@/lib/store"
import {
  User as UserIcon,
  SignIn as SignInIcon,
  SignOut as SignOutIcon,
  UserPlus as SignUpIcon,
  Key as KeyIcon,
  ShieldCheck as ShieldIcon,
  X as XIcon,
  Check as CheckIcon,
  Copy as CopyIcon,
  ArrowsClockwise as RefreshIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { AVATAR_COLORS, type ClientSafeUser } from "@/lib/auth-types"

type AuthTab = "profile" | "login" | "signup" | "recover" | "password"

export function AuthModal() {
  const open = useSquig((s) => s.authModalOpen)
  const setAuthModalOpen = useSquig((s) => s.setAuthModalOpen)
  const currentUser = useSquig((s) => s.currentUser)
  const setCurrentUser = useSquig((s) => s.setCurrentUser)
  const setNotice = useSquig((s) => s.setNotice)

  const [tab, setTab] = useState<AuthTab>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0])
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null)
  const [copiedCodes, setCopiedCodes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch session on initial mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
          setSelectedColor(data.user.avatarColor || AVATAR_COLORS[0])
        }
      })
      .catch(() => {})
  }, [setCurrentUser])

  // Sync tab with current auth state
  useEffect(() => {
    if (currentUser) {
      setTab("profile")
      setSelectedColor(currentUser.avatarColor || AVATAR_COLORS[0])
    } else {
      setTab("login")
    }
  }, [currentUser, open])

  if (!open) return null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Login failed")
        return
      }
      setCurrentUser(data.user)
      setNotice(`Welcome back, ${data.user.displayName}!`)
      setTab("profile")
    } catch {
      setError("Network error connecting to auth service")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Registration failed")
        return
      }
      setCurrentUser(data.user)
      setNewRecoveryCodes(data.recoveryCodes || [])
      setNotice(`Account created! Welcome, ${data.user.displayName}.`)
    } catch {
      setError("Network error creating account")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch("/api/auth/session", { method: "POST" })
      setCurrentUser(null)
      setNotice("Logged out successfully.")
      setTab("login")
    } catch {
      setNotice("Failed to log out cleanly")
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recoveryCode, newPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Account recovery failed")
        return
      }
      setCurrentUser(data.user)
      setNotice("Account recovered successfully! Password updated.")
      setTab("profile")
    } catch {
      setError("Network error recovering account")
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Password change failed")
        return
      }
      setNotice("Password changed successfully!")
      setTab("profile")
      setOldPassword("")
      setNewPassword("")
    } catch {
      setError("Network error changing password")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (color: string) => {
    setSelectedColor(color)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarColor: color }),
      })
      const data = await res.json()
      if (data.success && data.user) {
        setCurrentUser(data.user)
      }
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onPointerDown={() => setAuthModalOpen(false)}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--sq-font)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-full text-white font-bold text-sm"
              style={{
                backgroundColor: currentUser?.avatarColor || selectedColor,
              }}
            >
              {currentUser ? currentUser.displayName[0].toUpperCase() : <UserIcon size={16} />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {currentUser ? currentUser.displayName : "Zenithsui Account"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentUser ? `@${currentUser.username}` : "Sign in to sync your boards & teams"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setAuthModalOpen(false)}
            aria-label="Close"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Recovery Codes Banner if just signed up */}
        {newRecoveryCodes && (
          <div className="border-b bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center justify-between font-bold mb-1">
              <span>Save your emergency recovery codes:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newRecoveryCodes.join("\n"))
                  setCopiedCodes(true)
                  setTimeout(() => setCopiedCodes(false), 2000)
                }}
                className="flex items-center gap-1 underline"
              >
                {copiedCodes ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                {copiedCodes ? "Copied" : "Copy all"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px] mt-2">
              {newRecoveryCodes.map((c) => (
                <div key={c} className="bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                  {c}
                </div>
              ))}
            </div>
            <button
              onClick={() => setNewRecoveryCodes(null)}
              className="mt-2.5 text-[11px] underline opacity-80 hover:opacity-100"
            >
              I have safely stored these codes
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border text-xs px-5">
          {currentUser ? (
            <>
              <button
                onClick={() => setTab("profile")}
                className={`py-2 px-3 border-b-2 font-medium ${
                  tab === "profile"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setTab("password")}
                className={`py-2 px-3 border-b-2 font-medium ${
                  tab === "password"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Security
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setTab("login")
                  setError(null)
                }}
                className={`py-2 px-3 border-b-2 font-medium ${
                  tab === "login"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setTab("signup")
                  setError(null)
                }}
                className={`py-2 px-3 border-b-2 font-medium ${
                  tab === "signup"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setTab("recover")
                  setError(null)
                }}
                className={`py-2 px-3 border-b-2 font-medium ${
                  tab === "recover"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Recover
              </button>
            </>
          )}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto max-h-[65vh]">
          {error && (
            <div className="mb-4 rounded border border-red-300 bg-red-50 dark:bg-red-950/50 p-2.5 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Profile Tab */}
          {tab === "profile" && currentUser && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Avatar Color
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleUpdateProfile(c)}
                      className="size-6 rounded-full border border-border flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && <CheckIcon size={12} color="#ffffff" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-mono font-medium">@{currentUser.username}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Display Name</span>
                  <span className="font-medium">{currentUser.displayName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Role</span>
                  <span className="capitalize font-medium">{currentUser.role}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Backup Codes</span>
                  <span>{currentUser.recoveryCodesLeft} remaining</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full text-xs text-red-600 dark:text-red-400 gap-1.5"
                >
                  <SignOutIcon size={14} />
                  <span>Log Out</span>
                </Button>
              </div>
            </div>
          )}

          {/* Login Tab */}
          {tab === "login" && !currentUser && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. nezuko"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs gap-1.5 mt-2"
              >
                <SignInIcon size={14} />
                <span>{loading ? "Signing in…" : "Sign In"}</span>
              </Button>
            </form>
          )}

          {/* Signup Tab */}
          {tab === "signup" && !currentUser && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. AlexChen"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex (Design Lead)"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs gap-1.5 mt-2"
              >
                <SignUpIcon size={14} />
                <span>{loading ? "Creating…" : "Create Account & Workspace"}</span>
              </Button>
            </form>
          )}

          {/* Account Recovery Tab */}
          {tab === "recover" && !currentUser && (
            <form onSubmit={handleRecover} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter your username and one of your 6 backup recovery codes to regain access and reset your password.
              </p>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. nezuko"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Emergency Recovery Code
                </label>
                <input
                  type="text"
                  required
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="zen-xxxx-xxxx"
                  className="w-full font-mono rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs gap-1.5 mt-2"
              >
                <ShieldIcon size={14} />
                <span>{loading ? "Recovering…" : "Reset & Log In"}</span>
              </Button>
            </form>
          )}

          {/* Password Change Tab */}
          {tab === "password" && currentUser && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs gap-1.5 mt-2"
              >
                <KeyIcon size={14} />
                <span>{loading ? "Updating…" : "Update Password"}</span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
