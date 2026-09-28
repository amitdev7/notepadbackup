// ---------------------------------------------------------------------------
// Student Kit — course header, assignments, flashcards, quizzes, study tools.
// ---------------------------------------------------------------------------

import type { Prim } from "@/lib/sketch/kit"
import { rect, pill, ellipse, line, text, icon, truncate, textWidth } from "@/lib/sketch/kit"
import type { ComponentDef, Props } from "./registry"

const str = (p: Props, k: string, fallback = ""): string => String(p[k] ?? fallback)

/** Outline or wash pill with a centred label — the old pill({label}) shape. */
function pillLabel(
  prims: Prim[],
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  size: number,
  wash?: boolean
): void {
  prims.push(wash ? pill(x, y, w, h, { fill: "shade", fillColor: "faint" }) : pill(x, y, w, h))
  prims.push(
    text(x + w / 2, y + h / 2 + size * 0.35, truncate(label, size, Math.max(0, w - 12)), size, {
      align: "center",
    })
  )
}

/** Greedy word-wrap into at most two lines, measured with textWidth. */
function wrap2(s: string, size: number, maxW: number): string[] {
  const words = s.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ""
  for (const wd of words) {
    const next = cur ? cur + " " + wd : wd
    if (textWidth(next, size) <= maxW || !cur) cur = next
    else {
      lines.push(cur)
      cur = wd
      if (lines.length === 1 && textWidth(cur, size) > maxW) {
        // second line takes the rest, ellipsized
        const rest = words.slice(words.indexOf(wd)).join(" ")
        lines.push(truncate(rest, size, maxW))
        return lines
      }
    }
  }
  if (cur) lines.push(lines.length === 1 ? truncate(cur, size, maxW) : cur)
  if (lines.length > 2) return [lines[0], truncate(lines.slice(1).join(" "), size, maxW)]
  return lines
}

// -- student header -----------------------------------------------------------

export const studentHeaderDef: ComponentDef = {
  kind: "student.header",
  name: "Student Header",
  category: "components",
  group: "Navigation",
  keywords: ["header", "course", "title", "breadcrumb", "student", "class"],
  size: { w: 460, h: 88 },
  defaults: {
    courseCode: "CS 101",
    courseName: "Introduction to Computer Science",
    term: "Fall 2026 • Week 4",
  },
  controls: [
    { key: "courseCode", label: "Course Code", type: "text" },
    { key: "courseName", label: "Course Name", type: "text" },
    { key: "term", label: "Term / Semester", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { fill: "shade", fillColor: "faint", r: 8 })]
    prims.push(...icon("graduation-cap", 28, 29, 24))
    pillLabel(prims, 50, 18, 70, 22, str(p, "courseCode", "CS 101"), 10)
    prims.push(
      text(130, 36, truncate(str(p, "courseName", "Introduction to Computer Science"), 14, Math.max(0, w - 146)), 14, {
        bold: true,
      })
    )
    prims.push(line(16, 52, Math.max(17, w - 16), 52, { stroke: "faint", dashed: true }))
    prims.push(
      text(16, 73, truncate(str(p, "term", "Fall 2026 • Week 4"), 11, Math.max(0, w - 80)), 11, { color: "muted" })
    )
    prims.push(...icon("bell", w - 32, h - 20, 16, { stroke: "muted" }))
    return prims
  },
}

// -- assignment card ----------------------------------------------------------

