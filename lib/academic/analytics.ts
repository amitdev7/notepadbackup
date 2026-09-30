export interface StudentMarkEntry {
  id?: string;
  subject?: string;
  name?: string;
  title?: string;
  score?: number;
  scored?: number;
  scoredMarks?: number;
  total?: number;
  max?: number;
  maxMarks?: number;
  totalMarks?: number;
  weight?: number;
}

export interface SubjectAggregateResult {
  totalScored: number;
  totalMax: number;
  overallPercentage: number;
  weightedPercentage: number;
  letterGrade: string;
}

export const DEFAULT_GRADE_THRESHOLDS: Record<string, number> = {
  "A+": 90,
  "A": 80,
  "B": 70,
  "C": 60,
  "D": 50,
  "F": 0,
};

function getLetterGrade(
  percentage: number,
  thresholds: Record<string, number> = DEFAULT_GRADE_THRESHOLDS
): string {
  const sorted = Object.entries(thresholds).sort((a, b) => b[1] - a[1]);
  for (const [grade, minScore] of sorted) {
    if (percentage >= minScore) {
      return grade;
    }
  }
  return sorted.length > 0 ? sorted[sorted.length - 1][0] : "F";
}

export function calculateSubjectAggregate(
  marksEntries: StudentMarkEntry[],
  gradeThresholds: Record<string, number> = DEFAULT_GRADE_THRESHOLDS
): SubjectAggregateResult {
  if (!marksEntries || marksEntries.length === 0) {
    const defaultGrade = getLetterGrade(0, gradeThresholds);
    return {
      totalScored: 0,
      totalMax: 0,
      overallPercentage: 0,
      weightedPercentage: 0,
      letterGrade: defaultGrade,
    };
  }

  let totalScored = 0;
  let totalMax = 0;
  let totalWeight = 0;
  let weightedScoreSum = 0;
  const hasExplicitWeights = marksEntries.some(
    (e) => typeof e.weight === "number" && !isNaN(e.weight)
  );

  for (const entry of marksEntries) {
    const scored =
      typeof entry.scored === "number" && !isNaN(entry.scored)
        ? entry.scored
        : typeof entry.score === "number" && !isNaN(entry.score)
        ? entry.score
        : typeof entry.scoredMarks === "number" && !isNaN(entry.scoredMarks)
        ? entry.scoredMarks
        : 0;

    const max =
      typeof entry.max === "number" && !isNaN(entry.max)
        ? entry.max
        : typeof entry.total === "number" && !isNaN(entry.total)
        ? entry.total
        : typeof entry.maxMarks === "number" && !isNaN(entry.maxMarks)
        ? entry.maxMarks
        : typeof entry.totalMarks === "number" && !isNaN(entry.totalMarks)
        ? entry.totalMarks
        : 100;

    totalScored += scored;
    totalMax += max;

    const entryPct = max > 0 ? (scored / max) * 100 : 0;
    const weight =
      typeof entry.weight === "number" && !isNaN(entry.weight)
        ? entry.weight
        : 1;

    totalWeight += weight;
    weightedScoreSum += entryPct * weight;
  }

  const overallPercentage = totalMax > 0 ? (totalScored / totalMax) * 100 : 0;
  const weightedPercentage = hasExplicitWeights
    ? totalWeight > 0
      ? weightedScoreSum / totalWeight
      : 0
    : overallPercentage;

  const letterGrade = getLetterGrade(weightedPercentage, gradeThresholds);

  return {
    totalScored,
    totalMax,
    overallPercentage,
    weightedPercentage,
    letterGrade,
  };
}

export interface TrendPoint {
  date: string;
  percentage: number;
}

export interface PerformanceTrendResult {
  slope: number;
  intercept: number;
  direction: "improving" | "declining" | "stable";
}

