# 07 — Academic Suite & Student Hub Audit

## 1. Subsystem Architecture
Zenithsui integrates a full-scale academic workspace alongside its infinite whiteboard:
1. **Syllabus & Curriculum**: Tracks chapters, learning objectives, and completion percentages.
2. **Academic Planner**: Time blocking, conflict detection, collision-free slot allocation, and recurring classes.
3. **Spaced Repetition Revision**: Modified SM-2 algorithm with dynamic interval calculation and due card queues.
4. **Practice Engine**: Previous Year Questions (PYQs), self-assessment attempts, and chapter-level accuracy metrics.
5. **Academic Analytics**: Subject strength radars, study velocity, exam countdowns, and catch-up recommendations.
6. **Guardian Mode**: Granular student privacy controls allowing selective sharing of study progress, exam scores, or attendance with guardians while protecting private notes.

---

## 2. Storage & Database Isolation
- Operates on 12 dedicated IndexedDB object stores (`academic_profiles`, `academic_years`, `syllabus_nodes`, `study_events`, `revision_cards`, `practice_questions`, `practice_attempts`, etc.).
- Guaranteed schema upgrade idempotency (`upgradeAcademicDb`) ensuring canvas document storage is never corrupted or impacted by academic data migrations.
- Complete offline-first execution with deferred cloud synchronization.
