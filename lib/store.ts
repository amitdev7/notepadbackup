import { create } from "zustand"
import type { SquigNode, ToolKind } from "./types"

interface SquigState {
  nodes: SquigNode[]
  selectedIds: string[]
  tool: ToolKind
  pan: { x: number; y: number }
  zoom: number
  activeCategory: string

  addNode: (node: SquigNode) => void
  updateNode: (id: string, patch: Partial<SquigNode>) => void
  deleteNodes: (ids: string[]) => void
  select: (ids: string[]) => void
  setTool: (tool: ToolKind) => void
  setPan: (pan: { x: number; y: number }) => void
  setZoom: (zoom: number) => void
  setActiveCategory: (cat: string) => void
}

export const useSquig = create<SquigState>((set) => ({
  nodes: [
    {
      id: "demo-student-header",
      type: "component",
      kind: "student.header",
      x: 120,
      y: 80,
      w: 460,
      h: 88,
      props: {
        courseCode: "CS 101",
        courseName: "Introduction to Computer Science",
        term: "Fall 2026 • Week 4",
      },
    },
    {
      id: "demo-assignment",
      type: "component",
      kind: "student.assignment-card",
      x: 120,
      y: 200,
      w: 260,
      h: 140,
      props: {
        title: "Problem Set 3: Recursion",
        due: "Tomorrow, 11:59 PM",
        points: "50 pts",
        status: "In Progress",
      },
    },
    {
      id: "demo-pomodoro",
      type: "component",
      kind: "student.pomodoro",
      x: 410,
      y: 200,
      w: 180,
      h: 180,
      props: {
        time: "24:50",
        session: "Deep Focus (1/4)",
      },
    },
  ],
  selectedIds: [],
  tool: "select",
  pan: { x: 0, y: 0 },
  zoom: 1,
  activeCategory: "student",

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as SquigNode) : n)),
    })),
  deleteNodes: (ids) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => !ids.includes(n.id)),
      selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
    })),
  select: (ids) => set({ selectedIds: ids }),
  setTool: (tool) => set({ tool }),
  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
}))
