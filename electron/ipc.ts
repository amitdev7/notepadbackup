// ---------------------------------------------------------------------------
// Zenithsui Desktop — Secure Typed IPC Handlers
// ---------------------------------------------------------------------------

import { ipcMain, dialog, shell, BrowserWindow, app } from "electron"
import fs from "node:fs/promises"
import type { DesktopUpdaterService } from "./updater.js"
import type {
  DesktopUpdatePreferences,
  SaveFileDialogOptions,
  OpenFileDialogOptions,
} from "./types.js"

export function registerIpcHandlers(
  updaterService: DesktopUpdaterService,
  getWindow: () => BrowserWindow | null,
  onRendererReadyToClose: () => void
) {
  // Synchronous initial getters
  ipcMain.on("desktop:get-version-sync", (event) => {
    event.returnValue = app.getVersion()
  })

  ipcMain.on("desktop:get-is-portable-sync", (event) => {
    event.returnValue = Boolean(
      process.env.PORTABLE_EXECUTABLE_DIR ||
      process.env.PORTABLE_EXECUTABLE_FILE ||
      process.env.ZENITHSUI_PORTABLE
    )
  })

  // Update preferences
  ipcMain.handle("desktop:get-update-preferences", async (): Promise<DesktopUpdatePreferences> => {
    return updaterService.getPreferences()
  })

  ipcMain.handle(
    "desktop:set-update-preferences",
    async (_event, newPrefs: Partial<DesktopUpdatePreferences>): Promise<void> => {
      // Validate inputs
      const validated: Partial<DesktopUpdatePreferences> = {}
      if (typeof newPrefs?.autoCheckUpdates === "boolean") validated.autoCheckUpdates = newPrefs.autoCheckUpdates
      if (typeof newPrefs?.autoDownloadUpdates === "boolean") validated.autoDownloadUpdates = newPrefs.autoDownloadUpdates
      if (typeof newPrefs?.autoInstallUpdates === "boolean") validated.autoInstallUpdates = newPrefs.autoInstallUpdates
      if (newPrefs?.channel === "stable" || newPrefs?.channel === "beta") validated.channel = newPrefs.channel

      updaterService.setPreferences(validated)
    }
  )

  // Update actions
  ipcMain.handle("desktop:check-for-updates", async (): Promise<void> => {
    await updaterService.checkForUpdates()
  })

  ipcMain.handle("desktop:download-update", async (): Promise<void> => {
    await updaterService.downloadUpdate()
  })

  ipcMain.handle("desktop:install-and-restart", async (): Promise<void> => {
    await updaterService.installAndRestart()
  })

  // External Links
  ipcMain.handle("desktop:open-external", async (_event, url: string): Promise<void> => {
    if (typeof url === "string" && /^(https?|mailto):/i.test(url)) {
      await shell.openExternal(url)
    }
  })

  ipcMain.handle("desktop:show-item-in-folder", async (_event, fullPath: string): Promise<void> => {
    if (typeof fullPath === "string") {
      shell.showItemInFolder(fullPath)
    }
  })

  // Native File Dialogs
  ipcMain.handle(
    "desktop:save-file-dialog",
    async (
      _event,
      options: SaveFileDialogOptions
    ): Promise<{ filePath?: string; canceled: boolean }> => {
      const win = getWindow()
      if (!win) return { canceled: true }

      const result = await dialog.showSaveDialog(win, {
        defaultPath: options?.defaultPath || "untitled.zenithsui",
        filters: options?.filters || [
          { name: "Zenithsui Canvas Document", extensions: ["zenithsui", "json"] },
          { name: "Universal Sketch", extensions: ["sketch"] },
          { name: "All Files", extensions: ["*"] },
        ],
      })

      if (result.canceled || !result.filePath) {
        return { canceled: true }
      }

      try {
        const data = options.data
        if (typeof data === "string") {
          await fs.writeFile(result.filePath, data, "utf-8")
        } else if (data instanceof Uint8Array) {
          await fs.writeFile(result.filePath, Buffer.from(data))
        }
        return { filePath: result.filePath, canceled: false }
      } catch (err: any) {
        console.error("[Zenithsui-IPC] Save error:", err)
        throw new Error(err?.message || "Failed to save file")
      }
    }
  )

  ipcMain.handle(
    "desktop:open-file-dialog",
    async (
      _event,
      options?: OpenFileDialogOptions
    ): Promise<{ filePath?: string; data?: string; canceled: boolean }> => {
      const win = getWindow()
      if (!win) return { canceled: true }

      const result = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: options?.filters || [
          {
            name: "Supported Canvas Files",
            extensions: ["zenithsui", "sketch", "json", "excalidraw"],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      })

      if (result.canceled || !result.filePaths.length) {
        return { canceled: true }
      }

      const filePath = result.filePaths[0]
      try {
        const content = await fs.readFile(filePath, "utf-8")
        return { filePath, data: content, canceled: false }
      } catch (err: any) {
        console.error("[Zenithsui-IPC] Open error:", err)
        throw new Error(err?.message || "Failed to read file")
      }
    }
  )

  // Safe Close Handshake
  ipcMain.handle("desktop:signal-ready-to-close", async () => {
    onRendererReadyToClose()
  })
}
