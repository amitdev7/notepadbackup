"use client"

// ---------------------------------------------------------------------------
// Workspaces & Projects Store
//
// Manages personal and team workspaces, projects, membership, and cloud
// document metadata while strictly preserving the single-ink risograph
// visual language and canvas invariants.
// ---------------------------------------------------------------------------

import { create } from "zustand"
import { nanoid } from "nanoid"
import { listFiles, readFile, saveFile, deleteFile as dropFile, type FileMeta, type StoredDoc } from "./files"

export type WorkspaceType = "personal" | "team"
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer"
export type SyncStatus = "synced" | "syncing" | "offline" | "cloud"

export interface WorkspaceMember {
  id: string
  name: string
  email: string
  role: WorkspaceRole
  avatar?: string
  joinedAt: number
}

export interface Workspace {
  id: string
  name: string
  type: WorkspaceType
  role: WorkspaceRole
  description?: string
  members: WorkspaceMember[]
  createdAt: number
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description?: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface DashboardDoc {
  id: string
  name: string
  workspaceId: string
  projectId?: string
  updatedAt: number
  createdAt: number
  owner: {
    id: string
    name: string
    email: string
    avatar?: string
    isCurrentUser?: boolean
  }
  syncStatus: SyncStatus
  thumbnailSvg?: string
  sharedWithMe?: boolean
  isTrash?: boolean
  trashedAt?: number
}

interface WorkspaceState {
  activeWorkspaceId: string
  activeProjectId: string | null
  projectFilter: string
  workspaces: Workspace[]
  projects: Project[]
  documents: DashboardDoc[]
  hydrated: boolean

  // Dialogs
  newProjectDialogOpen: boolean
  inviteMemberDialogOpen: boolean

  // Actions
  hydrate: () => void
  setActiveWorkspace: (id: string) => void
  setActiveProject: (id: string | null) => void
  setProjectFilter: (query: string) => void
  setNewProjectDialogOpen: (open: boolean) => void
  setInviteMemberDialogOpen: (open: boolean) => void

  createProject: (name: string, description?: string, color?: string, workspaceId?: string) => Project
  inviteMember: (email: string, role: WorkspaceRole, name?: string, workspaceId?: string) => WorkspaceMember
  createDocument: (opts?: { name?: string; workspaceId?: string; projectId?: string }) => DashboardDoc
  trashDocument: (id: string) => void
  restoreDocument: (id: string) => void
  deleteDocumentPermanently: (id: string) => void
  updateDocumentTitle: (id: string, name: string) => void
  moveDocumentToProject: (id: string, projectId?: string) => void

  getActiveWorkspace: () => Workspace | undefined
  getActiveProject: () => Project | undefined
  getFilteredProjects: (query?: string) => Project[]
  getDocumentsByTab: (
    tab: "recent" | "projects" | "shared" | "trash",
    projectId?: string | null,
    search?: string
  ) => DashboardDoc[]
}

const STORAGE_KEY = "zenithsui:workspaces:v1"

const CURRENT_USER: WorkspaceMember = {
  id: "user-me",
  name: "You",
  email: "you@zenithsui.ink",
  role: "owner",
  joinedAt: Date.now() - 30 * 24 * 3600 * 1000,
}

const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: "ws-personal",
    name: "Personal Workspace",
    type: "personal",
    role: "owner",
    description: "Your private sketches and solo experiments",
    members: [CURRENT_USER],
    createdAt: Date.now() - 60 * 24 * 3600 * 1000,
  },
  {
    id: "ws-team-studio",
    name: "Zenithsui Studio",
    type: "team",
    role: "owner",
    description: "Collaborative canvas for design systems & wireframes",
    members: [
      CURRENT_USER,
      {
        id: "user-maya",
        name: "Maya Chen",
        email: "maya@zenithsui.ink",
        role: "admin",
        joinedAt: Date.now() - 20 * 24 * 3600 * 1000,
      },
      {
        id: "user-elias",
        name: "Elias Vance",
        email: "elias@zenithsui.ink",
        role: "member",
        joinedAt: Date.now() - 14 * 24 * 3600 * 1000,
      },
      {
        id: "user-sophia",
        name: "Sophia Ray",
        email: "sophia@zenithsui.ink",
        role: "viewer",
        joinedAt: Date.now() - 5 * 24 * 3600 * 1000,
      },
    ],
    createdAt: Date.now() - 25 * 24 * 3600 * 1000,
  },
]

