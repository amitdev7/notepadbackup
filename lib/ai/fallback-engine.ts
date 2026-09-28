// ---------------------------------------------------------------------------
// Zenith AI — Intelligent Built-in Copilot Engine & Educational Synthesizer
// Provides rich structured responses & interactive canvas action proposals
// when offline or before external API keys are configured.
// ---------------------------------------------------------------------------

import type { CanvasActionProposal, StudentModeAction } from "./types"

export interface FallbackAIResult {
  text: string
  actions?: CanvasActionProposal[]
  proposals?: CanvasActionProposal[]
}

export class FallbackAIEngine {
  /**
   * Generates a structured result with clean conversational markdown and separate typed proposals.
   */
  static generateStructuredResponse({
    prompt,
    studentAction,
    canvasContext: _canvasContext,
  }: {
    prompt: string
    studentAction?: StudentModeAction
    canvasContext?: string
  }): FallbackAIResult {
    const cleanPrompt = prompt.trim()
    const lower = cleanPrompt.toLowerCase()

    // 0. Direct text / node placement request (e.g. "Add 'hii guys' to canvas")
    if (
      lower.startsWith("add ") ||
      lower.startsWith("create ") ||
      lower.includes("to canvas") ||
      lower.includes("on canvas")
    ) {
      const matchText = cleanPrompt.match(
        /(?:add|create)\s+(?:text\s+)?["']?([^"'\n]+?)["']?\s*(?:to\s+(?:the\s+)?canvas|on\s+(?:the\s+)?canvas|$)/i
      )
      if (matchText && matchText[1]) {
        const textToAdd = matchText[1].replace(/^(?:the\s+)?(?:text\s+)/i, "").trim()
        if (
          textToAdd &&
          !textToAdd.toLowerCase().startsWith("rectangle") &&
          !textToAdd.toLowerCase().startsWith("circle") &&
          !textToAdd.toLowerCase().startsWith("shape")
        ) {
          const proposal: CanvasActionProposal = {
            id: `prop_text_${Date.now()}`,
            summary: `Add text "${textToAdd}"`,
            actions: [
              {
                type: "createNode",
                nodeType: "text",
                text: textToAdd,
                x: 120,
                y: 120,
                fontSize: 18,
              },
            ],
            actionCount: { total: 1, create: 1, update: 0, delete: 0 },
            generatedAt: new Date().toISOString(),
          }
          return {
            text: `Added "${textToAdd}" to your canvas.`,
            actions: [proposal],
            proposals: [proposal],
          }
        }
      }
    }

    // 1. Check for Mind Map request
    if (
      studentAction === "mind-map" ||
      studentAction === "concept-map" ||
      lower.includes("mind map") ||
      lower.includes("mindmap") ||
      lower.includes("concept map")
    ) {
      const topic = this.extractTopic(cleanPrompt, "Concept Architecture")
      return this.buildMindMapStructured(topic)
    }

    // 2. Check for Flowchart request
    if (
      studentAction === "flowchart" ||
      lower.includes("flowchart") ||
      lower.includes("flow chart") ||
      lower.includes("process flow") ||
      lower.includes("algorithm")
    ) {
      const topic = this.extractTopic(cleanPrompt, "System Process Flow")
      return this.buildFlowchartStructured(topic)
    }

    // 3. Check for Flashcards request
    if (
      studentAction === "flashcards" ||
      lower.includes("flashcard") ||
      lower.includes("flash cards") ||
      lower.includes("cards")
    ) {
      const topic = this.extractTopic(cleanPrompt, "Core Fundamentals")
      return this.buildFlashcardsStructured(topic)
    }

    // 4. Check for Table / Comparison request
    if (
      studentAction === "table" ||
      lower.includes("table") ||
      lower.includes("comparison") ||
      lower.includes("matrix") ||
      lower.includes("compare")
    ) {
      const topic = this.extractTopic(cleanPrompt, "Key Comparisons")
      return this.buildTableStructured(topic)
    }

    // 5. Check for Step-by-Step Problem Solving
    if (
      studentAction === "solve-step-by-step" ||
      lower.includes("step by step") ||
      lower.includes("solve") ||
      lower.includes("calculate") ||
      lower.includes("derivation") ||
      lower.includes("proof")
    ) {
      return { text: this.generateStepByStepResponse(cleanPrompt) }
    }

    // 6. Check for Active Recall Quiz / Exam Prep
    if (
      studentAction === "quiz-me" ||
      studentAction === "practice-questions" ||
      lower.includes("quiz") ||
      lower.includes("recall") ||
      lower.includes("test me")
    ) {
      return { text: this.generateActiveRecallResponse(cleanPrompt) }
    }

    // 7. Check for Socratic Tutor / Deep Explanation
    if (
      studentAction === "explain" ||
      studentAction === "simplify" ||
      lower.includes("socratic") ||
      lower.includes("explain like") ||
      lower.includes("why does") ||
      lower.includes("how does")
    ) {
      return { text: this.generateSocraticResponse(cleanPrompt) }
    }

    // 8. Wireframe / UI layout request
    if (
      lower.includes("wireframe") ||
      lower.includes("login") ||
      lower.includes("dashboard") ||
      lower.includes("button") ||
      lower.includes("form") ||
      lower.includes("landing page")
    ) {
      return this.buildWireframeStructured(cleanPrompt)
    }

    // 9. Default Comprehensive Study & Canvas Response
    return { text: this.generateComprehensiveResponse(cleanPrompt) }
  }

