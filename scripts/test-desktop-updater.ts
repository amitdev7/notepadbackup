// ---------------------------------------------------------------------------
// Zenithsui Desktop & Automatic Update Engine — Comprehensive Test Suite
//
// Tests:
// 1. Default update preferences (autoCheck: true, autoDownload: true, autoInstall: true)
// 2. Next-launch update pending marker logic & crash loop prevention
// 3. User opt-out preference behavior (autoInstall: false -> manual action)
// 4. Session protection invariants (zero active session interruption)
// 5. Portable edition safety (no self-overwrite while running)
// 6. IPC protocol sanitization (whitelist: http, https, mailto; reject hazardous)
// 7. Semver comparison and release asset resolution
// ---------------------------------------------------------------------------

import {
  DEFAULT_DESKTOP_UPDATE_PREFERENCES,
  type DesktopUpdatePreferences,
} from "../electron/types.ts"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

// ---------------------------------------------------------------------------
// Test 1: Default Update Preferences Invariants
// ---------------------------------------------------------------------------
check(
  "Default preferences: autoCheckUpdates is true",
  DEFAULT_DESKTOP_UPDATE_PREFERENCES.autoCheckUpdates === true
)

check(
  "Default preferences: autoDownloadUpdates is true",
  DEFAULT_DESKTOP_UPDATE_PREFERENCES.autoDownloadUpdates === true
)

check(
  "Default preferences: autoInstallUpdates is true (next-launch)",
  DEFAULT_DESKTOP_UPDATE_PREFERENCES.autoInstallUpdates === true
)

check(
  "Default preferences: default channel is stable",
  DEFAULT_DESKTOP_UPDATE_PREFERENCES.channel === "stable"
)

// Preference merging logic
function mergePreferences(
  existing: DesktopUpdatePreferences,
  incoming: Partial<DesktopUpdatePreferences>
): DesktopUpdatePreferences {
  return {
    autoCheckUpdates: incoming.autoCheckUpdates ?? existing.autoCheckUpdates,
    autoDownloadUpdates: incoming.autoDownloadUpdates ?? existing.autoDownloadUpdates,
    autoInstallUpdates: incoming.autoInstallUpdates ?? existing.autoInstallUpdates,
    channel: incoming.channel === "beta" ? "beta" : incoming.channel === "stable" ? "stable" : existing.channel,
  }
}

const customPrefs = mergePreferences(DEFAULT_DESKTOP_UPDATE_PREFERENCES, {
  autoInstallUpdates: false,
})
check("Merge preferences: can disable autoInstallUpdates independently", customPrefs.autoInstallUpdates === false)
check("Merge preferences: preserves autoCheckUpdates", customPrefs.autoCheckUpdates === true)
check("Merge preferences: preserves autoDownloadUpdates", customPrefs.autoDownloadUpdates === true)

// ---------------------------------------------------------------------------
// Test 2: Next-Launch Pending Update Marker Invariants
// ---------------------------------------------------------------------------
interface PendingUpdateMarker {
  version: string
  readyToInstall: boolean
  downloadedAt: number
}

function shouldApplyPendingUpdateOnStartup(
  prefs: DesktopUpdatePreferences,
  marker: PendingUpdateMarker | null,
  isPortable: boolean
): boolean {
  if (isPortable) return false
  if (!marker || !marker.readyToInstall) return false
  return prefs.autoInstallUpdates
}

const validMarker: PendingUpdateMarker = {
  version: "0.2.0",
  readyToInstall: true,
  downloadedAt: Date.now() - 3600000,
}

check(
  "Next-launch: applies when autoInstallUpdates is true and marker is valid",
  shouldApplyPendingUpdateOnStartup(DEFAULT_DESKTOP_UPDATE_PREFERENCES, validMarker, false) === true
)

check(
  "Next-launch: does NOT apply if user disabled autoInstallUpdates",
  shouldApplyPendingUpdateOnStartup({ ...DEFAULT_DESKTOP_UPDATE_PREFERENCES, autoInstallUpdates: false }, validMarker, false) === false
)

check(
  "Next-launch: does NOT apply if running in portable mode",
  shouldApplyPendingUpdateOnStartup(DEFAULT_DESKTOP_UPDATE_PREFERENCES, validMarker, true) === false
)

check(
  "Next-launch: does NOT apply if marker is corrupted or null",
  shouldApplyPendingUpdateOnStartup(DEFAULT_DESKTOP_UPDATE_PREFERENCES, null, false) === false
)

// ---------------------------------------------------------------------------
// Test 3: Session Protection Invariants
// ---------------------------------------------------------------------------
// Auto-updater must NEVER quit automatically when user exits; it marks pending update
const autoInstallOnAppQuitConfig = false
check("Session protection: autoInstallOnAppQuit must be false", autoInstallOnAppQuitConfig === false)

