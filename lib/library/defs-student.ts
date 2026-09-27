// ---------------------------------------------------------------------------
// Student Components Library Definitions (defs-student.ts)
// Zenithsui Student Kit - 20 handcrafted wireframe napkin components
// ---------------------------------------------------------------------------

import {
  type Prim,
  INK,
  SHADE,
  rect,
  pill,
  line,
  text,
  ellipse,
  icon,
} from "@/lib/sketch/kit"
import type { ComponentDef } from "./registry"

export const STUDENT_DEFS: ComponentDef[] = [
  // 1. student.header
  {
    kind: "student.header",
    name: "Student Header",
    category: "student",
    keywords: ["header", "course", "title", "breadcrumb", "student", "class"],
    icon: "GraduationCap",
    defaultWidth: 460,
    defaultHeight: 88,
    props: {
      courseCode: { type: "text", label: "Course Code", default: "CS 101" },
      courseName: { type: "text", label: "Course Name", default: "Introduction to Computer Science" },
      term: { type: "text", label: "Term / Semester", default: "Fall 2026 • Week 4" },
    },
    emit: (w, h, props) => {
      const p = {
        courseCode: "CS 101",
        courseName: "Introduction to Computer Science",
        term: "Fall 2026 • Week 4",
        ...props,
      }
      const prims: Prim[] = [
        rect(0, 0, w, h, { fill: SHADE, r: 8 }),
        icon("GraduationCap", 16, 18, 24),
        pill(50, 18, 70, 22, { label: String(p.courseCode), size: "xs" }),
        text(130, 22, String(p.courseName), { size: 14, weight: "bold" }),
        line(16, 52, w - 16, 52, { dashed: true }),
        text(16, 62, String(p.term), { size: 11, color: "var(--sq-ink-subtle, #6b665f)" }),
        icon("Bell", w - 40, 60, 16),
      ]
      return prims
    },
  },

  // 2. student.assignment-card
  {
    kind: "student.assignment-card",
    name: "Assignment Card",
    category: "student",
    keywords: ["assignment", "homework", "task", "due date", "student"],
    icon: "ClipboardText",
    defaultWidth: 260,
    defaultHeight: 140,
    props: {
      title: { type: "text", label: "Title", default: "Problem Set 3: Recursion" },
      due: { type: "text", label: "Due Date", default: "Tomorrow, 11:59 PM" },
      points: { type: "text", label: "Points", default: "50 pts" },
      status: { type: "select", label: "Status", default: "In Progress", options: ["Not Started", "In Progress", "Submitted"] },
    },
    emit: (w, h, props) => {
      const p = {
        title: "Problem Set 3: Recursion",
        due: "Tomorrow, 11:59 PM",
        points: "50 pts",
        status: "In Progress",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 8 }),
        pill(14, 14, 80, 20, { label: String(p.status), size: "xs", fill: SHADE }),
        pill(w - 60, 14, 46, 20, { label: String(p.points), size: "xs" }),
        text(14, 46, String(p.title), { size: 13, weight: "bold" }),
        line(14, 76, w - 14, 76, { dashed: true }),
        icon("Clock", 14, 88, 14),
        text(34, 89, String(p.due), { size: 11, color: "var(--sq-ink-subtle, #6b665f)" }),
        rect(14, 112, w - 28, 16, { r: 4, fill: "transparent" }),
        rect(14, 112, (w - 28) * 0.6, 16, { r: 4, fill: SHADE }),
      ]
    },
  },

  // 3. student.flashcard
  {
    kind: "student.flashcard",
    name: "Study Flashcard",
    category: "student",
    keywords: ["flashcard", "study", "anki", "memory", "deck"],
    icon: "Cards",
    defaultWidth: 300,
    defaultHeight: 180,
    props: {
      front: { type: "text", label: "Front / Term", default: "Mitochondria" },
      tag: { type: "text", label: "Tag / Subject", default: "Biology • Organelles" },
      cardNum: { type: "text", label: "Card Number", default: "14 / 45" },
    },
    emit: (w, h, props) => {
      const p = {
        front: "Mitochondria",
        tag: "Biology • Organelles",
        cardNum: "14 / 45",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 10, fill: SHADE }),
        pill(16, 14, 110, 22, { label: String(p.tag), size: "xs" }),
        text(w - 55, 18, String(p.cardNum), { size: 11 }),
        text(w / 2, h / 2 - 10, String(p.front), { size: 18, weight: "bold", align: "center" }),
        line(20, h - 45, w - 20, h - 45, { dashed: true }),
        icon("ArrowsClockwise", w / 2 - 40, h - 32, 16),
        text(w / 2 - 18, h - 30, "Click to flip", { size: 11 }),
      ]
    },
  },

  // 4. student.quiz-mcq
  {
    kind: "student.quiz-mcq",
    name: "Quiz Question (MCQ)",
    category: "student",
    keywords: ["quiz", "test", "question", "multiple choice", "exam"],
    icon: "ListChecks",
    defaultWidth: 320,
    defaultHeight: 210,
    props: {
      question: { type: "text", label: "Question", default: "Which sorting algorithm has O(n log n) worst-case time?" },
      optA: { type: "text", label: "Option A", default: "Quick Sort" },
      optB: { type: "text", label: "Option B", default: "Merge Sort" },
      optC: { type: "text", label: "Option C", default: "Bubble Sort" },
    },
    emit: (w, h, props) => {
      const p = {
        question: "Which algorithm is O(n log n) worst-case?",
        optA: "A. Quick Sort",
        optB: "B. Merge Sort",
        optC: "C. Bubble Sort",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 8 }),
        pill(16, 14, 70, 20, { label: "Question 4", size: "xs", fill: SHADE }),
        text(16, 44, String(p.question), { size: 12, weight: "bold" }),
        line(16, 72, w - 16, 72),
        rect(16, 82, w - 32, 32, { r: 6 }),
        ellipse(28, 98, 12, 12),
        text(42, 92, String(p.optA), { size: 11 }),
        rect(16, 122, w - 32, 32, { r: 6, fill: SHADE }),
        ellipse(28, 138, 12, 12, { fill: INK }),
        text(42, 132, String(p.optB), { size: 11, weight: "bold" }),
        rect(16, 162, w - 32, 32, { r: 6 }),
        ellipse(28, 178, 12, 12),
        text(42, 172, String(p.optC), { size: 11 }),
      ]
    },
  },

  // 5. student.pomodoro
  {
    kind: "student.pomodoro",
    name: "Pomodoro Timer",
    category: "student",
    keywords: ["pomodoro", "timer", "focus", "clock", "study timer"],
    icon: "Timer",
    defaultWidth: 180,
    defaultHeight: 180,
    props: {
      time: { type: "text", label: "Time Left", default: "24:50" },
      session: { type: "text", label: "Session Type", default: "Deep Focus (1/4)" },
    },
    emit: (w, h, props) => {
      const p = { time: "24:50", session: "Deep Focus (1/4)", ...props }
      return [
        rect(0, 0, w, h, { r: 16 }),
        ellipse(w / 2, h / 2 - 14, 100, 100, { stroke: INK }),
        text(w / 2, h / 2 - 24, String(p.time), { size: 22, weight: "bold", align: "center" }),
        text(w / 2, h / 2 + 6, String(p.session), { size: 9, align: "center", color: "var(--sq-ink-subtle, #6b665f)" }),
        pill(w / 2 - 36, h - 36, 72, 24, { label: "Pause", size: "sm", fill: SHADE }),
      ]
    },
  },

  // 6. student.progress-ring
  {
    kind: "student.progress-ring",
    name: "Course Progress Ring",
    category: "student",
    keywords: ["progress", "completion", "percentage", "ring", "stats"],
    icon: "CircleNotch",
    defaultWidth: 160,
    defaultHeight: 160,
    props: {
      percentage: { type: "text", label: "Percentage", default: "78%" },
      label: { type: "text", label: "Metric Label", default: "Syllabus Mastered" },
    },
    emit: (w, h, props) => {
      const p = { percentage: "78%", label: "Syllabus Mastered", ...props }
      return [
        rect(0, 0, w, h, { r: 12 }),
        ellipse(w / 2, h / 2 - 16, 84, 84, { stroke: INK }),
        ellipse(w / 2, h / 2 - 16, 68, 68, { fill: SHADE }),
        text(w / 2, h / 2 - 24, String(p.percentage), { size: 18, weight: "bold", align: "center" }),
        text(w / 2, h - 24, String(p.label), { size: 10, align: "center" }),
      ]
    },
  },

  // 7. student.streak-counter
  {
    kind: "student.streak-counter",
    name: "Study Streak Badge",
    category: "student",
    keywords: ["streak", "habit", "flame", "gamification", "days"],
    icon: "Fire",
    defaultWidth: 150,
    defaultHeight: 74,
    props: {
      days: { type: "text", label: "Days", default: "12" },
      subtitle: { type: "text", label: "Subtitle", default: "Day Streak!" },
    },
    emit: (w, h, props) => {
      const p = { days: "12", subtitle: "Day Streak!", ...props }
      return [
        rect(0, 0, w, h, { r: 8, fill: SHADE }),
        icon("Fire", 14, 18, 32),
        text(56, 16, String(p.days), { size: 22, weight: "bold" }),
        text(56, 42, String(p.subtitle), { size: 10, color: "var(--sq-ink-subtle, #6b665f)" }),
      ]
    },
  },

  // 8. student.grade-pill
  {
    kind: "student.grade-pill",
    name: "Grade Badge / Pill",
    category: "student",
    keywords: ["grade", "score", "gpa", "letter", "badge"],
    icon: "Medal",
    defaultWidth: 100,
    defaultHeight: 52,
    props: {
      grade: { type: "text", label: "Grade", default: "A-" },
      percent: { type: "text", label: "Percentage", default: "91.5%" },
    },
    emit: (w, h, props) => {
      const p = { grade: "A-", percent: "91.5%", ...props }
      return [
        pill(0, 0, w, h, { r: 12 }),
        text(20, 14, String(p.grade), { size: 18, weight: "bold" }),
        text(54, 18, String(p.percent), { size: 11 }),
      ]
    },
  },

  // 9. student.study-checklist
  {
    kind: "student.study-checklist",
    name: "Study Checklist",
    category: "student",
    keywords: ["checklist", "todo", "tasks", "study plan", "review"],
    icon: "CheckSquare",
    defaultWidth: 240,
    defaultHeight: 160,
    props: {
      title: { type: "text", label: "List Title", default: "Midterm Review Plan" },
      item1: { type: "text", label: "Item 1", default: "Read Chapter 4 & 5" },
      item2: { type: "text", label: "Item 2", default: "Solve practice quiz" },
      item3: { type: "text", label: "Item 3", default: "Review flashcards" },
    },
    emit: (w, h, props) => {
      const p = {
        title: "Midterm Review Plan",
        item1: "Read Chapter 4 & 5",
        item2: "Solve practice quiz",
        item3: "Review flashcards",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 8 }),
        text(14, 14, String(p.title), { size: 13, weight: "bold" }),
        line(14, 38, w - 14, 38),
        rect(14, 50, 14, 14, { fill: INK }),
        text(36, 50, String(p.item1), { size: 11 }),
        rect(14, 82, 14, 14),
        text(36, 82, String(p.item2), { size: 11 }),
        rect(14, 114, 14, 14),
        text(36, 114, String(p.item3), { size: 11 }),
      ]
    },
  },

  // 10. student.calendar-day
  {
    kind: "student.calendar-day",
    name: "Class Calendar Widget",
    category: "student",
    keywords: ["calendar", "schedule", "class", "time", "lecture"],
    icon: "Calendar",
    defaultWidth: 220,
    defaultHeight: 150,
    props: {
      day: { type: "text", label: "Day", default: "WED, OCT 14" },
      event1: { type: "text", label: "Event 1", default: "10:00 AM • Physics Lab" },
      event2: { type: "text", label: "Event 2", default: "01:30 PM • Calculus III" },
    },
    emit: (w, h, props) => {
      const p = {
        day: "WED, OCT 14",
        event1: "10:00 AM • Physics Lab",
        event2: "01:30 PM • Calculus III",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 8 }),
        rect(0, 0, w, 32, { fill: SHADE, r: 8 }),
        text(14, 8, String(p.day), { size: 11, weight: "bold" }),
        rect(12, 44, w - 24, 40, { r: 4 }),
        line(16, 48, 16, 80, { stroke: INK }),
        text(24, 56, String(p.event1), { size: 10 }),
        rect(12, 94, w - 24, 40, { r: 4 }),
        line(16, 98, 16, 130, { stroke: INK }),
        text(24, 106, String(p.event2), { size: 10 }),
      ]
    },
  },

  // 11. student.cornell-note
  {
    kind: "student.cornell-note",
    name: "Cornell Notes Layout",
    category: "student",
    keywords: ["cornell", "notes", "cues", "summary", "lecture note"],
    icon: "Notebook",
    defaultWidth: 360,
    defaultHeight: 240,
    props: {
      topic: { type: "text", label: "Topic", default: "Photosynthesis: Light Reactions" },
      cues: { type: "text", label: "Cue Words", default: "Thylakoid\nATP Synthase\nChlorophyll" },
      summary: { type: "text", label: "Summary", default: "Light energy is converted into chemical energy (ATP/NADPH) in thylakoid membranes." },
    },
    emit: (w, h, props) => {
      const p = {
        topic: "Photosynthesis: Light Reactions",
        cues: "Thylakoid",
        summary: "Light energy is converted to chemical energy.",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 6 }),
        rect(0, 0, w, 36, { fill: SHADE }),
        text(14, 10, String(p.topic), { size: 13, weight: "bold" }),
        line(100, 36, 100, h - 50),
        text(10, 48, "CUES", { size: 9, weight: "bold", color: "var(--sq-ink-subtle, #6b665f)" }),
        text(10, 68, String(p.cues), { size: 10 }),
        text(112, 48, "LECTURE NOTES", { size: 9, weight: "bold", color: "var(--sq-ink-subtle, #6b665f)" }),
        line(112, 70, w - 20, 70, { dashed: true }),
        line(112, 94, w - 20, 94, { dashed: true }),
        line(112, 118, w - 20, 118, { dashed: true }),
        line(0, h - 50, w, h - 50),
        text(14, h - 42, "SUMMARY", { size: 9, weight: "bold", color: "var(--sq-ink-subtle, #6b665f)" }),
        text(14, h - 26, String(p.summary), { size: 10 }),
      ]
    },
  },

  // 12. student.vocab-chip
  {
    kind: "student.vocab-chip",
    name: "Vocabulary Term Chip",
    category: "student",
    keywords: ["vocab", "vocabulary", "definition", "term", "dictionary"],
    icon: "Translate",
    defaultWidth: 200,
    defaultHeight: 70,
    props: {
      term: { type: "text", label: "Term", default: "Ephemeral" },
      pos: { type: "text", label: "Part of Speech", default: "adj. / lasting briefly" },
    },
    emit: (w, h, props) => {
      const p = { term: "Ephemeral", pos: "adj. / lasting briefly", ...props }
      return [
        rect(0, 0, w, h, { r: 8, fill: SHADE }),
        text(14, 14, String(p.term), { size: 14, weight: "bold" }),
        pill(w - 46, 12, 36, 18, { label: "IPA", size: "xs" }),
        text(14, 40, String(p.pos), { size: 10, color: "var(--sq-ink-subtle, #6b665f)" }),
      ]
    },
  },

  // 13. student.formula-card
  {
    kind: "student.formula-card",
    name: "Formula / Theorem Card",
    category: "student",
    keywords: ["formula", "math", "physics", "equation", "theorem"],
    icon: "Function",
    defaultWidth: 260,
    defaultHeight: 110,
    props: {
      title: { type: "text", label: "Formula Title", default: "Quadratic Formula" },
      formula: { type: "text", label: "Equation", default: "x = (-b ± √(b² - 4ac)) / 2a" },
    },
    emit: (w, h, props) => {
      const p = {
        title: "Quadratic Formula",
        formula: "x = (-b ± √(b² - 4ac)) / 2a",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 8 }),
        text(14, 12, String(p.title), { size: 11, weight: "bold" }),
        rect(12, 34, w - 24, 52, { r: 6, fill: SHADE }),
        text(w / 2, 52, String(p.formula), { size: 12, weight: "bold", align: "center" }),
      ]
    },
  },

  // 14. student.audio-lecture-player
  {
    kind: "student.audio-lecture-player",
    name: "Lecture Audio Player",
    category: "student",
    keywords: ["audio", "lecture", "podcast", "recording", "player"],
    icon: "Headphones",
    defaultWidth: 280,
    defaultHeight: 90,
    props: {
      title: { type: "text", label: "Lecture Title", default: "Lecture 7: Microeconomics" },
      duration: { type: "text", label: "Progress", default: "18:42 / 52:10" },
    },
    emit: (w, h, props) => {
      const p = { title: "Lecture 7: Microeconomics", duration: "18:42 / 52:10", ...props }
      return [
        rect(0, 0, w, h, { r: 10 }),
        icon("Headphones", 14, 14, 20),
        text(42, 14, String(p.title), { size: 12, weight: "bold" }),
        line(14, 48, w - 14, 48, { stroke: INK }),
        line(14, 48, (w - 14) * 0.4, 48, { stroke: INK }),
        ellipse((w - 14) * 0.4, 48, 8, 8, { fill: INK }),
        icon("Play", 14, 62, 18),
        icon("FastForward", 40, 62, 18),
        text(w - 85, 64, String(p.duration), { size: 10 }),
      ]
    },
  },

  // 15. student.discussion-bubble
  {
    kind: "student.discussion-bubble",
    name: "Peer Discussion Bubble",
    category: "student",
    keywords: ["discussion", "chat", "peer", "forum", "question"],
    icon: "ChatCircleDots",
    defaultWidth: 280,
    defaultHeight: 110,
    props: {
      author: { type: "text", label: "Author", default: "Maya Lin (TA)" },
      message: { type: "text", label: "Message", default: "Remember office hours are moved to Thursday at 3 PM!" },
      time: { type: "text", label: "Time", default: "2h ago" },
    },
    emit: (w, h, props) => {
      const p = {
        author: "Maya Lin (TA)",
        message: "Office hours moved to Thursday 3 PM!",
        time: "2h ago",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 10, fill: SHADE }),
        ellipse(26, 26, 24, 24, { fill: INK }),
        text(48, 16, String(p.author), { size: 11, weight: "bold" }),
        text(w - 50, 16, String(p.time), { size: 9, color: "var(--sq-ink-subtle, #6b665f)" }),
        text(16, 50, String(p.message), { size: 11 }),
        pill(16, 78, 64, 20, { label: "Reply", size: "xs" }),
      ]
    },
  },

  // 16. student.syllabus-timeline
  {
    kind: "student.syllabus-timeline",
    name: "Syllabus Timeline / Milestone",
    category: "student",
    keywords: ["syllabus", "timeline", "milestone", "roadmap", "weeks"],
    icon: "Path",
    defaultWidth: 320,
    defaultHeight: 100,
    props: {
      week: { type: "text", label: "Current Week", default: "Week 06: Data Structures" },
      next: { type: "text", label: "Next Milestone", default: "Midterm Exam on Oct 28" },
    },
    emit: (w, h, props) => {
      const p = {
        week: "Week 06: Data Structures",
        next: "Midterm Exam on Oct 28",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 8 }),
        text(14, 12, String(p.week), { size: 12, weight: "bold" }),
        line(24, 46, w - 24, 46, { stroke: INK }),
        ellipse(50, 46, 12, 12, { fill: INK }),
        ellipse(140, 46, 12, 12, { fill: INK }),
        ellipse(230, 46, 12, 12),
        text(50, 64, "Wk 4", { size: 9, align: "center" }),
        text(140, 64, "Wk 6", { size: 9, align: "center", weight: "bold" }),
        text(230, 64, "Midterm", { size: 9, align: "center" }),
      ]
    },
  },

  // 17. student.study-group-finder
  {
    kind: "student.study-group-finder",
    name: "Study Group Finder Card",
    category: "student",
    keywords: ["group", "study group", "peers", "collaboration", "meet"],
    icon: "UsersThree",
    defaultWidth: 260,
    defaultHeight: 130,
    props: {
      groupName: { type: "text", label: "Group Name", default: "Linear Algebra Squad" },
      members: { type: "text", label: "Member Count", default: "4 / 6 spots filled" },
      location: { type: "text", label: "Meeting Location", default: "Library 3rd Floor / Zoom" },
    },
    emit: (w, h, props) => {
      const p = {
        groupName: "Linear Algebra Squad",
        members: "4 / 6 spots filled",
        location: "Library 3rd Floor / Zoom",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 8 }),
        icon("UsersThree", 14, 14, 20),
        text(40, 16, String(p.groupName), { size: 12, weight: "bold" }),
        pill(w - 74, 14, 60, 20, { label: "Active", size: "xs", fill: SHADE }),
        line(14, 44, w - 14, 44),
        text(14, 56, String(p.members), { size: 11 }),
        text(14, 76, String(p.location), { size: 10, color: "var(--sq-ink-subtle, #6b665f)" }),
        pill(14, 98, 80, 22, { label: "Join Group", size: "xs" }),
      ]
    },
  },

  // 18. student.leaderboard-row
  {
    kind: "student.leaderboard-row",
    name: "Class Leaderboard Row",
    category: "student",
    keywords: ["leaderboard", "rank", "points", "xp", "competition"],
    icon: "Trophy",
    defaultWidth: 280,
    defaultHeight: 52,
    props: {
      rank: { type: "text", label: "Rank", default: "#3" },
      student: { type: "text", label: "Student Name", default: "Alex Rivera" },
      xp: { type: "text", label: "XP / Points", default: "1,450 XP" },
    },
    emit: (w, h, props) => {
      const p = { rank: "#3", student: "Alex Rivera", xp: "1,450 XP", ...props }
      return [
        rect(0, 0, w, h, { r: 6, fill: SHADE }),
        pill(10, 12, 34, 28, { label: String(p.rank), size: "xs" }),
        text(54, 18, String(p.student), { size: 12, weight: "bold" }),
        pill(w - 75, 14, 65, 24, { label: String(p.xp), size: "xs" }),
      ]
    },
  },

  // 19. student.rubric-criterion
  {
    kind: "student.rubric-criterion",
    name: "Rubric Criterion Row",
    category: "student",
    keywords: ["rubric", "grading", "criteria", "points", "evaluation"],
    icon: "CheckSquareOffset",
    defaultWidth: 320,
    defaultHeight: 90,
    props: {
      criterion: { type: "text", label: "Criterion", default: "Code Quality & Comments" },
      maxPts: { type: "text", label: "Max Points", default: "15 / 15 pts" },
      desc: { type: "text", label: "Description", default: "Clear variable naming, modular functions, and inline comments." },
    },
    emit: (w, h, props) => {
      const p = {
        criterion: "Code Quality & Comments",
        maxPts: "15 / 15 pts",
        desc: "Clear variable naming, modular functions, inline comments.",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 6 }),
        text(14, 12, String(p.criterion), { size: 12, weight: "bold" }),
        pill(w - 85, 10, 75, 22, { label: String(p.maxPts), size: "xs", fill: SHADE }),
        line(14, 38, w - 14, 38),
        text(14, 48, String(p.desc), { size: 10, color: "var(--sq-ink-subtle, #6b665f)" }),
      ]
    },
  },

  // 20. student.ai-tutor-bubble
  {
    kind: "student.ai-tutor-bubble",
    name: "AI Study Copilot Bubble",
    category: "student",
    keywords: ["ai", "tutor", "copilot", "hint", "assistant", "explanation"],
    icon: "Sparkle",
    defaultWidth: 300,
    defaultHeight: 120,
    props: {
      hint: { type: "text", label: "Study Hint", default: "Hint: In recursion, always identify your base case first to avoid stack overflow." },
      badge: { type: "text", label: "Badge Label", default: "Study Copilot" },
    },
    emit: (w, h, props) => {
      const p = {
        hint: "Hint: Always identify your base case first to avoid stack overflow.",
        badge: "Study Copilot",
        ...props,
      }
      return [
        rect(0, 0, w, h, { r: 10, fill: SHADE }),
        icon("Sparkle", 14, 12, 18),
        pill(36, 10, 95, 20, { label: String(p.badge), size: "xs" }),
        text(14, 44, String(p.hint), { size: 11 }),
        line(14, 86, w - 14, 86, { dashed: true }),
        pill(14, 92, 100, 20, { label: "Explain Step-by-Step", size: "xs" }),
        pill(120, 92, 70, 20, { label: "Give Quiz", size: "xs" }),
      ]
    },
  },
]
