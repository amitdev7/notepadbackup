import type { PaletteState, QuestionState, TestRunnerState } from './tests';

export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'ASSERTION_REASON'
  | 'TRUE_FALSE'
  | 'NUMERICAL'
  | 'MATCHING'
  | 'FILL_BLANK'
  | string;

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type SpeedAccuracyQuadrant =
  | 'MASTERED'
  | 'HIGH_EFFORT'
  | 'RUSHED_GUESS'
  | 'BOTTLENECK'
  | 'UNATTEMPTED';

export type ErrorCategory =
  | 'CONCEPTUAL'
  | 'CALCULATION'
  | 'READING_COMPREHENSION'
  | 'TIME_PRESSURE'
  | 'GUESSWORK'
  | 'NONE';

export interface TestQuestion {
  id: string;
  type: QuestionType;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: DifficultyLevel | string;
  positiveMarks?: number;
  positive_mark?: number;
  negativeMarks?: number;
  negative_mark?: number;
  benchmarkTimeSeconds?: number;
  benchmarkSeconds?: number;
  benchmark_time?: number;
  correctAnswer: any;
  correct_answer?: any;
  numericalTolerance?: number;
  tolerance?: number;
  epsilon?: number;
  numericalRange?: [number, number] | { min: number; max: number };
  range?: [number, number] | { min: number; max: number };
  metadata?: Record<string, any>;
}

export interface QuestionRuntimeState {
  id: string;
  response?: any;
  timeSpentSeconds: number;
  visited?: boolean;
  sectionId?: string;
  paletteState?: PaletteState;
  errorCategory?: ErrorCategory;
}

export interface EvaluatedQuestionResult {
  questionId: string;
  isAttempted: boolean;
  isCorrect: boolean;
  isPartial: boolean;
  marksAwarded: number;
  marksLost: number;
  maxMarks: number;
  timeSpentSeconds: number;
  benchmarkTimeSeconds: number;
  quadrant: SpeedAccuracyQuadrant;
  errorCategory: ErrorCategory;
  studentResponse: any;
  correctAnswer: any;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: DifficultyLevel;
  questionType: QuestionType;
}

export interface ScoringBreakdownItem {
  key: string;
  name: string;
  totalQuestions: number;
  attemptedQuestions: number;
  unattemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  partialQuestions: number;
  totalMarks: number;
  marksScored: number;
  marksLost: number;
  accuracy: number;
  percentage: number;
  totalTimeSpentSeconds: number;
  averageTimeSeconds: number;
  quadrantCounts: Record<SpeedAccuracyQuadrant, number>;
  errorCategoryCounts: Record<ErrorCategory, number>;
}

export interface TopicBreakdown extends ScoringBreakdownItem {
  chapterKey: string;
  subjectKey: string;
}

export interface ChapterBreakdown extends ScoringBreakdownItem {
  subjectKey: string;
  topics: Record<string, TopicBreakdown>;
}

export interface SubjectBreakdown extends ScoringBreakdownItem {
  chapters: Record<string, ChapterBreakdown>;
}

export interface TestScoringResult {
  testId: string;
  totalQuestions: number;
  attemptedQuestions: number;
  unattemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  partialQuestions: number;
  totalMarks: number;
  marksScored: number;
  marksLost: number;
  accuracy: number;
  percentage: number;
  totalTimeSpentSeconds: number;
  averageTimePerQuestionSeconds: number;
  quadrantCounts: Record<SpeedAccuracyQuadrant, number>;
  errorCategoryCounts: Record<ErrorCategory, number>;
  evaluatedQuestions: EvaluatedQuestionResult[];
  bySubject: Record<string, SubjectBreakdown>;
  byChapter: Record<string, ChapterBreakdown>;
  byTopic: Record<string, TopicBreakdown>;
  byDifficulty: Record<DifficultyLevel, ScoringBreakdownItem>;
  byQuestionType: Record<string, ScoringBreakdownItem>;
  breakdowns: {
    hierarchical: Record<string, SubjectBreakdown>;
    bySubject: Record<string, SubjectBreakdown>;
    byChapter: Record<string, ChapterBreakdown>;
    byTopic: Record<string, TopicBreakdown>;
    byDifficulty: Record<DifficultyLevel, ScoringBreakdownItem>;
    byQuestionType: Record<string, ScoringBreakdownItem>;
  };
}

