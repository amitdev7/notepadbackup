"use client"

// ---------------------------------------------------------------------------
// Zenithsui Localized Canvas Error Boundary
//
// Prevents isolated runtime exceptions in floating toolbars, third-party embeds,
// or interactive component nodes from crashing the root application or triggering
// app/error.tsx.
// ---------------------------------------------------------------------------

import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { WarningCircle, ArrowCounterClockwise } from "@phosphor-icons/react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  name?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[Zenithsui CanvasErrorBoundary] Caught error in ${this.props.name || "Canvas Subtree"}:`,
      error,
      errorInfo
    )
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }

      return (
        <div className="p-3 m-2 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-3 shadow-lg select-none pointer-events-auto">
          <div className="flex items-center gap-2">
            <WarningCircle size={18} weight="fill" className="shrink-0 text-red-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-[11px]">
                {this.props.name || "Element"} encountered an issue
              </span>
              <span className="text-[10px] text-red-500/80 font-mono truncate max-w-[220px]">
                {this.state.error?.message || "Render error"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ArrowCounterClockwise size={12} weight="bold" />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
