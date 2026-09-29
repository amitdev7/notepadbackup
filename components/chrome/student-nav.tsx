"use client"

import {
  SquaresFour,
  CalendarCheck,
  Books,
  ArrowsClockwise,
  Target,
  Exam,
  ChartLineUp,
  ChalkboardTeacher,
  ShieldCheck,
} from "@phosphor-icons/react"

export type StudentTabId =
  | "overview"
  | "planner"
  | "syllabus"
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
  icon: typeof SquaresFour
}> = [
  { id: "overview", label: "Overview", icon: SquaresFour },
  { id: "planner", label: "Planner", icon: CalendarCheck },
  { id: "syllabus", label: "Syllabus", icon: Books },
  { id: "revision", label: "Revision", icon: ArrowsClockwise },
  { id: "practice", label: "Practice", icon: Target },
  { id: "tests", label: "Tests", icon: Exam },
  { id: "analytics", label: "Analytics", icon: ChartLineUp },
  { id: "classroom", label: "Classroom", icon: ChalkboardTeacher },
  { id: "parent-mode", label: "Parent Mode", icon: ShieldCheck },
]

export function StudentNav({ activeTab, onTabChange, className = "" }: StudentNavProps) {
  return (
    <nav className={`w-full border-b border-stone-200 bg-[#FBFAF5] px-4 sm:px-8 ${className}`}>
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
                  ? "bg-stone-900 font-semibold text-stone-50 shadow-2xs"
                  : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900"
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