export const assignmentCardDef: ComponentDef = {
  kind: "student.assignment-card",
  name: "Assignment Card",
  category: "components",
  group: "Display",
  keywords: ["assignment", "homework", "task", "due date", "student"],
  size: { w: 260, h: 140 },
  defaults: {
    title: "Problem Set 3: Recursion",
    due: "Tomorrow, 11:59 PM",
    points: "50 pts",
    status: "In Progress",
  },
  controls: [
    { key: "title", label: "Title", type: "text" },
    { key: "due", label: "Due Date", type: "text" },
    { key: "points", label: "Points", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Not Started", "In Progress", "Submitted"],
      quick: true,
    },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 8 })]
    pillLabel(prims, 14, 14, 80, 20, str(p, "status", "In Progress"), 10, true)
    pillLabel(prims, w - 60, 14, 46, 20, str(p, "points", "50 pts"), 10)
    prims.push(
      text(14, 59, truncate(str(p, "title", "Problem Set 3: Recursion"), 13, Math.max(0, w - 28)), 13, { bold: true })
    )
    prims.push(line(14, 76, Math.max(15, w - 14), 76, { stroke: "faint", dashed: true }))
    prims.push(...icon("clock", 21, 95, 14, { stroke: "muted" }))
    prims.push(
      text(34, 99, truncate(str(p, "due", "Tomorrow, 11:59 PM"), 11, Math.max(0, w - 48)), 11, { color: "muted" })
    )
    const by = h - 28
    prims.push(rect(14, by, Math.max(0, w - 28), 16, { r: 4 }))
    prims.push(rect(14, by, Math.max(0, (w - 28) * 0.6), 16, { r: 4, fill: "shade", fillColor: "ink" }))
    return prims
  },
}

// -- flashcard ----------------------------------------------------------------

export const flashcardDef: ComponentDef = {
  kind: "student.flashcard",
  name: "Study Flashcard",
  category: "components",
  group: "Display",
  keywords: ["flashcard", "study", "anki", "memory", "deck"],
  size: { w: 300, h: 180 },
  defaults: {
    front: "Mitochondria",
    tag: "Biology • Organelles",
    cardNum: "14 / 45",
  },
  controls: [
    { key: "front", label: "Front / Term", type: "text" },
    { key: "tag", label: "Tag / Subject", type: "text" },
    { key: "cardNum", label: "Card Number", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { fill: "shade", fillColor: "faint", r: 10 })]
    pillLabel(prims, 16, 14, 110, 22, str(p, "tag", "Biology • Organelles"), 10)
    prims.push(
      text(w - 16, 29, truncate(str(p, "cardNum", "14 / 45"), 11, 80), 11, { align: "right", color: "muted" })
    )
    prims.push(
      text(
        w / 2,
        h / 2 + 6,
        truncate(str(p, "front", "Mitochondria"), 18, Math.max(0, w - 40)),
        18,
        { align: "center", bold: true }
      )
    )
    prims.push(line(20, h - 45, Math.max(21, w - 20), h - 45, { stroke: "faint", dashed: true }))
    prims.push(...icon("arrows-clockwise", w / 2 - 32, h - 24, 16, { stroke: "muted" }))
    prims.push(text(w / 2 - 10, h - 19, "Click to flip", 11, { color: "muted" }))
    return prims
  },
}

// -- quiz mcq -----------------------------------------------------------------

export const quizMcqDef: ComponentDef = {
  kind: "student.quiz-mcq",
  name: "Quiz Question (MCQ)",
  category: "components",
  group: "Forms",
  keywords: ["quiz", "test", "question", "multiple choice", "exam"],
  size: { w: 320, h: 210 },
  defaults: {
    question: "Which sorting algorithm has O(n log n) worst-case time?",
    optA: "Quick Sort",
    optB: "Merge Sort",
    optC: "Bubble Sort",
  },
  controls: [
    { key: "question", label: "Question", type: "text" },
    { key: "optA", label: "Option A", type: "text" },
    { key: "optB", label: "Option B", type: "text" },
    { key: "optC", label: "Option C", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 8 })]
    pillLabel(prims, 16, 14, 70, 20, "Question 4", 10, true)
    prims.push(
      text(
        16,
        56,
        truncate(str(p, "question", "Which sorting algorithm has O(n log n) worst-case time?"), 12, Math.max(0, w - 32)),
        12,
        { bold: true }
      )
    )
    prims.push(line(16, 72, Math.max(17, w - 16), 72, { stroke: "faint" }))
    const opts = ["A. " + str(p, "optA", "Quick Sort"), "B. " + str(p, "optB", "Merge Sort"), "C. " + str(p, "optC", "Bubble Sort")]
    const top = 82
    const rowH = Math.max(28, Math.min(34, (h - top - 8) / 3))
    opts.forEach((opt, i) => {
      const ry = top + i * (rowH + 6)
      if (ry + rowH > h - 4) return
      const selected = i === 1
      prims.push(
        rect(16, ry, Math.max(0, w - 32), rowH, selected ? { r: 6, fill: "shade", fillColor: "faint" } : { r: 6 })
      )
      const d = Math.min(14, rowH - 12)
      const cy = ry + rowH / 2
      prims.push(ellipse(28, cy - d / 2, d, d))
      if (selected) prims.push(ellipse(28 + d * 0.25, cy - d * 0.25, d * 0.5, d * 0.5, { fill: "solid", fillColor: "ink" }))
      prims.push(
        text(28 + d + 6, cy + 4, truncate(opt, 11, Math.max(0, w - 56 - d)), 11, { bold: selected })
      )
    })
    return prims
  },
}

