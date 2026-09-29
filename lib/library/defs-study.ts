import type { Prim } from "@/lib/sketch/kit"
import { rect, pill, line, poly, text, truncate, textWidth } from "@/lib/sketch/kit"
import type { ComponentDef, Props } from "./registry"

const str = (p: Props, k: string, fallback = ""): string => String(p[k] ?? fallback)
const num = (p: Props, k: string, fallback = 0): number => Number(p[k] ?? fallback)
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

export const mindMapDef: ComponentDef = {
  kind: "mind-map",
  name: "Mind Map",
  category: "blocks",
  group: "Education",
  keywords: ["mindmap", "brainstorm", "concept", "study", "hierarchy", "notes", "tree", "outline"],
  size: { w: 560, h: 360 },
  defaults: { topic: "Cellular Metabolism", branches: 4, layout: "radial" },
  controls: [
    { key: "topic", label: "Central topic", type: "text" },
    { key: "branches", label: "Branches", type: "number", min: 2, max: 6, quick: true },
    { key: "layout", label: "Layout", type: "select", options: ["radial", "tree"], quick: true },
  ],
  render(p, w, h) {
    const topic = str(p, "topic", "Cellular Metabolism")
    const branches = clamp(num(p, "branches", 4), 2, 6)
    const layout = str(p, "layout", "radial")
    const prims: Prim[] = []

    prims.push(rect(0, 0, w, h, { r: 6, stroke: "muted" }))

    const branchData = [
      { name: "Glycolysis", leaves: ["Cytosol", "2 ATP net", "Pyruvate"] },
      { name: "Krebs Cycle", leaves: ["Matrix", "NADH / FADH2", "Oxaloacetate"] },
      { name: "Oxidative Phos", leaves: ["Inner membrane", "H+ gradient", "ATP Synthase"] },
      { name: "Lipid Oxidation", leaves: ["Beta-oxidation", "Fatty acids", "Acetyl-CoA"] },
      { name: "Gluconeogenesis", leaves: ["Liver bypass", "Energy cost", "Glucose 6-P"] },
      { name: "Amino Catabolism", leaves: ["Transamination", "Urea cycle", "Carbon pool"] },
    ]

    if (layout === "tree") {
      const topH = 44
      const coreW = clamp(w * 0.38, 140, 240)
      const coreX = (w - coreW) / 2
      prims.push(rect(coreX, 16, coreW, topH, { r: 6, fill: "shade", fillColor: "faint", stroke: "ink", strokeWidth: 1.5 }))
      prims.push(text(w / 2, 16 + topH / 2 + 5, truncate(topic, 13, coreW - 16), 13, { align: "center", bold: true }))

      const spineY = 86
      prims.push(line(w / 2, 16 + topH, w / 2, spineY, { stroke: "ink", strokeWidth: 1.4 }))

      const step = w / (branches + 1)
      const firstX = step
      const lastX = step * branches
      prims.push(line(firstX, spineY, lastX, spineY, { stroke: "ink", strokeWidth: 1.4 }))

      const colW = Math.max(60, (w - 32) / branches - 10)
      const cardH = 34
      const cardY = spineY + 22

      for (let i = 0; i < branches; i++) {
        const bx = step * (i + 1)
        const b = branchData[i % branchData.length]
        prims.push(line(bx, spineY, bx, cardY, { stroke: "ink", strokeWidth: 1.2 }))
        prims.push(rect(bx - colW / 2, cardY, colW, cardH, { r: 4, stroke: "ink" }))
        prims.push(text(bx, cardY + cardH / 2 + 4, truncate(b.name, 10, colW - 8), 10, { align: "center", bold: true }))

        const leafCount = Math.min(3, Math.max(1, Math.floor((h - cardY - cardH - 18) / 24)))
        for (let j = 0; j < leafCount; j++) {
          const ly = cardY + cardH + 18 + j * 22
          prims.push(line(bx, cardY + cardH + (j === 0 ? 0 : (j - 1) * 22 + 18), bx, ly, { stroke: "muted" }))
          prims.push(line(bx, ly, bx + 8, ly, { stroke: "muted" }))
          prims.push(text(bx + 12, ly + 3, truncate(b.leaves[j] ?? "", 9, colW - 14), 9, { color: "muted" }))
        }
      }
      return prims
    }

    const cx = w / 2
    const cy = h / 2
    const coreW = clamp(w * 0.28, 120, 200)
    const coreH = clamp(h * 0.16, 42, 60)

    prims.push(rect(cx - coreW / 2, cy - coreH / 2, coreW, coreH, { r: 6, fill: "shade", fillColor: "faint", stroke: "ink", strokeWidth: 1.5 }))
    prims.push(text(cx, cy + 5, truncate(topic, 13, coreW - 16), 13, { align: "center", bold: true }))

    const leftCount = Math.ceil(branches / 2)
    const rightCount = branches - leftCount

    const leftNodeW = clamp(w * 0.22, 90, 140)
    const leftNodeH = clamp(h * 0.12, 30, 44)
    const leftX = clamp(w * 0.16, leftNodeW / 2 + 12, cx - coreW / 2 - leftNodeW / 2 - 16)

    for (let i = 0; i < leftCount; i++) {
      const b = branchData[i % branchData.length]
      const ny = (h * (i + 1)) / (leftCount + 1)
      prims.push(line(cx - coreW / 2, cy, leftX + leftNodeW / 2, ny, { stroke: "ink", strokeWidth: 1.3 }))
      prims.push(rect(leftX - leftNodeW / 2, ny - leftNodeH / 2, leftNodeW, leftNodeH, { r: 4, stroke: "ink" }))
      prims.push(text(leftX, ny + 4, truncate(b.name, 10, leftNodeW - 10), 10, { align: "center", bold: true }))

      const leaf1Y = ny - 10
      const leaf2Y = ny + 10
      const leafX = leftX - leftNodeW / 2
      prims.push(line(leafX, ny, leafX - 12, leaf1Y, { stroke: "muted" }))
      prims.push(line(leafX - 12, leaf1Y, leafX - 22, leaf1Y, { stroke: "muted" }))
      prims.push(text(leafX - 26, leaf1Y + 3, truncate(b.leaves[0] ?? "", 8, 56), 8, { align: "right", color: "muted" }))

      prims.push(line(leafX, ny, leafX - 12, leaf2Y, { stroke: "muted" }))
      prims.push(line(leafX - 12, leaf2Y, leafX - 22, leaf2Y, { stroke: "muted" }))
      prims.push(text(leafX - 26, leaf2Y + 3, truncate(b.leaves[1] ?? "", 8, 56), 8, { align: "right", color: "muted" }))
    }

    const rightNodeW = leftNodeW
    const rightNodeH = leftNodeH
    const rightX = clamp(w * 0.84, cx + coreW / 2 + rightNodeW / 2 + 16, w - rightNodeW / 2 - 12)

    for (let i = 0; i < rightCount; i++) {
      const b = branchData[(leftCount + i) % branchData.length]
      const ny = (h * (i + 1)) / (rightCount + 1)
      prims.push(line(cx + coreW / 2, cy, rightX - rightNodeW / 2, ny, { stroke: "ink", strokeWidth: 1.3 }))
      prims.push(rect(rightX - rightNodeW / 2, ny - rightNodeH / 2, rightNodeW, rightNodeH, { r: 4, stroke: "ink" }))
      prims.push(text(rightX, ny + 4, truncate(b.name, 10, rightNodeW - 10), 10, { align: "center", bold: true }))

      const leaf1Y = ny - 10
      const leaf2Y = ny + 10
      const leafX = rightX + rightNodeW / 2
      prims.push(line(leafX, ny, leafX + 12, leaf1Y, { stroke: "muted" }))
      prims.push(line(leafX + 12, leaf1Y, leafX + 22, leaf1Y, { stroke: "muted" }))
      prims.push(text(leafX + 26, leaf1Y + 3, truncate(b.leaves[0] ?? "", 8, 56), 8, { color: "muted" }))

      prims.push(line(leafX, ny, leafX + 12, leaf2Y, { stroke: "muted" }))
      prims.push(line(leafX + 12, leaf2Y, leafX + 22, leaf2Y, { stroke: "muted" }))
      prims.push(text(leafX + 26, leaf2Y + 3, truncate(b.leaves[1] ?? "", 8, 56), 8, { color: "muted" }))
    }

    return prims
  },
}

