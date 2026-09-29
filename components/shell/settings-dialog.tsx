"use client"

// ---------------------------------------------------------------------------
// Zenithsui Settings Dialog — Mac-style System Preferences window.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react"
import { useShellStore, type SettingsSectionId } from "@/lib/shell-store"
import { useAuthStore } from "@/lib/auth-store"
import { X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// ── Section definitions ───────────────────────────────────────────────────────

interface SectionItem {
  id: SettingsSectionId
  label: string
  description: string
}

const SECTIONS: SectionItem[] = [
  { id: "general", label: "General", description: "App preferences and defaults" },
  { id: "appearance", label: "Appearance", description: "Theme, accent colour and UI density" },
  { id: "canvas", label: "Canvas", description: "Grid, snap, page boundary defaults" },
  { id: "keyboard", label: "Keyboard", description: "Shortcuts and key bindings" },
  { id: "account", label: "Account", description: "Profile, sign in and sign out" },
  { id: "cloud", label: "Cloud", description: "Supabase sync and storage" },
  { id: "sharing", label: "Sharing", description: "Collaboration and access control" },
  { id: "notifications", label: "Notifications", description: "Alerts and activity feed" },
  { id: "student", label: "Student Hub", description: "Academic tools and planner" },
  { id: "wifi", label: "Wi-Fi / LAN", description: "Local network publishing" },
  { id: "storage", label: "Storage", description: "IndexedDB, import and export" },
  { id: "advanced", label: "Advanced", description: "Debug, diagnostics and experimental flags" },
]

// ── SettingsDialog ────────────────────────────────────────────────────────────

export function SettingsDialog() {
  const isOpen = useShellStore((s) => s.settingsOpen)
  const setIsOpen = useShellStore((s) => s.setSettingsOpen)
  const activeSection = useShellStore((s) => s.settingsSection)
  const setActiveSection = useShellStore((s) => s.setSettingsSection)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Settings"
        className={cn(
          "relative flex w-[720px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)]",
          "rounded-2xl border border-stone-200/80 dark:border-stone-800/80",
          "bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl shadow-2xl shadow-stone-900/15 dark:shadow-black/60",
          "overflow-hidden animate-in fade-in zoom-in-95 duration-150 ease-out"
        )}
      >
        {/* ── Sidebar ── */}
        <aside className="w-[200px] shrink-0 border-r border-stone-200/70 dark:border-stone-800/70 bg-stone-50/60 dark:bg-stone-900/40 py-3 px-2 overflow-y-auto">
          <h2 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Settings
          </h2>
          <nav className="space-y-0.5">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeSection === section.id
                    ? "bg-blue-600 text-white"
                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800/70"
                )}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <section className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200/70 dark:border-stone-800/70">
            <div>
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
                {currentSection.label}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                {currentSection.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <SettingsContent section={activeSection} />
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Section content (placeholder-ready) ───────────────────────────────────────

function SettingsContent({ section }: { section: SettingsSectionId }) {
  const user = useAuthStore((s) => s.user)
  const openAuthDialog = useAuthStore((s) => s.openAuthDialog)

  switch (section) {
    case "account":
      return (
        <div className="space-y-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/60">
                <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold">
                  {(user.email ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{user.email}</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Signed in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => useAuthStore.getState().signOut()}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Sign in to enable cloud sync, sharing, and collaboration.
              </p>
              <button
                type="button"
                onClick={() => openAuthDialog("sign-in")}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      )

    default:
      return (
        <div className="flex items-center justify-center h-full text-stone-400 dark:text-stone-500 text-sm">
          <p>Settings for <span className="font-medium">{section}</span> coming soon.</p>
        </div>
      )
  }
}
