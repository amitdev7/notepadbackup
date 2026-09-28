// ---------------------------------------------------------------------------
// Component Library Registry — NEW architecture.
//
// Every library item is one ComponentDef (see lib/library/AUTHORING.md):
// kind/name/category/group/keywords, default size, defaults + controls, and a
// pure render(p, w, h) that lays out against the passed w/h. This file only
// aggregates the defs-*.ts suites and indexes them; all drawing lives in the
// def files, all styling in @/lib/sketch/kit.
// ---------------------------------------------------------------------------

import type { Prim } from "@/lib/sketch/kit"
import { BASIC_DEFS } from "./defs-basic"
import { DISPLAY_DEFS } from "./defs-display"
import { NAV_DEFS } from "./defs-nav"
import { EXTRA_DEFS } from "./defs-extra"
import { MORE_DEFS } from "./defs-more"
import { MARKETING_DEFS } from "./defs-blocks-marketing"
import { APP_DEFS } from "./defs-blocks-app"
import { TEMPLATE_DEFS } from "./defs-templates"

export type Props = Record<string, unknown>

export type Category = "components" | "blocks"

export interface ControlDef {
  key: string
  label: string
  type: "text" | "select" | "toggle" | "number"
  options?: string[]
  min?: number
  max?: number
  quick?: boolean
}

export interface ComponentDef {
  kind: string
  name: string
  category: Category
  group: string
  keywords: string[]
  size: { w: number; h: number }
  defaults: Props
  controls: ControlDef[]
  render: (p: Props, w: number, h: number) => Prim[]
}

/** @deprecated Old-arch prop schema. Kept so stale imports still compile. */
export interface PropSchema {
  type: "text" | "number" | "boolean" | "select"
  label: string
  default: unknown
  options?: string[]
}

export const SOURCES: ComponentDef[][] = [
  BASIC_DEFS,
  DISPLAY_DEFS,
  NAV_DEFS,
  EXTRA_DEFS,
  MORE_DEFS,
  MARKETING_DEFS,
  APP_DEFS,
  TEMPLATE_DEFS,
]

export const ALL_DEFS: ComponentDef[] = SOURCES.flat()

export const REGISTRY: Record<string, ComponentDef> = Object.fromEntries(
  ALL_DEFS.map((d) => [d.kind, d])
)

/** Panel section headers per category — must match AUTHORING.md panel groups. */
export const GROUPS: Record<Category, string[]> = {
  components: ["Buttons", "Forms", "Selection", "Display", "Feedback", "Navigation", "Data", "Media"],
  blocks: ["Marketing", "Content", "Commerce", "App", "AI", "Screens"],
}

export function getDef(kind: string): ComponentDef | undefined {
  return REGISTRY[kind]
}

// New-arch order is (kind, props, w, h). The (kind, w, h, props, seed?)
// overload keeps pre-migration callers (canvas.tsx, library-panel.tsx)
// rendering until they are migrated — same prims either way.
export function renderComponent(kind: string, props: Props, w: number, h: number): Prim[]
export function renderComponent(kind: string, w: number, h: number, props: Props, seed?: number): Prim[]
export function renderComponent(
  kind: string,
  a: Props | number,
  b: number | Props,
  c: number | Props,
  _seed?: number
): Prim[] {
  const def = getDef(kind)
  if (!def) return []
  let props: Props
  let w: number
  let h: number
  if (typeof a === "number" && typeof b === "number") {
    w = a
    h = b
    props = (c as Props) ?? {}
  } else {
    props = (a as Props) ?? {}
    w = b as number
    h = c as number
  }
  return def.render({ ...def.defaults, ...props }, w, h)
}

/** Single-def predicate for a (case-insensitive) query. Empty query matches. */
export function matches(def: ComponentDef, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    def.kind.toLowerCase().includes(q) ||
    def.name.toLowerCase().includes(q) ||
    def.keywords.some((k) => k.toLowerCase().includes(q))
  )
}

export function searchDefs(query: string): ComponentDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return ALL_DEFS
  return ALL_DEFS.filter((d) => matches(d, q))
}

/** Alias used by the AI tool registry. */
export function searchAll(query: string): ComponentDef[] {
  return searchDefs(query)
}

/** Defs bucketed by category. */
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

// ---------------------------------------------------------------------------
// Legacy property shims — getters only, no visual change.
//
// store.ts reads def.defaultProps/defaultSize and library-panel.tsx reads
// def.defaultWidth/defaultHeight/def.props. Those callers are pre-migration
// and can't be touched here, so each def exposes the old names derived from
// the new ones until the callers move over.
// ---------------------------------------------------------------------------

type CompatDef = ComponentDef & {
  defaultSize?: { w: number; h: number }
  defaultProps?: Props
  defaultWidth?: number
  defaultHeight?: number
  props?: Record<string, PropSchema>
}

function legacyPropsOf(def: ComponentDef): Record<string, PropSchema> {
  const out: Record<string, PropSchema> = {}
  for (const c of def.controls) {
    out[c.key] = {
      type: (c.type === "toggle" ? "boolean" : c.type) as PropSchema["type"],
      label: c.label,
      default: def.defaults[c.key],
      ...(c.options ? { options: [...c.options] } : {}),
    }
  }
  return out
}

for (const def of ALL_DEFS) {
  const d = def as CompatDef
  if (d.defaultSize === undefined) {
    Object.defineProperty(d, "defaultSize", {
      get: () => ({ ...def.size }),
      enumerable: true,
      configurable: true,
    })
  }
  if (d.defaultProps === undefined) {
    Object.defineProperty(d, "defaultProps", {
      get: () => ({ ...def.defaults }),
      enumerable: true,
      configurable: true,
    })
  }
  if (d.defaultWidth === undefined) {
    Object.defineProperty(d, "defaultWidth", {
      get: () => def.size.w,
      enumerable: true,
      configurable: true,
    })
  }
  if (d.defaultHeight === undefined) {
    Object.defineProperty(d, "defaultHeight", {
      get: () => def.size.h,
      enumerable: true,
      configurable: true,
    })
  }
  if (d.props === undefined) {
    Object.defineProperty(d, "props", {
      get: () => legacyPropsOf(def),
      enumerable: true,
      configurable: true,
    })
  }
}
