"use client"

// ---------------------------------------------------------------------------
// Shell Store — Zustand store for UI navigation state and application preferences.
// Completely decoupled from canvas document undo/redo history.
// Local-first persistence via localStorage with SSR safety.
// ---------------------------------------------------------------------------

import { create } from "zustand"

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "canvas"
  | "page"
  | "keyboard"
  | "storage"
  | "cloud"
  | "sharing"
  | "notifications"
  | "wifi"
  | "privacy"
  | "accessibility"
  | "advanced"
  | "about"
  | "future"

export type ThemeMode = "light" | "dark" | "system"
export type UIDensity = "comfortable" | "compact"
export type AnimationMode = "full" | "reduced"
export type PanelStyle = "default" | "minimal"
export type StartPage = "canvas" | "dashboard"
export type LibraryFilterType = "all" | "components" | "blocks" | "templates"

export interface ShellPreferences {
  themeMode: ThemeMode
  uiDensity: UIDensity
  uiAccent: string
  animationMode: AnimationMode
  panelStyle: PanelStyle
  startPage: StartPage
  confirmDestructive: boolean
  showCanvasUI: boolean
  showDock: boolean
  showZoomControls: boolean
  showStatusIndicators: boolean
  highContrast: boolean
  largeText: boolean
  screenReaderHints: boolean
}

const DEFAULT_PREFERENCES: ShellPreferences = {
  themeMode: "system",
  uiDensity: "comfortable",
  uiAccent: "blue",
  animationMode: "full",
  panelStyle: "default",
  startPage: "canvas",
  confirmDestructive: true,
  showCanvasUI: true,
  showDock: true,
  showZoomControls: true,
  showStatusIndicators: true,
  highContrast: false,
  largeText: false,
  screenReaderHints: false,
}

function loadInitialPreferences(): ShellPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem("zenithsui:shell_prefs")
    if (raw) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
    }
  } catch {}
  return DEFAULT_PREFERENCES
}

function savePreferences(prefs: ShellPreferences) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("zenithsui:shell_prefs", JSON.stringify(prefs))
  } catch {}
}

interface ShellState {
  activeSurface: "canvas" | "settings"
  pagePopoverOpen: boolean
  settingsOpen: boolean
  settingsSection: SettingsSectionId
  toolsDockOpen: boolean
  brandMenuOpen: boolean

  // Unified Library Panel state
  libraryOpen: boolean
  librarySearch: string
  libraryFilter: LibraryFilterType
  libraryCategory: string

  // Global search modal
  globalSearchOpen: boolean

  // App UI Preferences
  preferences: ShellPreferences

  setActiveSurface: (s: "canvas" | "settings") => void
  setPagePopoverOpen: (open: boolean) => void
  togglePagePopover: () => void
  setSettingsOpen: (open: boolean) => void
  setSettingsSection: (section: SettingsSectionId) => void
  setToolsDockOpen: (open: boolean) => void
  setBrandMenuOpen: (open: boolean) => void
  setLibraryOpen: (open: boolean) => void
  toggleLibraryOpen: () => void
  setLibrarySearch: (q: string) => void
  setLibraryFilter: (f: LibraryFilterType) => void
  setLibraryCategory: (c: string) => void
  setGlobalSearchOpen: (open: boolean) => void
  updatePreferences: (updates: Partial<ShellPreferences>) => void
  resetPreferences: () => void
}

let mediaQueryListenerAttached = false

export function syncThemeToDOM(mode: ThemeMode = "system") {
  if (typeof window === "undefined" || typeof document === "undefined") return

  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  if (isDark) {
    document.documentElement.classList.add("dark")
    document.documentElement.style.colorScheme = "dark"
  } else {
    document.documentElement.classList.remove("dark")
    document.documentElement.style.colorScheme = "light"
  }

  // Attach system listener if mode is 'system' and not already attached
  if (mode === "system" && !mediaQueryListenerAttached) {
    mediaQueryListenerAttached = true
    try {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => {
        const currentMode = useShellStore.getState().preferences.themeMode
        if (currentMode === "system") {
          if (e.matches) {
            document.documentElement.classList.add("dark")
            document.documentElement.style.colorScheme = "dark"
          } else {
            document.documentElement.classList.remove("dark")
            document.documentElement.style.colorScheme = "light"
          }
        }
      }
      mql.addEventListener("change", handler)
    } catch {}
  }
}

export const useShellStore = create<ShellState>((set, get) => ({
  activeSurface: "canvas",
  pagePopoverOpen: false,
  settingsOpen: false,
  settingsSection: "general",
  toolsDockOpen: false,
  brandMenuOpen: false,

  libraryOpen: false,
  librarySearch: "",
  libraryFilter: "all",
  libraryCategory: "All",

  globalSearchOpen: false,

  preferences: loadInitialPreferences(),

  setActiveSurface: (activeSurface) => set({ activeSurface }),
  setPagePopoverOpen: (pagePopoverOpen) => set({ pagePopoverOpen }),
  togglePagePopover: () => set((s) => ({ pagePopoverOpen: !s.pagePopoverOpen })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSettingsSection: (settingsSection) => set({ settingsSection }),
  setToolsDockOpen: (toolsDockOpen) => set({ toolsDockOpen }),
  setBrandMenuOpen: (brandMenuOpen) => set({ brandMenuOpen }),
  setLibraryOpen: (libraryOpen) => set({ libraryOpen }),
  toggleLibraryOpen: () => set((s) => ({ libraryOpen: !s.libraryOpen })),
  setLibrarySearch: (librarySearch) => set({ librarySearch }),
  setLibraryFilter: (libraryFilter) => set({ libraryFilter }),
  setLibraryCategory: (libraryCategory) => set({ libraryCategory }),
  setGlobalSearchOpen: (globalSearchOpen) => set({ globalSearchOpen }),

  updatePreferences: (updates) => {
    set((state) => {
      const next = { ...state.preferences, ...updates }
      savePreferences(next)
      if (updates.themeMode !== undefined) {
        syncThemeToDOM(updates.themeMode)
      }
      return { preferences: next }
    })
  },

  resetPreferences: () => {
    set({ preferences: DEFAULT_PREFERENCES })
    savePreferences(DEFAULT_PREFERENCES)
    syncThemeToDOM(DEFAULT_PREFERENCES.themeMode)
  },
}))
