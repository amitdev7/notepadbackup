import type { SquigNode } from "../types"

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer"
export type DocumentRole = "viewer" | "editor" | "owner"
export type SharePermission = "view" | "edit"
export type SharingNotificationType =
  | "invite_received"
  | "access_changed"
  | "access_removed"
  | "invite_accepted"
  | "link_expiring"

export interface ProfileRecord {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  last_seen_at: string
}

export interface WorkspaceRecord {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WorkspaceMemberRecord {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  joined_at: string
}

export interface ProjectRecord {
  id: string
  workspace_id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CanvasDocumentJson {
  nodes: Record<string, SquigNode>
  order: string[]
  look?: {
    grid?: boolean
    theme?: string
  }
}

export interface DocumentRecord {
  id: string
  project_id: string | null
  name: string
  document_json: CanvasDocumentJson
  schema_version: number
  revision: number
  is_public: boolean
  public_slug: string | null
  public_role: "viewer" | "editor"
  published_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  updated_by: string | null
  deleted_at: string | null
}

export interface DocumentMemberRecord {
  document_id: string
  user_id: string
  role: DocumentRole
  created_at: string
  created_by: string | null
}

export interface DocumentInvitationRecord {
  id: string
  document_id: string
  email: string
  role: "editor" | "viewer"
  invited_by: string
  token_hash: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export interface NotificationRecord {
  id: string
  user_id: string
  document_id: string | null
  actor_id: string | null
  type: SharingNotificationType
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface NotificationPreferencesRecord {
  user_id: string
  email_invite_received: boolean
  email_access_changed: boolean
  email_access_removed: boolean
  email_invite_accepted: boolean
  email_link_expiring: boolean
  in_app_invite_received: boolean
  in_app_access_changed: boolean
  in_app_access_removed: boolean
  in_app_invite_accepted: boolean
  in_app_link_expiring: boolean
  updated_at: string
}

export interface ShareLinkRecord {
  id: string
  document_id: string
  token_hash: string
  name: string | null
  permission: SharePermission
  allow_export: boolean
  allow_duplicate: boolean
  created_by: string
  created_at: string
  expires_at: string | null
  revoked_at: string | null
  password_hash: string | null
  password_salt?: string | null
  max_uses?: number | null
  use_count: number
  is_active: boolean
}

export interface DocumentVersionRecord {
  id: string
  document_id: string
  version_number: number
  snapshot: CanvasDocumentJson
  created_by: string
  created_at: string
  label: string | null
}

export interface AssetRecord {
  id: string
  workspace_id: string | null
  document_id: string | null
  uploaded_by: string
  filename: string
  mime_type: string
  size_bytes: number
  storage_path: string
  width: number | null
  height: number | null
  created_at: string
}

export interface ActivityLogRecord {
  id: string
  workspace_id: string | null
  document_id: string | null
  user_id: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface DeviceRecord {
  id: string
  user_id: string
  device_name: string
  platform: string
  last_seen_at: string
  created_at: string
}

export interface StudentProfileRecord {
  id: string
  grade_level: string | null
  institution_name: string | null
  default_timezone: string
  status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface StudentAcademicYearRecord {
  id: string
  student_id: string
  name: string
  start_date: string
  end_date: string
  grade_level: string
  status: "planning" | "active" | "archived"
  archived_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AcademicSubjectRecord {
  id: string
  student_id: string
  academic_year_id: string
  code: string
  name: string
  color_hex: string
  baseline_priority: number
  target_weekly_minutes: number
  min_session_minutes: number
  max_session_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CurriculumUnitRecord {
  id: string
  subject_id: string
  unit_number: number
  name: string
  created_at: string
  updated_at: string
}

export interface CurriculumChapterRecord {
  id: string
  unit_id: string
  chapter_number: number
  name: string
  status: string
  confidence_score: number
  estimated_minutes: number
  target_date: string | null
  created_at: string
  updated_at: string
}

export interface CurriculumTopicRecord {
  id: string
  chapter_id: string
  topic_number: number
  name: string
  status: string
  confidence_score: number
  mastery_score: number
  is_weak: boolean
  last_studied_at: string | null
  next_review_due: string | null
  review_stage: number
  created_at: string
  updated_at: string
}

export interface CurriculumSubtopicRecord {
  id: string
  topic_id: string
  subtopic_number: number
  name: string
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ChapterCanvasRecord {
  id: string
  chapter_id: string
  document_id: string
  title: string | null
  created_at: string
}

export interface StudyTaskRecord {
  id: string
  student_id: string
  subject_id: string
  topic_id: string | null
  task_type: string
  scheduled_date: string
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  duration_minutes: number
  priority: string
  numeric_priority: number
  status: string
  completed_at: string | null
  actual_duration_minutes: number | null
  skip_reason: string | null
  reschedule_count: number
  created_at: string
  updated_at: string
}

export interface SchoolTimetableRuleRecord {
  id: string
  student_id: string
  title: string
  entry_type: string
  day_of_week: number
  start_minute: number
  end_minute: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  subject_id: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEventRecord {
  id: string
  student_id: string
  event_type: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  all_day: boolean
  subject_id: string | null
  task_id: string | null
  blocks_study: boolean
  created_at: string
  updated_at: string
}

export interface FlashcardDeckRecord {
  id: string
  student_id: string
  subject_id: string
  chapter_id: string | null
  title: string
  description: string | null
  card_count: number
  created_at: string
  updated_at: string
}

export interface FlashcardRecord {
  id: string
  deck_id: string
  front_text: string
  back_text: string
  hint: string | null
  tags: string[]
  interval_days: number
  ease_factor: number
  repetitions: number
  due_date: string
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface FlashcardReviewRecord {
  id: string
  card_id: string
  student_id: string
  rating: number
  previous_interval: number
  new_interval: number
  previous_ease: number
  new_ease: number
  duration_ms: number
  reviewed_at: string
}

export interface QuestionBankRecord {
  id: string
  student_id: string
  subject_id: string
  chapter_id: string | null
  topic_id: string | null
  question_text: string
  question_type: string
  options: unknown
  correct_answer: string
  solution_explanation: string
  marks: number
  negative_marks: number
  difficulty: string
  year: number | null
  tags: string[]
  is_pyq: boolean
  pyq_source: string | null
  created_at: string
  updated_at: string
}

export interface QuestionAttemptRecord {
  id: string
  student_id: string
  question_id: string
  attempt_date: string
  time_spent_seconds: number
  result: string
  student_answer: string | null
  marks_obtained: number
  notes: string | null
  created_at: string
}

export interface StudentMistakeRecord {
  id: string
  student_id: string
  question_id: string | null
  chapter_id: string | null
  topic_id: string | null
  error_category: string
  student_answer: string | null
  student_reflection: string
  corrective_action: string | null
  status: string
  revision_count: number
  last_reviewed_at: string | null
  next_review_at: string | null
  created_at: string
  updated_at: string
}

export interface FormulaVaultRecord {
  id: string
  student_id: string
  subject_id: string
  chapter_id: string | null
  title: string
  short_code: string | null
  mathematical_notation: string
  symbol_definitions: unknown
  explanations: string
  tags: string[]
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface AcademicExamRecord {
  id: string
  student_id: string
  title: string
  exam_type: string
  academic_year_id: string | null
  start_date: string
  end_date: string
  total_marks: number
  passing_marks: number | null
  target_score: number
  academic_weight_percentage: number
  status: string
  created_at: string
  updated_at: string
}

export interface AcademicExamPaperRecord {
  id: string
  exam_id: string
  subject_id: string
  paper_title: string
  paper_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number
  max_marks: number
  target_score: number | null
  created_at: string
  updated_at: string
}

export interface MockTestTemplateRecord {
  id: string
  student_id: string
  title: string
  test_mode: string
  total_duration_minutes: number
  total_marks: number
  sections: unknown
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface MockTestSessionRecord {
  id: string
  student_id: string
  template_id: string
  status: string
  raw_score: number
  percentage: number
  accuracy_percentage: number
  total_time_spent_seconds: number
  responses: unknown
  score_summary: unknown
  started_at: string
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface StudentMarksRecord {
  id: string
  student_id: string
  subject_id: string
  exam_id: string | null
  title: string
  scored_marks: number
  max_marks: number
  percentage: number
  grade: string | null
  weightage_percentage: number
  test_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FocusSessionRecord {
  id: string
  student_id: string
  subject_id: string | null
  chapter_id: string | null
  task_id: string | null
  timer_mode: string
  target_minutes: number
  actual_seconds: number
  focus_score: number
  distraction_count: number
  started_at: string
  ended_at: string
  is_completed: boolean
  created_at: string
}

export interface ClassroomRecord {
  id: string
  owner_id: string
  name: string
  section: string
  academic_year: string
  subject: string
  room_number: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ClassroomMemberRecord {
  id: string
  classroom_id: string
  user_id: string
  role: string
  joined_at: string
}

export interface ClassroomJoinCodeRecord {
  id: string
  classroom_id: string
  code: string
  role: string
  max_uses: number | null
  use_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface ClassroomAssignmentRecord {
  id: string
  classroom_id: string
  title: string
  instructions: string
  template_document_id: string | null
  max_points: number
  due_date: string
  allow_late: boolean
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface ClassroomSubmissionRecord {
  id: string
  assignment_id: string
  student_id: string
  student_document_id: string | null
  status: string
  submitted_at: string
  grade: number | null
  feedback: string | null
  graded_at: string | null
  graded_by: string | null
}

export interface ClassroomAnnouncementRecord {
  id: string
  classroom_id: string
  title: string
  content: string
  priority: string
  is_pinned: boolean
  created_by: string
  published_at: string
}

export interface GuardianLinkRecord {
  id: string
  student_id: string
  guardian_id: string
  status: string
  allow_study_progress: boolean
  allow_exams: boolean
  allow_assignments: boolean
  allow_marks: boolean
  created_at: string
  updated_at: string
}

export interface GuardianInvitationRecord {
  id: string
  student_id: string
  guardian_email: string
  token_hash: string
  allow_study_progress: boolean
  allow_exams: boolean
  allow_assignments: boolean
  allow_marks: boolean
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface BaseDatabase {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRecord
        Insert: Partial<ProfileRecord> & { id: string; email: string }
        Update: Partial<ProfileRecord>
      }
      workspaces: {
        Row: WorkspaceRecord
        Insert: Partial<WorkspaceRecord> & { name: string; owner_id: string }
        Update: Partial<WorkspaceRecord>
      }
      workspace_members: {
        Row: WorkspaceMemberRecord
        Insert: Partial<WorkspaceMemberRecord> & { workspace_id: string; user_id: string; role: WorkspaceRole }
        Update: Partial<WorkspaceMemberRecord>
      }
      projects: {
        Row: ProjectRecord
        Insert: Partial<ProjectRecord> & { workspace_id: string; name: string; created_by: string }
        Update: Partial<ProjectRecord>
      }
      documents: {
        Row: DocumentRecord
        Insert: Partial<DocumentRecord> & { name: string; created_by: string }
        Update: Partial<DocumentRecord>
      }
      document_members: {
        Row: DocumentMemberRecord
        Insert: Partial<DocumentMemberRecord> & { document_id: string; user_id: string; role: DocumentRole }
        Update: Partial<DocumentMemberRecord>
      }
      document_invitations: {
        Row: DocumentInvitationRecord
        Insert: Partial<DocumentInvitationRecord> & {
          document_id: string
          email: string
          role: "editor" | "viewer"
          invited_by: string
          token_hash: string
        }
        Update: Partial<DocumentInvitationRecord>
      }
      share_links: {
        Row: ShareLinkRecord
        Insert: Partial<ShareLinkRecord> & {
          document_id: string
          token_hash: string
          created_by: string
        }
        Update: Partial<ShareLinkRecord>
      }
      notifications: {
        Row: NotificationRecord
        Insert: Partial<NotificationRecord> & {
          user_id: string
          type: SharingNotificationType
        }
        Update: Partial<NotificationRecord>
      }
      notification_preferences: {
        Row: NotificationPreferencesRecord
        Insert: Partial<NotificationPreferencesRecord> & {
          user_id: string
        }
        Update: Partial<NotificationPreferencesRecord>
      }
      document_versions: {
        Row: DocumentVersionRecord
        Insert: Partial<DocumentVersionRecord> & {
          document_id: string
          version_number: number
          snapshot: CanvasDocumentJson
          created_by: string
        }
        Update: Partial<DocumentVersionRecord>
      }
      assets: {
        Row: AssetRecord
        Insert: Partial<AssetRecord> & {
          uploaded_by: string
          filename: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Update: Partial<AssetRecord>
      }
      activity_log: {
        Row: ActivityLogRecord
        Insert: Partial<ActivityLogRecord> & { action: string }
        Update: Partial<ActivityLogRecord>
      }
      devices: {
        Row: DeviceRecord
        Insert: Partial<DeviceRecord> & { user_id: string; device_name: string; platform: string }
        Update: Partial<DeviceRecord>
      }
      student_profiles: {
        Row: StudentProfileRecord
        Insert: Partial<StudentProfileRecord> & { id: string }
        Update: Partial<StudentProfileRecord>
      }
      student_academic_years: {
        Row: StudentAcademicYearRecord
        Insert: Partial<StudentAcademicYearRecord> & { student_id: string; name: string; start_date: string; end_date: string; grade_level: string }
        Update: Partial<StudentAcademicYearRecord>
      }
      academic_subjects: {
        Row: AcademicSubjectRecord
        Insert: Partial<AcademicSubjectRecord> & { student_id: string; academic_year_id: string; code: string; name: string }
        Update: Partial<AcademicSubjectRecord>
      }
      curriculum_units: {
        Row: CurriculumUnitRecord
        Insert: Partial<CurriculumUnitRecord> & { subject_id: string; unit_number: number; name: string }
        Update: Partial<CurriculumUnitRecord>
      }
      curriculum_chapters: {
        Row: CurriculumChapterRecord
        Insert: Partial<CurriculumChapterRecord> & { unit_id: string; chapter_number: number; name: string }
        Update: Partial<CurriculumChapterRecord>
      }
      curriculum_topics: {
        Row: CurriculumTopicRecord
        Insert: Partial<CurriculumTopicRecord> & { chapter_id: string; topic_number: number; name: string }
        Update: Partial<CurriculumTopicRecord>
      }
      curriculum_subtopics: {
        Row: CurriculumSubtopicRecord
        Insert: Partial<CurriculumSubtopicRecord> & { topic_id: string; subtopic_number: number; name: string }
        Update: Partial<CurriculumSubtopicRecord>
      }
      chapter_canvases: {
        Row: ChapterCanvasRecord
        Insert: Partial<ChapterCanvasRecord> & { chapter_id: string; document_id: string }
        Update: Partial<ChapterCanvasRecord>
      }
      study_tasks: {
        Row: StudyTaskRecord
        Insert: Partial<StudyTaskRecord> & { student_id: string; subject_id: string; scheduled_date: string; duration_minutes: number }
        Update: Partial<StudyTaskRecord>
      }
      school_timetable_rules: {
        Row: SchoolTimetableRuleRecord
        Insert: Partial<SchoolTimetableRuleRecord> & { student_id: string; title: string; entry_type: string; day_of_week: number; start_minute: number; end_minute: number }
        Update: Partial<SchoolTimetableRuleRecord>
      }
      calendar_events: {
        Row: CalendarEventRecord
        Insert: Partial<CalendarEventRecord> & { student_id: string; event_type: string; title: string; start_time: string; end_time: string }
        Update: Partial<CalendarEventRecord>
      }
      flashcard_decks: {
        Row: FlashcardDeckRecord
        Insert: Partial<FlashcardDeckRecord> & { student_id: string; subject_id: string; title: string }
        Update: Partial<FlashcardDeckRecord>
      }
      flashcards: {
        Row: FlashcardRecord
        Insert: Partial<FlashcardRecord> & { deck_id: string; front_text: string; back_text: string }
        Update: Partial<FlashcardRecord>
      }
      flashcard_reviews: {
        Row: FlashcardReviewRecord
        Insert: Partial<FlashcardReviewRecord> & { card_id: string; student_id: string; rating: number; previous_interval: number; new_interval: number; previous_ease: number; new_ease: number; duration_ms: number }
        Update: Partial<FlashcardReviewRecord>
      }
      question_bank: {
        Row: QuestionBankRecord
        Insert: Partial<QuestionBankRecord> & { student_id: string; subject_id: string; question_text: string; correct_answer: string; solution_explanation: string }
        Update: Partial<QuestionBankRecord>
      }
      question_attempts: {
        Row: QuestionAttemptRecord
        Insert: Partial<QuestionAttemptRecord> & { student_id: string; question_id: string; time_spent_seconds: number; result: string }
        Update: Partial<QuestionAttemptRecord>
      }
      student_mistakes: {
        Row: StudentMistakeRecord
        Insert: Partial<StudentMistakeRecord> & { student_id: string; error_category: string; student_reflection: string }
        Update: Partial<StudentMistakeRecord>
      }
      formula_vault: {
        Row: FormulaVaultRecord
        Insert: Partial<FormulaVaultRecord> & { student_id: string; subject_id: string; title: string; mathematical_notation: string; explanations: string }
        Update: Partial<FormulaVaultRecord>
      }
      academic_exams: {
        Row: AcademicExamRecord
        Insert: Partial<AcademicExamRecord> & { student_id: string; title: string; exam_type: string; start_date: string; end_date: string; total_marks: number; target_score: number }
        Update: Partial<AcademicExamRecord>
      }
      academic_exam_papers: {
        Row: AcademicExamPaperRecord
        Insert: Partial<AcademicExamPaperRecord> & { exam_id: string; subject_id: string; paper_title: string; paper_date: string; duration_minutes: number; max_marks: number }
        Update: Partial<AcademicExamPaperRecord>
      }
      mock_test_templates: {
        Row: MockTestTemplateRecord
        Insert: Partial<MockTestTemplateRecord> & { student_id: string; title: string; total_duration_minutes: number; total_marks: number }
        Update: Partial<MockTestTemplateRecord>
      }
      mock_test_sessions: {
        Row: MockTestSessionRecord
        Insert: Partial<MockTestSessionRecord> & { student_id: string; template_id: string }
        Update: Partial<MockTestSessionRecord>
      }
      student_marks: {
        Row: StudentMarksRecord
        Insert: Partial<StudentMarksRecord> & { student_id: string; subject_id: string; title: string; scored_marks: number; max_marks: number; test_date: string }
        Update: Partial<StudentMarksRecord>
      }
      focus_sessions: {
        Row: FocusSessionRecord
        Insert: Partial<FocusSessionRecord> & { student_id: string; target_minutes: number; actual_seconds: number; started_at: string; ended_at: string }
        Update: Partial<FocusSessionRecord>
      }
      classrooms: {
        Row: ClassroomRecord
        Insert: Partial<ClassroomRecord> & { owner_id: string; name: string; section: string; academic_year: string; subject: string }
        Update: Partial<ClassroomRecord>
      }
      classroom_members: {
        Row: ClassroomMemberRecord
        Insert: Partial<ClassroomMemberRecord> & { classroom_id: string; user_id: string }
        Update: Partial<ClassroomMemberRecord>
      }
      classroom_join_codes: {
        Row: ClassroomJoinCodeRecord
        Insert: Partial<ClassroomJoinCodeRecord> & { classroom_id: string; code: string }
        Update: Partial<ClassroomJoinCodeRecord>
      }
      classroom_assignments: {
        Row: ClassroomAssignmentRecord
        Insert: Partial<ClassroomAssignmentRecord> & { classroom_id: string; title: string; instructions: string; due_date: string; created_by: string }
        Update: Partial<ClassroomAssignmentRecord>
      }
      classroom_submissions: {
        Row: ClassroomSubmissionRecord
        Insert: Partial<ClassroomSubmissionRecord> & { assignment_id: string; student_id: string }
        Update: Partial<ClassroomSubmissionRecord>
      }
      classroom_announcements: {
        Row: ClassroomAnnouncementRecord
        Insert: Partial<ClassroomAnnouncementRecord> & { classroom_id: string; title: string; content: string; created_by: string }
        Update: Partial<ClassroomAnnouncementRecord>
      }
      guardian_links: {
        Row: GuardianLinkRecord
        Insert: Partial<GuardianLinkRecord> & { student_id: string; guardian_id: string }
        Update: Partial<GuardianLinkRecord>
      }
      guardian_invitations: {
        Row: GuardianInvitationRecord
        Insert: Partial<GuardianInvitationRecord> & { student_id: string; guardian_email: string; token_hash: string; expires_at: string }
        Update: Partial<GuardianInvitationRecord>
      }
    }
  }
}

export type Database = {
  public: {
    Tables: {
      [K in keyof BaseDatabase["public"]["Tables"]]: {
        Row: {
          [P in keyof BaseDatabase["public"]["Tables"][K]["Row"]]: BaseDatabase["public"]["Tables"][K]["Row"][P]
        }
        Insert: {
          [P in keyof BaseDatabase["public"]["Tables"][K]["Insert"]]: BaseDatabase["public"]["Tables"][K]["Insert"][P]
        }
        Update: {
          [P in keyof BaseDatabase["public"]["Tables"][K]["Update"]]: BaseDatabase["public"]["Tables"][K]["Update"][P]
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

