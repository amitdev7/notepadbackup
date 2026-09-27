// ---------------------------------------------------------------------------
// Zenith AI — Security Audit, SSRF Protection & Secret Sanitizer
// ---------------------------------------------------------------------------

// Forbidden SSRF IP ranges and hostnames
const DISALLOWED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // AWS/GCP instance metadata service
  "metadata.google.internal",
  "instance-data",
]

/**
 * Validates a custom endpoint URL to protect against SSRF and private network scanning.
 */
export function validateCustomEndpoint(urlString: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(urlString)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Only http: and https: protocols are permitted." }
    }

    const hostname = parsed.hostname.toLowerCase()

    // Check banned hostnames
    if (DISALLOWED_HOSTNAMES.includes(hostname)) {
      return { valid: false, error: "Access to loopback or internal metadata services is prohibited." }
    }

    // Check private RFC1918 IPv4 ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10)
      const octet2 = parseInt(ipv4Match[2], 10)

      if (octet1 === 10) {
        return { valid: false, error: "Access to private 10.0.0.0/8 network is prohibited." }
      }
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        return { valid: false, error: "Access to private 172.16.0.0/12 network is prohibited." }
      }
      if (octet1 === 192 && octet2 === 168) {
        return { valid: false, error: "Access to private 192.168.0.0/16 network is prohibited." }
      }
      if (octet1 === 169 && octet2 === 254) {
        return { valid: false, error: "Access to link-local 169.254.0.0/16 network is prohibited." }
      }
      if (octet1 === 127) {
        return { valid: false, error: "Access to 127.0.0.0/8 loopback is prohibited." }
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: "Malformed or invalid URL." }
  }
}

/**
 * Scrubs any potential sensitive tokens (API keys, auth headers, passwords) from text before sending to user or storing.
 */
export function sanitizeOutput(text: string): string {
  if (!text) return ""

  let clean = text
  // OpenAI / generic sk- keys
  clean = clean.replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
  // Anthropic sk-ant- keys
  clean = clean.replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
  // Google AIza keys
  clean = clean.replace(/AIza[a-zA-Z0-9_-]{35}/g, "[REDACTED_API_KEY]")
  // Bearer tokens
  clean = clean.replace(/Bearer\s+[a-zA-Z0-9_.-]{25,}/gi, "Bearer [REDACTED_TOKEN]")
  // Zenithsui edit tokens
  clean = clean.replace(/[0-9a-f]{64}/g, () => {
    // Only redact 64-char hex strings that look like tokens
    return "[REDACTED_TOKEN]"
  })

  return clean
}

/**
 * Masks an API key for safe UI display (e.g. `sk-...abcd`).
 */
export function maskApiKey(key: string): string {
  if (!key) return ""
  if (key.length <= 8) return "••••••••"
  const prefix = key.slice(0, 3)
  const suffix = key.slice(-4)
  return `${prefix}...${suffix}`
}
