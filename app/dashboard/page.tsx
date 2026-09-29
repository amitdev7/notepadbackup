"use client"

import { useState, useEffect } from "react"
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
  CloudCheck,
  Check,
  DotsThreeVertical,
} from "@phosphor-icons/react"
import { AuthCorner } from "@/components/chrome/auth-corner"
import { WorkspaceSwitcher } from "@/components/chrome/workspace-switcher"

export default function DashboardPage() {
  const { user, state, openAuthDialog } = useAuthStore()
  const [documents, setDocuments] = useState<StoredLocalDoc[]>([])
  const [sharedDocs, setSharedDocs] = useState<any[]>([])

  useEffect(() => {
    if (activeTab === "shared") {
      setLoading(true)
      // Fetch shared documents from Supabase if authenticated
      if (user) {
        import("@/lib/supabase/client").then(({ getSupabaseBrowserClient }) => {
          const supabase = getSupabaseBrowserClient()
          supabase
            .from("document_members")
            .select("document_id, role, created_at, documents(id, name, updated_at, is_public, schema_version)")
            .eq("user_id", user.id)
            .then(({ data, error }) => {
              if (!error && data) {
                const list = data
                  .filter((m: any) => m.documents)
                  .map((m: any) => ({
                    id: m.documents.id,
                    name: m.documents.name,
                    role: m.role,
                    updatedAt: m.documents.updated_at,
                    isPublic: m.documents.is_public,
                    shareState: "shared",
                  }))
                setSharedDocs(list)
              }
              setLoading(false)
            })
        })
      } else {
        setSharedDocs([])
        setLoading(false)
      }
    } else {
      listLocalDocuments(activeTab === "trash")
        .then((docs) => {
          if (activeTab === "trash") {
            setDocuments(docs.filter((d) => d.deletedAt !== null))
          } else {
            setDocuments(docs.filter((d) => d.deletedAt === null))
          }
        })
        .finally(() => setLoading(false))
    }
  }, [activeTab, user])

  const handleOpenDoc = (doc: { id: string }) => {
    // Navigate to canvas with docId or load into store
    if (typeof window !== "undefined") {
      window.location.href = `/?doc=${doc.id}`
    }
  }

  const handleCreateNew = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }

  return (
    <div className="flex h-screen w-screen bg-[#FBFAF5] text-stone-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 border-r border-stone-200/80 bg-stone-100/50 p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Workspace */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <a href="/" className="font-serif text-lg font-medium tracking-tight text-stone-800 flex items-center gap-1.5">
              <span>zenithsui</span>
            </a>
          </div>

          <div className="pt-3 pb-2">
            <WorkspaceSwitcher />
          </div>

          {/* New Document Button */}
          <Button
            onClick={handleCreateNew}
            className="w-full justify-center gap-2 text-xs h-8.5 mt-2 bg-stone-900 text-stone-50 hover:bg-stone-800"
          >
            <Plus size={14} weight="bold" />
            New Drawing
          </Button>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("recent")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors ${
                activeTab === "recent"
                  ? "bg-stone-200/70 text-stone-900"
                  : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900"
              }`}
            >
              <Clock size={16} />
              Recent Drawings
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("projects")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors ${
                activeTab === "projects"
                  ? "bg-stone-200/70 text-stone-900"
                  : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900"
              }`}
            >
              <Folder size={16} />
              Projects
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("shared")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors ${
                activeTab === "shared"
                  ? "bg-stone-200/70 text-stone-900"
                  : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900"
              }`}
            >
              <ShareNetwork size={16} />
              Shared with Me
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("trash")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors ${
                activeTab === "trash"
                  ? "bg-stone-200/70 text-stone-900"
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
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Canvas
          </a>
          <AuthCorner />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-stone-200/80 px-8 flex items-center justify-between">
          <h1 className="font-serif text-lg font-medium text-stone-800 capitalize">
            {activeTab === "recent" && "Recent Drawings"}
            {activeTab === "projects" && "Projects"}
            {activeTab === "shared" && "Shared with Me"}
            {activeTab === "trash" && "Trash"}
          </h1>

          {state === "unauthenticated" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAuthDialog("sign-in")}
              className="text-xs h-8"
            >
              Sign in to sync drawings
            </Button>
          )}
        </header>

        {/* Document Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="text-xs text-stone-400 py-12 text-center">Loading drawings…</div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto">
              <FileText size={36} className="mx-auto text-stone-300 mb-3" />
              <p className="text-sm font-medium text-stone-600 mb-1">
                {activeTab === "trash" ? "Trash is empty" : "No drawings found"}
              </p>
              <p className="text-xs text-stone-400 mb-4">
                {activeTab === "trash"
                  ? "Deleted items will appear here before permanent purge."
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
                const nodeCount = Object.keys(doc.doc?.nodes || {}).length
                const isSynced = doc.syncStatus === "synced"
                const isPublic = doc.isPublic
                const isShared = activeTab === "shared" || doc.shareState === "shared"

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
                          {activeTab === "shared" ? `${doc.role || "viewer"} role` : `${nodeCount} component${nodeCount === 1 ? "" : "s"}`}
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

