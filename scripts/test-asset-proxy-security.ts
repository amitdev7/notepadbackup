import assert from "node:assert"

// Comprehensive host validation logic
export function isDisallowedHost(hostname: string): boolean {
  let lower = hostname.toLowerCase().trim()

  // Strip enclosing brackets for IPv6
  if (lower.startsWith("[") && lower.endsWith("]")) {
    lower = lower.slice(1, -1)
  }

  // Common metadata and loopback names
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower === "::" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "metadata.google.internal" ||
    lower === "instance-data"
  ) {
    return true
  }

  // IPv6 link-local and private ULA (fe80::/10, fc00::/7) and IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.replace("::ffff:", "")
    return isDisallowedHost(v4)
  }

  // Check numeric IP representation (single integer, hex, or octal)
  // Single 32-bit int (e.g. 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(lower)) {
    const num = parseInt(lower, 10)
    if (num >= 0 && num <= 4294967295) {
      const o1 = (num >>> 24) & 255
      const o2 = (num >>> 16) & 255
      return isPrivateOrLoopback(o1, o2)
    }
  }

  // Hex format (e.g. 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(lower)) {
    const num = parseInt(lower, 16)
    if (num >= 0 && num <= 4294967295) {
      const o1 = (num >>> 24) & 255
      const o2 = (num >>> 16) & 255
      return isPrivateOrLoopback(o1, o2)
    }
  }

  // Dotted decimal / octal representation (e.g. 127.0.0.1 or 0177.0.0.1)
  const parts = lower.split(".")
  if (parts.length === 4) {
    const octets = parts.map((p) => {
      if (p.startsWith("0x") || p.startsWith("0X")) return parseInt(p, 16)
      if (p.startsWith("0") && p.length > 1) return parseInt(p, 8)
      return parseInt(p, 10)
    })
    if (octets.every((o) => !isNaN(o) && o >= 0 && o <= 255)) {
      return isPrivateOrLoopback(octets[0], octets[1])
    }
  }

  return false
}

function isPrivateOrLoopback(octet1: number, octet2: number): boolean {
  if (octet1 === 127) return true // Loopback
  if (octet1 === 0) return true   // Current network
  if (octet1 === 10) return true  // 10.0.0.0/8
  if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true // 172.16.0.0/12
  if (octet1 === 192 && octet2 === 168) return true // 192.168.0.0/16
  if (octet1 === 169 && octet2 === 254) return true // 169.254.0.0/16 (Link-local / cloud metadata)
  return false
}

console.log("=== Testing Asset Proxy SSRF Protections ===")

// Standard Disallowed
assert.strictEqual(isDisallowedHost("localhost"), true)
assert.strictEqual(isDisallowedHost("127.0.0.1"), true)
assert.strictEqual(isDisallowedHost("10.1.2.3"), true)
assert.strictEqual(isDisallowedHost("192.168.1.1"), true)
assert.strictEqual(isDisallowedHost("172.16.5.4"), true)
assert.strictEqual(isDisallowedHost("169.254.169.254"), true)

// Advanced Evasions: Octal, Hex, Integer, IPv6
assert.strictEqual(isDisallowedHost("0177.0.0.1"), true, "Octal loopback must be blocked")
assert.strictEqual(isDisallowedHost("0x7f000001"), true, "Hex loopback must be blocked")
assert.strictEqual(isDisallowedHost("2130706433"), true, "Integer loopback must be blocked")
assert.strictEqual(isDisallowedHost("::1"), true, "IPv6 loopback must be blocked")
assert.strictEqual(isDisallowedHost("[::1]"), true, "Bracketed IPv6 loopback must be blocked")
assert.strictEqual(isDisallowedHost("::ffff:127.0.0.1"), true, "IPv4-mapped IPv6 loopback must be blocked")
assert.strictEqual(isDisallowedHost("metadata.google.internal"), true, "GCP metadata must be blocked")

// Allowed public hosts
assert.strictEqual(isDisallowedHost("images.unsplash.com"), false)
assert.strictEqual(isDisallowedHost("raw.githubusercontent.com"), false)
assert.strictEqual(isDisallowedHost("8.8.8.8"), false)

console.log("✓ All 16 SSRF vector checks passed successfully!")