// -- pomodoro -----------------------------------------------------------------

export const pomodoroDef: ComponentDef = {
  kind: "student.pomodoro",
  name: "Pomodoro Timer",
  category: "components",
  group: "Display",
  keywords: ["pomodoro", "timer", "focus", "clock", "study timer"],
  size: { w: 180, h: 180 },
  defaults: { time: "24:50", session: "Deep Focus (1/4)" },
  controls: [
    { key: "time", label: "Time Left", type: "text" },
    { key: "session", label: "Session Type", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 16 })]
    const d = Math.max(40, Math.min(100, w - 16, h - 70))
    const cx = w / 2
    const cy = h / 2 - 14
    prims.push(ellipse(cx - d / 2, cy - d / 2, d, d))
    prims.push(
      text(cx, cy + 22 * 0.35 + 2, truncate(str(p, "time", "24:50"), 22, Math.max(0, d - 16)), 22, {
        align: "center",
        bold: true,
      })
    )
    prims.push(
      text(cx, cy + 24, truncate(str(p, "session", "Deep Focus (1/4)"), 9, Math.max(0, d - 12)), 9, {
        align: "center",
        color: "muted",
      })
    )
    pillLabel(prims, w / 2 - 36, h - 36, 72, 24, "Pause", 12, true)
    return prims
  },
}

// -- progress ring ------------------------------------------------------------

export const progressRingDef: ComponentDef = {
  kind: "student.progress-ring",
  name: "Course Progress Ring",
  category: "components",
  group: "Feedback",
  keywords: ["progress", "completion", "percentage", "ring", "stats"],
  size: { w: 160, h: 160 },
  defaults: { percentage: "78%", label: "Syllabus Mastered" },
  controls: [
    { key: "percentage", label: "Percentage", type: "text" },
    { key: "label", label: "Metric Label", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 12 })]
    const cy = h / 2 - 16
    const d = Math.max(36, Math.min(84, w - 16, h - 60))
    prims.push(ellipse(w / 2 - d / 2, cy - d / 2, d, d))
    const inner = d - 16
    prims.push(ellipse(w / 2 - inner / 2, cy - inner / 2, inner, inner, { fill: "shade", fillColor: "faint" }))
    prims.push(
      text(w / 2, cy + 18 * 0.35, truncate(str(p, "percentage", "78%"), 18, Math.max(0, inner - 8)), 18, {
        align: "center",
        bold: true,
      })
    )
    prims.push(
      text(w / 2, h - 14, truncate(str(p, "label", "Syllabus Mastered"), 10, Math.max(0, w - 20)), 10, {
        align: "center",
        color: "muted",
      })
    )
    return prims
  },
}

// -- streak counter -----------------------------------------------------------

export const streakCounterDef: ComponentDef = {
  kind: "student.streak-counter",
  name: "Study Streak Badge",
  category: "components",
  group: "Feedback",
  keywords: ["streak", "habit", "flame", "gamification", "days"],
  size: { w: 150, h: 74 },
  defaults: { days: "12", subtitle: "Day Streak!" },
  controls: [
    { key: "days", label: "Days", type: "text" },
    { key: "subtitle", label: "Subtitle", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { fill: "shade", fillColor: "faint", r: 8 })]
    prims.push(...icon("fire", 30, h / 2, Math.min(32, h - 16)))
    prims.push(text(56, 38, truncate(str(p, "days", "12"), 22, Math.max(0, w - 66)), 22, { bold: true }))
    prims.push(
      text(56, 54, truncate(str(p, "subtitle", "Day Streak!"), 10, Math.max(0, w - 66)), 10, { color: "muted" })
    )
    return prims
  },
}

