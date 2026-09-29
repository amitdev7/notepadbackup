import {
  calculateSubjectAggregate,
  calculatePerformanceTrend,
  detectWeakTopics,
  calculateStudyStreak,
  calculateFocusEfficiencyScore,
  calculateFES,
  calculateWSI,
  transitionPomodoro,
  PomodoroSession,
  PomodoroState,
  DEFAULT_GRADE_THRESHOLDS,
} from "../lib/academic/analytics.ts";

let passed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function close(a: number, b: number, eps = 1e-4) {
  return Math.abs(a - b) <= eps;
}

// 1. calculateSubjectAggregate tests
{
  const emptyRes = calculateSubjectAggregate([]);
  check("aggregate: empty totalScored", emptyRes.totalScored === 0);
  check("aggregate: empty totalMax", emptyRes.totalMax === 0);
  check("aggregate: empty overallPercentage", emptyRes.overallPercentage === 0);
  check("aggregate: empty weightedPercentage", emptyRes.weightedPercentage === 0);
  check("aggregate: empty letterGrade", emptyRes.letterGrade === "F");

  const unweighted = calculateSubjectAggregate([
    { scored: 80, max: 100 },
    { scored: 90, max: 100 },
  ]);
  check("aggregate: unweighted totalScored", unweighted.totalScored === 170);
  check("aggregate: unweighted totalMax", unweighted.totalMax === 200);
  check("aggregate: unweighted overallPercentage", unweighted.overallPercentage === 85);
  check("aggregate: unweighted weightedPercentage", unweighted.weightedPercentage === 85);
  check("aggregate: unweighted letterGrade", unweighted.letterGrade === "A");

  const weighted = calculateSubjectAggregate([
    { scored: 40, max: 50, weight: 0.3 }, // 80%
    { scored: 90, max: 100, weight: 0.7 }, // 90%
  ]);
  // 80 * 0.3 + 90 * 0.7 = 24 + 63 = 87
  check("aggregate: weighted totalScored", weighted.totalScored === 130);
  check("aggregate: weighted totalMax", weighted.totalMax === 150);
  check("aggregate: weighted overallPercentage", close(weighted.overallPercentage, (130 / 150) * 100));
  check("aggregate: weighted weightedPercentage", close(weighted.weightedPercentage, 87));
  check("aggregate: weighted letterGrade", weighted.letterGrade === "A");

  // Thresholds check
  const gradeAplus = calculateSubjectAggregate([{ scored: 95, max: 100 }]);
  check("grade: A+", gradeAplus.letterGrade === "A+");
  const gradeA = calculateSubjectAggregate([{ scored: 85, max: 100 }]);
  check("grade: A", gradeA.letterGrade === "A");
  const gradeB = calculateSubjectAggregate([{ scored: 75, max: 100 }]);
  check("grade: B", gradeB.letterGrade === "B");
  const gradeC = calculateSubjectAggregate([{ scored: 65, max: 100 }]);
  check("grade: C", gradeC.letterGrade === "C");
  const gradeD = calculateSubjectAggregate([{ scored: 55, max: 100 }]);
  check("grade: D", gradeD.letterGrade === "D");
  const gradeF = calculateSubjectAggregate([{ scored: 45, max: 100 }]);
  check("grade: F", gradeF.letterGrade === "F");

  // Custom thresholds
  const custom = calculateSubjectAggregate(
    [{ scored: 85, max: 100 }],
    { "HD": 85, "D": 75, "C": 65, "P": 50, "F": 0 }
  );
  check("grade: custom HD", custom.letterGrade === "HD");
}

// 2. calculatePerformanceTrend tests
{
  const emptyTrend = calculatePerformanceTrend([]);
  check("trend: empty", emptyTrend.slope === 0 && emptyTrend.intercept === 0 && emptyTrend.direction === "stable");

  const singleTrend = calculatePerformanceTrend([{ date: "2026-09-01", percentage: 80 }]);
  check("trend: single", singleTrend.slope === 0 && singleTrend.intercept === 80 && singleTrend.direction === "stable");

  // Improving: (0, 60), (1, 70), (2, 80)
  // slope = 10, intercept = 60
  const improving = calculatePerformanceTrend([
    { date: "2026-09-03", percentage: 80 },
    { date: "2026-09-01", percentage: 60 },
    { date: "2026-09-02", percentage: 70 },
  ]);
  check("trend: improving slope", close(improving.slope, 10));
  check("trend: improving intercept", close(improving.intercept, 60));
  check("trend: improving direction", improving.direction === "improving");

  // Declining: (0, 80), (1, 70), (2, 60)
  // slope = -10, intercept = 80
  const declining = calculatePerformanceTrend([
    { date: "2026-09-01", percentage: 80 },
    { date: "2026-09-02", percentage: 70 },
    { date: "2026-09-03", percentage: 60 },
  ]);
  check("trend: declining slope", close(declining.slope, -10));
  check("trend: declining intercept", close(declining.intercept, 80));
  check("trend: declining direction", declining.direction === "declining");

  // Stable: (0, 75), (1, 75), (2, 75)
  const stable = calculatePerformanceTrend([
    { date: "2026-09-01", percentage: 75 },
    { date: "2026-09-02", percentage: 75 },
    { date: "2026-09-03", percentage: 75 },
  ]);
  check("trend: stable slope", close(stable.slope, 0));
  check("trend: stable intercept", close(stable.intercept, 75));
  check("trend: stable direction", stable.direction === "stable");
}