export function calculatePerformanceTrend(
  scores: TrendPoint[]
): PerformanceTrendResult {
  if (!scores || scores.length === 0) {
    return {
      slope: 0,
      intercept: 0,
      direction: "stable",
    };
  }

  const sorted = [...scores].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (isNaN(timeA) || isNaN(timeB)) {
      return 0;
    }
    return timeA - timeB;
  });

  const n = sorted.length;
  if (n === 1) {
    return {
      slope: 0,
      intercept: sorted[0].percentage,
      direction: "stable",
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    const pct = typeof sorted[i].percentage === "number" && !isNaN(sorted[i].percentage) ? sorted[i].percentage : 0;
    sumX += i;
    sumY += pct;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const pct = typeof sorted[i].percentage === "number" && !isNaN(sorted[i].percentage) ? sorted[i].percentage : 0;
    const diffX = i - meanX;
    const diffY = pct - meanY;
    numerator += diffX * diffY;
    denominator += diffX * diffX;
  }

  if (denominator === 0 || isNaN(denominator) || isNaN(numerator)) {
    return {
      slope: 0,
      intercept: isNaN(meanY) ? 0 : meanY,
      direction: "stable",
    };
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  let direction: "improving" | "declining" | "stable" = "stable";
  if (slope > 1e-9) {
    direction = "improving";
  } else if (slope < -1e-9) {
    direction = "declining";
  }

  return {
    slope,
    intercept,
    direction,
  };
}

export interface TopicAnalyticsInput {
  topicId?: string;
  id?: string;
  topicName?: string;
  name?: string;
  title?: string;
  accuracy?: number;
  mistakeCount?: number;
  mistakes?: number;
  incorrectCount?: number;
  confidence?: number;
  confidenceLevel?: number;
  unattempted?: boolean;
  isUnattempted?: boolean;
  totalQuestions?: number;
  attemptedQuestions?: number;
  attempts?: number;
}

export interface WeakTopicResult {
  topicId: string;
  topicName: string;
  wsi: number;
  isWeak: boolean;
}

export function calculateWSI(
  accuracy: number,
  mistakeCount: number,
  confidence: number,
  unattempted: boolean
): number {
  const safeAcc = typeof accuracy === "number" && !isNaN(accuracy) ? accuracy : 0;
  let normAcc = safeAcc > 1.0 ? safeAcc / 100.0 : safeAcc;
  normAcc = Math.max(0.0, Math.min(1.0, normAcc));
  const safeMistakes = typeof mistakeCount === "number" && !isNaN(mistakeCount) ? mistakeCount : 0;
  const mistClamped = Math.max(0, safeMistakes);
  const safeConf = typeof confidence === "number" && !isNaN(confidence) ? confidence : 3;
  const confClamped = Math.max(1, Math.min(5, safeConf));
  const iUnattempted = unattempted ? 1.0 : 0.0;

  const wsi =
    40.0 * (1.0 - normAcc) +
    25.0 * Math.min(1.0, mistClamped / 5.0) +
    20.0 * ((5.0 - confClamped) / 4.0) +
    15.0 * iUnattempted;

  const res = Math.max(0.0, Math.min(100.0, wsi));
  return isNaN(res) ? 0 : res;
}

export function calculateTopicWSI(topic: TopicAnalyticsInput): {
  wsi: number;
  isWeak: boolean;
} {
  let isUnattempted = false;
  if (topic.unattempted === true || topic.isUnattempted === true) {
    isUnattempted = true;
  } else if (typeof topic.attempts === "number" && topic.attempts === 0) {
    isUnattempted = true;
  } else if (
    typeof topic.attemptedQuestions === "number" &&
    topic.attemptedQuestions === 0
  ) {
    isUnattempted = true;
  }

  let rawAccuracy = 0;
  if (typeof topic.accuracy === "number") {
    rawAccuracy = topic.accuracy;
  }

  let normalizedAccuracy = rawAccuracy;
  if (normalizedAccuracy > 1.0) {
    normalizedAccuracy = normalizedAccuracy / 100.0;
  }
  normalizedAccuracy = Math.max(0.0, Math.min(1.0, normalizedAccuracy));

  const mistakeCount =
    typeof topic.mistakeCount === "number"
      ? topic.mistakeCount
      : typeof topic.mistakes === "number"
      ? topic.mistakes
      : typeof topic.incorrectCount === "number"
      ? topic.incorrectCount
      : 0;

  let confidence = 3;
  if (typeof topic.confidence === "number") {
    confidence = topic.confidence;
  } else if (typeof topic.confidenceLevel === "number") {
    confidence = topic.confidenceLevel;
  }

  const wsi = calculateWSI(
    normalizedAccuracy,
    mistakeCount,
    confidence,
    isUnattempted
  );

  const isWeak = wsi >= 60.0 || normalizedAccuracy < 0.6;

  return {
    wsi,
    isWeak,
  };
}

export function detectWeakTopics(
  topicsData: TopicAnalyticsInput[]
): WeakTopicResult[] {
  if (!topicsData || !Array.isArray(topicsData)) {
    return [];
  }

  return topicsData.map((topic, index) => {
    const topicId =
      topic.topicId ?? topic.id ?? `topic_${index + 1}`;
    const topicName =
      topic.topicName ?? topic.name ?? topic.title ?? `Topic ${index + 1}`;

    const { wsi, isWeak } = calculateTopicWSI(topic);

    return {
      topicId,
      topicName,
      wsi,
      isWeak,
    };
  });
}

export interface StudyStreakResult {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
}

function parseDateToUtcDays(dateStr: string): number | null {
  const cleanStr = dateStr.includes("T")
    ? dateStr.split("T")[0]
    : dateStr.trim().slice(0, 10);
  const parts = cleanStr.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return Math.floor(
      Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000
    );
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return null;
  }
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000
  );
}

