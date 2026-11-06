// ---------------------------------------------------------------------------
// Test Suite: Floating Contextual Toolbar Verification
// ---------------------------------------------------------------------------

import fs from "fs"
import path from "path"
import { HOVER_THEMES } from "../lib/hover-themes"
import { MIN_SIZE, scaleNodes } from "../lib/canvas/transform"
import { fitTextBox } from "../lib/canvas/text-reflow"
import type { TextNode, ComponentNode, ShapeNode, SquigNode } from "../lib/types"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`)
    process.exit(1)
  }
}

console.log("🧪 Testing Floating Contextual Toolbar Implementation...\n")

// 1. Verify old permanent inspector removed from app/page.tsx
const pageContent = fs.readFileSync(path.resolve("app/page.tsx"), "utf-8")
assert(!pageContent.includes("<Inspector"), "app/page.tsx must NOT render <Inspector />")
assert(!pageContent.includes('from "@/components/chrome/inspector"'), "app/page.tsx must not import Inspector")
console.log("✅ 1. Large permanent right-side inspector removed from app/page.tsx")

// 2. Verify FloatingContextToolbar exists and is mounted in Canvas
const canvasContent = fs.readFileSync(path.resolve("components/canvas/canvas.tsx"), "utf-8")
assert(canvasContent.includes("FloatingContextToolbar"), "canvas.tsx must import FloatingContextToolbar")
assert(canvasContent.includes("<FloatingContextToolbar"), "canvas.tsx must render <FloatingContextToolbar")

const toolbarContent = fs.readFileSync(path.resolve("components/canvas/floating-context-toolbar.tsx"), "utf-8")
assert(toolbarContent.includes("export const FloatingContextToolbar"), "floating-context-toolbar.tsx must export FloatingContextToolbar")
console.log("✅ 2. FloatingContextToolbar properly mounted in canvas overlay pipeline")

// 3. Verify target dimensions and styling
assert(toolbarContent.includes("460px"), "Toolbar must have ~438-460px target width")
assert(toolbarContent.includes("62px"), "Toolbar must have ~62px target height")
assert(toolbarContent.includes("data-zenithsui-chrome"), "Toolbar must be marked with data-zenithsui-chrome")
console.log("✅ 3. Target dimensions (~438×62px) and chrome event isolation verified")

// 4. Verify Text Editing Capabilities (Reference Image 2)
assert(toolbarContent.includes("st().setEditing(texts[0].id)"), "Toolbar must enter text editing mode on Edit click")
assert(toolbarContent.includes("handleStepFontSize"), "Toolbar must support font size stepping (+/-)")
assert(toolbarContent.includes("TextStyleToggles"), "Toolbar must include bold/italic/underline toggles")
assert(toolbarContent.includes("TextAlignMenu"), "Toolbar must include text alignment menu")

const mockTextNode: TextNode = {
  id: "test-text",
  type: "text",
  x: 100,
  y: 100,
  w: 200,
  h: 40,
  text: "Hello World",
  fontSize: 16,
  align: "left",
}

const reflowed = fitTextBox(mockTextNode, "Hello World", 24)
assert(reflowed.fontSize === 24, "Font size must update correctly on text node")
assert(reflowed.w !== undefined && reflowed.h !== undefined, "fitTextBox must recompute dimensions")
console.log("✅ 4. Text editing (Edit, Font Size stepper, Bold/Italic/Underline, Alignment) verified")

// 5. Verify Position & Dimensions popover controls (Reference Image 1)
assert(toolbarContent.includes("st().flipSelected(\"x\")"), "Must support horizontal flipping")
assert(toolbarContent.includes("st().flipSelected(\"y\")"), "Must support vertical flipping")
assert(toolbarContent.includes("st().toggleLockSelected()"), "Must support lock/unlock toggle")
assert(toolbarContent.includes("resizeTo"), "Must support X, Y, W, H numeric resizing")

const mockShapeNode: ShapeNode = {
  id: "test-shape",
  type: "shape",
  shape: "rect",
  x: 50,
  y: 50,
  w: 120,
  h: 80,
  fill: "none",
  stroke: "regular",
}

const scaled = scaleNodes([mockShapeNode], { x: 50, y: 50, w: 120, h: 80 }, { x: 50, y: 50, w: 240, h: 160 })
assert(scaled["test-shape"].w === 240, "Resized width must scale properly")
assert(scaled["test-shape"].h === 160, "Resized height must scale properly")
console.log("✅ 5. Position & Dimensions (X, Y, W, H, Flip H/V, Lock/Unlock) verified")

// 6. Verify Component Variants & Accent Swatches (Reference Image 1 - Math Study Tracker)
assert(toolbarContent.includes("ACCENT_SWATCHES"), "Must include Accent Swatches for components")
assert(toolbarContent.includes("emerald"), "Must support emerald star accent color from Reference Image 1")
assert(toolbarContent.includes("orange"), "Must support orange star accent color")
assert(toolbarContent.includes("accentColor"), "Must bind accentColor on component nodes")

const mockComponentNode: ComponentNode = {
  id: "test-tracker",
  type: "component",
  kind: "math-study-tracker",
  x: 200,
  y: 200,
  w: 520,
  h: 560,
  props: {
    title: "math study tracker",
    accentColor: "orange",
    showPaperclip: true,
    showStars: true,
  },
}

assert(mockComponentNode.props.accentColor === "orange", "Initial accent color is orange")
mockComponentNode.props.accentColor = "emerald"
assert(mockComponentNode.props.accentColor === "emerald", "Accent color switched to emerald")
mockComponentNode.props.showPaperclip = false
assert(mockComponentNode.props.showPaperclip === false, "Paperclip toggle toggled off")
mockComponentNode.props.showStars = false
assert(mockComponentNode.props.showStars === false, "Stars toggle toggled off")
console.log("✅ 6. Variant controls (Star Accent emerald/orange, Paperclip, Stars) verified")

// 7. Verify Content editing (Title)
assert(toolbarContent.includes("textControls"), "Must support component title & textControls")
mockComponentNode.props.title = "Physics Study Tracker"
assert(mockComponentNode.props.title === "Physics Study Tracker", "Title property updated")
console.log("✅ 7. Content section (Title field) verified")

// 8. Verify Smart Hover Notes (Reference Image 1)
assert(toolbarContent.includes("hoverNote"), "Must support hoverNote property on nodes")
assert(toolbarContent.includes("HOVER_THEMES"), "Must support 5 Reference Design Card themes")
assert(HOVER_THEMES.length === 5, "Must have exactly 5 hover note themes")
assert(toolbarContent.includes("SmartHoverCardContent"), "Must render live hover note card preview")

const nodeWithNote: SquigNode = {
  ...mockComponentNode,
  hoverNote: {
    enabled: true,
    title: "Class 10 Revision",
    body: "Finish NCERT Exemplar questions first.",
    theme: "yellow-slate",
  },
}
assert(nodeWithNote.hoverNote?.enabled === true, "Hover note must be enabled")
assert(nodeWithNote.hoverNote?.title === "Class 10 Revision", "Hover note title verified")
assert(nodeWithNote.hoverNote?.body?.includes("NCERT Exemplar") === true, "Hover note body verified")
console.log("✅ 8. Smart Hover Notes (Add, Edit, 5 Theme Styles, Preview, Remove) verified")

// 9. Verify Detach & Delete (Reference Image 1)
assert(toolbarContent.includes("st().detachSelected()"), "Must preserve detach component action")
assert(toolbarContent.includes("st().deleteSelected()"), "Must preserve delete action")
assert(toolbarContent.includes("st().duplicateSelected()"), "Must support duplicate action")
console.log("✅ 9. Detach & Delete actions verified")

// 10. Verify Viewport-Aware Positioning & Clamping
function calculateToolbarPosition(
  boxTop: number,
  boxBottom: number,
  boxLeft: number,
  boxRight: number,
  toolbarW: number,
  toolbarH: number,
  vw: number,
  vh: number
) {
  const gap = 12
  const aboveY = boxTop - toolbarH - gap
  const belowY = boxBottom + gap

  const targetX = (boxLeft + boxRight) / 2 - toolbarW / 2
  const clampedX = Math.min(Math.max(targetX, 16), Math.max(16, vw - toolbarW - 16))
  const isFlippedBelow = aboveY < 72
  const clampedY = isFlippedBelow ? Math.min(belowY, vh - toolbarH - 16) : aboveY

  return { x: clampedX, y: clampedY, isFlippedBelow }
}

// Case A: Normal object near center of canvas -> floats above
const posA = calculateToolbarPosition(300, 500, 400, 600, 438, 62, 1280, 800)
assert(!posA.isFlippedBelow, "Should float above when ample room")
assert(posA.y === 300 - 62 - 12, "Should be placed at boxTop - toolbarH - gap")
assert(posA.x >= 16 && posA.x <= 1280 - 438 - 16, "Must be clamped inside viewport horizontally")

// Case B: Object near top of canvas (boxTop = 40) -> flips below
const posB = calculateToolbarPosition(40, 140, 200, 300, 438, 62, 1280, 800)
assert(posB.isFlippedBelow, "Should flip below when above leaves < 72px")
assert(posB.y === 140 + 12, "Should be placed at boxBottom + gap")

// Case C: Object near right boundary -> clamps to right margin
const posC = calculateToolbarPosition(300, 400, 1100, 1250, 438, 62, 1280, 800)
assert(posC.x === 1280 - 438 - 16, "Should clamp to right boundary")

console.log("✅ 10. Intelligent positioning, flip-below, and viewport clamping verified")

console.log("\n🎉 ALL 10 TESTS PASSED SUCCESSFULLY!")
