"use client"

// ---------------------------------------------------------------------------
// The canvas keyboard — every shortcut the cheat sheet (`?`) advertises.
//
// One global keydown listener, mounted once from the home page. It stands down
// whenever something else owns the keyboard (typing somewhere, a dialog / menu
// / modal open, the palette or sheets up, the text editor live), so a hotkey
// never fires alongside the thing it would disturb. The clipboard keys live in
// use-clipboard instead — they ride the browser's copy/cut/paste events.
// ---------------------------------------------------------------------------

import { useEffect } from "react"

import { useSquig } from "@/lib/store"
import { exportZenithsui } from "@/lib/file-io"
import { hasEditableText } from "./edit-target"
import { canvasOwnsKeyboard } from "./keyboard-owner"

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useSquig.getState
      const s = st()

      // ⌘J belongs to the AI copilot (page.tsx) — never swallow it here.
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyJ") return

      // Escape works over anything we track, most-recent first.
      if (e.key === "Escape") {
        if (s.editingId != null) return // the overlay commits itself
        if (s.commandOpen) { st().setCommandOpen(false); return }
        if (s.shortcutsOpen) { st().setShortcutsOpen(false); return }
        if (s.linkOpen) { st().setLinkOpen(false); return }
        if (s.contextMenu) { st().setContextMenu(null); return }
        if (s.passwordModalOpen) { st().setPasswordModalOpen(false); return }
        if (s.unlockModalOpen) { st().setUnlockModalOpen(false); return }
        if (s.databaseModalOpen) { st().setDatabaseModalOpen(false); return }
        if (s.shareModalOpen) { st().setShareModalOpen(false); return }
        if (s.versionHistoryOpen) { st().closeVersionHistory(); return }
        if (s.workspaceHomeOpen) { st().setWorkspaceHomeOpen(false); return }
        if (s.handwritingModalOpen) { st().setHandwritingModalOpen(false); return }
        if (s.colorSizeStudioOpen) { st().setColorSizeStudioOpen(false); return }
        if (s.authModalOpen) { st().setAuthModalOpen(false); return }
        if (s.slmLearningModalOpen) { st().setSlmLearningModalOpen(false); return }
        if (s.panel) { st().setPanel(null); return }
        if (s.tool !== "select") { st().setTool("select"); return }
        if (s.selection.length) { st().selectNone(); return }
        return
      }

      // A modal / palette / sheet / editor / presentation owns the keys.
      if (
        s.commandOpen || s.shortcutsOpen || s.linkOpen ||
        s.shareModalOpen || s.databaseModalOpen || s.versionHistoryOpen ||
        s.workspaceHomeOpen || s.handwritingModalOpen || s.colorSizeStudioOpen ||
        s.passwordModalOpen || s.unlockModalOpen || s.authModalOpen ||
        s.slmLearningModalOpen || s.activePdfModalNodeId != null ||
        s.presentationMode || s.editingId != null || s.contextMenu
      ) return
      if (!canvasOwnsKeyboard(e.target)) return

      const mod = e.metaKey || e.ctrlKey
      const alt = e.altKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()
      const code = e.code
      const hasSel = s.selection.length > 0
      const hasTextSel = s.selection.some((id) => s.nodes[id]?.type === "text")

      // ⌘K / ⌘/ — over selected text it links, everywhere else it searches.
      if (mod && !alt && (code === "KeyK" || code === "Slash")) {
        e.preventDefault()
        if (hasTextSel) st().setLinkOpen(true)
        else st().setCommandOpen(true)
        return
      }

      if (mod && !alt && code === "KeyS") {
        e.preventDefault()
        if (shift) exportZenithsui()
        else {
          st().flushSave()
          // ⌘S says so out loud — the autosaves along the way stay quiet.
          useSquig.setState((prev) => ({ saveFlash: prev.saveFlash + 1 }))
        }
        return
      }

      if (mod && shift && code === "KeyP") {
        e.preventDefault()
        st().openClassroom()
        return
      }

      if (mod && !alt && code === "KeyZ") {
        e.preventDefault()
        if (shift) st().redo()
        else st().undo()
        return
      }
      if (mod && !alt && !shift && code === "KeyY") {
        e.preventDefault()
        st().redo()
        return
      }

      if (mod && !alt && !shift && code === "KeyD") {
        e.preventDefault()
        st().duplicateSelected()
        return
      }

      if (mod && !alt && !shift && code === "KeyA") {
        e.preventDefault()
        st().selectAll()
        return
      }

      if (mod && !alt && !shift && code === "KeyG") {
        e.preventDefault()
        st().groupSelected()
        return
      }
      if (mod && !alt && shift && code === "KeyG") {
        e.preventDefault()
        st().ungroupSelected()
        return
      }
      if (mod && alt && code === "KeyB") {
        e.preventDefault()
        st().detachSelected()
        return
      }

      // Arrange: ⌘] / ⌘[ one step, ⌥⌘] / ⌥⌘[ (or ] / [) all the way.
      if (code === "BracketRight" || code === "BracketLeft") {
        const fwd = code === "BracketRight"
        if (mod && alt) {
          e.preventDefault()
          if (fwd) st().bringToFront()
          else st().sendToBack()
          return
        }
        if (mod && shift) {
          e.preventDefault()
          if (fwd) st().bringToFront()
          else st().sendToBack()
          return
        }
        if (mod) {
          e.preventDefault()
          if (fwd) st().bringForward()
          else st().sendBackward()
          return
        }
        if (!hasSel) return
        e.preventDefault()
        if (fwd) st().bringToFront()
        else st().sendToBack()
        return
      }

      if (mod && !alt && !shift && code === "KeyB") {
        e.preventDefault()
        st().toggleTextStyle("bold")
        return
      }
      if (mod && !alt && !shift && code === "KeyI") {
        e.preventDefault()
        st().toggleTextStyle("italic")
        return
      }
      if (mod && !alt && !shift && code === "KeyU") {
        e.preventDefault()
        st().toggleTextStyle("underline")
        return
      }

      if (mod && (key === "+" || key === "=")) {
        e.preventDefault()
        st().zoomBy(1.25)
        return
      }
      if (mod && key === "-") {
        e.preventDefault()
        st().zoomBy(1 / 1.25)
        return
      }
      if (mod && !alt && !shift && key === "0") {
        e.preventDefault()
        st().setViewport({ x: 0, y: 0, zoom: 1 })
        return
      }

      if (mod && !alt && shift && (code === "Backslash" || e.key === "\\")) {
        st().setUiHidden(!s.uiHidden)
        return
      }

      // Nudge — arrows move the selection, ⇧ for 10px.
      if (code === "ArrowLeft" || code === "ArrowRight" || code === "ArrowUp" || code === "ArrowDown") {
        if (!hasSel) return
        e.preventDefault()
        const step = shift ? 10 : 1
        const dx = code === "ArrowLeft" ? -step : code === "ArrowRight" ? step : 0
        const dy = code === "ArrowUp" ? -step : code === "ArrowDown" ? step : 0
        st().nudgeSelected(dx, dy)
        return
      }

      if (key === "Delete" || key === "Backspace") {
        if (!hasSel) return
        e.preventDefault()
        st().deleteSelected()
        return
      }

      if (key === "Enter" && !mod && !alt) {
        if (s.selection.length !== 1 || s.isReadOnly || s.isLocked) return
        const n = s.nodes[s.selection[0]]
        if (n && hasEditableText(n)) {
          e.preventDefault()
          st().setEditing(n.id)
        }
        return
      }

      // Anything with a modifier left is not a tool key.
      if (mod || alt) return

      // ⇧H / ⇧V flip, ⇧0 / ⇧1 / ⇧2 zoom presets — before the bare tool keys
      // (⇧V is flip, not select).
      if (shift && code === "KeyH") { if (hasSel) st().flipSelected("h"); return }
      if (shift && code === "KeyV") { if (hasSel) st().flipSelected("v"); return }
      if (shift && code === "Digit0") { st().zoomTo100(); return }
      if (shift && code === "Digit1") { st().zoomToFit(); return }
      if (shift && code === "Digit2") { st().zoomToSelection(); return }
      if (shift && code === "KeyL") { st().setArrowHead(true); st().setTool("arrow"); return }
      if (shift) return

      switch (code) {
        case "KeyV": st().setTool("select"); return
        case "KeyR": st().setShapeKind("rect"); st().setTool("shape"); return
        case "KeyO": st().setShapeKind("ellipse"); st().setTool("shape"); return
        case "KeyP":
        case "KeyD": st().setTool("draw"); return
        case "KeyT": st().setTool("text"); return
        case "KeyL": st().setArrowHead(false); st().setTool("arrow"); return
        case "KeyA": st().setArrowHead(true); st().setTool("arrow"); return
        case "KeyC": st().setPanel(s.panel === "components" ? null : "components"); return
        case "KeyB": st().setPanel(s.panel === "blocks" ? null : "blocks"); return
      }

      // ? — the full list.
      if (e.key === "?") { st().setShortcutsOpen(true); return }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}