// -- grade pill ---------------------------------------------------------------

export const gradePillDef: ComponentDef = {
  kind: "student.grade-pill",
  name: "Grade Badge / Pill",
  category: "components",
  group: "Display",
  keywords: ["grade", "score", "gpa", "letter", "badge"],
  size: { w: 100, h: 52 },
  defaults: { grade: "A-", percent: "91.5%" },
  controls: [
    { key: "grade", label: "Grade", type: "text" },
    { key: "percent", label: "Percentage", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [pill(0, 0, w, h)]
    prims.push(text(16, h / 2 + 18 * 0.35, truncate(str(p, "grade", "A-"), 18, 34), 18, { bold: true }))
    prims.push(
      text(54, h / 2 + 11 * 0.35, truncate(str(p, "percent", "91.5%"), 11, Math.max(0, w - 60)), 11, {
        color: "muted",
      })
    )
    return prims
  },
}

// -- study checklist ----------------------------------------------------------

export const studyChecklistDef: ComponentDef = {
  kind: "student.study-checklist",
  name: "Study Checklist",
  category: "components",
  group: "Forms",
  keywords: ["checklist", "todo", "tasks", "study plan", "review"],
  size: { w: 240, h: 160 },
  defaults: {
    title: "Midterm Review Plan",
    item1: "Read Chapter 4 & 5",
    item2: "Solve practice quiz",
    item3: "Review flashcards",
  },
  controls: [
    { key: "title", label: "List Title", type: "text" },
    { key: "item1", label: "Item 1", type: "text" },
    { key: "item2", label: "Item 2", type: "text" },
    { key: "item3", label: "Item 3", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 8 })]
    prims.push(
      text(14, 27, truncate(str(p, "title", "Midterm Review Plan"), 13, Math.max(0, w - 28)), 13, { bold: true })
    )
    prims.push(line(14, 38, Math.max(15, w - 14), 38, { stroke: "faint" }))
    const items = [str(p, "item1", "Read Chapter 4 & 5"), str(p, "item2", "Solve practice quiz"), str(p, "item3", "Review flashcards")]
    const gap = Math.max(30, (h - 48) / 3)
    items.forEach((item, i) => {
      const by = 50 + i * gap
      if (by + 14 > h - 4) return
      if (i === 0) {
        prims.push(rect(14, by, 14, 14, { fill: "solid", fillColor: "ink" }))
        prims.push(...icon("check", 21, by + 7, 11, { stroke: "paper" }))
      } else {
        prims.push(rect(14, by, 14, 14))
      }
      prims.push(text(36, by + 11, truncate(item, 11, Math.max(0, w - 50)), 11))
    })
    return prims
  },
}

// -- calendar day -------------------------------------------------------------

export const calendarDayDef: ComponentDef = {
  kind: "student.calendar-day",
  name: "Class Calendar Widget",
  category: "components",
  group: "Display",
  keywords: ["calendar", "schedule", "class", "time", "lecture"],
  size: { w: 220, h: 150 },
  defaults: {
    day: "WED, OCT 14",
    event1: "10:00 AM • Physics Lab",
    event2: "01:30 PM • Calculus III",
  },
  controls: [
    { key: "day", label: "Day", type: "text" },
    { key: "event1", label: "Event 1", type: "text" },
    { key: "event2", label: "Event 2", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 8 })]
    prims.push(rect(0, 0, w, 32, { fill: "shade", fillColor: "faint", r: 8 }))
    prims.push(
      text(14, 21, truncate(str(p, "day", "WED, OCT 14"), 11, Math.max(0, w - 28)), 11, { bold: true })
    )
    const events = [str(p, "event1", "10:00 AM • Physics Lab"), str(p, "event2", "01:30 PM • Calculus III")]
    const rowH = Math.max(30, Math.min(40, (h - 54) / 2))
    events.forEach((ev, i) => {
      const ry = 44 + i * (rowH + 10)
      if (ry + rowH > h - 4) return
      prims.push(rect(12, ry, Math.max(0, w - 24), rowH, { r: 4 }))
      prims.push(line(18, ry + 4, 18, ry + rowH - 4))
      prims.push(text(28, ry + rowH / 2 + 4, truncate(ev, 10, Math.max(0, w - 52)), 10))
    })
    return prims
  },
}

