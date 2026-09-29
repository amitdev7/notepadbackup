export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "graded"
  | "returned";

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  maxPoints: number;
  dueDate: number | string;
  allowLate: boolean;
  templateDocumentId: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface CreateAssignmentInput {
  id?: string;
  title: string;
  instructions: string;
  maxPoints: number;
  dueDate: number | string;
  allowLate: boolean;
  templateDocumentId: string;
  createdBy?: string;
}

export interface CanvasDocumentFork {
  id: string;
  name: string;
  originalDocumentId: string;
  ownerId: string;
  isPrivate: boolean;
  documentJson: Record<string, unknown>;
  revision: number;
  forkedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface AssignmentStatusTransition {
  from: AssignmentStatus | null;
  to: AssignmentStatus;
  timestamp: number;
  actorId?: string;
  note?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  documentId: string;
  status: AssignmentStatus;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: number;
  startedAt: number;
  submittedAt?: number;
  returnedAt?: number;
  isLate: boolean;
  history: AssignmentStatusTransition[];
}

export type QuizQuestionType =
  | "multiple_choice"
  | "single_choice"
  | "true_false"
  | "multiple_select"
  | "short_answer"
  | "numeric"
  | "fill_in_the_blank"
  | (string & {});

export interface QuizQuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: QuizQuestionType;
  options?: Array<string | QuizQuestionOption>;
  correctAnswers: unknown;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number;
  passingScore: number;
  dueDate: number | string;
  questions: QuizQuestion[];
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface CreateQuizInput {
  id?: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number;
  passingScore: number;
  dueDate: number | string;
  questions: QuizQuestion[];
  createdBy?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: Record<string, unknown>;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: number;
}

export interface QuizScoringResult {
  score: number;
  maxScore: number;
  passed: boolean;
}

function generateUniqueId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomPart}`;
}

function normalizeString(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }
  return String(val).trim().toLowerCase();
}

function parseDueDate(due: number | string): number {
  if (typeof due === "number") {
    return due;
  }
  const parsed = new Date(due).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export class AssignmentsEngine {
  private assignments = new Map<string, Assignment>();
  private submissions = new Map<string, AssignmentSubmission>();
  private canvasDocuments = new Map<string, CanvasDocumentFork>();

  public registerCanvasTemplate(
    templateDocumentId: string,
    data?: {
      name?: string;
      documentJson?: Record<string, unknown>;
    }
  ): CanvasDocumentFork {
    const existing = this.canvasDocuments.get(templateDocumentId);
    if (existing) {
      if (data?.name) existing.name = data.name;
      if (data?.documentJson) {
        existing.documentJson = JSON.parse(JSON.stringify(data.documentJson));
      }
      existing.updatedAt = Date.now();
      return existing;
    }
    const now = Date.now();
    const doc: CanvasDocumentFork = {
      id: templateDocumentId,
      name: data?.name || `Template ${templateDocumentId}`,
      originalDocumentId: templateDocumentId,
      ownerId: "system",
      isPrivate: false,
      documentJson: data?.documentJson
        ? JSON.parse(JSON.stringify(data.documentJson))
        : { nodes: {}, order: [], look: { grid: false, theme: "paper" } },
      revision: 1,
      forkedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.canvasDocuments.set(templateDocumentId, doc);
    return doc;
  }

  public forkCanvasDocument(
    templateDocumentId: string,
    studentId: string,
    forkName?: string
  ): CanvasDocumentFork {
    const template = this.canvasDocuments.get(templateDocumentId);
    const forkedId = generateUniqueId(`doc_fork_${studentId}`);
    const now = Date.now();
    const docJson = template?.documentJson
      ? JSON.parse(JSON.stringify(template.documentJson))
      : { nodes: {}, order: [], look: { grid: false, theme: "paper" } };

    const forkedDoc: CanvasDocumentFork = {
      id: forkedId,
      name:
        forkName ||
        (template
          ? `${template.name} (Student Copy)`
          : `Assignment Canvas (${studentId})`),
      originalDocumentId: templateDocumentId,
      ownerId: studentId,
      isPrivate: true,
      documentJson: docJson,
      revision: 1,
      forkedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.canvasDocuments.set(forkedId, forkedDoc);
    return forkedDoc;
  }

  public getCanvasDocument(documentId: string): CanvasDocumentFork | undefined {
    return this.canvasDocuments.get(documentId);
  }

  public createAssignment(input: CreateAssignmentInput): Assignment {
    const id = input.id || generateUniqueId("asg");
    const now = Date.now();
    const assignment: Assignment = {
      id,
      title: input.title,
      instructions: input.instructions,
      maxPoints: input.maxPoints,
      dueDate: input.dueDate,
      allowLate: input.allowLate,
      templateDocumentId: input.templateDocumentId,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };
    this.assignments.set(id, assignment);
    return assignment;
  }

  public getAssignment(assignmentId: string): Assignment | undefined {
    return this.assignments.get(assignmentId);
  }

  public listAssignments(): Assignment[] {
    return Array.from(this.assignments.values());
  }

  public deleteAssignment(assignmentId: string): boolean {
    return this.assignments.delete(assignmentId);
  }

  public assignAssignment(
    assignmentId: string,
    studentId: string
  ): AssignmentSubmission {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    for (const sub of this.submissions.values()) {
      if (sub.assignmentId === assignmentId && sub.studentId === studentId) {
        return sub;
      }
    }

    const submissionId = generateUniqueId("sub");
    const now = Date.now();
    const submission: AssignmentSubmission = {
      id: submissionId,
      assignmentId,
      studentId,
      documentId: "",
      status: "assigned",
      startedAt: now,
      isLate: false,
      history: [
        {
          from: null,
          to: "assigned",
          timestamp: now,
        },
      ],
    };

    this.submissions.set(submissionId, submission);
    return submission;
  }

  public startAssignment(
    assignmentId: string,
    studentId: string
  ): { submissionId: string; documentId: string } {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    for (const sub of this.submissions.values()) {
      if (sub.assignmentId === assignmentId && sub.studentId === studentId) {
        if (!sub.documentId) {
          const forked = this.forkCanvasDocument(
            assignment.templateDocumentId,
            studentId,
            `${assignment.title} - ${studentId}`
          );
          sub.documentId = forked.id;
        }
        if (sub.status === "assigned") {
          sub.status = "in_progress";
          sub.history.push({
            from: "assigned",
            to: "in_progress",
            timestamp: Date.now(),
          });
        }
        return { submissionId: sub.id, documentId: sub.documentId };
      }
    }

    const forked = this.forkCanvasDocument(
      assignment.templateDocumentId,
      studentId,
      `${assignment.title} - ${studentId}`
    );

    const submissionId = generateUniqueId("sub");
    const now = Date.now();
    const submission: AssignmentSubmission = {
      id: submissionId,
      assignmentId,
      studentId,
      documentId: forked.id,
      status: "in_progress",
      startedAt: now,
      isLate: false,
      history: [
        {
          from: null,
          to: "in_progress",
          timestamp: now,
        },
      ],
    };

    this.submissions.set(submissionId, submission);
    return { submissionId, documentId: forked.id };
  }

  public submitAssignment(
    submissionId: string,
    studentDocumentId?: string
  ): void {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    const assignment = this.assignments.get(submission.assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${submission.assignmentId}`);
    }

    if (studentDocumentId) {
      submission.documentId = studentDocumentId;
    }

    const now = Date.now();
    const dueTime = parseDueDate(assignment.dueDate);
    const isLate = dueTime > 0 && now > dueTime;

    if (isLate && !assignment.allowLate) {
      throw new Error("Late submissions are not permitted for this assignment");
    }

    const previousStatus = submission.status;
    submission.status = "submitted";
    submission.submittedAt = now;
    submission.isLate = isLate;
    submission.history.push({
      from: previousStatus,
      to: "submitted",
      timestamp: now,
    });
  }

  public gradeAssignment(
    submissionId: string,
    grade: number,
    feedback: string,
    teacherId: string
  ): void {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    const assignment = this.assignments.get(submission.assignmentId);
    if (assignment) {
      if (grade < 0 || grade > assignment.maxPoints) {
        throw new Error(`Grade must be between 0 and ${assignment.maxPoints}`);
      }
    } else if (grade < 0) {
      throw new Error("Grade cannot be negative");
    }

    const previousStatus = submission.status;
    submission.status = "graded";
    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedBy = teacherId;
    submission.gradedAt = Date.now();
    submission.history.push({
      from: previousStatus,
      to: "graded",
      timestamp: Date.now(),
      actorId: teacherId,
    });
  }

  public returnAssignment(submissionId: string, teacherId?: string): void {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    const previousStatus = submission.status;
    submission.status = "returned";
    submission.returnedAt = Date.now();
    if (teacherId && !submission.gradedBy) {
      submission.gradedBy = teacherId;
    }
    submission.history.push({
      from: previousStatus,
      to: "returned",
      timestamp: Date.now(),
      actorId: teacherId,
    });
  }

  public updateAssignmentStatus(
    submissionId: string,
    status: AssignmentStatus,
    actorId?: string,
    note?: string
  ): void {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    const previousStatus = submission.status;
    submission.status = status;
    submission.history.push({
      from: previousStatus,
      to: status,
      timestamp: Date.now(),
      actorId,
      note,
    });
  }

  public getSubmission(
    submissionId: string
  ): AssignmentSubmission | undefined {
    return this.submissions.get(submissionId);
  }

  public listSubmissions(filter?: {
    assignmentId?: string;
    studentId?: string;
    status?: AssignmentStatus;
  }): AssignmentSubmission[] {
    let result = Array.from(this.submissions.values());
    if (filter?.assignmentId) {
      result = result.filter((s) => s.assignmentId === filter.assignmentId);
    }
    if (filter?.studentId) {
      result = result.filter((s) => s.studentId === filter.studentId);
    }
    if (filter?.status) {
      result = result.filter((s) => s.status === filter.status);
    }
    return result;
  }

  public clear(): void {
    this.assignments.clear();
    this.submissions.clear();
    this.canvasDocuments.clear();
  }
}

