"use client"

// ---------------------------------------------------------------------------
// The file name floats at the top center of the canvas. It ducks out of the
// way while a layer is being moved, resized, drawn or dragged in from the
// library, so the name never sits between the user and the thing under their
// hand — and it drifts back the moment they let go.
//
// Only hands-on-the-geometry counts. Panning, marquee-selecting and plain
// mousing around leave every layer where it is, and a label that flickered at
// each of those would be its own kind of noise.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import {
  House as HouseIcon,
  CheckCircle as CheckCircleIcon,
  CloudCheck as CloudCheckIcon,
  CloudSlash as CloudSlashIcon,
  WarningCircle as WarningIcon,
  SpinnerGap as SpinnerIcon,
} from "@phosphor-icons/react"

/** grace period after a drag ends, so nudge-release-nudge doesn't strobe */
const SETTLE_MS = 160

/** how long "saved" hangs around after ⌘S */
const SAVED_MS = 1800

export function FileName() {
  const fileName = useSquig((s) => s.fileName)
  const renaming = useSquig((s) => s.renamingFile)
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const saveStatus = useSquig((s) => s.saveStatus)
  const retrySave = useSquig((s) => s.retrySave)
  const setWorkspaceHomeOpen = useSquig((s) => s.setWorkspaceHomeOpen)
  const currentWorkspaceId = useSquig((s) => s.currentWorkspaceId)
  const st = useSquig.getState
  const [ducked, setDucked] = useState(false)
  const [saved, setSaved] = useState(false)

  // Out of the way for as long as the drag lasts, back once it settles.
  //
  // Driven off the store's edges rather than a selector: a drag writes to the
  // store on every pointer move, and only the first and last of those tell us
  // anything. `busy` is a plain local, not a ref — nothing renders from it.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let busy = false
    const unsub = useSquig.subscribe((s) => {
      // a canvas gesture with hands on a layer, or a library item mid-flight
      const now = s.transforming || s.placingDrag
      if (now === busy) return
      busy = now
      if (timer) clearTimeout(timer)
      timer = null
      if (now) setDucked(true)
      else timer = setTimeout(() => setDucked(false), SETTLE_MS)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [])

  // ⌘S says so out loud — the autosaves along the way stay quiet
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | null = null
    const unsub = useSquig.subscribe((s, prev) => {
      if (s.saveFlash === prev.saveFlash) return
      setSaved(true)
      if (id) clearTimeout(id)
      id = setTimeout(() => setSaved(false), SAVED_MS)
    })
    return () => {
      unsub()
      if (id) clearTimeout(id)
    }
  }, [])

  // renaming and the save note both outrank the duck: neither should vanish
  // because the other hand started a drag
  const shown = !ducked || renaming || saved

  return (
    <div
      // `pointer-events-none` while ducked is load-bearing, not just tidy: a
      // library item released over this strip hit-tests through to the canvas
      // and actually lands there.
      className="pointer-events-none absolute top-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 transition-opacity bg-[var(--sq-paper)]/90 backdrop-blur-sm border border-[var(--sq-border)] px-2 py-0.5 rounded-chrome-sm shadow-xs"
      // out of the way quickly, back in gently
      style={{ opacity: shown ? 1 : 0, transitionDuration: shown ? "260ms" : "110ms" }}
    >
      <button
        type="button"
        onClick={() => setWorkspaceHomeOpen(true)}
        className={`flex items-center gap-1 px-1.5 py-0.5 text-xs text-[var(--sq-muted)] hover:text-[var(--sq-ink)] hover:bg-[var(--sq-bg)] rounded-chrome-sm transition-colors ${shown ? "pointer-events-auto" : ""}`}
        title="Open Workspace Home (Multi-Boards, Storage, Trash)"
      >
        <HouseIcon className="size-3.5" />
        <span className="font-medium hidden sm:inline">Workspace</span>
      </button>

      <span className="text-[var(--sq-border)] text-xs">/</span>

      {renaming ? (
        <NameInput initial={fileName} />
      ) : (
        <button
          type="button"
          className={`max-w-[35vw] truncate rounded-chrome-sm px-1.5 py-0.5 text-xs font-semibold text-[var(--sq-ink)] transition-colors hover:bg-[var(--sq-bg)] ${shown ? "pointer-events-auto" : ""}`}
          onClick={() => st().setRenamingFile(true)}
          title="Click to rename"
        >
          {fileName}
        </button>
      )}

      {/* Save Status Badge */}
      <div className={`flex items-center gap-1 pl-1 border-l border-[var(--sq-border)] text-[11px] ${shown ? "pointer-events-auto" : ""}`}>
        {saveStatus === "saving" && (
          <span className="flex items-center gap-1 text-[var(--sq-muted)]">
            <SpinnerIcon className="size-3 animate-spin" />
            <span className="hidden sm:inline">Saving…</span>
          </span>
        )}
        {saveStatus === "syncing" && (
          <span className="flex items-center gap-1 text-[var(--sq-muted)]">
            <SpinnerIcon className="size-3 animate-spin" />
            <span className="hidden sm:inline">Syncing…</span>
          </span>
        )}
        {saveStatus === "offline" && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium" title="Edits cached locally in browser">
            <CloudSlashIcon className="size-3.5" />
            <span className="hidden sm:inline">Offline (cached)</span>
          </span>
        )}
        {saveStatus === "failed" && (
          <button
            type="button"
            onClick={retrySave}
            className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold hover:underline"
            title="Autosave encountered an error. Click to retry save."
          >
            <WarningIcon className="size-3.5" />
            <span>Retry Save</span>
          </button>
        )}
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1 text-[var(--sq-muted)] hover:text-[var(--sq-ink)]" title="All changes saved safely">
            <CloudCheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] hidden md:inline">Saved</span>
          </span>
        )}
      </div>
    </div>
  )
}

/** Mounted only while renaming, so the draft starts from the current name. */
function NameInput({ initial }: { initial: string }) {
  const st = useSquig.getState
  const [draft, setDraft] = useState(initial)
  const input = useRef<HTMLInputElement>(null)

  // The file menu may still be handing focus back as we mount, which beats
  // React's autoFocus — claim it once that settles.
  useEffect(() => {
    const id = setTimeout(() => {
      input.current?.focus()
      input.current?.select()
    }, 60)
    return () => clearTimeout(id)
  }, [])

  const commit = () => {
    st().setFileName(draft.trim() || "untitled scribbles")
    st().setRenamingFile(false)
  }

  return (
    // Grid overlay: an invisible copy of the text sizes the cell, so the input
    // grows with the name and stays centered on the same axis as the label.
    <span className="pointer-events-auto inline-grid items-center">
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 min-w-32 max-w-[60vw] px-2.5 py-1 text-center text-row whitespace-pre"
      >
        {draft || " "}
      </span>
      <input
        ref={input}
        aria-label="file name"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        // Tabbing away commits; the whole window losing focus should not —
        // the rename is still there when the user comes back.
        onBlur={() => {
          if (document.hasFocus()) commit()
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Enter") commit()
          if (e.key === "Escape") st().setRenamingFile(false)
        }}
        className="col-start-1 row-start-1 w-full rounded-chrome-sm border bg-background px-2.5 py-1 text-center text-row shadow-panel outline-none"
      />
    </span>
  )
}

