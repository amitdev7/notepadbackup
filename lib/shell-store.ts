"use client"

// ---------------------------------------------------------------------------
// Shell Store — Zustand store for UI navigation state and application preferences.
// Decoupled from canvas document undo/redo history.
// Local-first persistence via localStorage with SSR safety.
// ---------------------------------------------------------------------------

import { create } from "zustand"
import { type ClockPreferences, DEFAULT_CLOCK_PREFERENCES } from "@/lib/time/types"
import { type ShellLiquidGlassPreferences, DEFAULT_LIQUID_GLASS_PREFERENCES } from "@/lib/liquidglass/types"
import { type SupportedLanguage } from "@/lib/i18n"

export type SettingsSectionId =
  | "general"
  | "visibility"
  | "media"
  | "time"
  | "appearance"
  | "laser"
  | "drawing"
  | "text"
  | "canvas"
  | "page"
  | "performance"
  | "keyboard"
  | "storage"
  | "cloud"
  | "sharing"
  | "notifications"
  | "wifi"
  | "privacy"
  | "accessibility"
  | "temporary"
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

export type StorageMode = "hybrid" | "cloud" | "local"

export interface DatabaseSettings {
  enabled: boolean
  storageMode: StorageMode
  autoSync: boolean
  syncIntervalMs: number
  allowTelemetry: boolean
}

export interface BackupSettings {
  enabled: boolean
  frequencyMinutes: number
  maxSnapshotsPerDoc: number
  autoBackupOnMilestone: boolean
}

export const DEFAULT_DATABASE_SETTINGS: DatabaseSettings = {
  enabled: true,
  storageMode: "hybrid",
  autoSync: true,
  syncIntervalMs: 5000,
  allowTelemetry: false,
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  enabled: true,
  frequencyMinutes: 5,
  maxSnapshotsPerDoc: 10,
  autoBackupOnMilestone: true,
}

export type PerformanceProfile = "balanced" | "quality" | "performance"
export type CullingBufferMode = "aggressive" | "standard" | "relaxed" | "off"

export interface PerformanceSettings {
  profile: PerformanceProfile
  viewportCulling: boolean
  cullingBuffer: CullingBufferMode
  levelOfDetail: boolean
  adaptiveLevelOfDetail: boolean
  hardwareAcceleration: boolean
  hardwareCompositing: boolean
  workerOffload: boolean
  useWebWorkers: boolean
  telemetryHud: boolean
  showFpsHud: boolean
}

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  profile: "balanced",
  viewportCulling: true,
  cullingBuffer: "standard",
  levelOfDetail: true,
  adaptiveLevelOfDetail: true,
  hardwareAcceleration: true,
  hardwareCompositing: true,
  workerOffload: true,
  useWebWorkers: true,
  telemetryHud: false,
  showFpsHud: false,
}

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
  underline?: boolean
}

export const DEFAULT_TEXT_SETTINGS: TextSettings = {
  colorMode: "theme",
  customColor: "#18181B",
  fontSize: 18,
  fontFamily: "hand",
  align: "left",
  bold: false,
  italic: false,
  underline: false,
}

export interface TemporaryElementsPreferences {
  temporaryMode: boolean
  defaultDurationMs: number
  showCountdown: boolean
  disappearingAnimation: boolean
  notificationsEnabled: boolean
  expiringSoonSeconds: number
  archiveRetention: "indefinite" | "7days" | "30days"
}

export const DEFAULT_TEMPORARY_PREFERENCES: TemporaryElementsPreferences = {
  temporaryMode: false,
  defaultDurationMs: 5 * 60 * 1000, // 5 minutes default
  showCountdown: true,
  disappearingAnimation: true,
  notificationsEnabled: false,
  expiringSoonSeconds: 60,
  archiveRetention: "indefinite",
}

export interface DockControlsVisibility {
  // Drawing & Creation Tools
  toolSelect: boolean
  toolHand: boolean
  toolShape: boolean
  toolDraw: boolean
  toolHighlighter?: boolean
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
  actionPresenter?: boolean
  actionMiniMap?: boolean
  actionReactions?: boolean
  actionRecordAudio?: boolean

  // Dock Modules
  brandMenu: boolean
  zoomControls: boolean
  viewMenu?: boolean
  timeClock?: boolean

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
  toolHighlighter: true,
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
  actionPresenter: true,
  actionMiniMap: true,
  actionReactions: true,
  actionRecordAudio: true,