function evaluateQuestionAnswer(
  question: QuizQuestion,
  studentAnswer: unknown
): boolean {
  if (studentAnswer === undefined || studentAnswer === null) {
    return false;
  }

  const qType = question.questionType.toLowerCase();

  if (qType === "true_false") {
    const toBool = (val: unknown): boolean | null => {
      if (typeof val === "boolean") return val;
      const s = normalizeString(val);
      if (s === "true" || s === "t" || s === "1" || s === "yes") return true;
      if (s === "false" || s === "f" || s === "0" || s === "no") return false;
      return null;
    };
    const sBool = toBool(studentAnswer);
    const cBool = toBool(question.correctAnswers);
    if (sBool !== null && cBool !== null) {
      return sBool === cBool;
    }
  }

  if (qType === "numeric") {
    const sNum = Number(studentAnswer);
    const cNum = Number(question.correctAnswers);
    if (!isNaN(sNum) && !isNaN(cNum)) {
      return Math.abs(sNum - cNum) < 1e-6;
    }
  }

  const resolveEquivalentTokens = (val: unknown): string[] => {
    const norm = normalizeString(val);
    const tokens = new Set<string>();
    if (norm) tokens.add(norm);

    if (question.options && Array.isArray(question.options)) {
      for (const opt of question.options) {
        if (typeof opt === "object" && opt !== null) {
          const optIdNorm = normalizeString(opt.id);
          const optTextNorm = normalizeString(opt.text);
          if (norm === optIdNorm && optTextNorm) tokens.add(optTextNorm);
          if (norm === optTextNorm && optIdNorm) tokens.add(optIdNorm);
        }
      }
    }
    return Array.from(tokens);
  };

  if (Array.isArray(question.correctAnswers)) {
    if (Array.isArray(studentAnswer)) {
      if (question.correctAnswers.length !== studentAnswer.length) {
        return false;
      }
      const sortedCorrect = question.correctAnswers
        .map((x) => normalizeString(x))
        .sort();
      const sortedStudent = studentAnswer
        .map((x) => normalizeString(x))
        .sort();
      return sortedCorrect.every((val, idx) => val === sortedStudent[idx]);
    }

    const studentTokens = resolveEquivalentTokens(studentAnswer);
    return question.correctAnswers.some((ans) => {
      const correctTokens = resolveEquivalentTokens(ans);
      return studentTokens.some((st) => correctTokens.includes(st));
    });
  }

  if (Array.isArray(studentAnswer)) {
    if (studentAnswer.length === 1) {
      const studentTokens = resolveEquivalentTokens(studentAnswer[0]);
      const correctTokens = resolveEquivalentTokens(question.correctAnswers);
      return studentTokens.some((st) => correctTokens.includes(st));
    }
    return false;
  }

  const studentTokens = resolveEquivalentTokens(studentAnswer);
  const correctTokens = resolveEquivalentTokens(question.correctAnswers);
  return studentTokens.some((st) => correctTokens.includes(st));
}

