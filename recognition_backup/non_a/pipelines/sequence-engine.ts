// ---------------------------------------------------------------------------
// Smart Sketch Recognition — Sequence & Context Engine
// Groups multi-stroke characters, recognizes continuous handwriting & numbers,
// applies dictionary context and disambiguation.
// ---------------------------------------------------------------------------

import type { CharacterCandidate, HandwritingResult, Point } from "./types"
import { extractStrokeFeatures, segmentsIntersect } from "./preprocessing"
import { normalizeGlyph, scoreCharacter } from "./handwriting-classifier"

// Common wireframing, UI, and English vocabulary for dictionary matching
const COMMON_DICTIONARY = new Set([
  "HELLO",
  "WORLD",
  "APPLE",
  "DESIGN",
  "WIREFRAME",
  "ZENITHSUI",
  "ABC",
  "TEST",
  "USER",
  "LOGIN",
  "BUTTON",
  "INPUT",
  "CARD",
  "PAGE",
  "HOME",
  "VIEW",
  "ICON",
  "FILE",
  "DATA",
  "SEARCH",
  "CREATE",
  "DELETE",
  "EDIT",
  "SAVE",
  "CANCEL",
  "NEXT",
  "BACK",
  "MENU",
  "NAV",
  "FORM",
  "TEXT",
  "OK",
  "YES",
  "NO",
  "START",
  "STOP",
  "SEND",
  "EMAIL",
  "NAME",
  "PASSWORD",
  "SETTINGS",
  "PROFILE",
  "DASHBOARD",
  "TITLE",
  "SUBTITLE",
  "HEADER",
  "FOOTER",
  "SIDEBAR",
  "MODAL",
  "ALERT",
  "TOAST",
  "DROPDOWN",
  "CHECKBOX",
  "RADIO",
  "SWITCH",
  "SLIDER",
  "PROGRESS",
  "AVATAR",
  "BADGE",
  "TABLE",
  "LIST",
  "GRID",
  "ROW",
  "COL",
  "FLEX",
  "BOX",
  "HERO",
  "PRICING",
  "FAQ",
  "INVOICE",
  "STATS",
  "METRIC",
  "CHART",
  "GRAPH",
  "ANALYTICS",
  "TEAM",
  "PROJECT",
  "TASK",
  "BOARD",
  "NOTE",
  "DOCUMENT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "LINK",
  "TAG",
  "CHIP",
  "PILL",
  "TAB",
  "STEPPER",
  "BREADCRUMB",
  "PAGINATION",
  "TOOLTIP",
  "POPOVER",
  "ACCORDION",
  "DRAWER",
  "SHEET",
  "DIALOG",
  "DIVIDER",
  "SPACER",
  "CONTAINER",
  "SECTION",
  "ARTICLE",
  "MAIN",
  "ASIDE",
  "NAVBAR",
  "APP",
  "WEB",
  "MOBILE",
  "DESKTOP",
  "API",
  "URL",
  "HTTP",
  "HTTPS",
  "ID",
  "KEY",
  "TOKEN",
  "AUTH",
  "OAUTH",
  "DATABASE",
  "SQL",
  "POSTGRES",
  "SUPABASE",
  "FIREBASE",
  "REACT",
  "NEXTJS",
  "NODE",
  "HTML",
  "CSS",
  "JS",
  "TS",
  "JSON",
  "SVG",
  "PDF",
  "PNG",
  "JPG",
])