export const conceptMapDef: ComponentDef = {
  kind: "concept-map",
  name: "Concept Map",
  category: "blocks",
  group: "Education",
  keywords: ["concept", "map", "stages", "yields", "occurs", "process", "biology", "chemistry", "pathway"],
  size: { w: 580, h: 360 },
  defaults: { concept: "Cellular Respiration", stages: 3 },
  controls: [
    { key: "concept", label: "Root concept", type: "text" },
    { key: "stages", label: "Stages", type: "number", min: 2, max: 4, quick: true },
  ],
  render(p, w, h) {
    const concept = str(p, "concept", "Cellular Respiration")
    const stages = clamp(num(p, "stages", 3), 2, 4)
    const prims: Prim[] = []

    prims.push(rect(0, 0, w, h, { r: 6, stroke: "muted" }))

    const rootW = clamp(w * 0.44, 180, 280)
    const rootH = clamp(h * 0.12, 36, 46)
    const rootX = (w - rootW) / 2
    const rootY = 16

    prims.push(rect(rootX, rootY, rootW, rootH, { r: 6, fill: "shade", fillColor: "faint", stroke: "ink", strokeWidth: 1.5 }))
    prims.push(text(w / 2, rootY + rootH / 2 + 5, truncate(concept.toUpperCase(), 12, rootW - 16), 12, { align: "center", bold: true }))

    const stageData = [
      { name: "Stage 1: Glycolysis", occurs: "Cytoplasm", yields: "2 Pyruvate + 2 ATP + 2 NADH" },
      { name: "Stage 2: Krebs Cycle", occurs: "Mitochondrial Matrix", yields: "2 ATP + 6 NADH + 2 FADH2" },
      { name: "Stage 3: Oxidative Phos", occurs: "Inner Membrane", yields: "28-32 ATP + 6 H2O" },
      { name: "Stage 4: Lactic Bypass", occurs: "Anaerobic Cytosol", yields: "2 Lactate + NAD+ Regen" },
    ]

    const padX = 20
    const colGap = clamp(w * 0.03, 10, 20)
    const totalW = w - padX * 2
    const colW = (totalW - (stages - 1) * colGap) / stages

    const stageY = clamp(h * 0.36, rootY + rootH + 40, h * 0.46)
    const stageH = clamp(h * 0.22, 60, 84)

    const prodY = clamp(h * 0.76, stageY + stageH + 44, h - 56)
    const prodH = clamp(h * 0.16, 40, 52)

    for (let i = 0; i < stages; i++) {
      const item = stageData[i % stageData.length]
      const sx = padX + i * (colW + colGap)
      const midX = sx + colW / 2

      prims.push(line(w / 2, rootY + rootH, midX, stageY, { stroke: "ink", strokeWidth: 1.2 }))

      const linkY = (rootY + rootH + stageY) / 2
      const occPillW = 68
      const occPillH = 18
      prims.push(pill(midX - occPillW / 2, linkY - occPillH / 2, occPillW, occPillH, { fill: "solid", fillColor: "paper", stroke: "muted" }))
      prims.push(text(midX, linkY + 4, "occurs in", 9, { align: "center", bold: true }))

      prims.push(rect(sx, stageY, colW, stageH, { r: 5, stroke: "ink" }))
      prims.push(text(midX, stageY + 22, truncate(item.name, 11, colW - 12), 11, { align: "center", bold: true }))
      prims.push(line(sx + 8, stageY + 32, sx + colW - 8, stageY + 32, { stroke: "faint" }))

      const locPillW = Math.min(colW - 16, textWidth(item.occurs, 9) + 16)
      prims.push(pill(midX - locPillW / 2, stageY + 42, locPillW, 18, { fill: "shade", fillColor: "faint", stroke: "muted" }))
      prims.push(text(midX, stageY + 54, truncate(item.occurs, 9, locPillW - 8), 9, { align: "center", color: "muted" }))

      prims.push(line(midX, stageY + stageH, midX, prodY, { stroke: "ink", strokeWidth: 1.2 }))

      const yldY = (stageY + stageH + prodY) / 2
      const yldPillW = 54
      const yldPillH = 18
      prims.push(pill(midX - yldPillW / 2, yldY - yldPillH / 2, yldPillW, yldPillH, { fill: "solid", fillColor: "paper", stroke: "ink" }))
      prims.push(text(midX, yldY + 4, "yields", 9, { align: "center", bold: true }))

      prims.push(rect(sx, prodY, colW, prodH, { r: 4, fill: "shade", fillColor: "faint", stroke: "muted" }))
      prims.push(text(midX, prodY + prodH / 2 + 4, truncate(item.yields, 9, colW - 12), 9, { align: "center", bold: true }))
    }

    return prims
  },
}