export class QuizzesEngine {
  private quizzes = new Map<string, Quiz>();
  private attempts = new Map<string, QuizAttempt>();

  public createQuiz(input: CreateQuizInput): Quiz {
    const id = input.id || generateUniqueId("quiz");
    const now = Date.now();
    const questions: QuizQuestion[] = input.questions.map((q, idx) => ({
      id: q.id || `q_${idx + 1}`,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options ? [...q.options] : undefined,
      correctAnswers: q.correctAnswers,
      points: q.points,
    }));

    const quiz: Quiz = {
      id,
      title: input.title,
      instructions: input.instructions,
      timeLimitMinutes: input.timeLimitMinutes,
      passingScore: input.passingScore,
      dueDate: input.dueDate,
      questions,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    this.quizzes.set(id, quiz);
    return quiz;
  }

  public getQuiz(quizId: string): Quiz | undefined {
    return this.quizzes.get(quizId);
  }

  public listQuizzes(): Quiz[] {
    return Array.from(this.quizzes.values());
  }

  public deleteQuiz(quizId: string): boolean {
    return this.quizzes.delete(quizId);
  }

  public submitQuizAttempt(
    quizId: string,
    studentId: string,
    answers: Record<string, unknown>
  ): { score: number; maxScore: number; passed: boolean } {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) {
      throw new Error(`Quiz not found: ${quizId}`);
    }

    let score = 0;
    let maxScore = 0;

    for (const question of quiz.questions) {
      maxScore += question.points;
      const studentAns = answers[question.id];
      if (studentAns !== undefined && studentAns !== null) {
        if (evaluateQuestionAnswer(question, studentAns)) {
          score += question.points;
        }
      }
    }

    const passed = score >= quiz.passingScore;
    const attemptId = generateUniqueId("atm");
    const attempt: QuizAttempt = {
      id: attemptId,
      quizId,
      studentId,
      answers: { ...answers },
      score,
      maxScore,
      passed,
      submittedAt: Date.now(),
    };

    this.attempts.set(attemptId, attempt);
    return { score, maxScore, passed };
  }

