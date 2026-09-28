// ---------------------------------------------------------------------------
// Zenithsui — Core Account & User Authentication Types
// ---------------------------------------------------------------------------

// Curated napkin color accents for avatar badges
export const AVATAR_COLORS = [
  "#2563eb", // Blue
  "#16a34a", // Emerald
  "#d97706", // Amber
  "#dc2626", // Crimson
  "#9333ea", // Purple
  "#0d9488", // Teal
  "#e11d48", // Rose
  "#4f46e5", // Indigo
  "#059669", // Mint
  "#ea580c", // Orange
]

export interface UserRecord {
  id: string
  username: string // Case-preserved (e.g., "AlexChen")
  normalizedUsername: string // Lowercase for unique lookups (e.g., "alexchen")
  displayName: string
  avatarColor: string // Hex color from napkin palette
  passwordHash: string // PBKDF2 hash (100,000 rounds)
  passwordSalt: string // Cryptographic hex salt
  recoveryCodeHashes: string[] // SHA-256 hashed recovery codes
  recoveryCodesLeft: number
  createdAt: number
  updatedAt: number
  lastLoginAt: number
  role: "user" | "admin"
}

export interface ClientSafeUser {
  id: string
  username: string
  displayName: string
  avatarColor: string
  createdAt: number
  lastLoginAt: number
  recoveryCodesLeft: number
  role: "user" | "admin"
}

export interface UserSession {
  id: string
  userId: string
  token: string // Signed session token
  createdAt: number
  expiresAt: number
  userAgent?: string
  ip?: string
}

export interface AuthResponse {
  success: boolean
  user?: ClientSafeUser
  recoveryCodes?: string[] // Plaintext codes returned ONLY once on signup or regen
  error?: string
  locked?: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface SignupRequest {
  username: string
  password: string
  displayName?: string
}

export interface RecoverAccountRequest {
  username: string
  recoveryCode: string
  newPassword: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface UpdateProfileRequest {
  displayName?: string
  avatarColor?: string
}