  /**
   * Generates a clean markdown response string without any action block leaks.
   */
  static generateResponse(params: {
    prompt: string
    studentAction?: StudentModeAction
    canvasContext?: string
  }): string {
    return this.generateStructuredResponse(params).text
  }

  private static extractTopic(prompt: string, fallback: string): string {
    const cleaned = prompt
      .replace(/create (a |an )?(mind ?map|flowchart|flashcards|table|diagram) (for|of|about)?/gi, "")
      .replace(/generate (a |an )?(mind ?map|flowchart|flashcards|table|diagram) (for|of|about)?/gi, "")
      .replace(/please (make|draw|create|give me)/gi, "")
      .replace(/^(about|for|on)\s+/gi, "")
      .trim()
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : fallback
  }

  private static buildMindMapStructured(topic: string): FallbackAIResult {
    const subTopics = [
      { name: "1. Core Principles", sub: ["Foundations & Axioms", "Key Terminology", "Governing Laws"] },
      { name: "2. Key Mechanisms", sub: ["Execution Pipeline", "State Transitions", "Optimization Loop"] },
      { name: "3. Practical Applications", sub: ["Real-world Case Studies", "Integration Patterns", "Industry Standards"] },
      { name: "4. Constraints & Pitfalls", sub: ["Edge Cases", "Common Fallacies", "Security & Reliability"] },
    ]

    const proposal: CanvasActionProposal = {
      id: `prop_mindmap_${Date.now()}`,
      summary: `Mind map for "${topic}" (${subTopics.length} branches)`,
      actions: [
        {
          type: "createMindMap",
          rootTopic: topic,
          branches: subTopics.map((b) => ({
            title: b.name,
            subTopics: b.sub,
          })),
        },
      ],
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }

    const text = `### 🧠 Mind Map: **${topic}**

Here is a structured hierarchical conceptual breakdown of **${topic}**:

1. **Core Principles**: Foundational definitions, governing principles, and essential axioms.
2. **Key Mechanisms**: The internal pathways, pipeline processes, and dynamics.
3. **Practical Applications**: Concrete implementations, architectures, and standard use cases.
4. **Constraints & Pitfalls**: Key trade-offs, common misconceptions, and boundary conditions.

I've generated the mind map structure for your canvas. You can inspect or modify any node directly.`

    return { text, actions: [proposal], proposals: [proposal] }
  }

  private static buildFlowchartStructured(topic: string): FallbackAIResult {
    const steps = [
      { label: `Initiate: ${topic}`, kind: "start", description: "Define parameters & initial state" },
      { label: "Validate Inputs", kind: "process", description: "Verify schema and constraints" },
      { label: "Valid & Ready?", kind: "decision", description: "Branch on validation check" },
      { label: "Core Processing Pipeline", kind: "process", description: "Execute algorithmic transformation" },
      { label: "Verification & Output", kind: "end", description: "Render results and emit event" },
    ]

    const proposal: CanvasActionProposal = {
      id: `prop_flow_${Date.now()}`,
      summary: `Flowchart process for "${topic}" (${steps.length} sequential steps)`,
      actions: [
        {
          type: "createFlowchart",
          steps: steps.map((s, idx) => ({
            id: `step_${idx + 1}`,
            label: s.label,
            kind: s.kind as "start" | "process" | "decision" | "end",
            next: idx < steps.length - 1 ? [`step_${idx + 2}`] : undefined,
          })),
        },

      ],
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }

    const text = `### 🔀 Flowchart: **${topic}**

Here is the systematic workflow pipeline for **${topic}**:

1. **Start / Initialization**: Set up baseline configurations and input data.
2. **Pre-condition Validation**: Verify invariant rules and data bounds.
3. **Decision Gate**: Check condition satisfaction before proceeding.
4. **Execution Cycle**: Core transformational logic execution.
5. **Terminal State**: Emit validated results and completion hook.`

    return { text, actions: [proposal], proposals: [proposal] }
  }

