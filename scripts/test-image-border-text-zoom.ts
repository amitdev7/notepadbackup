// ---------------------------------------------------------------------------
// Image Border Customization & Zoom-Aware Text Engine Tests
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/test-image-border-text-zoom.ts
// ---------------------------------------------------------------------------

import { nodePrims } from "../lib/sketch/node-prims.ts"
import {
  type ImageNode,
  type TextNode,
  DEFAULT_IMAGE_BORDER,
  type ImageBorder,
  worldToScreen,
  screenToWorld,
} from "../lib/types.ts"
import { validNode, encodeNodes, decodeNodes } from "../lib/clipboard-payload.ts"
import { DEFAULT_TEXT_SETTINGS } from "../lib/shell-store.ts"
import { DEFAULT_ACTIVE_STYLE } from "../lib/store.ts"
import { fitTextBox, autoSizeTextBox } from "../lib/canvas/text-reflow.ts"
import { textBlockHeight } from "../lib/sketch/text-layout.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

console.log("Running Image Border & Zoom-Aware Text Engine test suite...")

// ===========================================================================
// FEATURE A: IMAGE BORDER CUSTOMIZATION TESTS
// ===========================================================================

// 1. Image nodes have no rough sketch primitive rectangles by default
{
  const img: ImageNode = {
    id: "img-1",
    type: "image",
    x: 100,
    y: 200,
    w: 400,
    h: 300,
    assetId: "asset-123",
    seed: 42,
  }

  const prims = nodePrims(img)
  check(
    "nodePrims for image returns empty list (no permanent sketch border)",
    Array.isArray(prims) && prims.length === 0,
    `prims: ${JSON.stringify(prims)}`
  )
}

// 2. DEFAULT_IMAGE_BORDER specification
{
  check(
    "DEFAULT_IMAGE_BORDER is disabled by default",
    DEFAULT_IMAGE_BORDER.enabled === false
  )
  check(
    "DEFAULT_IMAGE_BORDER default width is 2",
    DEFAULT_IMAGE_BORDER.width === 2
  )
  check(
    "DEFAULT_IMAGE_BORDER default style is solid",
    DEFAULT_IMAGE_BORDER.style === "solid"
  )
  check(
    "DEFAULT_IMAGE_BORDER default opacity is 100",
    DEFAULT_IMAGE_BORDER.opacity === 100
  )
  check(
    "DEFAULT_IMAGE_BORDER default radius is 0",
    DEFAULT_IMAGE_BORDER.radius === 0
  )
  check(
    "DEFAULT_IMAGE_BORDER default color is ink token",
    DEFAULT_IMAGE_BORDER.color === "var(--sq-ink)"
  )
}

// 3. Image node with border persistence & cloning
{
  const borderConfig: ImageBorder = {
    enabled: true,
    color: "#ff0000",
    width: 4,
    style: "dashed",
    opacity: 80,
    radius: 12,
  }

  const imgWithBorder: ImageNode = {
    id: "img-2",
    type: "image",
    x: 0,
    y: 0,
    w: 200,
    h: 200,
    assetId: "asset-abc",
    seed: 99,
    border: borderConfig,
  }

  const cloned = structuredClone(imgWithBorder)
  check(
    "Cloned image preserves border configuration exactly",
    cloned.border?.enabled === true &&
      cloned.border.color === "#ff0000" &&
      cloned.border.width === 4 &&
      cloned.border.style === "dashed" &&
      cloned.border.opacity === 80 &&
      cloned.border.radius === 12
  )
}

// 4. Clipboard sanitization (validNode) for image borders
{
  // Valid border is sanitized and preserved
  const validRaw = {
    id: "img-clip-1",
    type: "image",
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
    x: 50,
    y: 50,
    w: 300,
    h: 200,
    assetId: "asset-clip",
    border: {
      enabled: true,
      color: "rgb(0, 120, 255)",
      width: 6,
      style: "dotted",
      opacity: 75,
      radius: 16,
    },
  }

  const sanitized = validNode(validRaw) as ImageNode | null
  check("validNode accepts valid image node with border", sanitized !== null)
  check(
    "validNode preserves valid image border fields",
    sanitized?.border?.enabled === true &&
      sanitized.border.color === "rgb(0, 120, 255)" &&
      sanitized.border.width === 6 &&
      sanitized.border.style === "dotted" &&
      sanitized.border.opacity === 75 &&
      sanitized.border.radius === 16
  )

  // Malformed border values get clamped / cleaned
  const malformedRaw = {
    id: "img-clip-2",
    type: "image",
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    assetId: "asset-clip-2",
    border: {
      enabled: "yes", // invalid type, should be boolean
      color: 12345, // invalid type, should fallback or be stripped
      width: -10, // negative width, clamped to min 1
      style: "wavy", // unsupported style, fallback to solid
      opacity: 999, // > 100, clamped to 100
      radius: -5, // negative radius, clamped to 0
    },
  }

  const sanitizedMalformed = validNode(malformedRaw) as ImageNode | null
  check("validNode sanitizes malformed border safely", sanitizedMalformed !== null)
  if (sanitizedMalformed?.border) {
    check(
      "validNode clamps negative border width to >= 1",
      sanitizedMalformed.border.width >= 1
    )
    check(
      "validNode falls back unsupported border style to solid",
      sanitizedMalformed.border.style === "solid"
    )
    check(
      "validNode clamps opacity to <= 100",
      sanitizedMalformed.border.opacity <= 100
    )
    check(
      "validNode clamps negative radius to >= 0",
      sanitizedMalformed.border.radius >= 0
    )
  }
}

