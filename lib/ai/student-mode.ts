// ---------------------------------------------------------------------------
// Zenith AI — Student Mode Actions & Pedagogical Prompts
// ---------------------------------------------------------------------------

import type { StudentModeAction } from "./types"

export interface StudentActionDefinition {
  id: StudentModeAction
  label: string
  category: "study" | "diagram" | "revision"
  description: string
  systemPrompt: string
}

export const STUDENT_ACTIONS: StudentActionDefinition[] = [
  {
    id: "explain",
    label: "Explain Concept",
    category: "study",
    description: "Deep, intuitive pedagogical explanation with real-world analogies and key takeaways.",
    systemPrompt: `You are a world-class academic tutor. Explain the given topic or selected canvas objects with clarity, intuition, vivid real-world analogies, and concrete examples. Break complex jargon down into foundational principles. If visual representations help, use native canvas tools to illustrate them. Do not output raw JSON code blocks in chat.`,
  },
  {
    id: "simplify",
    label: "Simplify (ELI5)",
    category: "study",
    description: "Explain like I'm 5 with everyday metaphors and zero confusing jargon.",
    systemPrompt: `You are an expert at simplifying complex ideas (ELI5 style). Explain the concepts in the simplest possible terms, using plain conversational language and relatable everyday metaphors. Keep sentences short and clear.`,
  },
  {
    id: "solve-step-by-step",
    label: "Solve Step-by-Step",
    category: "study",
    description: "Detailed multi-step formal STEM reasoning with proofs, math, and verification.",
    systemPrompt: `You are a STEM reasoning and problem-solving expert. Solve the problem in clean, sequential steps:
1. Identify given information and variables
2. State underlying theorems or formulas
3. Execute step-by-step arithmetic/algebraic calculations with clear explanations
4. Verify the final answer against boundary conditions.`,
  },
  {
    id: "summarize",
    label: "Summarize High-Yield",
    category: "revision",
    description: "Distill the core concepts into high-yield bullet points and key definitions.",
    systemPrompt: `Distill the text or selected canvas elements into an ultra-concise, high-yield summary. Highlight key definitions, formulas, and critical takeaways using bullet points.`,
  },
  {
    id: "create-notes",
    label: "Cornell Study Notes",
    category: "revision",
    description: "Structured Cornell-style notes with cues, detailed main notes, and summary.",
    systemPrompt: `Format the information as structured Cornell Study Notes:
- Cues & Questions (left margin keywords)
- Detailed Main Notes (hierarchical outline)
- High-level Summary (2-3 sentences at the bottom).`,
  },
  {
    id: "flashcards",
    label: "Generate Flashcards",
    category: "study",
    description: "Create active-recall Q&A flashcards ready for canvas placement.",
    systemPrompt: `Generate 4-8 high-impact active recall flashcards based on the material.
For each card, provide:
- Front: Question or Prompt
- Back: Concise, complete answer
Call the 'create_flashcards' tool natively to place them onto the canvas as wireframe cards. Never output JSON or action blocks in chat.`,
  },
  {
    id: "practice-questions",
    label: "Practice Questions",
    category: "study",
    description: "Generate exam-style multiple-choice and conceptual practice questions.",
    systemPrompt: `Generate 4-6 exam-style practice questions (mix of conceptual, computational, and multi-choice). Include full answer keys and detailed explanations.`,
  },
  {
    id: "quiz-me",
    label: "Interactive Quiz",
    category: "study",
    description: "Interactive diagnostic quiz with immediate hints and feedback.",
    systemPrompt: `Run an interactive diagnostic quiz. Ask the first 2 questions and wait for the student to answer, or provide question cards with hidden answers.`,
  },
  {
    id: "study-plan",
    label: "Study & Revision Plan",
    category: "revision",
    description: "Structured timetable and milestone study schedule.",
    systemPrompt: `Build a realistic, time-blocked study and revision plan. Break topics into spaced repetition intervals and define milestone checkpoints.`,
  },
  {
    id: "revision-sheet",
    label: "Cheat Sheet / Revision Sheet",
    category: "revision",
    description: "High-density 1-page formula and concept cheat sheet.",
    systemPrompt: `Create a high-density revision cheat sheet. Group essential formulas, laws, terms, and diagrams into clean modular categories. Call canvas tools to place a structured visual revision matrix onto the canvas.`,
  },
  {
    id: "mind-map",
    label: "Mind Map",
    category: "diagram",
    description: "Generate a visual hierarchical mind map directly on the canvas.",
    systemPrompt: `Create a comprehensive hierarchical Mind Map. Provide an educational explanation in chat, and invoke the 'create_mind_map' tool natively to generate the mind map on canvas. Never output raw JSON in your conversational chat response.`,
  },
  {
    id: "flowchart",
    label: "Flowchart / Process",
    category: "diagram",
    description: "Create sequential process steps and decision diamonds with connecting arrows.",
    systemPrompt: `Create a step-by-step Flowchart diagram. Provide an educational explanation in chat, and invoke the 'create_flowchart' tool natively to generate the flowchart on canvas. Never output raw JSON in your conversational chat response.`,
  },
  {
    id: "concept-map",
    label: "Concept Map",
    category: "diagram",
    description: "Network of interconnected concepts with labeled relationship links.",
    systemPrompt: `Generate an interconnected concept map showing how ideas and principles relate to each other with labeled connectors. Use native canvas tools to build the network.`,
  },
  {
    id: "timeline",
    label: "Timeline",
    category: "diagram",
    description: "Chronological sequence of events or milestones.",
    systemPrompt: `Construct a chronological timeline diagram with sequential date/event cards and connecting arrows using native canvas tools.`,
  },
  {
    id: "table",
    label: "Comparison Matrix / Table",
    category: "diagram",
    description: "Structured comparison grid with rows, columns, and attributes.",
    systemPrompt: `Construct a structured comparison table or matrix. Provide explanations in chat, and invoke the 'create_study_table' tool natively to place the table onto canvas. Never output raw JSON in chat.`,
  },
  {
    id: "diagram",
    label: "General Diagram",
    category: "diagram",
    description: "Synthesize ideas into an editable visual layout on canvas.",
    systemPrompt: `Design a clean, hand-drawn wireframe diagram layout explaining the concepts. Invoke native canvas tools to place shapes, text blocks, and arrows. Never output raw JSON in chat.`,
  },
]

