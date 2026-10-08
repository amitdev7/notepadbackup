"use client"

import { useEffect } from "react"
import { useSquig } from "@/lib/store"
import { Canvas } from "@/components/canvas/canvas"
import { TopBar } from "@/components/shell/top-bar"
import { BottomDock } from "@/components/shell/bottom-dock"
import { PagePopover } from "@/components/shell/page-popover"
import { SettingsDialog } from "@/components/shell/settings-dialog"
import { LibraryPanel } from "@/components/chrome/library-panel"
import { Inspector } from "@/components/chrome/inspector"
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
import { PdfToCanvasDialog } from "@/components/canvas/pdf-to-canvas-dialog"
import { CanvasSearch } from "@/components/canvas/canvas-search"
import { CanvasStats } from "@/components/canvas/canvas-stats"
import { LaserOverlay } from "@/components/canvas/laser-overlay"
import { ToolPropertiesPanel } from "@/components/canvas/tool-properties-panel"
import { useAuthStore } from "@/lib/auth-store"
import { syncThemeToDOM, useShellStore } from "@/lib/shell-store"
import { migrateLocalStorageToIndexedDB } from "@/lib/storage/migration"
import { kbd } from "@/lib/shortcuts"

export default function Home() {
  const hydrated = useSquig((s) => s.hydrated)
  const hydrate = useSquig((s) => s.hydrate)
  const uiHidden = useSquig((s) => s.uiHidden)
  const shareOpen = useSquig((s) => s.shareOpen)
  const setShareOpen = useSquig((s) => s.setShareOpen)
  const historyOpen = useSquig((s) => s.historyOpen)
  const setHistoryOpen = useSquig((s) => s.setHistoryOpen)
  const cloudDocId = useSquig((s) => s.cloudDocId)

  useEffect(() => {
    hydrate()
    syncThemeToDOM(useShellStore.getState().preferences.themeMode)
    useAuthStore.getState().initialize()
    migrateLocalStorageToIndexedDB()
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
          <SettingsDialog />
          <LibraryPanel />
          <Inspector />
        </>
      )}

      {uiHidden && (
        <p className="pointer-events-none absolute right-4 bottom-4 z-30 font-mono text-[10px] text-muted-foreground/60">
          {kbd("mod+\\\\")}
        </p>
      )}

      {/* Notification flash banner */}
      <Notice />

      {/* Overlays, Palettes & Floating Modals */}
      <LinkEditor />
      <CanvasContextMenu />
      <CommandPalette />
      <ShortcutsSheet />
      <ShareDialog isOpen={shareOpen} onClose={() => setShareOpen(false)} cloudDocId={cloudDocId || undefined} />
      <WifiPublishDialog />
      <WifiDevicePanel />
      <ConflictDialog />
      <MigrationDialog />
      <VersionHistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} cloudDocId={cloudDocId || undefined} />
      <TrashDialog />
      <PdfToCanvasDialog />
      <CanvasSearch />
      <CanvasStats />
      <LaserOverlay />
      {!uiHidden && <ToolPropertiesPanel />}
    </main>
  )
}

