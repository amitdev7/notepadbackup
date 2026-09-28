// ---------------------------------------------------------------------------
// Page Version History Data Model & Types for Zenithsui
// ---------------------------------------------------------------------------

import type { Look } from "./theme"
import type { SquigNode } from "./types"

export interface PageVersionDoc {
  id: string
  name: string
  nodes: Record<string, SquigNode>
  order: string[]
  look?: Look
  updatedAt: number
  hasPassword?: boolean
}

export interface PageVersion {
  id: string
  pageId: string
  dbId: string
  version: number
  createdAt: number
  createdBy?: string
  label?: string
  reason?: string
  restoredFromVersion?: number
  doc: PageVersionDoc
}

export interface PageVersionMeta {
  id: string
  pageId: string
  dbId: string
  version: number
  createdAt: number
  createdBy?: string
  label?: string
  reason?: string
  restoredFromVersion?: number
  nodeCount: number
}