export const chapterSummaryDef: ComponentDef = {
  kind: "chapter-summary",
  name: "Chapter Summary",
  category: "blocks",
  group: "Education",
  keywords: ["summary", "chapter", "study", "review", "principles", "formulas", "checklist", "audit"],
  size: { w: 600, h: 420 },
  defaults: { title: "Thermodynamics & Heat Transfer", chapter: "Chapter 04", masteryCount: 4 },
  controls: [
    { key: "title", label: "Title", type: "text" },
    { key: "chapter", label: "Chapter", type: "text" },
    { key: "masteryCount", label: "Mastery items", type: "number", min: 3, max: 5, quick: true },
  ],
  render(p, w, h) {
    const title = str(p, "title", "Thermodynamics & Heat Transfer")
    const chapter = str(p, "chapter", "Chapter 04")
    const masteryCount = clamp(num(p, "masteryCount", 4), 3, 5)
    const prims: Prim[] = []

    prims.push(rect(0, 0, w, h, { r: 6, stroke: "ink" }))

    const headerH = 48
    prims.push(pill(16, 13, 86, 22, { fill: "shade", fillColor: "faint", stroke: "ink" }))
    prims.push(text(59, 28, chapter.toUpperCase(), 10, { align: "center", bold: true }))
    prims.push(text(112, 29, truncate(title, 14, w - 240), 14, { bold: true }))

    const tagW = 96
    prims.push(pill(w - tagW - 16, 13, tagW, 22, { stroke: "muted" }))
    prims.push(text(w - 16 - tagW / 2, 28, "CORE REVIEW", 9, { align: "center", bold: true }))

    prims.push(line(0, headerH, w, headerH, { stroke: "ink" }))

    const splitX = Math.round(w * 0.52)
    prims.push(line(splitX, headerH, splitX, h, { stroke: "muted", dashed: true }))

    prims.push(text(20, headerH + 24, "CORE PRINCIPLES", 11, { bold: true }))
    prims.push(line(20, headerH + 30, splitX - 20, headerH + 30, { stroke: "faint" }))

    const principles = [
      { num: "01", name: "Zeroth Law: Thermal Equilibrium", desc: "Defines temperature; transitive equilibrium property across bodies." },
      { num: "02", name: "First Law: Conservation of Energy", desc: "dU = dQ - dW; internal energy change equals heat minus work." },
      { num: "03", name: "Second Law: Clausius & Kelvin", desc: "Entropy of isolated system never decreases (dS >= 0)." },
      { num: "04", name: "Third Law: Absolute Zero Entropy", desc: "Entropy approaches constant minimum as T -> 0 Kelvin." },
    ]

    const availH = h - headerH - 42
    const princStep = availH / 4

    for (let i = 0; i < 4; i++) {
      const pr = principles[i]
      const py = headerH + 46 + i * princStep
      prims.push(pill(20, py - 11, 24, 16, { stroke: "muted" }))
      prims.push(text(32, py + 1, pr.num, 9, { align: "center", bold: true }))
      prims.push(text(50, py + 1, truncate(pr.name, 11, splitX - 70), 11, { bold: true }))
      prims.push(text(50, py + 16, truncate(pr.desc, 9, splitX - 70), 9, { color: "muted" }))
    }

    const rightW = w - splitX - 32
    prims.push(text(splitX + 16, headerH + 24, "KEY EQUATIONS", 11, { bold: true }))
    prims.push(line(splitX + 16, headerH + 30, w - 16, headerH + 30, { stroke: "faint" }))

    const formulas = [
      { eq: "dU = dQ - dW", label: "First Law" },
      { eq: "eta = 1 - (Tc / Th)", label: "Carnot Limit" },
      { eq: "dS = dQ_rev / T", label: "Entropy Def" },
    ]

    const formY0 = headerH + 38
    for (let i = 0; i < 3; i++) {
      const f = formulas[i]
      const fy = formY0 + i * 38
      prims.push(rect(splitX + 16, fy, rightW, 30, { r: 4, fill: "shade", fillColor: "faint", stroke: "muted" }))
      prims.push(text(splitX + 26, fy + 20, f.eq, 11, { bold: true }))
      prims.push(text(splitX + 16 + rightW - 10, fy + 20, f.label, 9, { align: "right", color: "muted" }))
    }

    const midDivY = formY0 + 3 * 38 + 14
    prims.push(line(splitX, midDivY, w, midDivY, { stroke: "muted" }))

    prims.push(text(splitX + 16, midDivY + 22, "MASTERY AUDIT", 11, { bold: true }))
    prims.push(line(splitX + 16, midDivY + 28, w - 16, midDivY + 28, { stroke: "faint" }))

    const auditTasks = [
      { label: "State Carnot theorem limits", done: true },
      { label: "Calculate adiabatic expansion work", done: true },
      { label: "Derive Maxwell thermodynamic relations", done: true },
      { label: "Solve Rankine vapor power cycle", done: false },
      { label: "Plot T-s and P-v phase diagrams", done: false },
    ]

    const auditCount = Math.min(auditTasks.length, masteryCount)
    const auditY0 = midDivY + 40
    for (let i = 0; i < auditCount; i++) {
      const task = auditTasks[i]
      const ty = auditY0 + i * 24
      const boxSize = 12
      prims.push(rect(splitX + 18, ty - 10, boxSize, boxSize, { r: 2, stroke: "ink" }))
      if (task.done) {
        prims.push(poly([[splitX + 20, ty - 4], [splitX + 23, ty - 1], [splitX + 28, ty - 7]], false, { stroke: "ink", strokeWidth: 1.4 }))
      }
      prims.push(text(splitX + 38, ty, truncate(task.label, 10, rightW - 28), 10, { color: task.done ? "ink" : "muted" }))
    }

    return prims
  },
}

