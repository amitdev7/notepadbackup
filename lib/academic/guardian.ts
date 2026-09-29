export type GuardianLinkStatus = "active" | "revoked" | "suspended"

export interface GuardianPermissions {
  allow_study_progress: boolean
  allow_exams: boolean
  allow_assignments: boolean
  allow_marks: boolean
}

export interface GuardianInvitation {
  invitationId: string
  studentId: string
  guardianEmail: string
  permissions: GuardianPermissions
  token: string
  createdAt: number
  expiresAt: number
  acceptedAt?: number | null
}

export interface GuardianLink {
  linkId: string
  studentId: string
  guardianId: string
  guardianEmail: string
  status: GuardianLinkStatus
  permissions: GuardianPermissions
  createdAt: number
  updatedAt: number
}

export interface StudyProgress {
  totalHoursStudied?: number
  coursesCompleted?: number
  currentStreakDays?: number
  attendanceRate?: number
  completionRate?: number
  lastActiveDate?: string
  [key: string]: unknown
}

export interface ExamRecord {
  id: string
  title: string
  subject?: string
  date: string
  score?: number | null
  maxScore?: number
  status?: string
  grade?: string | null
  [key: string]: unknown
}

export interface AssignmentRecord {
  id: string
  title: string
  subject?: string
  dueDate: string
  status: string
  score?: number | null
  maxPoints?: number
  submittedAt?: string | null
  [key: string]: unknown
}

export interface MarkRecord {
  id?: string
  subject: string
  courseName?: string
  score: number
  maxScore: number
  percentage?: number
  grade?: string
  term?: string
  [key: string]: unknown
}

export interface StudentAcademicData {
  studyProgress?: StudyProgress
  exams?: ExamRecord[]
  assignments?: AssignmentRecord[]
  marks?: MarkRecord[]
  notes?: unknown
  privateNotes?: unknown
  studyNotes?: unknown
  privateStudyNotes?: unknown
  canvasDocuments?: unknown
  documents?: unknown
  [key: string]: unknown
}

export interface GuardianStudentSummary {
  studentId: string
  studyProgress?: StudyProgress
  exams?: ExamRecord[]
  assignments?: AssignmentRecord[]
  marks?: MarkRecord[]
}

const invitationsByToken = new Map<string, GuardianInvitation>()
const invitationsById = new Map<string, GuardianInvitation>()
const linksById = new Map<string, GuardianLink>()
const linksByStudentAndGuardian = new Map<string, GuardianLink>()
const studentDataStore = new Map<string, StudentAcademicData>()

function makeLinkKey(studentId: string, guardianId: string): string {
  return `${studentId}:::${guardianId}`
}

function findGuardianLink(studentId: string, guardianId: string): GuardianLink | null {
  return linksByStudentAndGuardian.get(makeLinkKey(studentId, guardianId)) || null
}

function generateSecureId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function generateSecureToken(): string {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.getRandomValues === "function") {
      const buf = new Uint8Array(32)
      crypto.getRandomValues(buf)
      return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("")
    }
    if (typeof crypto.randomUUID === "function") {
      return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`
    }
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`
}

const BLOCKED_KEY_PATTERNS = [
  "note",
  "canvas",
  "document",
  "sketch",
  "drawing",
  "squig",
  "look",
  "node",
]

function isBlockedProperty(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, "")
  return BLOCKED_KEY_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function sanitizeForGuardian<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== "object") {
    return data
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForGuardian(item)) as unknown as T
  }
  const clean: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (!isBlockedProperty(key)) {
      clean[key] = sanitizeForGuardian(val)
    }
  }
  return clean as T
}

export function createGuardianInvitation(
  studentId: string,
  guardianEmail: string,
  permissions: GuardianPermissions
): { invitationId: string; token: string } {
  const invitationId = generateSecureId("inv")
  const token = generateSecureToken()
  const normalizedEmail = (guardianEmail || "").trim().toLowerCase()

  const invitation: GuardianInvitation = {
    invitationId,
    studentId,
    guardianEmail: normalizedEmail,
    permissions: {
      allow_study_progress: Boolean(permissions?.allow_study_progress),
      allow_exams: Boolean(permissions?.allow_exams),
      allow_assignments: Boolean(permissions?.allow_assignments),
      allow_marks: Boolean(permissions?.allow_marks),
    },
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    acceptedAt: null,
  }

  invitationsByToken.set(token, invitation)
  invitationsById.set(invitationId, invitation)

  return { invitationId, token }
}