// -- cornell note -------------------------------------------------------------

export const cornellNoteDef: ComponentDef = {
  kind: "student.cornell-note",
  name: "Cornell Notes Layout",
  category: "components",
  group: "Display",
  keywords: ["cornell", "notes", "cues", "summary", "lecture note"],
  size: { w: 360, h: 240 },
  defaults: {
    topic: "Photosynthesis: Light Reactions",
    cues: "Thylakoid",
    summary: "Light energy is converted to chemical energy.",
  },
  controls: [
    { key: "topic", label: "Topic", type: "text" },
    { key: "cues", label: "Cue Words", type: "text" },
    { key: "summary", label: "Summary", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 6 })]
    prims.push(rect(0, 0, w, 36, { fill: "shade", fillColor: "faint", r: 6 }))
    prims.push(
      text(
        14,
        23,
        truncate(str(p, "topic", "Photosynthesis: Light Reactions"), 13, Math.max(0, w - 28)),
        13,
        { bold: true }
      )
    )
    const sumY = h - 50
    const cx = Math.min(100, w * 0.3)
    prims.push(line(cx, 36, cx, sumY))
    prims.push(text(10, 57, "CUES", 9, { bold: true, color: "muted" }))
    prims.push(text(10, 78, truncate(str(p, "cues", "Thylakoid"), 10, Math.max(0, cx - 20)), 10))
    const nx = cx + 12
    prims.push(text(nx, 57, "LECTURE NOTES", 9, { bold: true, color: "muted" }))
    for (let ly = 70; ly < sumY - 8; ly += 24) {
      prims.push(line(nx, ly, Math.max(nx + 1, w - 20), ly, { stroke: "faint", dashed: true }))
    }
    prims.push(line(0, sumY, w, sumY, { stroke: "faint" }))
    prims.push(text(14, sumY + 9, "SUMMARY", 9, { bold: true, color: "muted" }))
    prims.push(
      text(14, sumY + 25, truncate(str(p, "summary", "Light energy is converted to chemical energy."), 10, Math.max(0, w - 28)), 10)
    )
    return prims
  },
}

// -- vocab chip ---------------------------------------------------------------

export const vocabChipDef: ComponentDef = {
  kind: "student.vocab-chip",
  name: "Vocabulary Term Chip",
  category: "components",
  group: "Display",
  keywords: ["vocab", "vocabulary", "definition", "term", "dictionary"],
  size: { w: 200, h: 70 },
  defaults: { term: "Ephemeral", pos: "adj. / lasting briefly" },
  controls: [
    { key: "term", label: "Term", type: "text" },
    { key: "pos", label: "Part of Speech", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { fill: "shade", fillColor: "faint", r: 8 })]
    prims.push(
      text(14, 28, truncate(str(p, "term", "Ephemeral"), 14, Math.max(0, w - 76)), 14, { bold: true })
    )
    pillLabel(prims, w - 46, 12, 36, 18, "IPA", 9)
    prims.push(
      text(14, 50, truncate(str(p, "pos", "adj. / lasting briefly"), 10, Math.max(0, w - 28)), 10, {
        color: "muted",
      })
    )
    return prims
  },
}

// -- formula card -------------------------------------------------------------

