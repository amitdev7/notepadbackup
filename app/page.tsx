"use client"

import { useEffect } from "react"
import { useSquig } from "@/lib/store"
import { Canvas } from "@/components/canvas/canvas"
import { TopBar } from "@/components/shell/top-bar"
import { BottomDock } from "@/components/shell/bottom-dock"
import { PagePopover } from "@/components/shell/page-popover"
import { SettingsDialog } from "@/components/shell/settings-dialog"
import { LibraryPanel } from "@/components/chrome/library-panel"
import { CommandPalette } from "@/components/chrome/command-palette"
import { CanvasContextMenu } from "@/components/chrome/context-menu"
import { ShortcutsSheet } from "@/components/chrome/shortcuts-sheet"
import { LinkEditor } from "@/components/chrome/link-editor"
import { Notice } from "@/components/chrome/notice"
import { ShareDialog } from "@/components/chrome/share-dialog"
import { WifiPublishDialog } from "@/components/chrome/wifi-publish-dialog"
import { WifiDevicePanel } from "@/components/chrome/wifi-device-panel"
import { ConflictDialog } from "@/components/chrome/conflict-dialog"
import { MigrationDialog } from "@/components/chrome/migration-dialog"
import { VersionHistoryPanel } from "@/components/chrome/version-history-panel"
import { TrashDialog } from "@/components/chrome/trash-dialog"
import { ExpiredElementsDialog } from "@/components/chrome/expired-elements-dialog"
import { PdfToCanvasDialog } from "@/components/canvas/pdf-to-canvas-dialog"
import { CanvasSearch } from "@/components/canvas/canvas-search"
import { CanvasStats } from "@/components/canvas/canvas-stats"
import { LaserOverlay } from "@/components/canvas/laser-overlay"
import { MiniMapOverlay } from "@/components/canvas/minimap-overlay"
import { PresenterMode } from "@/components/canvas/presenter-mode"
import { SpotlightOverlay } from "@/components/canvas/spotlight-overlay"
import { CursorReactions } from "@/components/canvas/cursor-reactions"
import { RemoteCursors } from "@/components/canvas/remote-cursors"
import { FollowModeIndicator } from "@/components/canvas/follow-mode-indicator"
import { useCollabTransport } from "@/lib/collaboration/collab-transport"
import { ToolPropertiesPanel } from "@/components/canvas/tool-properties-panel"
import { useAuthStore } from "@/lib/auth-store"
import { syncThemeToDOM, useShellStore } from "@/lib/shell-store"
import { migrateLocalStorageToIndexedDB } from "@/lib/storage/migration"
import { kbd } from "@/lib/shortcuts"
import { useTranslation } from "@/lib/i18n/use-translation"
import { X } from "@phosphor-icons/react"

