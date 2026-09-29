import fs from "node:fs"
import {
  isValidStatusTransition,
  transitionStatus,
  isValidConfidenceRating,
  setConfidenceRating,
  computeSubjectProgress,
  parseSyllabusCsv,
  parseSyllabusJson,
  parseSyllabusIndentedOutline,
  linkChapterToCanvas,
  getChapterCanvasLinks,
  unlinkChapterFromCanvas,
  clearChapterCanvasLinks,
  getCanvasDocumentChapters,
  type CurriculumStatus,
  type Unit,
  type Chapter,
  type Topic
} from "../lib/academic/syllabus.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` - ${detail}` : ""}`)
  }
}

async function run() {
  console.log("Running Academic Syllabus Service tests...\n")

  // Check 1: Zero comments in lib/academic/syllabus.ts
  const fileContent = fs.readFileSync("lib/academic/syllabus.ts", "utf8")
  const lines = fileContent.split(/\r?\n/)
  let commentFound = false
  for (let idx = 0; idx < lines.length; idx++) {
    const trimmed = lines[idx].trim()
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      commentFound = true
      failures.push(`Comment found at line ${idx + 1}: ${trimmed}`)
    }
  }
  check("Zero comments in lib/academic/syllabus.ts", !commentFound)

  // Check 2: Status State Machine Transitions
  // Valid transitions: not_started -> learning -> practicing -> revising -> completed -> mastered
  check("not_started -> learning is valid", isValidStatusTransition("not_started", "learning"))
  check("learning -> practicing is valid", isValidStatusTransition("learning", "practicing"))
  check("practicing -> revising is valid", isValidStatusTransition("practicing", "revising"))
  check("revising -> completed is valid", isValidStatusTransition("revising", "completed"))
  check("completed -> mastered is valid", isValidStatusTransition("completed", "mastered"))

  // Rollback allowed: any state -> revising or practicing
  const allStatuses: CurriculumStatus[] = [
    "not_started",
    "learning",
    "practicing",
    "revising",
    "completed",
    "mastered"
  ]

  for (const s of allStatuses) {
    check(`${s} -> revising rollback is valid`, isValidStatusTransition(s, "revising"))
    check(`${s} -> practicing rollback is valid`, isValidStatusTransition(s, "practicing"))
  }

  // Disallowed transitions
  check("not_started -> completed is invalid", !isValidStatusTransition("not_started", "completed"))
  check("learning -> mastered is invalid", !isValidStatusTransition("learning", "mastered"))
  check("completed -> learning is invalid", !isValidStatusTransition("completed", "learning"))
  check("mastered -> learning is invalid", !isValidStatusTransition("mastered", "learning"))

  // transitionStatus execution & error throwing
  check("transitionStatus valid", transitionStatus("not_started", "learning") === "learning")
  let threw = false
  try {
    transitionStatus("not_started", "completed")
  } catch {
    threw = true
  }
  check("transitionStatus invalid throws error", threw)

  // Check 3: Confidence Rating (1 to 5 stars)
  check("1 is valid confidence", isValidConfidenceRating(1))
  check("3 is valid confidence", isValidConfidenceRating(3))
  check("5 is valid confidence", isValidConfidenceRating(5))
  check("0 is invalid confidence", !isValidConfidenceRating(0))
  check("6 is invalid confidence", !isValidConfidenceRating(6))
  check("2.5 is invalid confidence", !isValidConfidenceRating(2.5))
  check("setConfidenceRating updates validly", setConfidenceRating(1, 4) === 4)

  // Check 4: Progress rollup calculations
  const units: Unit[] = [
    { id: "u-1", subjectId: "sub-math", name: "Algebra" },
    { id: "u-2", subjectId: "sub-math", name: "Geometry" }
  ]
  const chapters: Chapter[] = [
    { id: "c-1", unitId: "u-1", subjectId: "sub-math", name: "Linear Equations", status: "completed", confidence: 4 },
    { id: "c-2", unitId: "u-1", subjectId: "sub-math", name: "Quadratic Equations", status: "mastered", confidence: 5 },
    { id: "c-3", unitId: "u-2", subjectId: "sub-math", name: "Triangles", status: "learning", confidence: 3 },
    { id: "c-4", unitId: "u-2", subjectId: "sub-math", name: "Circles", status: "not_started" }
  ]
  const topics: Topic[] = [
    { id: "t-1", chapterId: "c-1", name: "One-step", confidence: 4 },
    { id: "t-2", chapterId: "c-2", name: "Factoring", confidence: 5 }
  ]

  const progress = computeSubjectProgress("sub-math", units, chapters, topics)
  check("computeSubjectProgress totalChapters is 4", progress.totalChapters === 4)
  check("computeSubjectProgress completedChapters is 1", progress.completedChapters === 1)
  check("computeSubjectProgress masteredChapters is 1", progress.masteredChapters === 1)
  check("computeSubjectProgress percentComplete is 50", progress.percentComplete === 50)
  check("computeSubjectProgress averageConfidence calculates correctly", progress.averageConfidence === 4)

  // Check 5: Deterministic CSV Syllabus Parser
  const csvData = `Subject,Unit,Chapter,Topic,Subtopic,EstimatedMinutes
Mathematics,Algebra,Linear Equations,Solving Equations,One-step,45
Mathematics,Algebra,Linear Equations,Solving Equations,Two-step,50
Mathematics,Algebra,Quadratic Equations,Factoring,,60
Physics,Mechanics,Kinematics,Velocity,Instantaneous,30`

  const csvTree = parseSyllabusCsv(csvData)
  check("CSV parsed 2 subjects", csvTree.subjects.length === 2)
  check("CSV subject 1 is Mathematics", csvTree.subjects[0].name === "Mathematics")
  check("CSV Mathematics has 1 unit", csvTree.subjects[0].units.length === 1)
  check("CSV Algebra has 2 chapters", csvTree.subjects[0].units[0].chapters.length === 2)
  check("CSV Linear Equations has 1 topic", csvTree.subjects[0].units[0].chapters[0].topics.length === 1)
  check("CSV Solving Equations has 2 subtopics", csvTree.subjects[0].units[0].chapters[0].topics[0].subtopics.length === 2)
  check("CSV Physics parsed correctly", csvTree.subjects[1].name === "Physics")

  // Check 6: Deterministic JSON Syllabus Parser
  const jsonTree = parseSyllabusJson(JSON.stringify({
    academicYear: "2025-2026",
    subjects: [
      {
        name: "Chemistry",
        units: [
          {
            name: "Organic",
            chapters: [
              {
                name: "Hydrocarbons",
                topics: [
                  {
                    name: "Alkanes",
                    subtopics: [{ name: "Methane" }]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }))
  check("JSON parsed academicYear", jsonTree.academicYear === "2025-2026")
  check("JSON parsed 1 subject", jsonTree.subjects.length === 1)
  check("JSON parsed Chemistry", jsonTree.subjects[0].name === "Chemistry")
  check("JSON parsed Hydrocarbons chapter", jsonTree.subjects[0].units[0].chapters[0].name === "Hydrocarbons")
  check("JSON chapter status defaults to not_started", jsonTree.subjects[0].units[0].chapters[0].status === "not_started")

  // Check 7: Deterministic Indented Outline Parser
  const outlineData = `Mathematics
  Unit 1
    Chapter 1
      Topic 1.1 (45 mins)
        Subtopic 1.1.1
      Topic 1.2
    Chapter 2
  Unit 2
Physics
  Mechanics
    Forces`

  const outlineTree = parseSyllabusIndentedOutline(outlineData)
  check("Outline parsed 2 subjects", outlineTree.subjects.length === 2)
  check("Outline Subject 1 is Mathematics", outlineTree.subjects[0].name === "Mathematics")
  check("Outline Mathematics has 2 units", outlineTree.subjects[0].units.length === 2)
  check("Outline Unit 1 has 2 chapters", outlineTree.subjects[0].units[0].chapters.length === 2)
  check("Outline Chapter 1 has 2 topics", outlineTree.subjects[0].units[0].chapters[0].topics.length === 2)
  check("Outline Topic 1.1 has 1 subtopic", outlineTree.subjects[0].units[0].chapters[0].topics[0].subtopics.length === 1)
  check("Outline estimatedMinutes parsed for Topic 1.1", outlineTree.subjects[0].units[0].chapters[0].topics[0].estimatedMinutes === 45)

  // Check 8: Chapter to Canvas Document Linker (Sidecar)
  clearChapterCanvasLinks()
  const link1 = linkChapterToCanvas("chap-101", "doc-202", "Mindmap of Linear Equations")
  check("Link created with correct chapterId", link1.chapterId === "chap-101")
  check("Link created with correct documentId", link1.documentId === "doc-202")
  check("Link created with title", link1.title === "Mindmap of Linear Equations")

  const link2 = linkChapterToCanvas("chap-101", "doc-303", "Formula Cheat Sheet")
  const chapLinks = getChapterCanvasLinks("chap-101")
  check("getChapterCanvasLinks returns 2 links", chapLinks.length === 2)

  const docChapters = getCanvasDocumentChapters("doc-202")
  check("getCanvasDocumentChapters returns 1 link", docChapters.length === 1 && docChapters[0].chapterId === "chap-101")

  const unlinked = unlinkChapterFromCanvas("chap-101", "doc-202")
  check("unlinkChapterFromCanvas succeeds", unlinked)
  check("getChapterCanvasLinks after unlink returns 1 link", getChapterCanvasLinks("chap-101").length === 1)

  console.log(`\nResults: ${passed} passed, ${failures.length} failed.`)
  if (failures.length > 0) {
    console.error("Failures:\n" + failures.map(f => `  - ${f}`).join("\n"))
    process.exit(1)
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