export const formulaCardDef: ComponentDef = {
  kind: "student.formula-card",
  name: "Formula / Theorem Card",
  category: "components",
  group: "Display",
  keywords: ["formula", "math", "physics", "equation", "theorem"],
  size: { w: 260, h: 110 },
  defaults: {
    title: "Quadratic Formula",
    formula: "x = (-b ± √(b² - 4ac)) / 2a",
  },
  controls: [
    { key: "title", label: "Formula Title", type: "text" },
    { key: "formula", label: "Equation", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 8 })]
    prims.push(
      text(14, 23, truncate(str(p, "title", "Quadratic Formula"), 11, Math.max(0, w - 28)), 11, { bold: true })
    )
    const boxY = 34
    const boxH = Math.max(36, h - boxY - 12)
    prims.push(rect(12, boxY, Math.max(0, w - 24), boxH, { r: 6, fill: "shade", fillColor: "faint" }))
    prims.push(
      text(
        w / 2,
        boxY + boxH / 2 + 12 * 0.35,
        truncate(str(p, "formula", "x = (-b ± √(b² - 4ac)) / 2a"), 12, Math.max(0, w - 48)),
        12,
        { align: "center", bold: true }
      )
    )
    return prims
  },
}

// -- audio lecture player -----------------------------------------------------

export const audioLecturePlayerDef: ComponentDef = {
  kind: "student.audio-lecture-player",
  name: "Lecture Audio Player",
  category: "components",
  group: "Media",
  keywords: ["audio", "lecture", "podcast", "recording", "player"],
  size: { w: 280, h: 90 },
  defaults: {
    title: "Lecture 7: Microeconomics",
    duration: "18:42 / 52:10",
  },
  controls: [
    { key: "title", label: "Lecture Title", type: "text" },
    { key: "duration", label: "Progress", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 10 })]
    prims.push(...icon("microphone", 24, 24, 20, { stroke: "muted" }))
    prims.push(
      text(42, 26, truncate(str(p, "title", "Lecture 7: Microeconomics"), 12, Math.max(0, w - 58)), 12, {
        bold: true,
      })
    )
    const ty = Math.min(48, h - 42)
    prims.push(line(14, ty, Math.max(15, w - 14), ty, { stroke: "faint" }))
    const kx = 14 + (w - 28) * 0.4
    prims.push(line(14, ty, kx, ty, { strokeWidth: 2.5 }))
    prims.push(ellipse(kx - 4, ty - 4, 8, 8, { fill: "solid", fillColor: "ink" }))
    prims.push(...icon("play", 23, h - 19, 18))
    prims.push(...icon("arrow-right", 49, h - 19, 15, { stroke: "muted" }))
    prims.push(
      text(w - 14, h - 15, truncate(str(p, "duration", "18:42 / 52:10"), 10, 90), 10, {
        align: "right",
        color: "muted",
      })
    )
    return prims
  },
}

// -- discussion bubble --------------------------------------------------------

export const discussionBubbleDef: ComponentDef = {
  kind: "student.discussion-bubble",
  name: "Peer Discussion Bubble",
  category: "components",
  group: "Display",
  keywords: ["discussion", "chat", "peer", "forum", "question"],
  size: { w: 280, h: 110 },
  defaults: {
    author: "Maya Lin (TA)",
    message: "Remember office hours are moved to Thursday at 3 PM!",
    time: "2h ago",
  },
  controls: [
    { key: "author", label: "Author", type: "text" },
    { key: "message", label: "Message", type: "text" },
    { key: "time", label: "Time", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { fill: "shade", fillColor: "faint", r: 10 })]
    prims.push(ellipse(14, 14, 24, 24, { fill: "solid", fillColor: "ink" }))
    prims.push(
      text(48, 27, truncate(str(p, "author", "Maya Lin (TA)"), 11, Math.max(0, w - 120)), 11, { bold: true })
    )
    prims.push(
      text(w - 14, 25, truncate(str(p, "time", "2h ago"), 9, 60), 9, { align: "right", color: "muted" })
    )
    prims.push(
      text(
        16,
        61,
        truncate(str(p, "message", "Remember office hours are moved to Thursday at 3 PM!"), 11, Math.max(0, w - 32)),
        11
      )
    )
    pillLabel(prims, 16, h - 32, 64, 20, "Reply", 10)
    return prims
  },
}