const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj-drawings",
    workspaceId: "ws-personal",
    name: "Drafts & Sketches",
    description: "Unsorted scratchpads and quick layout ideas",
    color: "#2438FF",
    createdAt: Date.now() - 40 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 2 * 3600 * 1000,
  },
  {
    id: "proj-personal-notes",
    workspaceId: "ws-personal",
    name: "Brainstorms",
    description: "Personal thinking on canvas",
    color: "#71268A",
    createdAt: Date.now() - 15 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 24 * 3600 * 1000,
  },
  {
    id: "proj-design-system",
    workspaceId: "ws-team-studio",
    name: "Core Design System",
    description: "Components, typography, rough riso specs",
    color: "#E0342B",
    createdAt: Date.now() - 22 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 30 * 60 * 1000,
  },
  {
    id: "proj-mobile-app",
    workspaceId: "ws-team-studio",
    name: "Mobile Wireframes",
    description: "User flows and low-fi prototypes",
    color: "#137A3D",
    createdAt: Date.now() - 18 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 4 * 3600 * 1000,
  },
  {
    id: "proj-illustrations",
    workspaceId: "ws-team-studio",
    name: "Brand Assets",
    description: "Single-ink illustrations and glyph experiments",
    color: "#B26A0F",
    createdAt: Date.now() - 10 * 24 * 3600 * 1000,
    updatedAt: Date.now() - 3 * 24 * 3600 * 1000,
  },
]

const INITIAL_DOCUMENTS: DashboardDoc[] = [
  {
    id: "doc-welcome",
    name: "Zenithsui Quickstart Guide",
    workspaceId: "ws-personal",
    projectId: "proj-drawings",
    updatedAt: Date.now() - 12 * 60 * 1000,
    createdAt: Date.now() - 20 * 24 * 3600 * 1000,
    owner: { id: "user-me", name: "You", email: "you@zenithsui.ink", isCurrentUser: true },
    syncStatus: "synced",
  },
  {
    id: "doc-button-matrix",
    name: "Button & Control Primitives",
    workspaceId: "ws-team-studio",
    projectId: "proj-design-system",
    updatedAt: Date.now() - 45 * 60 * 1000,
    createdAt: Date.now() - 15 * 24 * 3600 * 1000,
    owner: { id: "user-maya", name: "Maya Chen", email: "maya@zenithsui.ink", isCurrentUser: false },
    syncStatus: "synced",
    sharedWithMe: true,
  },
  {
    id: "doc-checkout-flow",
    name: "Checkout Step-by-Step Flow",
    workspaceId: "ws-team-studio",
    projectId: "proj-mobile-app",
    updatedAt: Date.now() - 3 * 3600 * 1000,
    createdAt: Date.now() - 8 * 24 * 3600 * 1000,
    owner: { id: "user-elias", name: "Elias Vance", email: "elias@zenithsui.ink", isCurrentUser: false },
    syncStatus: "synced",
    sharedWithMe: true,
  },
  {
    id: "doc-iconography",
    name: "Phosphor Icon Exploration",
    workspaceId: "ws-team-studio",
    projectId: "proj-illustrations",
    updatedAt: Date.now() - 2 * 24 * 3600 * 1000,
    createdAt: Date.now() - 7 * 24 * 3600 * 1000,
    owner: { id: "user-me", name: "You", email: "you@zenithsui.ink", isCurrentUser: true },
    syncStatus: "cloud",
  },
]

