"use client"

import React, { Component, type ReactNode } from "react"
import { ArrowCounterClockwise } from "@phosphor-icons/react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CanvasErrorBoundary] Caught canvas rendering error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--sq-paper,#fbfaf5)] p-6 text-[var(--sq-ink,#1a1a1a)]">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-[var(--sq-ink,#1a1a1a)]/20 bg-[var(--sq-paper,#fbfaf5)] p-5 text-center shadow-md">
            <h3 className="font-sketch text-lg font-bold">Canvas state recovered</h3>
            <p className="font-sans text-xs text-[var(--sq-ink,#1a1a1a)]/70">
              The drawing canvas ran into an unexpected mark and recovered safely.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-2 flex items-center gap-2 rounded bg-[var(--sq-ink,#1a1a1a)] px-3 py-1.5 text-xs font-medium text-[var(--sq-paper,#fbfaf5)] transition-opacity hover:opacity-90"
            >
              <ArrowCounterClockwise className="size-3.5" weight="bold" />
              Resume canvas
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