// 3. detectWeakTopics & calculateWSI tests
{
  // Formula: WSI = 40 * (1 - Acc) + 25 * min(1, MistakeCount / 5) + 20 * ((5 - Confidence) / 4) + 15 * I_unattempted
  // Perfect score: Acc = 1.0, Mistakes = 0, Conf = 5, Unattempted = false
  // WSI = 40*0 + 25*0 + 20*0 + 15*0 = 0
  const perfectWsi = calculateWSI(1.0, 0, 5, false);
  check("wsi: perfect", perfectWsi === 0);

  // Worst score: Acc = 0.0, Mistakes = 5, Conf = 1, Unattempted = true
  // WSI = 40*1 + 25*1 + 20*1 + 15*1 = 100
  const worstWsi = calculateWSI(0.0, 5, 1, true);
  check("wsi: worst", worstWsi === 100);

  // Partial: Acc = 0.8, Mistakes = 2, Conf = 4, Unattempted = false
  // 40 * 0.2 + 25 * (2/5) + 20 * (1/4) + 0 = 8 + 10 + 5 = 23
  const partialWsi = calculateWSI(0.8, 2, 4, false);
  check("wsi: partial", close(partialWsi, 23));

  // detectWeakTopics
  const topics = detectWeakTopics([
    {
      topicId: "t1",
      topicName: "Algebra",
      accuracy: 0.9,
      mistakeCount: 1,
      confidence: 4,
      unattempted: false,
    },
    {
      topicId: "t2",
      topicName: "Calculus",
      accuracy: 0.5, // < 0.60 -> weak!
      mistakeCount: 4,
      confidence: 2,
      unattempted: false,
    },
    {
      topicId: "t3",
      topicName: "Statistics",
      unattempted: true,
      accuracy: 0,
      confidence: 1,
    },
  ]);

  check("detectWeakTopics count", topics.length === 3);
  check("detectWeakTopics t1 not weak", !topics[0].isWeak);
  check("detectWeakTopics t2 weak (accuracy < 60%)", topics[1].isWeak);
  check("detectWeakTopics t3 weak (unattempted & high WSI)", topics[2].isWeak && topics[2].wsi >= 60);
}

// 4. calculateStudyStreak tests
{
  const studyData: Record<string, number> = {
    "2026-09-20": 30, // active
    "2026-09-21": 25, // active
    "2026-09-22": 45, // active -> island of 3
    "2026-09-23": 10, // gap (< 20)
    "2026-09-24": 20, // active
    "2026-09-25": 35, // active -> island of 2
    "2026-09-26": 0,  // gap
    "2026-09-27": 25, // active
    "2026-09-28": 30, // active (yesterday)
    "2026-09-29": 20, // active (today)
  };

  const streakTodayActive = calculateStudyStreak(studyData, "2026-09-29");
  check("streak: longestStreak is 3", streakTodayActive.longestStreak === 3);
  check("streak: currentStreak is 3 (27, 28, 29)", streakTodayActive.currentStreak === 3);
  check("streak: activeToday is true", streakTodayActive.activeToday === true);

  // Today not yet studied (0 min)
  const studyDataYesterday = { ...studyData, "2026-09-29": 0 };
  const streakYesterday = calculateStudyStreak(studyDataYesterday, "2026-09-29");
  check("streak: ongoing streak from yesterday preserved", streakYesterday.currentStreak === 2);
  check("streak: activeToday false", streakYesterday.activeToday === false);
  check("streak: longestStreak still 3", streakYesterday.longestStreak === 3);

  // Lapsed streak (yesterday also 0)
  const studyDataLapsed = { ...studyData, "2026-09-28": 0, "2026-09-29": 0 };
  const streakLapsed = calculateStudyStreak(studyDataLapsed, "2026-09-29");
  check("streak: lapsed currentStreak 0", streakLapsed.currentStreak === 0);
  check("streak: activeToday false", streakLapsed.activeToday === false);

  // Empty data
  const streakEmpty = calculateStudyStreak({}, "2026-09-29");
  check("streak: empty currentStreak 0", streakEmpty.currentStreak === 0);
  check("streak: empty longestStreak 0", streakEmpty.longestStreak === 0);
  check("streak: empty activeToday false", streakEmpty.activeToday === false);
}