export interface TopicGapItem {
  topic: string;
  chapter: string;
  subject: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  totalMarks: number;
  marksScored: number;
  marksLost: number;
  accuracy: number;
  weightage: number;
  priorityScore: number;
  rank: number;
  dominantErrorCategory: ErrorCategory;
  errorDistribution: Record<ErrorCategory, number>;
  remedialDirective: string;
  recommendedAction: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface GapAnalysisReport {
  overallPriorityScore: number;
  totalMarksLost: number;
  averageAccuracy: number;
  criticalGapsCount: number;
  topPriorityTopics: TopicGapItem[];
  allTopicGaps: TopicGapItem[];
  dominantSystemicError: ErrorCategory;
  systemicDirectives: string[];
  breakdownByUrgency: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', number>;
  generatedAt: number;
}

export type TestSessionInput =
  | TestRunnerState
  | {
      testId?: string;
      questions?: Array<QuestionRuntimeState | QuestionState>;
      elapsedSeconds?: number;
      durationSeconds?: number;
    }
  | {
      testId?: string;
      responses?: Record<string, any>;
      timeSpent?: Record<string, number>;
    }
  | Array<QuestionRuntimeState | QuestionState>;

export type TestTemplateInput =
  | {
      id?: string;
      testId?: string;
      questions: TestQuestion[];
      durationSeconds?: number;
    }
  | TestQuestion[];

function normalizeText(val: any): string {
  if (val === null || val === undefined) {
    return '';
  }
  return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeType(type: string): QuestionType {
  const t = String(type || '').trim().toUpperCase();
  if (t === 'SINGLE_CHOICE' || t === 'SCQ' || t === 'SINGLE_SELECT' || t === 'MCQ_SINGLE') {
    return 'SINGLE_CHOICE';
  }
  if (t === 'MULTIPLE_CHOICE' || t === 'MSQ' || t === 'MULTI_SELECT' || t === 'MCQ_MULTIPLE') {
    return 'MULTIPLE_CHOICE';
  }
  if (t === 'ASSERTION_REASON' || t === 'ASSERTION_REASONING' || t === 'AR') {
    return 'ASSERTION_REASON';
  }
  if (t === 'TRUE_FALSE' || t === 'TF' || t === 'BOOLEAN') {
    return 'TRUE_FALSE';
  }
  if (t === 'NUMERICAL' || t === 'INTEGER' || t === 'NUMERIC' || t === 'FLOAT') {
    return 'NUMERICAL';
  }
  if (t === 'MATCHING' || t === 'MATCH_THE_COLUMN' || t === 'MATRIX_MATCH') {
    return 'MATCHING';
  }
  if (t === 'FILL_BLANK' || t === 'FILL_IN_THE_BLANKS' || t === 'FIB' || t === 'NAT') {
    return 'FILL_BLANK';
  }
  return t;
}

function normalizeDifficultyLevel(diff?: string): DifficultyLevel {
  const d = String(diff || '').trim().toUpperCase();
  if (d === 'EASY' || d === 'LOW') {
    return 'EASY';
  }
  if (d === 'HARD' || d === 'DIFFICULT' || d === 'HIGH') {
    return 'HARD';
  }
  return 'MEDIUM';
}

function hasStudentAttempted(response: any): boolean {
  if (response === null || response === undefined || response === '') {
    return false;
  }
  if (Array.isArray(response) && response.length === 0) {
    return false;
  }
  if (typeof response === 'object' && Object.keys(response).length === 0) {
    return false;
  }
  return true;
}

export function determineSpeedAccuracyQuadrant(
  isCorrect: boolean,
  timeSpentSeconds: number,
  benchmarkTimeSeconds: number,
  isAttempted: boolean = true
): SpeedAccuracyQuadrant {
  if (!isAttempted) {
    return 'UNATTEMPTED';
  }
  const benchmark = benchmarkTimeSeconds > 0 ? benchmarkTimeSeconds : 60;
  if (isCorrect) {
    return timeSpentSeconds <= benchmark ? 'MASTERED' : 'HIGH_EFFORT';
  }
  if (timeSpentSeconds < 0.5 * benchmark) {
    return 'RUSHED_GUESS';
  }
  return 'BOTTLENECK';
}

export function determineErrorCategory(
  isCorrect: boolean,
  isAttempted: boolean,
  quadrant: SpeedAccuracyQuadrant,
  questionType: QuestionType,
  timeSpentSeconds: number,
  benchmarkTimeSeconds: number,
  explicitCategory?: ErrorCategory
): ErrorCategory {
  if (isCorrect) {
    return 'NONE';
  }
  if (explicitCategory && explicitCategory !== 'NONE') {
    return explicitCategory;
  }
  if (!isAttempted) {
    return 'TIME_PRESSURE';
  }
  if (quadrant === 'RUSHED_GUESS') {
    return 'GUESSWORK';
  }
  if (questionType === 'NUMERICAL') {
    return 'CALCULATION';
  }
  if (timeSpentSeconds >= 1.5 * benchmarkTimeSeconds) {
    return 'TIME_PRESSURE';
  }
  if (questionType === 'ASSERTION_REASON' || questionType === 'MATCHING') {
    return 'READING_COMPREHENSION';
  }
  return 'CONCEPTUAL';
}

function evaluateSingleChoiceLike(studentResponse: any, correctAnswer: any): boolean {
  return normalizeText(studentResponse) === normalizeText(correctAnswer);
}

function evaluateMultipleChoice(
  studentResponse: any,
  correctAnswer: any,
  posMark: number,
  negMark: number
): { isCorrect: boolean; isPartial: boolean; marksAwarded: number } {
  const studentArr: any[] = Array.isArray(studentResponse)
    ? studentResponse
    : [studentResponse];
  const correctArr: any[] = Array.isArray(correctAnswer)
    ? correctAnswer
    : [correctAnswer];

  const studentSet = new Set(studentArr.map((x) => normalizeText(x)));
  const correctSet = new Set(correctArr.map((x) => normalizeText(x)));

  if (studentSet.size === 0) {
    return { isCorrect: false, isPartial: false, marksAwarded: 0 };
  }

  let hasWrongOption = false;
  for (const opt of studentSet) {
    if (!correctSet.has(opt)) {
      hasWrongOption = true;
      break;
    }
  }

  if (hasWrongOption) {
    return {
      isCorrect: false,
      isPartial: false,
      marksAwarded: -negMark,
    };
  }

  if (studentSet.size === correctSet.size) {
    return {
      isCorrect: true,
      isPartial: false,
      marksAwarded: posMark,
    };
  }

  const subsetScore =
    correctSet.size > 0 ? (posMark / correctSet.size) * studentSet.size : 0;
  return {
    isCorrect: false,
    isPartial: true,
    marksAwarded: Number(subsetScore.toFixed(4)),
  };
}

function evaluateNumerical(
  studentResponse: any,
  correctAnswer: any,
  question: TestQuestion
): boolean {
  const studentVal =
    typeof studentResponse === 'number'
      ? studentResponse
      : parseFloat(String(studentResponse).trim());

  if (isNaN(studentVal)) {
    return false;
  }

  const range = question.numericalRange ?? question.range ?? correctAnswer?.range;
  if (range) {
    if (Array.isArray(range) && range.length >= 2) {
      return studentVal >= range[0] && studentVal <= range[1];
    }
    if (typeof range === 'object' && 'min' in range && 'max' in range) {
      return studentVal >= (range as any).min && studentVal <= (range as any).max;
    }
  }

  if (Array.isArray(correctAnswer) && correctAnswer.length === 2 && !question.numericalTolerance && !question.tolerance && !question.epsilon) {
    const isFirstNum = typeof correctAnswer[0] === 'number';
    const isSecondNum = typeof correctAnswer[1] === 'number';
    if (isFirstNum && isSecondNum) {
      return studentVal >= correctAnswer[0] && studentVal <= correctAnswer[1];
    }
  }

  let correctVal: number = NaN;
  if (typeof correctAnswer === 'number') {
    correctVal = correctAnswer;
  } else if (typeof correctAnswer === 'object' && correctAnswer !== null && 'value' in correctAnswer) {
    correctVal = typeof correctAnswer.value === 'number' ? correctAnswer.value : parseFloat(String(correctAnswer.value).trim());
  } else {
    correctVal = parseFloat(String(correctAnswer).trim());
  }

  if (isNaN(correctVal)) {
    return false;
  }

  const epsilon =
    question.numericalTolerance ??
    question.tolerance ??
    question.epsilon ??
    correctAnswer?.tolerance ??
    correctAnswer?.epsilon ??
    0;

  if (epsilon > 0) {
    return Math.abs(studentVal - correctVal) <= epsilon + 1e-12;
  }

  return Math.abs(studentVal - correctVal) <= 1e-9;
}

function evaluateMatching(studentResponse: any, correctAnswer: any): boolean {
  if (
    typeof studentResponse === 'object' &&
    studentResponse !== null &&
    typeof correctAnswer === 'object' &&
    correctAnswer !== null &&
    !Array.isArray(studentResponse) &&
    !Array.isArray(correctAnswer)
  ) {
    const correctKeys = Object.keys(correctAnswer);
    const studentKeys = Object.keys(studentResponse);
    if (correctKeys.length !== studentKeys.length) {
      return false;
    }
    for (const key of correctKeys) {
      if (normalizeText(studentResponse[key]) !== normalizeText(correctAnswer[key])) {
        return false;
      }
    }
    return true;
  }

  if (Array.isArray(studentResponse) && Array.isArray(correctAnswer)) {
    if (studentResponse.length !== correctAnswer.length) {
      return false;
    }
    const serialize = (arr: any[]) =>
      arr
        .map((item) =>
          Array.isArray(item)
            ? `${normalizeText(item[0])}->${normalizeText(item[1])}`
            : typeof item === 'object' && item !== null
            ? `${normalizeText(item.left ?? item.from ?? item.key)}->${normalizeText(item.right ?? item.to ?? item.value)}`
            : normalizeText(item)
        )
        .sort();

    const sSorted = serialize(studentResponse);
    const cSorted = serialize(correctAnswer);
    return sSorted.every((val, idx) => val === cSorted[idx]);
  }

  return normalizeText(studentResponse) === normalizeText(correctAnswer);
}

function evaluateFillBlank(studentResponse: any, correctAnswer: any): boolean {
  const normStudent = normalizeText(studentResponse);
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some((ans) => normalizeText(ans) === normStudent);
  }
  return normStudent === normalizeText(correctAnswer);
}

export function evaluateTestQuestion(
  question: TestQuestion,
  runtime: QuestionRuntimeState
): EvaluatedQuestionResult {
  const posMark =
    question.positiveMarks ??
    question.positive_mark ??
    (question as any).positiveMark ??
    (question as any).marks ??
    1;
  const negMarkRaw =
    question.negativeMarks ??
    question.negative_mark ??
    (question as any).negativeMark ??
    0;
  const negMark = Math.abs(negMarkRaw);
  const benchmarkTime =
    question.benchmarkTimeSeconds ??
    question.benchmarkSeconds ??
    question.benchmark_time ??
    60;
  const qType = normalizeType(question.type);
  const difficulty = normalizeDifficultyLevel(question.difficulty);
  const subject = String(question.subject || 'General').trim();
  const chapter = String(question.chapter || 'General').trim();
  const topic = String(question.topic || 'General').trim();
  const correctAnswer =
    question.correctAnswer !== undefined
      ? question.correctAnswer
      : question.correct_answer;

  const isAttempted = hasStudentAttempted(runtime.response);
  const timeSpent = Math.max(0, runtime.timeSpentSeconds || 0);

  let isCorrect = false;
  let isPartial = false;
  let marksAwarded = 0;

  if (!isAttempted) {
    isCorrect = false;
    isPartial = false;
    marksAwarded = 0;
  } else if (qType === 'MULTIPLE_CHOICE') {
    const msqResult = evaluateMultipleChoice(
      runtime.response,
      correctAnswer,
      posMark,
      negMark
    );
    isCorrect = msqResult.isCorrect;
    isPartial = msqResult.isPartial;
    marksAwarded = msqResult.marksAwarded;
  } else if (qType === 'NUMERICAL') {
    isCorrect = evaluateNumerical(runtime.response, correctAnswer, question);
    marksAwarded = isCorrect ? posMark : -negMark;
  } else if (qType === 'MATCHING') {
    isCorrect = evaluateMatching(runtime.response, correctAnswer);
    marksAwarded = isCorrect ? posMark : -negMark;
  } else if (qType === 'FILL_BLANK') {
    isCorrect = evaluateFillBlank(runtime.response, correctAnswer);
    marksAwarded = isCorrect ? posMark : -negMark;
  } else {
    isCorrect = evaluateSingleChoiceLike(runtime.response, correctAnswer);
    marksAwarded = isCorrect ? posMark : -negMark;
  }

  const marksLost = Number((posMark - marksAwarded).toFixed(4));
  const quadrant = determineSpeedAccuracyQuadrant(
    isCorrect,
    timeSpent,
    benchmarkTime,
    isAttempted
  );
  const errorCategory = determineErrorCategory(
    isCorrect,
    isAttempted,
    quadrant,
    qType,
    timeSpent,
    benchmarkTime,
    runtime.errorCategory
  );

  return {
    questionId: question.id,
    isAttempted,
    isCorrect,
    isPartial,
    marksAwarded: Number(marksAwarded.toFixed(4)),
    marksLost,
    maxMarks: posMark,
    timeSpentSeconds: timeSpent,
    benchmarkTimeSeconds: benchmarkTime,
    quadrant,
    errorCategory,
    studentResponse: runtime.response,
    correctAnswer,
    subject,
    chapter,
    topic,
    difficulty,
    questionType: qType,
  };
}

function createEmptyBreakdown(key: string, name: string): ScoringBreakdownItem {
  return {
    key,
    name,
    totalQuestions: 0,
    attemptedQuestions: 0,
    unattemptedQuestions: 0,
    correctQuestions: 0,
    incorrectQuestions: 0,
    partialQuestions: 0,
    totalMarks: 0,
    marksScored: 0,
    marksLost: 0,
    accuracy: 0,
    percentage: 0,
    totalTimeSpentSeconds: 0,
    averageTimeSeconds: 0,
    quadrantCounts: {
      MASTERED: 0,
      HIGH_EFFORT: 0,
      RUSHED_GUESS: 0,
      BOTTLENECK: 0,
      UNATTEMPTED: 0,
    },
    errorCategoryCounts: {
      CONCEPTUAL: 0,
      CALCULATION: 0,
      READING_COMPREHENSION: 0,
      TIME_PRESSURE: 0,
      GUESSWORK: 0,
      NONE: 0,
    },
  };
}

function accumulateBreakdownItem(
  item: ScoringBreakdownItem,
  eq: EvaluatedQuestionResult
): void {
  item.totalQuestions += 1;
  if (eq.isAttempted) {
    item.attemptedQuestions += 1;
  } else {
    item.unattemptedQuestions += 1;
  }
  if (eq.isCorrect) {
    item.correctQuestions += 1;
  } else if (eq.isPartial) {
    item.partialQuestions += 1;
  } else if (eq.isAttempted) {
    item.incorrectQuestions += 1;
  }
  item.totalMarks += eq.maxMarks;
  item.marksScored += eq.marksAwarded;
  item.marksLost += eq.marksLost;
  item.totalTimeSpentSeconds += eq.timeSpentSeconds;
  item.quadrantCounts[eq.quadrant] = (item.quadrantCounts[eq.quadrant] || 0) + 1;
  item.errorCategoryCounts[eq.errorCategory] =
    (item.errorCategoryCounts[eq.errorCategory] || 0) + 1;
}

function finalizeBreakdownItem(item: ScoringBreakdownItem): void {
  item.totalMarks = Number(item.totalMarks.toFixed(2));
  item.marksScored = Number(item.marksScored.toFixed(2));
  item.marksLost = Number(item.marksLost.toFixed(2));
  item.accuracy =
    item.attemptedQuestions > 0
      ? Number((item.correctQuestions / item.attemptedQuestions).toFixed(4))
      : 0;
  item.percentage =
    item.totalMarks > 0
      ? Number(((item.marksScored / item.totalMarks) * 100).toFixed(2))
      : 0;
  item.averageTimeSeconds =
    item.totalQuestions > 0
      ? Number((item.totalTimeSpentSeconds / item.totalQuestions).toFixed(2))
      : 0;
}

export function generateScoringResult(
  session: TestSessionInput,
  template: TestTemplateInput
): TestScoringResult {
  const templateQuestions: TestQuestion[] = Array.isArray(template)
    ? template
    : template?.questions || [];

  const runtimeMap = new Map<string, QuestionRuntimeState>();
  let sessionQuestionsList: Array<QuestionRuntimeState | QuestionState> = [];

  if (Array.isArray(session)) {
    sessionQuestionsList = session;
    for (const q of session) {
      runtimeMap.set(q.id, q);
    }
  } else if (session && typeof session === 'object') {
    if ('questions' in session && Array.isArray((session as any).questions)) {
      sessionQuestionsList = (session as any).questions;
      for (const q of sessionQuestionsList) {
        runtimeMap.set(q.id, q);
      }
    } else if ('responses' in session && typeof (session as any).responses === 'object') {
      const respObj = (session as any).responses || {};
      const timeObj = (session as any).timeSpent || {};
      for (const [qid, response] of Object.entries(respObj)) {
        runtimeMap.set(qid, {
          id: qid,
          response,
          timeSpentSeconds: typeof timeObj[qid] === 'number' ? timeObj[qid] : 0,
        });
      }
    }
  }

  const evaluatedQuestions: EvaluatedQuestionResult[] = [];
  const quadrantCounts: Record<SpeedAccuracyQuadrant, number> = {
    MASTERED: 0,
    HIGH_EFFORT: 0,
    RUSHED_GUESS: 0,
    BOTTLENECK: 0,
    UNATTEMPTED: 0,
  };
  const errorCategoryCounts: Record<ErrorCategory, number> = {
    CONCEPTUAL: 0,
    CALCULATION: 0,
    READING_COMPREHENSION: 0,
    TIME_PRESSURE: 0,
    GUESSWORK: 0,
    NONE: 0,
  };

  const hierarchicalBreakdown: Record<string, SubjectBreakdown> = {};
  const bySubject: Record<string, SubjectBreakdown> = {};
  const byChapter: Record<string, ChapterBreakdown> = {};
  const byTopic: Record<string, TopicBreakdown> = {};
  const byDifficulty: Record<DifficultyLevel, ScoringBreakdownItem> = {
    EASY: createEmptyBreakdown('EASY', 'Easy'),
    MEDIUM: createEmptyBreakdown('MEDIUM', 'Medium'),
    HARD: createEmptyBreakdown('HARD', 'Hard'),
  };
  const byQuestionType: Record<string, ScoringBreakdownItem> = {};

  for (let idx = 0; idx < templateQuestions.length; idx++) {
    const question = templateQuestions[idx];
    let runtime = runtimeMap.get(question.id);
    if (!runtime && sessionQuestionsList[idx]) {
      runtime = sessionQuestionsList[idx];
    }
    if (!runtime) {
      runtime = {
        id: question.id,
        response: null,
        timeSpentSeconds: 0,
      };
    }

    const eq = evaluateTestQuestion(question, runtime);
    evaluatedQuestions.push(eq);

    quadrantCounts[eq.quadrant] = (quadrantCounts[eq.quadrant] || 0) + 1;
    errorCategoryCounts[eq.errorCategory] =
      (errorCategoryCounts[eq.errorCategory] || 0) + 1;

    const sKey = eq.subject;
    const cKey = eq.chapter;
    const tKey = eq.topic;

    if (!bySubject[sKey]) {
      const emptySub: SubjectBreakdown = {
        ...createEmptyBreakdown(sKey, sKey),
        chapters: {},
      };
      bySubject[sKey] = emptySub;
      hierarchicalBreakdown[sKey] = emptySub;
    }
    accumulateBreakdownItem(bySubject[sKey], eq);

    if (!bySubject[sKey].chapters[cKey]) {
      const emptyChap: ChapterBreakdown = {
        ...createEmptyBreakdown(cKey, cKey),
        subjectKey: sKey,
        topics: {},
      };
      bySubject[sKey].chapters[cKey] = emptyChap;
    }
    accumulateBreakdownItem(bySubject[sKey].chapters[cKey], eq);

    if (!byChapter[cKey]) {
      byChapter[cKey] = bySubject[sKey].chapters[cKey];
    }

    if (!bySubject[sKey].chapters[cKey].topics[tKey]) {
      const emptyTop: TopicBreakdown = {
        ...createEmptyBreakdown(tKey, tKey),
        chapterKey: cKey,
        subjectKey: sKey,
      };
      bySubject[sKey].chapters[cKey].topics[tKey] = emptyTop;
    }
    accumulateBreakdownItem(bySubject[sKey].chapters[cKey].topics[tKey], eq);

    if (!byTopic[tKey]) {
      byTopic[tKey] = bySubject[sKey].chapters[cKey].topics[tKey];
    }

    accumulateBreakdownItem(byDifficulty[eq.difficulty], eq);

    if (!byQuestionType[eq.questionType]) {
      byQuestionType[eq.questionType] = createEmptyBreakdown(
        eq.questionType,
        eq.questionType
      );
    }
    accumulateBreakdownItem(byQuestionType[eq.questionType], eq);
  }

  for (const sKey of Object.keys(bySubject)) {
    finalizeBreakdownItem(bySubject[sKey]);
    for (const cKey of Object.keys(bySubject[sKey].chapters)) {
      finalizeBreakdownItem(bySubject[sKey].chapters[cKey]);
      for (const tKey of Object.keys(bySubject[sKey].chapters[cKey].topics)) {
        finalizeBreakdownItem(bySubject[sKey].chapters[cKey].topics[tKey]);
      }
    }
  }

  for (const dKey of ['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[]) {
    finalizeBreakdownItem(byDifficulty[dKey]);
  }

  for (const qt of Object.keys(byQuestionType)) {
    finalizeBreakdownItem(byQuestionType[qt]);
  }

  const totalQuestions = evaluatedQuestions.length;
  const attemptedQuestions = evaluatedQuestions.filter((q) => q.isAttempted).length;
  const unattemptedQuestions = totalQuestions - attemptedQuestions;
  const correctQuestions = evaluatedQuestions.filter((q) => q.isCorrect).length;
  const partialQuestions = evaluatedQuestions.filter((q) => q.isPartial).length;
  const incorrectQuestions = evaluatedQuestions.filter(
    (q) => q.isAttempted && !q.isCorrect && !q.isPartial
  ).length;

  const totalMarks = Number(
    evaluatedQuestions.reduce((acc, q) => acc + q.maxMarks, 0).toFixed(2)
  );
  const marksScored = Number(
    evaluatedQuestions.reduce((acc, q) => acc + q.marksAwarded, 0).toFixed(2)
  );
  const marksLost = Number((totalMarks - marksScored).toFixed(2));
  const accuracy =
    attemptedQuestions > 0
      ? Number((correctQuestions / attemptedQuestions).toFixed(4))
      : 0;
  const percentage =
    totalMarks > 0
      ? Number(((marksScored / totalMarks) * 100).toFixed(2))
      : 0;
  const totalTimeSpentSeconds = evaluatedQuestions.reduce(
    (acc, q) => acc + q.timeSpentSeconds,
    0
  );
  const averageTimePerQuestionSeconds =
    totalQuestions > 0
      ? Number((totalTimeSpentSeconds / totalQuestions).toFixed(2))
      : 0;

  const testId =
    (!Array.isArray(session) && (session as any)?.testId) ||
    (!Array.isArray(template) && (template as any)?.id) ||
    'test_session';

  return {
    testId,
    totalQuestions,
    attemptedQuestions,
    unattemptedQuestions,
    correctQuestions,
    incorrectQuestions,
    partialQuestions,
    totalMarks,
    marksScored,
    marksLost,
    accuracy,
    percentage,
    totalTimeSpentSeconds,
    averageTimePerQuestionSeconds,
    quadrantCounts,
    errorCategoryCounts,
    evaluatedQuestions,
    bySubject,
    byChapter,
    byTopic,
    byDifficulty,
    byQuestionType,
    breakdowns: {
      hierarchical: hierarchicalBreakdown,
      bySubject,
      byChapter,
      byTopic,
      byDifficulty,
      byQuestionType,
    },
  };
}

export function getRemedialDirective(errorCategory: ErrorCategory): {
  remedialDirective: string;
  recommendedAction: string;
} {
  switch (errorCategory) {
    case 'CONCEPTUAL':
      return {
        remedialDirective:
          'Revisit foundational theory and core derivation principles for this topic. Solve 15-20 textbook-level standard concept verification problems before attempting mixed problem sets.',
        recommendedAction:
          'Review core theory notes and concept summary sheets.',
      };
    case 'CALCULATION':
      return {
        remedialDirective:
          'Focus on step-by-step arithmetic discipline. Eliminate mental arithmetic shortcuts, double-check algebraic rearrangements and units/dimensions, and practice timed numerical drills with zero calculator reliance.',
        recommendedAction:
          'Practice scratch-pad scratchwork structuring and unit checks.',
      };
    case 'READING_COMPREHENSION':
      return {
        remedialDirective:
          'Slow down question decoding. Underline given constraints, boundary values, exception keywords (NOT, INCORRECT, EXCEPT), and ensure question demand is re-verified before locking choices.',
        recommendedAction:
          'Read problem statements twice; highlight qualifying clauses.',
      };
    case 'TIME_PRESSURE':
      return {
        remedialDirective:
          'Implement strict per-question time caps. If initial setup does not formulate within 45 seconds, flag for later review and move forward. Practice 30-minute sectional speed sprints.',
        recommendedAction:
          'Practice timed sectional mocks with hard skip thresholds.',
      };
    case 'GUESSWORK':
      return {
        remedialDirective:
          'Cease speculative answering on uncertain options to prevent negative mark bleed. Enforce the two-option elimination rule: never guess unless at least two options are definitively ruled out.',
        recommendedAction:
          'Enforce zero-guessing discipline to eliminate negative marking penalty.',
      };
    default:
      return {
        remedialDirective:
          'Mastery demonstrated. Maintain retention with periodic spaced revision and challenging multi-concept advanced problems.',
        recommendedAction: 'Advance to higher difficulty problem sets.',
      };
  }
}

function resolveDominantError(counts: Record<ErrorCategory, number>): ErrorCategory {
  const rankedCategories: ErrorCategory[] = [
    'CONCEPTUAL',
    'CALCULATION',
    'READING_COMPREHENSION',
    'TIME_PRESSURE',
    'GUESSWORK',
  ];
  let bestCategory: ErrorCategory = 'NONE';
  let bestCount = 0;

  for (const cat of rankedCategories) {
    const c = counts[cat] || 0;
    if (c > bestCount) {
      bestCount = c;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

export function computeGapAnalysis(
  scoringResult: TestScoringResult,
  topicWeightages: Record<string, number> | Array<{ topic: string; weightage: number }> = {}
): GapAnalysisReport {
  const weightMap: Record<string, number> = {};
  if (Array.isArray(topicWeightages)) {
    for (const item of topicWeightages) {
      if (item && item.topic) {
        weightMap[item.topic] = item.weightage;
      }
    }
  } else if (topicWeightages && typeof topicWeightages === 'object') {
    for (const [t, w] of Object.entries(topicWeightages)) {
      weightMap[t] = w;
    }
  }

  const topicEntries = Object.values(scoringResult.byTopic || {});
  const topicGaps: TopicGapItem[] = [];

  for (const tItem of topicEntries) {
    const topicName = tItem.name || tItem.key;
    const weightage = weightMap[topicName] ?? weightMap[tItem.key] ?? 1.0;
    const marksLost = tItem.marksLost;
    const accuracy = tItem.accuracy;

    const rawPriority =
      marksLost * 2.0 + (1.0 - accuracy) * 50.0 + weightage * 1.5;
    const priorityScore = Number(rawPriority.toFixed(2));

    const dominantErrorCategory = resolveDominantError(tItem.errorCategoryCounts);
    const { remedialDirective, recommendedAction } =
      getRemedialDirective(dominantErrorCategory);

    let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (priorityScore >= 70) {
      urgency = 'CRITICAL';
    } else if (priorityScore >= 45) {
      urgency = 'HIGH';
    } else if (priorityScore >= 25) {
      urgency = 'MEDIUM';
    } else {
      urgency = 'LOW';
    }

    topicGaps.push({
      topic: topicName,
      chapter: tItem.chapterKey,
      subject: tItem.subjectKey,
      totalQuestions: tItem.totalQuestions,
      attemptedQuestions: tItem.attemptedQuestions,
      correctQuestions: tItem.correctQuestions,
      incorrectQuestions: tItem.incorrectQuestions,
      unattemptedQuestions: tItem.unattemptedQuestions,
      totalMarks: tItem.totalMarks,
      marksScored: tItem.marksScored,
      marksLost,
      accuracy,
      weightage,
      priorityScore,
      rank: 0,
      dominantErrorCategory,
      errorDistribution: { ...tItem.errorCategoryCounts },
      remedialDirective,
      recommendedAction,
      urgency,
    });
  }

  topicGaps.sort((a, b) => b.priorityScore - a.priorityScore);
  topicGaps.forEach((gap, index) => {
    gap.rank = index + 1;
  });

  const breakdownByUrgency: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const gap of topicGaps) {
    breakdownByUrgency[gap.urgency] = (breakdownByUrgency[gap.urgency] || 0) + 1;
  }

  const dominantSystemicError = resolveDominantError(scoringResult.errorCategoryCounts);

  const systemicDirectives: string[] = [];
  const baseDirective = getRemedialDirective(dominantSystemicError);
  if (dominantSystemicError !== 'NONE') {
    systemicDirectives.push(baseDirective.remedialDirective);
  }
  if (breakdownByUrgency.CRITICAL > 0) {
    systemicDirectives.push(
      `Immediate remediation required for ${breakdownByUrgency.CRITICAL} critical topic gaps before proceeding to full-length tests.`
    );
  }
  if ((scoringResult.quadrantCounts.RUSHED_GUESS || 0) > 0) {
    systemicDirectives.push(
      `Eliminate uncalculated guesses: ${scoringResult.quadrantCounts.RUSHED_GUESS} questions were flagged as rushed guesses.`
    );
  }
  if ((scoringResult.quadrantCounts.BOTTLENECK || 0) > 0) {
    systemicDirectives.push(
      `Improve question triage: ${scoringResult.quadrantCounts.BOTTLENECK} bottleneck questions caused severe time drainage.`
    );
  }
  if (systemicDirectives.length === 0) {
    systemicDirectives.push(baseDirective.remedialDirective);
  }

  const overallPriorityScore =
    topicGaps.length > 0
      ? Number(
          (
            topicGaps.reduce((acc, g) => acc + g.priorityScore, 0) /
            topicGaps.length
          ).toFixed(2)
        )
      : 0;

  const totalMarksLost = scoringResult.marksLost;
  const averageAccuracy = scoringResult.accuracy;

  return {
    overallPriorityScore,
    totalMarksLost,
    averageAccuracy,
    criticalGapsCount: breakdownByUrgency.CRITICAL,
    topPriorityTopics: topicGaps.slice(0, 5),
    allTopicGaps: topicGaps,
    dominantSystemicError,
    systemicDirectives,
    breakdownByUrgency,
    generatedAt: Date.now(),
  };
}
