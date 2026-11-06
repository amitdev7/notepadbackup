"use client"

// ---------------------------------------------------------------------------
// Inline text editing — the editor stands exactly where the words already are.
//
// Nothing moves when you start typing. The drawn run is hidden, and a bare
// textarea takes its place on the same baseline, at the same size, weight and
// alignment, growing around the same edge the renderer anchors to. No box, no
// panel, no field: a caret in the drawing, and the words you're changing.
//
// A double-click opens this, and so does Return on a selected layer.
// Enter (or ⌘Enter on a multi-line text node), Escape and clicking away all
// commit — leaving the editor never throws typed words away.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react"

import { useSquig } from "@/lib/store"
import type { ComponentNode, SquigNode, TextNode } from "@/lib/types"
import type { EditTarget } from "@/lib/canvas/edit-target"
import { fontMetrics, measureLinesWidth, wrapText } from "@/lib/canvas/text-metrics"
import { fitTextBox } from "@/lib/canvas/text-reflow"
import { TEXT_LINE_HEIGHT, anchorFactor, textAnchorX, textBaseline } from "@/lib/sketch/text-layout"

/**
 * How far past the words the editor still answers to the pointer, in screen
 * px. Padding rather than margin, so a click landing there goes to the
 * textarea — which puts the caret at the nearest spot in the text instead of
 * committing and dropping you out of the edit. Clicking just past the end of
 * a line to type from there is the single most common caret gesture, and it
 * has to keep you in.
 */
const CARET_PAD = 8

