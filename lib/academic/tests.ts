export type UrgencyTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'EXPIRED';

export interface CountdownState {
  targetTimestamp: number;
  remainingMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  tier: UrgencyTier;
  isExpired: boolean;
  formatted: string;
}

export function computeExamCountdown(
  targetTimestamp: number,
  currentTimestamp: number = Date.now()
): CountdownState {
  const diff = targetTimestamp - currentTimestamp;
  const DAY_MS = 86400000;
  const HOUR_MS = 3600000;
  const MINUTE_MS = 60000;
  const SECOND_MS = 1000;

  if (diff <= 0) {
    return {
      targetTimestamp,
      remainingMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      tier: 'EXPIRED',
      isExpired: true,
      formatted: '00:00:00',
    };
  }

  const days = Math.floor(diff / DAY_MS);
  const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((diff % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((diff % MINUTE_MS) / SECOND_MS);

  let tier: UrgencyTier;
  if (diff <= DAY_MS) {
    tier = 'CRITICAL';
  } else if (diff <= 7 * DAY_MS) {
    tier = 'HIGH';
  } else if (diff <= 30 * DAY_MS) {
    tier = 'MEDIUM';
  } else {
    tier = 'LOW';
  }

  const pad = (val: number): string => (val < 10 ? '0' + val : String(val));
  const formatted =
    days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    targetTimestamp,
    remainingMs: diff,
    days,
    hours,
    minutes,
    seconds,
    tier,
    isExpired: false,
    formatted,
  };
}

export type PaletteState =
  | 'NOT_VISITED'
  | 'NOT_ANSWERED'
  | 'ANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_AND_MARKED_FOR_REVIEW';

export interface QuestionState {
  id: string;
  paletteState: PaletteState;
  response: any;
  timeSpentSeconds: number;
  visited: boolean;
  sectionId?: string;
}

export interface TestRunnerState {
  testId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questions: QuestionState[];
  durationSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  isStarted: boolean;
  isSubmitted: boolean;
  submittedAt?: number;
  paletteCounts: Record<PaletteState, number>;
}

export type RunnerAction =
  | { type: 'NAVIGATE_QUESTION'; payload: { index: number } }
  | { type: 'UPDATE_RESPONSE'; payload: { response: any; questionIndex?: number } }
  | { type: 'SAVE_AND_NEXT' }
  | { type: 'MARK_FOR_REVIEW_AND_NEXT' }
  | { type: 'CLEAR_RESPONSE'; payload?: { questionIndex?: number } }
  | { type: 'TICK_SECOND'; payload?: { seconds?: number } }
  | { type: 'SUBMIT'; payload?: { reason?: string } };

export function computePaletteCounts(questions: QuestionState[]): Record<PaletteState, number> {
  const counts: Record<PaletteState, number> = {
    NOT_VISITED: 0,
    NOT_ANSWERED: 0,
    ANSWERED: 0,
    MARKED_FOR_REVIEW: 0,
    ANSWERED_AND_MARKED_FOR_REVIEW: 0,
  };
  for (let i = 0; i < questions.length; i++) {
    const s = questions[i].paletteState;
    if (counts[s] !== undefined) {
      counts[s]++;
    }
  }
  return counts;
}

function hasResponseValue(response: any): boolean {
  if (response === null || response === undefined || response === '') {
    return false;
  }
  if (Array.isArray(response) && response.length === 0) {
    return false;
  }
  return true;
}

export function createInitialTestRunnerState(config: {
  testId: string;
  questions: Array<{ id: string; sectionId?: string }> | string[];
  durationSeconds: number;
}): TestRunnerState {
  const questions: QuestionState[] = config.questions.map((item, index) => {
    const id = typeof item === 'string' ? item : item.id;
    const sectionId = typeof item === 'string' ? undefined : item.sectionId;
    return {
      id,
      paletteState: index === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED',
      response: null,
      timeSpentSeconds: 0,
      visited: index === 0,
      sectionId,
    };
  });

  return {
    testId: config.testId,
    currentQuestionIndex: 0,
    totalQuestions: questions.length,
    questions,
    durationSeconds: config.durationSeconds,
    remainingSeconds: config.durationSeconds,
    elapsedSeconds: 0,
    isStarted: true,
    isSubmitted: false,
    paletteCounts: computePaletteCounts(questions),
  };
}

export function testRunnerReducer(state: TestRunnerState, action: RunnerAction): TestRunnerState {
  switch (action.type) {
    case 'NAVIGATE_QUESTION': {
      const targetIndex = action.payload.index;
      if (targetIndex < 0 || targetIndex >= state.questions.length) {
        return state;
      }
      if (state.isSubmitted) {
        return {
          ...state,
          currentQuestionIndex: targetIndex,
        };
      }
      const questions = state.questions.map((q, idx) => {
        if (idx === targetIndex && q.paletteState === 'NOT_VISITED') {
          return {
            ...q,
            paletteState: 'NOT_ANSWERED' as PaletteState,
            visited: true,
          };
        }
        return q;
      });
      return {
        ...state,
        currentQuestionIndex: targetIndex,
        questions,
        paletteCounts: computePaletteCounts(questions),
      };
    }

    case 'UPDATE_RESPONSE': {
      if (state.isSubmitted) {
        return state;
      }
      const targetIndex = action.payload.questionIndex ?? state.currentQuestionIndex;
      if (targetIndex < 0 || targetIndex >= state.questions.length) {
        return state;
      }
      const questions = state.questions.map((q, idx) => {
        if (idx === targetIndex) {
          return {
            ...q,
            response: action.payload.response,
          };
        }
        return q;
      });
      return {
        ...state,
        questions,
      };
    }

    case 'SAVE_AND_NEXT': {
      if (state.isSubmitted) {
        return state;
      }
      const currentIdx = state.currentQuestionIndex;
      const currentQ = state.questions[currentIdx];
      if (!currentQ) {
        return state;
      }
      const hasAnswer = hasResponseValue(currentQ.response);
      const newCurrentPalette: PaletteState = hasAnswer ? 'ANSWERED' : 'NOT_ANSWERED';
      const nextIdx = currentIdx + 1 < state.questions.length ? currentIdx + 1 : currentIdx;

      const questions = state.questions.map((q, idx) => {
        if (idx === currentIdx) {
          return {
            ...q,
            paletteState: newCurrentPalette,
            visited: true,
          };
        }
        if (idx === nextIdx && nextIdx !== currentIdx && q.paletteState === 'NOT_VISITED') {
          return {
            ...q,
            paletteState: 'NOT_ANSWERED' as PaletteState,
            visited: true,
          };
        }
        return q;
      });

      return {
        ...state,
        currentQuestionIndex: nextIdx,
        questions,
        paletteCounts: computePaletteCounts(questions),
      };
    }

    case 'MARK_FOR_REVIEW_AND_NEXT': {
      if (state.isSubmitted) {
        return state;
      }
      const currentIdx = state.currentQuestionIndex;
      const currentQ = state.questions[currentIdx];
      if (!currentQ) {
        return state;
      }
      const hasAnswer = hasResponseValue(currentQ.response);
      const newCurrentPalette: PaletteState = hasAnswer
        ? 'ANSWERED_AND_MARKED_FOR_REVIEW'
        : 'MARKED_FOR_REVIEW';
      const nextIdx = currentIdx + 1 < state.questions.length ? currentIdx + 1 : currentIdx;

      const questions = state.questions.map((q, idx) => {
        if (idx === currentIdx) {
          return {
            ...q,
            paletteState: newCurrentPalette,
            visited: true,
          };
        }
        if (idx === nextIdx && nextIdx !== currentIdx && q.paletteState === 'NOT_VISITED') {
          return {
            ...q,
            paletteState: 'NOT_ANSWERED' as PaletteState,
            visited: true,
          };
        }
        return q;
      });

      return {
        ...state,
        currentQuestionIndex: nextIdx,
        questions,
        paletteCounts: computePaletteCounts(questions),
      };
    }

    case 'CLEAR_RESPONSE': {
      if (state.isSubmitted) {
        return state;
      }
      const targetIndex = action.payload?.questionIndex ?? state.currentQuestionIndex;
      if (targetIndex < 0 || targetIndex >= state.questions.length) {
        return state;
      }
      const questions = state.questions.map((q, idx) => {
        if (idx === targetIndex) {
          return {
            ...q,
            response: null,
            paletteState: 'NOT_ANSWERED' as PaletteState,
          };
        }
        return q;
      });
      return {
        ...state,
        questions,
        paletteCounts: computePaletteCounts(questions),
      };
    }

    case 'TICK_SECOND': {
      if (state.isSubmitted) {
        return state;
      }
      const seconds = action.payload?.seconds ?? 1;
      const remainingSeconds = Math.max(0, state.remainingSeconds - seconds);
      const elapsedSeconds = state.elapsedSeconds + seconds;
      const isAutoSubmit = remainingSeconds === 0;

      const questions = state.questions.map((q, idx) => {
        if (idx === state.currentQuestionIndex) {
          return {
            ...q,
            timeSpentSeconds: q.timeSpentSeconds + seconds,
          };
        }
        return q;
      });

      return {
        ...state,
        remainingSeconds,
        elapsedSeconds,
        questions,
        isSubmitted: isAutoSubmit,
        submittedAt: isAutoSubmit ? Date.now() : state.submittedAt,
        paletteCounts: computePaletteCounts(questions),
      };
    }

    case 'SUBMIT': {
      if (state.isSubmitted) {
        return state;
      }
      return {
        ...state,
        isSubmitted: true,
        submittedAt: Date.now(),
      };
    }

    default:
      return state;
  }
}

export interface WallClockTimerConfig {
  serverStartTime: number;
  durationSeconds: number;
  clientSyncTime?: number;
  onTick?: (remainingSeconds: number, elapsedSeconds: number) => void;
  onExpire?: () => void;
  onTamperDetected?: (skewMs: number) => void;
  tickIntervalMs?: number;
}

export class WallClockTimer {
  private serverStartTime: number;
  private durationMs: number;
  private clientSyncTime: number;
  private initialMonotonicTime: number;
  private baseElapsedMs: number;
  private onTick?: (remainingSeconds: number, elapsedSeconds: number) => void;
  private onExpire?: () => void;
  private onTamperDetected?: (skewMs: number) => void;
  private tickIntervalMs: number;
  private timerHandle: any = null;
  private running: boolean = false;
  private expired: boolean = false;
  private boundVisibilityHandler: () => void;
  private boundFocusHandler: () => void;

  constructor(config: WallClockTimerConfig) {
    this.serverStartTime = config.serverStartTime;
    this.durationMs = config.durationSeconds * 1000;
    this.clientSyncTime = config.clientSyncTime ?? Date.now();
    this.initialMonotonicTime = this.getMonotonicNow();
    this.baseElapsedMs = Math.max(0, this.clientSyncTime - this.serverStartTime);
    this.onTick = config.onTick;
    this.onExpire = config.onExpire;
    this.onTamperDetected = config.onTamperDetected;
    this.tickIntervalMs = config.tickIntervalMs ?? 1000;

    this.boundVisibilityHandler = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.tick();
      }
    };
    this.boundFocusHandler = () => {
      this.tick();
    };
  }

  private getMonotonicNow(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  public start(): void {
    if (this.running || this.expired) {
      return;
    }
    this.running = true;

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('focus', this.boundFocusHandler);
    }

    this.timerHandle = setInterval(() => {
      this.tick();
    }, this.tickIntervalMs);

    this.tick();
  }

  public stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('focus', this.boundFocusHandler);
    }
  }

  public destroy(): void {
    this.stop();
  }

  public tick(): void {
    if (!this.running && !this.expired) {
      return;
    }
    const remaining = this.getRemainingSeconds();
    const elapsed = this.getElapsedSeconds();

    if (this.onTick) {
      this.onTick(remaining, elapsed);
    }

    if (remaining <= 0 && !this.expired) {
      this.expired = true;
      this.stop();
      if (this.onExpire) {
        this.onExpire();
      }
    }
  }

  public getRemainingSeconds(): number {
    const elapsedMs = this.computeEffectiveElapsedMs();
    const remainingMs = Math.max(0, this.durationMs - elapsedMs);
    return Math.ceil(remainingMs / 1000);
  }

  public getElapsedSeconds(): number {
    const elapsedMs = this.computeEffectiveElapsedMs();
    const totalSeconds = Math.floor(this.durationMs / 1000);
    return Math.min(totalSeconds, Math.floor(elapsedMs / 1000));
  }

  public isExpired(): boolean {
    return this.expired || this.getRemainingSeconds() <= 0;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public syncWithServer(serverCurrentTime: number): void {
    const serverElapsed = Math.max(0, serverCurrentTime - this.serverStartTime);
    this.baseElapsedMs = serverElapsed;
    this.clientSyncTime = Date.now();
    this.initialMonotonicTime = this.getMonotonicNow();
    this.tick();
  }

  private computeEffectiveElapsedMs(): number {
    const monotonicDelta = this.getMonotonicNow() - this.initialMonotonicTime;
    const clientWallDelta = Date.now() - this.clientSyncTime;

    const drift = clientWallDelta - monotonicDelta;
    if (Math.abs(drift) > 3000 && this.onTamperDetected) {
      this.onTamperDetected(drift);
    }

    const sessionElapsed = Math.max(monotonicDelta, clientWallDelta);
    return this.baseElapsedMs + sessionElapsed;
  }
}
