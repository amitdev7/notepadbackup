"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Workspace Home Modal
// Comprehensive hub for Multi-Boards, Storage, Trash, Favorites & Members
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"
import { useSquig } from "@/lib/store"
import {
  fetchWorkspacesClient,
  createWorkspaceClient,
  fetchBoardsClient,
  createBoardClient,
  renameBoardClient,
  duplicateBoardClient,
  deleteBoardClient,
  fetchTrashClient,
  restoreTrashItemClient,
  permanentlyDeleteTrashItemClient,
  fetchFavoritesClient,
  toggleFavoriteClient,
  fetchStorageClient,
  exportWorkspaceBackupClient,
} from "@/lib/workspaces-client"
import type {
  WorkspaceClientSummary,
  BoardClientSummary,
  TrashedItem,
  StorageSummary,
} from "@/lib/workspace-types"
import { relativeTime } from "@/lib/files"
import {
  House as HouseIcon,
  SquaresFour as BoardsIcon,
  Folder as FolderIcon,
  Star as StarIcon,
  Trash as TrashIcon,
  HardDrive as StorageIcon,
  Users as UsersIcon,
  Plus as PlusIcon,
  DotsThreeVertical as DotsIcon,
  DownloadSimple as ExportIcon,
  ArrowCounterClockwise as RestoreIcon,
  CaretDown as CaretDownIcon,
  X as XIcon,
  Check as CheckIcon,
  Copy as CopyIcon,
  FileText as FileTextIcon,
  FilePdf as FilePdfIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface WorkspaceHomeModalProps {
  open: boolean
  onClose: () => void
}

type ActiveTab = "boards" | "files" | "favorites" | "storage" | "trash" | "members"

export function WorkspaceHomeModal({ open, onClose }: WorkspaceHomeModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("boards")
  const [workspaces, setWorkspaces] = useState<WorkspaceClientSummary[]>([])
  const [activeWsId, setActiveWsId] = useState<string>("personal-workspace")
  const [boards, setBoards] = useState<BoardClientSummary[]>([])
  const [trash, setTrash] = useState<TrashedItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")

  const st = useSquig.getState

  // Load workspaces and current data
  useEffect(() => {
    if (!open) return
    let mounted = true
    setLoading(true)

    fetchWorkspacesClient()
      .then((wsList) => {
        if (!mounted) return
        setWorkspaces(wsList)
        const currentId = wsList[0]?.id || "personal-workspace"
        setActiveWsId(currentId)
        return loadWorkspaceData(currentId)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [open])

  const loadWorkspaceData = async (wsId: string) => {
    try {
      const [bList, tList, fList, sData] = await Promise.all([
        fetchBoardsClient(wsId),
        fetchTrashClient(wsId),
        fetchFavoritesClient(wsId),
        fetchStorageClient(wsId),
      ])
      setBoards(bList)
      setTrash(tList)
      setFavorites(fList)
      setStorage(sData)
    } catch (err) {
      console.warn("[WorkspaceHome] Error loading workspace data:", err)
    }
  }

  const handleSwitchWorkspace = (wsId: string) => {
    setActiveWsId(wsId)
    setLoading(true)
    loadWorkspaceData(wsId).finally(() => setLoading(false))
  }

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    try {
      const board = await createBoardClient(activeWsId, newBoardName.trim())
      setNewBoardName("")
      setCreatingBoard(false)
      await loadWorkspaceData(activeWsId)
      st().setNotice(`Created board: ${board.name}`)
    } catch (err: any) {
      st().setNotice(err.message || "Failed to create board")
    }
  }

  const handleOpenBoard = async (board: BoardClientSummary) => {
    onClose()
    st().setNotice(`Opening ${board.name}…`)
    await st().switchBoard(activeWsId, board.id)
  }

  const handleToggleFav = async (itemId: string) => {
    const isFav = await toggleFavoriteClient(activeWsId, itemId)
    setFavorites((prev) => (isFav ? [...prev, itemId] : prev.filter((id) => id !== itemId)))
    setBoards((prev) => prev.map((b) => (b.id === itemId ? { ...b, isFavorite: isFav } : b)))
  }

  const handleDuplicateBoard = async (boardId: string) => {
    const copy = await duplicateBoardClient(activeWsId, boardId)
    if (copy) {
      st().setNotice(`Duplicated board: ${copy.name}`)
      await loadWorkspaceData(activeWsId)
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    const ok = await deleteBoardClient(activeWsId, boardId)
    if (ok) {
      st().setNotice("Moved board to Trash")
      await loadWorkspaceData(activeWsId)
    }
  }

  const handleRestoreTrash = async (itemId: string) => {
    const ok = await restoreTrashItemClient(activeWsId, itemId)
    if (ok) {
      st().setNotice("Restored item from Trash")
      await loadWorkspaceData(activeWsId)
    }
  }

  const handlePermanentDelete = async (itemId: string) => {
    const ok = await permanentlyDeleteTrashItemClient(activeWsId, itemId)
    if (ok) {
      st().setNotice("Permanently deleted item")
      await loadWorkspaceData(activeWsId)
    }
  }

  const handleExportBackup = async () => {
    st().setNotice("Exporting workspace backup…")
    const pkg = await exportWorkspaceBackupClient(activeWsId)
    if (!pkg) {
      st().setNotice("Failed to export backup")
      return
    }
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${pkg.workspace.slug || "workspace"}-backup.zenithsui-workspace`
    a.click()
    URL.revokeObjectURL(url)
    st().setNotice("Workspace backup downloaded")
  }

  const activeWs = workspaces.find((w) => w.id === activeWsId) || workspaces[0]

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workspace Hub"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onPointerDown={onClose}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-chrome-lg border border-[var(--sq-border)] bg-[var(--sq-paper)] text-[var(--sq-ink)] shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sq-border)] px-6 py-4 bg-[var(--sq-bg)]/40">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-chrome-sm bg-[var(--sq-ink)] text-[var(--sq-bg)] flex items-center justify-center font-bold text-sm shadow-sm">
              {activeWs?.name.charAt(0).toUpperCase() || "W"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select
                  value={activeWsId}
                  onChange={(e) => handleSwitchWorkspace(e.target.value)}
                  aria-label="Select workspace"
                  className="font-semibold text-base bg-transparent border-none outline-none cursor-pointer pr-2 hover:opacity-80"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id} className="bg-[var(--sq-paper)] text-[var(--sq-ink)]">
                      {ws.name} ({ws.role})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-[var(--sq-border)] bg-[var(--sq-paper)] text-[var(--sq-muted)]">
                  {activeWs?.role || "Owner"}
                </span>
              </div>
              <div className="text-xs text-[var(--sq-muted)]">
                {activeWs?.description || "Collaborative whiteboard and design workspace"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              className="text-xs h-8 rounded-chrome-sm border-[var(--sq-border)]"
            >
              <ExportIcon className="size-3.5 mr-1.5" />
              Export Backup
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-chrome-sm text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--sq-border)] px-6 bg-[var(--sq-paper)] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("boards")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "boards"
                ? "border-[var(--sq-ink)] text-[var(--sq-ink)]"
                : "border-transparent text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
            }`}
          >
            <BoardsIcon className="size-3.5" />
            Boards ({boards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "favorites"
                ? "border-[var(--sq-ink)] text-[var(--sq-ink)]"
                : "border-transparent text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
            }`}
          >
            <StarIcon className="size-3.5" />
            Favorites ({favorites.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("storage")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "storage"
                ? "border-[var(--sq-ink)] text-[var(--sq-ink)]"
                : "border-transparent text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
            }`}
          >
            <StorageIcon className="size-3.5" />
            Storage ({storage ? `${Math.round(storage.usedBytes / 1024 / 1024 * 10) / 10} MB` : "…"})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trash")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "trash"
                ? "border-[var(--sq-ink)] text-[var(--sq-ink)]"
                : "border-transparent text-[var(--sq-muted)] hover:text-[var(--sq-ink)]"
            }`}
          >
            <TrashIcon className="size-3.5" />
            Trash ({trash.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. BOARDS TAB */}
          {activeTab === "boards" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[var(--sq-muted)]">
                  Each board has its own canvas nodes, order, and viewport.
                </div>
                {!creatingBoard && (
                  <Button
                    size="sm"
                    onClick={() => setCreatingBoard(true)}
                    className="h-8 text-xs bg-[var(--sq-ink)] text-[var(--sq-bg)] rounded-chrome-sm hover:opacity-90"
                  >
                    <PlusIcon className="size-3.5 mr-1" />
                    New Board
                  </Button>
                )}
              </div>

              {creatingBoard && (
                <div className="p-3 bg-[var(--sq-bg)] border border-[var(--sq-border)] rounded-chrome-sm flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Board name (e.g., Marketing Flow, Mobile App)"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                    autoFocus
                    className="flex-1 bg-[var(--sq-paper)] border border-[var(--sq-border)] px-3 py-1.5 text-xs rounded-chrome-sm focus:outline-none"
                  />
                  <Button size="sm" onClick={handleCreateBoard} className="h-8 text-xs rounded-chrome-sm">
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCreatingBoard(false)}
                    className="h-8 text-xs rounded-chrome-sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    className="group relative border border-[var(--sq-border)] rounded-chrome p-3.5 bg-[var(--sq-paper)] hover:border-[var(--sq-ink)] transition-colors cursor-pointer flex flex-col justify-between h-32"
                    onClick={() => handleOpenBoard(b)}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm line-clamp-1 group-hover:underline">
                          {b.name}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFav(b.id)
                          }}
                          className="text-[var(--sq-muted)] hover:text-amber-500"
                        >
                          <StarIcon
                            className={`size-4 ${b.isFavorite ? "fill-amber-500 text-amber-500" : ""}`}
                          />
                        </button>
                      </div>
                      <div className="text-[11px] text-[var(--sq-muted)] mt-1">
                        {b.nodeCount} objects • updated {relativeTime(b.updatedAt)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--sq-border)]/50 text-[11px]">
                      <span className="text-[var(--sq-muted)] font-mono text-[10px]">
                        {b.id.slice(0, 10)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Duplicate board"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateBoard(b.id)
                          }}
                          className="p-1 text-[var(--sq-muted)] hover:text-[var(--sq-ink)] rounded"
                        >
                          <CopyIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Move to trash"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteBoard(b.id)
                          }}
                          className="p-1 text-[var(--sq-muted)] hover:text-red-500 rounded"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. FAVORITES TAB */}
          {activeTab === "favorites" && (
            <div className="space-y-3">
              <div className="text-xs text-[var(--sq-muted)]">
                Starred boards and documents for fast access.
              </div>
              {boards.filter((b) => b.isFavorite).length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--sq-muted)]">
                  No starred items yet. Click the star icon on any board to bookmark it.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {boards
                    .filter((b) => b.isFavorite)
                    .map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleOpenBoard(b)}
                        className="border border-[var(--sq-border)] rounded-chrome p-3 bg-[var(--sq-paper)] hover:border-[var(--sq-ink)] cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-xs">{b.name}</div>
                          <div className="text-[10px] text-[var(--sq-muted)]">
                            {b.nodeCount} layers • updated {relativeTime(b.updatedAt)}
                          </div>
                        </div>
                        <StarIcon className="size-4 fill-amber-500 text-amber-500" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 3. STORAGE TAB */}
          {activeTab === "storage" && storage && (
            <div className="space-y-6">
              <div className="p-4 bg-[var(--sq-bg)] border border-[var(--sq-border)] rounded-chrome">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold">Workspace Storage Usage</div>
                  <div className="text-xs text-[var(--sq-muted)]">
                    {Math.round(storage.usedBytes / 1024 / 1024 * 10) / 10} MB / {Math.round((storage.quotaBytes || 524288000) / 1024 / 1024)} MB (Free Tier)
                  </div>
                </div>
                <div className="w-full bg-[var(--sq-border)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--sq-ink)] h-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(2, (storage.usedBytes / (storage.quotaBytes || 524288000)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  <div className="p-2 border border-[var(--sq-border)] rounded-chrome-sm bg-[var(--sq-paper)]">
                    <div className="font-bold text-sm">{storage.boardsCount}</div>
                    <div className="text-[10px] text-[var(--sq-muted)]">Boards</div>
                  </div>
                  <div className="p-2 border border-[var(--sq-border)] rounded-chrome-sm bg-[var(--sq-paper)]">
                    <div className="font-bold text-sm">{storage.pdfsCount}</div>
                    <div className="text-[10px] text-[var(--sq-muted)]">PDFs</div>
                  </div>
                  <div className="p-2 border border-[var(--sq-border)] rounded-chrome-sm bg-[var(--sq-paper)]">
                    <div className="font-bold text-sm">{storage.filesCount}</div>
                    <div className="text-[10px] text-[var(--sq-muted)]">Files</div>
                  </div>
                  <div className="p-2 border border-[var(--sq-border)] rounded-chrome-sm bg-[var(--sq-paper)]">
                    <div className="font-bold text-sm">{Math.round(storage.trashBytes / 1024)} KB</div>
                    <div className="text-[10px] text-[var(--sq-muted)]">Trash</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium mb-2">Largest Files in Workspace</div>
                <div className="border border-[var(--sq-border)] rounded-chrome overflow-hidden text-xs">
                  {storage.largestFiles.map((f, i) => (
                    <div
                      key={f.id + i}
                      className="flex items-center justify-between p-2.5 border-b border-[var(--sq-border)]/60 last:border-none hover:bg-[var(--sq-bg)]/40"
                    >
                      <div className="flex items-center gap-2">
                        {f.type === "pdf" ? (
                          <FilePdfIcon className="size-4 text-red-500" />
                        ) : (
                          <FileTextIcon className="size-4 text-[var(--sq-muted)]" />
                        )}
                        <span className="font-medium line-clamp-1">{f.name}</span>
                      </div>
                      <div className="text-[11px] text-[var(--sq-muted)]">
                        {Math.round(f.size / 1024)} KB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. TRASH & RECOVERY TAB */}
          {activeTab === "trash" && (
            <div className="space-y-4">
              <div className="text-xs text-[var(--sq-muted)]">
                Items in trash can be safely restored to their original location or permanently deleted.
              </div>

              {trash.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--sq-muted)]">
                  Trash is empty.
                </div>
              ) : (
                <div className="border border-[var(--sq-border)] rounded-chrome overflow-hidden text-xs">
                  {trash.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border-b border-[var(--sq-border)]/60 last:border-none hover:bg-[var(--sq-bg)]/40"
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-[10px] text-[var(--sq-muted)]">
                          {item.itemType} • Trashed {relativeTime(item.trashedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreTrash(item.id)}
                          className="h-7 text-xs rounded-chrome-sm border-[var(--sq-border)]"
                        >
                          <RestoreIcon className="size-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePermanentDelete(item.id)}
                          className="h-7 text-xs rounded-chrome-sm text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        >
                          Delete Permanently
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
