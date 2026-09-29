import {
  createQuestion,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getAllQuestions,
  getQuestionsBySubject,
  getQuestionsByChapter,
  getQuestionsByDifficulty,
  getPyqQuestions,
  searchQuestions,
  filterQuestions,
  recordPracticeAttempt,
  getQuestionHistory,
  calculateChapterAccuracy,
  calculateSubjectQuestionStats,
  getUnattemptedQuestions,
  clearPracticeStore,
} from "../lib/academic/practice.ts"

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`FAIL: ${label}`)
  }
}

console.log("=== Practice Engine Tests ===\n")

clearPracticeStore()

console.log("--- Question CRUD ---")

const q1 = createQuestion({
  studentId: "stu1",
  subjectId: "math",
  chapterId: "ch1",
  topicId: "t1",
  questionText: "What is 2+2?",
  correctAnswer: "4",
  solutionExplanation: "Basic addition",
  marks: 4,
  negativeMarks: 1,
  difficulty: "easy",
  tags: ["arithmetic", "basics"],
})
assert(q1.id.startsWith("q_"), "question ID generated")
assert(q1.questionText === "What is 2+2?", "questionText stored")
assert(q1.difficulty === "easy", "difficulty stored")

const q2 = createQuestion({
  studentId: "stu1",
  subjectId: "math",
  chapterId: "ch1",
  questionText: "Solve x^2 - 5x + 6 = 0",
  correctAnswer: "x=2, x=3",
  solutionExplanation: "Factor: (x-2)(x-3)=0",
  difficulty: "medium",
  tags: ["algebra", "quadratic"],
})

const q3 = createQuestion({
  studentId: "stu1",
  subjectId: "science",
  chapterId: "ch2",
  questionText: "What is photosynthesis?",
  correctAnswer: "Process by which plants convert sunlight to energy",
  solutionExplanation: "6CO2 + 6H2O → C6H12O6 + 6O2",
  difficulty: "medium",
  isPyq: true,
  pyqSource: "CBSE 2024",
  year: 2024,
})

assert(getAllQuestions().length === 3, "3 questions created")

const fetched = getQuestionById(q1.id)
assert(fetched !== null, "getQuestionById found question")
assert(fetched!.questionText === "What is 2+2?", "correct question returned")

const updated = updateQuestion(q1.id, { difficulty: "hard" })
assert(updated !== null, "update returned record")
assert(updated!.difficulty === "hard", "difficulty updated")

assert(getQuestionsBySubject("math").length === 2, "2 math questions")
assert(getQuestionsBySubject("science").length === 1, "1 science question")
assert(getQuestionsByChapter("ch1").length === 2, "2 questions in ch1")
assert(getQuestionsByDifficulty("medium").length === 2, "2 medium questions")

console.log("\n--- PYQ ---")

const pyqs = getPyqQuestions()
assert(pyqs.length === 1, "1 PYQ question")
assert(pyqs[0].pyqSource === "CBSE 2024", "PYQ source correct")

const pyqsMath = getPyqQuestions("math")
assert(pyqsMath.length === 0, "0 math PYQs")

console.log("\n--- Search ---")

const searchAlg = searchQuestions("algebra")
assert(searchAlg.length === 1, "search 'algebra' finds 1")

const searchPhoto = searchQuestions("photosynthesis")
assert(searchPhoto.length === 1, "search 'photosynthesis' finds 1")

const searchAll = searchQuestions("")
assert(searchAll.length === 3, "empty search returns all")

console.log("\n--- Filter ---")

const filtered1 = filterQuestions({ subjectId: "math", difficulty: "medium" })
assert(filtered1.length === 1, "filter math+medium = 1")

const filtered2 = filterQuestions({ isPyq: true })
assert(filtered2.length === 1, "filter isPyq = 1")

const filtered3 = filterQuestions({ tags: ["algebra"] })
assert(filtered3.length === 1, "filter tag algebra = 1")

const filtered4 = filterQuestions({ year: 2024 })
assert(filtered4.length === 1, "filter year 2024 = 1")

console.log("\n--- Practice Attempts ---")

const a1 = recordPracticeAttempt({
  studentId: "stu1",
  questionId: q1.id,
  timeSpentSeconds: 30,
  result: "correct",
})
assert(a1.result === "correct", "attempt recorded as correct")
assert(a1.marksObtained === 4, "marks = 4 for correct")

const a2 = recordPracticeAttempt({
  studentId: "stu1",
  questionId: q1.id,
  timeSpentSeconds: 45,
  result: "wrong",
  studentAnswer: "5",
})
assert(a2.marksObtained === -1, "marks = -1 for wrong")

const a3 = recordPracticeAttempt({
  studentId: "stu1",
  questionId: q2.id,
  timeSpentSeconds: 60,
  result: "correct",
})

const a4 = recordPracticeAttempt({
  studentId: "stu1",
  questionId: q2.id,
  timeSpentSeconds: 20,
  result: "skipped",
})

const history = getQuestionHistory(q1.id)
assert(history.length === 2, "q1 has 2 attempts")

console.log("\n--- Chapter Accuracy ---")

const acc = calculateChapterAccuracy("ch1")
assert(acc.totalAttempted === 3, "3 non-skipped attempts in ch1")
assert(acc.correct === 2, "2 correct in ch1")
assert(acc.accuracy === Math.round((2 / 3) * 100), "accuracy = 67%")
assert(acc.averageTimeSeconds > 0, "avg time > 0")

console.log("\n--- Subject Stats ---")

const mathStats = calculateSubjectQuestionStats("math")
assert(mathStats.total === 2, "2 math questions total")
assert(mathStats.correct === 2, "2 correct math attempts")

console.log("\n--- Unattempted ---")

const unattempted = getUnattemptedQuestions()
assert(unattempted.length === 1, "1 unattempted question (q3)")
assert(unattempted[0].id === q3.id, "q3 is unattempted")

console.log("\n--- Delete ---")

assert(deleteQuestion(q3.id) === true, "delete returns true")
assert(getQuestionById(q3.id) === null, "deleted question not found")
assert(getAllQuestions().length === 2, "2 questions remaining")

console.log("\n--- Clear Store ---")

clearPracticeStore()
assert(getAllQuestions().length === 0, "store cleared")

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