export const formulaSheetDef: ComponentDef = {
  kind: "formula-sheet",
  name: "Formula Sheet",
  category: "blocks",
  group: "Education",
  keywords: ["formula", "sheet", "equations", "physics", "math", "units", "variables", "reference"],
  size: { w: 640, h: 420 },
  defaults: { title: "Electrodynamics & Analytical Mechanics", columns: 3 },
  controls: [
    { key: "title", label: "Title", type: "text" },
    { key: "columns", label: "Columns", type: "number", min: 2, max: 3, quick: true },
  ],
  render(p, w, h) {
    const title = str(p, "title", "Electrodynamics & Analytical Mechanics")
    const columns = clamp(num(p, "columns", 3), 2, 3)
    const prims: Prim[] = []

    prims.push(rect(0, 0, w, h, { r: 6, stroke: "ink" }))

    const headerH = 46
    prims.push(text(16, 28, truncate(title, 14, w - 210), 14, { bold: true }))

    const badgeW = 160
    prims.push(pill(w - badgeW - 16, 12, badgeW, 22, { fill: "shade", fillColor: "faint", stroke: "muted" }))
    prims.push(text(w - 16 - badgeW / 2, 27, "REFERENCE SPEC - REV 2", 9, { align: "center", bold: true }))

    prims.push(line(0, headerH, w, headerH, { stroke: "ink" }))

    const colData = [
      {
        title: "GAUSS & POISSON",
        items: [
          { eq: "div E = rho / eps_0", vars: "E: electric field, rho: charge density", unit: "[V/m]" },
          { eq: "div B = 0", vars: "B: magnetic flux density (no monopoles)", unit: "[T]" },
          { eq: "grad^2 V = -rho / eps_0", vars: "V: electrostatic scalar potential", unit: "[V]" },
        ],
      },
      {
        title: "FARADAY & AMPERE",
        items: [
          { eq: "curl E = -dB/dt", vars: "E: induced field, B: time-varying flux", unit: "[V/m]" },
          { eq: "curl B = mu_0(J + eps_0 dE/dt)", vars: "J: current density, displacement flux", unit: "[A/m^2]" },
          { eq: "F = q(E + v x B)", vars: "Lorentz electromagnetic force", unit: "[N]" },
        ],
      },
      {
        title: "ENERGY & POTENTIAL",
        items: [
          { eq: "u = 0.5(eps_0 E^2 + B^2/mu_0)", vars: "u: field electromagnetic energy density", unit: "[J/m^3]" },
          { eq: "S = (1/mu_0)(E x B)", vars: "S: Poynting directional energy flux", unit: "[W/m^2]" },
          { eq: "A_mu = (V/c, A)", vars: "A_mu: relativistic 4-potential vector", unit: "[V*s/m]" },
        ],
      },
    ]

    const padX = 16
    const colGap = 14
    const totalW = w - padX * 2
    const colW = (totalW - (columns - 1) * colGap) / columns

    for (let c = 0; c < columns; c++) {
      const col = colData[c % colData.length]
      const colX = padX + c * (colW + colGap)

      if (c > 0) {
        const divX = padX + c * (colW + colGap) - colGap / 2
        prims.push(line(divX, headerH, divX, h, { stroke: "muted", dashed: true }))
      }

      prims.push(pill(colX, headerH + 12, colW, 22, { fill: "shade", fillColor: "faint", stroke: "muted" }))
      prims.push(text(colX + colW / 2, headerH + 26, col.title, 9, { align: "center", bold: true }))

      const availColH = h - headerH - 46
      const cardH = clamp(availColH / 3 - 10, 68, 96)

      for (let i = 0; i < 3; i++) {
        const item = col.items[i]
        const cardY = headerH + 42 + i * (cardH + 10)

        prims.push(rect(colX, cardY, colW, cardH, { r: 4, stroke: "muted" }))
        prims.push(text(colX + 10, cardY + 22, item.eq, 11, { bold: true }))

        const unitW = textWidth(item.unit, 9) + 12
        prims.push(pill(colX + colW - unitW - 8, cardY + 8, unitW, 16, { stroke: "faint" }))
        prims.push(text(colX + colW - 8 - unitW / 2, cardY + 19, item.unit, 8, { align: "center", color: "muted" }))

        prims.push(line(colX + 8, cardY + 32, colX + colW - 8, cardY + 32, { stroke: "faint" }))
        prims.push(text(colX + 10, cardY + 48, truncate(item.vars, 8, colW - 20), 8, { color: "muted" }))
      }
    }

    return prims
  },
}

export const revisionBoardDef: ComponentDef = {
  kind: "revision-board",
  name: "Revision Board",
  category: "blocks",
  group: "Education",
  keywords: ["revision", "board", "leitner", "srs", "flashcards", "spaced-repetition", "study", "retention"],
  size: { w: 660, h: 380 },
  defaults: { title: "Leitner SRS Schedule", deck: "Organic Synthesis & Mechanisms", boxes: 5 },
  controls: [
    { key: "title", label: "Title", type: "text" },
    { key: "deck", label: "Deck name", type: "text" },
    { key: "boxes", label: "SRS boxes", type: "number", min: 3, max: 5, quick: true },
  ],
  render(p, w, h) {
    const title = str(p, "title", "Leitner SRS Schedule")
    const deck = str(p, "deck", "Organic Synthesis & Mechanisms")
    const boxes = clamp(num(p, "boxes", 5), 3, 5)
    const prims: Prim[] = []

    prims.push(rect(0, 0, w, h, { r: 6, stroke: "ink" }))

    const headerH = 50
    prims.push(text(16, 26, truncate(title, 14, w - 280), 14, { bold: true }))
    prims.push(text(16, 42, truncate("Deck: " + deck, 10, w - 280), 10, { color: "muted" }))

    const countBadgeW = 96
    prims.push(pill(w - countBadgeW - 120, 14, countBadgeW, 22, { fill: "shade", fillColor: "faint", stroke: "muted" }))
    prims.push(text(w - 120 - countBadgeW / 2, 29, "184 CARDS", 9, { align: "center", bold: true }))

    const retBadgeW = 104
    prims.push(pill(w - retBadgeW - 16, 14, retBadgeW, 22, { fill: "shade", fillColor: "faint", stroke: "ink" }))
    prims.push(text(w - 16 - retBadgeW / 2, 29, "89% RETENTION", 9, { align: "center", bold: true }))

    prims.push(line(0, headerH, w, headerH, { stroke: "ink" }))

    const boxSpecs = [
      { name: "BOX 1", interval: "Daily", count: 48, status: "18 due today", highlight: true },
      { name: "BOX 2", interval: "Every 3d", count: 42, status: "12 due today", highlight: false },
      { name: "BOX 3", interval: "Weekly", count: 54, status: "6 due tomorrow", highlight: false },
      { name: "BOX 4", interval: "Bi-weekly", count: 26, status: "Ready in 4d", highlight: false },
      { name: "BOX 5", interval: "Monthly", count: 14, status: "Mastered", highlight: false },
    ]

    const padX = 16
    const padY = 14
    const colGap = 12
    const totalW = w - padX * 2
    const colW = (totalW - (boxes - 1) * colGap) / boxes
    const boxH = h - headerH - padY * 2

    for (let i = 0; i < boxes; i++) {
      const b = boxSpecs[i % boxSpecs.length]
      const bx = padX + i * (colW + colGap)
      const by = headerH + padY

      prims.push(rect(bx, by, colW, boxH, { r: 5, stroke: "ink" }))

      prims.push(pill(bx + 8, by + 8, colW - 16, 20, { stroke: "muted" }))
      prims.push(text(bx + colW / 2, by + 22, b.name + " • " + b.interval, 9, { align: "center", bold: true }))

      const cardW = colW - 28
      const cardH = clamp(boxH * 0.44, 70, 110)
      const cardX = bx + 14
      const cardY = by + 38

      prims.push(rect(cardX + 4, cardY - 4, cardW, cardH, { r: 3, stroke: "faint" }))
      prims.push(rect(cardX + 2, cardY - 2, cardW, cardH, { r: 3, stroke: "muted" }))
      prims.push(rect(cardX, cardY, cardW, cardH, { r: 3, stroke: "ink", fill: "solid", fillColor: "paper" }))

      prims.push(text(bx + colW / 2, cardY + cardH / 2 - 2, String(b.count), 22, { align: "center", bold: true }))
      prims.push(text(bx + colW / 2, cardY + cardH / 2 + 14, "cards", 9, { align: "center", color: "muted" }))

      const statusY = by + boxH - 28
      prims.push(pill(bx + 8, statusY, colW - 16, 20, { fill: b.highlight ? "shade" : "none", fillColor: "faint", stroke: "muted" }))
      prims.push(text(bx + colW / 2, statusY + 14, b.status, 9, { align: "center", bold: b.highlight }))

      if (i < boxes - 1) {
        const arrowX1 = bx + colW + 2
        const arrowX2 = bx + colW + colGap - 2
        const arrowY = by + boxH / 2
        prims.push(line(arrowX1, arrowY, arrowX2, arrowY, { stroke: "muted" }))
        prims.push(poly([[arrowX2 - 3, arrowY - 3], [arrowX2, arrowY], [arrowX2 - 3, arrowY + 3]], false, { stroke: "muted" }))
      }
    }

    return prims
  },
}

