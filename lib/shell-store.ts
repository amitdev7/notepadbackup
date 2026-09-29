"use client"

// ---------------------------------------------------------------------------
// Shell Store — Zustand store for UI navigation state.
// Completely decoupled from canvas document undo/redo.
// ---------------------------------------------------------------------------

import { create } from "zustand"

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "canvas"
  | "keyboard"
  | "account"
  | "cloud"
  | "sharing"
  | "notifications"
  | "student"
  | "wifi"
  | "storage"
  | "advanced"

interface ShellState {
  activeSurface: "canvas" | "student" | "settings"
  pagePopoverOpen: boolean
  settingsOpen: boolean
  settingsSection: SettingsSectionId
  toolsDockOpen: boolean
  brandMenuOpen: boolean

  setActiveSurface: (s: "canvas" | "student" | "settings") => void
  setPagePopoverOpen: (open: boolean) => void
  togglePagePopover: () => void
  setSettingsOpen: (open: boolean) => void
  setSettingsSection: (section: SettingsSectionId) => void
  setToolsDockOpen: (open: boolean) => void
  setBrandMenuOpen: (open: boolean) => void
}

export const useShellStore = create<ShellState>((set) => ({
  activeSurface: "canvas",
  pagePopoverOpen: false,
  settingsOpen: false,
  settingsSection: "general",
  toolsDockOpen: false,
  brandMenuOpen: false,

  setActiveSurface: (activeSurface) => set({ activeSurface }),
  setPagePopoverOpen: (pagePopoverOpen) => set({ pagePopoverOpen }),
  togglePagePopover: () => set((s) => ({ pagePopoverOpen: !s.pagePopoverOpen })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSettingsSection: (settingsSection) => set({ settingsSection }),
  setToolsDockOpen: (toolsDockOpen) => set({ toolsDockOpen }),
  setBrandMenuOpen: (brandMenuOpen) => set({ brandMenuOpen }),
}))