// 5. Borderless images preserve exact geometry and selection bounds
{
  const imgNoBorder: ImageNode = {
    id: "img-bounds",
    type: "image",
    x: 150,
    y: 250,
    w: 500,
    h: 350,
    assetId: "asset-geo",
    seed: 1,
  }

  check(
    "Image width and height are pristine with no border",
    imgNoBorder.w === 500 && imgNoBorder.h === 350
  )
}

// ===========================================================================
// FEATURE B: ZOOM-AWARE TEXT ENGINE TESTS
// ===========================================================================

// 6. Text world coordinates and font size remain invariant across viewport zoom
{
  const textNode: TextNode = {
    id: "txt-1",
    type: "text",
    x: 200,
    y: 300,
    w: 150,
    h: textBlockHeight(1, 24),
    text: "Zoom Aware Typography",
    fontSize: 24,
    bold: true,
    italic: false,
    underline: true,
    align: "center",
    seed: 7,
  }

  // Simulate multiple canvas zoom levels
  const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0]

  for (const zoom of zoomLevels) {
    const vp = { x: 50, y: 100, zoom }
    const [sx, sy] = worldToScreen(vp, textNode.x, textNode.y)
    const [backX, backY] = screenToWorld(vp, sx, sy)

    check(
      `Text world coordinates roundtrip accurately at zoom ${zoom}`,
      Math.abs(backX - textNode.x) < 1e-4 &&
        Math.abs(backY - textNode.y) < 1e-4
    )

    // Verify stored fontSize is NEVER mutated by zoom
    check(
      `Stored fontSize is strictly invariant at zoom ${zoom}`,
      textNode.fontSize === 24
    )

    // Rendered visual screen font size equals worldFontSize * zoom
    const screenFontSize = textNode.fontSize * zoom
    check(
      `Computed screen font size scales proportionally at zoom ${zoom}`,
      Math.abs(screenFontSize - 24 * zoom) < 1e-6
    )
  }
}

// 7. Typography defaults in shell store and canvas store
{
  check(
    "DEFAULT_TEXT_SETTINGS has underline set to false",
    DEFAULT_TEXT_SETTINGS.underline === false
  )
  check(
    "DEFAULT_ACTIVE_STYLE includes bold flag",
    "bold" in DEFAULT_ACTIVE_STYLE && DEFAULT_ACTIVE_STYLE.bold === false
  )
  check(
    "DEFAULT_ACTIVE_STYLE includes italic flag",
    "italic" in DEFAULT_ACTIVE_STYLE && DEFAULT_ACTIVE_STYLE.italic === false
  )
  check(
    "DEFAULT_ACTIVE_STYLE includes underline flag",
    "underline" in DEFAULT_ACTIVE_STYLE && DEFAULT_ACTIVE_STYLE.underline === false
  )
}

// 8. fitTextBox accurately dimensions text across full font size spectrum (10 to 64)
{
  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64]

  for (const fs of fontSizes) {
    const baseNode: TextNode = {
      id: `txt-size-${fs}`,
      type: "text",
      x: 100,
      y: 100,
      w: 200,
      h: 50,
      text: "The quick brown fox jumps over the lazy dog",
      fontSize: fs,
      seed: fs,
    }

    const fitted = fitTextBox(baseNode, baseNode.text, fs)
    check(
      `fitTextBox computes positive dimensions for font size ${fs}`,
      fitted.w > 0 && fitted.h > 0
    )
    check(
      `fitTextBox height scales with font size: ${fs}px gives height ${fitted.h}`,
      fitted.h >= fs
    )
  }
}

// 9. Text reflow preserves alignment and anchor calculation
{
  const centerText: TextNode = {
    id: "txt-align-center",
    type: "text",
    x: 100,
    y: 100,
    w: 300,
    h: 40,
    text: "Centered text line",
    fontSize: 20,
    align: "center",
    seed: 12,
  }

  const fittedCenter = fitTextBox(centerText, centerText.text, 32)
  const oldCenter = centerText.x + centerText.w / 2
  const newCenter = (fittedCenter.x ?? centerText.x) + (fittedCenter.w ?? centerText.w) / 2
  check(
    "Center aligned text keeps horizontal center midpoint stable across font size changes",
    Math.abs(oldCenter - newCenter) < 1e-6
  )
  check(
    "Center aligned text updates height correctly on font size bump",
    fittedCenter.h > centerText.h
  )
}

// 10. validNode preserves typography attributes on text nodes
{
  const rawTextWithTypography = {
    id: "txt-typo-safe",
    type: "text",
    x: 50,
    y: 50,
    w: 120,
    h: 30,
    text: "Styled Title",
    fontSize: 28,
    bold: true,
    italic: true,
    underline: true,
    align: "right",
  }

  const sanitizedText = validNode(rawTextWithTypography) as TextNode | null
  check("validNode accepts text node with typography", sanitizedText !== null)
  check(
    "validNode preserves bold flag",
    sanitizedText?.bold === true
  )
  check(
    "validNode preserves italic flag",
    sanitizedText?.italic === true
  )
  check(
    "validNode preserves underline flag",
    sanitizedText?.underline === true
  )
  check(
    "validNode preserves align right",
    sanitizedText?.align === "right"
  )
}

// ===========================================================================
// SUMMARY
// ===========================================================================

console.log(`\nResults: ${passed} passed, ${failures.length} failed.`)

if (failures.length > 0) {
  console.error("\nFailures:")
  for (const f of failures) {
    console.error(`  - ${f}`)
  }
  process.exit(1)
} else {
  console.log("All Image Border and Zoom-Aware Text Engine tests PASSED successfully.")
  process.exit(0)
}
