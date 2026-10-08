"use client"

// ---------------------------------------------------------------------------
// Zenithsui Master Settings Workspace
//
// Desktop: 2-pane Mac-style System Settings (sidebar on left, settings on right).
// Mobile: responsive scrollable navigation tabs.
// Completely decoupled from canvas document undo/redo history.
// Supports all 17 categories:
// - General, Appearance, Canvas, Page, Keyboard, Files & Storage, Cloud & Sync,
//   Sharing, Notifications, Wi-Fi, Student, Account, Privacy, Accessibility,
//   Advanced, About, and Future / Coming Soon.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react"
import {
  useShellStore,
  syncThemeToDOM,
  applyAccentToDOM,
  DEFAULT_LASER_SETTINGS,
  DEFAULT_DRAW_SETTINGS,
  DEFAULT_TEXT_SETTINGS,
  type SettingsSectionId,
  type ThemeMode,
  type UIDensity,
  type UIRadius,
  type UIBlur,
  type StartPage,
  type DockControlsVisibility,
} from "@/lib/shell-store"
import { useSquig } from "@/lib/store"
import { useAuthStore } from "@/lib/auth-store"
import { UI_ACCENTS, COLOR_SWATCHES } from "@/lib/design-tokens"
import { THEMES, THEME_NAMES, PAPER_SHADES, type ThemeName, type FontMode, type PaperShade } from "@/lib/theme"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Sliders,
  Palette,
  PaintBrush,
  File,
  Keyboard,
  Folder,
  CloudCheck,
  ShareNetwork,
  Bell,
  WifiHigh,
  ShieldCheck,
  Eye,
  Cpu,
  Info,
  Sparkle,
  X,
  Check,
  ArrowCounterClockwise,
  Lock,
  DeviceMobile,
  Laptop,
  Cursor,
  Hand,
  Rectangle,
  PencilLine,
  Eraser,
  ArrowRight,
  TextT,
  Note,
  Crop,
  Flashlight,
  MagnifyingGlass,
  ChartBar,
  Gear,
  Minus,
  Plus,
  FilePlus,
  ClockCounterClockwise,
  GitFork,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsIn,
  Trash,
  GithubLogo,
  TextB,
  TextItalic,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  Sun,
  Moon,
  Desktop,
  BookOpen,
} from "@phosphor-icons/react"

interface SectionItem {
  id: SettingsSectionId
  label: string
  description: string
  icon: React.ElementType
}

const SECTIONS: SectionItem[] = [
  { id: "general", label: "General", description: "Language, timezone, start page and defaults", icon: Sliders },
  { id: "appearance", label: "Appearance & Themes", description: "Website theme modes, UI accents, density, radius and translucency", icon: Palette },
  { id: "laser", label: "Laser Pointer", description: "Laser beam color, trail lifetime, width and glow effects", icon: Flashlight },
  { id: "drawing", label: "Drawing & Inking", description: "Default stroke color, line weights, smoothing and pressure", icon: PencilLine },
  { id: "text", label: "Text & Typography", description: "Default text color, typography faces, font sizes and alignments", icon: TextT },
  { id: "canvas", label: "Toolbar & Dock", description: "Dock tool toggles, quick action buttons and menu items", icon: PaintBrush },
  { id: "page", label: "Page & Paper", description: "Document palettes, dot grid and paper shade defaults", icon: File },
  { id: "keyboard", label: "Keyboard", description: "Shortcuts and navigation hotkeys", icon: Keyboard },
  { id: "storage", label: "Files & Storage", description: "Local database usage, export formats and cache", icon: Folder },
  { id: "cloud", label: "Cloud & Sync", description: "Supabase cloud synchronization status", icon: CloudCheck },
  { id: "sharing", label: "Sharing", description: "Collaboration permissions and public link rules", icon: ShareNetwork },
  { id: "notifications", label: "Notifications", description: "Deadline alerts and audio reminders", icon: Bell },
  { id: "wifi", label: "Wi-Fi & LAN", description: "Local network discovery and publishing", icon: WifiHigh },
  { id: "privacy", label: "Privacy & Security", description: "Local-first data retention and encryption", icon: ShieldCheck },
  { id: "accessibility", label: "Accessibility", description: "Contrast, large typography and reduced motion", icon: Eye },
  { id: "advanced", label: "Advanced", description: "Render performance flags and engine diagnostics", icon: Cpu },
  { id: "about", label: "About", description: "Zenithsui version, system info and open-source licenses", icon: Info },
  { id: "future", label: "Coming Soon", description: "Planned features and tool roadmap", icon: Sparkle },
]

