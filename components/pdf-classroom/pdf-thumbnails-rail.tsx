"use client"

// ---------------------------------------------------------------------------
// Zenith PDF Classroom — Thumbnails Navigation Rail
// Collapsible sidebar showing page cards with thumbnail previews,
// page indicators, annotation counts, and quick navigation.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react"
import {
  CaretLeftIcon,
  CaretRightIcon,
  ArrowsClockwiseIcon,
  PencilSimpleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"
import { renderPdfThumbnail } from "@/lib/pdf-renderer"
import type { PdfAnnotation } from "@/lib/pdf-types"
import { cn } from "@/lib/utils"

interface PdfThumbnailsRailProps {
  pdfSrc: string
  attachmentId?: string
  pageCount: number
  currentPage: number
  annotations?: Record<number, PdfAnnotation[]>
  open: boolean
  onSelectPage: (page: number) => void
  onClose: () => void
  onRotatePage?: (page: number) => void
  onClearPageAnnotations?: (page: number) => void
}

export function PdfThumbnailsRail({
  pdfSrc,
  attachmentId,
  pageCount,
  currentPage,
  annotations = {},
  open,
  onSelectPage,
  onClose,
  onRotatePage,
  onClearPageAnnotations,
}: PdfThumbnailsRailProps) {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

  // Lazy-load page thumbnails
  useEffect(() => {
    if (!open || !pdfSrc) return
    let active = true

    const loadThumbs = async () => {
      // Prioritize current page and surrounding pages
      const pagesToLoad = Array.from({ length: pageCount }, (_, i) => i + 1)
      for (const p of pagesToLoad) {
        if (!active) break
        if (thumbnails[p]) continue

        const url = await renderPdfThumbnail(pdfSrc, p, attachmentId)
        if (url && active) {
          setThumbnails((prev) => ({ ...prev, [p]: url }))
        }
      }
    }

    void loadThumbs()
    return () => {
      active = false
    }
  }, [open, pdfSrc, pageCount, attachmentId])

  if (!open) return null

  return (
    <div className="absolute left-0 top-0 bottom-0 z-30 flex w-56 flex-col border-r bg-[var(--sq-paper)] shadow-lg animate-in slide-in-from-left duration-150">
      {/* Rail Header */}
      <div className="flex h-11 items-center justify-between border-b px-3">
        <span className="text-caption font-semibold text-foreground">
          Slides & Pages ({pageCount})
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Close Thumbnails"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      {/* Thumbnails Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Array.from({ length: pageCount }).map((_, idx) => {
          const pageNum = idx + 1
          const isSelected = pageNum === currentPage
          const pageAnns = annotations[pageNum] || []
          const thumbUrl = thumbnails[pageNum]

          return (
            <div
              key={pageNum}
              onClick={() => onSelectPage(pageNum)}
              className={cn(
                "group relative flex flex-col cursor-pointer rounded-chrome-sm border p-1.5 transition-all",
                isSelected
                  ? "border-[var(--sq-ink)] bg-accent/40 shadow-sm ring-1 ring-[var(--sq-ink)]"
                  : "border-border hover:border-muted-foreground hover:bg-accent/20"
              )}
            >
              {/* Thumbnail Frame */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xs border border-border/70 bg-white flex items-center justify-center">
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Page ${pageNum}`}
                    className="size-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="text-[11px] text-muted-foreground">p. {pageNum}</span>
                )}

                {/* Annotation Count Badge */}
                {pageAnns.length > 0 && (
                  <div
                    className="absolute top-1 right-1 flex items-center gap-0.5 rounded-full bg-[var(--sq-ink)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--sq-paper)] shadow-xs"
                    title={`${pageAnns.length} annotations`}
                  >
                    <PencilSimpleIcon className="size-2.5" />
                    <span>{pageAnns.length}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Info & Controls */}
              <div className="mt-1.5 flex items-center justify-between px-0.5">
                <span className="text-[11px] font-mono font-medium text-foreground">
                  Page {pageNum}
                </span>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRotatePage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRotatePage(pageNum)
                      }}
                      className="flex size-5 items-center justify-center rounded-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Rotate Page 90°"
                    >
                      <ArrowsClockwiseIcon className="size-3" />
                    </button>
                  )}
                  {pageAnns.length > 0 && onClearPageAnnotations && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClearPageAnnotations(pageNum)
                      }}
                      className="flex size-5 items-center justify-center rounded-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      title="Clear annotations on this page"
                    >
                      <TrashIcon className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