export const mistakeBoardDef: ComponentDef = {
  kind: "mistake-board",
  name: "Mistake Board",
  category: "blocks",
  group: "Education",
  keywords: ["mistake", "error", "audit", "exam", "analysis", "root-cause", "ledger", "log", "study"],
  size: { w: 680, h: 380 },
  defaults: { title: "Exam Mistake Log & Root-Cause Audit", rows: 4 },
  controls: [
    { key: "title", label: "Title", type: "text" },
    { key: "rows", label: "Visible rows", type: "number", min: 2, max: 5, quick: true },
  ],
  render(p, w, h) {
    const title = str(p, "title", "Exam Mistake Log & Root-Cause Audit")
    const rows = clamp(num(p, "rows", 4), 2, 5)
    const prims: Prim[] = []

    prims.push(rect(0, 0, w, h, { r: 6, stroke: "ink" }))

    const headerH = 48
    prims.push(text(16, 29, truncate(title, 14, w - 240), 14, { bold: true }))

    const chip1W = 92
    prims.push(pill(w - chip1W - 108, 13, chip1W, 22, { stroke: "muted" }))
    prims.push(text(w - 108 - chip1W / 2, 28, "12 AUDITED", 9, { align: "center", bold: true }))

    const chip2W = 96
    prims.push(pill(w - chip2W - 16, 13, chip2W, 22, { fill: "shade", fillColor: "faint", stroke: "ink" }))
    prims.push(text(w - 16 - chip2W / 2, 28, "8 RESOLVED", 9, { align: "center", bold: true }))

    prims.push(line(0, headerH, w, headerH, { stroke: "ink" }))

    const thH = 26
    prims.push(rect(0, headerH, w, thH, { fill: "shade", fillColor: "faint", stroke: "muted" }))

    const colItemW = Math.round(w * 0.22)
    const colCatW = Math.round(w * 0.14)
    const colCauseW = Math.round(w * 0.28)
    const colActionW = Math.round(w * 0.24)

    const x0 = 12
    const x1 = x0 + colItemW
    const x2 = x1 + colCatW
    const x3 = x2 + colCauseW
    const x4 = x3 + colActionW

    prims.push(text(x0, headerH + 17, "QUESTION / TOPIC", 9, { bold: true }))
    prims.push(text(x1, headerH + 17, "CATEGORY", 9, { bold: true }))
    prims.push(text(x2, headerH + 17, "ROOT CAUSE ANALYSIS", 9, { bold: true }))
    prims.push(text(x3, headerH + 17, "CORRECTIVE PROTOCOL", 9, { bold: true }))
    prims.push(text(x4, headerH + 17, "STATUS", 9, { bold: true }))

    const entries = [
      {
        item: "Q14 Carnot Cycle",
        cat: "Calculation",
        cause: "Substituted Celsius instead of Kelvin in Th/Tc",
        action: "Always convert T to absolute Kelvin before ratios",
        status: "Resolved",
      },
      {
        item: "Q22 Inertia of Cone",
        cat: "Conceptual",
        cause: "Applied cylinder formula I = 0.5 MR^2 directly",
        action: "Integrate dm over thin disk elements from vertex",
        status: "Review",
      },
      {
        item: "Q07 Doppler Effect",
        cat: "Careless",
        cause: "Inverted sign in denominator for receding source",
        action: "Verify boundary limit: observed f must decrease",
        status: "Resolved",
      },
      {
        item: "Q31 Redox Balance",
        cat: "Procedural",
        cause: "Skipped charge balancing before adding H2O",
        action: "Enforce fixed 5-step half-reaction sequence strictly",
        status: "Pending",
      },
      {
        item: "Q45 Biot-Savart Law",
        cat: "Vector Math",
        cause: "Evaluated cross product angle dl x r_hat as zero",
        action: "Sketch right-hand unit vector frame explicitly",
        status: "Resolved",
      },
    ]

    const availBodyH = h - headerH - thH
    const rowH = availBodyH / rows

    for (let r = 0; r < rows; r++) {
      const e = entries[r % entries.length]
      const ry = headerH + thH + r * rowH

      prims.push(line(0, ry + rowH, w, ry + rowH, { stroke: "muted" }))

      prims.push(text(x0, ry + rowH / 2 + 4, truncate(e.item, 10, colItemW - 12), 10, { bold: true }))

      const catPillW = Math.min(colCatW - 12, textWidth(e.cat, 8) + 14)
      prims.push(pill(x1, ry + (rowH - 18) / 2, catPillW, 18, { stroke: "faint" }))
      prims.push(text(x1 + catPillW / 2, ry + (rowH - 18) / 2 + 13, e.cat, 8, { align: "center", color: "muted" }))

      prims.push(text(x2, ry + rowH / 2 + 4, truncate(e.cause, 9, colCauseW - 12), 9, { color: "muted" }))
      prims.push(text(x3, ry + rowH / 2 + 4, truncate(e.action, 9, colActionW - 12), 9))

      const isResolved = e.status === "Resolved"
      const statW = 68
      prims.push(pill(x4, ry + (rowH - 18) / 2, statW, 18, { fill: isResolved ? "shade" : "none", fillColor: "faint", stroke: "muted" }))
      prims.push(text(x4 + statW / 2, ry + (rowH - 18) / 2 + 13, e.status, 8, { align: "center", bold: isResolved }))
    }

    return prims
  },
}