export interface StrokeBox {
  index: number
  stroke: Point[]
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

export interface CharacterCluster {
  strokeIndices: number[]
  strokes: Point[][]
  bounds: { x: number; y: number; w: number; h: number }
  candidates: CharacterCandidate[]
  chosen: CharacterCandidate | null
}

function strokesIntersectOrTouch(s1: Point[], s2: Point[]): boolean {
  for (let i = 0; i < s1.length - 1; i++) {
    for (let j = 0; j < s2.length - 1; j++) {
      if (segmentsIntersect(s1[i], s1[i + 1], s2[j], s2[j + 1])) {
        return true
      }
    }
  }
  const ends1 = [s1[0], s1[s1.length - 1]]
  const ends2 = [s2[0], s2[s2.length - 1]]
  for (const e1 of ends1) {
    for (const e2 of ends2) {
      if (Math.hypot(e1[0] - e2[0], e1[1] - e2[1]) <= 4.5) {
        return true
      }
    }
  }
  return false
}

/**
 * Cluster raw strokes into individual character glyphs.
 * Groups multi-stroke characters based on spatial overlap and bounding proximity.
 */
export function clusterStrokesIntoCharacters(strokes: Point[][]): CharacterCluster[] {
  if (strokes.length === 0) return []

  // Compute bounding box for each stroke
  const strokeBoxes: StrokeBox[] = strokes.map((s, idx) => {
    const xs = s.map((p) => p[0])
    const ys = s.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return {
      index: idx,
      stroke: s,
      x: minX,
      y: minY,
      w: Math.max(maxX - minX, 1),
      h: Math.max(maxY - minY, 1),
      cx: minX + (maxX - minX) / 2,
      cy: minY + (maxY - minY) / 2,
    }
  })

  // Estimate median stroke height across the group to scale proximity
  const heights = strokeBoxes.map((b) => b.h).sort((a, b) => a - b)
  const medianHeight = heights[Math.floor(heights.length / 2)] || 24

  // Group strokes: multi-stroke characters share physical overlap or intersection
  const clusters: StrokeBox[][] = []

  // Sort strokes by X coordinate of start/center
  const sorted = [...strokeBoxes].sort((a, b) => a.x - b.x)

  for (const box of sorted) {
    let placed = false
    for (const cluster of clusters) {
      const clusterMinX = Math.min(...cluster.map((c) => c.x))
      const clusterMaxX = Math.max(...cluster.map((c) => c.x + c.w))
      const clusterMinY = Math.min(...cluster.map((c) => c.y))
      const clusterMaxY = Math.max(...cluster.map((c) => c.y + c.h))

      const clusterW = clusterMaxX - clusterMinX
      const clusterH = clusterMaxY - clusterMinY

      const xOverlap = Math.min(box.x + box.w, clusterMaxX) - Math.max(box.x, clusterMinX)
      const yOverlap = Math.min(box.y + box.h, clusterMaxY) - Math.max(box.y, clusterMinY)
      const horizontalGap = Math.max(0, box.x - clusterMaxX)

      const touches = cluster.some((c) => strokesIntersectOrTouch(box.stroke, c.stroke))
      const significantXOverlap = xOverlap >= Math.min(box.w, clusterW) * 0.20 && yOverlap >= 0
      const veryClose =
        horizontalGap <= Math.max(4, 0.08 * medianHeight) &&
        yOverlap >= Math.min(box.h, clusterH) * 0.45
      const verticalStack =
        xOverlap >= Math.min(box.w, clusterW) * 0.45 &&
        Math.abs(box.y - clusterMaxY) <= Math.max(10, 0.25 * medianHeight)

      const isSameCharacter = touches || significantXOverlap || veryClose || verticalStack

      if (isSameCharacter) {
        cluster.push(box)
        placed = true
        break
      }
    }

    if (!placed) {
      clusters.push([box])
    }
  }

  // Convert clusters into CharacterCluster instances
  const result: CharacterCluster[] = []
  for (const group of clusters) {
    const clusterStrokes = group.map((g) => g.stroke)
    const indices = group.map((g) => g.index)
    const xs = group.flatMap((g) => [g.x, g.x + g.w])
    const ys = group.flatMap((g) => [g.y, g.y + g.h])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }

    const norm = normalizeGlyph(clusterStrokes)
    const candidates = scoreCharacter(norm)

    result.push({
      strokeIndices: indices,
      strokes: clusterStrokes,
      bounds,
      candidates,
      chosen: candidates[0] || null,
    })
  }

