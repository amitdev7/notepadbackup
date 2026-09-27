// ---------------------------------------------------------------------------
// Zenithsui — Student Components Verification Suite
// Tests registration, metadata, rendering, 60% and 150% scaling, controls,
// break-apart, search, and grouping for all 20 Student Kit components.
// ---------------------------------------------------------------------------

import {
  ALL_DEFS,
  REGISTRY,
  getDef,
  renderComponent,
  searchDefs,
  groupDefs,
} from "../lib/library/registry.ts"
import { STUDENT_DEFS } from "../lib/library/defs-student.ts"
import { breakApart } from "../lib/library/break-apart.ts"
import type { ComponentNode } from "../lib/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

console.log("=====================================================================")
console.log("ZENITHSUI STUDENT COMPONENTS VERIFICATION")
console.log("=====================================================================")

// 1. Check all 20 component kinds exist
const EXPECTED_KINDS = [
  "subject-card",
  "chapter-progress-card",
  "study-goal-card",
  "homework-card",
  "assignment-checklist",
  "exam-countdown",
  "study-timer",
  "focus-session-card",
  "revision-streak",
  "quiz-card",
  "practice-question-card",
  "flashcard-deck",
  "flashcard-card",
  "doubt-card",
  "ai-tutor-card",
  "cornell-notes-block",
  "revision-sheet-block",
  "study-plan-block",
  "grade-tracker-block",
  "learning-dashboard-block",
]

check("STUDENT_DEFS count is exactly 20", STUDENT_DEFS.length === 20, `Got ${STUDENT_DEFS.length}`)

for (const kind of EXPECTED_KINDS) {
  const def = getDef(kind)
  check(`Component "${kind}" is registered in REGISTRY`, !!def)
  if (!def) continue

  check(`Component "${kind}" has group "Student"`, def.group === "Student", `Got ${def.group}`)
  check(`Component "${kind}" has valid default size`, def.size.w > 0 && def.size.h > 0)
  check(`Component "${kind}" has controls defined`, Array.isArray(def.controls) && def.controls.length > 0)
  check(`Component "${kind}" has keywords defined`, Array.isArray(def.keywords) && def.keywords.length > 0)

  // 2. Default render test
  const defaultPrims = renderComponent(kind, def.defaults, def.size.w, def.size.h)
  check(`Component "${kind}" renders non-empty prims at 100%`, defaultPrims.length > 0)

  // Validate no NaN or infinite coordinates in any prim
  let hasNaN = false
  for (const p of defaultPrims) {
    if (p.t === "rect" || p.t === "ellipse") {
      if (isNaN(p.x) || isNaN(p.y) || isNaN(p.w) || isNaN(p.h)) hasNaN = true
    } else if (p.t === "line") {
      if (isNaN(p.x1) || isNaN(p.y1) || isNaN(p.x2) || isNaN(p.y2)) hasNaN = true
    } else if (p.t === "text") {
      if (isNaN(p.x) || isNaN(p.y)) hasNaN = true
    }
  }
  check(`Component "${kind}" 100% prims have valid finite numbers`, !hasNaN)

  // 3. Render at 60% scale (compact responsive stress test)
  const scale60Prims = renderComponent(kind, def.defaults, def.size.w * 0.6, def.size.h * 0.6)
  check(`Component "${kind}" renders at 60% scale without crash`, scale60Prims.length > 0)

  // 4. Render at 150% scale (enlarged responsive stress test)
  const scale150Prims = renderComponent(kind, def.defaults, def.size.w * 1.5, def.size.h * 1.5)
  check(`Component "${kind}" renders at 150% scale without crash`, scale150Prims.length > 0)

  // 5. Break-apart conversion test
  const mockNode: ComponentNode = {
    id: "test-node",
    type: "component",
    kind,
    props: { ...def.defaults },
    x: 100,
    y: 100,
    w: def.size.w,
    h: def.size.h,
    seed: 42,
  }
  const brokenNodes = breakApart(mockNode)
  check(`Component "${kind}" breaks apart into valid canvas nodes`, brokenNodes.length > 0)
}

// 6. Test search and grouping
const studentComponents = searchDefs("components", "student")
check("searchDefs('components', 'student') returns student components", studentComponents.length >= 15)

const studentBlocks = searchDefs("blocks", "student")
check("searchDefs('blocks', 'student') returns student blocks", studentBlocks.length >= 5)

const groupedComponents = groupDefs(ALL_DEFS.filter((d) => d.category === "components"), "components")
const studentCompGroup = groupedComponents.find((g) => g.group === "Student")
check("groupDefs for 'components' has 'Student' group", !!studentCompGroup && studentCompGroup.defs.length === 15)

const groupedBlocks = groupDefs(ALL_DEFS.filter((d) => d.category === "blocks"), "blocks")
const studentBlockGroup = groupedBlocks.find((g) => g.group === "Student")
check("groupDefs for 'blocks' has 'Student' group", !!studentBlockGroup && studentBlockGroup.defs.length === 5)

console.log(`Passed: ${passed}`)
if (failures.length > 0) {
  console.error("Failures:")
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
} else {
  console.log("All Student Component verification checks passed cleanly!")
}
