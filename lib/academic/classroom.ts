export type ClassroomRole = "teacher" | "co_teacher" | "student" | "observer"

export interface Classroom {
  id: string
  name: string
  section: string
  academic_year: string
  academicYear?: string
  subject: string
  room_number: string
  roomNumber?: string
  owner_id: string
  ownerId?: string
  join_code: string
  joinCode?: string
  created_at: string
  createdAt?: string
  updated_at: string
  updatedAt?: string
}

export interface ClassroomMember {
  classroom_id: string
  classroomId: string
  user_id: string
  userId: string
  role: ClassroomRole
  joined_at: string
  joinedAt: string
}

export interface CreateClassroomInput {
  id?: string
  name: string
  section?: string
  academic_year?: string
  academicYear?: string
  subject?: string
  room_number?: string
  roomNumber?: string
  owner_id?: string
  ownerId?: string
  join_code?: string
  joinCode?: string
}

export interface UpdateClassroomInput {
  name?: string
  section?: string
  academic_year?: string
  academicYear?: string
  subject?: string
  room_number?: string
  roomNumber?: string
  owner_id?: string
  ownerId?: string
  join_code?: string
  joinCode?: string
}

export interface RedeemJoinCodeResult {
  success: boolean
  classroomId?: string
  error?: string
}

export const CROCKFORD_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
export const CROCKFORD_ALPHABET = CROCKFORD_BASE32_ALPHABET

const classrooms = new Map<string, Classroom>()
const rosters = new Map<string, Map<string, ClassroomMember>>()

export function generateClassroomJoinCode(length: number = 6): string {
  const codeLength = length > 0 ? length : 6
  const alphabetLength = CROCKFORD_BASE32_ALPHABET.length
  let result = ""

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const randomBytes = new Uint8Array(codeLength)
    crypto.getRandomValues(randomBytes)
    for (let i = 0; i < codeLength; i++) {
      result += CROCKFORD_BASE32_ALPHABET[randomBytes[i] % alphabetLength]
    }
  } else {
    for (let i = 0; i < codeLength; i++) {
      const idx = Math.floor(Math.random() * alphabetLength)
      result += CROCKFORD_BASE32_ALPHABET[idx]
    }
  }

  return result
}

export function normalizeJoinCode(code: string): string {
  if (!code || typeof code !== "string") return ""
  return code
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
}

export function isJoinCodeTaken(code: string): boolean {
  const normalized = normalizeJoinCode(code)
  const upper = code.trim().toUpperCase().replace(/[\s-]/g, "")
  for (const c of classrooms.values()) {
    if (c.join_code.toUpperCase().replace(/[\s-]/g, "") === upper) return true
    if (normalizeJoinCode(c.join_code) === normalized) return true
  }
  return false
}