  private static buildFlashcardsStructured(topic: string): FallbackAIResult {
    const cards = [
      {
        question: `What is the core definition of ${topic}?`,
        answer: `The primary theoretical framework and operative model that defines how ${topic} functions in practice.`,
      },
      {
        question: `What is the main advantage of ${topic}?`,
        answer: `High efficiency, modular separation of concerns, and robust predictable outcomes under load.`,
      },
      {
        question: `What is a common edge-case or mistake with ${topic}?`,
        answer: `Overlooking invariant boundaries or failing to handle asynchronous state transitions properly.`,
      },
      {
        question: `How do you measure or evaluate ${topic}?`,
        answer: `Using structured benchmarking metrics, algorithmic complexity analysis ($O(n)$ bounds), and empirical verification.`,
      },
    ]

    const proposal: CanvasActionProposal = {
      id: `prop_flash_${Date.now()}`,
      summary: `Revision flashcard set for "${topic}" (${cards.length} cards)`,
      actions: [
        {
          type: "createFlashcards",
          cards,
        },
      ],
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }

    const text = `### 📇 Flashcards: **${topic}**

Here is an active-recall study flashcard deck for **${topic}**:

* **Card 1 (Definition)**: ${cards[0].question}
  * *Answer*: ${cards[0].answer}
* **Card 2 (Advantage)**: ${cards[1].question}
  * *Answer*: ${cards[1].answer}
* **Card 3 (Pitfall)**: ${cards[2].question}
  * *Answer*: ${cards[2].answer}
* **Card 4 (Evaluation)**: ${cards[3].question}
  * *Answer*: ${cards[3].answer}`

    return { text, actions: [proposal], proposals: [proposal] }
  }