export const studyTimetableDef: ComponentDef = {
  kind: "study-timetable",
  name: "Study Timetable",
  category: "blocks",
  group: "Education",
  keywords: ["timetable", "schedule", "calendar", "study", "planner", "week", "matrix", "slots"],
  size: { w: 680, h: 400 },
  defaults: { title: "Weekly Deep Work & Study Schedule", days: 7, slots: 4 },
  controls: [
    { key: "title", label: "Title", type: "text" },
    { key: "days", label: "Days", type: "number", min: 5, max: 7, quick: true },
    { key: "slots", label: "Time slots", type: "number", min: 3, max: 5, quick: true },
  ],
  render(p, w, h) {
    const title = str(p, "title", "Weekly Deep Work & Study Schedule")
    const days = clamp(num(p, "days", 7), 5, 7)
    const slots = clamp(num(p, "slots", 4), 3, 5)
    const prims: Prim[] = []

    prims.push(rect(0, 0, w, h, { r: 6, stroke: "ink" }))

    const headerH = 46
    prims.push(text(16, 28, truncate(title, 14, w - 240), 14, { bold: true }))

    const tag1W = 104
    prims.push(pill(w - tag1W - 108, 12, tag1W, 22, { stroke: "muted" }))
    prims.push(text(w - 108 - tag1W / 2, 27, "TERM CYCLE A", 9, { align: "center", bold: true }))

    const tag2W = 96
    prims.push(pill(w - tag2W - 16, 12, tag2W, 22, { fill: "shade", fillColor: "faint", stroke: "ink" }))
    prims.push(text(w - 16 - tag2W / 2, 27, "32 HRS / WK", 9, { align: "center", bold: true }))

    prims.push(line(0, headerH, w, headerH, { stroke: "ink" }))

    const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    const dayLabels = allDays.slice(0, days)

    const slotData = [
      {
        time: "08:00 - 10:00",
        label: "Deep Focus",
        subjects: ["Pure Math", "Mechanics", "Chemistry", "Electrodyn", "Algorithms", "Mock Exam", "Recap"],
      },
      {
        time: "10:30 - 12:30",
        label: "Core Practice",
        subjects: ["Linear Alg", "Fluid Dyn", "Thermo", "Quantum", "Data Struct", "Problem Set", "Weekly Plan"],
      },
      {
        time: "14:00 - 16:00",
        label: "Applied Lab",
        subjects: ["Physics Lab", "Coding Lab", "Chem Lab", "Circuit Lab", "Project", "Deep Reading", "Free Study"],
      },
      {
        time: "16:30 - 18:30",
        label: "Active Recall",
        subjects: ["Flashcards", "Mistake Log", "Flashcards", "Mistake Log", "Flashcards", "Audit Log", "Weekly SRS"],
      },
      {
        time: "19:30 - 21:00",
        label: "Synthesis",
        subjects: ["Summary Notes", "Proof Review", "Formula Memo", "Literature", "Retrospective", "Self Test", "Buffer"],
      },
    ]

    const timeColW = 86
    const dayColW = (w - timeColW) / days
    const gridHeaderH = 26

    prims.push(rect(0, headerH, w, gridHeaderH, { fill: "shade", fillColor: "faint", stroke: "muted" }))
    prims.push(text(10, headerH + 17, "TIME / DAY", 9, { bold: true }))
    prims.push(line(timeColW, headerH, timeColW, h, { stroke: "ink" }))

    for (let d = 0; d < days; d++) {
      const dx = timeColW + d * dayColW
      prims.push(text(dx + dayColW / 2, headerH + 17, dayLabels[d], 9, { align: "center", bold: true }))
      if (d > 0) {
        prims.push(line(dx, headerH, dx, h, { stroke: "muted", dashed: true }))
      }
    }

    const availGridH = h - headerH - gridHeaderH
    const slotH = availGridH / slots

    for (let s = 0; s < slots; s++) {
      const sl = slotData[s % slotData.length]
      const sy = headerH + gridHeaderH + s * slotH

      prims.push(line(0, sy + slotH, w, sy + slotH, { stroke: "muted" }))

      prims.push(text(8, sy + slotH / 2 - 2, sl.time, 8, { bold: true }))
      prims.push(text(8, sy + slotH / 2 + 10, sl.label, 8, { color: "muted" }))

      for (let d = 0; d < days; d++) {
        const dx = timeColW + d * dayColW
        const subject = sl.subjects[d % sl.subjects.length]
        const isHighlight = s === 0 || d === 5

        prims.push(rect(dx + 3, sy + 3, dayColW - 6, slotH - 6, {
          r: 3,
          fill: isHighlight ? "shade" : "none",
          fillColor: "faint",
          stroke: "muted",
        }))

        prims.push(text(dx + dayColW / 2, sy + slotH / 2 + 3, truncate(subject, 8, dayColW - 10), 8, {
          align: "center",
          bold: isHighlight,
        }))
      }
    }

    return prims
  },
}

export const studyPlanDef: ComponentDef = {
  kind: "study-plan",
  name: "Study Plan",
  category: "blocks",
  group: "Student",
  keywords: ["study", "plan", "daily", "routine", "schedule", "goals", "academic"],
  size: { w: 480, h: 320 },
  defaults: { title: "Daily Study Plan", hours: "4.5", targetChapters: "2" },
  controls: [
    { key: "title", label: "Title", type: "text" },
    { key: "hours", label: "Target Hours", type: "text" },
    { key: "targetChapters", label: "Target Chapters", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = []
    const title = str(p, "title", "Daily Study Plan")
    const hours = str(p, "hours", "4.5")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(rect(0, 0, w, 44, { r: 8, fill: "shade", fillColor: "faint", stroke: "muted" }))
    prims.push(text(18, 28, title, 13, { bold: true }))
    prims.push(text(w - 18, 28, `Goal: ${hours}h`, 11, { align: "right", color: "muted" }))

    const tasks = [
      { sub: "Mathematics", topic: "Quadratic Equations PYQs", time: "10:00 - 11:30", done: true },
      { sub: "Physics", topic: "Electromagnetic Induction Notes", time: "14:00 - 15:30", done: false },
      { sub: "Chemistry", topic: "Coordination Compounds Revision", time: "17:00 - 18:30", done: false },
    ]
    let y = 62
    for (const t of tasks) {
      prims.push(rect(16, y, w - 32, 54, { r: 6, stroke: "muted", fill: t.done ? "shade" : "none", fillColor: t.done ? "faint" : undefined }))
      prims.push(pill(28, y + 16, 20, 20, { stroke: "ink", fill: t.done ? "shade" : "none", fillColor: t.done ? "muted" : undefined }))
      if (t.done) prims.push(text(38, y + 27, "✓", 10, { align: "center", bold: true }))
      prims.push(text(60, y + 24, t.sub, 11, { bold: true }))
      prims.push(text(60, y + 42, t.topic, 10, { color: "muted" }))
      prims.push(text(w - 28, y + 24, t.time, 9, { align: "right", color: "muted" }))
      y += 66
    }
    return prims
  },
}

export const weeklyCalendarDef: ComponentDef = {
  kind: "weekly-calendar",
  name: "Weekly Calendar",
  category: "blocks",
  group: "Student",
  keywords: ["calendar", "week", "schedule", "planner", "student", "agenda"],
  size: { w: 600, h: 320 },
  defaults: { title: "Weekly Academic Calendar" },
  controls: [{ key: "title", label: "Title", type: "text" }],
  render(p, w, h) {
    const prims: Prim[] = []
    const title = str(p, "title", "Weekly Academic Calendar")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(text(18, 28, title, 13, { bold: true }))

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const colW = (w - 28) / 7
    let x = 14
    for (let i = 0; i < 7; i++) {
      prims.push(rect(x, 46, colW - 4, h - 60, { r: 4, stroke: "muted", fill: i === 1 ? "shade" : "none", fillColor: i === 1 ? "faint" : undefined }))
      prims.push(text(x + (colW - 4) / 2, 64, days[i], 10, { align: "center", bold: true }))
      prims.push(line(x, 74, x + colW - 4, 74, { stroke: "faint" }))
      if (i % 2 === 0) {
        prims.push(rect(x + 4, 82, colW - 12, 34, { r: 3, stroke: "muted", fill: "shade", fillColor: "faint" }))
        prims.push(text(x + 8, 98, "Math", 9, { bold: true }))
        prims.push(text(x + 8, 110, "16:00", 8, { color: "muted" }))
      }
      if (i === 1 || i === 4) {
        prims.push(rect(x + 4, 124, colW - 12, 34, { r: 3, stroke: "muted", fill: "shade", fillColor: "muted" }))
        prims.push(text(x + 8, 140, "Physics", 9, { bold: true }))
        prims.push(text(x + 8, 152, "18:00", 8, { color: "muted" }))
      }
      x += colW
    }
    return prims
  },
}

export const monthlyCalendarDef: ComponentDef = {
  kind: "monthly-calendar",
  name: "Monthly Calendar",
  category: "blocks",
  group: "Student",
  keywords: ["calendar", "month", "dates", "schedule", "deadlines", "student"],
  size: { w: 560, h: 360 },
  defaults: { month: "October 2026" },
  controls: [{ key: "month", label: "Month", type: "text" }],
  render(p, w, h) {
    const prims: Prim[] = []
    const month = str(p, "month", "October 2026")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(text(w / 2, 28, month, 14, { align: "center", bold: true }))

    const days = ["M", "T", "W", "T", "F", "S", "S"]
    const colW = (w - 32) / 7
    const rowH = (h - 76) / 5
    for (let c = 0; c < 7; c++) {
      prims.push(text(16 + c * colW + colW / 2, 54, days[c], 10, { align: "center", bold: true, color: "muted" }))
    }
    let dayNum = 1
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 7; c++) {
        if (dayNum > 31) break
        const bx = 16 + c * colW
        const by = 66 + r * rowH
        const isExam = dayNum === 15 || dayNum === 28
        prims.push(rect(bx, by, colW - 2, rowH - 2, { r: 4, stroke: "muted", fill: isExam ? "shade" : "none", fillColor: isExam ? "faint" : undefined }))
        prims.push(text(bx + 6, by + 14, String(dayNum), 9, { bold: isExam }))
        if (isExam) {
          prims.push(rect(bx + 4, by + rowH - 16, colW - 10, 10, { r: 2, fill: "shade", fillColor: "muted", strokeWidth: 0 }))
          prims.push(text(bx + colW / 2, by + rowH - 8, "EXAM", 7, { align: "center", bold: true }))
        }
        dayNum++
      }
    }
    return prims
  },
}