// 5. Pomodoro Focus Session & Focus Efficiency Score (FES)
{
  // FES = max(0, min(100, 100 * (Twork / Ttarget) - 10 * Ndistractions))
  // Perfect: Twork = 1500, Ttarget = 1500, Ndistractions = 0 -> 100
  check("fes: perfect", calculateFocusEfficiencyScore(1500, 1500, 0) === 100);

  // Distraction penalty: 100 - 10*2 = 80
  check("fes: with 2 distractions", calculateFocusEfficiencyScore(1500, 1500, 2) === 80);

  // Half time, no distractions: 50
  check("fes: half time", calculateFocusEfficiencyScore(750, 1500, 0) === 50);

  // Negative floor: 5 distractions with 20% time -> 20 - 50 = -30 -> 0
  check("fes: floor at 0", calculateFocusEfficiencyScore(300, 1500, 5) === 0);

  // Alias calculateFES
  check("fes: alias", calculateFES(1500, 1500, 1) === 90);

  // FSM states
  check("fsm: state IDLE", PomodoroState.IDLE === "IDLE");
  check("fsm: state RUNNING_WORK", PomodoroState.RUNNING_WORK === "RUNNING_WORK");
  check("fsm: state PAUSED_WORK", PomodoroState.PAUSED_WORK === "PAUSED_WORK");
  check("fsm: state RUNNING_BREAK", PomodoroState.RUNNING_BREAK === "RUNNING_BREAK");
  check("fsm: state PAUSED_BREAK", PomodoroState.PAUSED_BREAK === "PAUSED_BREAK");
  check("fsm: state COMPLETED", PomodoroState.COMPLETED === "COMPLETED");

  // Transitions
  check("transition: IDLE -> START -> RUNNING_WORK", transitionPomodoro("IDLE", "START") === "RUNNING_WORK");
  check("transition: RUNNING_WORK -> PAUSE -> PAUSED_WORK", transitionPomodoro("RUNNING_WORK", "PAUSE") === "PAUSED_WORK");
  check("transition: PAUSED_WORK -> RESUME -> RUNNING_WORK", transitionPomodoro("PAUSED_WORK", "RESUME") === "RUNNING_WORK");
  check("transition: RUNNING_WORK -> TAKE_BREAK -> RUNNING_BREAK", transitionPomodoro("RUNNING_WORK", "TAKE_BREAK") === "RUNNING_BREAK");
  check("transition: RUNNING_BREAK -> PAUSE -> PAUSED_BREAK", transitionPomodoro("RUNNING_BREAK", "PAUSE") === "PAUSED_BREAK");
  check("transition: PAUSED_BREAK -> RESUME -> RUNNING_BREAK", transitionPomodoro("PAUSED_BREAK", "RESUME") === "RUNNING_BREAK");
  check("transition: RUNNING_WORK -> COMPLETE -> COMPLETED", transitionPomodoro("RUNNING_WORK", "COMPLETE") === "COMPLETED");
  check("transition: COMPLETED -> RESET -> IDLE", transitionPomodoro("COMPLETED", "RESET") === "IDLE");

  // PomodoroSession class
  const session = new PomodoroSession(1500, 300);
  check("session: initial state IDLE", session.state === "IDLE");
  session.start();
  check("session: started state RUNNING_WORK", session.state === "RUNNING_WORK");
  session.tick(750);
  check("session: workDuration 750", session.workDuration === 750);
  session.recordDistraction(1);
  check("session: distractions 1", session.distractions === 1);
  // 100 * (750 / 1500) - 10 * 1 = 50 - 10 = 40
  check("session: fes is 40", session.fes === 40);
  session.pause();
  check("session: paused state PAUSED_WORK", session.state === "PAUSED_WORK");
  session.resume();
  check("session: resumed state RUNNING_WORK", session.state === "RUNNING_WORK");
  session.tick(750); // completes 1500
  check("session: completed", session.state === "COMPLETED");
  session.reset();
  check("session: reset to IDLE", session.state === "IDLE" && session.workDuration === 0);
}

console.log(`\nTests finished: ${passed} passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error("Failures:\n" + failures.map((f) => ` - ${f}`).join("\n"));
  process.exit(1);
} else {
  console.log("All academic analytics tests passed successfully!");
}
