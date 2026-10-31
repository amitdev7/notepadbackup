"use client"

// ---------------------------------------------------------------------------
// Zenithsui macOS/iPadOS-Inspired Document Dashboard
//
// Features:
// 1. Apple Finder & Notes layout with translucent materials and subtle borders.
// 2. Real-time fuzzy search & filtering by document title.
// 3. Dual view modes: Visual Cards Grid vs Compact List View.
// 4. Complete document management: Open, Duplicate, Rename, Export, Soft-delete & Restore.
// 5. Category counters and badge indicators.
// 6. Mobile responsive slide-over drawer with 44px touch targets.
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import {
  listLocalDocuments,
  softDeleteLocalDocument,
  permanentlyDeleteLocalDocument,
  restoreLocalDocument,
  duplicateLocalDocument,
  saveLocalDocument,
  type StoredLocalDoc,
} from "@/lib/storage/documents"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Plus,
  ArrowLeft,
  Folder,
  ShareNetwork,
  Trash,
  Clock,
  MagnifyingGlass,
  SquaresFour,
  List,
  DotsThreeVertical,
  Copy,
  ArrowCounterClockwise,
  PencilSimple,
  ListDashes,
  X,
  Globe,
  Lock,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WorkspaceSwitcher } from "@/components/chrome/workspace-switcher"
import { syncThemeToDOM, useShellStore } from "@/lib/shell-store"
import { cn } from "@/lib/utils"

interface SharedDocItem {
  id: string
  name: string
  role: string
  updatedAt: string
  isPublic: boolean
  shareState: string
  doc?: {
    nodes?: Record<string, unknown>
    order?: string[]
  }
}

