import {
  createGuardianInvitation,
  acceptGuardianInvitation,
  updateGuardianPermissions,
  revokeGuardianLink,
  suspendGuardianLink,
  getGuardianVisibleData,
  setStudentAcademicData,
  resetGuardianEngine,
  type GuardianPermissions,
  type StudentAcademicData,
} from "../lib/academic/guardian.ts"

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
  console.log("Running Guardian Mode & Privacy Engine tests...\n")

  resetGuardianEngine()

  // 1. Create Guardian Invitation
  const perms: GuardianPermissions = {
    allow_study_progress: true,
    allow_exams: false,
    allow_assignments: true,
    allow_marks: false,
  }
  const invite = createGuardianInvitation("student-101", "Parent@Family.COM ", perms)

  check("Invitation returns invitationId", typeof invite.invitationId === "string" && invite.invitationId.startsWith("inv_"))
  check("Invitation returns token", typeof invite.token === "string" && invite.token.length > 10)

  // 2. Accept Guardian Invitation
  const acceptRes = acceptGuardianInvitation(invite.token, "guardian-901")
  check("Accept invitation succeeds", acceptRes.success === true)
  check("Accept invitation returns linkId", typeof acceptRes.linkId === "string" && acceptRes.linkId.startsWith("glink_"))

  // 3. Re-accepting fails
  const reAccept = acceptGuardianInvitation(invite.token, "guardian-901")
  check("Accepting already accepted invitation fails", reAccept.success === false && reAccept.error === "Invitation already accepted")

  // 4. Accepting invalid token fails
  const invalidAccept = acceptGuardianInvitation("non-existent-token", "guardian-902")
  check("Accepting invalid token fails", invalidAccept.success === false && invalidAccept.error === "Invitation not found")

  // 5. Seed Student Data with private notes and canvas documents
  const studentData: StudentAcademicData = {
    studyProgress: {
      totalHoursStudied: 42,
      coursesCompleted: 3,
      privateNotes: "Secret personal note inside progress",
    },
    exams: [
      { id: "exam-1", title: "Math Midterm", date: "2026-10-15", score: 92, notes: "Confidential teacher comments" },
    ],
    assignments: [
      { id: "assign-1", title: "History Essay", dueDate: "2026-10-20", status: "submitted", score: 88 },
    ],
    marks: [
      { subject: "Mathematics", score: 92, maxScore: 100, grade: "A" },
    ],
    // PRIVATE NOTES & CANVAS DOCUMENTS AT TOP LEVEL
    privateStudyNotes: [
      { id: "note-1", content: "Confidential study diary" },
    ],
    notes: "Student diary notes",
    canvasDocuments: [
      { id: "canvas-1", title: "My Private Sketch Canvas" },
    ],
    documents: [
      { id: "doc-1", title: "Draft document" },
    ],
  }
  setStudentAcademicData("student-101", studentData)

  // 6. Visible data respects permissions (progress: true, exams: false, assignments: true, marks: false)
  const visibleData1 = await getGuardianVisibleData("guardian-901", "student-101")
  check("Visible data returned for active link", visibleData1 !== null)
  check("Study progress included when permitted", visibleData1?.studyProgress !== undefined)
  check("Study progress total hours correct", visibleData1?.studyProgress?.totalHoursStudied === 42)
  check("Assignments included when permitted", Array.isArray(visibleData1?.assignments) && visibleData1?.assignments.length === 1)
  check("Exams excluded when not permitted", visibleData1?.exams === undefined)
  check("Marks excluded when not permitted", visibleData1?.marks === undefined)

  // 7. STRICT ISOLATION CHECKS
  check("Private notes excluded from summary root", !("privateStudyNotes" in (visibleData1 as any)) && !("notes" in (visibleData1 as any)))
  check("Canvas documents excluded from summary root", !("canvasDocuments" in (visibleData1 as any)) && !("documents" in (visibleData1 as any)))
  check("Private notes sanitized from inside studyProgress", !("privateNotes" in (visibleData1?.studyProgress as any)))

  // 8. Update permissions to allow exams & marks, revoke assignments
  updateGuardianPermissions("student-101", "guardian-901", {
    allow_exams: true,
    allow_marks: true,
    allow_assignments: false,
  })

  const visibleData2 = await getGuardianVisibleData("guardian-901", "student-101")
  check("Exams now visible after permission update", Array.isArray(visibleData2?.exams) && visibleData2?.exams.length === 1)
  check("Marks now visible after permission update", Array.isArray(visibleData2?.marks) && visibleData2?.marks.length === 1)
  check("Assignments now hidden after permission update", visibleData2?.assignments === undefined)
  check("Confidential notes sanitized inside exams", !("notes" in (visibleData2?.exams?.[0] as any)))

  // 9. Suspension behavior
  suspendGuardianLink("student-101", "guardian-901")
  const visibleDataSuspended = await getGuardianVisibleData("guardian-901", "student-101")
  check("Visible data is null when link is suspended", visibleDataSuspended === null)

  // 10. Reactivation through update or re-invitation
  const invite2 = createGuardianInvitation("student-101", "parent@family.com", {
    allow_study_progress: true,
    allow_exams: true,
    allow_assignments: true,
    allow_marks: true,
  })
  const acceptRes2 = acceptGuardianInvitation(invite2.token, "guardian-901")
  check("Re-invitation reactivates link", acceptRes2.success === true)

  const visibleDataReactivated = await getGuardianVisibleData("guardian-901", "student-101")
  check("Visible data accessible after reactivation", visibleDataReactivated !== null)

  // 11. Revocation behavior
  revokeGuardianLink("student-101", "guardian-901")
  const visibleDataRevoked = await getGuardianVisibleData("guardian-901", "student-101")
  check("Visible data is null after link is revoked", visibleDataRevoked === null)

  // 12. Non-existent pairing
  const visibleDataUnknown = await getGuardianVisibleData("guardian-unknown", "student-101")
  check("Visible data is null for unknown guardian", visibleDataUnknown === null)

  console.log(`\nGuardian Mode Tests: ${passed} passed, ${failures.length} failed.`)
  if (failures.length > 0) {
    console.error("Failures:", failures)
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test error:", err)
  process.exit(1)
})
