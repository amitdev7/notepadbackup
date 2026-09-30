-- ============================================================================
-- ZENITHSUI STUDENT ACADEMIC & CLASSROOM SYSTEM - POSTGRESQL DDL SCHEMA
-- ============================================================================
-- Migration: 20260929000003_zenithsui_student_schema.sql
-- Architecture: Multi-tenant, student data isolation, academic tracking,
--               curriculum trees, flashcards, spaced repetition, mistake vault,
--               exam analytics, classrooms, and granular guardian delegation.
-- Compatible with PostgreSQL 14, 15, 16, 17+
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. PREREQUISITES & EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure set_updated_at helper function exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. TABLES (32 Entities)
-- ----------------------------------------------------------------------------

-- 1. STUDENT PROFILES
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    grade_level VARCHAR(32) NULL,
    institution_name VARCHAR(150) NULL,
    default_timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 2. STUDENT ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS student_academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    grade_level VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'archived')),
    archived_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 3. ACADEMIC SUBJECTS
CREATE TABLE IF NOT EXISTS academic_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES student_academic_years(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    baseline_priority SMALLINT NOT NULL DEFAULT 3 CHECK (baseline_priority BETWEEN 1 AND 5),
    target_weekly_minutes INT NOT NULL DEFAULT 300,
    min_session_minutes INT NOT NULL DEFAULT 30,
    max_session_minutes INT NOT NULL DEFAULT 120,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. CURRICULUM UNITS
CREATE TABLE IF NOT EXISTS curriculum_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES academic_subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. CURRICULUM CHAPTERS
CREATE TABLE IF NOT EXISTS curriculum_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'learning', 'practicing', 'revising', 'completed', 'mastered')),
    confidence_score SMALLINT NOT NULL DEFAULT 1 CHECK (confidence_score BETWEEN 1 AND 5),
    estimated_minutes INT NOT NULL DEFAULT 180,
    target_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. CURRICULUM TOPICS
CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
    topic_number INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'not_started',
    confidence_score SMALLINT NOT NULL DEFAULT 1,
    mastery_score NUMERIC(4,3) NOT NULL DEFAULT 0.000,
    is_weak BOOLEAN NOT NULL DEFAULT false,
    last_studied_at TIMESTAMPTZ NULL,
    next_review_due TIMESTAMPTZ NULL,
    review_stage INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. CURRICULUM SUBTOPICS
CREATE TABLE IF NOT EXISTS curriculum_subtopics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
    subtopic_number INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 8. CHAPTER CANVASES
CREATE TABLE IF NOT EXISTS chapter_canvases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    title VARCHAR(200) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 9. STUDY TASKS
CREATE TABLE IF NOT EXISTS study_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES academic_subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    task_type VARCHAR(32) NOT NULL DEFAULT 'first_learn',
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NULL,
    scheduled_end_time TIME NULL,
    duration_minutes INT NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'medium',
    numeric_priority SMALLINT NOT NULL DEFAULT 2,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed', 'rescheduled', 'skipped')),
    completed_at TIMESTAMPTZ NULL,
    actual_duration_minutes INT NULL,
    skip_reason VARCHAR(64) NULL,
    reschedule_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 10. SCHOOL TIMETABLE RULES
CREATE TABLE IF NOT EXISTS school_timetable_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    entry_type VARCHAR(32) NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_minute INT NOT NULL,
    end_minute INT NOT NULL,
    buffer_before_minutes INT NOT NULL DEFAULT 0,
    buffer_after_minutes INT NOT NULL DEFAULT 0,
    subject_id UUID REFERENCES academic_subjects(id) ON DELETE SET NULL,
    location VARCHAR(128) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 11. CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT false,
    subject_id UUID REFERENCES academic_subjects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES study_tasks(id) ON DELETE SET NULL,
    blocks_study BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 12. FLASHCARD DECKS
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES academic_subjects(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    card_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 13. FLASHCARDS
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    hint TEXT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    interval_days INT NOT NULL DEFAULT 1,
    ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
    repetitions INT NOT NULL DEFAULT 0,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 14. FLASHCARD REVIEWS
CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
    previous_interval INT NOT NULL,
    new_interval INT NOT NULL,
    previous_ease NUMERIC(4,2) NOT NULL,
    new_ease NUMERIC(4,2) NOT NULL,
    duration_ms INT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 15. QUESTION BANK
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES academic_subjects(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'single_choice',
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    solution_explanation TEXT NOT NULL,
    marks NUMERIC(5,2) NOT NULL DEFAULT 4.00,
    negative_marks NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'very_hard')),
    year INT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_pyq BOOLEAN NOT NULL DEFAULT false,
    pyq_source VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 16. QUESTION ATTEMPTS
CREATE TABLE IF NOT EXISTS question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    attempt_date TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    time_spent_seconds INT NOT NULL,
    result VARCHAR(16) NOT NULL CHECK (result IN ('correct', 'wrong', 'skipped')),
    student_answer TEXT NULL,
    marks_obtained NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 17. STUDENT MISTAKES
CREATE TABLE IF NOT EXISTS student_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    error_category VARCHAR(32) NOT NULL CHECK (error_category IN ('concept_error', 'formula_error', 'calculation_error', 'careless_mistake', 'interpretation_error', 'time_management')),
    student_answer TEXT NULL,
    student_reflection TEXT NOT NULL,
    corrective_action TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'revising', 'mastered')),
    revision_count INT NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ NULL,
    next_review_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 18. FORMULA VAULT
