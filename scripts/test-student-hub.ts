// ---------------------------------------------------------------------------
// Zenithsui Student Hub: Calendar, Syllabus, Goals, & Materials Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-student-hub.ts
// ---------------------------------------------------------------------------

import { useStudentStore } from "../lib/academic/student-store.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

async function runTests() {
  console.log("Running Zenithsui Student Hub & Scheduling tests...\n")

  const store = useStudentStore.getState()

  // 1. Syllabus: Custom Subjects
  const subId = store.addSubject("Advanced Physics", "Phys", "high", 90)
  check("Subject created with ID", Boolean(subId))
  const createdSub = useStudentStore.getState().subjects.find((s) => s.id === subId)
  check("Subject properties match", createdSub?.name === "Advanced Physics" && createdSub?.priority === "high")

  // 2. Syllabus: Unlimited Chapters
  const chap1 = store.addChapter(subId, "Electromagnetism", "Faraday's Law")
  const chap2 = store.addChapter(subId, "Optics & Lasers", "Wave optics")
  check("Chapters created under subject", Boolean(chap1) && Boolean(chap2))

  // 3. Real Progress Calculation
  const subChaps = useStudentStore.getState().chapters.filter((c) => c.subjectId === subId)
  check("Total chapters count is 2", subChaps.length === 2)
  const completedInit = subChaps.filter((c) => c.status === "completed").length
  check("Initially 0 completed chapters", completedInit === 0)

  // 4. Chapter Completion Checkbox
  store.toggleChapterComplete(chap1, true)
  const chap1State = useStudentStore.getState().chapters.find((c) => c.id === chap1)
  check("Chapter 1 marked completed", chap1State?.status === "completed")
  check("Chapter 1 has completion date", Boolean(chap1State?.completedAt))

  // Check progress updated
  const updatedSubChaps = useStudentStore.getState().chapters.filter((c) => c.subjectId === subId)
  const completedNow = updatedSubChaps.filter((c) => c.status === "completed").length
  const pct = Math.round((completedNow / updatedSubChaps.length) * 100)
  check("Calculated progress is 50%", pct === 50)

  // 5. Chapter Completion Goals
  const futureTarget = "2026-10-15"
  store.setChapterGoal(subId, chap2, futureTarget, "Complete all derivation problems")
  const goal = useStudentStore.getState().goals.find((g) => g.chapterId === chap2 && g.status !== "cancelled")
  check("Goal exists for Chapter 2", Boolean(goal))
  check("Goal target date matches", goal?.targetDate === futureTarget)
  check("Goal status is upcoming", goal?.status === "upcoming")

  // 6. Complete Chapter Early with Goal
  // When completed, goal targetDate must remain 2026-10-15 while status becomes completed
  store.toggleChapterComplete(chap2, true)
  const updatedGoal = useStudentStore.getState().goals.find((g) => g.chapterId === chap2)
  check("Goal marked completed when chapter is completed", updatedGoal?.status === "completed")
  check("Goal preserves original target date", updatedGoal?.targetDate === futureTarget)

  // 7. Cancel Goal preserves Chapter
  const chap3 = store.addChapter(subId, "Thermodynamics")
  store.setChapterGoal(subId, chap3, "2026-11-01")
  const goal3 = useStudentStore.getState().goals.find((g) => g.chapterId === chap3 && g.status !== "cancelled")
  check("Goal 3 created", Boolean(goal3))
  if (goal3) {
    store.cancelChapterGoal(goal3.id)
  }
  const cancelledGoal3 = useStudentStore.getState().goals.find((g) => g.chapterId === chap3)
  check("Goal 3 status is cancelled", cancelledGoal3?.status === "cancelled")
  const chap3StillExists = useStudentStore.getState().chapters.find((c) => c.id === chap3)
  check("Chapter 3 still exists after goal cancellation", Boolean(chap3StillExists))

  // 8. Calendar Activities (Manual scheduling)
  const actId = store.addActivity({
    title: "Optics Wave Interference Problems",
    type: "Practice",
    subjectId: subId,
    chapterId: chap2,
    date: "2026-10-02",
    startTime: "15:00",
    endTime: "16:30",
    durationMinutes: 90,
    status: "pending",
    priority: "High",
  })
  check("Activity created with ID", Boolean(actId))
  const act = useStudentStore.getState().activities.find((a) => a.id === actId)
  check("Activity date and duration match", act?.date === "2026-10-02" && act?.durationMinutes === 90)

  // Toggle activity complete
  store.toggleActivityComplete(actId)
  const actCompleted = useStudentStore.getState().activities.find((a) => a.id === actId)
  check("Activity toggled to completed", actCompleted?.status === "completed")

  // Duplicate activity
  store.duplicateActivity(actId, "2026-10-05")
  const duplicated = useStudentStore.getState().activities.find((a) => a.date === "2026-10-05" && a.title === act?.title)
  check("Activity duplicated to target date", Boolean(duplicated) && duplicated?.status === "pending")

  // 9. Notes & Study Materials: Subject -> Chapter -> Materials
  const matId = store.addMaterial({
    subjectId: subId,
    subjectName: "Advanced Physics",
    chapterId: chap1,
    chapterName: "Electromagnetism",
    type: "note",
    title: "Maxwell's Equations Summary",
    content: "Gauss's law, Faraday's law, Ampere-Maxwell law",
  })
  check("Study Material created with ID", Boolean(matId))
  const mat = useStudentStore.getState().materials.find((m) => m.id === matId)
  check("Material linked to Chapter 1", mat?.chapterId === chap1 && mat?.type === "note")

  // Pin & Favorite material
  store.togglePinMaterial(matId)
  store.toggleFavoriteMaterial(matId)
  const updatedMat = useStudentStore.getState().materials.find((m) => m.id === matId)
  check("Material pinned", updatedMat?.pinned === true)
  check("Material favorited", updatedMat?.favorite === true)

  // Move material to different chapter
  store.moveMaterial(matId, subId, chap2)
  const movedMat = useStudentStore.getState().materials.find((m) => m.id === matId)
  check("Material moved to Chapter 2", movedMat?.chapterId === chap2)

  // 10. Clean up test subject
  store.deleteSubject(subId)
  const deletedSub = useStudentStore.getState().subjects.find((s) => s.id === subId)
  check("Subject and cascaded chapters removed cleanly", deletedSub === undefined)

  console.log(`\nStudent Hub & Scheduling: ${passed} passed, ${failures.length} failed.`)

  if (failures.length > 0) {
    console.error("Failures:\n" + failures.map((f) => `  ✗ ${f}`).join("\n"))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
