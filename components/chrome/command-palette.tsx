"use client"

// ---------------------------------------------------------------------------
// ⌘K — a sheet that rises from the bottom. Searches tools, actions, and every
// component and block, and inserts on Enter. One box for the whole app.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSquig } from "@/lib/store"
import { ALL_DEFS, matches, type ComponentDef } from "@/lib/library/registry"
import { SketchPrims } from "@/components/canvas/sketch"
import { copySelection, cutSelection, pasteFromSystem } from "@/lib/clipboard"
import {
  exportZenithsui,
  exportJson,
  exportPdfDoc,
  exportSvgDoc,
  exportPngDoc,
  copyPngClipboard,
  importZenithsuiOrJson,
  importPdf,
  importImage,
  importDoc,
  attachFileToCanvas,
} from "@/lib/file-io"
import { relativeTime } from "@/lib/files"
import { kbd } from "@/lib/shortcuts"
import { searchAcrossPages, type PageSearchResult } from "@/lib/search"
import {
  MagnifyingGlassIcon,
  CursorIcon,
  SquareIcon,
  CircleIcon,
  PencilSimpleIcon,
  TextTIcon,
  ArrowUpRightIcon,
  LineSegmentIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  CopyIcon,
  ClipboardIcon,
  ScissorsIcon,
  TrashIcon,
  StackIcon,
  StackSimpleIcon,
  CornersOutIcon,
  CornersInIcon,
  FileIcon,
  FileTextIcon,
  FloppyDiskIcon,
  DownloadSimpleIcon,
  UploadSimpleIcon,
  LinkBreakIcon,
  LinkIcon,
  BoundingBoxIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  EyeSlashIcon,
  ImageIcon,
  KeyboardIcon,
  Database as DatabaseIcon,
  FilePdf as FilePdfIcon,
  FileSvg as FileSvgIcon,
  Shield as ShieldIcon,
  ClockCounterClockwise as HistoryIcon,
  Sparkle as SparkleIcon,
  ChalkboardTeacher as ChalkboardTeacherIcon,
  House as HouseIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Paperclip as PaperclipIcon,
  Presentation as PresentationIcon,
  Brain as BrainIcon,
  Palette as PaletteIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react"
import { useZenithAI } from "@/lib/ai/ai-store"

interface Action {
  id: string
  label: string
  hint?: string
  section: string
  keywords?: string
  icon: PhosphorIcon
  run: () => void
  disabled?: boolean
}

type Row =
  | { kind: "action"; action: Action }
  | { kind: "def"; def: ComponentDef }
  | { kind: "page"; page: PageSearchResult }

const SECTION_ORDER = [
  "Pages & Files",
  "Zenith AI",
  "Tools",
  "Edit",
  "Arrange",
  "Text",
  "View",
  "File",
  "Recent",
  "Components",
  "Blocks",
]

/** the palette lists a handful of files; the file menu holds the rest */
const RECENT_IN_PALETTE = 6

/** Mount only while open, so every ⌘K starts from a blank box with no reset dance. */
export function CommandPalette() {
  const open = useSquig((s) => s.commandOpen)
  if (!open) return null
  return <Palette />
}

function Palette() {
  const selection = useSquig((s) => s.selection)
  const nodes = useSquig((s) => s.nodes)
  const files = useSquig((s) => s.files)
  const docId = useSquig((s) => s.docId)
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const st = useSquig.getState

  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [pageSearchResults, setPageSearchResults] = useState<PageSearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => st().setCommandOpen(false), [st])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Asynchronous search across pages & files
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setPageSearchResults([])
      return
    }

    let activeQuery = true
    const timer = setTimeout(async () => {
      const results = await searchAcrossPages(selectedDbId, q)
      if (activeQuery) {
        setPageSearchResults(results)
      }
    }, 60)

    return () => {
      activeQuery = false
      clearTimeout(timer)
    }
  }, [query, selectedDbId])

  const hasSel = selection.length > 0
  const hasComponent = selection.some((id) => nodes[id]?.type === "component")
  const hasText = selection.some((id) => nodes[id]?.type === "text")
  const hasGroup = selection.some((id) => nodes[id]?.groupIds?.length)

  const actions = useMemo<Action[]>(
    () => [
      { id: "select", label: "Select tool", hint: kbd("v"), section: "Tools", icon: CursorIcon, run: () => st().setTool("select") },
      { id: "rect", label: "Rectangle", hint: kbd("r"), section: "Tools", keywords: "shape box square", icon: SquareIcon, run: () => { st().setShapeKind("rect"); st().setTool("shape") } },
      { id: "ellipse", label: "Ellipse", hint: kbd("o"), section: "Tools", keywords: "circle oval shape", icon: CircleIcon, run: () => { st().setShapeKind("ellipse"); st().setTool("shape") } },
      { id: "draw", label: "Draw", hint: kbd("p"), section: "Tools", keywords: "pencil pen freehand scribble", icon: PencilSimpleIcon, run: () => st().setTool("draw") },
      { id: "text", label: "Text", hint: kbd("t"), section: "Tools", keywords: "type label", icon: TextTIcon, run: () => st().setTool("text") },
      { id: "line", label: "Line", hint: kbd("l"), section: "Tools", keywords: "rule divider stroke", icon: LineSegmentIcon, run: () => { st().setArrowHead(false); st().setTool("arrow") } },
      { id: "arrow", label: "Arrow", hint: kbd("shift+l"), section: "Tools", keywords: "line connector point", icon: ArrowUpRightIcon, run: () => { st().setArrowHead(true); st().setTool("arrow") } },
      { id: "color-size-studio", label: "Color & Size Studio: Choose Color, Size & Styles", section: "Tools", keywords: "color size stroke thickness fill rectangle ellipse line arrow draw text style palette presets", icon: PaletteIcon, run: () => st().setColorSizeStudioOpen(true) },
      { id: "smart-sketch", label: `Smart Sketch: ${st().smartSketch ? "Disable" : "Enable"} auto-recognition`, section: "Tools", keywords: "sketch recognize auto convert geometry rough shapes ai pen", icon: SparkleIcon, run: () => st().toggleSmartSketch() },
      { id: "slm-learn-a", label: "Handwriting SLM: Teach Letter A", section: "Tools", keywords: "handwriting slm learn teach letter a model adaptive training", icon: BrainIcon, run: () => st().setSlmLearningModalOpen(true, "A") },
      { id: "slm-learn-b", label: "Handwriting SLM: Teach Letter B", section: "Tools", keywords: "handwriting slm learn teach letter b model adaptive training", icon: BrainIcon, run: () => st().setSlmLearningModalOpen(true, "B") },

      { id: "ai-toggle", label: "Zenith AI: Toggle Copilot", hint: kbd("mod+j"), section: "Zenith AI", keywords: "copilot chat assistant student study explain solve mindmap", icon: SparkleIcon, run: () => useZenithAI.getState().toggleOpen() },
      { id: "ai-mindmap", label: "Zenith AI: Create Mind Map", section: "Zenith AI", keywords: "ai diagram mindmap tree structure visual", icon: SparkleIcon, run: () => { useZenithAI.getState().setOpen(true); useZenithAI.getState().sendMessage("Create a detailed mind map on canvas.", "mind-map") } },
      { id: "ai-flowchart", label: "Zenith AI: Create Flowchart", section: "Zenith AI", keywords: "ai diagram flowchart process steps", icon: SparkleIcon, run: () => { useZenithAI.getState().setOpen(true); useZenithAI.getState().sendMessage("Create a step-by-step flowchart on canvas.", "flowchart") } },
      { id: "ai-flashcards", label: "Zenith AI: Generate Flashcards", section: "Zenith AI", keywords: "ai flashcards revision study questions cards", icon: SparkleIcon, run: () => { useZenithAI.getState().setOpen(true); useZenithAI.getState().sendMessage("Generate study flashcards on canvas.", "flashcards") } },
      { id: "ai-explain", label: "Zenith AI: Explain Concept", section: "Zenith AI", keywords: "ai explain teach understand concept", icon: SparkleIcon, run: () => { useZenithAI.getState().setOpen(true); useZenithAI.getState().setActiveStudentAction("explain") } },
      { id: "ai-settings", label: "Zenith AI: Settings & BYOK Vault", section: "Zenith AI", keywords: "ai settings byok api keys models providers", icon: SparkleIcon, run: () => useZenithAI.getState().setSettingsOpen(true) },

      { id: "undo", label: "Undo", hint: kbd("mod+z"), section: "Edit", icon: ArrowUUpLeftIcon, run: () => st().undo() },
      { id: "redo", label: "Redo", hint: kbd("mod+shift+z"), section: "Edit", icon: ArrowUUpRightIcon, run: () => st().redo() },
      { id: "dup", label: "Duplicate", hint: kbd("mod+d"), section: "Edit", icon: CopyIcon, disabled: !hasSel, run: () => st().duplicateSelected() },
      { id: "copy", label: "Copy", hint: kbd("mod+c"), section: "Edit", icon: CopyIcon, disabled: !hasSel, run: copySelection },
      { id: "copy-png", label: "Copy as PNG", hint: kbd("mod+shift+c"), section: "Edit", keywords: "image picture screenshot share paste slack clipboard export", icon: ImageIcon, run: copyPngClipboard },
      { id: "cut", label: "Cut", hint: kbd("mod+x"), section: "Edit", icon: ScissorsIcon, disabled: !hasSel, run: cutSelection },
      { id: "paste", label: "Paste", hint: kbd("mod+v"), section: "Edit", keywords: "image picture screenshot", icon: ClipboardIcon, run: () => void pasteFromSystem() },
      { id: "del", label: "Delete", hint: kbd("del"), section: "Edit", icon: TrashIcon, disabled: !hasSel, run: () => st().deleteSelected() },
      { id: "group", label: "Group", hint: kbd("mod+g"), section: "Edit", keywords: "combine bundle", icon: BoundingBoxIcon, disabled: selection.length < 2, run: () => st().groupSelected() },
      { id: "ungroup", label: "Ungroup", hint: kbd("mod+shift+g"), section: "Edit", keywords: "split apart", icon: LinkBreakIcon, disabled: !hasGroup, run: () => st().ungroupSelected() },
      {
        id: "break", label: "Detach instance", hint: kbd("alt+mod+b"), section: "Edit",
        keywords: "break apart explode ungroup component",
        icon: LinkBreakIcon, disabled: !hasComponent,
        run: () => st().detachSelected(),
      },
      { id: "selectall", label: "Select all", hint: kbd("mod+a"), section: "Edit", icon: StackIcon, run: () => st().setSelection([...st().order]) },

      { id: "forward", label: "Bring forward", hint: kbd("mod+]"), section: "Arrange", icon: StackSimpleIcon, disabled: !hasSel, run: () => st().bringForward(st().selection) },
      { id: "backward", label: "Send backward", hint: kbd("mod+["), section: "Arrange", icon: StackSimpleIcon, disabled: !hasSel, run: () => st().sendBackward(st().selection) },
      { id: "front", label: "Bring to front", hint: kbd("far+]"), section: "Arrange", icon: StackIcon, disabled: !hasSel, run: () => st().bringToFront(st().selection) },
      { id: "back", label: "Send to back", hint: kbd("far+["), section: "Arrange", icon: StackIcon, disabled: !hasSel, run: () => st().sendToBack(st().selection) },
      { id: "flip-h", label: "Flip horizontal", hint: kbd("shift+h"), section: "Arrange", keywords: "mirror reverse", icon: FlipHorizontalIcon, disabled: !hasSel, run: () => st().flipSelected("x") },
      { id: "flip-v", label: "Flip vertical", hint: kbd("shift+v"), section: "Arrange", keywords: "mirror reverse", icon: FlipVerticalIcon, disabled: !hasSel, run: () => st().flipSelected("y") },
      { id: "align-l", label: "Align left", section: "Arrange", icon: CornersOutIcon, disabled: selection.length < 2, run: () => st().alignSelected("left") },
      { id: "align-hc", label: "Align centres horizontally", section: "Arrange", icon: CornersOutIcon, disabled: selection.length < 2, run: () => st().alignSelected("hcenter") },
      { id: "align-r", label: "Align right", section: "Arrange", icon: CornersOutIcon, disabled: selection.length < 2, run: () => st().alignSelected("right") },
      { id: "align-t", label: "Align top", section: "Arrange", icon: CornersOutIcon, disabled: selection.length < 2, run: () => st().alignSelected("top") },
      { id: "align-vc", label: "Align middles vertically", section: "Arrange", icon: CornersOutIcon, disabled: selection.length < 2, run: () => st().alignSelected("vcenter") },
      { id: "align-b", label: "Align bottom", section: "Arrange", icon: CornersOutIcon, disabled: selection.length < 2, run: () => st().alignSelected("bottom") },

      { id: "bold", label: "Bold", hint: kbd("mod+b"), section: "Text", icon: TextBIcon, disabled: !hasText, run: () => st().toggleTextStyle("bold") },
      { id: "italic", label: "Italic", hint: kbd("mod+i"), section: "Text", icon: TextItalicIcon, disabled: !hasText, run: () => st().toggleTextStyle("italic") },
      { id: "underline", label: "Underline", hint: kbd("mod+u"), section: "Text", icon: TextUnderlineIcon, disabled: !hasText, run: () => st().toggleTextStyle("underline") },
      { id: "link", label: "Link selection", hint: kbd("mod+k"), section: "Text", keywords: "url href", icon: LinkIcon, disabled: !hasText, run: () => st().setLinkOpen(true) },

      { id: "zoom-in", label: "Zoom in", hint: kbd("mod+plus"), section: "View", icon: MagnifyingGlassPlusIcon, run: () => st().zoomBy(1.25) },
      { id: "zoom-out", label: "Zoom out", hint: kbd("mod+-"), section: "View", icon: MagnifyingGlassMinusIcon, run: () => st().zoomBy(1 / 1.25) },
      { id: "zoom-100", label: "Zoom to 100%", hint: kbd("shift+0"), section: "View", keywords: "actual size", icon: MagnifyingGlassIcon, run: () => st().zoomTo100() },
      { id: "zoom-fit", label: "Zoom to fit", hint: kbd("shift+1"), section: "View", keywords: "everything overview", icon: CornersOutIcon, run: () => st().zoomToFit() },
      { id: "zoom-sel", label: "Zoom to selection", hint: kbd("shift+2"), section: "View", icon: CornersInIcon, disabled: !hasSel, run: () => st().zoomToSelection() },
      { id: "zoom-reset", label: "Reset view", hint: kbd("mod+0"), section: "View", keywords: "origin home", icon: CornersOutIcon, run: () => st().setViewport({ x: 0, y: 0, zoom: 1 }) },
      { id: "hide-ui", label: "Hide the interface", hint: kbd("mod+\\"), section: "View", keywords: "clean present chrome", icon: EyeSlashIcon, run: () => st().setUiHidden(true) },
      { id: "page-panel", label: "Toggle page settings", section: "View", keywords: "page paper ink palette theme font grid inspector", icon: FileTextIcon, run: () => { if (st().selection.length > 0) { st().selectNone(); st().setPagePanel(true) } else { st().togglePagePanel() } } },
      { id: "keys", label: "Keyboard shortcuts", hint: kbd("shift+/"), section: "View", keywords: "hotkeys help cheat sheet", icon: KeyboardIcon, run: () => st().setShortcutsOpen(true) },

      { id: "classroom-open", label: "Classroom: Present / Smart Board", hint: kbd("mod+shift+p"), section: "Classroom", keywords: "pdf slides present smart board teacher whiteboard annotate laser spotlight presentation", icon: ChalkboardTeacherIcon, run: () => st().openClassroom() },
      { id: "classroom-whiteboard", label: "Classroom: Open Whiteboard Scratchpad", section: "Classroom", keywords: "whiteboard drawing scratchpad board notes classroom teach scribble", icon: ChalkboardTeacherIcon, run: () => { st().openClassroom(undefined, true); } },

      { id: "workspace-home", label: "Workspace Home: Multi-Boards, Storage & Trash", section: "Workspace", keywords: "workspace boards trash storage home dashboard multi projects", icon: HouseIcon, run: () => st().setWorkspaceHomeOpen(true) },
      { id: "presentation-toggle", label: "Toggle Presentation Mode", hint: kbd("mod+alt+p"), section: "Presentation", keywords: "present laser spotlight timer presentation slides pointer", icon: PresentationIcon, run: () => st().setPresentationMode(!st().presentationMode) },
      { id: "lock-selected", label: "Lock Selected Objects", section: "Layer", keywords: "lock freeze protect layer object", icon: LockIcon, disabled: !hasSel, run: () => st().lockSelected() },
      { id: "unlock-selected", label: "Unlock Selected Objects", section: "Layer", keywords: "unlock unfreeze layer object", icon: LockOpenIcon, disabled: !hasSel, run: () => st().unlockSelected() },
      { id: "attach-file", label: "Attach Arbitrary File to Canvas", section: "File", keywords: "attach file upload document zip data embed", icon: PaperclipIcon, run: () => void attachFileToCanvas() },

      { id: "new", label: "New file", section: "File", keywords: "blank clear reset", icon: FileIcon, run: () => st().newFile() },
      { id: "save", label: "Save", hint: kbd("mod+s"), section: "File", keywords: "keep store local", icon: FloppyDiskIcon, run: () => st().saveNow() },
      { id: "database", label: "Select Database", section: "File", keywords: "database shared sync cloud connect sql team", icon: DatabaseIcon, run: () => st().setDatabaseModalOpen(true) },
      { id: "export-zenithsui", label: "Export .zenithsui (Native)", hint: kbd("mod+shift+s"), section: "File", keywords: "save download zenithsui native file export", icon: DownloadSimpleIcon, run: () => exportZenithsui() },
      { id: "export-json", label: "Export JSON backup", section: "File", keywords: "save download json copy backup data", icon: DownloadSimpleIcon, run: () => exportJson() },
      { id: "export-pdf", label: "Export as PDF document", section: "File", keywords: "pdf export print document vector download", icon: FilePdfIcon, run: () => exportPdfDoc() },
      { id: "export-svg", label: "Export as Vector SVG", section: "File", keywords: "svg vector graphics export scalable download", icon: FileSvgIcon, run: () => exportSvgDoc() },
      { id: "export-png", label: "Export as Raster PNG", section: "File", keywords: "png image download picture render photo", icon: ImageIcon, run: () => exportPngDoc() },
      { id: "copy-png", label: "Copy PNG to clipboard", hint: kbd("mod+shift+c"), section: "File", keywords: "copy png image clipboard raster picture", icon: ClipboardIcon, run: () => copyPngClipboard() },
      { id: "import-doc", label: "Open / Import file…", section: "File", keywords: "open load import zenithsui json pdf image disk file", icon: UploadSimpleIcon, run: () => importDoc() },
      { id: "import-pdf", label: "Import PDF document", section: "File", keywords: "pdf import load read insert document page", icon: FilePdfIcon, run: () => importPdf() },
      { id: "import-image", label: "Import Image", section: "File", keywords: "image photo screenshot picture png jpg svg insert", icon: ImageIcon, run: () => importImage() },
      { id: "version-history", label: "Version History", section: "File", keywords: "history versions snapshots restore rollback previous revisions", icon: HistoryIcon, run: () => void st().openVersionHistory() },
      { id: "password", label: "Password Protection", section: "File", keywords: "password protect lock security permission permissions", icon: ShieldIcon, run: () => { if (st().isReadOnly) st().setUnlockModalOpen(true); else st().setPasswordModalOpen(true); } },

      // every file this browser is holding, so ⌘K can open one too
      ...files
        .filter((f) => f.id !== docId)
        .slice(0, RECENT_IN_PALETTE)
        .map((f) => ({
          id: `open:${f.id}`,
          label: f.name,
          hint: relativeTime(f.updatedAt),
          section: "Recent",
          keywords: "open recent file document",
          icon: FileIcon,
          run: () => st().openFile(f.id),
        })),
    ],
    [st, hasSel, hasComponent, hasText, hasGroup, selection.length, files, docId]
  )

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase()
    const acts = actions.filter(
      (a) =>
        !a.disabled &&
        (!q || a.label.toLowerCase().includes(q) || a.section.toLowerCase().includes(q) || (a.keywords?.includes(q) ?? false))
    )
    const defs = ALL_DEFS.filter((d) => matches(d, q))
    // with no query, keep the sheet skimmable rather than dumping 100 items
    const limited = q ? defs : defs.slice(0, 24)

    const pageRows: Row[] = pageSearchResults.map((page) => ({ kind: "page", page }))

    return [
      ...pageRows,
      ...acts.map((action): Row => ({ kind: "action", action })),
      ...limited.map((def): Row => ({ kind: "def", def })),
    ]
  }, [query, actions, pageSearchResults])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" })
  }, [active])

  const runRow = useCallback(
    (row: Row) => {
      if (row.kind === "action") {
        row.action.run()
      } else if (row.kind === "def") {
        st().insertComponent(row.def.kind)
      } else if (row.kind === "page") {
        st().openFile(row.page.id, row.page.dbId || undefined)
        st().setNotice(`Opened "${row.page.name}"`)
      }
      close()
    },
    [st, close]
  )

  // group consecutive rows by section for headers
  const sections: { title: string; rows: { row: Row; index: number }[] }[] = []
  rows.forEach((row, index) => {
    const title =
      row.kind === "page"
        ? "Pages & Files"
        : row.kind === "action"
        ? row.action.section
        : row.def.category === "components"
        ? "Components"
        : "Blocks"
    const last = sections[sections.length - 1]
    if (last?.title === title) last.rows.push({ row, index })
    else sections.push({ title, rows: [{ row, index }] })
  })
  sections.sort((a, b) => SECTION_ORDER.indexOf(a.title) - SECTION_ORDER.indexOf(b.title))

  return (
    <>
      <div data-zenithsui-chrome
      className="fixed inset-0 z-50 flex flex-col justify-end" onPointerDown={close}>
        <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
        <div
          className="animate-in slide-in-from-bottom-4 fade-in relative mx-auto flex max-h-[62vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-chrome-lg border border-b-0 border-border/80 bg-background shadow-popup duration-150"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0 border-b">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              placeholder="search pages, files, contents, buttons, tools…"
              className="w-full bg-transparent py-4 pr-4 pl-11 text-title outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                e.stopPropagation()
                // the keys that opened the sheet also close it
                if ((e.metaKey || e.ctrlKey) && (e.code === "KeyK" || e.code === "Slash")) {
                  e.preventDefault()
                  close()
                } else if (e.key === "Escape") close()
                else if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setActive((i) => (rows.length ? (i + 1) % rows.length : 0))
                } else if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setActive((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0))
                } else if (e.key === "Enter") {
                  e.preventDefault()
                  const row = rows[active]
                  if (row) runRow(row)
                }
              }}
            />
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain p-2.5">
            {!rows.length && (
              <p className="py-10 text-center text-row text-muted-foreground">
                nothing matches &ldquo;{query}&rdquo;. try fewer letters.
              </p>
            )}
            {sections.map((section) => (
              <div key={section.title} className="mb-2">
                <div className="px-2.5 pt-3 pb-1.5 text-label font-medium text-foreground flex items-center justify-between">
                  <span>{section.title}</span>
                  {section.title === "Pages & Files" && selectedDbId && (
                    <span className="text-[10px] font-mono text-muted-foreground">in database</span>
                  )}
                </div>
                {section.rows.map(({ row, index }) => (
                  <PaletteRow
                    key={
                      row.kind === "action"
                        ? row.action.id
                        : row.kind === "page"
                        ? `page:${row.page.id}:${row.page.snippet}`
                        : row.def.kind
                    }
                    row={row}
                    active={index === active}
                    onHover={() => setActive(index)}
                    onPick={() => runRow(row)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-4 border-t border-border/70 px-4 py-2.5 text-label text-muted-foreground">
            <span><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
            <span><Kbd>↵</Kbd> pick</span>
            <span><Kbd>esc</Kbd> close</span>
            <span className="ml-auto">search across pages, components & tools</span>
          </div>
        </div>
      </div>
    </>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-chrome-xs border bg-muted px-1 font-mono text-micro">
      {children}
    </kbd>
  )
}

function PaletteRow({
  row,
  active,
  onHover,
  onPick,
}: {
  row: Row
  active: boolean
  onHover: () => void
  onPick: () => void
}) {
  if (row.kind === "page") {
    const isDocTitle = row.page.kind === "page"
    return (
      <button
        type="button"
        data-active={active}
        onMouseMove={onHover}
        onClick={onPick}
        className={`flex h-ctl-lg w-full items-center gap-3 rounded-chrome-sm px-2.5 text-left text-row ${
          active ? "bg-accent text-accent-foreground" : "text-foreground"
        }`}
      >
        <FileTextIcon className="size-4 shrink-0 text-muted-foreground" weight="regular" />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <span className="truncate font-medium">{row.page.name}</span>
          {!isDocTitle && row.page.snippet && (
            <span className="truncate text-micro text-muted-foreground font-mono">
              {row.page.matchField}: &ldquo;{row.page.snippet}&rdquo;
            </span>
          )}
        </div>
        <span className="pl-3 font-mono text-label text-muted-foreground shrink-0">
          {relativeTime(row.page.updatedAt)}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      data-active={active}
      onMouseMove={onHover}
      onClick={onPick}
      className={`flex h-ctl-lg w-full items-center gap-3 rounded-chrome-sm px-2.5 text-left text-row ${
        active ? "bg-accent text-accent-foreground" : "text-foreground"
      }`}
    >
      {row.kind === "action" ? (
        <>
          <row.action.icon className="size-4 shrink-0 text-muted-foreground" weight="regular" />
          <span className="flex-1 truncate">{row.action.label}</span>
          {row.action.hint && <span className="pl-6 font-mono text-label text-muted-foreground">{row.action.hint}</span>}
        </>
      ) : (
        <>
          <DefThumb def={row.def} />
          <span className="flex-1 truncate">{row.def.name}</span>
          <span className="pl-6 text-label text-muted-foreground">{row.def.group}</span>
        </>
      )}
    </button>
  )
}

function DefThumb({ def }: { def: ComponentDef }) {
  const prims = useMemo(() => def.render(def.defaults, def.size.w, def.size.h), [def])
  const box = 22
  const scale = Math.min(box / def.size.w, box / def.size.h)
  return (
    <svg width={box} height={box} className="shrink-0 overflow-visible">
      <g
        transform={`translate(${(box - def.size.w * scale) / 2} ${(box - def.size.h * scale) / 2}) scale(${scale})`}
      >
        <SketchPrims prims={prims} seed={5} />
      </g>
    </svg>
  )
}