function readStoredState(): {
  workspaces: Workspace[]
  projects: Project[]
  documents: DashboardDoc[]
  activeWorkspaceId: string
  activeProjectId: string | null
} | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStoredState(state: {
  workspaces: Workspace[]
  projects: Project[]
  documents: DashboardDoc[]
  activeWorkspaceId: string
  activeProjectId: string | null
}) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded or storage disabled
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeWorkspaceId: "ws-personal",
  activeProjectId: null,
  projectFilter: "",
  workspaces: INITIAL_WORKSPACES,
  projects: INITIAL_PROJECTS,
  documents: INITIAL_DOCUMENTS,
  hydrated: false,
  newProjectDialogOpen: false,
  inviteMemberDialogOpen: false,

  hydrate: () => {
    const stored = readStoredState()
    const localFiles = listFiles()

    const workspaces = stored?.workspaces ?? INITIAL_WORKSPACES
    const projects = stored?.projects ?? INITIAL_PROJECTS
    const documents = stored?.documents ?? INITIAL_DOCUMENTS
    let activeWorkspaceId = stored?.activeWorkspaceId ?? "ws-personal"
    const activeProjectId = stored?.activeProjectId ?? null

    // Ensure active workspace exists
    if (!workspaces.some((w) => w.id === activeWorkspaceId)) {
      activeWorkspaceId = workspaces[0]?.id ?? "ws-personal"
    }

    // Merge any real local files from lib/files into documents list so
    // canvas documents are always in sync with dashboard
    const docIds = new Set(documents.map((d) => d.id))
    for (const f of localFiles) {
      if (!docIds.has(f.id)) {
        documents.unshift({
          id: f.id,
          name: f.name,
          workspaceId: "ws-personal",
          projectId: "proj-drawings",
          updatedAt: f.updatedAt,
          createdAt: f.updatedAt,
          owner: {
            id: CURRENT_USER.id,
            name: CURRENT_USER.name,
            email: CURRENT_USER.email,
            isCurrentUser: true,
          },
          syncStatus: "synced",
        })
      } else {
        // Sync name and updatedAt if newer
        const doc = documents.find((d) => d.id === f.id)
        if (doc && f.updatedAt > doc.updatedAt) {
          doc.name = f.name
          doc.updatedAt = f.updatedAt
        }
      }
    }

    set({
      workspaces,
      projects,
      documents,
      activeWorkspaceId,
      activeProjectId,
      hydrated: true,
    })

    writeStoredState({
      workspaces,
      projects,
      documents,
      activeWorkspaceId,
      activeProjectId,
    })
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id, activeProjectId: null })
    const { workspaces, projects, documents, activeProjectId } = get()
    writeStoredState({
      workspaces,
      projects,
      documents,
      activeWorkspaceId: id,
      activeProjectId,
    })
  },

  setActiveProject: (id) => {
    set({ activeProjectId: id })
    const { workspaces, projects, documents, activeWorkspaceId } = get()
    writeStoredState({
      workspaces,
      projects,
      documents,
      activeWorkspaceId,
      activeProjectId: id,
    })
  },

  setProjectFilter: (query) => set({ projectFilter: query }),
  setNewProjectDialogOpen: (open) => set({ newProjectDialogOpen: open }),
  setInviteMemberDialogOpen: (open) => set({ inviteMemberDialogOpen: open }),

  createProject: (name, description, color = "#2438FF", workspaceId) => {
    const wsId = workspaceId ?? get().activeWorkspaceId
    const newProject: Project = {
      id: `proj-${nanoid(8)}`,
      workspaceId: wsId,
      name: name.trim() || "Untitled Project",
      description: description?.trim() || undefined,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    set((s) => {
      const projects = [newProject, ...s.projects]
      writeStoredState({
        workspaces: s.workspaces,
        projects,
        documents: s.documents,
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: newProject.id,
      })
      return { projects, activeProjectId: newProject.id, newProjectDialogOpen: false }
    })

    return newProject
  },

  inviteMember: (email, role, name, workspaceId) => {
    const wsId = workspaceId ?? get().activeWorkspaceId
    const memberName = name?.trim() || email.split("@")[0] || "Collaborator"
    const newMember: WorkspaceMember = {
      id: `user-${nanoid(6)}`,
      name: memberName,
      email: email.trim().toLowerCase(),
      role,
      joinedAt: Date.now(),
    }

    set((s) => {
      const workspaces = s.workspaces.map((w) => {
        if (w.id !== wsId) return w
        return {
          ...w,
          members: [...w.members.filter((m) => m.email !== newMember.email), newMember],
        }
      })
      writeStoredState({
        workspaces,
        projects: s.projects,
        documents: s.documents,
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: s.activeProjectId,
      })
      return { workspaces, inviteMemberDialogOpen: false }
    })

    return newMember
  },

  createDocument: (opts) => {
    const s = get()
    const wsId = opts?.workspaceId ?? s.activeWorkspaceId
    const projId = opts?.projectId ?? s.activeProjectId ?? undefined
    const docId = nanoid(8)
    const title = opts?.name?.trim() || "untitled scribbles"

    // Persist real empty StoredDoc in files.ts drawer
    const newStoredDoc: StoredDoc = {
      id: docId,
      name: title,
      nodes: {},
      order: [],
      updatedAt: Date.now(),
    }
    saveFile(newStoredDoc)

    const newDoc: DashboardDoc = {
      id: docId,
      name: title,
      workspaceId: wsId,
      projectId: projId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      owner: {
        id: CURRENT_USER.id,
        name: CURRENT_USER.name,
        email: CURRENT_USER.email,
        isCurrentUser: true,
      },
      syncStatus: "synced",
    }

    set((state) => {
      const documents = [newDoc, ...state.documents]
      writeStoredState({
        workspaces: state.workspaces,
        projects: state.projects,
        documents,
        activeWorkspaceId: state.activeWorkspaceId,
        activeProjectId: state.activeProjectId,
      })
      return { documents }
    })

    return newDoc
  },

  trashDocument: (id) => {
    set((s) => {
      const documents = s.documents.map((d) => (d.id === id ? { ...d, isTrash: true, trashedAt: Date.now() } : d))
      writeStoredState({
        workspaces: s.workspaces,
        projects: s.projects,
        documents,
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: s.activeProjectId,
      })
      return { documents }
    })
  },

  restoreDocument: (id) => {
    set((s) => {
      const documents = s.documents.map((d) => (d.id === id ? { ...d, isTrash: false, trashedAt: undefined } : d))
      writeStoredState({
        workspaces: s.workspaces,
        projects: s.projects,
        documents,
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: s.activeProjectId,
      })
      return { documents }
    })
  },

  deleteDocumentPermanently: (id) => {
    dropFile(id)
    set((s) => {
      const documents = s.documents.filter((d) => d.id !== id)
      writeStoredState({
        workspaces: s.workspaces,
        projects: s.projects,
        documents,
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: s.activeProjectId,
      })
      return { documents }
    })
  },

  updateDocumentTitle: (id, name) => {
    const trimmed = name.trim() || "untitled scribbles"
    // Also update in files.ts if present
    const existing = readFile(id)
    if (existing) {
      saveFile({ ...existing, name: trimmed, updatedAt: Date.now() })
    }
    set((s) => {
      const documents = s.documents.map((d) => (d.id === id ? { ...d, name: trimmed, updatedAt: Date.now() } : d))
      writeStoredState({
        workspaces: s.workspaces,
        projects: s.projects,
        documents,
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: s.activeProjectId,
      })
      return { documents }
    })
  },

  moveDocumentToProject: (id, projectId) => {
    set((s) => {
      const documents = s.documents.map((d) => (d.id === id ? { ...d, projectId } : d))
      writeStoredState({
        workspaces: s.workspaces,
        projects: s.projects,
        documents,
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: s.activeProjectId,
      })
      return { documents }
    })
  },

  getActiveWorkspace: () => {
    const s = get()
    return s.workspaces.find((w) => w.id === s.activeWorkspaceId) || s.workspaces[0]
  },

  getActiveProject: () => {
    const s = get()
    return s.projects.find((p) => p.id === s.activeProjectId)
  },

  getFilteredProjects: (query) => {
    const s = get()
    const list = s.projects.filter((p) => p.workspaceId === s.activeWorkspaceId)
    const q = (query ?? s.projectFilter).toLowerCase().trim()
    if (!q) return list
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  },

  getDocumentsByTab: (tab, projectId, search) => {
    const s = get()
    const q = (search ?? "").toLowerCase().trim()
    let list = s.documents

    if (tab === "trash") {
      list = list.filter((d) => d.isTrash)
    } else {
      list = list.filter((d) => !d.isTrash)

      if (tab === "recent") {
        list = list.filter((d) => d.workspaceId === s.activeWorkspaceId)
      } else if (tab === "projects") {
        list = list.filter((d) => d.workspaceId === s.activeWorkspaceId)
        if (projectId) {
          list = list.filter((d) => d.projectId === projectId)
        }
      } else if (tab === "shared") {
        list = list.filter((d) => d.sharedWithMe)
      }
    }

    if (q) {
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.owner.name.toLowerCase().includes(q))
    }

    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  },
}))