export function createClassroom(input: CreateClassroomInput): Classroom
export function createClassroom(
  name: string,
  section?: string,
  academic_year?: string,
  subject?: string,
  room_number?: string,
  owner_id?: string
): Classroom
export function createClassroom(
  nameOrInput: string | CreateClassroomInput,
  sectionArg?: string,
  academicYearArg?: string,
  subjectArg?: string,
  roomNumberArg?: string,
  ownerIdArg?: string
): Classroom {
  const input: CreateClassroomInput =
    typeof nameOrInput === "string"
      ? {
          name: nameOrInput,
          section: sectionArg,
          academic_year: academicYearArg,
          subject: subjectArg,
          room_number: roomNumberArg,
          owner_id: ownerIdArg ?? "",
        }
      : nameOrInput

  const id =
    input.id ??
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `cls_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)
  const now = new Date().toISOString()
  const name = input.name
  const section = input.section ?? ""
  const academic_year = input.academic_year ?? input.academicYear ?? ""
  const subject = input.subject ?? ""
  const room_number = input.room_number ?? input.roomNumber ?? ""
  const owner_id = input.owner_id ?? input.ownerId ?? ""

  let join_code = input.join_code ?? input.joinCode
  if (!join_code) {
    let attempts = 0
    do {
      join_code = generateClassroomJoinCode(6)
      attempts++
    } while (isJoinCodeTaken(join_code) && attempts < 100)
  } else {
    join_code = join_code.trim().toUpperCase()
  }

  const classroom: Classroom = {
    id,
    name,
    section,
    academic_year,
    academicYear: academic_year,
    subject,
    room_number,
    roomNumber: room_number,
    owner_id,
    ownerId: owner_id,
    join_code,
    joinCode: join_code,
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
  }

  classrooms.set(id, classroom)

  if (owner_id) {
    addMember(id, owner_id, "teacher")
  }

  return classroom
}

export function getClassroom(classroomId: string): Classroom | null {
  if (!classroomId) return null
  return classrooms.get(classroomId) ?? null
}

export function getClassroomById(classroomId: string): Classroom | null {
  return getClassroom(classroomId)
}

export function getClassrooms(): Classroom[] {
  return Array.from(classrooms.values())
}

export function listClassrooms(userId?: string): Classroom[] {
  const all = Array.from(classrooms.values())
  if (!userId) return all
  return all.filter((c) => isClassroomMember(c.id, userId))
}

export function getClassroomByJoinCode(code: string): Classroom | null {
  if (!code || typeof code !== "string") return null
  const upper = code.trim().toUpperCase().replace(/[\s-]/g, "")
  const normalized = normalizeJoinCode(code)
  for (const c of classrooms.values()) {
    if (c.join_code.toUpperCase().replace(/[\s-]/g, "") === upper) return c
    if (normalizeJoinCode(c.join_code) === normalized) return c
  }
  return null
}

export function updateClassroom(
  classroomId: string,
  input: UpdateClassroomInput
): Classroom | null {
  if (!classroomId) return null
  const classroom = classrooms.get(classroomId)
  if (!classroom) return null

  if (input.name !== undefined) classroom.name = input.name
  if (input.section !== undefined) classroom.section = input.section
  if (input.academic_year !== undefined) {
    classroom.academic_year = input.academic_year
    classroom.academicYear = input.academic_year
  } else if (input.academicYear !== undefined) {
    classroom.academic_year = input.academicYear
    classroom.academicYear = input.academicYear
  }
  if (input.subject !== undefined) classroom.subject = input.subject
  if (input.room_number !== undefined) {
    classroom.room_number = input.room_number
    classroom.roomNumber = input.room_number
  } else if (input.roomNumber !== undefined) {
    classroom.room_number = input.roomNumber
    classroom.roomNumber = input.roomNumber
  }
  if (input.owner_id !== undefined) {
    classroom.owner_id = input.owner_id
    classroom.ownerId = input.owner_id
  } else if (input.ownerId !== undefined) {
    classroom.owner_id = input.ownerId
    classroom.ownerId = input.ownerId
  }
  if (input.join_code !== undefined) {
    const code = input.join_code.trim().toUpperCase()
    classroom.join_code = code
    classroom.joinCode = code
  } else if (input.joinCode !== undefined) {
    const code = input.joinCode.trim().toUpperCase()
    classroom.join_code = code
    classroom.joinCode = code
  }

  const now = new Date().toISOString()
  classroom.updated_at = now
  classroom.updatedAt = now

  return classroom
}

export function deleteClassroom(classroomId: string): boolean {
  if (!classroomId) return false
  const existed = classrooms.delete(classroomId)
  rosters.delete(classroomId)
  return existed
}

export function addMember(
  classroomId: string,
  userId: string,
  role: ClassroomRole = "student"
): ClassroomMember {
  let classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) {
    classroomMembers = new Map<string, ClassroomMember>()
    rosters.set(classroomId, classroomMembers)
  }
  const now = new Date().toISOString()
  const existing = classroomMembers.get(userId)
  if (existing) {
    existing.role = role
    return existing
  }
  const member: ClassroomMember = {
    classroom_id: classroomId,
    classroomId,
    user_id: userId,
    userId,
    role,
    joined_at: now,
    joinedAt: now,
  }
  classroomMembers.set(userId, member)
  return member
}

export function getMember(
  classroomId: string,
  userId: string
): ClassroomMember | null {
  if (!classroomId || !userId) return null
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return null
  return classroomMembers.get(userId) ?? null
}

export function isClassroomMember(classroomId: string, userId: string): boolean {
  if (!classroomId || !userId) return false
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return false
  return classroomMembers.has(userId)
}

export function isClassroomTeacher(classroomId: string, userId: string): boolean {
  if (!classroomId || !userId) return false
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return false
  const member = classroomMembers.get(userId)
  if (!member) return false
  return member.role === "teacher" || member.role === "co_teacher"
}

export function isClassroomStudent(classroomId: string, userId: string): boolean {
  if (!classroomId || !userId) return false
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return false
  const member = classroomMembers.get(userId)
  return member?.role === "student"
}

export function isClassroomCoTeacher(classroomId: string, userId: string): boolean {
  if (!classroomId || !userId) return false
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return false
  const member = classroomMembers.get(userId)
  return member?.role === "co_teacher"
}

export function isClassroomObserver(classroomId: string, userId: string): boolean {
  if (!classroomId || !userId) return false
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return false
  const member = classroomMembers.get(userId)
  return member?.role === "observer"
}

export function getClassroomRoster(classroomId: string): ClassroomMember[] {
  if (!classroomId) return []
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return []
  return Array.from(classroomMembers.values())
}

export function updateMemberRole(
  classroomId: string,
  userId: string,
  newRole: ClassroomRole
): void {
  if (!classroomId || !userId) return
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return
  const member = classroomMembers.get(userId)
  if (!member) return
  member.role = newRole
}

export function removeMember(classroomId: string, userId: string): void {
  if (!classroomId || !userId) return
  const classroomMembers = rosters.get(classroomId)
  if (!classroomMembers) return
  classroomMembers.delete(userId)
}

export function redeemJoinCode(
  code: string,
  userId: string
): RedeemJoinCodeResult {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { success: false, error: "Invalid join code" }
  }
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return { success: false, error: "Invalid user ID" }
  }

  const cleanCode = code.trim().toUpperCase().replace(/[\s-]/g, "")
  const normalizedInput = normalizeJoinCode(code)

  let targetClassroom: Classroom | undefined
  for (const classroom of classrooms.values()) {
    const cCode = classroom.join_code.toUpperCase().replace(/[\s-]/g, "")
    if (cCode === cleanCode || normalizeJoinCode(classroom.join_code) === normalizedInput) {
      targetClassroom = classroom
      break
    }
  }

  if (!targetClassroom) {
    return { success: false, error: "Classroom not found" }
  }

  if (isClassroomMember(targetClassroom.id, userId)) {
    return {
      success: false,
      classroomId: targetClassroom.id,
      error: "User is already a member of this classroom",
    }
  }

  addMember(targetClassroom.id, userId, "student")

  return {
    success: true,
    classroomId: targetClassroom.id,
  }
}

export function clearClassroomStore(): void {
  classrooms.clear()
  rosters.clear()
}

export const resetClassroomStore = clearClassroomStore