export default function Home() {
  useCollabTransport()
  const { t } = useTranslation()
  const hydrated = useSquig((s) => s.hydrated)
  const hydrate = useSquig((s) => s.hydrate)
  const uiHidden = useSquig((s) => s.uiHidden)
  const setUiHidden = useSquig((s) => s.setUiHidden)
  const shareOpen = useSquig((s) => s.shareOpen)
  const setShareOpen = useSquig((s) => s.setShareOpen)
  const historyOpen = useSquig((s) => s.historyOpen)
  const setHistoryOpen = useSquig((s) => s.setHistoryOpen)
  const cloudDocId = useSquig((s) => s.cloudDocId)

  // Lazy dialog visibility selectors to keep initial DOM lightweight
  const settingsOpen = useShellStore((s) => s.settingsOpen)
  const zenModeKeybind = useShellStore((s) => s.preferences.zenModeKeybind || "mod+\\")
  const zenModeExitHint = useShellStore((s) => s.preferences.zenModeExitHint ?? true)
  const commandOpen = useSquig((s) => s.commandOpen)
  const shortcutsOpen = useSquig((s) => s.shortcutsOpen)
  const trashOpen = useSquig((s) => s.trashOpen)
  const expiredArchiveOpen = useShellStore((s) => s.expiredArchiveOpen)
  const pdfToCanvasOpen = useSquig((s) => Boolean(s.pdfToCanvasDialog?.open))
  const searchOpen = useSquig((s) => s.searchOpen)
  const statsOpen = useSquig((s) => s.statsOpen)

  useEffect(() => {
    useSquig.getState().setEffectiveRole("owner")
    hydrate()
    syncThemeToDOM(useShellStore.getState().preferences.themeMode)
    useAuthStore.getState().initialize()
    migrateLocalStorageToIndexedDB()

    // Check URL ?doc= parameter and open requested document if specified
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const requestedDocId = urlParams.get("doc")
      if (requestedDocId && requestedDocId !== useSquig.getState().docId) {
        useSquig.getState().openFile(requestedDocId)
      }
    } catch {}

    const onExit = () => {
      useSquig.getState().saveNow()
    }
    window.addEventListener("beforeunload", onExit)
    window.addEventListener("pagehide", onExit)

    // Register desktop close handshake to flush unsaved changes
    if (typeof window !== "undefined" && window.zenithsuiDesktop) {
      const cleanup = window.zenithsuiDesktop.onSaveBeforeClose(async () => {
        console.log("[Zenithsui] Desktop shutdown requested. Flushing pending canvas saves...")
        useSquig.getState().saveNow()
      })
      return () => {
        window.removeEventListener("beforeunload", onExit)
        window.removeEventListener("pagehide", onExit)
        cleanup()
      }
    }

    return () => {
      window.removeEventListener("beforeunload", onExit)
      window.removeEventListener("pagehide", onExit)
    }
  }, [hydrate])

  if (!hydrated) {
    return (
      <main className="flex h-full items-center justify-center" style={{ backgroundColor: "var(--sq-bg)" }}>
        <p className="text-xl" style={{ color: "var(--sq-muted)", fontFamily: "var(--sq-font)" }}>
          warming up the pencils…
        </p>
      </main>
    )
  }

  return (
    <main className="relative h-full overflow-hidden select-none">
      <Canvas />

      {/* ⌘\ clears the room — canvas and what you've selected, nothing else */}
      {!uiHidden && (
        <>
          <TopBar />
          <BottomDock />
          <PagePopover />
          {settingsOpen && <SettingsDialog />}
          <LibraryPanel />
        </>
      )}

      {uiHidden && zenModeExitHint && (
        <aside
          aria-label="Pure Canvas Mode Indicator"
          className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-border/40 bg-background/50 py-1.5 pr-2.5 pl-3.5 text-xs text-muted-foreground/75 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-border/80 hover:bg-background/90 hover:text-foreground hover:shadow-md"
        >
          <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium tracking-tight">{t("pure_canvas_badge")}</span>
          <span className="text-muted-foreground/30">•</span>
          <kbd className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
            {kbd(zenModeKeybind)}
          </kbd>
          <button
            type="button"
            onClick={() => setUiHidden(false)}
            className="ml-1 rounded-full p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Restore Interface (or press Esc)"
            aria-label={t("exit_pure_canvas")}
          >
            <X size={12} weight="bold" />
          </button>
        </aside>
      )}

      {/* Notification flash banner */}
      <Notice />

      {/* Overlays, Palettes & Floating Modals (Mounted strictly when activated) */}
      <LinkEditor />
      <CanvasContextMenu />
      {!uiHidden && commandOpen && <CommandPalette />}
      {!uiHidden && shortcutsOpen && <ShortcutsSheet />}
      {shareOpen && <ShareDialog isOpen={shareOpen} onClose={() => setShareOpen(false)} cloudDocId={cloudDocId || undefined} />}
      <WifiPublishDialog />
      <WifiDevicePanel />
      <ConflictDialog />
      <MigrationDialog />
      {historyOpen && <VersionHistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} cloudDocId={cloudDocId || undefined} />}
      {!uiHidden && trashOpen && <TrashDialog />}
      {!uiHidden && expiredArchiveOpen && <ExpiredElementsDialog />}
      {!uiHidden && pdfToCanvasOpen && <PdfToCanvasDialog />}
      {!uiHidden && searchOpen && <CanvasSearch />}
      {!uiHidden && statsOpen && <CanvasStats />}
      <LaserOverlay />
      <MiniMapOverlay />
      <PresenterMode />
      <SpotlightOverlay />
      <CursorReactions />
      <RemoteCursors />
      <FollowModeIndicator />
      {!uiHidden && <ToolPropertiesPanel />}
    </main>
  )
}

