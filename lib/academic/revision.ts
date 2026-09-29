import type { FlashcardRating } from "./types"

export interface FlashcardReviewInput {
  currentInterval: number
  easeFactor: number
  repetitions: number
  rating: FlashcardRating
}

export interface FlashcardReviewResult {
  nextInterval: number
  newEaseFactor: number
  newRepetitions: number
  nextDueDate: string
}

export interface FlashcardForQueue {
  id: string
  dueDate: string
  intervalDays: number
  easeFactor: number
  repetitions: number
  deckId?: string
  frontText?: string
  backText?: string
}

export interface DeckStats {
  total: number
  due: number
  learning: number
  mastered: number
  retentionRate: number
}

const EASE_MIN = 1.3
const EASE_MAX = 3.0
const MASTERED_INTERVAL_THRESHOLD = 21

function clampEase(ef: number): number {
  return Math.max(EASE_MIN, Math.min(EASE_MAX, ef))
}

function computeNewEaseFactor(currentEF: number, rating: FlashcardRating): number {
  const raw = currentEF + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02))
  return clampEase(raw)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function calculateNextReview(
  currentInterval: number,
  easeFactor: number,
  repetitions: number,
  rating: FlashcardRating,
  currentDateIso?: string
): FlashcardReviewResult {
  const baseDate = currentDateIso ?? todayIso()
  const newEaseFactor = computeNewEaseFactor(easeFactor, rating)
  let nextInterval: number
  let newRepetitions: number

  switch (rating) {
    case 1: {
      nextInterval = 1
      newRepetitions = 0
      break
    }
    case 2: {
      nextInterval = Math.max(1, Math.round(currentInterval * 1.2))
      newRepetitions = repetitions + 1
      break
    }
    case 3: {
      if (repetitions === 0) {
        nextInterval = 1
      } else if (repetitions === 1) {
        nextInterval = 3
      } else {
        nextInterval = Math.round(currentInterval * newEaseFactor)
      }
      newRepetitions = repetitions + 1
      break
    }
    case 4: {
      if (repetitions === 0) {
        nextInterval = 1
      } else if (repetitions === 1) {
        nextInterval = 4
      } else {
        nextInterval = Math.round(currentInterval * newEaseFactor * 1.3)
      }
      newRepetitions = repetitions + 1
      break
    }
    default: {
      nextInterval = 1
      newRepetitions = 0
    }
  }

  nextInterval = Math.max(1, nextInterval)

  return {
    nextInterval,
    newEaseFactor,
    newRepetitions,
    nextDueDate: addDays(baseDate, nextInterval),
  }
}

function daysDiff(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00Z")
  const b = new Date(dateB + "T00:00:00Z")
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function calculateCardPriority(
  card: { dueDate: string; intervalDays: number; easeFactor: number },
  currentDateIso: string
): number {
  const daysOverdue = Math.max(0, daysDiff(card.dueDate, currentDateIso))
  const intervalSafe = Math.max(1, card.intervalDays)
  const overdueFactor = 100 * (1.0 + daysOverdue / intervalSafe)
  const easePenalty = (3.0 - card.easeFactor) * 10
  return overdueFactor + easePenalty
}

export function getDueCardsQueue(
  cards: FlashcardForQueue[],
  currentDateIso: string
): FlashcardForQueue[] {
  const dueCards = cards.filter((c) => c.dueDate <= currentDateIso)
  const scored = dueCards.map((c) => ({
    card: c,
    priority: calculateCardPriority(
      { dueDate: c.dueDate, intervalDays: c.intervalDays, easeFactor: c.easeFactor },
      currentDateIso
    ),
  }))
  scored.sort((a, b) => b.priority - a.priority)
  return scored.map((s) => s.card)
}

export function getDeckStats(
  cards: FlashcardForQueue[],
  currentDateIso: string
): DeckStats {
  const total = cards.length
  if (total === 0) {
    return { total: 0, due: 0, learning: 0, mastered: 0, retentionRate: 0 }
  }

  let due = 0
  let learning = 0
  let mastered = 0

  for (const c of cards) {
    if (c.dueDate <= currentDateIso) due++
    if (c.intervalDays < MASTERED_INTERVAL_THRESHOLD) {
      learning++
    } else {
      mastered++
    }
  }

  const retentionRate = total > 0 ? Math.round((mastered / total) * 100) : 0

  return { total, due, learning, mastered, retentionRate }
}

export type RevisionLifecycleStage =
  | "Learn"
  | "Practice"
  | "Rev 1"
  | "Rev 2"
  | "Rev 3"
  | "Mastered"

export function getRevisionStage(reviewCount: number): RevisionLifecycleStage {
  if (reviewCount <= 0) return "Learn"
  if (reviewCount === 1) return "Practice"
  if (reviewCount === 2) return "Rev 1"
  if (reviewCount === 3) return "Rev 2"
  if (reviewCount === 4) return "Rev 3"
  return "Mastered"
}

export const DEFAULT_INTERVAL_SEQUENCE = [1, 3, 7, 14, 30] as const

export function getDefaultInterval(stage: number): number {
  if (stage < 0) return 1
  if (stage >= DEFAULT_INTERVAL_SEQUENCE.length) {
    return DEFAULT_INTERVAL_SEQUENCE[DEFAULT_INTERVAL_SEQUENCE.length - 1]
  }
  return DEFAULT_INTERVAL_SEQUENCE[stage]
}

export function computeTopicRevisionPriority(
  topic: {
    nextReviewDue?: string
    reviewStage: number
    confidenceScore: number
    isWeak: boolean
  },
  currentDateIso: string
): number {
  let score = 0

  if (topic.nextReviewDue) {
    const overdue = daysDiff(topic.nextReviewDue, currentDateIso)
    if (overdue > 0) {
      score += Math.min(50, overdue * 5)
    }
  }

  score += (5 - topic.confidenceScore) * 8

  if (topic.isWeak) score += 20

  if (topic.reviewStage <= 2) score += 10

  return score
}