export const syllabusTrackerDef: ComponentDef = {
  kind: "syllabus-tracker",
  name: "Syllabus Tracker",
  category: "blocks",
  group: "Student",
  keywords: ["syllabus", "tracker", "progress", "chapters", "academic", "completion"],
  size: { w: 460, h: 280 },
  defaults: { subject: "Science Syllabus", progress: "68" },
  controls: [
    { key: "subject", label: "Subject", type: "text" },
    { key: "progress", label: "Progress %", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = []
    const subject = str(p, "subject", "Science Syllabus")
    const progress = num(p, "progress", 68)
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(text(18, 28, subject, 13, { bold: true }))
    prims.push(text(w - 18, 28, `${progress}% Complete`, 11, { align: "right", bold: true }))
    // Progress bar
    prims.push(rect(18, 40, w - 36, 8, { r: 4, stroke: "muted", fill: "shade", fillColor: "faint" }))
    prims.push(rect(18, 40, ((w - 36) * progress) / 100, 8, { r: 4, strokeWidth: 0, fill: "shade", fillColor: "muted" }))

    const chaps = [
      { name: "1. Chemical Reactions", done: true },
      { name: "2. Acids, Bases & Salts", done: true },
      { name: "3. Metals & Non-metals", done: true },
      { name: "4. Carbon & Compounds", done: false },
      { name: "5. Life Processes", done: false },
    ]
    let y = 68
    for (const c of chaps) {
      prims.push(rect(18, y, w - 36, 32, { r: 4, stroke: "muted", fill: c.done ? "shade" : "none", fillColor: c.done ? "faint" : undefined }))
      prims.push(pill(28, y + 10, 12, 12, { stroke: "ink", fill: c.done ? "shade" : "none", fillColor: c.done ? "muted" : undefined }))
      prims.push(text(50, y + 21, c.name, 10, { bold: c.done }))
      prims.push(text(w - 30, y + 21, c.done ? "Done" : "Pending", 9, { align: "right", color: "muted" }))
      y += 38
    }
    return prims
  },
}

export const chapterTrackerDef: ComponentDef = {
  kind: "chapter-tracker",
  name: "Chapter Tracker",
  category: "blocks",
  group: "Student",
  keywords: ["chapter", "tracker", "milestone", "topics", "student"],
  size: { w: 420, h: 260 },
  defaults: { chapter: "Quadratic Equations", subject: "Mathematics" },
  controls: [
    { key: "chapter", label: "Chapter", type: "text" },
    { key: "subject", label: "Subject", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = []
    const chap = str(p, "chapter", "Quadratic Equations")
    const subName = str(p, "subject", "Mathematics")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(text(18, 26, chap, 13, { bold: true }))
    prims.push(text(18, 42, subName, 10, { color: "muted" }))

    const milestones = [
      { label: "Theory & Derivations", done: true },
      { label: "NCERT Exercises Solved", done: true },
      { label: "Exemplar Problems Solved", done: false },
      { label: "10 Years PYQs Solved", done: false },
    ]
    let y = 64
    for (const m of milestones) {
      prims.push(rect(18, y, w - 36, 36, { r: 5, stroke: "muted", fill: m.done ? "shade" : "none", fillColor: m.done ? "faint" : undefined }))
      prims.push(pill(30, y + 12, 14, 14, { stroke: "ink", fill: m.done ? "shade" : "none", fillColor: m.done ? "muted" : undefined }))
      if (m.done) prims.push(text(37, y + 23, "✓", 9, { align: "center", bold: true }))
      prims.push(text(54, y + 23, m.label, 10, { bold: m.done }))
      y += 44
    }
    return prims
  },
}

export const flashcardsDef: ComponentDef = {
  kind: "study-flashcard",
  name: "Flashcards",
  category: "blocks",
  group: "Student",
  keywords: ["flashcard", "study", "memorize", "quiz", "revision", "active recall"],
  size: { w: 380, h: 240 },
  defaults: { front: "What is Faraday's Law?", back: "EMF = -N (dΦ/dt)" },
  controls: [
    { key: "front", label: "Question (Front)", type: "text" },
    { key: "back", label: "Answer (Back)", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = []
    const front = str(p, "front", "What is Faraday's Law?")
    const back = str(p, "back", "EMF = -N (dΦ/dt)")
    prims.push(rect(0, 0, w, h, { r: 10, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(pill(18, 16, 70, 20, { stroke: "muted", fill: "shade", fillColor: "faint" }))
    prims.push(text(53, 30, "FLASHCARD", 8, { align: "center", bold: true }))

    prims.push(text(w / 2, 90, front, 13, { align: "center", bold: true }))
    prims.push(line(36, 125, w - 36, 125, { stroke: "faint" }))
    prims.push(text(w / 2, 160, back, 12, { align: "center", color: "muted" }))
    prims.push(text(w / 2, 215, "Click to flip • Spaced repetition", 9, { align: "center", color: "muted" }))
    return prims
  },
}

export const questionBoardDef: ComponentDef = {
  kind: "question-board",
  name: "Question Board",
  category: "blocks",
  group: "Student",
  keywords: ["question", "practice", "pyq", "exam", "board", "problem"],
  size: { w: 460, h: 260 },
  defaults: { question: "State Newton's Second Law of Motion.", difficulty: "Medium", marks: "3" },
  controls: [
    { key: "question", label: "Question", type: "text" },
    { key: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard"] },
  ],
  render(p, w, h) {
    const prims: Prim[] = []
    const q = str(p, "question", "State Newton's Second Law of Motion.")
    const diff = str(p, "difficulty", "Medium")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(pill(18, 16, 50, 20, { stroke: "muted", fill: "shade", fillColor: "faint" }))
    prims.push(text(43, 29, "PYQ", 8, { align: "center", bold: true }))
    prims.push(pill(76, 16, 60, 20, { stroke: "muted", fill: "none" }))
    prims.push(text(106, 29, diff, 8, { align: "center" }))

    prims.push(text(18, 70, q, 12, { bold: true }))
    prims.push(rect(18, 96, w - 36, 100, { r: 6, stroke: "muted", fill: "shade", fillColor: "faint" }))
    prims.push(text(28, 120, "Solution & Working:", 10, { bold: true }))
    prims.push(text(28, 142, "Rate of change of momentum is proportional to applied force.", 10, { color: "muted" }))
    prims.push(text(28, 162, "F = dp/dt = m(dv/dt) = ma", 10, { color: "muted" }))
    return prims
  },
}

export const examDashboardDef: ComponentDef = {
  kind: "exam-dashboard",
  name: "Exam Dashboard",
  category: "blocks",
  group: "Student",
  keywords: ["exam", "countdown", "target", "score", "dashboard", "student"],
  size: { w: 480, h: 280 },
  defaults: { exam: "Final Board Examinations", daysLeft: "42", targetScore: "95%" },
  controls: [
    { key: "exam", label: "Exam Name", type: "text" },
    { key: "daysLeft", label: "Days Left", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = []
    const exam = str(p, "exam", "Final Board Examinations")
    const days = str(p, "daysLeft", "42")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(text(18, 28, exam, 13, { bold: true }))

    // Countdown card
    prims.push(rect(18, 46, 140, 80, { r: 6, stroke: "muted", fill: "shade", fillColor: "faint" }))
    prims.push(text(88, 86, days, 26, { align: "center", bold: true }))
    prims.push(text(88, 112, "Days Remaining", 9, { align: "center", color: "muted" }))

    // Target card
    prims.push(rect(168, 46, 140, 80, { r: 6, stroke: "muted", fill: "none" }))
    prims.push(text(238, 86, "95%", 26, { align: "center", bold: true }))
    prims.push(text(238, 112, "Target Score", 9, { align: "center", color: "muted" }))

    // Syllabus card
    prims.push(rect(318, 46, 144, 80, { r: 6, stroke: "muted", fill: "shade", fillColor: "muted" }))
    prims.push(text(390, 86, "78%", 26, { align: "center", bold: true }))
    prims.push(text(390, 112, "Prepared", 9, { align: "center", color: "muted" }))

    // Subjects list
    const subjects = ["Mathematics (92%)", "Physics (84%)", "Chemistry (76%)", "English (88%)"]
    let sx = 18
    for (const s of subjects) {
      prims.push(rect(sx, 144, (w - 48) / 2, 42, { r: 4, stroke: "muted", fill: "none" }))
      prims.push(text(sx + 10, 169, s, 10, { bold: true }))
      sx += (w - 48) / 2 + 12
      if (sx > w - 100) sx = 18
    }
    return prims
  },
}

export const studySessionDef: ComponentDef = {
  kind: "study-session",
  name: "Study Session",
  category: "blocks",
  group: "Student",
  keywords: ["session", "pomodoro", "timer", "focus", "study", "intervals"],
  size: { w: 380, h: 220 },
  defaults: { duration: "45:00", mode: "Deep Focus", subject: "Calculus" },
  controls: [
    { key: "duration", label: "Duration", type: "text" },
    { key: "mode", label: "Mode", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = []
    const dur = str(p, "duration", "45:00")
    const mode = str(p, "mode", "Deep Focus")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(pill(w / 2 - 40, 18, 80, 20, { stroke: "muted", fill: "shade", fillColor: "faint" }))
    prims.push(text(w / 2, 31, mode.toUpperCase(), 8, { align: "center", bold: true }))
    prims.push(text(w / 2, 105, dur, 36, { align: "center", bold: true }))
    prims.push(text(w / 2, 138, "Subject: Mathematics", 11, { align: "center", color: "muted" }))
    prims.push(pill(w / 2 - 50, 164, 100, 32, { stroke: "ink", fill: "shade", fillColor: "muted" }))
    prims.push(text(w / 2, 183, "Active Session", 10, { align: "center", bold: true }))
    return prims
  },
}

export const notesPageDef: ComponentDef = {
  kind: "notes-page",
  name: "Notes Page",
  category: "blocks",
  group: "Student",
  keywords: ["notes", "lecture", "handout", "summary", "paper", "ruled"],
  size: { w: 480, h: 360 },
  defaults: { heading: "Lecture Notes: Organic Chemistry" },
  controls: [{ key: "heading", label: "Heading", type: "text" }],
  render(p, w, h) {
    const prims: Prim[] = []
    const heading = str(p, "heading", "Lecture Notes: Organic Chemistry")
    prims.push(rect(0, 0, w, h, { r: 8, stroke: "ink", fill: "solid", fillColor: "paper" }))
    prims.push(text(24, 34, heading, 13, { bold: true }))
    prims.push(line(24, 46, w - 24, 46, { stroke: "ink", strokeWidth: 1.5 }))

    // Ruled lines
    let ly = 74
    while (ly < h - 24) {
      prims.push(line(24, ly, w - 24, ly, { stroke: "faint" }))
      ly += 26
    }
    prims.push(text(28, 68, "• Key Concepts & Reactions:", 10, { bold: true }))
    prims.push(text(38, 94, "1. Electrophilic aromatic substitution mechanism", 9, { color: "muted" }))
    prims.push(text(38, 120, "2. Resonance stabilization of carbocation intermediate", 9, { color: "muted" }))
    prims.push(text(38, 146, "3. Ortho/Para directors vs Meta directors summary", 9, { color: "muted" }))
    return prims
  },
}

export const studyDefs: ComponentDef[] = [
  mindMapDef,
  conceptMapDef,
  chapterSummaryDef,
  formulaSheetDef,
  revisionBoardDef,
  mistakeBoardDef,
  studyTimetableDef,
  studyPlanDef,
  weeklyCalendarDef,
  monthlyCalendarDef,
  syllabusTrackerDef,
  chapterTrackerDef,
  flashcardsDef,
  questionBoardDef,
  examDashboardDef,
  studySessionDef,
  notesPageDef,
]

