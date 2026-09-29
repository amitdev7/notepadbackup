// ---------------------------------------------------------------------------
// Zenithsui Invitation Utilities
//
// Client-safe email parsing and validation for direct document sharing.
// ---------------------------------------------------------------------------

/**
 * Parses and normalizes multi-email string inputs (separators: comma, semicolon, space, newline).
 */
export function parseEmailList(raw: string): string[] {
  if (!raw || typeof raw !== "string") return []

  const parts = raw.split(/[\s,;]+/)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
  const valid = new Set<string>()

  for (const part of parts) {
    const trimmed = part.trim().toLowerCase()
    if (trimmed && !trimmed.includes("..") && !trimmed.includes("@.") && emailRegex.test(trimmed)) {
      valid.add(trimmed)
    }
  }

  return Array.from(valid)
}

