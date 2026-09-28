"use client"

// ---------------------------------------------------------------------------
// Zenith PDF Classroom — Search Bar
// Search across all pages, jump between matches, and display match counters.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from "react"
import {
  MagnifyingGlassIcon,
  CaretUpIcon,
  CaretDownIcon,
  XIcon,
} from "@phosphor-icons/react"
import type { PdfSearchMatch } from "@/lib/pdf-types"
import { searchPdfText } from "@/lib/pdf-renderer"

export interface PdfSearchResultItem {
  pageNumber: number
  matches: number
}

interface PdfSearchBarProps {
  pdfSrc: string
  open: boolean
  currentPage: number
  onClose: () => void
  onMatchesFound: (matches: PdfSearchResultItem[]) => void
  onSelectMatch: (matchIndex: number, page: number) => void
}

export function PdfSearchBar({
  pdfSrc,
  open,
  currentPage,
  onClose,
  onMatchesFound,
  onSelectMatch,
}: PdfSearchBarProps) {
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<PdfSearchResultItem[]>([])
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setMatches([])
      onMatchesFound([])
    }
  }, [open])

  // Perform search on query change
  useEffect(() => {
    if (!query.trim() || !pdfSrc) {
      setMatches([])
      onMatchesFound([])
      return
    }

    let active = true
    setIsSearching(true)

    const timer = setTimeout(async () => {
      const results = await searchPdfText(pdfSrc, query)
      if (!active) return
      setIsSearching(false)
      setMatches(results)
      onMatchesFound(results)

      if (results.length > 0) {
        // Find first match on or after current page
        const preferred = results.findIndex((m) => m.pageNumber >= currentPage)
        const targetIdx = preferred >= 0 ? preferred : 0
        setCurrentMatchIdx(targetIdx)
        onSelectMatch(targetIdx, results[targetIdx].pageNumber)
      } else {
        setCurrentMatchIdx(0)
      }
    }, 220)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, pdfSrc])

  const handleNext = () => {
    if (!matches.length) return
    const nextIdx = (currentMatchIdx + 1) % matches.length
    setCurrentMatchIdx(nextIdx)
    onSelectMatch(nextIdx, matches[nextIdx].pageNumber)
  }

  const handlePrev = () => {
    if (!matches.length) return
    const prevIdx = (currentMatchIdx - 1 + matches.length) % matches.length
    setCurrentMatchIdx(prevIdx)
    onSelectMatch(prevIdx, matches[prevIdx].pageNumber)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (e.shiftKey) {
        handlePrev()
      } else {
        handleNext()
      }
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="absolute top-16 right-6 z-40 flex items-center gap-1.5 rounded-chrome border bg-[var(--sq-paper)] p-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="relative flex items-center">
        <MagnifyingGlassIcon className="absolute left-2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in PDF…"
          className="h-7 w-44 rounded-chrome-xs border bg-background pl-7 pr-2 text-label font-normal text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-[var(--sq-ink)]"
        />
      </div>

      {/* Match count indicator */}
      <span className="min-w-16 text-center text-micro tabular-nums font-mono text-muted-foreground">
        {isSearching
          ? "searching…"
          : matches.length > 0
            ? `${currentMatchIdx + 1} of ${matches.length}`
            : query
              ? "0 results"
              : ""}
      </span>

      {/* Nav buttons */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={!matches.length}
          onClick={handlePrev}
          className="flex size-6 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
          title="Previous match (Shift+Enter)"
        >
          <CaretUpIcon className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={!matches.length}
          onClick={handleNext}
          className="flex size-6 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
          title="Next match (Enter)"
        >
          <CaretDownIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded-chrome-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ml-1"
          title="Close search (Esc)"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
