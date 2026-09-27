// ---------------------------------------------------------------------------
// Zenith AI — Reusable AI Asset & Component Memory
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid"
import type { CanvasAction, CanvasActionProposal } from "./types"

export type ReusableAssetType =
  | "component"
  | "study_artifact"
  | "diagram"
  | "flowchart"
  | "flashcards"
  | "concept_map"
  | "timeline"
  | "table"
  | "illustration"
  | "image"
  | "ui_block"
  | "group"

export interface ReusableAssetTemplateNode {
  id: string
  type: "shape" | "text" | "component" | "arrow" | "draw" | "image" | "pdf"
  relX: number // relative to template bounding box minX
  relY: number // relative to template bounding box minY
  w: number
  h: number
  shape?: string
  fill?: string
  text?: string
  fontSize?: number
  bold?: boolean
  align?: "left" | "center" | "right"
  kind?: string
  props?: Record<string, any>
  points?: [number, number][]
  src?: string
  name?: string
}

export interface ReusableAsset {
  id: string
  type: ReusableAssetType
  name: string
  tags: string[]
  semanticDescription: string
  templateNodes: ReusableAssetTemplateNode[]
  dimensions: { w: number; h: number }
  thumbnailSnippet?: string
  createdAt: string
  updatedAt: string
  usageCount: number
  userId?: string
}

export interface AssetSearchResult {
  asset: ReusableAsset
  score: number
  matchedTerms: string[]
}

// ---------------------------------------------------------------------------
// Pre-seeded High-Quality Napkin Sketch Templates
// ---------------------------------------------------------------------------

