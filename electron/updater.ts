// ---------------------------------------------------------------------------
// Zenithsui Desktop Automatic Update System
//
// Powered by electron-updater with GitHub Releases:
// - Automatic background checking (configurable, default: ON)
// - Automatic background downloading (configurable, default: ON)
// - Automatic next-launch installation (configurable, default: ON)
// - Non-intrusive: Never closes or interrupts an active canvas session
// - Dedicated manual "Install and Restart" action
// - Separate safe update handling for Portable edition
// - Persistent settings in userData
// ---------------------------------------------------------------------------

import { app, BrowserWindow, shell } from "electron"
import { createRequire } from "node:module"
import type { AppUpdater } from "electron-updater"

const require = createRequire(import.meta.url)
const electronUpdater = require("electron-updater")
const autoUpdater: AppUpdater = electronUpdater.autoUpdater || electronUpdater.default?.autoUpdater
import fs from "node:fs"
import path from "node:path"
import https from "node:https"
import {
  type DesktopUpdatePreferences,
  type DesktopUpdateStatus,
  DEFAULT_DESKTOP_UPDATE_PREFERENCES,
} from "./types.js"

const PREFS_FILENAME = "zenithsui-update-preferences.json"
const PENDING_UPDATE_FILENAME = "pending-update.json"

export class DesktopUpdaterService {
  private prefs: DesktopUpdatePreferences
  private status: DesktopUpdateStatus
  private mainWindow: BrowserWindow | null = null
  private isPortable: boolean
  private updateDownloadedInfo: any = null

  constructor() {
    this.isPortable = Boolean(
      process.env.PORTABLE_EXECUTABLE_DIR ||
      process.env.PORTABLE_EXECUTABLE_FILE ||
      process.env.ZENITHSUI_PORTABLE
    )

    this.prefs = this.loadPreferences()
    this.status = {
      state: "idle",
      currentVersion: app.getVersion(),
      isPortable: this.isPortable,
    }

    this.configureAutoUpdater()
  }

  public setWindow(win: BrowserWindow) {
    this.mainWindow = win
    this.broadcastStatus()
  }

  /**
   * Check for any pending update on startup before opening main workspace.
   * If autoInstallUpdates is enabled and a verified update was downloaded,
   * it executes the installation immediately.
   */
  public handleStartupPendingUpdate(): boolean {
    if (this.isPortable || !app.isPackaged) return false

    const pendingPath = path.join(app.getPath("userData"), PENDING_UPDATE_FILENAME)
    if (!fs.existsSync(pendingPath)) return false

    try {
      const data = JSON.parse(fs.readFileSync(pendingPath, "utf-8"))
      if (this.prefs.autoInstallUpdates && data && data.readyToInstall) {
        console.log("[Zenithsui-Updater] Applying pending update on next launch:", data.version)
        // Remove marker before triggering install to prevent infinite loops if install fails
        fs.unlinkSync(pendingPath)
        autoUpdater.quitAndInstall(true, true)
        return true
      }
    } catch (err) {
      console.warn("[Zenithsui-Updater] Error inspecting pending update:", err)
      try {
        fs.unlinkSync(pendingPath)
      } catch {}
    }

    return false
  }