  public getQuizAttempt(attemptId: string): QuizAttempt | undefined {
    return this.attempts.get(attemptId);
  }

  public listQuizAttempts(filter?: {
    quizId?: string;
    studentId?: string;
  }): QuizAttempt[] {
    let result = Array.from(this.attempts.values());
    if (filter?.quizId) {
      result = result.filter((a) => a.quizId === filter.quizId);
    }
    if (filter?.studentId) {
      result = result.filter((a) => a.studentId === filter.studentId);
    }
    return result;
  }

  public clear(): void {
    this.quizzes.clear();
    this.attempts.clear();
  }
}

export const defaultAssignmentsEngine = new AssignmentsEngine();
export const defaultQuizzesEngine = new QuizzesEngine();

export function createAssignment(input: CreateAssignmentInput): Assignment {
  return defaultAssignmentsEngine.createAssignment(input);
}

export function getAssignment(assignmentId: string): Assignment | undefined {
  return defaultAssignmentsEngine.getAssignment(assignmentId);
}

export function listAssignments(): Assignment[] {
  return defaultAssignmentsEngine.listAssignments();
}

export function deleteAssignment(assignmentId: string): boolean {
  return defaultAssignmentsEngine.deleteAssignment(assignmentId);
}

export function assignAssignment(
  assignmentId: string,
  studentId: string
): AssignmentSubmission {
  return defaultAssignmentsEngine.assignAssignment(assignmentId, studentId);
}

