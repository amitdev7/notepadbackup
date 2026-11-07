"use client"

// ---------------------------------------------------------------------------
// Zenithsui Master Website Customizer Tab
//
// The ultimate, all-in-one control center to customize and toggle showing
// each and every single element, toolbar, dock tool, canvas overlay, HUD,
// and media player control on or off across the entire website.
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback } from "react"
import {
  useShellStore,
  DEFAULT_DOCK_CONTROLS,
  DEFAULT_MEDIA_PREFERENCES,
  type DockControlsVisibility,
} from "@/lib/shell-store"
import { useSquig } from "@/lib/store"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Eye,
  EyeSlash,
  Sparkle,
  Sliders,
  PaintBrush,
  MagnifyingGlass,
  Check,
  ArrowCounterClockwise,
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
  Books,
  Microphone,
  Gear,
  Clock,
  Compass,
  File,
  ChartBar,
  Smiley,
  ArrowsIn,
  Video,
  YoutubeLogo,
  ShareNetwork,
  Users,
  ShieldCheck,
  Lightning,
  CornersOut,
  FolderSimple,
} from "@phosphor-icons/react"

interface ControlItem {
  id: string
  name: string
  description: string
  group: "topbar" | "dock" | "toolbar" | "canvas" | "media"
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: React.ElementType
  badge?: string
}