  /** Configure electron-updater options and event listeners */
  private configureAutoUpdater() {
    if (this.isPortable) return

    autoUpdater.autoDownload = false // We manage download based on autoDownloadUpdates preference
    autoUpdater.autoInstallOnAppQuit = false // CRITICAL: Never abruptly close or install on arbitrary quit
    autoUpdater.allowPrerelease = this.prefs.channel === "beta"

    // Configure logger
    autoUpdater.logger = {
      info: (msg) => console.log("[Zenithsui-Updater INFO]", msg),
      warn: (msg) => console.warn("[Zenithsui-Updater WARN]", msg),
      error: (msg) => console.error("[Zenithsui-Updater ERROR]", msg),
      debug: (msg) => console.log("[Zenithsui-Updater DEBUG]", msg),
    }

    autoUpdater.on("checking-for-update", () => {
      this.updateStatus({ state: "checking", lastChecked: Date.now(), error: undefined })
    })

    autoUpdater.on("update-available", (info) => {
      console.log("[Zenithsui-Updater] Update available:", info.version)
      this.updateStatus({
        state: "available",
        availableVersion: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : undefined,
      })

      // If automatic download is enabled, start download immediately in background
      if (this.prefs.autoDownloadUpdates) {
        this.downloadUpdate()
      }
    })

    autoUpdater.on("update-not-available", () => {
      this.updateStatus({ state: "not-available", lastChecked: Date.now() })
    })

    autoUpdater.on("download-progress", (progressObj) => {
      this.updateStatus({
        state: "downloading",
        downloadProgress: {
          percent: Math.round(progressObj.percent),
          bytesPerSecond: progressObj.bytesPerSecond,
          transferred: progressObj.transferred,
          total: progressObj.total,
        },
      })
    })

    autoUpdater.on("update-downloaded", (info) => {
      console.log("[Zenithsui-Updater] Update downloaded successfully:", info.version)
      this.updateDownloadedInfo = info

      if (this.prefs.autoInstallUpdates) {
        // Mark update as ready to apply on next launch
        this.savePendingUpdateMarker(info.version)
        this.updateStatus({
          state: "ready-on-next-launch",
          availableVersion: info.version,
          autoInstallPending: true,
        })
      } else {
        // Automatic installation disabled by user -> manual install pending
        this.clearPendingUpdateMarker()
        this.updateStatus({
          state: "manual-install-pending",
          availableVersion: info.version,
          autoInstallPending: false,
        })
      }
    })

    autoUpdater.on("error", (err) => {
      console.error("[Zenithsui-Updater] Error:", err)
      this.updateStatus({
        state: "error",
        error: err.message || "Failed to check or download updates",
        lastChecked: Date.now(),
      })
    })
  }

  public getPreferences(): DesktopUpdatePreferences {
    return { ...this.prefs }
  }

  public setPreferences(newPrefs: Partial<DesktopUpdatePreferences>) {
    this.prefs = { ...this.prefs, ...newPrefs }
    this.savePreferences()

    autoUpdater.allowPrerelease = this.prefs.channel === "beta"

    // If autoInstallUpdates was toggled after an update was already downloaded
    if (this.updateDownloadedInfo) {
      if (this.prefs.autoInstallUpdates) {
        this.savePendingUpdateMarker(this.updateDownloadedInfo.version)
        this.updateStatus({
          state: "ready-on-next-launch",
          autoInstallPending: true,
        })
      } else {
        this.clearPendingUpdateMarker()
        this.updateStatus({
          state: "manual-install-pending",
          autoInstallPending: false,
        })
      }
    }
  }

  public getStatus(): DesktopUpdateStatus {
    return { ...this.status }
  }

  /** Trigger an update check (either automatic on startup or manual from UI) */
  public async checkForUpdates(): Promise<void> {
    if (this.isPortable) {
      return this.checkPortableUpdates()
    }

    if (!app.isPackaged) {
      console.log("[Zenithsui-Updater] Development environment — simulating check for updates.")
      this.updateStatus({ state: "checking", lastChecked: Date.now() })
      setTimeout(() => {
        this.updateStatus({ state: "not-available", lastChecked: Date.now() })
      }, 1000)
      return
    }

    try {
      this.updateStatus({ state: "checking", lastChecked: Date.now(), error: undefined })
      await autoUpdater.checkForUpdates()
    } catch (err: any) {
      this.updateStatus({
        state: "error",
        error: err?.message || "Failed to connect to update server",
        lastChecked: Date.now(),
      })
    }
  }

  /** Trigger downloading an available update */
  public async downloadUpdate(): Promise<void> {
    if (this.isPortable) {
      if (this.status.portableDownloadUrl) {
        shell.openExternal(this.status.portableDownloadUrl)
      }
      return
    }

    try {
      this.updateStatus({ state: "downloading" })
      await autoUpdater.downloadUpdate()
    } catch (err: any) {
      this.updateStatus({
        state: "error",
        error: err?.message || "Download failed",
      })
    }
  }

