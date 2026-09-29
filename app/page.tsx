"use client"

import { useEffect } from "react"
import { useSquig } from "@/lib/store"
import { Canvas } from "@/components/canvas/canvas"
import { LeftRail } from "@/components/chrome/left-rail"
import { LibraryPanel } from "@/components/chrome/library-panel"
import { Inspector } from "@/components/chrome/inspector"
import { TopCorner, ZoomPill, CommandHint, TopRight } from "@/components/chrome/top-corner"
import { FileName } from "@/components/chrome/file-name"
import { CommandPalette } from "@/components/chrome/command-palette"
import { CanvasContextMenu } from "@/components/chrome/context-menu"
import { ShortcutsSheet } from "@/components/chrome/shortcuts-sheet"
import { LinkEditor } from "@/components/chrome/link-editor"
import { Notice } from "@/components/chrome/notice"
import { AuthDialog } from "@/components/chrome/auth-dialog"
import { ShareDialog } from "@/components/chrome/share-dialog"
import { WifiPublishDialog } from "@/components/chrome/wifi-publish-dialog"
import { WifiDevicePanel } from "@/components/chrome/wifi-device-panel"
import { ConflictDialog } from "@/components/chrome/conflict-dialog"
import { MigrationDialog } from "@/components/chrome/migration-dialog"
import { VersionHistoryPanel } from "@/components/chrome/version-history-panel"
import { TrashDialog } from "@/components/chrome/trash-dialog"
import { useAuthStore } from "@/lib/auth-store"
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
    <main className="relative h-full">
      <Canvas />
      {/* ⌘\ clears the room — the canvas and what you've selected, nothing else */}
      {!uiHidden && (
        <>
          <TopCorner />
          <TopRight />
          <FileName />
          <LeftRail />
          <LibraryPanel />
          <Inspector />
          <ZoomPill />
          <CommandHint />
        </>
      )}
      {uiHidden && (
        <p className="pointer-events-none absolute right-4 bottom-4 z-30 font-mono text-[10px] text-muted-foreground/60">
          {kbd("mod+\\\\")}
        </p>
      )}
      {/* the flash outlives ⌘\ — a copy still has to say it happened */}
      <Notice />
      <LinkEditor />
      <CanvasContextMenu />
      <CommandPalette />
      <ShortcutsSheet />
      <AuthDialog />
      <ShareDialog isOpen={shareOpen} onClose={() => setShareOpen(false)} cloudDocId={cloudDocId || undefined} />
      <WifiPublishDialog />
      <WifiDevicePanel />
      <ConflictDialog />
      <MigrationDialog />
      <VersionHistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} cloudDocId={cloudDocId || undefined} />
      <TrashDialog />
    </main>
  )
}