  private static buildTableStructured(topic: string): FallbackAIResult {
    const headers = ["Dimension", "Concept A", "Concept B", "Evaluation / Tradeoff"]
    const rows = [
      ["Architecture", "Centralized", "Distributed", "Single-point vs Fault Tolerant"],
      ["Latency", "< 15ms", "50-100ms", "Local memory vs Consensus"],
      ["Scalability", "Vertical", "Horizontal", "Hardware ceiling vs Cluster complexity"],
      ["Maintenance", "Straightforward", "Orchestrated", "Simpler ops vs Dynamic healing"],
    ]

    const proposal: CanvasActionProposal = {
      id: `prop_table_${Date.now()}`,
      summary: `Comparison table for "${topic}"`,
      actions: [
        {
          type: "createTable",
          headers,
          rows,
        },
      ],
      actionCount: { total: 1, create: 1, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }

    const text = `### 📊 Comparative Analysis: **${topic}**

| Dimension | Option A | Option B | Tradeoff & Recommendation |
| :--- | :--- | :--- | :--- |
| **Architecture** | Centralized | Distributed | Single-point vs Fault Tolerant |
| **Latency** | < 15ms | 50-100ms | In-memory vs Network Hop |
| **Scalability** | Vertical | Horizontal | Bounded vs Elastic |
| **Maintenance** | Minimal | Orchestrated | Simplicity vs Resilience |`

    return { text, actions: [proposal], proposals: [proposal] }
  }

  private static buildWireframeStructured(prompt: string): FallbackAIResult {
    const proposal: CanvasActionProposal = {
      id: `prop_wireframe_${Date.now()}`,
      summary: `Wireframe layout for "${prompt}"`,
      actions: [
        {
          type: "createNode",
          nodeType: "shape",
          x: 100,
          y: 100,
          w: 420,
          h: 320,
          shape: "rect",
          fill: "light",
        },

        {
          type: "createNode",
          nodeType: "text",
          x: 120,
          y: 120,
          w: 380,
          h: 40,
          text: `${prompt.charAt(0).toUpperCase() + prompt.slice(1)}`,
          fontSize: 20,
          bold: true,
        },
        {
          type: "createNode",
          nodeType: "component",
          x: 120,
          y: 180,
          w: 380,
          h: 44,
          kind: "input",
          props: { placeholder: "Enter details…", label: "Primary Input" },
        },
        {
          type: "createNode",
          nodeType: "component",
          x: 120,
          y: 250,
          w: 180,
          h: 40,
          kind: "button",
          props: { label: "Submit Action", variant: "primary" },
        },
        {
          type: "createNode",
          nodeType: "component",
          x: 320,
          y: 250,
          w: 180,
          h: 40,
          kind: "button",
          props: { label: "Cancel", variant: "outline" },
        },
      ],
      actionCount: { total: 5, create: 5, update: 0, delete: 0 },
      generatedAt: new Date().toISOString(),
    }

    const text = `### 📐 UI Wireframe Proposal: **${prompt}**

Here is a napkin wireframe layout structure for **${prompt}**:
* **Container Card**: Outer viewport wrapper with subtle hand-drawn sketch fill.
* **Header Title**: High-contrast headline typography.
* **Form Inputs**: Interactive field and submit/cancel action buttons.`

    return { text, actions: [proposal], proposals: [proposal] }
  }

  private static generateStepByStepResponse(prompt: string): string {
    return `### 🔢 Step-by-Step Problem Solver

**Problem Statement:**
> ${prompt}

---

#### **Step 1: Understand & Isolate Key Variables**
* Identify the known inputs, initial constraints, and target objective.
* Check boundary invariants and ensure units/types align consistently.

#### **Step 2: Formulate the Governing Model**
* Establish the mathematical or logical relation:
  $$\\text{Target} = f(\\text{Input}_1, \\text{Input}_2, \\dots, \\text{Constraints})$$
* Deconstruct the composite problem into discrete sub-problems.

#### **Step 3: Execute Systematic Computation**
1. Substitute parameter values into the foundational equation.
2. Simplify algebraically / step through execution trace.
3. Compute intermediate values and maintain exact precision.

#### **Step 4: Verify & Sanity Check**
* **Dimensional Consistency**: Verify units and return types match.
* **Edge Cases**: Test with $0$, extreme minimum, and upper asymptotic limits.
* **Conclusion**: The solution satisfies all required initial constraints.

> 💡 *To customize with live dynamic AI queries, configure your Google Gemini API key in **Settings ⚙️**.*`
  }

  private static generateActiveRecallResponse(prompt: string): string {
    return `### 🎯 Active Recall Challenge

Let's test your conceptual understanding of **${prompt}**!

#### **Question 1 (Core Concept)**
What is the primary mechanism behind this concept, and why is it preferred over naive alternatives?
* *Think through your answer before revealing the breakdown below.*

#### **Question 2 (Edge Case Analysis)**
Under what specific boundary condition would this model fail or exhibit degraded performance?

#### **Question 3 (Real-World Application)**
Suppose you need to scale this architecture to handle $10\\times$ volume. What bottleneck would arise first?

---
*Tip: Try drawing your mental model or flowchart on the canvas to solidify memory retention!*`
  }

  private static generateSocraticResponse(prompt: string): string {
    return `### 🏛️ Socratic Deep Dive

To understand **"${prompt}"**, let's start with a foundational intuition:

1. **The First Principles Question**: What is the most fundamental problem that this concept was invented to solve?
2. **The Analogy**: Think of it like a library index system—instead of searching through every book on every shelf (linear scan), you maintain a structured catalog with direct pointers.
3. **Key Inquiry**: If we remove the caching or indexing layer, what happens to the overall system throughput?

*What part of this mechanism would you like to explore deeper? You can also ask me to generate a mind map or flowchart for it!*`
  }

  private static generateComprehensiveResponse(prompt: string): string {
    const topic = this.extractTopic(prompt, "Study Notes & Key Insights")
    return `### 📘 **${topic}**

Here is a structured breakdown and study guide for your query:

#### **1. Core Concept & Summary**
* **Overview**: **${topic}** centers around clear logical structuring, robust invariants, and modular execution.
* **Key Benefit**: Provides intuitive reasoning models, predictable transitions, and scalable workflows.

#### **2. Key Takeaways & Best Practices**
* Break complex questions down into isolated, verifiable components.
* Use diagrammatic visual thinking (Mind Maps & Flowcharts) on the canvas to inspect relationship topologies.
* Verify edge-case assumptions before committing to an implementation.

#### **3. Suggested Next Steps**
* Ask Zenith AI: *"Create a mind map for ${topic}"* or *"Generate flashcards on this"* to drop interactive learning nodes on your canvas.

> 💡 *To connect live Google Gemini (or Claude / OpenAI) for unbounded conversational generation, enter your API key in **BYOK Settings ⚙️**.*`
  }
}