  /**
   * Explicit user-triggered Install and Restart action.
   * Flushes canvas data gracefully before restarting.
   */
  public async installAndRestart(): Promise<void> {
    if (this.isPortable) {
      console.warn("[Zenithsui-Updater] Portable edition cannot use NSIS installer to restart.")
      return
    }

    console.log("[Zenithsui-Updater] User requested immediate Install and Restart.")
    
    // Request renderer to flush pending canvas saves
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000)
          this.mainWindow!.webContents.send("desktop:prepare-to-close")
          // In case renderer doesn't reply within 2s, proceed safely
        })
      } catch {}
    }

    // Call quitAndInstall immediately
    autoUpdater.quitAndInstall(false, true)
  }

  /** Portable edition update checking via GitHub Releases API */
  private async checkPortableUpdates(): Promise<void> {
    this.updateStatus({ state: "checking", lastChecked: Date.now(), error: undefined })

    const options = {
      hostname: "api.github.com",
      path: "/repos/amitdev7/notepadbackup/releases/latest",
      headers: { "User-Agent": "Zenithsui-Desktop-Portable" },
    }

    https.get(options, (res) => {
      let data = ""
      res.on("data", (chunk) => { data += chunk })
      res.on("end", () => {
        try {
          if (res.statusCode === 200) {
            const release = JSON.parse(data)
            const latestTag = (release.tag_name || "").replace(/^v/, "")
            const current = app.getVersion()

            if (latestTag && latestTag !== current) {
              const portableAsset = (release.assets || []).find((a: any) =>
                a.name && (a.name.toLowerCase().includes("portable") || a.name.endsWith(".exe"))
              )
              const downloadUrl = portableAsset?.browser_download_url || release.html_url

              this.updateStatus({
                state: "available",
                availableVersion: latestTag,
                releaseDate: release.published_at,
                releaseNotes: release.body,
                portableDownloadUrl: downloadUrl,
                isPortable: true,
              })
              return
            }
          }
          this.updateStatus({ state: "not-available", lastChecked: Date.now() })
        } catch (err: any) {
          this.updateStatus({ state: "error", error: err?.message || "Failed to parse release info" })
        }
      })
    }).on("error", (err) => {
      this.updateStatus({ state: "error", error: err.message || "Failed to reach GitHub Releases" })
    })
  }

  private updateStatus(patch: Partial<DesktopUpdateStatus>) {
    this.status = { ...this.status, ...patch }
    this.broadcastStatus()
  }

  private broadcastStatus() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("desktop:update-status-changed", this.status)
    }
  }

  private savePendingUpdateMarker(version: string) {
    try {
      const p = path.join(app.getPath("userData"), PENDING_UPDATE_FILENAME)
      fs.writeFileSync(p, JSON.stringify({ version, readyToInstall: true, savedAt: Date.now() }))
    } catch (e) {
      console.warn("[Zenithsui-Updater] Failed to write pending update marker:", e)
    }
  }

  private clearPendingUpdateMarker() {
    try {
      const p = path.join(app.getPath("userData"), PENDING_UPDATE_FILENAME)
      if (fs.existsSync(p)) fs.unlinkSync(p)
    } catch {}
  }

  private loadPreferences(): DesktopUpdatePreferences {
    try {
      const p = path.join(app.getPath("userData"), PREFS_FILENAME)
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8")
        return { ...DEFAULT_DESKTOP_UPDATE_PREFERENCES, ...JSON.parse(raw) }
      }
    } catch {}
    return { ...DEFAULT_DESKTOP_UPDATE_PREFERENCES }
  }

  private savePreferences() {
    try {
      const p = path.join(app.getPath("userData"), PREFS_FILENAME)
      fs.writeFileSync(p, JSON.stringify(this.prefs, null, 2))
    } catch (e) {
      console.warn("[Zenithsui-Updater] Failed to save preferences:", e)
    }
  }
}
