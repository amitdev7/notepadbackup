"use client"

// ---------------------------------------------------------------------------
// Shell Store — Zustand store for UI navigation state and application preferences.
// Decoupled from canvas document undo/redo history.
// Local-first persistence via localStorage with SSR safety.
// ---------------------------------------------------------------------------

import { create } from "zustand"

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "laser"
  | "drawing"
  | "text"
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

export type ThemeMode = "light" | "dark" | "system" | "sepia" | "midnight"
export type UIDensity = "comfortable" | "compact"
export type UIRadius = "default" | "sharp" | "pill"
export type UIBlur = "none" | "subtle" | "strong"
export type AnimationMode = "full" | "reduced"
export type PanelStyle = "default" | "minimal"
export type StartPage = "canvas" | "dashboard"
export type LibraryFilterType = "all" | "components" | "blocks" | "templates"

export interface LaserSettings {
  color: string
  durationMs: number
  width: number
  glowIntensity: "none" | "subtle" | "vibrant" | "neon"
  pulseDot: boolean
}

export const DEFAULT_LASER_SETTINGS: LaserSettings = {
  color: "#EF4444",
  durationMs: 850,
  width: 6,
  glowIntensity: "vibrant",
  pulseDot: true,
}

export interface DrawSettings {
  colorMode: "theme" | "custom"
  customColor: string
  strokeWeight: "light" | "regular" | "heavy"
  dashed: boolean
  smoothing: "none" | "medium" | "high"
  simulatePressure: boolean
  autoSelectAfterDraw: boolean
}

export const DEFAULT_DRAW_SETTINGS: DrawSettings = {
  colorMode: "theme",
  customColor: "#2563EB",
  strokeWeight: "regular",
  dashed: false,
  smoothing: "medium",
  simulatePressure: false,
  autoSelectAfterDraw: false,
}

export interface TextSettings {
  colorMode: "theme" | "custom"
  customColor: string
  fontSize: number
  fontFamily: "hand" | "sans" | "serif" | "mono"
  align: "left" | "center" | "right"
  bold: boolean
  italic: boolean
}

export const DEFAULT_TEXT_SETTINGS: TextSettings = {
  colorMode: "theme",
  customColor: "#18181B",
  fontSize: 18,
  fontFamily: "hand",
  align: "left",
  bold: false,
  italic: false,
}

export interface DockControlsVisibility {
  // Drawing & Creation Tools
  toolSelect: boolean
  toolHand: boolean
  toolShape: boolean
  toolDraw: boolean
  toolEraser: boolean
  toolArrow: boolean
  toolText: boolean
  toolSticky: boolean
  toolFrame: boolean
  toolLaser: boolean
  toolLibrary: boolean

  // Quick Action Buttons
  actionSearch: boolean
  actionStats: boolean
  actionPage: boolean
  actionSettings: boolean

  // Dock Modules
  brandMenu: boolean
  zoomControls: boolean

  // Brand Menu Items
  menuNewCanvas: boolean
  menuOpenRecent: boolean
  menuShare: boolean
  menuPublishWifi: boolean
  menuVersionHistory: boolean
  menuUndo: boolean
  menuRedo: boolean
  menuSettings: boolean
  menuResetView: boolean
  menuClearCanvas: boolean
  menuGithub: boolean
}

export const DEFAULT_DOCK_CONTROLS: DockControlsVisibility = {
  toolSelect: true,
  toolHand: true,
  toolShape: true,
  toolDraw: true,
  toolEraser: true,
  toolArrow: true,
  toolText: true,
  toolSticky: false,   // Hidden by default
  toolFrame: false,    // Hidden by default
  toolLaser: true,
  toolLibrary: true,

  actionSearch: false, // Hidden by default
  actionStats: false,  // Hidden by default
  actionPage: true,
  actionSettings: true,

  brandMenu: true,
  zoomControls: true,

  menuNewCanvas: true,
  menuOpenRecent: true,
  menuShare: true,
  menuPublishWifi: true,
  menuVersionHistory: true,
  menuUndo: true,
  menuRedo: true,
  menuSettings: true,
  menuResetView: true,
  menuClearCanvas: true,
  menuGithub: true,
}

export interface ShellPreferences {
  themeMode: ThemeMode
  uiDensity: UIDensity
  uiAccent: string
  customAccentColor?: string
  uiRadius?: UIRadius
  uiBlur?: UIBlur
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
  laserSettings: LaserSettings
  drawSettings: DrawSettings
  textSettings: TextSettings
  dockControls: DockControlsVisibility
}

const DEFAULT_PREFERENCES: ShellPreferences = {
  themeMode: "system",
  uiDensity: "comfortable",
  uiAccent: "blue",
  customAccentColor: "#2563EB",
  uiRadius: "default",
  uiBlur: "subtle",
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
  laserSettings: DEFAULT_LASER_SETTINGS,
  drawSettings: DEFAULT_DRAW_SETTINGS,
  textSettings: DEFAULT_TEXT_SETTINGS,
  dockControls: DEFAULT_DOCK_CONTROLS,
}

function loadInitialPreferences(): ShellPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem("zenithsui:shell_prefs")
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        laserSettings: {
          ...DEFAULT_LASER_SETTINGS,
          ...(parsed.laserSettings || {}),
        },
        drawSettings: {
          ...DEFAULT_DRAW_SETTINGS,
          ...(parsed.drawSettings || {}),
        },
        textSettings: {
          ...DEFAULT_TEXT_SETTINGS,
          ...(parsed.textSettings || {}),
        },
        dockControls: {
          ...DEFAULT_DOCK_CONTROLS,
          ...(parsed.dockControls || {}),
        },
      }
    }
  } catch { }
  return DEFAULT_PREFERENCES
}

