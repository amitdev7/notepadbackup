"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { listLocalDocuments, type StoredLocalDoc } from "@/lib/storage/documents"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Plus,
  ArrowLeft,
  Folder,
  ShareNetwork,
  Trash,
  Clock,
} from "@phosphor-icons/react"
import { AuthCorner } from "@/components/chrome/auth-corner"
import { WorkspaceSwitcher } from "@/components/chrome/workspace-switcher"

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

export default function DashboardPage() {
  const router = useRouter()
  const { user, state, openAuthDialog } = useAuthStore()
  const [documents, setDocuments] = useState<StoredLocalDoc[]>([])
  const [sharedDocs, setSharedDocs] = useState<SharedDocItem[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("recent")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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
  }

  const handleCreateNew = () => {
    router.push("/")
  }

  return (
    <div className="flex h-screen w-screen bg-[#FBFAF5] text-stone-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 border-r border-stone-200/80 bg-stone-100/50 p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Workspace */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <Link href="/" className="font-serif text-lg font-medium tracking-tight text-stone-800 flex items-center gap-1.5">
              <span>zenithsui</span>
            </Link>
          </div>

          <div className="pt-3 pb-2">
            <WorkspaceSwitcher />
          </div>

          {/* New Document Button */}
          <Button
            onClick={handleCreateNew}
            className="w-full mt-3 justify-start gap-2 bg-stone-900 hover:bg-stone-800 text-white shadow-2xs text-xs font-mono"
            size="sm"
          >
            <Plus size={14} />
            <span>New Drawing</span>
          </Button>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1">
            <button
              onClick={() => setActiveTab("recent")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "recent"
                  ? "bg-stone-200/70 text-stone-950 font-semibold"
                  : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900"
              }`}
            >
              <Clock size={16} />
              Recent
            </button>

            <button
              onClick={() => setActiveTab("projects")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "projects"
                  ? "bg-stone-200/70 text-stone-950 font-semibold"
                  : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900"
              }`}
            >
              <Folder size={16} />
              Projects
            </button>

            <button
              onClick={() => setActiveTab("shared")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "shared"
                  ? "bg-stone-200/70 text-stone-950 font-semibold"
                  : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900"
              }`}
            >
              <ShareNetwork size={16} />
              Shared with me
            </button>

            <button
              onClick={() => setActiveTab("trash")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "trash"
                  ? "bg-stone-200/70 text-stone-950 font-semibold"
                  : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900"
              }`}
            >
              <Trash size={16} />
              Trash
            </button>
          </nav>
        </div>

        {/* Back to Canvas & Auth */}
        <div className="pt-4 border-t border-stone-200/80 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Canvas
          </Link>
          <AuthCorner />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-stone-200/80 bg-white/60 px-8 flex items-center justify-between backdrop-blur-xs">
          <h1 className="font-serif text-lg font-medium text-stone-800 capitalize">
            {activeTab === "recent"
              ? "Recent Drawings"
              : activeTab === "projects"
              ? "Projects"
              : activeTab === "shared"
              ? "Shared with Me"
              : "Trash"}
          </h1>

          <div className="flex items-center gap-3">
            {state !== "authenticated" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAuthDialog("sign-in")}
                className="text-xs font-mono h-8 border-stone-300"
              >
                Sign In to Sync
              </Button>
            )}
          </div>
        </header>

        {/* Documents Grid / List */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm font-mono text-stone-400">
              Loading drawings…
            </div>
          ) : (activeTab === "shared" ? sharedDocs.length === 0 : documents.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-stone-200 rounded-xl p-8 text-center max-w-md mx-auto my-12">
              <div className="rounded-full bg-stone-100 p-3 text-stone-400 mb-3">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-medium text-stone-800">
                {activeTab === "trash"
                  ? "Trash is empty"
                  : activeTab === "shared"
                  ? "No shared documents"
                  : "No drawings yet"}
              </h3>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                {activeTab === "trash"
                  ? "Documents you delete will show up here."
                  : activeTab === "shared"
                  ? "Documents shared with your account will appear here."
                  : "Start a new wireframe on the napkin canvas."}
              </p>
              {activeTab !== "trash" && (
                <Button onClick={handleCreateNew} size="sm" className="text-xs">
                  Create drawing
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(activeTab === "shared" ? sharedDocs : documents).map((doc) => {
                const nodeCount = Object.keys(('doc' in doc ? doc.doc?.nodes : undefined) || {}).length
                const isPublic = 'isPublic' in doc ? doc.isPublic : false
                const isShared = activeTab === "shared" || ('shareState' in doc && doc.shareState === "shared")

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleOpenDoc(doc)}
                    className="group relative rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:shadow-md hover:border-stone-300 transition-all cursor-pointer flex flex-col justify-between h-44"
                  >
                    <div>
                      {/* Document Preview Box / Thumbnail */}
                      <div className="h-20 w-full rounded-md bg-[#FBFAF5] border border-stone-100 flex items-center justify-center text-stone-300 group-hover:text-stone-400 transition-colors mb-3">
                        <span className="font-sketch text-sm">
                          {activeTab === "shared" && 'role' in doc ? `${doc.role || "viewer"} role` : `${nodeCount} component${nodeCount === 1 ? "" : "s"}`}
                        </span>
                      </div>

                      <div className="font-serif text-sm font-medium text-stone-800 truncate">
                        {doc.name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-100">
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        {isPublic ? (
                          <span title="Public on web">🌐 Public</span>
                        ) : isShared ? (
                          <span title="Shared with collaborators">🔗 Shared</span>
                        ) : (
                          <span title="Private to you">🔒 Private</span>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