export function SettingsDialog() {
  const isOpen = useShellStore((s) => s.settingsOpen)
  const setIsOpen = useShellStore((s) => s.setSettingsOpen)
  const activeSection = useShellStore((s) => s.settingsSection)
  const setActiveSection = useShellStore((s) => s.setSettingsSection)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape & lock body scroll
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog Shell */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Settings"
        className={cn(
          "relative flex flex-col md:flex-row w-[820px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-4rem)]",
          "rounded-2xl border border-stone-200/90 dark:border-stone-800/90",
          "bg-white/95 dark:bg-[#1C1C1F]/95 backdrop-blur-xl shadow-2xl shadow-stone-900/20 dark:shadow-black/70",
          "overflow-hidden font-sans animate-modal-enter select-none"
        )}
      >
        {/* ── Left Sidebar: Category List ── */}
        <aside className="w-full md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-stone-200/70 dark:border-stone-800/70 bg-stone-50/70 dark:bg-stone-900/50 py-3 px-2 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar">
          <div className="hidden md:flex items-center justify-between px-2.5 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Settings
            </span>
          </div>

          <nav className="flex md:flex-col gap-0.5 w-full">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "tactile-press flex shrink-0 md:w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                    isActive
                      ? "bg-blue-600 text-white shadow-2xs font-semibold scale-102"
                      : "text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white"
                  )}
                >
                  <Icon size={15} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                  <span className="truncate">{section.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* ── Right Content: Active Category Settings ── */}
        <section className="flex-1 flex flex-col overflow-hidden bg-white/50 dark:bg-[#1C1C1F]/50">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200/70 dark:border-stone-800/70 shrink-0">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-50 tracking-tight">
                {currentSection.label}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                {currentSection.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="tactile-btn rounded-lg p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </header>

          {/* Section Body */}
          <div key={activeSection} className="flex-1 overflow-y-auto px-6 py-5 text-xs text-stone-800 dark:text-stone-200 animate-card-fade">
            <SectionBody section={activeSection} />
          </div>
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper Components & Interactive Test Pads
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  let c = (hex || "#EF4444").replace("#", "").trim()
  if (c.length === 3) c = c.split("").map((x) => x + x).join("")
  const num = parseInt(c, 16)
  if (Number.isNaN(num)) return [239, 68, 68]
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function LaserTestPad({
  color,
  width,
  glowIntensity,
  durationMs,
  pulseDot,
}: {
  color: string
  width: number
  glowIntensity: "none" | "subtle" | "vibrant" | "neon"
  durationMs: number
  pulseDot: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDownRef = useRef(false)
  const [interacted, setInteracted] = useState(false)
  const pointsRef = useRef<{ x: number; y: number; t: number }[]>([])
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function render() {
      if (!canvas || !ctx) return
      const now = performance.now()
      pointsRef.current = pointsRef.current.filter((p) => now - p.t < durationMs)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const pts = pointsRef.current

      if (pts.length > 1) {
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        const [r, g, b] = hexToRgb(color)
        const glowBlur =
          glowIntensity === "none" ? 0 : glowIntensity === "subtle" ? 4 : glowIntensity === "vibrant" ? 10 : 20

        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1]
          const p1 = pts[i]
          const age = now - p1.t
          const progress = Math.min(1, Math.max(0, age / durationMs))
          const alpha = 1 - progress

          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.95})`
          ctx.lineWidth = Math.max(1.5, width * (1 - progress * 0.6))
          if (glowBlur > 0) {
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`
            ctx.shadowBlur = glowBlur * (1 - progress)
          } else {
            ctx.shadowBlur = 0
          }
          ctx.stroke()
        }

        if (pulseDot && pts.length > 0) {
          const head = pts[pts.length - 1]
          ctx.beginPath()
          ctx.arc(head.x, head.y, Math.max(2.5, width * 0.75), 0, Math.PI * 2)
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`
          ctx.shadowBlur = glowBlur * 1.5
          ctx.fill()
        }
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [color, width, glowIntensity, durationMs, pulseDot])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDownRef.current = true
    setInteracted(true)
    const rect = e.currentTarget.getBoundingClientRect()
    pointsRef.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now(),
    })
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDownRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    pointsRef.current.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now(),
    })
  }

  const onPointerUp = () => {
    isDownRef.current = false
  }

  return (
    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-[#0F0F12] select-none cursor-crosshair">
      <canvas
        ref={canvasRef}
        width={500}
        height={128}
        className="w-full h-full block touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {!interacted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-stone-500 text-[11px] font-medium tracking-wide">
          <span>Click and drag here to test laser pointer</span>
        </div>
      )}
      <div className="absolute bottom-2 right-2.5 pointer-events-none flex items-center gap-1.5 text-[10px] text-stone-400">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-mono">{color}</span>
        <span>•</span>
        <span>{durationMs}ms</span>
        <span>•</span>
        <span>{width}px</span>
      </div>
    </div>
  )
}

function DoodleTestPad({
  color,
  strokeWeight,
  dashed,
}: {
  color: string
  strokeWeight: "light" | "regular" | "heavy"
  dashed: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDownRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [strokeCount, setStrokeCount] = useState(0)

  const strokeWidth = strokeWeight === "light" ? 1.5 : strokeWeight === "heavy" ? 4 : 2.5

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setStrokeCount(0)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDownRef.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    lastPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setStrokeCount((c) => c + 1)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDownRef.current || !lastPointRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    if (dashed) {
      ctx.setLineDash([strokeWidth * 2.5, strokeWidth * 2])
    } else {
      ctx.setLineDash([])
    }
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.restore()

    lastPointRef.current = { x, y }
  }

  const onPointerUp = () => {
    isDownRef.current = false
    lastPointRef.current = null
  }

  return (
    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/40 select-none cursor-crosshair">
      <canvas
        ref={canvasRef}
        width={500}
        height={128}
        className="w-full h-full block touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {strokeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-stone-400 dark:text-stone-500 text-[11px] font-medium">
          <span>Draw strokes here to test inking feel</span>
        </div>
      )}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {strokeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="px-2 py-0.5 rounded text-[10px] bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
          >
            Clear Pad
          </button>
        )}
      </div>
      <div className="absolute bottom-2 right-2.5 pointer-events-none flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        <span>{dashed ? "Dashed" : "Solid"} • {strokeWeight}</span>
      </div>
    </div>
  )
}

function TypographyPreview({
  color,
  fontSize,
  fontFamily,
  align,
  bold,
  italic,
}: {
  color: string
  fontSize: number
  fontFamily: "hand" | "sans" | "serif" | "mono"
  align: "left" | "center" | "right"
  bold: boolean
  italic: boolean
}) {
  const [sampleText, setSampleText] = useState("Zenithsui Infinite Paper 2026")

  const fontClass =
    fontFamily === "hand"
      ? "font-sketch"
      : fontFamily === "serif"
        ? "font-serif"
        : fontFamily === "mono"
          ? "font-mono"
          : "font-sans"

  return (
    <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Live Interactive Preview
        </span>
        <span className="text-[10px] text-stone-400 font-mono">
          {fontSize}px • {fontFamily} • {align}
        </span>
      </div>
      <div
        className={cn(
          "min-h-[64px] p-2.5 rounded-lg border border-dashed border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 transition-all flex items-center",
          align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
        )}
      >
        <input
          type="text"
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          placeholder="Type something to preview..."
          className={cn(
            "w-full bg-transparent border-0 outline-none transition-all",
            fontClass,
            bold && "font-bold",
            italic && "italic",
            align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
          )}
          style={{
            fontSize: `${fontSize}px`,
            color: color,
            lineHeight: 1.2,
          }}
        />
      </div>
      <p className="text-[10px] text-stone-400 text-center">
        Type above to test your custom typography style in real-time
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section Content Renderers
// ---------------------------------------------------------------------------

function SectionBody({ section }: { section: SettingsSectionId }) {
  const prefs = useShellStore((s) => s.preferences)
  const updatePrefs = useShellStore((s) => s.updatePreferences)
  const resetPrefs = useShellStore((s) => s.resetPreferences)
  const updateLaserSettings = useShellStore((s) => s.updateLaserSettings)
  const updateDrawSettings = useShellStore((s) => s.updateDrawSettings)
  const updateTextSettings = useShellStore((s) => s.updateTextSettings)
  const dockControls = useShellStore((s) => s.preferences.dockControls)
  const updateDockControl = useShellStore((s) => s.updateDockControl)
  const setAllDockControls = useShellStore((s) => s.setAllDockControls)
  const resetDockControls = useShellStore((s) => s.resetDockControls)

  const theme = useSquig((s) => s.theme)
  const setTheme = useSquig((s) => s.setTheme)
  const font = useSquig((s) => s.font)
  const setFont = useSquig((s) => s.setFont)
  const paper = useSquig((s) => s.paper)
  const setPaper = useSquig((s) => s.setPaper)
  const showPage = useSquig((s) => s.showPage)
  const setShowPage = useSquig((s) => s.setShowPage)
  const grid = useSquig((s) => s.grid)
  const setGrid = useSquig((s) => s.setGrid)
  const contextRow = useSquig((s) => s.contextRow)
  const setContextRow = useSquig((s) => s.setContextRow)

  const user = useAuthStore((s) => s.user)

  switch (section) {
    case "general":
      return (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Default Start Page</span>
              <span className="text-[11px] text-stone-500">Screen loaded when opening Zenithsui</span>
            </div>
            <select
              value={prefs.startPage}
              onChange={(e) => updatePrefs({ startPage: e.target.value as StartPage })}
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="canvas">Infinite Canvas</option>
              <option value="dashboard">Dashboard</option>
            </select>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Language</span>
              <span className="text-[11px] text-stone-500">Interface language selection</span>
            </div>
            <select
              defaultValue="en-US"
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="en-US">English (United States)</option>
              <option value="en-GB">English (United Kingdom)</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Confirm Destructive Actions</span>
              <span className="text-[11px] text-stone-500">Ask confirmation before clearing canvas or deleting items</span>
            </div>
            <Switch
              checked={prefs.confirmDestructive}
              onCheckedChange={(checked) => updatePrefs({ confirmDestructive: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Auto-save Frequency</span>
              <span className="text-[11px] text-stone-500">Local changes are continuously snapshotted</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              Continuous (Zero-loss)
            </span>
          </div>
        </div>
      )

    case "appearance": {
      const currentAccent = prefs.uiAccent || "blue"
      const customAccentColor = prefs.customAccentColor || "#2563EB"

      return (
        <div className="space-y-6">
          {/* 1. Theme Mode (5 options: Light, Dark, System, Sepia, Midnight) */}
          <div>
            <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-1">
              Website Color Theme
            </label>
            <span className="text-[11px] text-stone-500 block mb-2.5">
              Select surface illumination and aesthetic environment
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "light", label: "Light", icon: Sun, desc: "Daylight" },
                { id: "dark", label: "Dark", icon: Moon, desc: "Dark Slate" },
                { id: "system", label: "System", icon: Desktop, desc: "OS Match" },
                { id: "sepia", label: "Sepia", icon: BookOpen, desc: "Archival" },
                { id: "midnight", label: "Midnight", icon: Moon, desc: "OLED Black" },
              ].map((item) => {
                const Icon = item.icon
                const isSelected = prefs.themeMode === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      updatePrefs({ themeMode: item.id as ThemeMode })
                      syncThemeToDOM(item.id as ThemeMode)
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                      isSelected
                        ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 shadow-2xs font-semibold scale-102"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white/40 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300"
                    )}
                  >
                    <Icon size={18} weight={isSelected ? "fill" : "regular"} className="mb-1" />
                    <span className="text-xs font-semibold">{item.label}</span>
                    <span className="text-[10px] text-stone-400 mt-0.5">{item.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Application UI Accent Color */}
          <div className="pb-4 border-b border-stone-200/60 dark:border-stone-800/60 space-y-3">
            <div>
              <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-0.5">
                Application UI Accent
              </label>
              <span className="text-[11px] text-stone-500 block">
                Controls buttons, active tabs, toggle switches, and focus highlights
              </span>
            </div>

            {/* 12 Presets Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {UI_ACCENTS.map((acc) => {
                const isSelected = currentAccent === acc.id
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      updatePrefs({ uiAccent: acc.id, customAccentColor: acc.primary })
                      applyAccentToDOM(acc.id, acc.primary)
                    }}
                    title={acc.label}
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs",
                      isSelected
                        ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1F] scale-110"
                        : "hover:scale-110 hover:opacity-90"
                    )}
                    style={{ backgroundColor: acc.primary }}
                  >
                    {isSelected && <Check size={13} weight="bold" className="text-white drop-shadow" />}
                  </button>
                )
              })}
            </div>

            {/* Custom Hex Color Picker */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Custom Accent:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customAccentColor}
                  onChange={(e) => {
                    const hex = e.target.value
                    updatePrefs({ uiAccent: "custom", customAccentColor: hex })
                    applyAccentToDOM("custom", hex)
                  }}
                  className="size-7 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700 p-0.5 bg-transparent"
                  title="Pick custom hex accent"
                />
                <input
                  type="text"
                  value={customAccentColor}
                  onChange={(e) => {
                    const hex = e.target.value
                    updatePrefs({ uiAccent: "custom", customAccentColor: hex })
                    if (/^#[0-9A-F]{6}$/i.test(hex)) {
                      applyAccentToDOM("custom", hex)
                    }
                  }}
                  placeholder="#2563EB"
                  className="w-24 px-2 py-1 font-mono text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              {currentAccent === "custom" && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-500/10">
                  Active Custom
                </span>
              )}
            </div>
          </div>

          {/* 3. Corner Radius */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Border Corner Curves</span>
              <span className="text-[11px] text-stone-500">Controls roundness of dialogs, buttons, and popovers</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {(["sharp", "default", "pill"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updatePrefs({ uiRadius: r })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] capitalize transition-all cursor-pointer",
                    (prefs.uiRadius || "default") === r
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Translucency / Glassmorphism */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Backdrop Glassmorphism</span>
              <span className="text-[11px] text-stone-500">Translucent frosted glass blur behind menus and dialogs</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {(["none", "subtle", "strong"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => updatePrefs({ uiBlur: b })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] capitalize transition-all cursor-pointer",
                    (prefs.uiBlur || "subtle") === b
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* 5. UI Density */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">UI Density</span>
              <span className="text-[11px] text-stone-500">Spacing in toolbars, dialogs, and navigation</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {(["comfortable", "compact"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => updatePrefs({ uiDensity: d })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] capitalize transition-all cursor-pointer",
                    prefs.uiDensity === d
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Animations */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Fluid Animations</span>
              <span className="text-[11px] text-stone-500">Smooth panel transitions and spring animations</span>
            </div>
            <Switch
              checked={prefs.animationMode === "full"}
              onCheckedChange={(checked) =>
                updatePrefs({ animationMode: checked ? "full" : "reduced" })
              }
            />
          </div>
        </div>
      )
    }

    case "laser": {
      const laser = prefs.laserSettings ?? DEFAULT_LASER_SETTINGS

      return (
        <div className="space-y-6">
          {/* 1. Interactive Laser Test Pad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-stone-900 dark:text-stone-100 block">
                Interactive Laser Test Pad
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Live Preview
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-2.5">
              Draw inside the box below to test trail lifetime, beam width, color and neon aura in real-time.
            </p>
            <LaserTestPad
              color={laser.color}
              width={laser.width}
              glowIntensity={laser.glowIntensity}
              durationMs={laser.durationMs}
              pulseDot={laser.pulseDot}
            />
          </div>

          {/* 2. Laser Color Picker & Swatches */}
          <div className="space-y-2.5 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-0.5">
                Laser Beam Color
              </label>
              <span className="text-[11px] text-stone-500">
                Select high-visibility presenter beam tint
              </span>
            </div>

            {/* Preset laser swatches */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Red", hex: "#EF4444" },
                { label: "Crimson", hex: "#E11D48" },
                { label: "Rose", hex: "#F43F5E" },
                { label: "Fuchsia", hex: "#D946EF" },
                { label: "Purple", hex: "#A855F7" },
                { label: "Violet", hex: "#8B5CF6" },
                { label: "Indigo", hex: "#6366F1" },
                { label: "Blue", hex: "#3B82F6" },
                { label: "Cyan", hex: "#06B6D4" },
                { label: "Emerald", hex: "#10B981" },
                { label: "Lime", hex: "#84CC16" },
                { label: "Amber", hex: "#F59E0B" },
                { label: "Orange", hex: "#F97316" },
                { label: "Neon Magenta", hex: "#FF007F" },
                { label: "Pure White", hex: "#FFFFFF" },
              ].map((s) => {
                const isSelected = laser.color.toUpperCase() === s.hex.toUpperCase()
                return (
                  <button
                    key={s.hex}
                    type="button"
                    onClick={() => updateLaserSettings({ color: s.hex })}
                    title={s.label}
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs border border-stone-200/40 dark:border-stone-700/40",
                      isSelected
                        ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1F] scale-110"
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: s.hex }}
                  >
                    {isSelected && (
                      <Check
                        size={13}
                        weight="bold"
                        className={s.hex === "#FFFFFF" ? "text-stone-900" : "text-white"}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom Laser Hex Input */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Custom Hex:</span>
              <input
                type="color"
                value={laser.color}
                onChange={(e) => updateLaserSettings({ color: e.target.value })}
                className="size-7 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700 p-0.5 bg-transparent"
              />
              <input
                type="text"
                value={laser.color}
                onChange={(e) => updateLaserSettings({ color: e.target.value })}
                placeholder="#EF4444"
                className="w-24 px-2 py-1 font-mono text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* 3. Trail Lifetime / Duration */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Trail Lifetime</span>
              <span className="text-[11px] text-stone-500">How long laser strokes linger before fading away</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {[
                { label: "Quick (450ms)", val: 450 },
                { label: "Standard (850ms)", val: 850 },
                { label: "Long (1400ms)", val: 1400 },
                { label: "Ultra (2200ms)", val: 2200 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => updateLaserSettings({ durationMs: item.val })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer",
                    laser.durationMs === item.val
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Beam Thickness */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Beam Thickness</span>
              <span className="text-[11px] text-stone-500">Stroke width of the laser pointer head</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {[
                { label: "Thin (3px)", val: 3 },
                { label: "Regular (6px)", val: 6 },
                { label: "Bold (10px)", val: 10 },
                { label: "Heavy (14px)", val: 14 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => updateLaserSettings({ width: item.val })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer",
                    laser.width === item.val
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Glow Intensity */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Glow Aura</span>
              <span className="text-[11px] text-stone-500">Illumination diffusion surrounding the pointer</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {(["none", "subtle", "vibrant", "neon"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateLaserSettings({ glowIntensity: g })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] capitalize transition-all cursor-pointer",
                    laser.glowIntensity === g
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Pointer Reticle / Tip Pulse */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Leading Reticle Dot</span>
              <span className="text-[11px] text-stone-500">Render glowing pointer tip bead at leading cursor coordinate</span>
            </div>
            <Switch
              checked={laser.pulseDot}
              onCheckedChange={(checked) => updateLaserSettings({ pulseDot: checked })}
            />
          </div>
        </div>
      )
    }

    case "drawing": {
      const draw = prefs.drawSettings ?? DEFAULT_DRAW_SETTINGS

      return (
        <div className="space-y-6">
          {/* 1. Inking Doodle Test Pad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-stone-900 dark:text-stone-100 block">
                Interactive Drawing Pad
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Live Preview
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-2.5">
              Sketch freehand strokes to preview default line weight, dashed styling, and stroke feel.
            </p>
            <DoodleTestPad
              color={draw.colorMode === "custom" ? draw.customColor : "#2563EB"}
              strokeWeight={draw.strokeWeight}
              dashed={draw.dashed}
            />
          </div>

          {/* 2. Color Mode: Theme vs Custom */}
          <div className="space-y-3 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-0.5">
                Default Inking Color Mode
              </label>
              <span className="text-[11px] text-stone-500">
                Choose whether pencil strokes follow document theme or use your custom color
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateDrawSettings({ colorMode: "theme" })}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  draw.colorMode === "theme"
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold"
                    : "border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300"
                )}
              >
                <div className="text-xs font-semibold mb-0.5">Follow Document Theme</div>
                <div className="text-[10px] text-stone-500">Automatically matches canvas ink palette</div>
              </button>
              <button
                type="button"
                onClick={() => updateDrawSettings({ colorMode: "custom" })}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  draw.colorMode === "custom"
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold"
                    : "border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300"
                )}
              >
                <div className="text-xs font-semibold mb-0.5">Custom Inking Color</div>
                <div className="text-[10px] text-stone-500">Always ink in your chosen custom color</div>
              </button>
            </div>

            {/* Swatches and Custom Color Picker */}
            <div className={cn("space-y-2 pt-2", draw.colorMode === "theme" && "opacity-60")}>
              <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block">
                Choose Custom Ink Color:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => {
                  const isSelected = draw.customColor.toUpperCase() === swatch.hex.toUpperCase()
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => {
                        updateDrawSettings({ colorMode: "custom", customColor: swatch.hex })
                      }}
                      title={swatch.label}
                      className={cn(
                        "size-6 rounded-md flex items-center justify-center transition-all cursor-pointer shadow-2xs border border-stone-200/50 dark:border-stone-700/50",
                        isSelected
                          ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1F] scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {isSelected && (
                        <Check
                          size={12}
                          weight="bold"
                          className={swatch.hex === "#FFFFFF" ? "text-stone-900" : "text-white"}
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Hex Code:</span>
                <input
                  type="color"
                  value={draw.customColor}
                  onChange={(e) => updateDrawSettings({ colorMode: "custom", customColor: e.target.value })}
                  className="size-7 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700 p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={draw.customColor}
                  onChange={(e) => updateDrawSettings({ colorMode: "custom", customColor: e.target.value })}
                  placeholder="#2563EB"
                  className="w-24 px-2 py-1 font-mono text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          </div>

          {/* 3. Stroke Weight */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Default Stroke Weight</span>
              <span className="text-[11px] text-stone-500">Thickness of newly drawn freehand lines</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {[
                { id: "light", label: "Light (1.5px)" },
                { id: "regular", label: "Regular (2.5px)" },
                { id: "heavy", label: "Heavy (4.0px)" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateDrawSettings({ strokeWeight: item.id as "light" | "regular" | "heavy" })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer",
                    draw.strokeWeight === item.id
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Stroke Style (Solid vs Dashed) */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Dashed Stroke Style</span>
              <span className="text-[11px] text-stone-500">Render pencil strokes as dashed sketches</span>
            </div>
            <Switch
              checked={draw.dashed}
              onCheckedChange={(checked) => updateDrawSettings({ dashed: checked })}
            />
          </div>

          {/* 5. Smoothing Factor */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Curve Smoothing</span>
              <span className="text-[11px] text-stone-500">Algorithmically remove hand jitter and tremors</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {(["none", "medium", "high"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateDrawSettings({ smoothing: s })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] capitalize transition-all cursor-pointer",
                    draw.smoothing === s
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Pressure Simulation */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Simulate Pressure Sensitivity</span>
              <span className="text-[11px] text-stone-500">Dynamically modulate line width based on drawing speed</span>
            </div>
            <Switch
              checked={draw.simulatePressure}
              onCheckedChange={(checked) => updateDrawSettings({ simulatePressure: checked })}
            />
          </div>

          {/* 7. Auto-select After Draw */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Auto-select After Inking</span>
              <span className="text-[11px] text-stone-500">Automatically switch back to Select tool upon completing stroke</span>
            </div>
            <Switch
              checked={draw.autoSelectAfterDraw}
              onCheckedChange={(checked) => updateDrawSettings({ autoSelectAfterDraw: checked })}
            />
          </div>
        </div>
      )
    }

    case "text": {
      const textCfg = prefs.textSettings ?? DEFAULT_TEXT_SETTINGS
      const previewColor = textCfg.colorMode === "custom" ? textCfg.customColor : "#18181B"

      return (
        <div className="space-y-6">
          {/* 1. Typography Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-stone-900 dark:text-stone-100 block">
                Interactive Typography Preview
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Live Preview
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-2.5">
              Click and type in the box below to test font family, sizing, alignment, and color in real time.
            </p>
            <TypographyPreview
              color={previewColor}
              fontSize={textCfg.fontSize}
              fontFamily={textCfg.fontFamily}
              align={textCfg.align}
              bold={textCfg.bold}
              italic={textCfg.italic}
            />
          </div>

          {/* 2. Color Mode: Theme vs Custom */}
          <div className="space-y-3 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-0.5">
                Default Text Color Mode
              </label>
              <span className="text-[11px] text-stone-500">
                Choose whether text elements adapt to canvas theme or use a custom color
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateTextSettings({ colorMode: "theme" })}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  textCfg.colorMode === "theme"
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold"
                    : "border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300"
                )}
              >
                <div className="text-xs font-semibold mb-0.5">Follow Document Theme</div>
                <div className="text-[10px] text-stone-500">Matches canvas ink color palette</div>
              </button>
              <button
                type="button"
                onClick={() => updateTextSettings({ colorMode: "custom" })}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  textCfg.colorMode === "custom"
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold"
                    : "border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300"
                )}
              >
                <div className="text-xs font-semibold mb-0.5">Custom Text Color</div>
                <div className="text-[10px] text-stone-500">Always render in your chosen text color</div>
              </button>
            </div>

            {/* Swatches and Custom Color Picker */}
            <div className={cn("space-y-2 pt-2", textCfg.colorMode === "theme" && "opacity-60")}>
              <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400 block">
                Choose Custom Text Color:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => {
                  const isSelected = textCfg.customColor.toUpperCase() === swatch.hex.toUpperCase()
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => {
                        updateTextSettings({ colorMode: "custom", customColor: swatch.hex })
                      }}
                      title={swatch.label}
                      className={cn(
                        "size-6 rounded-md flex items-center justify-center transition-all cursor-pointer shadow-2xs border border-stone-200/50 dark:border-stone-700/50",
                        isSelected
                          ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1F] scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {isSelected && (
                        <Check
                          size={12}
                          weight="bold"
                          className={swatch.hex === "#FFFFFF" ? "text-stone-900" : "text-white"}
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Hex Code:</span>
                <input
                  type="color"
                  value={textCfg.customColor}
                  onChange={(e) => updateTextSettings({ colorMode: "custom", customColor: e.target.value })}
                  className="size-7 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700 p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={textCfg.customColor}
                  onChange={(e) => updateTextSettings({ colorMode: "custom", customColor: e.target.value })}
                  placeholder="#18181B"
                  className="w-24 px-2 py-1 font-mono text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          </div>

          {/* 3. Font Family */}
          <div className="space-y-2 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block mb-0.5">Default Font Family</span>
              <span className="text-[11px] text-stone-500">Primary typeface applied to new text layers</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "hand", label: "Hand-drawn", sample: "Sketch", fontClass: "font-sketch" },
                { id: "sans", label: "Clean Sans", sample: "Interface", fontClass: "font-sans" },
                { id: "serif", label: "Editorial Serif", sample: "Bookish", fontClass: "font-serif" },
                { id: "mono", label: "Code Mono", sample: "Technical", fontClass: "font-mono" },
              ].map((item) => {
                const isSelected = textCfg.fontFamily === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateTextSettings({ fontFamily: item.id as "hand" | "sans" | "serif" | "mono" })}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all cursor-pointer",
                      isSelected
                        ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white/40 dark:bg-stone-900/30 text-stone-700 dark:text-stone-300"
                    )}
                  >
                    <div className={cn("text-base mb-0.5", item.fontClass)}>{item.sample}</div>
                    <div className="text-[10px] text-stone-500">{item.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Font Size */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Default Font Size</span>
              <span className="text-[11px] text-stone-500">Starting size when creating text nodes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {[14, 18, 24, 32, 40].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => updateTextSettings({ fontSize: sz })}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer",
                      textCfg.fontSize === sz
                        ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                        : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                    )}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateTextSettings({ fontSize: Math.max(10, textCfg.fontSize - 2) })}
                  className="p-1 rounded-md border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center font-mono text-xs font-semibold">{textCfg.fontSize}px</span>
                <button
                  type="button"
                  onClick={() => updateTextSettings({ fontSize: Math.min(72, textCfg.fontSize + 2) })}
                  className="p-1 rounded-md border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* 5. Alignment & Style */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Default Text Formatting</span>
              <span className="text-[11px] text-stone-500">Alignment and typographic weight defaults</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Alignment */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {[
                  { id: "left", icon: TextAlignLeft },
                  { id: "center", icon: TextAlignCenter },
                  { id: "right", icon: TextAlignRight },
                ].map((al) => {
                  const Icon = al.icon
                  const isSelected = textCfg.align === al.id
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => updateTextSettings({ align: al.id as "left" | "center" | "right" })}
                      className={cn(
                        "p-1.5 rounded-md transition-all cursor-pointer",
                        isSelected
                          ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs"
                          : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                      )}
                      title={`Align ${al.id}`}
                    >
                      <Icon size={14} />
                    </button>
                  )
                })}
              </div>

              {/* Bold / Italic */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={() => updateTextSettings({ bold: !textCfg.bold })}
                  className={cn(
                    "p-1.5 rounded-md transition-all cursor-pointer",
                    textCfg.bold
                      ? "bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                  title="Toggle Bold"
                >
                  <TextB size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => updateTextSettings({ italic: !textCfg.italic })}
                  className={cn(
                    "p-1.5 rounded-md transition-all cursor-pointer",
                    textCfg.italic
                      ? "bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 italic shadow-2xs"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                  title="Toggle Italic"
                >
                  <TextItalic size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    case "canvas":
      return (
        <div className="space-y-6">
          {/* Header controls for dock */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-xs">Toolbar & Dock Controls</h4>
              <p className="text-[11px] text-stone-500">
                Customize every tool, button, and menu item visible in the bottom dock.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAllDockControls(true)}
                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800 text-[11px] font-medium text-stone-700 dark:text-stone-300 transition-colors"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={resetDockControls}
                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800 text-[11px] font-medium text-stone-700 dark:text-stone-300 transition-colors"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          {/* Group 1: General Canvas & Dock Options */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              General Canvas Options
            </h5>
            <div className="space-y-2.5 divide-y divide-stone-200/60 dark:divide-stone-800/60">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">Floating Bottom Dock</span>
                  <span className="text-[11px] text-stone-500">Display global navigation and tool dock on screen</span>
                </div>
                <Switch
                  checked={prefs.showDock}
                  onCheckedChange={(checked) => updatePrefs({ showDock: checked })}
                />
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">Context Toolbar on Selection</span>
                  <span className="text-[11px] text-stone-500">Show floating editing actions near selected items</span>
                </div>
                <Switch
                  checked={contextRow}
                  onCheckedChange={setContextRow}
                />
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <span className="font-medium text-xs text-stone-900 dark:text-stone-100 block">Page Boundary Sheet</span>
                  <span className="text-[11px] text-stone-500">Visual canvas page guide overlay</span>
                </div>
                <Switch
                  checked={showPage}
                  onCheckedChange={setShowPage}
                />
              </div>
            </div>
          </div>

          {/* Group 2: Dock Creation & Drawing Tools */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Drawing & Creation Tools (Image 2)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: "toolSelect", label: "Select Tool", icon: Cursor, shortcut: "V" },
                { key: "toolHand", label: "Hand (Pan) Tool", icon: Hand, shortcut: "H" },
                { key: "toolShape", label: "Shape Tool", icon: Rectangle, shortcut: "R" },
                { key: "toolDraw", label: "Pencil / Draw Tool", icon: PencilLine, shortcut: "P" },
                { key: "toolEraser", label: "Eraser Tool", icon: Eraser, shortcut: "E" },
                { key: "toolArrow", label: "Arrow Tool", icon: ArrowRight, shortcut: "A" },
                { key: "toolText", label: "Text Tool", icon: TextT, shortcut: "T" },
                { key: "toolSticky", label: "Sticky Notes", icon: Note, shortcut: "S", badge: "Hidden by default" },
                { key: "toolFrame", label: "Frame", icon: Crop, shortcut: "F", badge: "Hidden by default" },
                { key: "toolLaser", label: "Laser Pointer", icon: Flashlight, shortcut: "K" },
                { key: "toolLibrary", label: "Component Library", icon: Sparkle, shortcut: "L" },
              ].map((item) => {
                const Icon = item.icon
                const isChecked = dockControls[item.key as keyof DockControlsVisibility]
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-lg border border-stone-200/70 dark:border-stone-800/70 bg-white/40 dark:bg-stone-900/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300">
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
                          {item.shortcut && (
                            <kbd className="px-1 py-0.2 text-[9px] font-mono rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                              {item.shortcut}
                            </kbd>
                          )}
                        </div>
                        {item.badge && !isChecked && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        updateDockControl(item.key as keyof DockControlsVisibility, checked)
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Group 3: Quick Action Buttons & Modules */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Quick Action Buttons & Modules (Image 3)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: "actionSearch", label: "Find in Canvas", icon: MagnifyingGlass, shortcut: "⌘F", badge: "Hidden by default" },
                { key: "actionStats", label: "Canvas & Stats", icon: ChartBar, shortcut: "⌘/", badge: "Hidden by default" },
                { key: "actionPage", label: "Page & Canvas Popover", icon: File },
                { key: "actionSettings", label: "Settings Gear Button", icon: Gear },
                { key: "brandMenu", label: "Zenithsui Brand Menu", icon: Sliders },
                { key: "zoomControls", label: "Zoom In/Out & Stepper", icon: Minus },
              ].map((item) => {
                const Icon = item.icon
                const isChecked = dockControls[item.key as keyof DockControlsVisibility]
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-lg border border-stone-200/70 dark:border-stone-800/70 bg-white/40 dark:bg-stone-900/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300">
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
                          {item.shortcut && (
                            <kbd className="px-1 py-0.2 text-[9px] font-mono rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                              {item.shortcut}
                            </kbd>
                          )}
                        </div>
                        {item.badge && !isChecked && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        updateDockControl(item.key as keyof DockControlsVisibility, checked)
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Group 4: Brand Menu Dropdown Items */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Brand Menu Dropdown Items (Image 1)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: "menuNewCanvas", label: "New Canvas", icon: FilePlus, shortcut: "⌥N" },
                { key: "menuOpenRecent", label: "Open Recent", icon: ClockCounterClockwise },
                { key: "menuShare", label: "Share Canvas", icon: ShareNetwork },
                { key: "menuPublishWifi", label: "Publish on Wi-Fi", icon: WifiHigh },
                { key: "menuVersionHistory", label: "Version History", icon: GitFork },
                { key: "menuUndo", label: "Undo", icon: ArrowUUpLeft, shortcut: "⌘Z" },
                { key: "menuRedo", label: "Redo", icon: ArrowUUpRight, shortcut: "⌘⇧Z" },
                { key: "menuSettings", label: "Settings Menu Item", icon: Gear, shortcut: "⌘," },
                { key: "menuResetView", label: "Reset Canvas View", icon: ArrowsIn, shortcut: "⇧1" },
                { key: "menuClearCanvas", label: "Clear Canvas", icon: Trash },
                { key: "menuGithub", label: "GitHub Repository Link", icon: GithubLogo },
              ].map((item) => {
                const Icon = item.icon
                const isChecked = dockControls[item.key as keyof DockControlsVisibility]
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-lg border border-stone-200/70 dark:border-stone-800/70 bg-white/40 dark:bg-stone-900/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300">
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-stone-900 dark:text-stone-100">{item.label}</span>
                          {item.shortcut && (
                            <kbd className="px-1 py-0.2 text-[9px] font-mono rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                              {item.shortcut}
                            </kbd>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        updateDockControl(item.key as keyof DockControlsVisibility, checked)
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )

    case "page": {
      return (
        <div className="space-y-6">
          {/* 1. Document Palette (All 12 Canvas Themes) */}
          <div>
            <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-0.5">
              Document Canvas Theme (12 Palettes)
            </label>
            <span className="text-[11px] text-stone-500 block mb-3">
              Select infinite canvas backdrop, ink, and risograph paper tint for this document
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {THEME_NAMES.map((name) => {
                const pal = THEMES[name]
                const isSelected = theme === name
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setTheme(name)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group",
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-2xs"
                        : "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white/50 dark:bg-stone-900/40"
                    )}
                  >
                    {/* Visual Swatch Strip */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div
                        className="size-5 rounded-full border border-stone-200/50 shadow-2xs shrink-0"
                        style={{ backgroundColor: pal.ink }}
                        title={`Ink: ${pal.ink}`}
                      />
                      <div
                        className="size-5 rounded-full border border-stone-200/50 shadow-2xs shrink-0"
                        style={{ backgroundColor: pal.bg }}
                        title={`Canvas: ${pal.bg}`}
                      />
                      <div
                        className="size-5 rounded-full border border-stone-200/50 shadow-2xs shrink-0"
                        style={{ backgroundColor: pal.shadeStrong }}
                        title={`Shade: ${pal.shadeStrong}`}
                      />
                      {isSelected && (
                        <span className="ml-auto text-blue-600 dark:text-blue-400">
                          <Check size={14} weight="bold" />
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {pal.label}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate capitalize">
                      {name}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Paper Shade */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Paper Shade</span>
              <span className="text-[11px] text-stone-500">Sheet surface tint tone</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {(["white", "author", "shaded"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPaper(s as PaperShade)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] capitalize transition-all cursor-pointer",
                    paper === s
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Dot Grid */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Default Background Dot Grid</span>
              <span className="text-[11px] text-stone-500">Background spatial guide enabled by default</span>
            </div>
            <Switch checked={grid} onCheckedChange={setGrid} />
          </div>

          {/* 4. Page Boundary Guide */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Page Boundary Guide</span>
              <span className="text-[11px] text-stone-500">Show default page boundary on new documents</span>
            </div>
            <Switch checked={showPage} onCheckedChange={setShowPage} />
          </div>
        </div>
      )
    }

    case "keyboard":
      return (
        <div className="space-y-3">
          <p className="text-[11px] text-stone-500 mb-2">
            Standard single-key tool bindings and shortcuts. Modifier keys use Ctrl on Windows and ⌘ on Mac.
          </p>
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-200 dark:divide-stone-800">
            {[
              { key: "V", action: "Select Tool" },
              { key: "R", action: "Rectangle / Shape Tool" },
              { key: "D", action: "Freehand Draw Tool" },
              { key: "T", action: "Text Tool" },
              { key: "A", action: "Arrow Tool" },
              { key: "L", action: "Open Library (Components & Blocks)" },
              { key: "⌘K / Ctrl+K", action: "Global Search / Command Palette" },
              { key: "⌘Z / Ctrl+Z", action: "Undo Canvas Action" },
              { key: "⌘Shift+Z", action: "Redo Canvas Action" },
              { key: "⌘D / Ctrl+D", action: "Duplicate Selected Node" },
              { key: "Shift+1", action: "Zoom to Fit" },
              { key: "Shift+0", action: "Zoom to 100%" },
              { key: "Delete / Backspace", action: "Delete Selection" },
            ].map((s) => (
              <div key={s.action} className="flex items-center justify-between px-3 py-2 bg-stone-50/50 dark:bg-stone-900/40">
                <span className="text-stone-700 dark:text-stone-300 font-medium">{s.action}</span>
                <kbd className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-[10px] text-stone-800 dark:text-stone-200 shadow-2xs">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )

    case "storage":
      return (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-stone-900 dark:text-stone-100">Local Storage & IndexedDB</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">Documents and student data persisted offline in your browser</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                Healthy
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Reset Application Preferences</span>
              <span className="text-[11px] text-stone-500">Restores UI settings to defaults without modifying canvas drawings</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Reset all UI and appearance preferences to defaults?")) {
                  resetPrefs()
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
            >
              <ArrowCounterClockwise size={13} />
              <span>Reset UI Defaults</span>
            </button>
          </div>
        </div>
      )

    case "cloud":
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900 dark:text-stone-100">Supabase Cloud Synchronization</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-[11px]">
                {user ? "Connected" : "Offline / Local-Only"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              {user
                ? `Connected as ${user.email}. Documents sync automatically across active sessions.`
                : "Real-time cloud backup, device synchronization, and multi-device sharing."}
            </p>
          </div>
        </div>
      )

    case "sharing":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Default Share Access</span>
              <span className="text-[11px] text-stone-500">Default permission level for new shared links</span>
            </div>
            <select
              defaultValue="viewer"
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
            >
              <option value="viewer">Can View</option>
              <option value="editor">Can Edit</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Password Protection for Links</span>
              <span className="text-[11px] text-stone-500">Allow setting passwords on public share links</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
              Supported (Argon2id)
            </span>
          </div>
        </div>
      )

    case "notifications":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Goal Deadline Reminders</span>
              <span className="text-[11px] text-stone-500">Alerts when chapter completion goals are due</span>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Study Session Chime</span>
              <span className="text-[11px] text-stone-500">Audio chime when focus timer session ends</span>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      )

    case "wifi":
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-2">
            <h4 className="font-semibold text-stone-900 dark:text-stone-100">Local Network (LAN) Live Publishing</h4>
            <p className="text-[11px] text-stone-500">
              Share live wireframes and study canvases with phones, tablets, and computers on the same Wi-Fi network without cloud upload.
            </p>
          </div>
        </div>
      )

    case "privacy":
      return (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} weight="fill" className="text-emerald-500" />
              <h4 className="font-semibold text-stone-900 dark:text-stone-100">Zero Third-Party Telemetry</h4>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Zenithsui does not track your keystrokes, canvas drawings, or study habits. Your documents remain private on your device.
            </p>
          </div>
        </div>
      )

    case "accessibility":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">High Contrast Mode</span>
              <span className="text-[11px] text-stone-500">Increases stroke visibility and border clarity</span>
            </div>
            <Switch
              checked={prefs.highContrast}
              onCheckedChange={(checked) => updatePrefs({ highContrast: checked })}
            />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Large UI Typography</span>
              <span className="text-[11px] text-stone-500">Scales font sizes across controls and panels</span>
            </div>
            <Switch
              checked={prefs.largeText}
              onCheckedChange={(checked) => updatePrefs({ largeText: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Screen Reader Hints</span>
              <span className="text-[11px] text-stone-500">Expanded ARIA labels and live status updates</span>
            </div>
            <Switch
              checked={prefs.screenReaderHints}
              onCheckedChange={(checked) => updatePrefs({ screenReaderHints: checked })}
            />
          </div>
        </div>
      )

    case "advanced":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Rendering Engine</span>
              <span className="text-[11px] text-stone-500">Rough.js sketch risograph renderer</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-[10px]">
              Rough.js 4.6.6
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Deterministic Seeds</span>
              <span className="text-[11px] text-stone-500">Preserves stroke wobble consistently across exports</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
              Active
            </span>
          </div>
        </div>
      )

    case "about":
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Zenithsui</h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Version 2.4.0 Production Release
            </p>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
              A minimalist, paper-like infinite canvas for wireframing, note-taking, and academic planning. Built with Next.js Turbopack, React 19, Rough.js, and Zustand.
            </p>
          </div>
          <div className="text-[11px] text-stone-400 space-y-1">
            <p>© 2026 Zenithsui. Open source under MIT License.</p>
            <p>Local-first, privacy-respecting architecture.</p>
          </div>
        </div>
      )

    case "future":
      return (
        <div className="space-y-3">
          <p className="text-[11px] text-stone-500 mb-3">
            Planned future enhancements. These features are not yet available in the current release.
          </p>
          <div className="space-y-2">
            {[
              {
                title: "Native Mobile Application",
                desc: "iOS & Android companion with offline stylus synchronization and palm rejection.",
                icon: DeviceMobile,
              },
              {
                title: "Live Shared Classrooms",
                desc: "Real-time shared teacher whiteboards with student question queues.",
                icon: Laptop,
              },
              {
                title: "Extended Knowledge-Base Sync",
                desc: "Two-way file synchronization with Obsidian vaults and Anki flashcards.",
                icon: Sparkle,
              },
              {
                title: "Vector PDF & LaTeX Export",
                desc: "Mathematical formula rendering and print-ready vector PDF document export.",
                icon: File,
              },
            ].map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/60 bg-stone-50/40 dark:bg-stone-900/20 opacity-80"
                >
                  <div className="p-2 rounded-lg bg-stone-200/50 dark:bg-stone-800/50 text-stone-500 shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800 dark:text-stone-200 text-xs">
                        {f.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200/60 dark:bg-stone-800/60 text-stone-500 font-medium">
                        Coming soon
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {f.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )

    default:
      return null
  }
}