function savePreferences(prefs: ShellPreferences) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("zenithsui:shell_prefs", JSON.stringify(prefs))
  } catch { }
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
  updateLaserSettings: (updates: Partial<LaserSettings>) => void
  updateDrawSettings: (updates: Partial<DrawSettings>) => void
  updateTextSettings: (updates: Partial<TextSettings>) => void
  updateDockControl: (key: keyof DockControlsVisibility, visible: boolean) => void
  setAllDockControls: (visible: boolean) => void
  resetDockControls: () => void
  resetPreferences: () => void
}

let mediaQueryListenerAttached = false

export function syncMotionToDOM(mode: AnimationMode = "full") {
  if (typeof window === "undefined" || typeof document === "undefined") return
  if (mode === "reduced") {
    document.documentElement.classList.add("reduce-motion")
  } else {
    document.documentElement.classList.remove("reduce-motion")
  }
}

export function applyAccentToDOM(accentId: string, customColor?: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return
  const root = document.documentElement
  let color = customColor || "#2563EB"
  const ACCENT_MAP: Record<string, string> = {
    blue: "#2563EB",
    indigo: "#4F46E5",
    purple: "#9333EA",
    violet: "#7C3AED",
    cyan: "#0D9488",
    emerald: "#059669",
    lime: "#65A30D",
    amber: "#D97706",
    orange: "#EA580C",
    rose: "#E11D48",
    pink: "#DB2777",
    neutral: "#18181B",
  }
  if (accentId !== "custom" && ACCENT_MAP[accentId]) {
    color = ACCENT_MAP[accentId]
  }
  root.style.setProperty("--ui-accent", color)
}

export function syncThemeToDOM(mode: ThemeMode = "system") {
  if (typeof window === "undefined" || typeof document === "undefined") return

  const root = document.documentElement
  root.classList.remove("dark", "theme-sepia", "theme-midnight")

  if (mode === "sepia") {
    root.classList.add("theme-sepia")
    root.style.colorScheme = "light"
  } else if (mode === "midnight") {
    root.classList.add("dark", "theme-midnight")
    root.style.colorScheme = "dark"
  } else {
    const isDark =
      mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

    if (isDark) {
      root.classList.add("dark")
      root.style.colorScheme = "dark"
    } else {
      root.style.colorScheme = "light"
    }
  }

  try {
    const prefs = useShellStore.getState()?.preferences
    if (prefs) {
      applyAccentToDOM(prefs.uiAccent, prefs.customAccentColor)
    }
  } catch { }

  if (mode === "system" && !mediaQueryListenerAttached) {
    mediaQueryListenerAttached = true
    try {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => {
        const currentMode = useShellStore.getState().preferences.themeMode
        if (currentMode === "system") {
          if (e.matches) {
            root.classList.add("dark")
            root.style.colorScheme = "dark"
          } else {
            root.classList.remove("dark")
            root.style.colorScheme = "light"
          }
        }
      }
      mql.addEventListener("change", handler)
    } catch { }
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
      if (updates.uiAccent !== undefined || updates.customAccentColor !== undefined) {
        applyAccentToDOM(next.uiAccent, next.customAccentColor)
      }
      if (updates.animationMode !== undefined) {
        syncMotionToDOM(updates.animationMode)
      }
      return { preferences: next }
    })
  },

  updateLaserSettings: (updates) => {
    set((state) => {
      const nextLaser = { ...state.preferences.laserSettings, ...updates }
      const next = { ...state.preferences, laserSettings: nextLaser }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updateDrawSettings: (updates) => {
    set((state) => {
      const nextDraw = { ...state.preferences.drawSettings, ...updates }
      const next = { ...state.preferences, drawSettings: nextDraw }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updateTextSettings: (updates) => {
    set((state) => {
      const nextText = { ...state.preferences.textSettings, ...updates }
      const next = { ...state.preferences, textSettings: nextText }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updateDockControl: (key, visible) => {
    set((state) => {
      const nextDockControls = {
        ...state.preferences.dockControls,
        [key]: visible,
      }
      const next = {
        ...state.preferences,
        dockControls: nextDockControls,
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setAllDockControls: (visible) => {
    set((state) => {
      const nextDockControls = { ...state.preferences.dockControls }
      for (const k of Object.keys(nextDockControls) as (keyof DockControlsVisibility)[]) {
        nextDockControls[k] = visible
      }
      const next = {
        ...state.preferences,
        dockControls: nextDockControls,
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  resetDockControls: () => {
    set((state) => {
      const next = {
        ...state.preferences,
        dockControls: DEFAULT_DOCK_CONTROLS,
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  resetPreferences: () => {
    set({ preferences: DEFAULT_PREFERENCES })
    savePreferences(DEFAULT_PREFERENCES)
    syncThemeToDOM(DEFAULT_PREFERENCES.themeMode)
    applyAccentToDOM(DEFAULT_PREFERENCES.uiAccent, DEFAULT_PREFERENCES.customAccentColor)
    syncMotionToDOM(DEFAULT_PREFERENCES.animationMode)
  },
}))