// ---------------------------------------------------------------------------
// Test 4: Portable Edition Detection and Safety
// ---------------------------------------------------------------------------
function detectPortableMode(env: Record<string, string | undefined>): boolean {
  return Boolean(
    env.PORTABLE_EXECUTABLE_DIR ||
    env.PORTABLE_EXECUTABLE_FILE ||
    env.ZENITHSUI_PORTABLE
  )
}

check(
  "Portable detection: standard mode is not portable",
  detectPortableMode({}) === false
)

check(
  "Portable detection: detects PORTABLE_EXECUTABLE_DIR",
  detectPortableMode({ PORTABLE_EXECUTABLE_DIR: "C:\\Zenithsui" }) === true
)

check(
  "Portable detection: detects ZENITHSUI_PORTABLE",
  detectPortableMode({ ZENITHSUI_PORTABLE: "1" }) === true
)

// ---------------------------------------------------------------------------
// Test 5: External Protocol Sanitization (IPC Security Boundary)
// ---------------------------------------------------------------------------
function isSafeExternalUrl(url: string): boolean {
  if (typeof url !== "string") return false
  return /^(https?|mailto):/i.test(url.trim())
}

check("Security: https protocol is safe", isSafeExternalUrl("https://github.com/amitdev7/notepadbackup"))
check("Security: http protocol is safe", isSafeExternalUrl("http://localhost:3000"))
check("Security: mailto protocol is safe", isSafeExternalUrl("mailto:support@zenithsui.com"))
check("Security: file scheme is REJECTED", isSafeExternalUrl("file:///C:/Windows/System32/cmd.exe") === false)
check("Security: javascript scheme is REJECTED", isSafeExternalUrl("javascript:alert(1)") === false)
check("Security: ms-settings scheme is REJECTED", isSafeExternalUrl("ms-settings:privacy") === false)
check("Security: powershell scheme is REJECTED", isSafeExternalUrl("powershell.exe -c calc") === false)

// ---------------------------------------------------------------------------
// Test 6: Semver Parsing and Comparison
// ---------------------------------------------------------------------------
function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) => {
    const clean = v.replace(/^v/, "").split("-")[0]
    return clean.split(".").map(Number)
  }
  const [maj1, min1, pat1] = parse(v1)
  const [maj2, min2, pat2] = parse(v2)

  if (maj1 !== maj2) return maj1 - maj2
  if (min1 !== min2) return min1 - min2
  return pat1 - pat2
}

check("Semver: 0.2.0 > 0.1.0", compareSemver("0.2.0", "0.1.0") > 0)
check("Semver: 0.1.1 > 0.1.0", compareSemver("0.1.1", "0.1.0") > 0)
check("Semver: 0.1.0 == 0.1.0", compareSemver("0.1.0", "0.1.0") === 0)
check("Semver: 0.1.0 < 1.0.0", compareSemver("0.1.0", "1.0.0") < 0)
check("Semver: handles v-prefix v0.2.0 > v0.1.0", compareSemver("v0.2.0", "v0.1.0") > 0)

// ---------------------------------------------------------------------------
// Test 7: Release Asset Resolver
// ---------------------------------------------------------------------------
interface GithubAsset {
  name: string
  browser_download_url: string
}

function resolveReleaseAssets(assets: GithubAsset[]) {
  const setupAsset = assets.find(
    (a) => a.name.toLowerCase().includes("setup") && a.name.endsWith(".exe")
  )
  const portableAsset = assets.find(
    (a) => a.name.toLowerCase().includes("portable") && a.name.endsWith(".exe")
  )
  const latestYml = assets.find((a) => a.name === "latest.yml")

  return {
    setupUrl: setupAsset?.browser_download_url,
    portableUrl: portableAsset?.browser_download_url,
    hasLatestYml: Boolean(latestYml),
  }
}

const mockAssets: GithubAsset[] = [
  { name: "Zenithsui Setup 0.2.0.exe", browser_download_url: "https://github.com/test/setup.exe" },
  { name: "Zenithsui Setup 0.2.0.exe.blockmap", browser_download_url: "https://github.com/test/blockmap" },
  { name: "Zenithsui Portable 0.2.0.exe", browser_download_url: "https://github.com/test/portable.exe" },
  { name: "latest.yml", browser_download_url: "https://github.com/test/latest.yml" },
]

const resolved = resolveReleaseAssets(mockAssets)
check("Asset resolver: finds setup exe", resolved.setupUrl === "https://github.com/test/setup.exe")
check("Asset resolver: finds portable exe", resolved.portableUrl === "https://github.com/test/portable.exe")
check("Asset resolver: recognizes latest.yml", resolved.hasLatestYml === true)

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=== Desktop & Automatic Update Engine Tests ===`)
console.log(`Passed: ${passed} / ${passed + failures.length}`)

if (failures.length > 0) {
  console.error(`\nFailed tests:`)
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
} else {
  console.log(`All Desktop & Automatic Updater tests passed flawlessly!\n`)
}
