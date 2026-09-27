/**
 * Pencil Hardness & Grading System
 * 
 * Standard graphite grading scale:
 * 9H down to H: Hard & Light (more clay, very light, precise lines)
 * HB: Standard everyday middle-ground
 * B up to 9B: Soft & Dark (more graphite, bold dark lines)
 */

export type PencilGrade =
  | "9H"
  | "8H"
  | "7H"
  | "6H"
  | "5H"
  | "4H"
  | "3H"
  | "2H"
  | "H"
  | "HB"
  | "B"
  | "2B"
  | "3B"
  | "4B"
  | "5B"
  | "6B"
  | "7B"
  | "8B"
  | "9B"

export interface PencilGradeInfo {
  grade: PencilGrade
  category: "H" | "HB" | "B"
  label: string
  strokeWidth: number
  opacity: number
  hardness: string
}

/**
 * Exact user-specified description of pencil grades:
 */
export const PENCIL_GUIDE_TEXT =
  "HB is the standard, everyday middle-ground pencil. It is what most school pencils use.B Grades (Soft & Dark): These have more graphite, creating dark, bold black lines. They range from 1B to 9B (or higher).H Grades (Hard & Light): These have more clay, creating very light, precise grey lines. They range from 1H to 9H."

export const PENCIL_GRADES: Record<PencilGrade, PencilGradeInfo> = {
  "9H": { grade: "9H", category: "H", label: "9H", strokeWidth: 0.8, opacity: 0.28, hardness: "Extra hard & light" },
  "8H": { grade: "8H", category: "H", label: "8H", strokeWidth: 0.9, opacity: 0.34, hardness: "Very hard & light" },
  "7H": { grade: "7H", category: "H", label: "7H", strokeWidth: 1.0, opacity: 0.40, hardness: "Hard & light" },
  "6H": { grade: "6H", category: "H", label: "6H", strokeWidth: 1.1, opacity: 0.46, hardness: "Hard & light" },
  "5H": { grade: "5H", category: "H", label: "5H", strokeWidth: 1.2, opacity: 0.52, hardness: "Hard & light" },
  "4H": { grade: "4H", category: "H", label: "4H", strokeWidth: 1.3, opacity: 0.58, hardness: "Hard & light" },
  "3H": { grade: "3H", category: "H", label: "3H", strokeWidth: 1.5, opacity: 0.65, hardness: "Medium hard & light" },
  "2H": { grade: "2H", category: "H", label: "2H", strokeWidth: 1.7, opacity: 0.72, hardness: "Light & precise" },
  "H":  { grade: "H",  category: "H", label: "H",  strokeWidth: 1.8, opacity: 0.78, hardness: "Hard & precise" },
  "HB": { grade: "HB", category: "HB", label: "HB", strokeWidth: 2.0, opacity: 0.88, hardness: "Standard middle-ground" },
  "B":  { grade: "B",  category: "B", label: "1B", strokeWidth: 2.3, opacity: 0.92, hardness: "Soft & dark" },
  "2B": { grade: "2B", category: "B", label: "2B", strokeWidth: 2.6, opacity: 0.94, hardness: "Soft & dark" },
  "3B": { grade: "3B", category: "B", label: "3B", strokeWidth: 3.0, opacity: 0.96, hardness: "Extra soft & dark" },
  "4B": { grade: "4B", category: "B", label: "4B", strokeWidth: 3.4, opacity: 0.98, hardness: "Dark & bold" },
  "5B": { grade: "5B", category: "B", label: "5B", strokeWidth: 3.8, opacity: 1.0, hardness: "Very dark & bold" },
  "6B": { grade: "6B", category: "B", label: "6B", strokeWidth: 4.2, opacity: 1.0, hardness: "Rich graphite black" },
  "7B": { grade: "7B", category: "B", label: "7B", strokeWidth: 4.6, opacity: 1.0, hardness: "Deep bold black" },
  "8B": { grade: "8B", category: "B", label: "8B", strokeWidth: 5.0, opacity: 1.0, hardness: "Ultra-dark bold black" },
  "9B": { grade: "9B", category: "B", label: "9B", strokeWidth: 5.5, opacity: 1.0, hardness: "Maximum bold graphite" },
}

export const ORDERED_PENCIL_GRADES: PencilGrade[] = [
  "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H", "H",
  "HB",
  "B", "2B", "3B", "4B", "5B", "6B", "7B", "8B", "9B",
]