export function acceptGuardianInvitation(
  token: string,
  guardianId: string
): { success: boolean; linkId?: string; error?: string } {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Invalid invitation token" }
  }
  if (!guardianId || typeof guardianId !== "string") {
    return { success: false, error: "Invalid guardian identifier" }
  }

  const invitation = invitationsByToken.get(token)
  if (!invitation) {
    return { success: false, error: "Invitation not found" }
  }

  if (invitation.acceptedAt) {
    return { success: false, error: "Invitation already accepted" }
  }

  if (Date.now() > invitation.expiresAt) {
    return { success: false, error: "Invitation expired" }
  }

  invitation.acceptedAt = Date.now()

  const existingLink = findGuardianLink(invitation.studentId, guardianId)
  if (existingLink) {
    existingLink.status = "active"
    existingLink.permissions = { ...invitation.permissions }
    existingLink.updatedAt = Date.now()
    return { success: true, linkId: existingLink.linkId }
  }

  const linkId = generateSecureId("glink")
  const link: GuardianLink = {
    linkId,
    studentId: invitation.studentId,
    guardianId,
    guardianEmail: invitation.guardianEmail,
    status: "active",
    permissions: { ...invitation.permissions },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  linksById.set(linkId, link)
  linksByStudentAndGuardian.set(makeLinkKey(invitation.studentId, guardianId), link)

  return { success: true, linkId }
}

export function updateGuardianPermissions(
  studentId: string,
  guardianId: string,
  permissions: Partial<GuardianPermissions>
): void {
  const link = findGuardianLink(studentId, guardianId)
  if (!link) {
    return
  }

  link.permissions = {
    allow_study_progress:
      permissions.allow_study_progress !== undefined
        ? Boolean(permissions.allow_study_progress)
        : link.permissions.allow_study_progress,
    allow_exams:
      permissions.allow_exams !== undefined
        ? Boolean(permissions.allow_exams)
        : link.permissions.allow_exams,
    allow_assignments:
      permissions.allow_assignments !== undefined
        ? Boolean(permissions.allow_assignments)
        : link.permissions.allow_assignments,
    allow_marks:
      permissions.allow_marks !== undefined
        ? Boolean(permissions.allow_marks)
        : link.permissions.allow_marks,
  }
  link.updatedAt = Date.now()
}

export function revokeGuardianLink(studentId: string, guardianId: string): void {
  const link = findGuardianLink(studentId, guardianId)
  if (!link) {
    return
  }
  link.status = "revoked"
  link.updatedAt = Date.now()
}

export function suspendGuardianLink(studentId: string, guardianId: string): void {
  const link = findGuardianLink(studentId, guardianId)
  if (!link) {
    return
  }
  link.status = "suspended"
  link.updatedAt = Date.now()
}

export function setGuardianLinkStatus(
  studentId: string,
  guardianId: string,
  status: GuardianLinkStatus
): void {
  const link = findGuardianLink(studentId, guardianId)
  if (!link) {
    return
  }
  link.status = status
  link.updatedAt = Date.now()
}

export async function getGuardianVisibleData(
  guardianId: string,
  studentId: string
): Promise<GuardianStudentSummary | null> {
  const link = findGuardianLink(studentId, guardianId)
  if (!link || link.status !== "active") {
    return null
  }

  const studentData = studentDataStore.get(studentId)
  const summary: GuardianStudentSummary = {
    studentId,
  }

  if (link.permissions.allow_study_progress) {
    const rawProgress = studentData?.studyProgress
    summary.studyProgress = rawProgress ? sanitizeForGuardian(rawProgress) : {}
  }

  if (link.permissions.allow_exams) {
    const rawExams = studentData?.exams
    summary.exams = rawExams ? sanitizeForGuardian(rawExams) : []
  }

  if (link.permissions.allow_assignments) {
    const rawAssignments = studentData?.assignments
    summary.assignments = rawAssignments ? sanitizeForGuardian(rawAssignments) : []
  }

  if (link.permissions.allow_marks) {
    const rawMarks = studentData?.marks
    summary.marks = rawMarks ? sanitizeForGuardian(rawMarks) : []
  }

  return summary
}

export function getGuardianLink(studentId: string, guardianId: string): GuardianLink | null {
  const link = findGuardianLink(studentId, guardianId)
  if (!link) {
    return null
  }
  return {
    ...link,
    permissions: { ...link.permissions },
  }
}

export function getGuardianInvitation(token: string): GuardianInvitation | null {
  const inv = invitationsByToken.get(token)
  if (!inv) {
    return null
  }
  return {
    ...inv,
    permissions: { ...inv.permissions },
  }
}

export function listGuardianLinksForStudent(studentId: string): GuardianLink[] {
  const list: GuardianLink[] = []
  for (const link of linksById.values()) {
    if (link.studentId === studentId) {
      list.push({ ...link, permissions: { ...link.permissions } })
    }
  }
  return list
}

export function listGuardianLinksForGuardian(guardianId: string): GuardianLink[] {
  const list: GuardianLink[] = []
  for (const link of linksById.values()) {
    if (link.guardianId === guardianId) {
      list.push({ ...link, permissions: { ...link.permissions } })
    }
  }
  return list
}

export function setStudentAcademicData(studentId: string, data: StudentAcademicData): void {
  studentDataStore.set(studentId, data)
}

export function getStudentAcademicData(studentId: string): StudentAcademicData | null {
  return studentDataStore.get(studentId) || null
}

export function clearStudentAcademicData(studentId: string): void {
  studentDataStore.delete(studentId)
}

export function resetGuardianEngine(): void {
  invitationsByToken.clear()
  invitationsById.clear()
  linksById.clear()
  linksByStudentAndGuardian.clear()
  studentDataStore.clear()
}