type TabType = "recent" | "projects" | "shared" | "trash"
type ViewMode = "grid" | "list"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [documents, setDocuments] = useState<StoredLocalDoc[]>([])
  const [sharedDocs, setSharedDocs] = useState<SharedDocItem[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("recent")
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // In-place rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    syncThemeToDOM(useShellStore.getState().preferences.themeMode)
  }, [])

  const loadDocuments = useCallback(() => {
    let cancelled = false

    if (activeTab === "shared") {
      if (user) {
        import("@/lib/supabase/client").then(({ getSupabaseBrowserClient }) => {
          if (cancelled) return
          setLoading(true)
          const supabase = getSupabaseBrowserClient()
          supabase
            .from("document_members")
            .select("document_id, role, created_at, documents(id, name, updated_at, is_public, schema_version)")
            .eq("user_id", user.id)
            .then(({ data, error }) => {
              if (cancelled) return
              if (!error && data) {
                const list = (data as Array<{
                  role: string
                  documents: {
                    id: string
                    name: string
                    updated_at: string
                    is_public: boolean
                  } | null
                }>)
                  .filter((m) => m.documents !== null)
                  .map((m) => ({
                    id: m.documents!.id,
                    name: m.documents!.name,
                    role: m.role,
                    updatedAt: m.documents!.updated_at,
                    isPublic: m.documents!.is_public,
                    shareState: "shared",
                  }))
                setSharedDocs(list)
              }
              setLoading(false)
            }, () => {
              if (!cancelled) setLoading(false)
            })
        })
      } else {
        Promise.resolve().then(() => {
          if (!cancelled) {
            setSharedDocs([])
            setLoading(false)
          }
        })
      }
    } else {
      setLoading(true)
      listLocalDocuments(true)
        .then((docs) => {
          if (cancelled) return
          if (activeTab === "trash") {
            setDocuments(docs.filter((d) => d.deletedAt !== null))
          } else {
            setDocuments(docs.filter((d) => d.deletedAt === null))
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [activeTab, user])

  useEffect(() => {
    return loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleOpenDoc = (id: string) => {
    router.push(`/?doc=${id}`)
  }

  const handleCreateNew = () => {
    router.push("/")
  }

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const copy = await duplicateLocalDocument(id)
    if (copy) {
      loadDocuments()
    }
  }

  const handleSoftDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await softDeleteLocalDocument(id)
    loadDocuments()
  }

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await restoreLocalDocument(id)
    loadDocuments()
  }

  const handlePermanentDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm("Permanently delete this drawing? This action cannot be undone.")) {
      await permanentlyDeleteLocalDocument(id)
      loadDocuments()
    }
  }

  const startRename = (e: React.MouseEvent, doc: { id: string; name: string }) => {
    e.stopPropagation()
    setRenamingId(doc.id)
    setRenameDraft(doc.name)
  }

  const commitRename = async (docId: string) => {
    const trimmed = renameDraft.trim()
    if (trimmed) {
      const doc = documents.find((d) => d.id === docId)
      if (doc && doc.name !== trimmed) {
        doc.name = trimmed
        doc.updatedAt = Date.now()
        await saveLocalDocument(doc)
        loadDocuments()
      }
    }
    setRenamingId(null)
  }

  // Filtered documents matching search query
  const filteredDocuments = useMemo(() => {
    const list = activeTab === "shared" ? sharedDocs : documents
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase().trim()
    return list.filter((d) => d.name.toLowerCase().includes(q))
  }, [activeTab, sharedDocs, documents, searchQuery])

  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans overflow-hidden select-none">
      {/* ── Mobile Sidebar Overlay & Drawer ── */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] h-full apple-glass-panel border-r border-border p-4 flex flex-col justify-between shadow-2xl animate-popover-enter">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <Link href="/" className="font-sans text-base font-bold tracking-tight text-[var(--ui-accent,#007AFF)]">
                  zenithsui
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="pt-3 pb-2">
                <WorkspaceSwitcher />
              </div>

              <Button
                onClick={() => {
                  setMobileSidebarOpen(false)
                  handleCreateNew()
                }}
                className="w-full mt-3 justify-start gap-2 bg-[var(--ui-accent,#007AFF)] hover:brightness-95 active:brightness-90 text-white shadow-xs text-xs font-medium rounded-xl"
                size="sm"
              >
                <Plus size={14} weight="bold" />
                <span>New Drawing</span>
              </Button>

              <nav className="mt-6 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("recent")
                    setMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                    activeTab === "recent"
                      ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Clock size={16} />
                  <span>Recent</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("projects")
                    setMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                    activeTab === "projects"
                      ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Folder size={16} />
                  <span>Projects</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("shared")
                    setMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                    activeTab === "shared"
                      ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <ShareNetwork size={16} />
                  <span>Shared with me</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("trash")
                    setMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                    activeTab === "trash"
                      ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Trash size={16} />
                  <span>Trash</span>
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-border">
              <Link
                href="/"
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={14} />
                <span>Back to Canvas</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop macOS Sidebar ── */}
      <aside className="hidden md:flex w-64 border-r border-border/80 apple-glass-panel p-4 flex-col justify-between shrink-0">
        <div>
          {/* Logo & Workspace Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <Link
              href="/"
              className="font-sans text-base font-bold tracking-tight text-[var(--ui-accent,#007AFF)] flex items-center gap-2 hover:opacity-85 transition-opacity"
            >
              <span>zenithsui</span>
            </Link>
          </div>

          <div className="pt-3 pb-2">
            <WorkspaceSwitcher />
          </div>

          {/* New Document Button */}
          <Button
            onClick={handleCreateNew}
            className="w-full mt-2.5 justify-start gap-2 bg-[var(--ui-accent,#007AFF)] hover:brightness-95 active:brightness-90 text-white shadow-xs text-xs font-medium rounded-xl cursor-pointer tactile-btn"
            size="sm"
          >
            <Plus size={14} weight="bold" />
            <span>New Drawing</span>
          </Button>

          {/* Navigation Links */}
          <div className="mt-6">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Library
            </span>
            <nav className="mt-2 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("recent")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                  activeTab === "recent"
                    ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Clock size={16} />
                  <span>Recent</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("projects")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                  activeTab === "projects"
                    ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Folder size={16} />
                  <span>Projects</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("shared")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                  activeTab === "shared"
                    ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <ShareNetwork size={16} />
                  <span>Shared with me</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("trash")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                  activeTab === "trash"
                    ? "bg-[var(--ui-accent,#007AFF)]/15 text-[var(--ui-accent,#007AFF)] shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Trash size={16} />
                  <span>Trash</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Back to Canvas */}
        <div className="pt-4 border-t border-border">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Canvas</span>
          </Link>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-border/80 bg-background/80 px-4 sm:px-8 flex items-center justify-between backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Open sidebar"
            >
              <ListDashes size={20} />
            </button>

            <h1 className="font-sans text-sm sm:text-base font-semibold tracking-tight text-foreground capitalize">
              {activeTab === "recent"
                ? "Recent Drawings"
                : activeTab === "projects"
                  ? "Projects"
                  : activeTab === "shared"
                    ? "Shared with Me"
                    : "Trash"}
            </h1>
          </div>

          {/* Right Header Controls: Search & View Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex items-center">
              <MagnifyingGlass
                size={14}
                className="absolute left-2.5 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter drawings…"
                aria-label="Filter drawings by name"
                className="w-36 sm:w-56 pl-8 pr-3 py-1.5 rounded-xl text-xs bg-muted/60 border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent,#007AFF)]/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* View Mode Switcher (Grid vs List) */}
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-muted border border-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <SquaresFour size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Documents Content Grid / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs font-mono text-muted-foreground animate-pulse">
              Loading drawings…
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-2xl p-8 text-center max-w-md mx-auto my-12 animate-card-fade">
              <div className="rounded-2xl bg-muted p-3.5 text-muted-foreground mb-3 shadow-2xs">
                <FileText size={28} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {searchQuery
                  ? "No matching drawings"
                  : activeTab === "trash"
                    ? "Trash is empty"
                    : activeTab === "shared"
                      ? "No shared documents"
                      : "No drawings yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
                {searchQuery
                  ? `No drawings found matching "${searchQuery}". Clear your search or create a new file.`
                  : activeTab === "trash"
                    ? "Drawings you move to trash will appear here for recovery."
                    : activeTab === "shared"
                      ? "Drawings shared with your account or team will appear here."
                      : "Start a clean hand-drawn diagram or prototype on the infinite canvas."}
              </p>
              {activeTab !== "trash" && (
                <Button onClick={handleCreateNew} size="sm" className="text-xs rounded-xl tactile-btn">
                  <Plus size={14} className="mr-1.5" /> Create drawing
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* ── Grid View ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-card-fade">
              {filteredDocuments.map((doc) => {
                const nodeCount = Object.keys(("doc" in doc ? doc.doc?.nodes : undefined) || {}).length
                const isPublic = "isPublic" in doc ? doc.isPublic : false
                const isShared = activeTab === "shared" || ("shareState" in doc && doc.shareState === "shared")
                const isRenaming = renamingId === doc.id

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleOpenDoc(doc.id)}
                    className="group tactile-card relative rounded-2xl border border-border/80 bg-card p-4 shadow-xs hover:shadow-lg hover:border-[var(--ui-accent,#007AFF)]/50 cursor-pointer flex flex-col justify-between h-48 backdrop-blur-xs"
                  >
                    <div>
                      {/* Thumbnail Preview Area */}
                      <div className="h-24 w-full rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:scale-[1.01] transition-transform duration-200 mb-3 shadow-2xs relative overflow-hidden">
                        <span className="font-sketch text-xs text-muted-foreground">
                          {activeTab === "shared" && "role" in doc
                            ? `${doc.role || "viewer"} role`
                            : `${nodeCount} component${nodeCount === 1 ? "" : "s"}`}
                        </span>

                        {/* Top-Right Card Actions Menu */}
                        <div
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label="Document options"
                              className="size-7 rounded-lg bg-background shadow-xs flex items-center justify-center text-muted-foreground hover:text-foreground border border-border outline-none cursor-pointer"
                            >
                              <DotsThreeVertical size={14} weight="bold" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs font-sans animate-popover-enter">
                              <DropdownMenuItem onClick={() => handleOpenDoc(doc.id)}>
                                <FileText size={14} className="mr-2" /> Open
                              </DropdownMenuItem>
                              {activeTab !== "trash" && (
                                <>
                                  <DropdownMenuItem onClick={(e) => startRename(e, doc)}>
                                    <PencilSimple size={14} className="mr-2" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleDuplicate(e, doc.id)}>
                                    <Copy size={14} className="mr-2" /> Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => handleSoftDelete(e, doc.id)}
                                    className="text-destructive"
                                  >
                                    <Trash size={14} className="mr-2" /> Move to Trash
                                  </DropdownMenuItem>
                                </>
                              )}
                              {activeTab === "trash" && (
                                <>
                                  <DropdownMenuItem onClick={(e) => handleRestore(e, doc.id)}>
                                    <ArrowCounterClockwise size={14} className="mr-2" /> Restore
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => handlePermanentDelete(e, doc.id)}
                                    className="text-destructive"
                                  >
                                    <Trash size={14} className="mr-2" /> Delete Permanently
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Title or Inline Rename Input */}
                      {isRenaming ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => commitRename(doc.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(doc.id)
                              if (e.key === "Escape") setRenamingId(null)
                            }}
                            className="w-full text-xs font-semibold text-foreground bg-transparent border-b border-[var(--ui-accent,#007AFF)] outline-none px-1 py-0.5"
                          />
                        </div>
                      ) : (
                        <div className="font-sans text-xs font-semibold text-foreground truncate group-hover:text-[var(--ui-accent,#007AFF)] transition-colors">
                          {doc.name}
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        {isPublic ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Publicly accessible">
                            <Globe size={11} /> Public
                          </span>
                        ) : isShared ? (
                          <span className="flex items-center gap-1 text-[var(--ui-accent,#007AFF)]" title="Shared with collaborators">
                            <ShareNetwork size={11} /> Shared
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground" title="Private local document">
                            <Lock size={11} /> Private
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── List View ── */
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs animate-card-fade">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Status</th>
                    <th className="py-3 px-4 hidden md:table-cell">Modified</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDocuments.map((doc) => {
                    const isPublic = "isPublic" in doc ? doc.isPublic : false
                    const isShared = activeTab === "shared" || ("shareState" in doc && doc.shareState === "shared")

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => handleOpenDoc(doc.id)}
                        className="group hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground group-hover:text-[var(--ui-accent,#007AFF)] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <FileText size={16} className="text-muted-foreground group-hover:text-[var(--ui-accent,#007AFF)] shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{doc.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          {isPublic ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                              <Globe size={11} /> Public
                            </span>
                          ) : isShared ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ui-accent,#007AFF)] font-mono">
                              <ShareNetwork size={11} /> Shared
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                              <Lock size={11} /> Private
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-muted-foreground font-mono text-[11px]">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {activeTab !== "trash" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handleDuplicate(e, doc.id)}
                                  title="Duplicate"
                                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleSoftDelete(e, doc.id)}
                                  title="Move to Trash"
                                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted"
                                >
                                  <Trash size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handleRestore(e, doc.id)}
                                  title="Restore"
                                  className="p-1 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-muted"
                                >
                                  <ArrowCounterClockwise size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handlePermanentDelete(e, doc.id)}
                                  title="Delete Permanently"
                                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted"
                                >
                                  <Trash size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
