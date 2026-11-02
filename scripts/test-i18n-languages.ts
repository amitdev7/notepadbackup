// ---------------------------------------------------------------------------
// Zenithsui i18n & Multi-Language Support Unit Tests
// Tests Hindi (hi), Hinglish, and other language dictionaries & fallback logic
// ---------------------------------------------------------------------------

import assert from "node:assert/strict"
import { SUPPORTED_LANGUAGES, TRANSLATIONS, t, type SupportedLanguage } from "../lib/i18n/index.ts"
import { useShellStore, DEFAULT_PREFERENCES } from "../lib/shell-store.ts"

console.log("=== Starting Zenithsui i18n & Language Engine Verification ===")

// 1. Language registry & metadata
console.log("\n1. Supported Languages Metadata:")
const langIds = SUPPORTED_LANGUAGES.map((l) => l.id)
assert(langIds.includes("en-US"), "Must support en-US")
assert(langIds.includes("en-GB"), "Must support en-GB")
assert(langIds.includes("hi"), "Must support native Hindi (hi)")
assert(langIds.includes("hinglish"), "Must support Hinglish")
assert(langIds.includes("es"), "Must support Spanish (es)")
assert(langIds.includes("de"), "Must support German (de)")
assert(langIds.includes("fr"), "Must support French (fr)")
console.log("  ✓ Supported languages list correctly includes Hindi and Hinglish")

const hindiMeta = SUPPORTED_LANGUAGES.find((l) => l.id === "hi")
assert.equal(hindiMeta?.nativeName, "हिन्दी (Hindi)")
assert(hindiMeta?.region?.includes("भारत"), "Hindi metadata includes Bharat/India region")

const hinglishMeta = SUPPORTED_LANGUAGES.find((l) => l.id === "hinglish")
assert.equal(hinglishMeta?.nativeName, "Hinglish (Hindi + English)")
console.log("  ✓ Native labels and regions correctly defined for Hindi & Hinglish")

// 2. Hindi Translation Integrity
console.log("\n2. Native Hindi (hi) Dictionaries:")
assert.equal(t("tool_select", "hi"), "चुनें (Select)")
assert.equal(t("tool_draw", "hi"), "चित्र बनाएं (Draw)")
assert.equal(t("tool_eraser", "hi"), "मिटाएं (Eraser)")
assert.equal(t("status_saved", "hi"), "सहेजा गया")
assert.equal(t("files", "hi"), "फ़ाइलें")
assert.equal(t("new_canvas", "hi"), "नया कैनवास")
assert.equal(t("pure_canvas_badge", "hi"), "प्योर कैनवास")
assert.equal(t("exit_pure_canvas", "hi"), "प्योर कैनवास मोड से बाहर निकलें")

// Interpolation test
const hiNotice = t("notice_zen_mode_on", "hi", { key: "Ctrl+\\" })
assert(hiNotice.includes("Ctrl+\\"), "Should interpolate {key} parameter")
assert(hiNotice.includes("वापस लाने के लिए"), "Should have proper Hindi phrasing")
console.log("  ✓ Hindi translations return proper Devanagari text with interpolation")

// 3. Hinglish Translation Integrity
console.log("\n3. Hinglish Dictionaries:")
assert.equal(t("tool_select", "hinglish"), "Select Karein (V)")
assert.equal(t("tool_draw", "hinglish"), "Draw Karein (P)")
assert.equal(t("tool_eraser", "hinglish"), "Mitao / Eraser (E)")
assert.equal(t("status_saved", "hinglish"), "save ho gaya")
assert.equal(t("files", "hinglish"), "Files")
assert.equal(t("new_canvas", "hinglish"), "Naya Canvas")
assert.equal(t("pure_canvas_badge", "hinglish"), "Pure Canvas")
assert.equal(t("exit_pure_canvas", "hinglish"), "Pure Canvas Mode Band Karein")

const hinglishNotice = t("notice_zen_mode_on", "hinglish", { key: "Alt+M" })
assert(hinglishNotice.includes("Alt+M"), "Should interpolate {key} parameter in Hinglish")
assert(hinglishNotice.includes("wapas laane ke liye"), "Should contain natural conversational Hinglish")
console.log("  ✓ Hinglish translations return conversational romanized Hindi+English text")

// 4. Fallback Mechanism
console.log("\n4. Translation Fallback Mechanism:")
// If a non-existent language is provided, fallback to en-US
// @ts-expect-error Testing fallback
const fallbackVal = t("tool_select", "unknown_lang" as SupportedLanguage)
assert.equal(fallbackVal, "Select", "Should fallback to en-US when language not recognized")

// Non-existent key should return key itself
// @ts-expect-error Testing non-existent key
const missingKeyVal = t("completely_missing_key_xyz", "hi")
assert.equal(missingKeyVal, "completely_missing_key_xyz", "Should fallback to raw key if not found in any dictionary")
console.log("  ✓ Fallback logic gracefully handles unsupported locales and missing keys")

// 5. Shell Store Language Preference Integration
console.log("\n5. Shell Store Language Preference:")
assert(DEFAULT_PREFERENCES.language === "en-US", "Default language should be en-US")

useShellStore.getState().updatePreferences({ language: "hi" })
assert.equal(useShellStore.getState().preferences.language, "hi", "Should update language to Hindi")

useShellStore.getState().updatePreferences({ language: "hinglish" })
assert.equal(useShellStore.getState().preferences.language, "hinglish", "Should update language to Hinglish")

// Reset to default
useShellStore.getState().updatePreferences({ language: "en-US" })
assert.equal(useShellStore.getState().preferences.language, "en-US", "Should reset cleanly")
console.log("  ✓ Shell store state updates and holds language preferences")

console.log("\n=======================================================")
console.log("All i18n & Language Engine tests PASSED successfully! 🌐")
console.log("=======================================================")