export function TextEditOverlay({ node, target }: { node: SquigNode; target: EditTarget }) {
  const v = useSquig((s) => s.viewport)
  const st = useSquig.getState

  const isText = node.type === "text"
  const isSticky = node.type === "sticky"
  const [value, setValue] = useState(target.value)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const cancelledRef = useRef(false)

  const cancel = () => {
    cancelledRef.current = true
    const s = st()
    if (s.editingId !== node.id) return
    // An empty text node that was just placed and had no prior text goes on cancel
    if (isText && !target.value.trim()) {
      s.removeNodes([node.id])
    }
    s.setEditing(null)
  }

  const commit = () => {
    if (cancelledRef.current) return
    const s = st()
    if (s.editingId !== node.id) return

    // An empty text node with no prior text draws nothing and goes
    if (isText && !value.trim() && !target.value.trim()) {
      s.removeNodes([node.id])
      s.setEditing(null)
      s.saveNow()
      return
    }

    if (value === target.value) {
      // Nothing changed — don't create unnecessary undo step
      s.setEditing(null)
      s.saveNow()
      return
    }

    s.checkpoint()
    if (isText) {
      const trimmed = value.replace(/\s+$/, "")
      if (!trimmed && !target.value.trim()) {
        s.removeNodes([node.id], { checkpoint: false })
      } else {
        const textNode = node as TextNode
        const activeSize = textNode.fontSize || target.fontSize
        s.updateNode(node.id, fitTextBox(textNode, trimmed, activeSize) as Partial<SquigNode>)
      }
    } else if (isSticky) {
      s.updateNode(node.id, { text: value } as Partial<SquigNode>)
    } else if (target.propKey) {
      s.updateNode(node.id, {
        props: { ...(node as ComponentNode).props, [target.propKey]: value },
      } as Partial<SquigNode>)
    }
    s.setEditing(null)
    s.saveNow()
  }

  // Kept current so outside-press listener always commits latest value
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })

  // Safe commit on unmount (e.g. navigation or switching objects without cancel)
  useEffect(() => {
    return () => {
      if (!cancelledRef.current && st().editingId === node.id) {
        commitRef.current()
      }
    }
  }, [node.id, st])

  const settled = useRef(false)

  useEffect(() => {
    taRef.current?.focus()
    if (!target.value) {
      taRef.current?.select()
    } else {
      // Position caret at end of text so typing can continue naturally
      const len = target.value.length
      taRef.current?.setSelectionRange(len, len)
    }
    const raf = requestAnimationFrame(() => {
      settled.current = true
    })
    return () => cancelAnimationFrame(raf)
  }, [target.value])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.("textarea") === taRef.current) return
      commitRef.current()
    }
    window.addEventListener("pointerdown", onDown, true)
    return () => window.removeEventListener("pointerdown", onDown, true)
  }, [])

  const placeholder = isText ? "say something" : isSticky ? "Write a note…" : "label"

  /**
   * Put the textarea's first baseline on the renderer's.
   *
   * A line box centres the face's em box inside itself and sets the baseline at
   * half-leading + ascent — so measuring the ascent off the live font is what
   * lands the caret on the line the words were already printing on. The padding
   * is slack for ascenders, descenders and a caret at either end; the top-left
   * walks back by exactly that much, so none of it shifts anything.
   */
  // a fixed-width text layer edits inside its own box: the textarea holds the
  // box's width so the browser wraps the draft at the same measure the
  // renderer will, and only the height follows the typing
  const fixed = isText && !!(node as TextNode).fixedW

  // Read live text node styling so changes made during edit mode apply instantly
  const textNode = isText ? (node as TextNode) : null
  const currentFontSize = textNode?.fontSize || target.fontSize
  const currentBold = textNode?.bold !== undefined ? textNode.bold : target.bold
  const currentItalic = textNode?.italic !== undefined ? textNode.italic : target.italic
  const currentUnderline = textNode ? (!!textNode.underline || !!textNode.link) : (target.underline)
  const currentAlign = textNode?.align ?? target.align

  const box = useMemo(() => {
    const size = currentFontSize * v.zoom
    const style = { size, bold: currentBold, italic: currentItalic }
    const lineHeight = size * TEXT_LINE_HEIGHT
    const { ascent, descent } = fontMetrics(style)

    // an empty run still needs somewhere to show its placeholder
    const lineCount = fixed
      ? wrapText(value, node.w * v.zoom, style).length
      : value.split("\n").length
    const run = fixed
      ? node.w * v.zoom
      : measureLinesWidth(value ? value.split("\n") : [placeholder], style)
    const padY = size * 0.35
    const anchorX = (node.x + (isText ? textAnchorX(currentAlign, node.w) : target.x)) * v.zoom + v.x
    const baselineY = (node.y + (isText ? textBaseline(0, currentFontSize) : target.baseline)) * v.zoom + v.y

    return {
      left: fixed ? node.x * v.zoom + v.x - CARET_PAD : anchorX - CARET_PAD - anchorFactor(currentAlign) * run,
      top: baselineY - ((lineHeight - (ascent + descent)) / 2 + ascent) - padY,
      width: Math.max(64, run + CARET_PAD * 2),
      height: Math.max(lineHeight + padY * 2, lineCount * lineHeight + padY * 2),
      padding: `${padY}px ${CARET_PAD}px`,
      fontSize: size,
      lineHeight: `${lineHeight}px`,
    }
  }, [node.x, node.y, node.w, target, value, v, placeholder, fixed, currentFontSize, currentBold, currentItalic, currentAlign, isText])

  return (
    <textarea
      ref={taRef}
      value={value}
      wrap={fixed ? "soft" : "off"}
      spellCheck={false}
      onChange={(e) => setValue(target.multiline ? e.target.value : e.target.value.replace(/\n/g, ""))}
      onBlur={() => {
        if (!settled.current) {
          requestAnimationFrame(() => taRef.current?.focus())
          return
        }
        // the WINDOW losing focus — ⌘-tab, Spotlight, a notification, a
        // screenshot — is not the user leaving the edit. The element keeps
        // its in-document focus through those, so when they come back the
        // caret is still blinking where they left it. Only a real in-page
        // focus move commits.
        if (document.activeElement === taRef.current || !document.hasFocus()) return
        commit()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Escape") {
          // Escape cancels the edit and restores original value
          e.preventDefault()
          cancel()
          return
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !target.multiline)) {
          // Ctrl/Cmd+Enter commits multiline text; Enter commits single-line
          e.preventDefault()
          commit()
        }
      }}
      className="absolute resize-none overflow-hidden outline-none z-40 rounded-xs ring-1 ring-blue-500/70 shadow-xs"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        padding: box.padding,
        boxSizing: "border-box",
        fontSize: box.fontSize,
        lineHeight: box.lineHeight,
        fontFamily: "var(--sq-font)",
        fontWeight: currentBold ? 700 : 400,
        fontStyle: currentItalic ? "italic" : undefined,
        textDecoration: currentUnderline ? "underline" : undefined,
        textAlign: currentAlign,
        whiteSpace: fixed ? "pre-wrap" : "pre",
        // long words break where the canvas breaks them — mid-word, only when
        // the word alone is wider than the box; see wrapText
        overflowWrap: fixed ? "break-word" : undefined,
        color: (node as TextNode).color || target.color || "var(--sq-ink)",
        caretColor: (node as TextNode).color || "var(--sq-ink)",
        // the one tell that this run is live: a wash the width of the words,
        // rather than a field the words have been moved into
        background: "color-mix(in srgb, var(--sq-select) 12%, transparent)",
        boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0,0,0,0.06)",
        borderRadius: 2,
      }}
      placeholder={placeholder}
    />
  )
}