// -- syllabus timeline --------------------------------------------------------

export const syllabusTimelineDef: ComponentDef = {
  kind: "student.syllabus-timeline",
  name: "Syllabus Timeline / Milestone",
  category: "components",
  group: "Display",
  keywords: ["syllabus", "timeline", "milestone", "roadmap", "weeks"],
  size: { w: 320, h: 100 },
  defaults: {
    week: "Week 06: Data Structures",
    next: "Midterm Exam on Oct 28",
  },
  controls: [
    { key: "week", label: "Current Week", type: "text" },
    { key: "next", label: "Next Milestone", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 8 })]
    prims.push(
      text(14, 24, truncate(str(p, "week", "Week 06: Data Structures"), 12, Math.max(0, w - 28)), 12, {
        bold: true,
      })
    )
    const ty = 46
    prims.push(line(24, ty, Math.max(25, w - 24), ty))
    const fracs = [0.16, 0.44, 0.72]
    const labels = ["Wk 4", "Wk 6", str(p, "next", "Midterm Exam on Oct 28")]
    fracs.forEach((f, i) => {
      const dx = 24 + (w - 48) * f
      if (i < 2) prims.push(ellipse(dx - 6, ty - 6, 12, 12, { fill: "solid", fillColor: "ink" }))
      else prims.push(ellipse(dx - 6, ty - 6, 12, 12, { fill: "solid", fillColor: "paper" }), ellipse(dx - 6, ty - 6, 12, 12))
      prims.push(
        text(dx, ty + 18, truncate(labels[i], 9, 90), 9, { align: "center", bold: i === 1 })
      )
    })
    return prims
  },
}

// -- study group finder -------------------------------------------------------

export const studyGroupFinderDef: ComponentDef = {
  kind: "student.study-group-finder",
  name: "Study Group Finder Card",
  category: "components",
  group: "Display",
  keywords: ["group", "study group", "peers", "collaboration", "meet"],
  size: { w: 260, h: 130 },
  defaults: {
    groupName: "Linear Algebra Squad",
    members: "4 / 6 spots filled",
    location: "Library 3rd Floor / Zoom",
  },
  controls: [
    { key: "groupName", label: "Group Name", type: "text" },
    { key: "members", label: "Member Count", type: "text" },
    { key: "location", label: "Meeting Location", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 8 })]
    prims.push(...icon("users", 24, 24, 20, { stroke: "muted" }))
    prims.push(
      text(40, 28, truncate(str(p, "groupName", "Linear Algebra Squad"), 12, Math.max(0, w - 130)), 12, {
        bold: true,
      })
    )
    pillLabel(prims, w - 74, 14, 60, 20, "Active", 10, true)
    prims.push(line(14, 44, Math.max(15, w - 14), 44, { stroke: "faint" }))
    prims.push(
      text(14, 67, truncate(str(p, "members", "4 / 6 spots filled"), 11, Math.max(0, w - 28)), 11)
    )
    prims.push(
      text(14, 86, truncate(str(p, "location", "Library 3rd Floor / Zoom"), 10, Math.max(0, w - 28)), 10, {
        color: "muted",
      })
    )
    pillLabel(prims, 14, h - 32, 80, 22, "Join Group", 10)
    return prims
  },
}

// -- leaderboard row ----------------------------------------------------------

export const leaderboardRowDef: ComponentDef = {
  kind: "student.leaderboard-row",
  name: "Class Leaderboard Row",
  category: "components",
  group: "Data",
  keywords: ["leaderboard", "rank", "points", "xp", "competition"],
  size: { w: 280, h: 52 },
  defaults: { rank: "#3", student: "Alex Rivera", xp: "1,450 XP" },
  controls: [
    { key: "rank", label: "Rank", type: "text" },
    { key: "student", label: "Student Name", type: "text" },
    { key: "xp", label: "XP / Points", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { fill: "shade", fillColor: "faint", r: 6 })]
    pillLabel(prims, 10, h / 2 - 14, 34, 28, str(p, "rank", "#3"), 10)
    prims.push(
      text(54, h / 2 + 4, truncate(str(p, "student", "Alex Rivera"), 12, Math.max(0, w - 140)), 12, {
        bold: true,
      })
    )
    pillLabel(prims, w - 75, h / 2 - 12, 65, 24, str(p, "xp", "1,450 XP"), 10)
    return prims
  },
}