export function WebsiteCustomizerTab() {
  const prefs = useShellStore((s) => s.preferences)
  const updatePrefs = useShellStore((s) => s.updatePreferences)
  const setAllVisibility = useShellStore((s) => s.setAllVisibility)
  const applyPreset = useShellStore((s) => s.applyVisibilityPreset)
  const resetSection = useShellStore((s) => s.resetSectionPreferences)
  const dockControls = prefs.dockControls ?? DEFAULT_DOCK_CONTROLS
  const updateDockControl = useShellStore((s) => s.updateDockControl)
  const setAllDockControls = useShellStore((s) => s.setAllDockControls)
  const updateMediaSettings = useShellStore((s) => s.updateMediaSettings)
  const mediaSettings = prefs.mediaSettings ?? DEFAULT_MEDIA_PREFERENCES

  // Canvas Store bindings
  const grid = useSquig((s) => s.grid)
  const setGrid = useSquig((s) => s.setGrid)
  const showPage = useSquig((s) => s.showPage)
  const setShowPage = useSquig((s) => s.setShowPage)
  const contextRow = useSquig((s) => s.contextRow)
  const setContextRow = useSquig((s) => s.setContextRow)
  const setNotice = useSquig((s) => s.setNotice)
  const setUiHidden = useSquig((s) => s.setUiHidden)

  // Search Filter State
  const [filterQuery, setFilterQuery] = useState("")
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // All customizable controls catalogue
  const allControls: ControlItem[] = useMemo(() => {
    return [
      // ── 1. Top Navigation Bar ──
      {
        id: "topbar-container",
        name: "Top Navigation Bar Container",
        description: "Master capsule header anchored at the top of the canvas",
        group: "topbar",
        checked: prefs.showToolbar ?? true,
        onChange: (checked) => updatePrefs({ showToolbar: checked }),
        icon: Sliders,
        badge: "Master",
      },
      {
        id: "topbar-title",
        name: "Document Title & Rename Input",
        description: "Interactive title field with inline double-click editing",
        group: "topbar",
        checked: prefs.showDocTitle ?? true,
        onChange: (checked) => updatePrefs({ showDocTitle: checked }),
        icon: TextT,
      },
      {
        id: "topbar-sync",
        name: "Sync & Server Status Pill",
        description: "Shows 'Server unavailable • Changes saved locally' and cloud save sync states",
        group: "topbar",
        checked: prefs.showStatusIndicators ?? true,
        onChange: (checked) => updatePrefs({ showStatusIndicators: checked }),
        icon: Lightning,
      },
      {
        id: "topbar-collab",
        name: "Collaboration Presence Pill",
        description: "Displays 'Collab Off' / 'Collab On' and peer avatar circles",
        group: "topbar",
        checked: prefs.showCollabStatus ?? true,
        onChange: (checked) => updatePrefs({ showCollabStatus: checked }),
        icon: Users,
      },
      {
        id: "topbar-clock",
        name: "Real-Time Clock & Location HUD",
        description: "Live time readout and automatic location detection badge in top bar",
        group: "topbar",
        checked: (prefs.clockSettings?.enabled ?? true) && (prefs.clockSettings?.showInTopBar ?? true),
        onChange: (checked) => useShellStore.getState().updateClockPreferences({ showInTopBar: checked }),
        icon: Clock,
      },
      {
        id: "topbar-files",
        name: "Files & Document Switcher Dropdown (📁)",
        description: "Quick canvas switcher, new document, and export options popover",
        group: "topbar",
        checked: prefs.showFilesPopover ?? true,
        onChange: (checked) => updatePrefs({ showFilesPopover: checked }),
        icon: FolderSimple,
      },
      {
        id: "topbar-viewmenu",
        name: "View Menu Compass Pill (🧭)",
        description: "Quick viewport zoom, home view bookmark, and reset button in top bar",
        group: "topbar",
        checked: prefs.showToolbarViewMenu ?? true,
        onChange: (checked) => updatePrefs({ showToolbarViewMenu: checked }),
        icon: Compass,
      },

      // ── 2. Floating Bottom Dock & Tools ──
      {
        id: "dock-container",
        name: "Floating Bottom Dock Container",
        description: "macOS-style magnified dock tray anchored at screen bottom",
        group: "dock",
        checked: prefs.showDock ?? true,
        onChange: (checked) => updatePrefs({ showDock: checked }),
        icon: Sliders,
        badge: "Master",
      },
      {
        id: "tool-select",
        name: "Select / Pointer Tool (V)",
        description: "Arrow cursor for clicking, selecting, and transforming canvas elements",
        group: "dock",
        checked: dockControls.toolSelect ?? true,
        onChange: (checked) => updateDockControl("toolSelect", checked),
        icon: Cursor,
      },
      {
        id: "tool-hand",
        name: "Hand / Pan Canvas Tool (H)",
        description: "Grab and drag infinite canvas workspace viewport",
        group: "dock",
        checked: dockControls.toolHand ?? true,
        onChange: (checked) => updateDockControl("toolHand", checked),
        icon: Hand,
      },
      {
        id: "tool-draw",
        name: "Pencil & Inking Tool (P)",
        description: "Freehand vector sketching with pressure and smoothing",
        group: "dock",
        checked: dockControls.toolDraw ?? true,
        onChange: (checked) => updateDockControl("toolDraw", checked),
        icon: PencilLine,
      },
      {
        id: "tool-highlighter",
        name: "Highlighter Tool (M)",
        description: "Translucent wide chisel marker for text highlighting",
        group: "dock",
        checked: dockControls.toolHighlighter ?? true,
        onChange: (checked) => updateDockControl("toolHighlighter", checked),
        icon: PaintBrush,
      },
      {
        id: "tool-eraser",
        name: "Eraser Tool (E)",
        description: "Touch or click to delete strokes, shapes, and notes",
        group: "dock",
        checked: dockControls.toolEraser ?? true,
        onChange: (checked) => updateDockControl("toolEraser", checked),
        icon: Eraser,
      },
      {
        id: "tool-shape",
        name: "Shapes Tool (R)",
        description: "Rectangles, ellipses, diamonds, stars, and triangles",
        group: "dock",
        checked: dockControls.toolShape ?? true,
        onChange: (checked) => updateDockControl("toolShape", checked),
        icon: Rectangle,
      },
      {
        id: "tool-arrow",
        name: "Arrow & Connector Tool (A)",
        description: "Directional arrows, straight lines, and node connectors",
        group: "dock",
        checked: dockControls.toolArrow ?? true,
        onChange: (checked) => updateDockControl("toolArrow", checked),
        icon: ArrowRight,
      },
      {
        id: "tool-text",
        name: "Text Box Tool (T)",
        description: "Rich typography, headings, labels, and auto-expanding text",
        group: "dock",
        checked: dockControls.toolText ?? true,
        onChange: (checked) => updateDockControl("toolText", checked),
        icon: TextT,
      },
      {
        id: "tool-sticky",
        name: "Sticky Notes Tool (S)",
        description: "Colorful pastel sticky memo notes with markdown support",
        group: "dock",
        checked: dockControls.toolSticky ?? true,
        onChange: (checked) => updateDockControl("toolSticky", checked),
        icon: Note,
      },
      {
        id: "tool-frame",
        name: "Frame / Container Tool (F)",
        description: "Group objects within labeled slide or artboard frames",
        group: "dock",
        checked: dockControls.toolFrame ?? true,
        onChange: (checked) => updateDockControl("toolFrame", checked),
        icon: Crop,
      },
      {
        id: "tool-laser",
        name: "Laser Pointer Tool (K)",
        description: "Presenter laser trail with neon glow and auto-fade decay",
        group: "dock",
        checked: dockControls.toolLaser ?? true,
        onChange: (checked) => updateDockControl("toolLaser", checked),
        icon: Flashlight,
      },
      {
        id: "tool-library",
        name: "Component Library Tool (L)",
        description: "Interactive study trackers, math charts, templates, and UI widgets",
        group: "dock",
        checked: dockControls.toolLibrary ?? true,
        onChange: (checked) => updateDockControl("toolLibrary", checked),
        icon: Books,
      },
      {
        id: "dock-audio",
        name: "Voice Memo Audio Recorder (⌥R)",
        description: "Record spoken thoughts and embed waveform audio clips",
        group: "dock",
        checked: dockControls.actionRecordAudio ?? true,
        onChange: (checked) => updateDockControl("actionRecordAudio", checked),
        icon: Microphone,
      },
      {
        id: "dock-zoom",
        name: "Zoom Stepper Controls",
        description: "Zoom In (+), Zoom Out (-), and percentage scale stepper in dock",
        group: "dock",
        checked: prefs.showZoomControls ?? true,
        onChange: (checked) => updatePrefs({ showZoomControls: checked }),
        icon: CornersOut,
      },
      {
        id: "dock-viewmenu",
        name: "Bottom Dock View Menu (🧭)",
        description: "Compass view controller icon inside the floating dock",
        group: "dock",
        checked: prefs.showDockViewMenu ?? dockControls.viewMenu ?? false,
        onChange: (checked) => {
          updatePrefs({ showDockViewMenu: checked })
          updateDockControl("viewMenu", checked)
        },
        icon: Compass,
      },
      {
        id: "dock-clock",
        name: "Bottom Dock Clock Widget",
        description: "Real-time clock display capsule inside the floating bottom dock",
        group: "dock",
        checked: (prefs.clockSettings?.enabled ?? true) && (prefs.clockSettings?.showInDock ?? false),
        onChange: (checked) => {
          useShellStore.getState().updateClockPreferences({ showInDock: checked })
          updateDockControl("timeClock", checked)
        },
        icon: Clock,
      },

      // ── 3. Selected Object Floating Context Toolbar ──
      {
        id: "toolbar-master",
        name: "Floating Contextual Toolbar Container",
        description: "Compact ~438px toolbar floating directly above selected canvas items",
        group: "toolbar",
        checked: (prefs.showContextToolbar ?? true) && contextRow,
        onChange: (checked) => {
          updatePrefs({ showContextToolbar: checked })
          setContextRow(checked)
        },
        icon: Sliders,
        badge: "Master",
      },
      {
        id: "toolbar-textedit",
        name: "Quick Text Formatting & Font Size Stepper",
        description: "Bold, Italic, Alignment, and numeric point size controls",
        group: "toolbar",
        checked: (prefs.showContextToolbar ?? true) && contextRow,
        onChange: (checked) => {
          updatePrefs({ showContextToolbar: checked })
          setContextRow(checked)
        },
        icon: TextT,
      },
      {
        id: "toolbar-position",
        name: "Position & Dimensions Popover (X, Y, W, H)",
        description: "Numeric coordinate inputs, flip horizontal/vertical, and object lock",
        group: "toolbar",
        checked: (prefs.showContextToolbar ?? true) && contextRow,
        onChange: (checked) => {
          updatePrefs({ showContextToolbar: checked })
          setContextRow(checked)
        },
        icon: Crop,
      },
      {
        id: "toolbar-appearance",
        name: "Appearance, Swatches & Variants Popover",
        description: "Star Accent palette swatches, paperclip toggle, and stroke weights",
        group: "toolbar",
        checked: (prefs.showContextToolbar ?? true) && contextRow,
        onChange: (checked) => {
          updatePrefs({ showContextToolbar: checked })
          setContextRow(checked)
        },
        icon: PaintBrush,
      },
      {
        id: "toolbar-hovernotes",
        name: "Smart Hover Notes Popover & Live Card Preview",
        description: "Add, edit, style, and preview interactive notes on any selected node",
        group: "toolbar",
        checked: prefs.showHoverNotes ?? true,
        onChange: (checked) => updatePrefs({ showHoverNotes: checked }),
        icon: Sparkle,
      },

      // ── 4. Canvas Viewport Overlays, Guides & HUD ──
      {
        id: "canvas-minimap",
        name: "MiniMap Radar Navigator",
        description: "Corner thumbnail overview with clickable viewport radar",
        group: "canvas",
        checked: prefs.showMiniMap ?? true,
        onChange: (checked) => updatePrefs({ showMiniMap: checked }),
        icon: Compass,
      },
      {
        id: "canvas-grid",
        name: "Canvas Dot Grid Background",
        description: "Subtle dot-matrix background pattern for spatial alignment",
        group: "canvas",
        checked: grid,
        onChange: setGrid,
        icon: Rectangle,
      },
      {
        id: "canvas-page",
        name: "Page Boundary Guide Frame",
        description: "Visual A4 paper / presentation frame for export boundary guidance",
        group: "canvas",
        checked: showPage,
        onChange: setShowPage,
        icon: File,
      },
      {
        id: "canvas-fps",
        name: "Performance & FPS Telemetry HUD",
        description: "Live frame rate, draw calls, and heap memory telemetry graph",
        group: "canvas",
        checked: prefs.performanceSettings?.showFpsHud ?? false,
        onChange: (checked) => useShellStore.getState().updatePerformanceSettings({ showFpsHud: checked }),
        icon: Lightning,
      },
      {
        id: "canvas-snap",
        name: "Smart Snapping & Alignment Guide Lines",
        description: "Dynamic blue guidelines that snap objects to center and edges",
        group: "canvas",
        checked: prefs.showSnapGuides ?? true,
        onChange: (checked) => updatePrefs({ showSnapGuides: checked }),
        icon: Crop,
      },
      {
        id: "canvas-peer-cursors",
        name: "Live Collaborator Remote Cursors",
        description: "Display other users' live cursors and name labels on canvas",
        group: "canvas",
        checked: (prefs.liveCollaborationEnabled ?? true) && (prefs.showPeerCursors ?? true),
        onChange: (checked) => updatePrefs({ showPeerCursors: checked }),
        icon: Cursor,
      },
      {
        id: "canvas-peer-chat",
        name: "Remote Cursor Chat Bubbles",
        description: "Display floating chat messages typed above collaborator cursors",
        group: "canvas",
        checked: prefs.showPeerChat ?? true,
        onChange: (checked) => updatePrefs({ showPeerChat: checked }),
        icon: Smiley,
      },
      {
        id: "canvas-laser-ribbon",
        name: "Laser Pointer Ribbon & Neon Glow",
        description: "Continuous polygon ribbon trail with GPU-accelerated neon decay",
        group: "canvas",
        checked: prefs.showLaserRibbon ?? true,
        onChange: (checked) => updatePrefs({ showLaserRibbon: checked }),
        icon: Flashlight,
      },
      {
        id: "canvas-hover-cards",
        name: "Smart Hover Note Floating Cards",
        description: "Floating frosted glass note cards revealed when hovering canvas objects",
        group: "canvas",
        checked: prefs.showHoverNotes ?? true,
        onChange: (checked) => updatePrefs({ showHoverNotes: checked }),
        icon: Sparkle,
      },
      {
        id: "canvas-temporary-countdown",
        name: "Temporary Elements Countdown Badges",
        description: "Live countdown pills above temporary expiring canvas notes",
        group: "canvas",
        checked: prefs.temporarySettings?.showCountdown ?? true,
        onChange: (checked) => useShellStore.getState().updateTemporarySettings({ showCountdown: checked }),
        icon: Clock,
      },
      {
        id: "canvas-toasts",
        name: "Notification Banners & Toast Messages",
        description: "Transient save confirmations and action feedback toasts at bottom center",
        group: "canvas",
        checked: prefs.showNoticeToasts ?? true,
        onChange: (checked) => updatePrefs({ showNoticeToasts: checked }),
        icon: Note,
      },

      // ── 5. Media & Embedded Players ──
      {
        id: "media-cleanmode",
        name: "Clean Studio Mode by Default",
        description: "Automatically strip native YouTube controls, title bars, and annotations",
        group: "media",
        checked: mediaSettings.cleanModeDefault,
        onChange: (checked) => updateMediaSettings({ cleanModeDefault: checked }),
        icon: YoutubeLogo,
        badge: "Clean",
      },
      {
        id: "media-headercontrols",
        name: "Video Card Header Controls Bar",
        description: "Shifted controls bar (Play, Mute, CC, 1080p, Speed, Fullscreen) above video",
        group: "media",
        checked: mediaSettings.showHeaderControls,
        onChange: (checked) => updateMediaSettings({ showHeaderControls: checked }),
        icon: Video,
      },
      {
        id: "media-1080p",
        name: "Always Enforce 1080p HD Quality",
        description: "Force high-definition playback streams without downscaling",
        group: "media",
        checked: mediaSettings.alwaysEnforce1080p,
        onChange: (checked) => updateMediaSettings({ alwaysEnforce1080p: checked }),
        icon: Sparkle,
      },
      {
        id: "media-scrubber",
        name: "Video Progress Scrubber Line",
        description: "Thin progress scrubber line positioned between header and player viewport",
        group: "media",
        checked: mediaSettings.showScrubberLine,
        onChange: (checked) => updateMediaSettings({ showScrubberLine: checked }),
        icon: Sliders,
      },
      {
        id: "media-hoverpill",
        name: "Floating Frosted Hover Controls Pill",
        description: "Frosted-glass floating scrubber bar that fades in on mouse hover",
        group: "media",
        checked: mediaSettings.showHoverControls,
        onChange: (checked) => updateMediaSettings({ showHoverControls: checked }),
        icon: Sliders,
      },
      {
        id: "media-centerplay",
        name: "Centered Apple Glass Play Button",
        description: "Large frosted-glass play icon centered over paused video streams",
        group: "media",
        checked: mediaSettings.showCenterPlayButton,
        onChange: (checked) => updateMediaSettings({ showCenterPlayButton: checked }),
        icon: Video,
      },
      {
        id: "media-embedheader",
        name: "Web Embed Favicon & Title Bar",
        description: "Display external website domain and favicon header above iframes",
        group: "media",
        checked: mediaSettings.showEmbedHeader ?? true,
        onChange: (checked) => updateMediaSettings({ showEmbedHeader: checked }),
        icon: Compass,
      },
      {
        id: "media-fallbacks",
        name: "Instagram & Restricted Frame Fallback Cards",
        description: "Safe interactive card with direct-open link for X-Frame restricted domains",
        group: "media",
        checked: mediaSettings.showFallbackCards ?? true,
        onChange: (checked) => updateMediaSettings({ showFallbackCards: checked }),
        icon: ShieldCheck,
      },
    ]
  }, [prefs, dockControls, mediaSettings, grid, showPage, contextRow, updatePrefs, updateDockControl, updateMediaSettings, setGrid, setShowPage, setContextRow])

  // Filtered controls based on user query
  const filteredControls = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    if (!q) return allControls
    return allControls.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
    )
  }, [allControls, filterQuery])

  // Grouped segments
  const groups: {
    key: "topbar" | "dock" | "toolbar" | "canvas" | "media"
    title: string
    description: string
    icon: React.ElementType
  }[] = [
    {
      key: "topbar",
      title: "Top Navigation Bar",
      description: "Header capsule, title rename, sync pill, collaboration presence, and quick menus",
      icon: Sliders,
    },
    {
      key: "dock",
      title: "Floating Bottom Dock & Drawing Tools",
      description: "Magnified bottom tool tray, drawing tools, recorder, and dock modules",
      icon: PaintBrush,
    },
    {
      key: "toolbar",
      title: "Selected Object Floating Context Toolbar",
      description: "Compact ~438px toolbar attached to selected items with styling popovers",
      icon: Crop,
    },
    {
      key: "canvas",
      title: "Canvas Viewport Overlays, Guides & HUD",
      description: "MiniMap radar, dot grid, page boundary, laser pointer, and peer presence",
      icon: Sparkle,
    },
    {
      key: "media",
      title: "Media & Video Players Controls (YouTube, Audio, Embeds)",
      description: "Clean studio mode, 1080p enforcing, header bars, scrubbers, and fallback cards",
      icon: YoutubeLogo,
    },
  ]

  // Master Action handlers
  const handleShowAll = useCallback(() => {
    setAllVisibility(true)
    setUiHidden(false)
    setContextRow(true)
    setGrid(true)
    setShowPage(true)
    setActivePreset("studio")
    setNotice("All interface elements, docks, overlays and media controls enabled! ✨")
  }, [setAllVisibility, setUiHidden, setContextRow, setGrid, setShowPage, setNotice])

  const handleHideAll = useCallback(() => {
    setAllVisibility(false)
    setUiHidden(true)
    setContextRow(false)
    setGrid(false)
    setShowPage(false)
    setActivePreset("zen")
    setNotice("Pure Canvas Zen: All interface chrome and toolbars hidden! 🧘")
  }, [setAllVisibility, setUiHidden, setContextRow, setGrid, setShowPage, setNotice])

  const handleApplyPreset = useCallback((preset: "studio" | "zen" | "balanced" | "presenter" | "sketcher") => {
    applyPreset(preset)
    setActivePreset(preset)
    if (preset === "studio") {
      setUiHidden(false)
      setContextRow(true)
      setGrid(true)
      setShowPage(true)
      setNotice("Studio Pro preset activated: All tools & diagnostics active! 🚀")
    } else if (preset === "zen") {
      setUiHidden(true)
      setContextRow(true)
      setGrid(false)
      setShowPage(false)
      setNotice("Minimalist Zen preset activated: Pure canvas with floating toolbar! 🧘")
    } else if (preset === "balanced") {
      setUiHidden(false)
      setContextRow(true)
      setGrid(true)
      setShowPage(true)
      setNotice("Balanced Clean preset activated: Standard productivity view! 🎯")
    } else if (preset === "presenter") {
      setUiHidden(true)
      setContextRow(false)
      setNotice("Presenter Mode activated: Clean display with laser pointer & cursors! 📺")
    } else if (preset === "sketcher") {
      setUiHidden(false)
      setContextRow(true)
      setGrid(true)
      setNotice("Digital Sketcher preset activated: Pencil, eraser, colors & grid active! ✏️")
    }
  }, [applyPreset, setUiHidden, setContextRow, setGrid, setShowPage, setNotice])

  // Bulk group toggles
  const handleToggleGroup = useCallback((groupKey: "topbar" | "dock" | "toolbar" | "canvas" | "media", enable: boolean) => {
    const items = allControls.filter((c) => c.group === groupKey)
    items.forEach((item) => item.onChange(enable))
    setNotice(`${enable ? "Enabled" : "Disabled"} all items in ${groupKey}!`)
  }, [allControls, setNotice])

  return (
    <div className="space-y-6">
      {/* ── Top Master Banner: 1-Click Master Switches & Presets ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-violet-500/15 border border-blue-500/30 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Eye size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">Website Customizer & Visibility Hub</h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Master Hub
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Toggle showing each and every single element on or off across the entire Zenithsui platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={handleShowAll}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
            >
              <Eye size={15} weight="bold" />
              <span>Show Everything</span>
            </button>
            <button
              type="button"
              onClick={handleHideAll}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-500/20 hover:bg-stone-500/30 text-stone-700 dark:text-stone-300 border border-stone-500/40 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
            >
              <EyeSlash size={15} weight="bold" />
              <span>Hide Everything</span>
            </button>
          </div>
        </div>

        {/* Workspace Quick Presets Carousel */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkle size={13} weight="fill" className="text-amber-400" />
              <span>1-Click Workspace Presets</span>
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset("balanced")}
              className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <ArrowCounterClockwise size={11} />
              <span>Reset to Balanced Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "studio", label: "Studio Pro", icon: Lightning, desc: "All tools & HUD on" },
              { id: "zen", label: "Minimalist Zen", icon: EyeSlash, desc: "Pure canvas" },
              { id: "balanced", label: "Balanced", icon: Check, desc: "Clean defaults" },
              { id: "presenter", label: "Presenter", icon: Video, desc: "Laser & peer view" },
              { id: "sketcher", label: "Sketchpad", icon: PencilLine, desc: "Inking & grid only" },
            ].map((preset) => {
              const Icon = preset.icon
              const isSelected = activePreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all cursor-pointer select-none",
                    isSelected
                      ? "bg-blue-600 text-white border-blue-500 shadow-md scale-102 font-bold"
                      : "bg-background/40 hover:bg-background/80 border-border/60 text-foreground hover:scale-101"
                  )}
                >
                  <Icon size={16} weight={isSelected ? "bold" : "regular"} className="mb-1" />
                  <span className="text-xs font-semibold">{preset.label}</span>
                  <span className={cn("text-[9px] truncate max-w-full", isSelected ? "text-blue-100" : "text-muted-foreground")}>
                    {preset.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="relative">
        <MagnifyingGlass
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter controls by name (e.g. clock, collab, youtube, laser, dock, zoom, pen, title)..."
          className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-border/80 bg-background/50 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        {filterQuery && (
          <button
            type="button"
            onClick={() => setFilterQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Categorized Sections ── */}
      <div className="space-y-6">
        {groups.map((group) => {
          const items = filteredControls.filter((c) => c.group === group.key)
          if (items.length === 0) return null

          const allGroupChecked = items.every((c) => c.checked)
          const someGroupChecked = items.some((c) => c.checked)
          const Icon = group.icon

          return (
            <div key={group.key} className="space-y-3 p-4 rounded-xl border border-border/60 bg-muted/15 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/40 gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Icon size={14} weight="bold" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>{group.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                        {items.length} items
                      </span>
                    </h5>
                    <p className="text-[10px] text-muted-foreground">{group.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group.key, true)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    Enable All
                  </button>
                  <span className="text-border">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group.key, false)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold text-stone-500 hover:bg-stone-500/10 cursor-pointer"
                  >
                    Disable All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {items.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border transition-all",
                        item.checked
                          ? "bg-background/80 border-border/80 shadow-2xs"
                          : "bg-muted/30 border-transparent opacity-65 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-2.5 pr-2 min-w-0">
                        {ItemIcon && (
                          <div className={cn(
                            "size-7 rounded-md flex items-center justify-center shrink-0 text-xs",
                            item.checked
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <ItemIcon size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-foreground truncate block">
                              {item.name}
                            </span>
                            {item.badge && (
                              <span className="px-1 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground line-clamp-1 block">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <Switch
                        checked={item.checked}
                        onCheckedChange={item.onChange}
                        className="shrink-0"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredControls.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No controls found matching &ldquo;{filterQuery}&rdquo;. Try another search term.
          </div>
        )}
      </div>
    </div>
  )
}
