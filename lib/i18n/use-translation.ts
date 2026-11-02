"use client"

// ---------------------------------------------------------------------------
// Zenithsui useTranslation Hook
// Reactive consumer for interface translations driven by shell preferences.
// ---------------------------------------------------------------------------

import { useShellStore } from "@/lib/shell-store"
import { t, type TranslationKey, type SupportedLanguage, SUPPORTED_LANGUAGES } from "./index"

export function useTranslation() {
  const language = useShellStore((s) => s.preferences.language || "en-US")
  const updatePreferences = useShellStore((s) => s.updatePreferences)

  const translate = (key: TranslationKey, params?: Record<string, string>) => {
    return t(key, language, params)
  }

  const setLanguage = (lang: SupportedLanguage) => {
    updatePreferences({ language: lang })
  }

  return {
    language,
    setLanguage,
    t: translate,
    languages: SUPPORTED_LANGUAGES,
  }
}

export { t, type TranslationKey, type SupportedLanguage, SUPPORTED_LANGUAGES }
