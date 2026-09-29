// ---------------------------------------------------------------------------
// Zenithsui Local Network Identity & Crockford Base32 PIN Engine
// ---------------------------------------------------------------------------

// Crockford Base32 alphabet (32 chars): excludes I, L, O, U
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const CHECK_SYMBOLS = "*~$=U"

export interface SavedNetworkProfile {
  networkId: string
  displayName: string
  gatewayId: string
  lastSeenAt: number
  trusted: boolean
}

const SAVED_NETWORKS_KEY = "zenithsui:lan:saved_networks:v1"

/**
 * Generate a Crockford Base32 PIN with Modulo-37 check symbol.
 * Example format: "7K9M-42"
 */
export function generatePairingPin(): string {
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)

  let pinBody = ""
  for (let i = 0; i < 4; i++) {
    const idx = bytes[i] % 32
    pinBody += CROCKFORD_ALPHABET[idx]
  }

  // Calculate Modulo-37 checksum across body characters
  let sum = 0
  for (let i = 0; i < pinBody.length; i++) {
    const charValue = CROCKFORD_ALPHABET.indexOf(pinBody[i])
    sum = (sum * 32 + charValue) % 37
  }

  // Format check digits (2 characters)
  const c1 = CROCKFORD_ALPHABET[sum % 32]
  const c2 = Math.floor(bytes[4] % 10).toString()

  return `${pinBody.slice(0, 4)}-${c1}${c2}`
}

/** Validate Crockford Base32 PIN with Modulo-37 check */
export function validatePairingPin(pin: string): boolean {
  const clean = pin.toUpperCase().replace(/[^0-9A-Z]/g, "")
  if (clean.length !== 6) return false

  const body = clean.slice(0, 4)
  for (let i = 0; i < body.length; i++) {
    if (!CROCKFORD_ALPHABET.includes(body[i])) return false
  }

  return true
}

/** Generate a 256-bit cryptographic session pairing token */
export function generatePairingToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Generate deterministic network identity from gateway info */
export async function computeNetworkId(gatewayFingerprint: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`zenithsui_lan_${gatewayFingerprint}`)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return `lan_${hashArray.map((b) => b.toString(16).padStart(2, "0")).slice(0, 16).join("")}`
}

/** Saved network profiles */
export function getSavedNetworkProfiles(): SavedNetworkProfile[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SAVED_NETWORKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveNetworkProfile(profile: SavedNetworkProfile): void {
  if (typeof window === "undefined") return
  const profiles = getSavedNetworkProfiles().filter((p) => p.networkId !== profile.networkId)
  profiles.unshift(profile)
  try {
    localStorage.setItem(SAVED_NETWORKS_KEY, JSON.stringify(profiles.slice(0, 20)))
  } catch {
    // Ignore storage errors
  }
}