  brandMenu: true,
  zoomControls: true,
  viewMenu: false,
  timeClock: false,

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

export interface AudioHapticsPreferences {
  enabled: boolean
  volume: number
}

export const DEFAULT_AUDIO_HAPTICS: AudioHapticsPreferences = {
  enabled: true,
  volume: 0.35,
}

export interface SmartDrawingPreferences {
  snapOnHold: boolean
  holdThresholdMs: number
}

export const DEFAULT_SMART_DRAWING: SmartDrawingPreferences = {
  snapOnHold: true,
  holdThresholdMs: 360,
}

export interface PresenterPreferences {
  active: boolean
  currentFrameIndex: number
  showSpotlight: boolean
  spotlightRadius: number
}

export const DEFAULT_PRESENTER_PREFERENCES: PresenterPreferences = {
  active: false,
  currentFrameIndex: 0,
  showSpotlight: false,
  spotlightRadius: 150,
}

export type MiniMapPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left"
export type LibraryPosition = "center" | "right" | "left"
export type LibrarySize = "standard" | "wide"

export interface MediaPreferences {
  cleanModeDefault: boolean
  alwaysEnforce1080p: boolean
  showHeaderControls: boolean
  showScrubberLine: boolean
  showHoverControls: boolean
  showCenterPlayButton: boolean
  autoSoloPlayback: boolean
  showEmbedHeader?: boolean
  showFallbackCards?: boolean
}

export const DEFAULT_MEDIA_PREFERENCES: MediaPreferences = {
  cleanModeDefault: true,
  alwaysEnforce1080p: true,
  showHeaderControls: true,
  showScrubberLine: true,
  showHoverControls: true,
  showCenterPlayButton: true,
  autoSoloPlayback: true,
  showEmbedHeader: true,
  showFallbackCards: true,
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
  showToolbar: boolean
  showDock: boolean
  showToolbarViewMenu: boolean
  showDockViewMenu: boolean
  showZoomControls: boolean
  showStatusIndicators: boolean
  showCollabStatus: boolean
  highContrast: boolean
  largeText: boolean
  screenReaderHints: boolean
  laserSettings: LaserSettings
  drawSettings: DrawSettings
  textSettings: TextSettings
  performanceSettings: PerformanceSettings
  dockControls: DockControlsVisibility
  databaseSettings: DatabaseSettings
  wifiAutoSync: boolean
  clockSettings: ClockPreferences
  temporarySettings: TemporaryElementsPreferences
  zenModeKeybind: string
  zenModeExitHint: boolean
  hideMouseKeybind: string
  autoHideMouseInZenMode: boolean
  revealMouseOnMove: boolean
  liquidGlassSettings: ShellLiquidGlassPreferences
  language: SupportedLanguage
  audioHaptics?: AudioHapticsPreferences
  smartDrawing?: SmartDrawingPreferences
  presenterSettings?: PresenterPreferences
  showMiniMap?: boolean
  miniMapPosition?: MiniMapPosition
  libraryPosition?: LibraryPosition
  librarySize?: LibrarySize
  liveCollaborationEnabled?: boolean
  backupSettings?: BackupSettings
  mediaSettings: MediaPreferences
  showDocTitle?: boolean
  showFilesPopover?: boolean
  showContextToolbar?: boolean
  showHoverNotes?: boolean
  showSnapGuides?: boolean
  showLaserRibbon?: boolean
  showPeerCursors?: boolean
  showPeerChat?: boolean
  showNoticeToasts?: boolean
  showEmbedHeader?: boolean
  showFallbackCards?: boolean
}

export const DEFAULT_PREFERENCES: ShellPreferences = {
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
  showToolbar: true,
  showDock: true,
  showToolbarViewMenu: true,
  showDockViewMenu: false,
  showZoomControls: true,
  showStatusIndicators: true,
  showCollabStatus: true,
  showDocTitle: true,
  showFilesPopover: true,
  showContextToolbar: true,
  showHoverNotes: true,
  showSnapGuides: true,
  showLaserRibbon: true,
  showPeerCursors: true,
  showPeerChat: true,
  showNoticeToasts: true,
  showEmbedHeader: true,
  showFallbackCards: true,
  highContrast: false,
  largeText: false,
  screenReaderHints: false,
  laserSettings: DEFAULT_LASER_SETTINGS,
  drawSettings: DEFAULT_DRAW_SETTINGS,
  textSettings: DEFAULT_TEXT_SETTINGS,
  performanceSettings: DEFAULT_PERFORMANCE_SETTINGS,
  dockControls: DEFAULT_DOCK_CONTROLS,
  databaseSettings: DEFAULT_DATABASE_SETTINGS,
  backupSettings: DEFAULT_BACKUP_SETTINGS,
  wifiAutoSync: false,
  clockSettings: DEFAULT_CLOCK_PREFERENCES,
  temporarySettings: DEFAULT_TEMPORARY_PREFERENCES,
  zenModeKeybind: "mod+\\",
  zenModeExitHint: true,
  hideMouseKeybind: "alt+m",
  autoHideMouseInZenMode: false,
  revealMouseOnMove: true,
  liquidGlassSettings: DEFAULT_LIQUID_GLASS_PREFERENCES,
  language: "en-US",
  audioHaptics: DEFAULT_AUDIO_HAPTICS,
  smartDrawing: DEFAULT_SMART_DRAWING,
  presenterSettings: DEFAULT_PRESENTER_PREFERENCES,
  showMiniMap: true,
  miniMapPosition: "bottom-right",
  libraryPosition: "center",
  librarySize: "standard",
  liveCollaborationEnabled: true,
  mediaSettings: DEFAULT_MEDIA_PREFERENCES,
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
        showToolbar: parsed.showToolbar !== undefined ? Boolean(parsed.showToolbar) : true,
        showDock: parsed.showDock !== undefined ? Boolean(parsed.showDock) : true,
        showToolbarViewMenu: parsed.showToolbarViewMenu !== undefined ? Boolean(parsed.showToolbarViewMenu) : true,
        showDockViewMenu: parsed.showDockViewMenu !== undefined ? Boolean(parsed.showDockViewMenu) : Boolean(parsed.dockControls?.viewMenu ?? false),
        showStatusIndicators: parsed.showStatusIndicators !== undefined ? Boolean(parsed.showStatusIndicators) : true,
        showCollabStatus: parsed.showCollabStatus !== undefined ? Boolean(parsed.showCollabStatus) : true,
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
        performanceSettings: {
          ...DEFAULT_PERFORMANCE_SETTINGS,
          ...(parsed.performanceSettings || {}),
        },
        dockControls: {
          ...DEFAULT_DOCK_CONTROLS,
          ...(parsed.dockControls || {}),
          timeClock: parsed.dockControls?.timeClock !== undefined
            ? Boolean(parsed.dockControls.timeClock)
            : Boolean(parsed.clockSettings?.showInDock ?? false),
        },
        databaseSettings: {
          ...DEFAULT_DATABASE_SETTINGS,
          ...(parsed.databaseSettings || {}),
        },
        clockSettings: {
          ...DEFAULT_CLOCK_PREFERENCES,
          ...(parsed.clockSettings || {}),
        },
        temporarySettings: {
          ...DEFAULT_TEMPORARY_PREFERENCES,
          ...(parsed.temporarySettings || {}),
        },
        zenModeKeybind: typeof parsed.zenModeKeybind === "string" ? parsed.zenModeKeybind : "mod+\\",
        zenModeExitHint: parsed.zenModeExitHint !== undefined ? Boolean(parsed.zenModeExitHint) : true,
        hideMouseKeybind: typeof parsed.hideMouseKeybind === "string" ? parsed.hideMouseKeybind : "alt+m",
        autoHideMouseInZenMode: parsed.autoHideMouseInZenMode !== undefined ? Boolean(parsed.autoHideMouseInZenMode) : false,
        revealMouseOnMove: parsed.revealMouseOnMove !== undefined ? Boolean(parsed.revealMouseOnMove) : true,
        liquidGlassSettings: {
          ...DEFAULT_LIQUID_GLASS_PREFERENCES,
          ...(parsed.liquidGlassSettings || {}),
        },
        language: typeof parsed.language === "string" ? (parsed.language as SupportedLanguage) : "en-US",
        audioHaptics: {
          ...DEFAULT_AUDIO_HAPTICS,
          ...(parsed.audioHaptics || {}),
        },
        smartDrawing: {
          ...DEFAULT_SMART_DRAWING,
          ...(parsed.smartDrawing || {}),
        },
        presenterSettings: {
          ...DEFAULT_PRESENTER_PREFERENCES,
          ...(parsed.presenterSettings || {}),
        },
        showMiniMap: parsed.showMiniMap !== undefined ? Boolean(parsed.showMiniMap) : true,
        miniMapPosition:
          parsed.miniMapPosition && ["bottom-right", "bottom-left", "top-right", "top-left"].includes(parsed.miniMapPosition)
            ? (parsed.miniMapPosition as MiniMapPosition)
            : "bottom-right",
        libraryPosition:
          parsed.libraryPosition && ["center", "right", "left"].includes(parsed.libraryPosition)
            ? (parsed.libraryPosition as LibraryPosition)
            : "center",
        librarySize:
          parsed.librarySize && ["standard", "wide"].includes(parsed.librarySize)
            ? (parsed.librarySize as LibrarySize)
            : "standard",
        liveCollaborationEnabled:
          parsed.liveCollaborationEnabled !== undefined ? Boolean(parsed.liveCollaborationEnabled) : true,
        mediaSettings: {
          ...DEFAULT_MEDIA_PREFERENCES,
          ...(parsed.mediaSettings || {}),
        },
        showDocTitle: parsed.showDocTitle !== undefined ? Boolean(parsed.showDocTitle) : true,
        showFilesPopover: parsed.showFilesPopover !== undefined ? Boolean(parsed.showFilesPopover) : true,
        showContextToolbar: parsed.showContextToolbar !== undefined ? Boolean(parsed.showContextToolbar) : true,
        showHoverNotes: parsed.showHoverNotes !== undefined ? Boolean(parsed.showHoverNotes) : true,
        showSnapGuides: parsed.showSnapGuides !== undefined ? Boolean(parsed.showSnapGuides) : true,
        showLaserRibbon: parsed.showLaserRibbon !== undefined ? Boolean(parsed.showLaserRibbon) : true,
        showPeerCursors: parsed.showPeerCursors !== undefined ? Boolean(parsed.showPeerCursors) : true,
        showPeerChat: parsed.showPeerChat !== undefined ? Boolean(parsed.showPeerChat) : true,
        showNoticeToasts: parsed.showNoticeToasts !== undefined ? Boolean(parsed.showNoticeToasts) : true,
        showEmbedHeader: parsed.showEmbedHeader !== undefined ? Boolean(parsed.showEmbedHeader) : true,
        showFallbackCards: parsed.showFallbackCards !== undefined ? Boolean(parsed.showFallbackCards) : true,
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

  // Expired elements archive modal
  expiredArchiveOpen: boolean

  // Interactive Presentation, Spotlight, MiniMap, and Reactions
  miniMapOpen: boolean
  presenterActive: boolean
  presenterSlideIndex: number
  spotlightActive: boolean
  spotlightRadius: number
  reactionsBarOpen: boolean

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
  setExpiredArchiveOpen: (open: boolean) => void
  toggleMiniMap: () => void
  setMiniMapOpen: (open: boolean) => void
  togglePresenter: () => void
  setPresenterActive: (active: boolean) => void
  setPresenterSlideIndex: (idx: number) => void
  toggleSpotlight: () => void
  setSpotlightActive: (active: boolean) => void
  setSpotlightRadius: (radius: number) => void
  toggleReactionsBar: () => void
  setReactionsBarOpen: (open: boolean) => void
  toggleTemporaryMode: () => void
  setTemporaryMode: (enabled: boolean) => void
  setTemporaryDuration: (durationMs: number) => void
  updateTemporarySettings: (updates: Partial<TemporaryElementsPreferences>) => void
  updatePreferences: (updates: Partial<ShellPreferences>) => void
  setZenModeKeybind: (keybind: string) => void
  setZenModeExitHint: (show: boolean) => void
  setHideMouseKeybind: (keybind: string) => void
  setAutoHideMouseInZenMode: (enabled: boolean) => void
  setRevealMouseOnMove: (enabled: boolean) => void
  updateLiquidGlassPreferences: (updates: Partial<ShellLiquidGlassPreferences>) => void
  updateClockPreferences: (updates: Partial<ClockPreferences>) => void
  setMiniMapPosition: (position: MiniMapPosition) => void
  cycleMiniMapPosition: () => void
  setLibraryPosition: (position: LibraryPosition) => void
  setLibrarySize: (size: LibrarySize) => void
  cycleLibraryPosition: () => void
  setLiveCollaborationEnabled: (enabled: boolean) => void
  toggleLiveCollaboration: () => void
  toggleToolbar: () => void
  toggleDock: () => void
  toggleToolbarViewMenu: () => void
  toggleDockViewMenu: () => void
  toggleZoomControls: () => void
  toggleTimeInTopBar: () => void
  toggleTimeInDock: () => void
  setShowStatusIndicators: (show: boolean) => void
  toggleStatusIndicators: () => void
  setShowCollabStatus: (show: boolean) => void
  toggleCollabStatus: () => void
  updateLaserSettings: (updates: Partial<LaserSettings>) => void
  updateDrawSettings: (updates: Partial<DrawSettings>) => void
  updateTextSettings: (updates: Partial<TextSettings>) => void
  updatePerformanceSettings: (updates: Partial<PerformanceSettings>) => void
  updateDatabaseSettings: (updates: Partial<DatabaseSettings>) => void
  updateBackupSettings: (updates: Partial<BackupSettings>) => void
  updateMediaSettings: (updates: Partial<MediaPreferences>) => void
  setAllVisibility: (visible: boolean) => void
  applyVisibilityPreset: (preset: "studio" | "zen" | "balanced" | "presenter" | "sketcher") => void
  exportPreferencesJson: () => string
  importPreferencesJson: (json: string) => { success: boolean; error?: string }
  resetSectionPreferences: (section: SettingsSectionId) => void
  setStorageMode: (mode: StorageMode) => void
  toggleDatabase: (enabled?: boolean) => void
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
  expiredArchiveOpen: false,

  miniMapOpen: true,
  presenterActive: false,
  presenterSlideIndex: 0,
  spotlightActive: false,
  spotlightRadius: 150,
  reactionsBarOpen: false,

  preferences: loadInitialPreferences(),

  setActiveSurface: (activeSurface) => set({ activeSurface }),
  setPagePopoverOpen: (pagePopoverOpen) => set({ pagePopoverOpen }),
  togglePagePopover: () => set((s) => ({ pagePopoverOpen: !s.pagePopoverOpen })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSettingsSection: (section) => set({ settingsSection: section }),
  setToolsDockOpen: (toolsDockOpen) => set({ toolsDockOpen }),
  setBrandMenuOpen: (brandMenuOpen) => set({ brandMenuOpen }),
  setLibraryOpen: (libraryOpen) => set({ libraryOpen }),
  toggleLibraryOpen: () => set((s) => ({ libraryOpen: !s.libraryOpen })),
  setLibrarySearch: (librarySearch) => set({ librarySearch }),
  setLibraryFilter: (libraryFilter) => set({ libraryFilter }),
  setLibraryCategory: (libraryCategory) => set({ libraryCategory }),
  setGlobalSearchOpen: (globalSearchOpen) => set({ globalSearchOpen }),
  setExpiredArchiveOpen: (expiredArchiveOpen) => set({ expiredArchiveOpen }),

  toggleMiniMap: () => set((s) => ({ miniMapOpen: !s.miniMapOpen })),
  setMiniMapOpen: (miniMapOpen) => set({ miniMapOpen }),
  togglePresenter: () => set((s) => ({ presenterActive: !s.presenterActive })),
  setPresenterActive: (presenterActive) => set({ presenterActive }),
  setPresenterSlideIndex: (presenterSlideIndex) => set({ presenterSlideIndex }),
  toggleSpotlight: () => set((s) => ({ spotlightActive: !s.spotlightActive })),
  setSpotlightActive: (spotlightActive) => set({ spotlightActive }),
  setSpotlightRadius: (spotlightRadius) => set({ spotlightRadius }),
  toggleReactionsBar: () => set((s) => ({ reactionsBarOpen: !s.reactionsBarOpen })),
  setReactionsBarOpen: (reactionsBarOpen) => set({ reactionsBarOpen }),

  toggleTemporaryMode: () => {
    set((state) => {
      const current = state.preferences.temporarySettings?.temporaryMode ?? false
      const nextVal = !current
      const nextSettings = { ...state.preferences.temporarySettings, temporaryMode: nextVal }
      const next = { ...state.preferences, temporarySettings: nextSettings }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setTemporaryMode: (enabled) => {
    set((state) => {
      const nextSettings = { ...state.preferences.temporarySettings, temporaryMode: enabled }
      const next = { ...state.preferences, temporarySettings: nextSettings }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setTemporaryDuration: (durationMs) => {
    set((state) => {
      const nextSettings = { ...state.preferences.temporarySettings, defaultDurationMs: Math.max(1000, durationMs) }
      const next = { ...state.preferences, temporarySettings: nextSettings }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updateTemporarySettings: (updates) => {
    set((state) => {
      const nextSettings = { ...state.preferences.temporarySettings, ...updates }
      const next = { ...state.preferences, temporarySettings: nextSettings }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updatePreferences: (updates) => {
    set((state) => {
      const next: ShellPreferences = { ...state.preferences, ...updates }
      if (updates.showDockViewMenu !== undefined) {
        next.dockControls = {
          ...next.dockControls,
          viewMenu: updates.showDockViewMenu,
        }
      }
      if (updates.dockControls?.viewMenu !== undefined) {
        next.showDockViewMenu = updates.dockControls.viewMenu
      }
      if (updates.showZoomControls !== undefined) {
        next.dockControls = {
          ...next.dockControls,
          zoomControls: updates.showZoomControls,
        }
      }
      if (updates.dockControls?.zoomControls !== undefined) {
        next.showZoomControls = updates.dockControls.zoomControls
      }
      if (updates.clockSettings?.showInDock !== undefined) {
        next.dockControls = {
          ...next.dockControls,
          timeClock: updates.clockSettings.showInDock,
        }
      }
      if (updates.dockControls?.timeClock !== undefined) {
        next.clockSettings = {
          ...next.clockSettings,
          showInDock: updates.dockControls.timeClock,
        }
      }
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

  setZenModeKeybind: (zenModeKeybind) => {
    get().updatePreferences({ zenModeKeybind })
  },

  setZenModeExitHint: (zenModeExitHint) => {
    get().updatePreferences({ zenModeExitHint })
  },

  setHideMouseKeybind: (hideMouseKeybind) => {
    get().updatePreferences({ hideMouseKeybind })
  },

  setAutoHideMouseInZenMode: (autoHideMouseInZenMode) => {
    get().updatePreferences({ autoHideMouseInZenMode })
  },

  setRevealMouseOnMove: (revealMouseOnMove) => {
    get().updatePreferences({ revealMouseOnMove })
  },

  updateLiquidGlassPreferences: (updates) => {
    set((state) => {
      const nextSettings = { ...state.preferences.liquidGlassSettings, ...updates }
      const next = { ...state.preferences, liquidGlassSettings: nextSettings }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setMiniMapPosition: (position: MiniMapPosition) => {
    set((state) => {
      const next = { ...state.preferences, miniMapPosition: position }
      savePreferences(next)
      return { preferences: next }
    })
  },

  cycleMiniMapPosition: () => {
    set((state) => {
      const order: MiniMapPosition[] = ["bottom-right", "bottom-left", "top-left", "top-right"]
      const current = state.preferences.miniMapPosition || "bottom-right"
      const currentIndex = order.indexOf(current)
      const nextPosition = order[(currentIndex + 1) % order.length]
      const next = { ...state.preferences, miniMapPosition: nextPosition }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setLibraryPosition: (position: LibraryPosition) => {
    set((state) => {
      const next = { ...state.preferences, libraryPosition: position }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setLibrarySize: (size: LibrarySize) => {
    set((state) => {
      const next = { ...state.preferences, librarySize: size }
      savePreferences(next)
      return { preferences: next }
    })
  },

  cycleLibraryPosition: () => {
    set((state) => {
      const order: LibraryPosition[] = ["center", "right", "left"]
      const current = state.preferences.libraryPosition || "center"
      const currentIndex = order.indexOf(current)
      const nextPosition = order[(currentIndex + 1) % order.length]
      const next = { ...state.preferences, libraryPosition: nextPosition }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setLiveCollaborationEnabled: (enabled: boolean) => {
    set((state) => {
      const next = { ...state.preferences, liveCollaborationEnabled: enabled }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleLiveCollaboration: () => {
    set((state) => {
      const current = state.preferences.liveCollaborationEnabled ?? true
      const next = { ...state.preferences, liveCollaborationEnabled: !current }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleToolbar: () => {
    set((state) => {
      const nextVal = !(state.preferences.showToolbar ?? true)
      const next = { ...state.preferences, showToolbar: nextVal }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleDock: () => {
    set((state) => {
      const nextVal = !(state.preferences.showDock ?? true)
      const next = { ...state.preferences, showDock: nextVal }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleToolbarViewMenu: () => {
    set((state) => {
      const nextVal = !(state.preferences.showToolbarViewMenu ?? true)
      const next = { ...state.preferences, showToolbarViewMenu: nextVal }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleDockViewMenu: () => {
    set((state) => {
      const current = state.preferences.showDockViewMenu ?? state.preferences.dockControls?.viewMenu ?? false
      const nextVal = !current
      const next = {
        ...state.preferences,
        showDockViewMenu: nextVal,
        dockControls: {
          ...state.preferences.dockControls,
          viewMenu: nextVal,
        },
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleZoomControls: () => {
    set((state) => {
      const current = state.preferences.dockControls?.zoomControls ?? true
      const nextVal = !current
      const next = {
        ...state.preferences,
        showZoomControls: nextVal,
        dockControls: {
          ...state.preferences.dockControls,
          zoomControls: nextVal,
        },
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleTimeInTopBar: () => {
    set((state) => {
      const current = state.preferences.clockSettings?.showInTopBar ?? true
      const nextVal = !current
      const nextClock = { ...state.preferences.clockSettings, showInTopBar: nextVal }
      const next = { ...state.preferences, clockSettings: nextClock }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleTimeInDock: () => {
    set((state) => {
      const current = state.preferences.clockSettings?.showInDock ?? state.preferences.dockControls?.timeClock ?? false
      const nextVal = !current
      const nextClock = { ...state.preferences.clockSettings, showInDock: nextVal }
      const next = {
        ...state.preferences,
        clockSettings: nextClock,
        dockControls: {
          ...state.preferences.dockControls,
          timeClock: nextVal,
        },
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setShowStatusIndicators: (show) => {
    set((state) => {
      const next = { ...state.preferences, showStatusIndicators: show }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleStatusIndicators: () => {
    set((state) => {
      const nextVal = !(state.preferences.showStatusIndicators ?? true)
      const next = { ...state.preferences, showStatusIndicators: nextVal }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setShowCollabStatus: (show) => {
    set((state) => {
      const next = { ...state.preferences, showCollabStatus: show }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleCollabStatus: () => {
    set((state) => {
      const nextVal = !(state.preferences.showCollabStatus ?? true)
      const next = { ...state.preferences, showCollabStatus: nextVal }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updateClockPreferences: (updates) => {
    set((state) => {
      const nextClock = { ...state.preferences.clockSettings, ...updates }
      const next = {
        ...state.preferences,
        clockSettings: nextClock,
        dockControls: {
          ...state.preferences.dockControls,
          ...(updates.showInDock !== undefined ? { timeClock: updates.showInDock } : {}),
        },
      }
      savePreferences(next)
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

  updatePerformanceSettings: (updates) => {
    set((state) => {
      const nextPerf = { ...state.preferences.performanceSettings, ...updates }
      const next = { ...state.preferences, performanceSettings: nextPerf }
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
      const next: ShellPreferences = {
        ...state.preferences,
        dockControls: nextDockControls,
      }
      if (key === "viewMenu") {
        next.showDockViewMenu = visible
      }
      if (key === "zoomControls") {
        next.showZoomControls = visible
      }
      if (key === "timeClock") {
        next.clockSettings = {
          ...state.preferences.clockSettings,
          showInDock: visible,
        }
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

  updateDatabaseSettings: (updates) => {
    set((state) => {
      const nextDb = { ...state.preferences.databaseSettings, ...updates }
      const next = { ...state.preferences, databaseSettings: nextDb }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updateBackupSettings: (updates) => {
    set((state) => {
      const currentBackup = state.preferences.backupSettings || DEFAULT_BACKUP_SETTINGS
      const nextBackup = { ...currentBackup, ...updates }
      const next = { ...state.preferences, backupSettings: nextBackup }
      savePreferences(next)
      return { preferences: next }
    })
  },

  updateMediaSettings: (updates) => {
    set((state) => {
      const currentMedia = state.preferences.mediaSettings || DEFAULT_MEDIA_PREFERENCES
      const nextMedia = { ...currentMedia, ...updates }
      const next = { ...state.preferences, mediaSettings: nextMedia }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setAllVisibility: (visible) => {
    set((state) => {
      const nextDockControls = { ...state.preferences.dockControls }
      for (const k of Object.keys(nextDockControls) as (keyof DockControlsVisibility)[]) {
        nextDockControls[k] = visible
      }
      const nextMedia = {
        ...(state.preferences.mediaSettings || DEFAULT_MEDIA_PREFERENCES),
        showHeaderControls: visible,
        showScrubberLine: visible,
        showHoverControls: visible,
        showCenterPlayButton: visible,
        showEmbedHeader: visible,
        showFallbackCards: visible,
      }
      const nextClock = {
        ...state.preferences.clockSettings,
        showInTopBar: visible,
        showInDock: visible,
      }
      const next: ShellPreferences = {
        ...state.preferences,
        showCanvasUI: visible,
        showToolbar: visible,
        showDock: visible,
        showToolbarViewMenu: visible,
        showDockViewMenu: visible,
        showZoomControls: visible,
        showStatusIndicators: visible,
        showCollabStatus: visible,
        showMiniMap: visible,
        showDocTitle: visible,
        showFilesPopover: visible,
        showContextToolbar: visible,
        showHoverNotes: visible,
        showSnapGuides: visible,
        showLaserRibbon: visible,
        showPeerCursors: visible,
        showPeerChat: visible,
        showNoticeToasts: visible,
        showEmbedHeader: visible,
        showFallbackCards: visible,
        dockControls: nextDockControls,
        mediaSettings: nextMedia,
        clockSettings: nextClock,
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  applyVisibilityPreset: (preset) => {
    set((state) => {
      const nextDockControls = { ...state.preferences.dockControls }
      let next: ShellPreferences = { ...state.preferences }

      if (preset === "studio") {
        for (const k of Object.keys(nextDockControls) as (keyof DockControlsVisibility)[]) {
          nextDockControls[k] = true
        }
        next = {
          ...next,
          showCanvasUI: true,
          showToolbar: true,
          showDock: true,
          showToolbarViewMenu: true,
          showDockViewMenu: true,
          showZoomControls: true,
          showStatusIndicators: true,
          showCollabStatus: true,
          showMiniMap: true,
          showDocTitle: true,
          showFilesPopover: true,
          showContextToolbar: true,
          showHoverNotes: true,
          showSnapGuides: true,
          showLaserRibbon: true,
          showPeerCursors: true,
          showPeerChat: true,
          showNoticeToasts: true,
          showEmbedHeader: true,
          showFallbackCards: true,
          dockControls: nextDockControls,
          clockSettings: { ...next.clockSettings, showInTopBar: true, showInDock: true },
          mediaSettings: {
            ...next.mediaSettings,
            showHeaderControls: true,
            showScrubberLine: true,
            showHoverControls: true,
            showCenterPlayButton: true,
            showEmbedHeader: true,
            showFallbackCards: true,
          },
          performanceSettings: {
            ...next.performanceSettings,
            showFpsHud: true,
          },
        }
      } else if (preset === "zen") {
        for (const k of Object.keys(nextDockControls) as (keyof DockControlsVisibility)[]) {
          nextDockControls[k] = false
        }
        next = {
          ...next,
          showCanvasUI: false,
          showToolbar: false,
          showDock: false,
          showMiniMap: false,
          showToolbarViewMenu: false,
          showDockViewMenu: false,
          showZoomControls: false,
          showStatusIndicators: false,
          showCollabStatus: false,
          showDocTitle: false,
          showFilesPopover: false,
          showContextToolbar: true,
          showHoverNotes: true,
          showSnapGuides: true,
          showLaserRibbon: false,
          showPeerCursors: false,
          showPeerChat: false,
          showNoticeToasts: false,
          dockControls: nextDockControls,
          clockSettings: { ...next.clockSettings, showInTopBar: false, showInDock: false },
        }
      } else if (preset === "balanced") {
        next = {
          ...next,
          showCanvasUI: true,
          showToolbar: true,
          showDock: true,
          showMiniMap: true,
          showToolbarViewMenu: true,
          showDockViewMenu: false,
          showZoomControls: true,
          showStatusIndicators: true,
          showCollabStatus: true,
          showDocTitle: true,
          showFilesPopover: true,
          showContextToolbar: true,
          showHoverNotes: true,
          showSnapGuides: true,
          showLaserRibbon: true,
          showPeerCursors: true,
          showPeerChat: true,
          showNoticeToasts: true,
          showEmbedHeader: true,
          showFallbackCards: true,
          dockControls: DEFAULT_DOCK_CONTROLS,
          clockSettings: DEFAULT_CLOCK_PREFERENCES,
          mediaSettings: DEFAULT_MEDIA_PREFERENCES,
          performanceSettings: { ...next.performanceSettings, showFpsHud: false },
        }
      } else if (preset === "presenter") {
        for (const k of Object.keys(nextDockControls) as (keyof DockControlsVisibility)[]) {
          nextDockControls[k] = false
        }
        next = {
          ...next,
          showCanvasUI: false,
          showToolbar: false,
          showDock: false,
          showMiniMap: false,
          showContextToolbar: false,
          showLaserRibbon: true,
          showPeerCursors: true,
          showPeerChat: true,
          showNoticeToasts: false,
          dockControls: nextDockControls,
        }
      } else if (preset === "sketcher") {
        const sketcherControls: DockControlsVisibility = {
          ...DEFAULT_DOCK_CONTROLS,
          toolSelect: true,
          toolHand: true,
          toolDraw: true,
          toolHighlighter: true,
          toolEraser: true,
          toolShape: true,
          toolLaser: true,
          toolText: false,
          toolSticky: false,
          toolFrame: false,
          toolArrow: true,
          toolLibrary: false,
          actionRecordAudio: false,
          actionSearch: false,
          actionStats: false,
          actionPresenter: false,
          actionReactions: false,
          actionMiniMap: false,
          brandMenu: false,
          zoomControls: true,
          viewMenu: false,
          timeClock: false,
        }
        next = {
          ...next,
          showCanvasUI: true,
          showToolbar: false,
          showDock: true,
          showMiniMap: false,
          showDocTitle: false,
          showFilesPopover: false,
          showContextToolbar: true,
          showHoverNotes: true,
          showSnapGuides: true,
          showLaserRibbon: true,
          dockControls: sketcherControls,
        }
      }

      savePreferences(next)
      return { preferences: next }
    })
  },

  exportPreferencesJson: () => {
    return JSON.stringify(get().preferences, null, 2)
  },

  importPreferencesJson: (json: string) => {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== "object") {
        return { success: false, error: "Invalid JSON format" }
      }
      const next: ShellPreferences = {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        dockControls: {
          ...DEFAULT_DOCK_CONTROLS,
          ...(parsed.dockControls || {}),
        },
        clockSettings: {
          ...DEFAULT_CLOCK_PREFERENCES,
          ...(parsed.clockSettings || {}),
        },
        mediaSettings: {
          ...DEFAULT_MEDIA_PREFERENCES,
          ...(parsed.mediaSettings || {}),
        },
        performanceSettings: {
          ...DEFAULT_PERFORMANCE_SETTINGS,
          ...(parsed.performanceSettings || {}),
        },
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
      }
      set({ preferences: next })
      savePreferences(next)
      syncThemeToDOM(next.themeMode)
      applyAccentToDOM(next.uiAccent, next.customAccentColor)
      syncMotionToDOM(next.animationMode)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || "Failed to parse preferences JSON" }
    }
  },

  resetSectionPreferences: (section) => {
    set((state) => {
      let next: ShellPreferences = { ...state.preferences }
      switch (section) {
        case "visibility":
          next = {
            ...next,
            showToolbar: true,
            showDock: true,
            showMiniMap: true,
            showToolbarViewMenu: true,
            showDockViewMenu: false,
            showZoomControls: true,
            showStatusIndicators: true,
            showCollabStatus: true,
            showDocTitle: true,
            showFilesPopover: true,
            showContextToolbar: true,
            showHoverNotes: true,
            showSnapGuides: true,
            showLaserRibbon: true,
            showPeerCursors: true,
            showPeerChat: true,
            showNoticeToasts: true,
            showEmbedHeader: true,
            showFallbackCards: true,
            dockControls: DEFAULT_DOCK_CONTROLS,
            mediaSettings: DEFAULT_MEDIA_PREFERENCES,
            clockSettings: DEFAULT_CLOCK_PREFERENCES,
          }
          break
        case "media":
          next.mediaSettings = DEFAULT_MEDIA_PREFERENCES
          break
        case "laser":
          next.laserSettings = DEFAULT_LASER_SETTINGS
          break
        case "drawing":
          next.drawSettings = DEFAULT_DRAW_SETTINGS
          break
        case "text":
          next.textSettings = DEFAULT_TEXT_SETTINGS
          break
        case "performance":
          next.performanceSettings = DEFAULT_PERFORMANCE_SETTINGS
          break
        case "canvas":
          next.dockControls = DEFAULT_DOCK_CONTROLS
          break
        case "time":
          next.clockSettings = DEFAULT_CLOCK_PREFERENCES
          break
        case "temporary":
          next.temporarySettings = DEFAULT_TEMPORARY_PREFERENCES
          break
        case "storage":
          next.databaseSettings = DEFAULT_DATABASE_SETTINGS
          next.backupSettings = DEFAULT_BACKUP_SETTINGS
          break
        case "appearance":
          next.themeMode = DEFAULT_PREFERENCES.themeMode
          next.uiAccent = DEFAULT_PREFERENCES.uiAccent
          next.customAccentColor = DEFAULT_PREFERENCES.customAccentColor
          next.uiDensity = DEFAULT_PREFERENCES.uiDensity
          next.uiRadius = DEFAULT_PREFERENCES.uiRadius
          next.uiBlur = DEFAULT_PREFERENCES.uiBlur
          next.animationMode = DEFAULT_PREFERENCES.animationMode
          syncThemeToDOM(DEFAULT_PREFERENCES.themeMode)
          applyAccentToDOM(DEFAULT_PREFERENCES.uiAccent, DEFAULT_PREFERENCES.customAccentColor)
          syncMotionToDOM(DEFAULT_PREFERENCES.animationMode)
          break
        default:
          break
      }
      savePreferences(next)
      return { preferences: next }
    })
  },

  setStorageMode: (mode) => {
    set((state) => {
      const nextDb = { ...state.preferences.databaseSettings, storageMode: mode }
      const next = { ...state.preferences, databaseSettings: nextDb }
      savePreferences(next)
      return { preferences: next }
    })
  },

  toggleDatabase: (enabled) => {
    set((state) => {
      const current = state.preferences.databaseSettings.enabled
      const nextVal = typeof enabled === "boolean" ? enabled : !current
      const nextDb = { ...state.preferences.databaseSettings, enabled: nextVal }
      const next = { ...state.preferences, databaseSettings: nextDb }
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
