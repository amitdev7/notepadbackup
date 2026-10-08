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
  type SettingsSectionId,
  type ThemeMode,
  type UIDensity,
  type StartPage,
  type DockControlsVisibility,
} from "@/lib/shell-store"
import { useSquig } from "@/lib/store"
import { useAuthStore } from "@/lib/auth-store"
import { UI_ACCENTS } from "@/lib/design-tokens"
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
} from "@phosphor-icons/react"

interface SectionItem {
  id: SettingsSectionId
  label: string
  description: string
  icon: React.ElementType
}

const SECTIONS: SectionItem[] = [
  { id: "general", label: "General", description: "Language, timezone, start page and defaults", icon: Sliders },
  { id: "appearance", label: "Appearance", description: "Theme, UI accent, density and animations", icon: Palette },
  { id: "canvas", label: "Canvas & Toolbar", description: "Presentation controls, toolbar and diagnostics", icon: PaintBrush },
  { id: "page", label: "Page", description: "Default paper, ink and grid settings for new pages", icon: File },
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
// Section Content Renderers
// ---------------------------------------------------------------------------

function SectionBody({ section }: { section: SettingsSectionId }) {
  const prefs = useShellStore((s) => s.preferences)
  const updatePrefs = useShellStore((s) => s.updatePreferences)
  const resetPrefs = useShellStore((s) => s.resetPreferences)
  const dockControls = useShellStore((s) => s.preferences.dockControls)
  const updateDockControl = useShellStore((s) => s.updateDockControl)
  const setAllDockControls = useShellStore((s) => s.setAllDockControls)
  const resetDockControls = useShellStore((s) => s.resetDockControls)

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

    case "appearance":
      return (
        <div className="space-y-5">
          <div>
            <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-1">Theme</label>
            <span className="text-[11px] text-stone-500 block mb-2">Switch application surface illumination</span>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    updatePrefs({ themeMode: t })
                    syncThemeToDOM(t)
                  }}
                  className={cn(
                    "py-2 rounded-xl border text-center capitalize font-medium transition-all",
                    prefs.themeMode === t
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-semibold"
                      : "border-stone-200 dark:border-stone-800 hover:border-stone-300"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <label className="font-semibold text-stone-900 dark:text-stone-100 block mb-1">Application UI Accent</label>
            <span className="text-[11px] text-stone-500 block mb-2">
              Controls buttons, active pills, and focus rings (independent from canvas document ink)
            </span>
            <div className="flex items-center gap-2">
              {UI_ACCENTS.map((acc) => {
                const isSelected = prefs.uiAccent === acc.id
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => updatePrefs({ uiAccent: acc.id })}
                    title={acc.label}
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center transition-all",
                      isSelected ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1F]" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: acc.primary }}
                  >
                    {isSelected && <Check size={13} weight="bold" className="text-white" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">UI Density</span>
              <span className="text-[11px] text-stone-500">Spacing in tables, panels, and toolbars</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              {(["comfortable", "compact"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => updatePrefs({ uiDensity: d })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] capitalize transition-all",
                    prefs.uiDensity === d
                      ? "bg-white dark:bg-stone-700 text-stone-950 dark:text-white shadow-2xs font-semibold"
                      : "text-stone-500"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Animations</span>
              <span className="text-[11px] text-stone-500">Smooth panel transitions and modals</span>
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

    case "page":
      return (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60">
            <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Canvas Document Defaults</h4>
            <p className="text-[11px] text-stone-500">
              Configure baseline presets used when creating a new canvas. Existing documents preserve their author look.
            </p>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Default Background Dot Grid</span>
              <span className="text-[11px] text-stone-500">Background spatial guide enabled by default</span>
            </div>
            <Switch checked={grid} onCheckedChange={setGrid} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">Page Boundary Guide</span>
              <span className="text-[11px] text-stone-500">Show default page boundary on new documents</span>
            </div>
            <Switch checked={showPage} onCheckedChange={setShowPage} />
          </div>
        </div>
      )

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
