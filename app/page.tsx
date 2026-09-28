"use client"

import { useEffect, useMemo } from "react"
import { useSquig } from "@/lib/store"
import { Canvas } from "@/components/canvas/canvas"
import { CanvasErrorBoundary } from "@/components/canvas/canvas-error-boundary"
import { LeftRail } from "@/components/chrome/left-rail"
import { LibraryPanel } from "@/components/chrome/library-panel"
import { Inspector } from "@/components/chrome/inspector"
import { TopCorner, ZoomPill, CommandHint } from "@/components/chrome/top-corner"
import { FileName } from "@/components/chrome/file-name"
import { CommandPalette } from "@/components/chrome/command-palette"
import { CanvasContextMenu } from "@/components/chrome/context-menu"
import { ShortcutsSheet } from "@/components/chrome/shortcuts-sheet"
import { DatabaseModal } from "@/components/chrome/database-modal"
import { UnlockModal } from "@/components/chrome/unlock-modal"
import { PagePasswordModal } from "@/components/chrome/page-password-modal"
import { ShareModal } from "@/components/chrome/share-modal"
import { VersionHistoryModal } from "@/components/chrome/version-history-modal"
import { TeamSettingsModal } from "@/components/chrome/team-settings-modal"
import { CreateTeamModal } from "@/components/chrome/create-team-modal"
import { InvitationModal } from "@/components/chrome/invitation-modal"
import { VersionPreviewBanner } from "@/components/chrome/version-preview-banner"
import { LinkEditor } from "@/components/chrome/link-editor"
import { Notice } from "@/components/chrome/notice"
import { ZenithAIPanel } from "@/components/chrome/zenith-ai-panel"
import { ZenithAISettingsModal } from "@/components/chrome/zenith-ai-settings-modal"
import { ZenithAIConnectModal } from "@/components/chrome/zenith-ai-connect-modal"
import { AuthModal } from "@/components/chrome/auth-modal"
import { PdfClassroomModal } from "@/components/pdf-classroom/pdf-classroom-modal"
import { WorkspaceHomeModal } from "@/components/chrome/workspace-home-modal"
import { HandwritingModal } from "@/components/chrome/handwriting-modal"
import { SLMLearningModal } from "@/components/chrome/slm-learning-modal"
import { PresentationToolbar } from "@/components/chrome/presentation-toolbar"
import { ColorSizeStudioModal } from "@/components/chrome/color-size-studio-modal"
import { useZenithAI } from "@/lib/ai/ai-store"
import type { DrawNode } from "@/lib/types"
import { kbd } from "@/lib/shortcuts"

export default function Home() {
  const hydrated = useSquig((s) => s.hydrated)
  const hydrate = useSquig((s) => s.hydrate)
  const uiHidden = useSquig((s) => s.uiHidden)
  const workspaceHomeOpen = useSquig((s) => s.workspaceHomeOpen)
  const setWorkspaceHomeOpen = useSquig((s) => s.setWorkspaceHomeOpen)
  const handwritingModalOpen = useSquig((s) => s.handwritingModalOpen)
  const setHandwritingModalOpen = useSquig((s) => s.setHandwritingModalOpen)
  const selection = useSquig((s) => s.selection)
  const nodes = useSquig((s) => s.nodes)
  const selectedDrawNodes = useMemo(() => {
    if (!selection || !selection.length || !nodes) return []
    return selection.map((id) => nodes[id]).filter((n): n is DrawNode => n?.type === "draw")
  }, [selection, nodes])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Global ⌘J shortcut for Zenith AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault()
        useZenithAI.getState().toggleOpen()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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
      <CanvasErrorBoundary>
        <Canvas />
      </CanvasErrorBoundary>
      {/* ⌘\ clears the room — the canvas and what you've selected, nothing else */}
      {!uiHidden && (
        <>
          <TopCorner />
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
          {kbd("mod+\\")}
        </p>
      )}
      {/* the flash outlives ⌘\ — a copy still has to say it happened */}
      <Notice />
      <VersionPreviewBanner />
      <LinkEditor />
      <CanvasContextMenu />
      <CommandPalette />
      <ShortcutsSheet />
      <DatabaseModal />
      <UnlockModal />
      <PagePasswordModal />
      <ShareModal />
      <VersionHistoryModal />
      <TeamSettingsModal />
      <CreateTeamModal />
      <InvitationModal />
      <ZenithAIPanel />
      <ZenithAISettingsModal />
      <ZenithAIConnectModal />
      <AuthModal />
      <PdfClassroomModal />
      <WorkspaceHomeModal
        open={workspaceHomeOpen}
        onClose={() => setWorkspaceHomeOpen(false)}
      />
      <HandwritingModal
        open={handwritingModalOpen}
        onClose={() => setHandwritingModalOpen(false)}
        drawNodes={selectedDrawNodes}
      />
      <SLMLearningModal />
      <PresentationToolbar />
      <ColorSizeStudioModal />
    </main>
  )
}