export function calculateStudyStreak(
  dailyStudyMinutes: Record<string, number>,
  currentDateIso: string
): StudyStreakResult {
  const currentUtcDay = parseDateToUtcDays(currentDateIso);
  const curDayKey = currentDateIso.includes("T")
    ? currentDateIso.split("T")[0]
    : currentDateIso.trim().slice(0, 10);

  const aggregatedByDay: Record<string, number> = {};
  for (const [key, minutes] of Object.entries(dailyStudyMinutes || {})) {
    if (typeof minutes !== "number" || isNaN(minutes)) {
      continue;
    }
    const dayKey = key.includes("T")
      ? key.split("T")[0]
      : key.trim().slice(0, 10);
    aggregatedByDay[dayKey] = (aggregatedByDay[dayKey] ?? 0) + minutes;
  }

  const activeToday = (aggregatedByDay[curDayKey] ?? 0) >= 20;

  if (currentUtcDay === null) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeToday,
    };
  }

  const allQualifyingDays: number[] = [];
  const qualifyingDaysUpToCurrent: number[] = [];

  for (const [dayKey, minutes] of Object.entries(aggregatedByDay)) {
    if (minutes >= 20) {
      const utcDay = parseDateToUtcDays(dayKey);
      if (utcDay !== null) {
        allQualifyingDays.push(utcDay);
        if (utcDay <= currentUtcDay) {
          qualifyingDaysUpToCurrent.push(utcDay);
        }
      }
    }
  }

  allQualifyingDays.sort((a, b) => a - b);
  qualifyingDaysUpToCurrent.sort((a, b) => a - b);

  const uniqueAllDays = Array.from(new Set(allQualifyingDays));
  const uniqueDaysUpToCurrent = Array.from(new Set(qualifyingDaysUpToCurrent));

  let longestStreak = 0;
  if (uniqueAllDays.length > 0) {
    let currentIslandLen = 1;
    let currentIslandEnd = uniqueAllDays[0];

    for (let i = 1; i < uniqueAllDays.length; i++) {
      if (uniqueAllDays[i] === currentIslandEnd + 1) {
        currentIslandEnd = uniqueAllDays[i];
        currentIslandLen++;
      } else {
        if (currentIslandLen > longestStreak) {
          longestStreak = currentIslandLen;
        }
        currentIslandEnd = uniqueAllDays[i];
        currentIslandLen = 1;
      }
    }
    if (currentIslandLen > longestStreak) {
      longestStreak = currentIslandLen;
    }
  }

  let currentStreak = 0;
  if (uniqueDaysUpToCurrent.length > 0) {
    let currentIslandLen = 1;
    let currentIslandEnd = uniqueDaysUpToCurrent[0];

    for (let i = 1; i < uniqueDaysUpToCurrent.length; i++) {
      if (uniqueDaysUpToCurrent[i] === currentIslandEnd + 1) {
        currentIslandEnd = uniqueDaysUpToCurrent[i];
        currentIslandLen++;
      } else {
        currentIslandEnd = uniqueDaysUpToCurrent[i];
        currentIslandLen = 1;
      }
    }

    if (
      currentIslandEnd === currentUtcDay ||
      currentIslandEnd === currentUtcDay - 1
    ) {
      currentStreak = currentIslandLen;
    }
  }

  return {
    currentStreak,
    longestStreak,
    activeToday,
  };
}