export function startAssignment(
  assignmentId: string,
  studentId: string
): { submissionId: string; documentId: string } {
  return defaultAssignmentsEngine.startAssignment(assignmentId, studentId);
}

export function submitAssignment(
  submissionId: string,
  studentDocumentId?: string
): void {
  defaultAssignmentsEngine.submitAssignment(submissionId, studentDocumentId);
}

export function gradeAssignment(
  submissionId: string,
  grade: number,
  feedback: string,
  teacherId: string
): void {
  defaultAssignmentsEngine.gradeAssignment(
    submissionId,
    grade,
    feedback,
    teacherId
  );
}

export function returnAssignment(
  submissionId: string,
  teacherId?: string
): void {
  defaultAssignmentsEngine.returnAssignment(submissionId, teacherId);
}

export function updateAssignmentStatus(
  submissionId: string,
  status: AssignmentStatus,
  actorId?: string,
  note?: string
): void {
  defaultAssignmentsEngine.updateAssignmentStatus(
    submissionId,
    status,
    actorId,
    note
  );
}

export function getSubmission(
  submissionId: string
): AssignmentSubmission | undefined {
  return defaultAssignmentsEngine.getSubmission(submissionId);
}

export function listSubmissions(filter?: {
  assignmentId?: string;
  studentId?: string;
  status?: AssignmentStatus;
}): AssignmentSubmission[] {
  return defaultAssignmentsEngine.listSubmissions(filter);
}

export function registerCanvasTemplate(
  templateDocumentId: string,
  data?: {
    name?: string;
    documentJson?: Record<string, unknown>;
  }
): CanvasDocumentFork {
  return defaultAssignmentsEngine.registerCanvasTemplate(
    templateDocumentId,
    data
  );
}

export function forkCanvasDocument(
  templateDocumentId: string,
  studentId: string,
  forkName?: string
): CanvasDocumentFork {
  return defaultAssignmentsEngine.forkCanvasDocument(
    templateDocumentId,
    studentId,
    forkName
  );
}

export function getCanvasDocument(
  documentId: string
): CanvasDocumentFork | undefined {
  return defaultAssignmentsEngine.getCanvasDocument(documentId);
}

export function createQuiz(input: CreateQuizInput): Quiz {
  return defaultQuizzesEngine.createQuiz(input);
}

export function getQuiz(quizId: string): Quiz | undefined {
  return defaultQuizzesEngine.getQuiz(quizId);
}

export function listQuizzes(): Quiz[] {
  return defaultQuizzesEngine.listQuizzes();
}

export function deleteQuiz(quizId: string): boolean {
  return defaultQuizzesEngine.deleteQuiz(quizId);
}

export function submitQuizAttempt(
  quizId: string,
  studentId: string,
  answers: Record<string, unknown>
): { score: number; maxScore: number; passed: boolean } {
  return defaultQuizzesEngine.submitQuizAttempt(quizId, studentId, answers);
}

export function getQuizAttempt(attemptId: string): QuizAttempt | undefined {
  return defaultQuizzesEngine.getQuizAttempt(attemptId);
}

export function listQuizAttempts(filter?: {
  quizId?: string;
  studentId?: string;
}): QuizAttempt[] {
  return defaultQuizzesEngine.listQuizAttempts(filter);
}

export function clearAcademicStores(): void {
  defaultAssignmentsEngine.clear();
  defaultQuizzesEngine.clear();
}
