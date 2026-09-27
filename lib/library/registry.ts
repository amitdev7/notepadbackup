// ---------------------------------------------------------------------------
// Component Library Registry
// Aggregates definitions across basic, display, nav, and student suites.
// ---------------------------------------------------------------------------

import type { Prim } from "@/lib/sketch/kit"
import { STUDENT_DEFS } from "./defs-student"

export interface PropSchema {
  type: "text" | "number" | "boolean" | "select"
  label: string
  default: unknown
  options?: string[]
}

export interface ComponentDef {
  kind: string
  name: string
  category: string
  keywords: string[]
  icon: string
  defaultWidth: number
  defaultHeight: number
  props: Record<string, PropSchema>
  emit: (w: number, h: number, props: Record<string, unknown>, seed?: number) => Prim[]
}

export const SOURCES: ComponentDef[][] = [
  STUDENT_DEFS,
]

export const ALL_DEFS: ComponentDef[] = SOURCES.flat()

export const REGISTRY: Record<string, ComponentDef> = Object.fromEntries(
  ALL_DEFS.map((d) => [d.kind, d])
)

export function getDef(kind: string): ComponentDef | undefined {
  return REGISTRY[kind]
}

export function renderComponent(
  kind: string,
  w: number,
  h: number,
  props: Record<string, unknown>,
  seed?: number
): Prim[] {
  const def = getDef(kind)
  if (!def) return []
  return def.emit(w, h, props, seed)
}

export function searchDefs(query: string): ComponentDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return ALL_DEFS
  return ALL_DEFS.filter((d) => {
    return (
      d.kind.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.keywords.some((k) => k.toLowerCase().includes(q))
    )
  })
}

export function groupDefs(): Record<string, ComponentDef[]> {
  const groups: Record<string, ComponentDef[]> = {}
  for (const def of ALL_DEFS) {
    if (!groups[def.category]) {
      groups[def.category] = []
    }
    groups[def.category].push(def)
  }
  return groups
}