  // Sort clusters by X coordinate (left-to-right reading order)
  result.sort((a, b) => a.bounds.x - b.bounds.x)
  return result
}

// ---------------------------------------------------------------------------
// Contextual Disambiguation
// ---------------------------------------------------------------------------

const DIGIT_PAIRS: Record<string, string> = {
  O: "0",
  I: "1",
  S: "5",
  B: "8",
  Z: "2",
  G: "6",
}

const LETTER_PAIRS: Record<string, string> = {
  "0": "O",
  "1": "I",
  "5": "S",
  "8": "B",
  "2": "Z",
  "6": "G",
}

function isDigit(char: string): boolean {
  return /^[0-9]$/.test(char)
}

function isLetter(char: string): boolean {
  return /^[A-Z]$/.test(char)
}

/**
 * Apply context rules to resolve ambiguous characters in a sequence
 */
export function disambiguateSequence(clusters: CharacterCluster[]): void {
  if (clusters.length <= 1) return

  // First: check dictionary word (e.g. HE11O -> HELLO, W0RLD -> WORLD, DES1GN -> DESIGN)
  const currentStr = clusters.map((c) => c.chosen?.text || "").join("")
  const wordWithLetters = currentStr
    .split("")
    .map((ch) => LETTER_PAIRS[ch] || ch)
    .join("")

  if (COMMON_DICTIONARY.has(wordWithLetters)) {
    for (const c of clusters) {
      if (!c.chosen) continue
      const t = c.chosen.text
      if (t in LETTER_PAIRS) {
        const alt = LETTER_PAIRS[t]
        const altCandidate = c.candidates.find((cand) => cand.text === alt)
        if (altCandidate) {
          c.chosen = { ...altCandidate, confidence: Math.max(altCandidate.confidence, 0.95) }
        } else {
          c.chosen = { ...c.chosen, text: alt, confidence: Math.max(c.chosen.confidence, 0.92) }
        }
      }
    }
    return
  }

  // Second: check pure numbers (e.g. 100, 2026, 8080, 1234, 555)
  // If sequence does not contain letters that are outside DIGIT_PAIRS (i.e. every character is a digit or {O, I, S, B, Z})
  // AND there is at least one digit or all characters have digit candidate alternates:
  const hasDefiniteDigit = clusters.some((c) => c.chosen && /^[0-9]$/.test(c.chosen.text))
  const allCouldBeDigits = clusters.every((c) => {
    if (!c.chosen) return false
    return isDigit(c.chosen.text) || c.chosen.text in DIGIT_PAIRS
  })

  // Ensure it's not a mixed sequence with explicit non-ambiguous letters
  const hasNonDigitLetters = clusters.some((c) => c.chosen && isLetter(c.chosen.text) && !(c.chosen.text in DIGIT_PAIRS))

  if (allCouldBeDigits && !hasNonDigitLetters && (hasDefiniteDigit || clusters.length >= 2)) {
    for (const c of clusters) {
      if (!c.chosen) continue
      const t = c.chosen.text
      if (t in DIGIT_PAIRS) {
        const alt = DIGIT_PAIRS[t]
        const altCandidate = c.candidates.find((cand) => cand.text === alt)
        if (altCandidate) {
          c.chosen = { ...altCandidate, confidence: Math.max(altCandidate.confidence, 0.94) }
        } else {
          c.chosen = { ...c.chosen, text: alt, confidence: Math.max(c.chosen.confidence, 0.92) }
        }
      }
    }
    return
  }

  // Third: localized digit context for ambiguous O and I in mixed strings (e.g. 2O26A -> 2026A)
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]
    if (!c.chosen) continue
    const t = c.chosen.text
    if (t === "O" || t === "I") {
      const prevIsDigit = i > 0 && !!clusters[i - 1].chosen && isDigit(clusters[i - 1].chosen!.text)
      const nextIsDigit = i < clusters.length - 1 && !!clusters[i + 1].chosen && isDigit(clusters[i + 1].chosen!.text)

      const nearbyDigitsCount = [
        i > 1 && !!clusters[i - 2].chosen && isDigit(clusters[i - 2].chosen!.text),
        prevIsDigit,
        nextIsDigit,
        i < clusters.length - 2 && !!clusters[i + 2].chosen && isDigit(clusters[i + 2].chosen!.text),
      ].filter(Boolean).length

      if ((prevIsDigit && nextIsDigit) || nearbyDigitsCount >= 2) {
        const alt = t === "O" ? "0" : "1"
        const altCandidate = c.candidates.find((cand) => cand.text === alt)
        if (altCandidate) {
          c.chosen = { ...altCandidate, confidence: Math.max(altCandidate.confidence, 0.94) }
        } else {
          c.chosen = { ...c.chosen, text: alt, confidence: Math.max(c.chosen.confidence, 0.92) }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main Sequence Recognizer
// ---------------------------------------------------------------------------

/**
 * Recognize a sequence of handwriting strokes (single char, word, number, or alphanumeric)
 */
export function recognizeHandwritingSequence(rawStrokes: Point[][]): HandwritingResult {
  if (rawStrokes.length === 0) {
    return {
      recognized: false,
      text: "",
      characters: [],
      confidence: 0,
      bounds: { x: 0, y: 0, w: 0, h: 0 },
      mode: "single_char",
    }
  }

  const features = extractStrokeFeatures(rawStrokes)
  const clusters = clusterStrokesIntoCharacters(rawStrokes)

  if (clusters.length === 0 || clusters.every((c) => !c.chosen)) {
    return {
      recognized: false,
      text: "",
      characters: [],
      confidence: 0,
      bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
      mode: "single_char",
    }
  }

  // Apply contextual disambiguation across the sequence
  disambiguateSequence(clusters)

  const recognizedChars: CharacterCandidate[] = []
  for (const c of clusters) {
    if (c.chosen) {
      recognizedChars.push(c.chosen)
    }
  }

  const text = recognizedChars.map((c) => c.text).join("")

  // Determine mode
  let isAllNumbers = true
  let isAllLetters = true
  for (const ch of text) {
    if (!isDigit(ch)) isAllNumbers = false
    if (!isLetter(ch)) isAllLetters = false
  }

  const isWord = isAllLetters && text.length >= 2
  const isNumber = isAllNumbers && text.length >= 1
  const isAlphanumeric = !isAllNumbers && !isAllLetters && text.length >= 2

  let mode: HandwritingResult["mode"] = "single_char"
  if (text.length === 1) mode = isNumber ? "number" : "single_char"
  else if (isNumber) mode = "number"
  else if (isWord) mode = "word"
  else if (isAlphanumeric) mode = "alphanumeric"
  else mode = "multi_char"

  // Average confidence calibrated across characters
  const avgConf =
    recognizedChars.reduce((sum, c) => sum + c.confidence, 0) / (recognizedChars.length || 1)

  // Boost confidence if matches dictionary word or clean continuous number
  let calibratedConf = avgConf
  if (COMMON_DICTIONARY.has(text)) {
    calibratedConf = Math.min(0.99, calibratedConf + 0.06)
  } else if (isNumber && text.length >= 2) {
    calibratedConf = Math.min(0.99, calibratedConf + 0.05)
  }

  return {
    recognized: calibratedConf >= 0.60,
    text,
    characters: recognizedChars,
    confidence: Number(calibratedConf.toFixed(3)),
    bounds: { x: features.x, y: features.y, w: features.w, h: features.h },
    mode,
    isWord,
    isNumber,
    isAlphanumeric,
  }
}

export const recognizeSequence = recognizeHandwritingSequence