export type PomodoroState =
  | "IDLE"
  | "RUNNING_WORK"
  | "PAUSED_WORK"
  | "RUNNING_BREAK"
  | "PAUSED_BREAK"
  | "COMPLETED";

export const PomodoroState = {
  IDLE: "IDLE",
  RUNNING_WORK: "RUNNING_WORK",
  PAUSED_WORK: "PAUSED_WORK",
  RUNNING_BREAK: "RUNNING_BREAK",
  PAUSED_BREAK: "PAUSED_BREAK",
  COMPLETED: "COMPLETED",
} as const;

export type PomodoroAction =
  | "START"
  | "PAUSE"
  | "RESUME"
  | "TAKE_BREAK"
  | "START_BREAK"
  | "COMPLETE"
  | "RESET"
  | "STOP";

export function calculateFocusEfficiencyScore(
  workDuration: number,
  targetDuration: number,
  distractionCount: number = 0
): number {
  if (!Number.isFinite(targetDuration) || targetDuration <= 0) {
    return 0;
  }
  const tWork = Math.max(0, Number.isFinite(workDuration) ? workDuration : 0);
  const nDistractions = Math.max(0, Number.isFinite(distractionCount) ? distractionCount : 0);
  const rawScore = 100.0 * (tWork / targetDuration) - 10.0 * nDistractions;
  const res = Math.max(0.0, Math.min(100.0, rawScore));
  return isNaN(res) ? 0 : res;
}

export const calculateFES = calculateFocusEfficiencyScore;

export function transitionPomodoro(
  currentState: PomodoroState,
  action: PomodoroAction | string
): PomodoroState {
  const act = action.toUpperCase();

  switch (currentState) {
    case "IDLE":
      if (act === "START" || act === "START_WORK") {
        return "RUNNING_WORK";
      }
      return currentState;

    case "RUNNING_WORK":
      if (act === "PAUSE") {
        return "PAUSED_WORK";
      }
      if (act === "TAKE_BREAK" || act === "START_BREAK" || act === "BREAK") {
        return "RUNNING_BREAK";
      }
      if (act === "COMPLETE" || act === "FINISH") {
        return "COMPLETED";
      }
      if (act === "RESET" || act === "STOP") {
        return "IDLE";
      }
      return currentState;

    case "PAUSED_WORK":
      if (act === "RESUME" || act === "START") {
        return "RUNNING_WORK";
      }
      if (act === "RESET" || act === "STOP") {
        return "IDLE";
      }
      return currentState;

    case "RUNNING_BREAK":
      if (act === "PAUSE") {
        return "PAUSED_BREAK";
      }
      if (act === "START_WORK" || act === "WORK" || act === "RESUME_WORK") {
        return "RUNNING_WORK";
      }
      if (act === "COMPLETE" || act === "FINISH") {
        return "COMPLETED";
      }
      if (act === "RESET" || act === "STOP") {
        return "IDLE";
      }
      return currentState;

    case "PAUSED_BREAK":
      if (act === "RESUME" || act === "START") {
        return "RUNNING_BREAK";
      }
      if (act === "RESET" || act === "STOP") {
        return "IDLE";
      }
      return currentState;

    case "COMPLETED":
      if (act === "RESET" || act === "START" || act === "IDLE") {
        return "IDLE";
      }
      return currentState;

    default:
      return currentState;
  }
}