// -- rubric criterion ---------------------------------------------------------

export const rubricCriterionDef: ComponentDef = {
  kind: "student.rubric-criterion",
  name: "Rubric Criterion Row",
  category: "components",
  group: "Data",
  keywords: ["rubric", "grading", "criteria", "points", "evaluation"],
  size: { w: 320, h: 90 },
  defaults: {
    criterion: "Code Quality & Comments",
    maxPts: "15 / 15 pts",
    desc: "Clear variable naming, modular functions, and inline comments.",
  },
  controls: [
    { key: "criterion", label: "Criterion", type: "text" },
    { key: "maxPts", label: "Max Points", type: "text" },
    { key: "desc", label: "Description", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { r: 6 })]
    prims.push(
      text(14, 24, truncate(str(p, "criterion", "Code Quality & Comments"), 12, Math.max(0, w - 116)), 12, {
        bold: true,
      })
    )
    pillLabel(prims, w - 85, 10, 75, 22, str(p, "maxPts", "15 / 15 pts"), 10, true)
    prims.push(line(14, 38, Math.max(15, w - 14), 38, { stroke: "faint" }))
    prims.push(
      text(
        14,
        58,
        truncate(
          str(p, "desc", "Clear variable naming, modular functions, and inline comments."),
          10,
          Math.max(0, w - 28)
        ),
        10,
        { color: "muted" }
      )
    )
    return prims
  },
}

// -- ai tutor bubble ----------------------------------------------------------

export const aiTutorBubbleDef: ComponentDef = {
  kind: "student.ai-tutor-bubble",
  name: "AI Study Copilot Bubble",
  category: "components",
  group: "Display",
  keywords: ["ai", "tutor", "copilot", "hint", "assistant", "explanation"],
  size: { w: 300, h: 120 },
  defaults: {
    hint: "Hint: In recursion, always identify your base case first to avoid stack overflow.",
    badge: "Study Copilot",
  },
  controls: [
    { key: "hint", label: "Study Hint", type: "text" },
    { key: "badge", label: "Badge Label", type: "text" },
  ],
  render(p, w, h) {
    const prims: Prim[] = [rect(0, 0, w, h, { fill: "shade", fillColor: "faint", r: 10 })]
    prims.push(...icon("sparkle", 23, 21, 18))
    pillLabel(prims, 36, 10, 95, 20, str(p, "badge", "Study Copilot"), 10)
    const lines = wrap2(
      str(p, "hint", "Hint: In recursion, always identify your base case first to avoid stack overflow."),
      11,
      Math.max(0, w - 28)
    )
    lines.forEach((ln, i) => {
      prims.push(text(14, 55 + i * 16, ln, 11))
    })
    const divY = 44 + lines.length * 16 + 4
    prims.push(line(14, divY, Math.max(15, w - 14), divY, { stroke: "faint", dashed: true }))
    const btnY = h - 28
    pillLabel(prims, 14, btnY, 100, 20, "Explain Step-by-Step", 9)
    pillLabel(prims, 120, btnY, 70, 20, "Give Quiz", 9)
    return prims
  },
}

export const STUDENT_DEFS: ComponentDef[] = [
  studentHeaderDef,
  assignmentCardDef,
  flashcardDef,
  quizMcqDef,
  pomodoroDef,
  progressRingDef,
  streakCounterDef,
  gradePillDef,
  studyChecklistDef,
  calendarDayDef,
  cornellNoteDef,
  vocabChipDef,
  formulaCardDef,
  audioLecturePlayerDef,
  discussionBubbleDef,
  syllabusTimelineDef,
  studyGroupFinderDef,
  leaderboardRowDef,
  rubricCriterionDef,
  aiTutorBubbleDef,
]
