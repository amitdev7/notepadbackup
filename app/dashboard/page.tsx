"use client"

import { useState, useEffect } from "react"
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
import { listLocalDocuments, type StoredLocalDoc } from "@/lib/storage/documents"
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

  useEffect(() => {
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
        queueMicrotask(() => {
          if (!cancelled) setLoading(true)
        })
        listLocalDocuments(activeTab === "trash")
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

    const handleOpenDoc = (doc: { id: string }) => {
      router.push(`/?doc=${doc.id}`)
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
        <div className="flex h-screen w-screen bg-[#FBFAF5] dark:bg-[#0E1015] text-stone-900 dark:text-stone-100 font-sans overflow-hidden">
          {/* Sidebar */}
          <aside className="w-60 border-r border-stone-200/80 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/60 p-4 flex flex-col justify-between shrink-0">
            <div className="flex h-screen w-screen bg-[#FBFAF5] dark:bg-[#0E1015] text-stone-900 dark:text-stone-100 font-sans overflow-hidden select-none">
              {/* ── Mobile Sidebar Overlay & Drawer ── */}
              {mobileSidebarOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                    onClick={() => setMobileSidebarOpen(false)}
                  />
                  <aside className="relative w-72 max-w-[80vw] h-full bg-stone-50 dark:bg-stone-900 border-r border-stone-200/90 dark:border-stone-800 p-4 flex flex-col justify-between shadow-2xl animate-popover-enter">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                        <Link href="/" className="font-sans text-base font-bold tracking-tight text-blue-600 dark:text-blue-400">
                          zenithsui
                        </Link>
                        <button
                          type="button"
                          onClick={() => setMobileSidebarOpen(false)}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white"
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
                        className="w-full mt-3 justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-medium rounded-xl"
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
                              ? "bg-blue-600/12 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-semibold"
                              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50"
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
                              ? "bg-blue-600/12 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-semibold"
                              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50"
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
                              ? "bg-blue-600/12 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-semibold"
                              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50"
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
                              ? "bg-blue-600/12 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-semibold"
                              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50"
                          )}
                        >
                          <Trash size={16} />
                          <span>Trash</span>
                        </button>
                      </nav>
                    </div>

                    <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800">
                      <Link
                        href="/"
                        className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Canvas</span>
                      </Link>
                    </div>
                  </aside>
                </div>
              )}

              {/* ── Desktop macOS Sidebar ── */}
              <aside className="hidden md:flex w-64 border-r border-stone-200/80 dark:border-stone-800/80 bg-stone-100/60 dark:bg-stone-900/60 backdrop-blur-xl p-4 flex-col justify-between shrink-0">
                <div>
                  {/* Logo & Workspace */}
                  <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
                    <Link href="/" className="font-sans text-base font-bold tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      {/* Logo & Workspace Selector */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-stone-800">
                        <Link
                          href="/"
                          className="font-sans text-base font-bold tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2 hover:opacity-85 transition-opacity"
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
                        className="w-full mt-3 justify-start gap-2 bg-stone-900 hover:bg-stone-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-2xs text-xs font-mono"
                        className="w-full mt-2.5 justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-medium rounded-xl cursor-pointer tactile-btn"
                        size="sm"
                      >
                        <Plus size={14} />
                        <Plus size={14} weight="bold" />
                        <span>New Drawing</span>
                      </Button>

                      {/* Navigation Links */}
                      <nav className="mt-6 space-y-1">
                        <button
                          onClick={() => setActiveTab("recent")}
                          className={`tactile-press w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5 ${activeTab === "recent"
                            ? "bg-stone-200/70 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-semibold"
                            : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100"
                            }`}
                        >
                          <Clock size={16} />
                          Recent
                        </button>
                        <div className="mt-6">
                          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                            Library
                          </span>
                          <nav className="mt-2 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => setActiveTab("recent")}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                                activeTab === "recent"
                                  ? "bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <Clock size={16} />
                                <span>Recent</span>
                              </div>
                            </button>

                            <button
                              onClick={() => setActiveTab("projects")}
                              className={`tactile-press w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5 ${activeTab === "projects"
                                ? "bg-stone-200/70 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-semibold"
                                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100"
                                }`}
                            >
                              <Folder size={16} />
                              Projects
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("projects")}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                                activeTab === "projects"
                                  ? "bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <Folder size={16} />
                                <span>Projects</span>
                              </div>
                            </button>

                            <button
                              onClick={() => setActiveTab("shared")}
                              className={`tactile-press w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5 ${activeTab === "shared"
                                ? "bg-stone-200/70 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-semibold"
                                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100"
                                }`}
                            >
                              <ShareNetwork size={16} />
                              Shared with me
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("shared")}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                                activeTab === "shared"
                                  ? "bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <ShareNetwork size={16} />
                                <span>Shared with me</span>
                              </div>
                            </button>

                            <button
                              onClick={() => setActiveTab("trash")}
                              className={`tactile-press w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5 ${activeTab === "trash"
                                ? "bg-stone-200/70 dark:bg-stone-800 text-stone-950 dark:text-stone-50 font-semibold"
                                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/40 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100"
                                }`}
                            >
                              <Trash size={16} />
                              Trash
                            </button>
                          </nav>
                          <button
                            type="button"
                            onClick={() => setActiveTab("trash")}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                              activeTab === "trash"
                                ? "bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                                : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100"
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
                <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                  <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800">
                    <Link
                      href="/"
                      className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                      className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                    >
                      <ArrowLeft size={14} />
                      Back to Canvas
                      <span>Back to Canvas</span>
                    </Link>
                  </div>
              </aside>

              {/* Main Content Area */}
              {/* ── Main Content Area ── */}
              <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-14 border-b border-stone-200/80 dark:border-stone-800 bg-white/60 dark:bg-[#121316]/80 px-8 flex items-center justify-between backdrop-blur-xs">
                  <h1 className="font-sans text-base font-semibold tracking-tight text-stone-800 dark:text-stone-100 capitalize">
                    {activeTab === "recent"
                      ? "Recent Drawings"
                      : activeTab === "projects"
                        ? "Projects"
                        : activeTab === "shared"
                          ? "Shared with Me"
                          : "Trash"}
                  </h1>
                  {/* Top Header Bar */}
                  <header className="h-14 border-b border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-[#121316]/80 px-4 sm:px-8 flex items-center justify-between backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-3">
                      {/* Mobile Hamburger Button */}
                      <button
                        type="button"
                        onClick={() => setMobileSidebarOpen(true)}
                        className="md:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
                        aria-label="Open sidebar"
                      >
                        <ListDashes size={20} />
                      </button>

                      <h1 className="font-sans text-sm sm:text-base font-semibold tracking-tight text-stone-800 dark:text-stone-100 capitalize">
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
                          className="absolute left-2.5 text-stone-400 dark:text-stone-500 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Filter drawings…"
                          aria-label="Filter drawings by name"
                          className="w-36 sm:w-56 pl-8 pr-3 py-1.5 rounded-xl text-xs bg-stone-100 dark:bg-stone-800/70 border border-stone-200/80 dark:border-stone-700/80 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* View Mode Switcher (Grid vs List) */}
                      <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80">
                        <button
                          type="button"
                          onClick={() => setViewMode("grid")}
                          aria-label="Grid view"
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            viewMode === "grid"
                              ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs"
                              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
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
                              ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs"
                              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                          )}
                        >
                          <List size={15} />
                        </button>
                      </div>
                    </div>
                  </header>

                  {/* Documents Grid / List */}
                  <div className="flex-1 overflow-y-auto p-8">
                    {/* Documents Content Grid / List */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                      {loading ? (
                        <div className="flex h-64 items-center justify-center text-sm font-mono text-stone-400 dark:text-stone-500">
                          <div className="flex h-64 items-center justify-center text-xs font-mono text-stone-400 dark:text-stone-500 animate-pulse">
                            Loading drawings…
                          </div>
                          ) : (activeTab === "shared" ? sharedDocs.length === 0 : documents.length === 0) ? (
                          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl p-8 text-center max-w-md mx-auto my-12">
                            <div className="rounded-full bg-stone-100 dark:bg-stone-800/80 p-3 text-stone-400 dark:text-stone-500 mb-3">
                              <FileText size={24} />
                              ) : filteredDocuments.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-200/90 dark:border-stone-800 rounded-2xl p-8 text-center max-w-md mx-auto my-12 animate-card-fade">
                                <div className="rounded-2xl bg-stone-100 dark:bg-stone-800/80 p-3.5 text-stone-400 dark:text-stone-500 mb-3 shadow-2xs">
                                  <FileText size={28} />
                                </div>
                                <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200">
                                  {activeTab === "trash"
                                    ? "Trash is empty"
                                    : activeTab === "shared"
                                      ? "No shared documents"
                                      : "No drawings yet"}
                                  <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                                    {searchQuery
                                      ? "No matching drawings"
                                      : activeTab === "trash"
                                        ? "Trash is empty"
                                        : activeTab === "shared"
                                          ? "No shared documents"
                                          : "No drawings yet"}
                                  </h3>
                                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-4">
                                    {activeTab === "trash"
                                      ? "Documents you delete will show up here."
                                      : activeTab === "shared"
                                        ? "Documents shared with your account will appear here."
                                        : "Start a new wireframe on the napkin canvas."}
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-4 max-w-xs">
                                      {searchQuery
                                        ? `No drawings found matching "${searchQuery}". Clear your search or create a new file.`
                                        : activeTab === "trash"
                                          ? "Drawings you move to trash will appear here for recovery."
                                          : activeTab === "shared"
                                            ? "Drawings shared with your account or team will appear here."
                                            : "Start a clean hand-drawn diagram or prototype on the infinite canvas."}
                                    </p>
                                    {activeTab !== "trash" && (
                                      <Button onClick={handleCreateNew} size="sm" className="text-xs">
                                        Create drawing
                                        <Button onClick={handleCreateNew} size="sm" className="text-xs rounded-xl tactile-btn">
                                          <Plus size={14} className="mr-1.5" /> Create drawing
                                        </Button>
              )}
                                      </div>
                                    ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                      {(activeTab === "shared" ? sharedDocs : documents).map((doc) => {
                                        const nodeCount = Object.keys(('doc' in doc ? doc.doc?.nodes : undefined) || {}).length
                                        const isPublic = 'isPublic' in doc ? doc.isPublic : false
                                        const isShared = activeTab === "shared" || ('shareState' in doc && doc.shareState === "shared")
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
                                              onClick={() => handleOpenDoc(doc)}
                                              className="group tactile-card animate-card-fade relative rounded-xl border border-stone-200 dark:border-stone-800/90 bg-white dark:bg-[#18191E] p-4 shadow-2xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer flex flex-col justify-between h-44"
                                              onClick={() => handleOpenDoc(doc.id)}
                                              className="group tactile-card relative rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18191E]/90 p-4 shadow-xs hover:shadow-lg hover:border-blue-500/50 dark:hover:border-blue-500/50 cursor-pointer flex flex-col justify-between h-48 backdrop-blur-xs"
                                            >
                                              <div>
                                                {/* Document Preview Box / Thumbnail */}
                                                <div className="h-20 w-full rounded-md bg-[#FBFAF5] dark:bg-stone-900 border border-stone-200/70 dark:border-stone-700/60 flex items-center justify-center text-stone-500 group-hover:text-stone-800 dark:group-hover:text-stone-200 group-hover:scale-[1.02] transition-all duration-200 mb-3">
                                                  <span className="font-sketch text-sm">
                                                    {activeTab === "shared" && 'role' in doc ? `${doc.role || "viewer"} role` : `${nodeCount} component${nodeCount === 1 ? "" : "s"}`}
                                                    {/* Thumbnail Preview Area */}
                                                    <div className="h-24 w-full rounded-xl bg-[#FBFAF5] dark:bg-stone-900 border border-stone-200/60 dark:border-stone-700/60 flex items-center justify-center text-stone-500 group-hover:text-stone-900 dark:group-hover:text-stone-100 group-hover:scale-[1.01] transition-transform duration-200 mb-3 shadow-2xs relative overflow-hidden">
                                                      <span className="font-sketch text-xs text-stone-600 dark:text-stone-400">
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
                                                            className="size-7 rounded-lg bg-white/90 dark:bg-stone-800/90 shadow-xs flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-white border border-stone-200/60 dark:border-stone-700/60 outline-none"
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
                                                                  className="text-red-600 dark:text-red-400"
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
                                                                  className="text-red-600 dark:text-red-400"
                                                                >
                                                                  <Trash size={14} className="mr-2" /> Delete Permanently
                                                                </DropdownMenuItem>
                                                              </>
                                                            )}
                                                          </DropdownMenuContent>
                                                        </DropdownMenu>
                                                      </div>
                                                    </div>

                                                    <div className="font-sans text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">
                                                      {doc.name}
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
                                                          className="w-full text-xs font-semibold text-stone-900 dark:text-white bg-transparent border-b border-blue-500 outline-none px-1 py-0.5"
                                                        />
                                                      </div>
                                                    ) : (
                                                      <div className="font-sans text-xs font-semibold text-stone-800 dark:text-stone-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {doc.name}
                                                      </div>
                                                    )}
                                                </div>

                                                {/* Metadata Footer */}
                                                <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500 pt-2 border-t border-stone-100 dark:border-stone-800/60">
                                                  <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                                                  <span className="flex items-center gap-1 font-mono text-[10px]">
                                                    {isPublic ? (
                          <span title="Public on web">🌐 Public</span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Publicly accessible">
                            <Globe size={11} /> Public
                          </span>
                                                    ) : isShared ? (
                          <span title="Shared with collaborators">🔗 Shared</span>
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title="Shared with collaborators">
                            <ShareNetwork size={11} /> Shared
                          </span>
                                                    ) : (
                          <span title="Private to you">🔒 Private</span>
                          <span className="flex items-center gap-1 text-stone-400" title="Private local document">
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
                                        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-[#18191E]/90 overflow-hidden shadow-xs animate-card-fade">
                                          <table className="w-full text-left text-xs">
                                            <thead>
                                              <tr className="border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/50 text-stone-400 dark:text-stone-500 text-[11px] uppercase tracking-wider font-semibold">
                                                <th className="py-3 px-4">Name</th>
                                                <th className="py-3 px-4 hidden sm:table-cell">Status</th>
                                                <th className="py-3 px-4 hidden md:table-cell">Modified</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                                              {filteredDocuments.map((doc) => {
                                                const isPublic = "isPublic" in doc ? doc.isPublic : false
                                                const isShared = activeTab === "shared" || ("shareState" in doc && doc.shareState === "shared")

                                                return (
                                                  <tr
                                                    key={doc.id}
                                                    onClick={() => handleOpenDoc(doc.id)}
                                                    className="group hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer transition-colors"
                                                  >
                                                    <td className="py-3 px-4 font-medium text-stone-800 dark:text-stone-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                      <div className="flex items-center gap-2.5">
                                                        <FileText size={16} className="text-stone-400 group-hover:text-blue-500 shrink-0" />
                                                        <span className="truncate max-w-[200px] sm:max-w-xs">{doc.name}</span>
                                                      </div>
                                                    </td>
                                                    <td className="py-3 px-4 hidden sm:table-cell">
                                                      {isPublic ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                                                          <Globe size={11} /> Public
                                                        </span>
                                                      ) : isShared ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                                                          <ShareNetwork size={11} /> Shared
                                                        </span>
                                                      ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                                                          <Lock size={11} /> Private
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="py-3 px-4 hidden md:table-cell text-stone-400 font-mono text-[11px]">
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
                                                              className="p-1 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
                                                            >
                                                              <Copy size={14} />
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={(e) => handleSoftDelete(e, doc.id)}
                                                              title="Move to Trash"
                                                              className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"
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
                                                              className="p-1 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                                                            >
                                                              <ArrowCounterClockwise size={14} />
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={(e) => handlePermanentDelete(e, doc.id)}
                                                              title="Delete Permanently"
                                                              className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"
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