CREATE TABLE IF NOT EXISTS formula_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES academic_subjects(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    short_code VARCHAR(50) NULL,
    mathematical_notation TEXT NOT NULL,
    symbol_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanations TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 19. ACADEMIC EXAMS
CREATE TABLE IF NOT EXISTS academic_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    exam_type VARCHAR(32) NOT NULL CHECK (exam_type IN ('class_test', 'unit_test', 'periodic', 'half_yearly', 'pre_board', 'board', 'final', 'custom')),
    academic_year_id UUID REFERENCES student_academic_years(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_marks NUMERIC(6,2) NOT NULL,
    passing_marks NUMERIC(6,2) NULL,
    target_score NUMERIC(6,2) NOT NULL,
    academic_weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 20. ACADEMIC EXAM PAPERS
CREATE TABLE IF NOT EXISTS academic_exam_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES academic_exams(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES academic_subjects(id) ON DELETE CASCADE,
    paper_title VARCHAR(150) NOT NULL,
    paper_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    duration_minutes INT NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL,
    target_score NUMERIC(6,2) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 21. MOCK TEST TEMPLATES
CREATE TABLE IF NOT EXISTS mock_test_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    test_mode VARCHAR(20) NOT NULL DEFAULT 'timed' CHECK (test_mode IN ('timed', 'untimed', 'practice', 'exam')),
    total_duration_minutes INT NOT NULL,
    total_marks NUMERIC(6,2) NOT NULL,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 22. MOCK TEST SESSIONS
CREATE TABLE IF NOT EXISTS mock_test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES mock_test_templates(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired', 'abandoned')),
    raw_score NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    total_time_spent_seconds INT NOT NULL DEFAULT 0,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    submitted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 23. STUDENT MARKS
CREATE TABLE IF NOT EXISTS student_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES academic_subjects(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES academic_exams(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    scored_marks NUMERIC(6,2) NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL CHECK (max_marks > 0),
    percentage NUMERIC(5,2) GENERATED ALWAYS AS (ROUND((scored_marks / max_marks) * 100, 2)) STORED,
    grade VARCHAR(10) NULL,
    weightage_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    test_date DATE NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 24. FOCUS SESSIONS
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES academic_subjects(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE SET NULL,
    task_id UUID REFERENCES study_tasks(id) ON DELETE SET NULL,
    timer_mode VARCHAR(20) NOT NULL DEFAULT 'pomodoro',
    target_minutes INT NOT NULL,
    actual_seconds INT NOT NULL,
    focus_score INT NOT NULL DEFAULT 100,
    distraction_count INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 25. CLASSROOMS
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    section VARCHAR(64) NOT NULL,
    academic_year VARCHAR(32) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    room_number VARCHAR(50) NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 26. CLASSROOM MEMBERS
CREATE TABLE IF NOT EXISTS classroom_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'co_teacher', 'student', 'observer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_classroom_member UNIQUE (classroom_id, user_id)
);

-- 27. CLASSROOM JOIN CODES
CREATE TABLE IF NOT EXISTS classroom_join_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    code VARCHAR(16) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL DEFAULT 'student',
    max_uses INT NULL,
    use_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 28. CLASSROOM ASSIGNMENTS
CREATE TABLE IF NOT EXISTS classroom_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    template_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    max_points NUMERIC(6,2) NOT NULL DEFAULT 100.00,
    due_date TIMESTAMPTZ NOT NULL,
    allow_late BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 29. CLASSROOM SUBMISSIONS
CREATE TABLE IF NOT EXISTS classroom_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    grade NUMERIC(6,2) NULL,
    feedback TEXT NULL,
    graded_at TIMESTAMPTZ NULL,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    CONSTRAINT uq_classroom_submission UNIQUE (assignment_id, student_id)
);

-- 30. CLASSROOM ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS classroom_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 31. GUARDIAN LINKS
CREATE TABLE IF NOT EXISTS guardian_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'suspended')),
    allow_study_progress BOOLEAN NOT NULL DEFAULT true,
    allow_exams BOOLEAN NOT NULL DEFAULT true,
    allow_assignments BOOLEAN NOT NULL DEFAULT true,
    allow_marks BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_guardian_student_link UNIQUE (student_id, guardian_id)
);

-- 32. GUARDIAN INVITATIONS
CREATE TABLE IF NOT EXISTS guardian_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    guardian_email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    allow_study_progress BOOLEAN NOT NULL DEFAULT true,
    allow_exams BOOLEAN NOT NULL DEFAULT true,
    allow_assignments BOOLEAN NOT NULL DEFAULT true,
    allow_marks BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES (Foreign Keys, Lookups, Ordering, and Uniqueness)
-- ----------------------------------------------------------------------------

-- student_academic_years
CREATE INDEX IF NOT EXISTS idx_student_academic_years_student_id ON student_academic_years (student_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_years_status ON student_academic_years (student_id, status);

-- academic_subjects
CREATE INDEX IF NOT EXISTS idx_academic_subjects_student_id ON academic_subjects (student_id);
CREATE INDEX IF NOT EXISTS idx_academic_subjects_academic_year_id ON academic_subjects (academic_year_id);

-- curriculum_units
CREATE INDEX IF NOT EXISTS idx_curriculum_units_subject_id ON curriculum_units (subject_id);

-- curriculum_chapters
CREATE INDEX IF NOT EXISTS idx_curriculum_chapters_unit_id ON curriculum_chapters (unit_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_chapters_status ON curriculum_chapters (unit_id, status);

-- curriculum_topics
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_chapter_id ON curriculum_topics (chapter_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_next_review ON curriculum_topics (chapter_id, next_review_due);

-- curriculum_subtopics
CREATE INDEX IF NOT EXISTS idx_curriculum_subtopics_topic_id ON curriculum_subtopics (topic_id);

-- chapter_canvases
CREATE INDEX IF NOT EXISTS idx_chapter_canvases_chapter_id ON chapter_canvases (chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_canvases_document_id ON chapter_canvases (document_id);

-- study_tasks
CREATE INDEX IF NOT EXISTS idx_study_tasks_student_id ON study_tasks (student_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_subject_id ON study_tasks (subject_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_topic_id ON study_tasks (topic_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_scheduled ON study_tasks (student_id, scheduled_date, status);

-- school_timetable_rules
CREATE INDEX IF NOT EXISTS idx_school_timetable_student_dow ON school_timetable_rules (student_id, day_of_week);

-- calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_student_time ON calendar_events (student_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_id ON calendar_events (task_id);

-- flashcard_decks
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_student_id ON flashcard_decks (student_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject_id ON flashcard_decks (subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_chapter_id ON flashcard_decks (chapter_id);

-- flashcards
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards (deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_due_date ON flashcards (deck_id, due_date);

-- flashcard_reviews
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_card_id ON flashcard_reviews (card_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_student_id ON flashcard_reviews (student_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_reviewed_at ON flashcard_reviews (student_id, reviewed_at DESC);

-- question_bank
CREATE INDEX IF NOT EXISTS idx_question_bank_student_id ON question_bank (student_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_subject_id ON question_bank (subject_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_chapter_id ON question_bank (chapter_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank (student_id, difficulty);

-- question_attempts
CREATE INDEX IF NOT EXISTS idx_question_attempts_student_id ON question_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts (question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_attempt_date ON question_attempts (student_id, attempt_date DESC);

-- student_mistakes
CREATE INDEX IF NOT EXISTS idx_student_mistakes_student_id ON student_mistakes (student_id);
CREATE INDEX IF NOT EXISTS idx_student_mistakes_status ON student_mistakes (student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_mistakes_chapter ON student_mistakes (chapter_id);

-- formula_vault
CREATE INDEX IF NOT EXISTS idx_formula_vault_student_id ON formula_vault (student_id);
CREATE INDEX IF NOT EXISTS idx_formula_vault_subject_id ON formula_vault (subject_id);
CREATE INDEX IF NOT EXISTS idx_formula_vault_favorite ON formula_vault (student_id, is_favorite);

-- academic_exams
CREATE INDEX IF NOT EXISTS idx_academic_exams_student_id ON academic_exams (student_id);
CREATE INDEX IF NOT EXISTS idx_academic_exams_academic_year ON academic_exams (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_exams_dates ON academic_exams (student_id, start_date, end_date);

-- academic_exam_papers
CREATE INDEX IF NOT EXISTS idx_academic_exam_papers_exam_id ON academic_exam_papers (exam_id);
CREATE INDEX IF NOT EXISTS idx_academic_exam_papers_subject_id ON academic_exam_papers (subject_id);

-- mock_test_templates
CREATE INDEX IF NOT EXISTS idx_mock_test_templates_student_id ON mock_test_templates (student_id);

-- mock_test_sessions
CREATE INDEX IF NOT EXISTS idx_mock_test_sessions_student_id ON mock_test_sessions (student_id);
CREATE INDEX IF NOT EXISTS idx_mock_test_sessions_template_id ON mock_test_sessions (template_id);
CREATE INDEX IF NOT EXISTS idx_mock_test_sessions_status ON mock_test_sessions (student_id, status);

-- student_marks
CREATE INDEX IF NOT EXISTS idx_student_marks_student_id ON student_marks (student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_subject_id ON student_marks (subject_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_exam_id ON student_marks (exam_id);

-- focus_sessions
CREATE INDEX IF NOT EXISTS idx_focus_sessions_student_id ON focus_sessions (student_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions (student_id, started_at DESC);

-- classrooms
CREATE INDEX IF NOT EXISTS idx_classrooms_owner_id ON classrooms (owner_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_is_archived ON classrooms (owner_id, is_archived);

-- classroom_members
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom_id ON classroom_members (classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_user_id ON classroom_members (user_id);

-- classroom_join_codes
CREATE INDEX IF NOT EXISTS idx_classroom_join_codes_classroom_id ON classroom_join_codes (classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_join_codes_code ON classroom_join_codes (code);

-- classroom_assignments
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_classroom_id ON classroom_assignments (classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_due_date ON classroom_assignments (classroom_id, due_date);

-- classroom_submissions
CREATE INDEX IF NOT EXISTS idx_classroom_submissions_assignment_id ON classroom_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_classroom_submissions_student_id ON classroom_submissions (student_id);

-- classroom_announcements
CREATE INDEX IF NOT EXISTS idx_classroom_announcements_classroom_id ON classroom_announcements (classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_announcements_published_at ON classroom_announcements (classroom_id, published_at DESC);

-- guardian_links
CREATE INDEX IF NOT EXISTS idx_guardian_links_student_id ON guardian_links (student_id);
CREATE INDEX IF NOT EXISTS idx_guardian_links_guardian_id ON guardian_links (guardian_id);

-- guardian_invitations
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_student_id ON guardian_invitations (student_id);
CREATE INDEX IF NOT EXISTS idx_guardian_invitations_email ON guardian_invitations (guardian_email);

-- ----------------------------------------------------------------------------
-- 3. AUTOMATIC UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
CREATE TRIGGER set_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_student_academic_years_updated_at BEFORE UPDATE ON student_academic_years FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_academic_subjects_updated_at BEFORE UPDATE ON academic_subjects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_curriculum_units_updated_at BEFORE UPDATE ON curriculum_units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_curriculum_chapters_updated_at BEFORE UPDATE ON curriculum_chapters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_curriculum_topics_updated_at BEFORE UPDATE ON curriculum_topics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_curriculum_subtopics_updated_at BEFORE UPDATE ON curriculum_subtopics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_study_tasks_updated_at BEFORE UPDATE ON study_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_school_timetable_rules_updated_at BEFORE UPDATE ON school_timetable_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_flashcard_decks_updated_at BEFORE UPDATE ON flashcard_decks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_question_bank_updated_at BEFORE UPDATE ON question_bank FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_student_mistakes_updated_at BEFORE UPDATE ON student_mistakes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_formula_vault_updated_at BEFORE UPDATE ON formula_vault FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_academic_exams_updated_at BEFORE UPDATE ON academic_exams FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_academic_exam_papers_updated_at BEFORE UPDATE ON academic_exam_papers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_mock_test_templates_updated_at BEFORE UPDATE ON mock_test_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_mock_test_sessions_updated_at BEFORE UPDATE ON mock_test_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_student_marks_updated_at BEFORE UPDATE ON student_marks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_classroom_assignments_updated_at BEFORE UPDATE ON classroom_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_guardian_links_updated_at BEFORE UPDATE ON guardian_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER ACCESS CONTROL HELPERS (Anti-Recursive RLS)
-- ----------------------------------------------------------------------------

-- Check active guardian permission for a specific student and feature toggle
CREATE OR REPLACE FUNCTION public.has_guardian_permission(
    p_guardian_id UUID,
    p_student_id UUID,
    p_permission VARCHAR(32) DEFAULT 'any'
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM guardian_links gl
        WHERE gl.guardian_id = p_guardian_id
          AND gl.student_id = p_student_id
          AND gl.status = 'active'
          AND (
              p_permission = 'any'
              OR (p_permission = 'study_progress' AND gl.allow_study_progress = true)
              OR (p_permission = 'exams' AND gl.allow_exams = true)
              OR (p_permission = 'assignments' AND gl.allow_assignments = true)
              OR (p_permission = 'marks' AND gl.allow_marks = true)
          )
    );
$$;

-- Subject ownership & access
CREATE OR REPLACE FUNCTION public.is_subject_owner(p_subject_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM academic_subjects
        WHERE id = p_subject_id AND student_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_academic_subject(
    p_subject_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(32) DEFAULT 'study_progress'
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM academic_subjects s
        WHERE s.id = p_subject_id
          AND (
              s.student_id = p_user_id
              OR public.has_guardian_permission(p_user_id, s.student_id, p_permission)
          )
    );
$$;

-- Curriculum unit ownership & access
CREATE OR REPLACE FUNCTION public.is_unit_owner(p_unit_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM curriculum_units u
        JOIN academic_subjects s ON s.id = u.subject_id
        WHERE u.id = p_unit_id AND s.student_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_curriculum_unit(
    p_unit_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(32) DEFAULT 'study_progress'
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM curriculum_units u
        JOIN academic_subjects s ON s.id = u.subject_id
        WHERE u.id = p_unit_id
          AND (
              s.student_id = p_user_id
              OR public.has_guardian_permission(p_user_id, s.student_id, p_permission)
          )
    );
$$;

-- Curriculum chapter ownership & access
CREATE OR REPLACE FUNCTION public.is_chapter_owner(p_chapter_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM curriculum_chapters c
        JOIN curriculum_units u ON u.id = c.unit_id
        JOIN academic_subjects s ON s.id = u.subject_id
        WHERE c.id = p_chapter_id AND s.student_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_curriculum_chapter(
    p_chapter_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(32) DEFAULT 'study_progress'
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM curriculum_chapters c
        JOIN curriculum_units u ON u.id = c.unit_id
        JOIN academic_subjects s ON s.id = u.subject_id
        WHERE c.id = p_chapter_id
          AND (
              s.student_id = p_user_id
              OR public.has_guardian_permission(p_user_id, s.student_id, p_permission)
          )
    );
$$;

-- Curriculum topic ownership & access
CREATE OR REPLACE FUNCTION public.is_topic_owner(p_topic_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM curriculum_topics t
        JOIN curriculum_chapters c ON c.id = t.chapter_id
        JOIN curriculum_units u ON u.id = c.unit_id
        JOIN academic_subjects s ON s.id = u.subject_id
        WHERE t.id = p_topic_id AND s.student_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_curriculum_topic(
    p_topic_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(32) DEFAULT 'study_progress'
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM curriculum_topics t
        JOIN curriculum_chapters c ON c.id = t.chapter_id
        JOIN curriculum_units u ON u.id = c.unit_id
        JOIN academic_subjects s ON s.id = u.subject_id
        WHERE t.id = p_topic_id
          AND (
              s.student_id = p_user_id
              OR public.has_guardian_permission(p_user_id, s.student_id, p_permission)
          )
    );
$$;

-- Flashcard deck ownership & access
CREATE OR REPLACE FUNCTION public.is_deck_owner(p_deck_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE id = p_deck_id AND student_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_flashcard_deck(
    p_deck_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(32) DEFAULT 'study_progress'
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM flashcard_decks fd
        WHERE fd.id = p_deck_id
          AND (
              fd.student_id = p_user_id
              OR public.has_guardian_permission(p_user_id, fd.student_id, p_permission)
          )
    );
$$;

-- Academic exam ownership & access
CREATE OR REPLACE FUNCTION public.is_exam_owner(p_exam_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM academic_exams
        WHERE id = p_exam_id AND student_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_academic_exam(
    p_exam_id UUID,
    p_user_id UUID,
    p_permission VARCHAR(32) DEFAULT 'exams'
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM academic_exams ae
        WHERE ae.id = p_exam_id
          AND (
              ae.student_id = p_user_id
              OR public.has_guardian_permission(p_user_id, ae.student_id, p_permission)
          )
    );
$$;

-- Classroom membership & teacher access
CREATE OR REPLACE FUNCTION public.is_classroom_member(p_classroom_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM classrooms c
        WHERE c.id = p_classroom_id AND c.owner_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM classroom_members cm
        WHERE cm.classroom_id = p_classroom_id AND cm.user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_teacher(p_classroom_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM classrooms c
        WHERE c.id = p_classroom_id AND c.owner_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM classroom_members cm
        WHERE cm.classroom_id = p_classroom_id
          AND cm.user_id = p_user_id
          AND cm.role IN ('teacher', 'co_teacher')
    );
$$;

-- Classroom assignment classroom resolver
CREATE OR REPLACE FUNCTION public.get_assignment_classroom_id(p_assignment_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT classroom_id FROM classroom_assignments WHERE id = p_assignment_id;
$$;

-- Guardian assignment viewer
CREATE OR REPLACE FUNCTION public.can_guardian_view_assignment(p_assignment_id UUID, p_guardian_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1
        FROM classroom_assignments ca
        JOIN classroom_members cm ON cm.classroom_id = ca.classroom_id
        JOIN guardian_links gl ON gl.student_id = cm.user_id
        WHERE ca.id = p_assignment_id
          AND gl.guardian_id = p_guardian_id
          AND gl.status = 'active'
          AND gl.allow_assignments = true
    );
$$;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on all 32 tables
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_timetable_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_invitations ENABLE ROW LEVEL SECURITY;

-- 1. student_profiles
DROP POLICY IF EXISTS "student_profiles_select" ON student_profiles;
CREATE POLICY "student_profiles_select" ON student_profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.has_guardian_permission(auth.uid(), id, 'any'));

DROP POLICY IF EXISTS "student_profiles_insert" ON student_profiles;
CREATE POLICY "student_profiles_insert" ON student_profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "student_profiles_update" ON student_profiles;
CREATE POLICY "student_profiles_update" ON student_profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "student_profiles_delete" ON student_profiles;
CREATE POLICY "student_profiles_delete" ON student_profiles
    FOR DELETE TO authenticated
    USING (id = auth.uid());

-- 2. student_academic_years
DROP POLICY IF EXISTS "student_academic_years_select" ON student_academic_years;
CREATE POLICY "student_academic_years_select" ON student_academic_years
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "student_academic_years_insert" ON student_academic_years;
CREATE POLICY "student_academic_years_insert" ON student_academic_years
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_academic_years_update" ON student_academic_years;
CREATE POLICY "student_academic_years_update" ON student_academic_years
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_academic_years_delete" ON student_academic_years;
CREATE POLICY "student_academic_years_delete" ON student_academic_years
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 3. academic_subjects
DROP POLICY IF EXISTS "academic_subjects_select" ON academic_subjects;
CREATE POLICY "academic_subjects_select" ON academic_subjects
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "academic_subjects_insert" ON academic_subjects;
CREATE POLICY "academic_subjects_insert" ON academic_subjects
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "academic_subjects_update" ON academic_subjects;
CREATE POLICY "academic_subjects_update" ON academic_subjects
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "academic_subjects_delete" ON academic_subjects;
CREATE POLICY "academic_subjects_delete" ON academic_subjects
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 4. curriculum_units
DROP POLICY IF EXISTS "curriculum_units_select" ON curriculum_units;
CREATE POLICY "curriculum_units_select" ON curriculum_units
    FOR SELECT TO authenticated
    USING (public.can_access_academic_subject(subject_id, auth.uid(), 'study_progress'));

DROP POLICY IF EXISTS "curriculum_units_insert" ON curriculum_units;
CREATE POLICY "curriculum_units_insert" ON curriculum_units
    FOR INSERT TO authenticated
    WITH CHECK (public.is_subject_owner(subject_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_units_update" ON curriculum_units;
CREATE POLICY "curriculum_units_update" ON curriculum_units
    FOR UPDATE TO authenticated
    USING (public.is_subject_owner(subject_id, auth.uid()))
    WITH CHECK (public.is_subject_owner(subject_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_units_delete" ON curriculum_units;
CREATE POLICY "curriculum_units_delete" ON curriculum_units
    FOR DELETE TO authenticated
    USING (public.is_subject_owner(subject_id, auth.uid()));

-- 5. curriculum_chapters
DROP POLICY IF EXISTS "curriculum_chapters_select" ON curriculum_chapters;
CREATE POLICY "curriculum_chapters_select" ON curriculum_chapters
    FOR SELECT TO authenticated
    USING (public.can_access_curriculum_unit(unit_id, auth.uid(), 'study_progress'));

DROP POLICY IF EXISTS "curriculum_chapters_insert" ON curriculum_chapters;
CREATE POLICY "curriculum_chapters_insert" ON curriculum_chapters
    FOR INSERT TO authenticated
    WITH CHECK (public.is_unit_owner(unit_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_chapters_update" ON curriculum_chapters;
CREATE POLICY "curriculum_chapters_update" ON curriculum_chapters
    FOR UPDATE TO authenticated
    USING (public.is_unit_owner(unit_id, auth.uid()))
    WITH CHECK (public.is_unit_owner(unit_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_chapters_delete" ON curriculum_chapters;
CREATE POLICY "curriculum_chapters_delete" ON curriculum_chapters
    FOR DELETE TO authenticated
    USING (public.is_unit_owner(unit_id, auth.uid()));

-- 6. curriculum_topics
DROP POLICY IF EXISTS "curriculum_topics_select" ON curriculum_topics;
CREATE POLICY "curriculum_topics_select" ON curriculum_topics
    FOR SELECT TO authenticated
    USING (public.can_access_curriculum_chapter(chapter_id, auth.uid(), 'study_progress'));

DROP POLICY IF EXISTS "curriculum_topics_insert" ON curriculum_topics;
CREATE POLICY "curriculum_topics_insert" ON curriculum_topics
    FOR INSERT TO authenticated
    WITH CHECK (public.is_chapter_owner(chapter_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_topics_update" ON curriculum_topics;
CREATE POLICY "curriculum_topics_update" ON curriculum_topics
    FOR UPDATE TO authenticated
    USING (public.is_chapter_owner(chapter_id, auth.uid()))
    WITH CHECK (public.is_chapter_owner(chapter_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_topics_delete" ON curriculum_topics;
CREATE POLICY "curriculum_topics_delete" ON curriculum_topics
    FOR DELETE TO authenticated
    USING (public.is_chapter_owner(chapter_id, auth.uid()));

-- 7. curriculum_subtopics
DROP POLICY IF EXISTS "curriculum_subtopics_select" ON curriculum_subtopics;
CREATE POLICY "curriculum_subtopics_select" ON curriculum_subtopics
    FOR SELECT TO authenticated
    USING (public.can_access_curriculum_topic(topic_id, auth.uid(), 'study_progress'));

DROP POLICY IF EXISTS "curriculum_subtopics_insert" ON curriculum_subtopics;
CREATE POLICY "curriculum_subtopics_insert" ON curriculum_subtopics
    FOR INSERT TO authenticated
    WITH CHECK (public.is_topic_owner(topic_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_subtopics_update" ON curriculum_subtopics;
CREATE POLICY "curriculum_subtopics_update" ON curriculum_subtopics
    FOR UPDATE TO authenticated
    USING (public.is_topic_owner(topic_id, auth.uid()))
    WITH CHECK (public.is_topic_owner(topic_id, auth.uid()));

DROP POLICY IF EXISTS "curriculum_subtopics_delete" ON curriculum_subtopics;
CREATE POLICY "curriculum_subtopics_delete" ON curriculum_subtopics
    FOR DELETE TO authenticated
    USING (public.is_topic_owner(topic_id, auth.uid()));

-- 8. chapter_canvases
DROP POLICY IF EXISTS "chapter_canvases_select" ON chapter_canvases;
CREATE POLICY "chapter_canvases_select" ON chapter_canvases
    FOR SELECT TO authenticated
    USING (public.can_access_curriculum_chapter(chapter_id, auth.uid(), 'study_progress'));

DROP POLICY IF EXISTS "chapter_canvases_insert" ON chapter_canvases;
CREATE POLICY "chapter_canvases_insert" ON chapter_canvases
    FOR INSERT TO authenticated
    WITH CHECK (public.is_chapter_owner(chapter_id, auth.uid()));

DROP POLICY IF EXISTS "chapter_canvases_update" ON chapter_canvases;
CREATE POLICY "chapter_canvases_update" ON chapter_canvases
    FOR UPDATE TO authenticated
    USING (public.is_chapter_owner(chapter_id, auth.uid()))
    WITH CHECK (public.is_chapter_owner(chapter_id, auth.uid()));

DROP POLICY IF EXISTS "chapter_canvases_delete" ON chapter_canvases;
CREATE POLICY "chapter_canvases_delete" ON chapter_canvases
    FOR DELETE TO authenticated
    USING (public.is_chapter_owner(chapter_id, auth.uid()));

-- 9. study_tasks
DROP POLICY IF EXISTS "study_tasks_select" ON study_tasks;
CREATE POLICY "study_tasks_select" ON study_tasks
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "study_tasks_insert" ON study_tasks;
CREATE POLICY "study_tasks_insert" ON study_tasks
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "study_tasks_update" ON study_tasks;
CREATE POLICY "study_tasks_update" ON study_tasks
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "study_tasks_delete" ON study_tasks;
CREATE POLICY "study_tasks_delete" ON study_tasks
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 10. school_timetable_rules
DROP POLICY IF EXISTS "school_timetable_rules_select" ON school_timetable_rules;
CREATE POLICY "school_timetable_rules_select" ON school_timetable_rules
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "school_timetable_rules_insert" ON school_timetable_rules;
CREATE POLICY "school_timetable_rules_insert" ON school_timetable_rules
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "school_timetable_rules_update" ON school_timetable_rules;
CREATE POLICY "school_timetable_rules_update" ON school_timetable_rules
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "school_timetable_rules_delete" ON school_timetable_rules;
CREATE POLICY "school_timetable_rules_delete" ON school_timetable_rules
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 11. calendar_events
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
CREATE POLICY "calendar_events_select" ON calendar_events
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
CREATE POLICY "calendar_events_insert" ON calendar_events
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
CREATE POLICY "calendar_events_update" ON calendar_events
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;
CREATE POLICY "calendar_events_delete" ON calendar_events
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 12. flashcard_decks
DROP POLICY IF EXISTS "flashcard_decks_select" ON flashcard_decks;
CREATE POLICY "flashcard_decks_select" ON flashcard_decks
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "flashcard_decks_insert" ON flashcard_decks;
CREATE POLICY "flashcard_decks_insert" ON flashcard_decks
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "flashcard_decks_update" ON flashcard_decks;
CREATE POLICY "flashcard_decks_update" ON flashcard_decks
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "flashcard_decks_delete" ON flashcard_decks;
CREATE POLICY "flashcard_decks_delete" ON flashcard_decks
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 13. flashcards
DROP POLICY IF EXISTS "flashcards_select" ON flashcards;
CREATE POLICY "flashcards_select" ON flashcards
    FOR SELECT TO authenticated
    USING (public.can_access_flashcard_deck(deck_id, auth.uid(), 'study_progress'));

DROP POLICY IF EXISTS "flashcards_insert" ON flashcards;
CREATE POLICY "flashcards_insert" ON flashcards
    FOR INSERT TO authenticated
    WITH CHECK (public.is_deck_owner(deck_id, auth.uid()));

DROP POLICY IF EXISTS "flashcards_update" ON flashcards;
CREATE POLICY "flashcards_update" ON flashcards
    FOR UPDATE TO authenticated
    USING (public.is_deck_owner(deck_id, auth.uid()))
    WITH CHECK (public.is_deck_owner(deck_id, auth.uid()));

DROP POLICY IF EXISTS "flashcards_delete" ON flashcards;
CREATE POLICY "flashcards_delete" ON flashcards
    FOR DELETE TO authenticated
    USING (public.is_deck_owner(deck_id, auth.uid()));

-- 14. flashcard_reviews
DROP POLICY IF EXISTS "flashcard_reviews_select" ON flashcard_reviews;
CREATE POLICY "flashcard_reviews_select" ON flashcard_reviews
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "flashcard_reviews_insert" ON flashcard_reviews;
CREATE POLICY "flashcard_reviews_insert" ON flashcard_reviews
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "flashcard_reviews_update" ON flashcard_reviews;
CREATE POLICY "flashcard_reviews_update" ON flashcard_reviews
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "flashcard_reviews_delete" ON flashcard_reviews;
CREATE POLICY "flashcard_reviews_delete" ON flashcard_reviews
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 15. question_bank
DROP POLICY IF EXISTS "question_bank_select" ON question_bank;
CREATE POLICY "question_bank_select" ON question_bank
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "question_bank_insert" ON question_bank;
CREATE POLICY "question_bank_insert" ON question_bank
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "question_bank_update" ON question_bank;
CREATE POLICY "question_bank_update" ON question_bank
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "question_bank_delete" ON question_bank;
CREATE POLICY "question_bank_delete" ON question_bank
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 16. question_attempts
DROP POLICY IF EXISTS "question_attempts_select" ON question_attempts;
CREATE POLICY "question_attempts_select" ON question_attempts
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "question_attempts_insert" ON question_attempts;
CREATE POLICY "question_attempts_insert" ON question_attempts
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "question_attempts_update" ON question_attempts;
CREATE POLICY "question_attempts_update" ON question_attempts
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "question_attempts_delete" ON question_attempts;
CREATE POLICY "question_attempts_delete" ON question_attempts
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 17. student_mistakes
DROP POLICY IF EXISTS "student_mistakes_select" ON student_mistakes;
CREATE POLICY "student_mistakes_select" ON student_mistakes
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "student_mistakes_insert" ON student_mistakes;
CREATE POLICY "student_mistakes_insert" ON student_mistakes
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_mistakes_update" ON student_mistakes;
CREATE POLICY "student_mistakes_update" ON student_mistakes
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_mistakes_delete" ON student_mistakes;
CREATE POLICY "student_mistakes_delete" ON student_mistakes
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 18. formula_vault
DROP POLICY IF EXISTS "formula_vault_select" ON formula_vault;
CREATE POLICY "formula_vault_select" ON formula_vault
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "formula_vault_insert" ON formula_vault;
CREATE POLICY "formula_vault_insert" ON formula_vault
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "formula_vault_update" ON formula_vault;
CREATE POLICY "formula_vault_update" ON formula_vault
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "formula_vault_delete" ON formula_vault;
CREATE POLICY "formula_vault_delete" ON formula_vault
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 19. academic_exams
DROP POLICY IF EXISTS "academic_exams_select" ON academic_exams;
CREATE POLICY "academic_exams_select" ON academic_exams
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'exams'));

DROP POLICY IF EXISTS "academic_exams_insert" ON academic_exams;
CREATE POLICY "academic_exams_insert" ON academic_exams
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "academic_exams_update" ON academic_exams;
CREATE POLICY "academic_exams_update" ON academic_exams
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "academic_exams_delete" ON academic_exams;
CREATE POLICY "academic_exams_delete" ON academic_exams
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 20. academic_exam_papers
DROP POLICY IF EXISTS "academic_exam_papers_select" ON academic_exam_papers;
CREATE POLICY "academic_exam_papers_select" ON academic_exam_papers
    FOR SELECT TO authenticated
    USING (public.can_access_academic_exam(exam_id, auth.uid(), 'exams'));

DROP POLICY IF EXISTS "academic_exam_papers_insert" ON academic_exam_papers;
CREATE POLICY "academic_exam_papers_insert" ON academic_exam_papers
    FOR INSERT TO authenticated
    WITH CHECK (public.is_exam_owner(exam_id, auth.uid()));

DROP POLICY IF EXISTS "academic_exam_papers_update" ON academic_exam_papers;
CREATE POLICY "academic_exam_papers_update" ON academic_exam_papers
    FOR UPDATE TO authenticated
    USING (public.is_exam_owner(exam_id, auth.uid()))
    WITH CHECK (public.is_exam_owner(exam_id, auth.uid()));

DROP POLICY IF EXISTS "academic_exam_papers_delete" ON academic_exam_papers;
CREATE POLICY "academic_exam_papers_delete" ON academic_exam_papers
    FOR DELETE TO authenticated
    USING (public.is_exam_owner(exam_id, auth.uid()));

-- 21. mock_test_templates
DROP POLICY IF EXISTS "mock_test_templates_select" ON mock_test_templates;
CREATE POLICY "mock_test_templates_select" ON mock_test_templates
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "mock_test_templates_insert" ON mock_test_templates;
CREATE POLICY "mock_test_templates_insert" ON mock_test_templates
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "mock_test_templates_update" ON mock_test_templates;
CREATE POLICY "mock_test_templates_update" ON mock_test_templates
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "mock_test_templates_delete" ON mock_test_templates;
CREATE POLICY "mock_test_templates_delete" ON mock_test_templates
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 22. mock_test_sessions
DROP POLICY IF EXISTS "mock_test_sessions_select" ON mock_test_sessions;
CREATE POLICY "mock_test_sessions_select" ON mock_test_sessions
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "mock_test_sessions_insert" ON mock_test_sessions;
CREATE POLICY "mock_test_sessions_insert" ON mock_test_sessions
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "mock_test_sessions_update" ON mock_test_sessions;
CREATE POLICY "mock_test_sessions_update" ON mock_test_sessions
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "mock_test_sessions_delete" ON mock_test_sessions;
CREATE POLICY "mock_test_sessions_delete" ON mock_test_sessions
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 23. student_marks
DROP POLICY IF EXISTS "student_marks_select" ON student_marks;
CREATE POLICY "student_marks_select" ON student_marks
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'marks'));

DROP POLICY IF EXISTS "student_marks_insert" ON student_marks;
CREATE POLICY "student_marks_insert" ON student_marks
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_marks_update" ON student_marks;
CREATE POLICY "student_marks_update" ON student_marks
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_marks_delete" ON student_marks;
CREATE POLICY "student_marks_delete" ON student_marks
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 24. focus_sessions
DROP POLICY IF EXISTS "focus_sessions_select" ON focus_sessions;
CREATE POLICY "focus_sessions_select" ON focus_sessions
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.has_guardian_permission(auth.uid(), student_id, 'study_progress'));

DROP POLICY IF EXISTS "focus_sessions_insert" ON focus_sessions;
CREATE POLICY "focus_sessions_insert" ON focus_sessions
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "focus_sessions_update" ON focus_sessions;
CREATE POLICY "focus_sessions_update" ON focus_sessions
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "focus_sessions_delete" ON focus_sessions;
CREATE POLICY "focus_sessions_delete" ON focus_sessions
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- 25. classrooms
DROP POLICY IF EXISTS "classrooms_select" ON classrooms;
CREATE POLICY "classrooms_select" ON classrooms
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR public.is_classroom_member(id, auth.uid()));

DROP POLICY IF EXISTS "classrooms_insert" ON classrooms;
CREATE POLICY "classrooms_insert" ON classrooms
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "classrooms_update" ON classrooms;
CREATE POLICY "classrooms_update" ON classrooms
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() OR public.is_classroom_teacher(id, auth.uid()))
    WITH CHECK (owner_id = auth.uid() OR public.is_classroom_teacher(id, auth.uid()));

DROP POLICY IF EXISTS "classrooms_delete" ON classrooms;
CREATE POLICY "classrooms_delete" ON classrooms
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- 26. classroom_members
DROP POLICY IF EXISTS "classroom_members_select" ON classroom_members;
CREATE POLICY "classroom_members_select" ON classroom_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_members_insert" ON classroom_members;
CREATE POLICY "classroom_members_insert" ON classroom_members
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_members_update" ON classroom_members;
CREATE POLICY "classroom_members_update" ON classroom_members
    FOR UPDATE TO authenticated
    USING (public.is_classroom_teacher(classroom_id, auth.uid()))
    WITH CHECK (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_members_delete" ON classroom_members;
CREATE POLICY "classroom_members_delete" ON classroom_members
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_classroom_teacher(classroom_id, auth.uid()));

-- 27. classroom_join_codes
DROP POLICY IF EXISTS "classroom_join_codes_select" ON classroom_join_codes;
CREATE POLICY "classroom_join_codes_select" ON classroom_join_codes
    FOR SELECT TO authenticated
    USING (
        public.is_classroom_teacher(classroom_id, auth.uid())
        OR (is_active = true AND (expires_at IS NULL OR expires_at > clock_timestamp()))
    );

DROP POLICY IF EXISTS "classroom_join_codes_insert" ON classroom_join_codes;
CREATE POLICY "classroom_join_codes_insert" ON classroom_join_codes
    FOR INSERT TO authenticated
    WITH CHECK (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_join_codes_update" ON classroom_join_codes;
CREATE POLICY "classroom_join_codes_update" ON classroom_join_codes
    FOR UPDATE TO authenticated
    USING (public.is_classroom_teacher(classroom_id, auth.uid()))
    WITH CHECK (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_join_codes_delete" ON classroom_join_codes;
CREATE POLICY "classroom_join_codes_delete" ON classroom_join_codes
    FOR DELETE TO authenticated
    USING (public.is_classroom_teacher(classroom_id, auth.uid()));

-- 28. classroom_assignments
DROP POLICY IF EXISTS "classroom_assignments_select" ON classroom_assignments;
CREATE POLICY "classroom_assignments_select" ON classroom_assignments
    FOR SELECT TO authenticated
    USING (
        public.is_classroom_member(classroom_id, auth.uid())
        OR public.can_guardian_view_assignment(id, auth.uid())
    );

DROP POLICY IF EXISTS "classroom_assignments_insert" ON classroom_assignments;
CREATE POLICY "classroom_assignments_insert" ON classroom_assignments
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid() AND public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_assignments_update" ON classroom_assignments;
CREATE POLICY "classroom_assignments_update" ON classroom_assignments
    FOR UPDATE TO authenticated
    USING (public.is_classroom_teacher(classroom_id, auth.uid()))
    WITH CHECK (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_assignments_delete" ON classroom_assignments;
CREATE POLICY "classroom_assignments_delete" ON classroom_assignments
    FOR DELETE TO authenticated
    USING (public.is_classroom_teacher(classroom_id, auth.uid()));

-- 29. classroom_submissions
DROP POLICY IF EXISTS "classroom_submissions_select" ON classroom_submissions;
CREATE POLICY "classroom_submissions_select" ON classroom_submissions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_classroom_teacher(public.get_assignment_classroom_id(assignment_id), auth.uid())
        OR public.has_guardian_permission(auth.uid(), student_id, 'assignments')
    );

DROP POLICY IF EXISTS "classroom_submissions_insert" ON classroom_submissions;
CREATE POLICY "classroom_submissions_insert" ON classroom_submissions
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND public.is_classroom_member(public.get_assignment_classroom_id(assignment_id), auth.uid())
    );

DROP POLICY IF EXISTS "classroom_submissions_update" ON classroom_submissions;
CREATE POLICY "classroom_submissions_update" ON classroom_submissions
    FOR UPDATE TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_classroom_teacher(public.get_assignment_classroom_id(assignment_id), auth.uid())
    )
    WITH CHECK (
        student_id = auth.uid()
        OR public.is_classroom_teacher(public.get_assignment_classroom_id(assignment_id), auth.uid())
    );

DROP POLICY IF EXISTS "classroom_submissions_delete" ON classroom_submissions;
CREATE POLICY "classroom_submissions_delete" ON classroom_submissions
    FOR DELETE TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_classroom_teacher(public.get_assignment_classroom_id(assignment_id), auth.uid())
    );

-- 30. classroom_announcements
DROP POLICY IF EXISTS "classroom_announcements_select" ON classroom_announcements;
CREATE POLICY "classroom_announcements_select" ON classroom_announcements
    FOR SELECT TO authenticated
    USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_announcements_insert" ON classroom_announcements;
CREATE POLICY "classroom_announcements_insert" ON classroom_announcements
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid() AND public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_announcements_update" ON classroom_announcements;
CREATE POLICY "classroom_announcements_update" ON classroom_announcements
    FOR UPDATE TO authenticated
    USING (public.is_classroom_teacher(classroom_id, auth.uid()))
    WITH CHECK (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "classroom_announcements_delete" ON classroom_announcements;
CREATE POLICY "classroom_announcements_delete" ON classroom_announcements
    FOR DELETE TO authenticated
    USING (public.is_classroom_teacher(classroom_id, auth.uid()));

-- 31. guardian_links
DROP POLICY IF EXISTS "guardian_links_select" ON guardian_links;
CREATE POLICY "guardian_links_select" ON guardian_links
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR guardian_id = auth.uid());

DROP POLICY IF EXISTS "guardian_links_insert" ON guardian_links;
CREATE POLICY "guardian_links_insert" ON guardian_links
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "guardian_links_update" ON guardian_links;
CREATE POLICY "guardian_links_update" ON guardian_links
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid() OR guardian_id = auth.uid())
    WITH CHECK (student_id = auth.uid() OR guardian_id = auth.uid());

DROP POLICY IF EXISTS "guardian_links_delete" ON guardian_links;
CREATE POLICY "guardian_links_delete" ON guardian_links
    FOR DELETE TO authenticated
    USING (student_id = auth.uid() OR guardian_id = auth.uid());

-- 32. guardian_invitations
DROP POLICY IF EXISTS "guardian_invitations_select" ON guardian_invitations;
CREATE POLICY "guardian_invitations_select" ON guardian_invitations
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR guardian_email = (SELECT email FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "guardian_invitations_insert" ON guardian_invitations;
CREATE POLICY "guardian_invitations_insert" ON guardian_invitations
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "guardian_invitations_update" ON guardian_invitations;
CREATE POLICY "guardian_invitations_update" ON guardian_invitations
    FOR UPDATE TO authenticated
    USING (
        student_id = auth.uid()
        OR guardian_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        student_id = auth.uid()
        OR guardian_email = (SELECT email FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "guardian_invitations_delete" ON guardian_invitations;
CREATE POLICY "guardian_invitations_delete" ON guardian_invitations
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. BUSINESS LOGIC HELPER RPC FUNCTIONS
-- ----------------------------------------------------------------------------

-- Join a classroom using a valid invite code
CREATE OR REPLACE FUNCTION public.join_classroom_by_code(
    p_code VARCHAR(16),
    p_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_classroom_id UUID;
    v_role VARCHAR(32);
    v_member_id UUID;
BEGIN
    SELECT classroom_id, role INTO v_classroom_id, v_role
    FROM classroom_join_codes
    WHERE code = p_code
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > clock_timestamp())
      AND (max_uses IS NULL OR use_count < max_uses);

    IF v_classroom_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired classroom join code';
    END IF;

    INSERT INTO classroom_members (classroom_id, user_id, role)
    VALUES (v_classroom_id, p_user_id, coalesce(v_role, 'student'))
    ON CONFLICT (classroom_id, user_id) DO UPDATE
    SET role = EXCLUDED.role
    RETURNING id INTO v_member_id;

    UPDATE classroom_join_codes
    SET use_count = use_count + 1
    WHERE code = p_code;

    RETURN v_member_id;
END;
$$;

-- Accept a guardian invitation by token hash
CREATE OR REPLACE FUNCTION public.accept_guardian_invitation(
    p_token_hash VARCHAR(64),
    p_guardian_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_invitation guardian_invitations%ROWTYPE;
    v_link_id UUID;
BEGIN
    SELECT * INTO v_invitation
    FROM guardian_invitations
    WHERE token_hash = p_token_hash
      AND accepted_at IS NULL
      AND expires_at > clock_timestamp();

    IF v_invitation.id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired guardian invitation token';
    END IF;

    INSERT INTO guardian_links (
        student_id,
        guardian_id,
        status,
        allow_study_progress,
        allow_exams,
        allow_assignments,
        allow_marks
    )
    VALUES (
        v_invitation.student_id,
        p_guardian_id,
        'active',
        v_invitation.allow_study_progress,
        v_invitation.allow_exams,
        v_invitation.allow_assignments,
        v_invitation.allow_marks
    )
    ON CONFLICT (student_id, guardian_id) DO UPDATE
    SET status = 'active',
        allow_study_progress = EXCLUDED.allow_study_progress,
        allow_exams = EXCLUDED.allow_exams,
        allow_assignments = EXCLUDED.allow_assignments,
        allow_marks = EXCLUDED.allow_marks,
        updated_at = clock_timestamp()
    RETURNING id INTO v_link_id;

    UPDATE guardian_invitations
    SET accepted_at = clock_timestamp()
    WHERE id = v_invitation.id;

    RETURN v_link_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. PERMISSIONS GRANTS
-- ----------------------------------------------------------------------------
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_guardian_permission(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_teacher(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_guardian_invitation(VARCHAR, UUID) TO authenticated;

COMMIT;
