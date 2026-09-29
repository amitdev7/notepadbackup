"use client"

import {
  SquaresFour,
  Clock,
  CalendarCheck,
  Books,
  FolderSimple,
  ArrowsClockwise,
  Target,
  GraduationCap,
  ChartLineUp,
  Chalkboard,
  ShieldCheck,
} from "@phosphor-icons/react"

export type StudentTabId =
  | "overview"
  | "planner"
  | "calendar"
  | "syllabus"
  | "notes"
  | "revision"
  | "practice"
  | "tests"
  | "analytics"
  | "classroom"
  | "parent-mode"

export interface StudentNavProps {
  activeTab: StudentTabId
  onTabChange: (tab: StudentTabId) => void
  className?: string
}

export const STUDENT_TABS: Array<{
  id: StudentTabId
  label: string
  icon: React.ElementType
}> = [
  { id: "overview", label: "Overview", icon: SquaresFour },
  { id: "planner", label: "Planner", icon: Clock },
  { id: "calendar", label: "Calendar", icon: CalendarCheck },
  { id: "syllabus", label: "Syllabus", icon: Books },
  { id: "notes", label: "Notes & Materials", icon: FolderSimple },
  { id: "revision", label: "Revision", icon: ArrowsClockwise },
  { id: "practice", label: "Practice", icon: Target },
  { id: "tests", label: "Tests & Exams", icon: GraduationCap },
  { id: "analytics", label: "Analytics", icon: ChartLineUp },
  { id: "classroom", label: "Classroom", icon: Chalkboard },
  { id: "parent-mode", label: "Parent Mode", icon: ShieldCheck },
]

export function StudentNav({ activeTab, onTabChange, className = "" }: StudentNavProps) {
  return (
    <nav className={`w-full border-b border-stone-200/80 bg-[#FBFAF5] dark:bg-[#18181B] dark:border-stone-800 px-4 sm:px-8 ${className}`}>
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
        {STUDENT_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${
                isActive
                  ? "bg-stone-900 font-semibold text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              <Icon size={15} weight={isActive ? "fill" : "regular"} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