export interface PomodoroSessionConfig {
  targetWorkDuration?: number;
  targetBreakDuration?: number;
}

export class PomodoroSession {
  private _state: PomodoroState = "IDLE";
  private _workDuration: number = 0;
  private _targetDuration: number;
  private _breakDuration: number = 0;
  private _targetBreakDuration: number;
  private _distractions: number = 0;

  constructor(
    targetWorkDurationOrConfig?: number | PomodoroSessionConfig,
    targetBreakDuration?: number
  ) {
    if (
      typeof targetWorkDurationOrConfig === "object" &&
      targetWorkDurationOrConfig !== null
    ) {
      this._targetDuration =
        targetWorkDurationOrConfig.targetWorkDuration ?? 1500;
      this._targetBreakDuration =
        targetWorkDurationOrConfig.targetBreakDuration ?? 300;
    } else {
      this._targetDuration =
        typeof targetWorkDurationOrConfig === "number"
          ? targetWorkDurationOrConfig
          : 1500;
      this._targetBreakDuration =
        typeof targetBreakDuration === "number" ? targetBreakDuration : 300;
    }
  }

  get state(): PomodoroState {
    return this._state;
  }

  set state(newState: PomodoroState) {
    this._state = newState;
  }

  get workDuration(): number {
    return this._workDuration;
  }

  set workDuration(val: number) {
    this._workDuration = val;
  }

  get targetDuration(): number {
    return this._targetDuration;
  }

  set targetDuration(val: number) {
    this._targetDuration = val;
  }

  get breakDuration(): number {
    return this._breakDuration;
  }

  set breakDuration(val: number) {
    this._breakDuration = val;
  }

  get targetBreakDuration(): number {
    return this._targetBreakDuration;
  }

  set targetBreakDuration(val: number) {
    this._targetBreakDuration = val;
  }

  get distractions(): number {
    return this._distractions;
  }

  set distractions(val: number) {
    this._distractions = val;
  }

  get distractionCount(): number {
    return this._distractions;
  }

  set distractionCount(val: number) {
    this._distractions = val;
  }

  get fes(): number {
    return calculateFocusEfficiencyScore(
      this._workDuration,
      this._targetDuration,
      this._distractions
    );
  }

  start(): void {
    this._state = transitionPomodoro(this._state, "START");
  }

  pause(): void {
    this._state = transitionPomodoro(this._state, "PAUSE");
  }

  resume(): void {
    this._state = transitionPomodoro(this._state, "RESUME");
  }

  startBreak(): void {
    this._state = transitionPomodoro(this._state, "START_BREAK");
  }

  complete(): void {
    this._state = transitionPomodoro(this._state, "COMPLETE");
  }

  reset(): void {
    this._state = "IDLE";
    this._workDuration = 0;
    this._breakDuration = 0;
    this._distractions = 0;
  }

  recordDistraction(count: number = 1): void {
    this._distractions += Math.max(0, count);
  }

  addDistraction(count: number = 1): void {
    this.recordDistraction(count);
  }

  tick(seconds: number = 1): void {
    if (this._state === "RUNNING_WORK") {
      this._workDuration += seconds;
      if (this._workDuration >= this._targetDuration) {
        this._state = "COMPLETED";
      }
    } else if (this._state === "RUNNING_BREAK") {
      this._breakDuration += seconds;
    }
  }

  getScore(): number {
    return this.fes;
  }

  calculateScore(): number {
    return this.fes;
  }
}