const SEED_ASSETS: ReusableAsset[] = [
  {
    id: "bio-flashcards-set",
    type: "flashcards",
    name: "Cellular Biology Active Recall Flashcards",
    tags: ["biology", "science", "flashcards", "cells", "study", "exam", "revision", "active recall"],
    semanticDescription: "A set of active-recall flashcards covering mitochondria, chloroplast, ATP synthesis, and cell membranes.",
    dimensions: { w: 680, h: 360 },
    thumbnailSnippet: "🃏 [4 Flashcards: Mitochondria, Chloroplast, ATP, Membrane]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 12,
    templateNodes: [
      // Card 1
      { id: "c1", type: "shape", relX: 0, relY: 0, w: 320, h: 160, shape: "rect", fill: "paper" },
      { id: "c1_q", type: "text", relX: 16, relY: 16, w: 288, h: 48, text: "Q: What is the primary role of the Mitochondria?", fontSize: 14, bold: true },
      { id: "c1_a", type: "text", relX: 16, relY: 74, w: 288, h: 64, text: "A: Generates cellular ATP via oxidative phosphorylation (the powerhouse of the cell).", fontSize: 13 },
      // Card 2
      { id: "c2", type: "shape", relX: 350, relY: 0, w: 320, h: 160, shape: "rect", fill: "paper" },
      { id: "c2_q", type: "text", relX: 366, relY: 16, w: 288, h: 48, text: "Q: Where does photosynthesis occur in plants?", fontSize: 14, bold: true },
      { id: "c2_a", type: "text", relX: 366, relY: 74, w: 288, h: 64, text: "A: Inside the Chloroplasts, specifically within thylakoid membranes and stroma.", fontSize: 13 },
      // Card 3
      { id: "c3", type: "shape", relX: 0, relY: 180, w: 320, h: 160, shape: "rect", fill: "paper" },
      { id: "c3_q", type: "text", relX: 16, relY: 196, w: 288, h: 48, text: "Q: What does ATP stand for?", fontSize: 14, bold: true },
      { id: "c3_a", type: "text", relX: 16, relY: 254, w: 288, h: 64, text: "A: Adenosine Triphosphate — the primary energy currency of biological systems.", fontSize: 13 },
      // Card 4
      { id: "c4", type: "shape", relX: 350, relY: 180, w: 320, h: 160, shape: "rect", fill: "paper" },
      { id: "c4_q", type: "text", relX: 366, relY: 196, w: 288, h: 48, text: "Q: Describe the fluid mosaic model.", fontSize: 14, bold: true },
      { id: "c4_a", type: "text", relX: 366, relY: 254, w: 288, h: 64, text: "A: A phospholipid bilayer with embedded cholesterol, integral proteins, and carbohydrate chains.", fontSize: 13 },
    ],
  },
  {
    id: "auth-login-wireframe",
    type: "ui_block",
    name: "User Authentication Login Wireframe",
    tags: ["login", "auth", "sign in", "form", "authentication", "wireframe", "screen", "ui", "account"],
    semanticDescription: "Standard authentication login screen wireframe with email, password, remember me checkbox, and primary submit button.",
    dimensions: { w: 380, h: 420 },
    thumbnailSnippet: "📱 [Login Form: Header + Email + Password + Button]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 24,
    templateNodes: [
      { id: "bg", type: "shape", relX: 0, relY: 0, w: 380, h: 420, shape: "rect", fill: "paper" },
      { id: "h1", type: "text", relX: 28, relY: 28, w: 324, h: 32, text: "Welcome Back", fontSize: 22, bold: true, align: "center" },
      { id: "sub", type: "text", relX: 28, relY: 64, w: 324, h: 24, text: "Sign in to your workspace account", fontSize: 13, align: "center" },
      // Email field
      { id: "lbl_email", type: "text", relX: 28, relY: 104, w: 324, h: 20, text: "Email Address", fontSize: 12, bold: true },
      { id: "inp_email", type: "component", relX: 28, relY: 128, w: 324, h: 42, kind: "input", props: { placeholder: "name@example.com", value: "" } },
      // Password field
      { id: "lbl_pass", type: "text", relX: 28, relY: 184, w: 324, h: 20, text: "Password", fontSize: 12, bold: true },
      { id: "inp_pass", type: "component", relX: 28, relY: 208, w: 324, h: 42, kind: "input", props: { placeholder: "••••••••••••", value: "" } },
      // Checkbox
      { id: "chk", type: "component", relX: 28, relY: 264, w: 200, h: 28, kind: "checkbox", props: { label: "Remember me for 30 days", checked: true } },
      // Submit button
      { id: "btn_submit", type: "component", relX: 28, relY: 310, w: 324, h: 46, kind: "button", props: { label: "Sign In", variant: "primary" } },
      // Forgot link
      { id: "lnk_forgot", type: "text", relX: 28, relY: 370, w: 324, h: 22, text: "Forgot your password?", fontSize: 12, align: "center" },
    ],
  },
  {
    id: "pricing-tier-block",
    type: "ui_block",
    name: "3-Tier Pricing Comparison Matrix",
    tags: ["pricing", "plans", "tiers", "subscription", "marketing", "table", "cards", "saas"],
    semanticDescription: "Three tier pricing comparison block showing Starter, Pro (Highlighted), and Enterprise tiers with features and CTA.",
    dimensions: { w: 780, h: 440 },
    thumbnailSnippet: "💳 [3 Pricing Cards: Free, Pro $29, Enterprise]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 18,
    templateNodes: [
      // Starter
      { id: "p1_bg", type: "shape", relX: 0, relY: 20, w: 240, h: 400, shape: "rect", fill: "paper" },
      { id: "p1_title", type: "text", relX: 16, relY: 40, w: 208, h: 28, text: "Starter", fontSize: 18, bold: true },
      { id: "p1_price", type: "text", relX: 16, relY: 72, w: 208, h: 36, text: "$0 / month", fontSize: 22, bold: true },
      { id: "p1_desc", type: "text", relX: 16, relY: 114, w: 208, h: 40, text: "Perfect for students & solo note-taking.", fontSize: 12 },
      { id: "p1_f1", type: "text", relX: 16, relY: 160, w: 208, h: 100, text: "✓ Unlimited local canvas\n✓ Basic napkin components\n✓ Local document storage\n✓ Community support", fontSize: 12 },
      { id: "p1_btn", type: "component", relX: 16, relY: 350, w: 208, h: 42, kind: "button", props: { label: "Get Started Free", variant: "secondary" } },

      // Pro (Highlighted)
      { id: "p2_bg", type: "shape", relX: 270, relY: 0, w: 240, h: 440, shape: "rect", fill: "light" },
      { id: "p2_badge", type: "component", relX: 286, relY: 16, w: 100, h: 26, kind: "badge", props: { label: "MOST POPULAR", variant: "accent" } },
      { id: "p2_title", type: "text", relX: 286, relY: 48, w: 208, h: 28, text: "Pro Study", fontSize: 18, bold: true },
      { id: "p2_price", type: "text", relX: 286, relY: 80, w: 208, h: 36, text: "$12 / month", fontSize: 22, bold: true },
      { id: "p2_desc", type: "text", relX: 286, relY: 122, w: 208, h: 40, text: "For serious learners, teams & researchers.", fontSize: 12 },
      { id: "p2_f1", type: "text", relX: 286, relY: 168, w: 208, h: 120, text: "✓ AI Study Copilot\n✓ Unlimited cloud DB sync\n✓ Live multi-user collaboration\n✓ Real-time version history\n✓ PDF & Document Import", fontSize: 12 },
      { id: "p2_btn", type: "component", relX: 286, relY: 370, w: 208, h: 44, kind: "button", props: { label: "Upgrade to Pro", variant: "primary" } },

      // Enterprise
      { id: "p3_bg", type: "shape", relX: 540, relY: 20, w: 240, h: 400, shape: "rect", fill: "paper" },
      { id: "p3_title", type: "text", relX: 556, relY: 40, w: 208, h: 28, text: "Enterprise", fontSize: 18, bold: true },
      { id: "p3_price", type: "text", relX: 556, relY: 72, w: 208, h: 36, text: "Custom", fontSize: 22, bold: true },
      { id: "p3_desc", type: "text", relX: 556, relY: 114, w: 208, h: 40, text: "Institutional licensing & custom SLA.", fontSize: 12 },
      { id: "p3_f1", type: "text", relX: 556, relY: 160, w: 208, h: 100, text: "✓ Custom BYOK & dedicated models\n✓ Team RBAC & Workspace governance\n✓ Dedicated audit log retention\n✓ Single Sign-On (SSO)", fontSize: 12 },
      { id: "p3_btn", type: "component", relX: 556, relY: 350, w: 208, h: 42, kind: "button", props: { label: "Contact Sales", variant: "secondary" } },
    ],
  },
  {
    id: "dashboard-stat-block",
    type: "ui_block",
    name: "Analytics & KPI Overview Dashboard Card",
    tags: ["dashboard", "kpi", "stats", "metrics", "analytics", "overview", "card", "numbers"],
    semanticDescription: "Dashboard metrics panel with 4 KPI summary cards (Total Revenue, Active Users, Study Hours, Completion Rate).",
    dimensions: { w: 720, h: 180 },
    thumbnailSnippet: "📊 [4 Metric Cards: $48.2k, 12,450 Users, 98.4% Uptime, 4.9 Rating]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 15,
    templateNodes: [
      // Card 1
      { id: "k1_bg", type: "shape", relX: 0, relY: 0, w: 165, h: 160, shape: "rect", fill: "paper" },
      { id: "k1_lbl", type: "text", relX: 12, relY: 16, w: 141, h: 20, text: "TOTAL REVENUE", fontSize: 11, bold: true },
      { id: "k1_val", type: "text", relX: 12, relY: 42, w: 141, h: 36, text: "$48,250", fontSize: 24, bold: true },
      { id: "k1_sub", type: "text", relX: 12, relY: 90, w: 141, h: 20, text: "↑ +14.2% from last mo", fontSize: 11 },

      // Card 2
      { id: "k2_bg", type: "shape", relX: 185, relY: 0, w: 165, h: 160, shape: "rect", fill: "paper" },
      { id: "k2_lbl", type: "text", relX: 197, relY: 16, w: 141, h: 20, text: "ACTIVE USERS", fontSize: 11, bold: true },
      { id: "k2_val", type: "text", relX: 197, relY: 42, w: 141, h: 36, text: "12,450", fontSize: 24, bold: true },
      { id: "k2_sub", type: "text", relX: 197, relY: 90, w: 141, h: 20, text: "↑ +8.5% weekly new", fontSize: 11 },

      // Card 3
      { id: "k3_bg", type: "shape", relX: 370, relY: 0, w: 165, h: 160, shape: "rect", fill: "paper" },
      { id: "k3_lbl", type: "text", relX: 382, relY: 16, w: 141, h: 20, text: "STUDY SESSIONS", fontSize: 11, bold: true },
      { id: "k3_val", type: "text", relX: 382, relY: 42, w: 141, h: 36, text: "94,180", fontSize: 24, bold: true },
      { id: "k3_sub", type: "text", relX: 382, relY: 90, w: 141, h: 20, text: "Avg 42m duration", fontSize: 11 },

      // Card 4
      { id: "k4_bg", type: "shape", relX: 555, relY: 0, w: 165, h: 160, shape: "rect", fill: "paper" },
      { id: "k4_lbl", type: "text", relX: 567, relY: 16, w: 141, h: 20, text: "SATISFACTION", fontSize: 11, bold: true },
      { id: "k4_val", type: "text", relX: 567, relY: 42, w: 141, h: 36, text: "99.2%", fontSize: 24, bold: true },
      { id: "k4_sub", type: "text", relX: 567, relY: 90, w: 141, h: 20, text: "Based on 3.2k reviews", fontSize: 11 },
    ],
  },
  {
    id: "algorithm-flowchart",
    type: "flowchart",
    name: "Algorithmic Decision Process Flowchart",
    tags: ["flowchart", "algorithm", "process", "diagram", "decision", "logic", "workflow", "steps"],
    semanticDescription: "A complete decision flowchart with start oval, input step, condition diamond, yes/no branches, and termination oval.",
    dimensions: { w: 560, h: 480 },
    thumbnailSnippet: "🔄 [Flowchart: Start -> Read Input -> Condition? -> Success/Error]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 20,
    templateNodes: [
      // Start
      { id: "f_start", type: "shape", relX: 180, relY: 0, w: 160, h: 50, shape: "ellipse", fill: "light" },
      { id: "f_start_t", type: "text", relX: 190, relY: 14, w: 140, h: 24, text: "Start Process", fontSize: 13, bold: true, align: "center" },
      // Arrow 1
      { id: "a1", type: "arrow", relX: 260, relY: 50, w: 0, h: 50, points: [[0, 0], [0, 50]] },
      // Step 1: Input
      { id: "f_step1", type: "shape", relX: 160, relY: 100, w: 200, h: 60, shape: "rect", fill: "paper" },
      { id: "f_step1_t", type: "text", relX: 170, relY: 116, w: 180, h: 32, text: "1. Validate User Payload & Check Permissions", fontSize: 12, align: "center" },
      // Arrow 2
      { id: "a2", type: "arrow", relX: 260, relY: 160, w: 0, h: 50, points: [[0, 0], [0, 50]] },
      // Decision Diamond
      { id: "f_dec", type: "shape", relX: 180, relY: 210, w: 160, h: 90, shape: "rect", fill: "light" },
      { id: "f_dec_t", type: "text", relX: 190, relY: 240, w: 140, h: 36, text: "Is Payload Valid?", fontSize: 13, bold: true, align: "center" },
      // Branch Yes -> Success
      { id: "a_yes", type: "arrow", relX: 260, relY: 300, w: 0, h: 50, points: [[0, 0], [0, 50]] },
      { id: "f_yes_lbl", type: "text", relX: 270, relY: 310, w: 60, h: 20, text: "Yes", fontSize: 11, bold: true },
      { id: "f_step2", type: "shape", relX: 160, relY: 350, w: 200, h: 50, shape: "rect", fill: "paper" },
      { id: "f_step2_t", type: "text", relX: 170, relY: 364, w: 180, h: 24, text: "Execute Mutation Safely", fontSize: 12, align: "center" },
      // Arrow to End
      { id: "a_end", type: "arrow", relX: 260, relY: 400, w: 0, h: 40, points: [[0, 0], [0, 40]] },
      // End
      { id: "f_end", type: "shape", relX: 180, relY: 440, w: 160, h: 45, shape: "ellipse", fill: "light" },
      { id: "f_end_t", type: "text", relX: 190, relY: 452, w: 140, h: 22, text: "End (Done)", fontSize: 13, bold: true, align: "center" },
      // Branch No -> Error
      { id: "a_no", type: "arrow", relX: 340, relY: 255, w: 90, h: 0, points: [[0, 0], [90, 0]] },
      { id: "f_no_lbl", type: "text", relX: 350, relY: 235, w: 60, h: 20, text: "No", fontSize: 11, bold: true },
      { id: "f_err", type: "shape", relX: 430, relY: 230, w: 130, h: 50, shape: "rect", fill: "paper" },
      { id: "f_err_t", type: "text", relX: 440, relY: 244, w: 110, h: 24, text: "Log & Return 400", fontSize: 11, align: "center" },
    ],
  },
  {
    id: "timeline-milestones",
    type: "timeline",
    name: "Chronological Project & History Milestone Timeline",
    tags: ["timeline", "history", "milestones", "chronological", "schedule", "events", "phases", "roadmap"],
    semanticDescription: "A horizontal chronological milestone timeline with connecting axis line and 4 dated milestone cards.",
    dimensions: { w: 760, h: 220 },
    thumbnailSnippet: "⏳ [Timeline: Phase 1 -> Phase 2 -> Phase 3 -> Launch]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 16,
    templateNodes: [
      // Main axis line
      { id: "t_axis", type: "arrow", relX: 30, relY: 80, w: 700, h: 0, points: [[0, 0], [700, 0]] },
      // Milestone 1
      { id: "m1_dot", type: "shape", relX: 60, relY: 65, w: 30, h: 30, shape: "ellipse", fill: "light" },
      { id: "m1_card", type: "shape", relX: 10, relY: 110, w: 160, h: 90, shape: "rect", fill: "paper" },
      { id: "m1_date", type: "text", relX: 20, relY: 118, w: 140, h: 18, text: "PHASE 1 • Q1", fontSize: 10, bold: true },
      { id: "m1_desc", type: "text", relX: 20, relY: 138, w: 140, h: 52, text: "Requirements gathering, user research, and technical feasibility audit.", fontSize: 11 },

      // Milestone 2
      { id: "m2_dot", type: "shape", relX: 250, relY: 65, w: 30, h: 30, shape: "ellipse", fill: "light" },
      { id: "m2_card", type: "shape", relX: 200, relY: 110, w: 160, h: 90, shape: "rect", fill: "paper" },
      { id: "m2_date", type: "text", relX: 210, relY: 118, w: 140, h: 18, text: "PHASE 2 • Q2", fontSize: 10, bold: true },
      { id: "m2_desc", type: "text", relX: 210, relY: 138, w: 140, h: 52, text: "Core wireframing, napkin sketch kit implementation, and BYOK credentials.", fontSize: 11 },

      // Milestone 3
      { id: "m3_dot", type: "shape", relX: 440, relY: 65, w: 30, h: 30, shape: "ellipse", fill: "light" },
      { id: "m3_card", type: "shape", relX: 390, relY: 110, w: 160, h: 90, shape: "rect", fill: "paper" },
      { id: "m3_date", type: "text", relX: 400, relY: 118, w: 140, h: 18, text: "PHASE 3 • Q3", fontSize: 10, bold: true },
      { id: "m3_desc", type: "text", relX: 400, relY: 138, w: 140, h: 52, text: "AI Agent system, tool execution, study copilot, and asset memory.", fontSize: 11 },

      // Milestone 4
      { id: "m4_dot", type: "shape", relX: 630, relY: 65, w: 30, h: 30, shape: "ellipse", fill: "light" },
      { id: "m4_card", type: "shape", relX: 580, relY: 110, w: 160, h: 90, shape: "rect", fill: "paper" },
      { id: "m4_date", type: "text", relX: 590, relY: 118, w: 140, h: 18, text: "PHASE 4 • GA", fontSize: 10, bold: true },
      { id: "m4_desc", type: "text", relX: 590, relY: 138, w: 140, h: 52, text: "Global release, collaborative sync, and high-performance offline resilience.", fontSize: 11 },
    ],
  },
  {
    id: "exam-revision-board",
    type: "study_artifact",
    name: "Comprehensive STEM Exam Revision Board",
    tags: ["revision", "exam", "cheat sheet", "study board", "formula", "stem", "notes", "summary"],
    semanticDescription: "A multi-section structured study board with Core Definitions, Formula Sheet, Common Pitfalls, and Quick Checkpoints.",
    dimensions: { w: 760, h: 480 },
    thumbnailSnippet: "📋 [Study Board: Key Terms, Formulas, Mistakes, Checklist]",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    usageCount: 22,
    templateNodes: [
      // Title Header
      { id: "b_hdr", type: "shape", relX: 0, relY: 0, w: 760, h: 50, shape: "rect", fill: "light" },
      { id: "b_hdr_t", type: "text", relX: 16, relY: 12, w: 728, h: 26, text: "EXAM REVISION BOARD • Core Principles & Formula Sheet", fontSize: 16, bold: true },

      // Section 1: Key Definitions (Left Top)
      { id: "s1_bg", type: "shape", relX: 0, relY: 65, w: 365, h: 190, shape: "rect", fill: "paper" },
      { id: "s1_h", type: "text", relX: 16, relY: 78, w: 333, h: 22, text: "1. Key Definitions & Laws", fontSize: 13, bold: true },
      { id: "s1_b", type: "text", relX: 16, relY: 106, w: 333, h: 135, text: "• First Law: Energy cannot be created or destroyed, only transformed.\n• Second Law: Entropy of an isolated system always increases over time.\n• Equilibrium: Forward and reverse reaction rates are strictly balanced.", fontSize: 12 },

      // Section 2: Essential Formulas (Right Top)
      { id: "s2_bg", type: "shape", relX: 395, relY: 65, w: 365, h: 190, shape: "rect", fill: "paper" },
      { id: "s2_h", type: "text", relX: 411, relY: 78, w: 333, h: 22, text: "2. Essential Formulas", fontSize: 13, bold: true },
      { id: "s2_b", type: "text", relX: 411, relY: 106, w: 333, h: 135, text: "• ΔG = ΔH - TΔS  (Gibbs Free Energy)\n• PV = nRT  (Ideal Gas Equation)\n• E = mc²  (Mass-Energy Equivalence)\n• pH = -log[H+]  (Acidity index)", fontSize: 12 },

      // Section 3: Common Traps & Pitfalls (Left Bottom)
      { id: "s3_bg", type: "shape", relX: 0, relY: 270, w: 365, h: 190, shape: "rect", fill: "paper" },
      { id: "s3_h", type: "text", relX: 16, relY: 283, w: 333, h: 22, text: "3. Common Traps & Pitfalls", fontSize: 13, bold: true },
      { id: "s3_b", type: "text", relX: 16, relY: 311, w: 333, h: 135, text: "⚠️ Always convert temperatures to Kelvin (K = °C + 273.15).\n⚠️ Watch unit prefixes: kJ vs J, mL vs L.\n⚠️ Catalysts increase reaction speed but DO NOT alter ΔG.", fontSize: 12 },

      // Section 4: Self-Assessment Checklist (Right Bottom)
      { id: "s4_bg", type: "shape", relX: 395, relY: 270, w: 365, h: 190, shape: "rect", fill: "paper" },
      { id: "s4_h", type: "text", relX: 411, relY: 283, w: 333, h: 22, text: "4. Readiness Checklist", fontSize: 13, bold: true },
      { id: "s4_b", type: "text", relX: 411, relY: 311, w: 333, h: 135, text: "☐ Can define state functions without looking.\n☐ Able to derive standard enthalpy of formation.\n☐ Completed 5 timed practice problems.\n☐ Reviewed past mistake log.", fontSize: 12 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Memory Store Engine
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_KEY = "zenith_ai_reusable_assets_v1"

export class AssetMemory {
  private static assetsCache: ReusableAsset[] | null = null

  /**
   * Initializes or loads the asset library.
   */
  private static getAssets(): ReusableAsset[] {
    if (this.assetsCache) return this.assetsCache

    let loaded: ReusableAsset[] = []
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (raw) {
          loaded = JSON.parse(raw)
        }
      } catch (err) {
        console.warn("[AssetMemory] Failed to load local assets:", err)
      }
    }

    // Merge with SEED_ASSETS so built-in templates are always present
    const map = new Map<string, ReusableAsset>()
    for (const seed of SEED_ASSETS) {
      map.set(seed.id, seed)
    }
    for (const item of loaded) {
      map.set(item.id, item)
    }

    this.assetsCache = Array.from(map.values())
    return this.assetsCache
  }

  /**
   * Persists the current cache to local storage.
   */
  private static persist(): void {
    if (typeof window === "undefined" || !this.assetsCache) return
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.assetsCache))
    } catch (err) {
      console.warn("[AssetMemory] LocalStorage save failed:", err)
    }
  }

  /**
   * Semantic & tag search across the reusable asset memory.
   * Matches queries like "blue biology diagram", "login screen", "pricing section",
   * "flashcard", "chemistry flowchart", "dashboard card", etc.
   */
  static search(
    query: string,
    options: {
      type?: ReusableAssetType
      limit?: number
      userId?: string
    } = {}
  ): AssetSearchResult[] {
    const assets = this.getAssets()
    const rawTokens = query
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)

    const limit = options.limit || 5
    const results: AssetSearchResult[] = []

    for (const asset of assets) {
      // User isolation: if asset has a userId, only match current user
      if (asset.userId && options.userId && asset.userId !== options.userId) {
        continue
      }

      if (options.type && asset.type !== options.type) {
        continue
      }

      let score = 0
      const matchedTerms: string[] = []

      const assetName = asset.name.toLowerCase()
      const assetDesc = asset.semanticDescription.toLowerCase()
      const assetTags = asset.tags.map((t) => t.toLowerCase())

      for (const token of rawTokens) {
        let tokenMatched = false

        // Exact tag match (highest weight)
        if (assetTags.includes(token)) {
          score += 10
          tokenMatched = true
        } else if (assetTags.some((t) => t.includes(token))) {
          score += 6
          tokenMatched = true
        }

        // Title match
        if (assetName.includes(token)) {
          score += 7
          tokenMatched = true
        }

        // Semantic description match
        if (assetDesc.includes(token)) {
          score += 4
          tokenMatched = true
        }

        // Type match
        if (asset.type.toLowerCase().includes(token)) {
          score += 5
          tokenMatched = true
        }

        if (tokenMatched) {
          matchedTerms.push(token)
        }
      }

      // Bonus for usage count (frequently reused assets bubble up)
      score += Math.min(asset.usageCount * 0.2, 5)

      if (score > 0) {
        results.push({ asset, score, matchedTerms })
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  /**
   * Saves a new reusable asset or component to memory.
   */
  static saveAsset(
    assetData: {
      name: string
      type: ReusableAssetType
      tags: string[]
      semanticDescription: string
      templateNodes: ReusableAssetTemplateNode[]
      dimensions?: { w: number; h: number }
      thumbnailSnippet?: string
      userId?: string
    }
  ): ReusableAsset {
    const assets = this.getAssets()
    const id = `asset_${nanoid(8)}`

    // Compute dimensions if missing
    let w = assetData.dimensions?.w || 300
    let h = assetData.dimensions?.h || 200

    if (!assetData.dimensions && assetData.templateNodes.length > 0) {
      let maxRight = 0
      let maxBottom = 0
      for (const n of assetData.templateNodes) {
        maxRight = Math.max(maxRight, n.relX + (n.w || 100))
        maxBottom = Math.max(maxBottom, n.relY + (n.h || 50))
      }
      w = maxRight || 300
      h = maxBottom || 200
    }

    const newAsset: ReusableAsset = {
      id,
      type: assetData.type,
      name: assetData.name,
      tags: Array.from(new Set(assetData.tags.map((t) => t.trim().toLowerCase()))),
      semanticDescription: assetData.semanticDescription,
      templateNodes: assetData.templateNodes,
      dimensions: { w, h },
      thumbnailSnippet: assetData.thumbnailSnippet || `📦 [${assetData.name} - ${assetData.templateNodes.length} items]`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 1,
      userId: assetData.userId,
    }

    assets.unshift(newAsset)
    this.persist()
    return newAsset
  }

  /**
   * Retrieves an asset by its ID.
   */
  static getAssetById(id: string): ReusableAsset | null {
    const assets = this.getAssets()
    return assets.find((a) => a.id === id) || null
  }

  /**
   * Records that an asset was reused to boost future relevance.
   */
  static recordUsage(id: string): void {
    const assets = this.getAssets()
    const asset = assets.find((a) => a.id === id)
    if (asset) {
      asset.usageCount = (asset.usageCount || 0) + 1
      asset.updatedAt = new Date().toISOString()
      this.persist()
    }
  }

  /**
   * Converts a reusable asset into concrete CanvasAction items positioned at (startX, startY).
   * Adapts text and props if overrides are provided.
   */
  static instantiate(
    assetId: string,
    origin: { x: number; y: number },
    overrides?: {
      titleOverride?: string
      textReplacements?: Record<string, string>
    }
  ): CanvasAction[] {
    const asset = this.getAssetById(assetId)
    if (!asset) return []

    this.recordUsage(assetId)

    const actions: CanvasAction[] = []

    for (const node of asset.templateNodes) {
      let text = node.text
      if (text && overrides?.textReplacements) {
        for (const [find, replace] of Object.entries(overrides.textReplacements)) {
          text = text.replaceAll(find, replace)
        }
      }

      actions.push({
        type: "createNode",
        nodeType: node.type,
        x: Math.round(origin.x + node.relX),
        y: Math.round(origin.y + node.relY),
        w: node.w,
        h: node.h,
        shape: node.shape as any,
        fill: node.fill as any,
        text,
        fontSize: node.fontSize,
        bold: node.bold,
        align: node.align,
        kind: node.kind,
        props: node.props,
        points: node.points,
        src: node.src,
        name: node.name,
      } as any)
    }

    return actions
  }

  /**
   * Saves a generated or imported image/diagram asset with metadata for future AI reuse.
   */
  static saveImageAsset(params: {
    name: string
    tags: string[]
    semanticDescription: string
    src: string
    w: number
    h: number
    userId?: string
  }): ReusableAsset {
    return this.saveAsset({
      type: "image",
      name: params.name,
      tags: [...params.tags, "image", "visual", "asset"],
      semanticDescription: params.semanticDescription,
      templateNodes: [
        {
          id: "img_node",
          type: "image",
          relX: 0,
          relY: 0,
          w: params.w,
          h: params.h,
          src: params.src,
          name: params.name,
        },
      ],
      thumbnailSnippet: `🖼️ [Image: ${params.name} (${params.w}x${params.h})]`,
      userId: params.userId,
    })
  }

  /**
   * Lists all available reusable assets.
   */
  static listAll(userId?: string): ReusableAsset[] {
    const assets = this.getAssets()
    return assets.filter((a) => !a.userId || a.userId === userId)
  }
}

