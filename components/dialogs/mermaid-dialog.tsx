"use client"

import { useState } from "react"
import { useSquig } from "@/lib/store"
import { parseMermaidToZenithsui } from "@/lib/canvas-core/mermaid"
import { TreeStructure, X, Sparkle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const MERMAID_TEMPLATES = {
  flowchart_td: `flowchart TD
  Start[Start Project] --> Plan[Plan Architecture]
  Plan --> Develop{In Development?}
  Develop -->|Yes| Test[Run Tests]
  Develop -->|No| Backlog[Refine Backlog]
  Test --> Deploy[Deploy to Production]`,
  flowchart_lr: `flowchart LR
  Client[Web Browser] --> API[Next.js API Routes]
  API --> DB[(Supabase Postgres)]
  API --> Cache[(Local Storage)]`,
  sequence: `sequenceDiagram
  participant User
  participant Client
  participant Server
  User->>Client: Click Export Doc
  Client->>Server: Request Document Signature
  Server-->>Client: Return Signed Payload
  Client->>User: Download File Complete`,
}

export function MermaidDialog() {
  const open = useSquig((s) => s.mermaidDialogOpen)
  const setOpen = useSquig((s) => s.setMermaidDialogOpen)
  const addNodes = useSquig((s) => s.addNodes)
  const setSelection = useSquig((s) => s.setSelection)
  const viewport = useSquig((s) => s.viewport)
  const setNotice = useSquig((s) => s.setNotice)

  const [code, setCode] = useState(MERMAID_TEMPLATES.flowchart_td)
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof MERMAID_TEMPLATES>("flowchart_td")

  if (!open) return null

  const handleSelectTemplate = (tpl: keyof typeof MERMAID_TEMPLATES) => {
    setActiveTemplate(tpl)
    setCode(MERMAID_TEMPLATES[tpl])
  }

  const handleInsert = () => {
    const trimmed = code.trim()
    if (!trimmed) return

    const cx = Math.round((-viewport.x + window.innerWidth / 2) / viewport.zoom)
    const cy = Math.round((-viewport.y + window.innerHeight / 2) / viewport.zoom)

    const result = parseMermaidToZenithsui(trimmed, cx - 250, cy - 150)
    if (result.nodes.length > 0) {
      addNodes(result.nodes)
      setSelection(result.nodes.map((n) => n.id))
      setNotice(`Generated Mermaid diagram (${result.nodes.length} elements)`)
    }

    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-popover-enter">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-[#1C1C1F] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TreeStructure size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Insert Mermaid Diagram</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Render flowcharts and sequence diagrams as editable canvas nodes</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Templates */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/50">
            <button
              onClick={() => handleSelectTemplate("flowchart_td")}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center",
                activeTemplate === "flowchart_td"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              )}
            >
              Flowchart (TD)
            </button>
            <button
              onClick={() => handleSelectTemplate("flowchart_lr")}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center",
                activeTemplate === "flowchart_lr"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              )}
            >
              Flowchart (LR)
            </button>
            <button
              onClick={() => handleSelectTemplate("sequence")}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center",
                activeTemplate === "sequence"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              )}
            >
              Sequence Diagram
            </button>
          </div>

          {/* Syntax Code Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Mermaid Syntax
              </label>
              <button
                onClick={() => setCode(MERMAID_TEMPLATES[activeTemplate])}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Sparkle size={10} /> Reset Template
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={9}
              placeholder="Paste or write Mermaid definition..."
              className="w-full p-3 font-mono text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800/60 text-[11px] text-stone-500 dark:text-stone-400">
            💡 Supported diagram types: <code className="font-mono text-stone-700 dark:text-stone-300">flowchart TD</code>, <code className="font-mono text-stone-700 dark:text-stone-300">flowchart LR</code>, <code className="font-mono text-stone-700 dark:text-stone-300">graph TD/LR</code>, <code className="font-mono text-stone-700 dark:text-stone-300">sequenceDiagram</code>. Nodes and arrows will be created as native editable hand-drawn elements with arrow bindings.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-stone-200/60 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-900/30">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-xs font-medium rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!code.trim()}
            onClick={handleInsert}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            Generate & Insert Diagram
          </button>
        </div>
      </div>
    </div>
  )
}
